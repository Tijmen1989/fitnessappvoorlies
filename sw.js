var CACHE_NAME = 'training-v22';
var VIDEO_CACHE = 'training-videos-v1';
var URLS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './firebase-sync.js',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME && key !== VIDEO_CACHE; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Firebase/Google requests: always network (never cache)
  if (url.indexOf('gstatic.com') !== -1 || url.indexOf('googleapis.com') !== -1 || url.indexOf('firebaseio.com') !== -1 || url.indexOf('firestore.googleapis.com') !== -1) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Video requests: cache-first, then network (store on fetch)
  if (url.indexOf('musclewiki.com') !== -1 && url.indexOf('.mp4') !== -1) {
    event.respondWith(
      caches.open(VIDEO_CACHE).then(function(cache) {
        return cache.match(event.request).then(function(response) {
          if (response) return response;
          return fetch(event.request).then(function(networkResponse) {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // App files: network-first, cache als fallback (zodat updates altijd doorkomen)
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Update cache met de nieuwe versie
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Geen internet? Gebruik cache
      return caches.match(event.request);
    })
  );
});

// Handle messages from main thread (pre-cache videos)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CACHE_VIDEOS') {
    var urls = event.data.urls;
    caches.open(VIDEO_CACHE).then(function(cache) {
      var done = 0;
      var total = urls.length;
      urls.forEach(function(url) {
        cache.match(url).then(function(existing) {
          if (existing) {
            done++;
            notifyProgress(done, total);
            return;
          }
          fetch(url).then(function(response) {
            if (response.ok) {
              cache.put(url, response);
            }
            done++;
            notifyProgress(done, total);
          }).catch(function() {
            done++;
            notifyProgress(done, total);
          });
        });
      });
    });
  }
});

function notifyProgress(done, total) {
  self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: 'VIDEO_CACHE_PROGRESS', done: done, total: total });
    });
  });
}

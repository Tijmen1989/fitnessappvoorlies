// ================================================================
// FIREBASE CLOUD SYNC
// ================================================================
// Automatische cloud backup voor trainingsdata.
// Alle data wordt lokaal opgeslagen (localStorage) EN naar Firebase gestuurd.
// Bij app-start: als lokaal leeg is maar cloud data heeft → auto-herstel.
//
// ▶ STAP: Vervang de firebaseConfig hieronder met jouw eigen config
//   uit de Firebase Console → Project Settings → Web App.
// ================================================================

var firebaseConfig = {
  apiKey: "AIzaSyBjzmfMdh0hkuEmeoHbPW4mTNidexEGTWs",
  authDomain: "fitneies.firebaseapp.com",
  projectId: "fitneies",
  storageBucket: "fitneies.firebasestorage.app",
  messagingSenderId: "666862484477",
  appId: "1:666862484477:web:64756fd26e790259aef794"
};

// ── Firebase initialisatie ──
var firebaseApp = null;
var firebaseDb = null;
var firebaseUser = null;
var firebaseSyncEnabled = false;
var firebaseSyncQueue = [];
var firebaseIsSyncing = false;

function initFirebase() {
  try {
    // Check of config ingevuld is
    if (firebaseConfig.apiKey === "VERVANG_MET_JOUW_KEY") {
      console.log('[CloudSync] Firebase config nog niet ingevuld — cloud sync uitgeschakeld.');
      return;
    }

    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.firestore();

    // Offline persistence inschakelen (data beschikbaar zonder internet)
    firebaseDb.enablePersistence({ synchronizeTabs: true }).catch(function(err) {
      console.log('[CloudSync] Persistence niet beschikbaar:', err.code);
    });

    // Anoniem inloggen
    firebase.auth().signInAnonymously().then(function(result) {
      firebaseUser = result.user;
      firebaseSyncEnabled = true;
      console.log('[CloudSync] Verbonden als:', firebaseUser.uid);

      // Sla user ID lokaal op zodat we altijd dezelfde account gebruiken
      var storedUid = localStorage.getItem('lt_firebaseUid');
      if (!storedUid) {
        localStorage.setItem('lt_firebaseUid', firebaseUser.uid);
      }

      // Sync queue verwerken (als er saves waren voordat Firebase klaar was)
      processFirebaseSyncQueue();

      // Check of we data moeten herstellen vanuit de cloud
      checkCloudRestore();

    }).catch(function(err) {
      console.log('[CloudSync] Aanmelden mislukt:', err.message);
    });

    // Luister naar auth state changes
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        firebaseUser = user;
        firebaseSyncEnabled = true;
      } else {
        firebaseSyncEnabled = false;
      }
    });

  } catch(e) {
    console.log('[CloudSync] Init fout:', e.message);
  }
}

// ── Cloud opslaan ──
function saveToCloud(key, value) {
  if (!firebaseSyncEnabled || !firebaseUser) {
    // Queue het voor later
    firebaseSyncQueue.push({ key: key, value: value });
    return;
  }

  var docRef = firebaseDb.collection('users').doc(firebaseUser.uid);
  var update = {};
  update[key] = value;
  update['lastSyncedAt'] = new Date().toISOString();

  docRef.set(update, { merge: true }).then(function() {
    updateSyncIndicator(true);
  }).catch(function(err) {
    console.log('[CloudSync] Opslaan mislukt voor', key, ':', err.message);
    updateSyncIndicator(false);
  });
}

// ── Volledige sync (alle data naar cloud) ──
function fullSyncToCloud() {
  if (!firebaseSyncEnabled || !firebaseUser) return;

  var allData = {};
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.startsWith('lt_') && key !== 'lt_firebaseUid') {
      try {
        allData[key] = JSON.parse(localStorage.getItem(key));
      } catch(e) {
        allData[key] = localStorage.getItem(key);
      }
    }
  }
  allData['lastSyncedAt'] = new Date().toISOString();
  allData['lastFullSync'] = new Date().toISOString();

  var docRef = firebaseDb.collection('users').doc(firebaseUser.uid);
  docRef.set(allData, { merge: true }).then(function() {
    console.log('[CloudSync] Volledige sync geslaagd');
    updateSyncIndicator(true);
    setStore('lastCloudSync', new Date().toISOString());
  }).catch(function(err) {
    console.log('[CloudSync] Volledige sync mislukt:', err.message);
    updateSyncIndicator(false);
  });
}

// ── Queue verwerken ──
function processFirebaseSyncQueue() {
  if (firebaseSyncQueue.length === 0) return;

  var queue = firebaseSyncQueue.slice();
  firebaseSyncQueue = [];

  queue.forEach(function(item) {
    saveToCloud(item.key, item.value);
  });
}

// ── Cloud data herstellen ──
function checkCloudRestore() {
  if (!firebaseSyncEnabled || !firebaseUser) return;

  var localSessions = getStore('sessions', []);

  // Als er lokaal al data is, doe alleen een sync NAAR de cloud
  if (localSessions.length > 0) {
    fullSyncToCloud();
    return;
  }

  // Lokaal is leeg — probeer te herstellen vanuit cloud
  var docRef = firebaseDb.collection('users').doc(firebaseUser.uid);
  docRef.get().then(function(doc) {
    if (!doc.exists) {
      console.log('[CloudSync] Geen cloud data gevonden.');
      return;
    }

    var cloudData = doc.data();
    if (!cloudData['lt_sessions'] || cloudData['lt_sessions'].length === 0) {
      console.log('[CloudSync] Cloud data is ook leeg.');
      return;
    }

    // Er is cloud data maar lokaal is leeg — herstel!
    console.log('[CloudSync] Cloud data gevonden! Herstellen...');

    var restored = 0;
    Object.keys(cloudData).forEach(function(key) {
      if (key.startsWith('lt_') && key !== 'lt_firebaseUid') {
        localStorage.setItem(key, JSON.stringify(cloudData[key]));
        restored++;
      }
    });

    console.log('[CloudSync] ' + restored + ' items hersteld vanuit cloud');

    // Herlaad de app om herstelde data te tonen
    alert('Je trainingsdata is hersteld vanuit de cloud! (' + (cloudData['lt_sessions'] ? cloudData['lt_sessions'].length : 0) + ' trainingen). De app wordt herladen.');
    location.reload();

  }).catch(function(err) {
    console.log('[CloudSync] Herstellen mislukt:', err.message);
  });
}

// ── Sync status indicator ──
function updateSyncIndicator(success) {
  var el = document.getElementById('syncIndicator');
  if (!el) {
    // Maak indicator aan in de topbar
    var topbar = document.getElementById('topbar');
    if (!topbar) return;
    el = document.createElement('div');
    el.id = 'syncIndicator';
    el.style.cssText = 'position:absolute;top:8px;right:12px;font-size:11px;opacity:0.7;transition:opacity 0.3s';
    topbar.style.position = 'relative';
    topbar.appendChild(el);
  }

  if (success) {
    el.textContent = '☁️ Synced';
    el.style.color = 'var(--success, #27AE60)';
  } else {
    el.textContent = '☁️ Offline';
    el.style.color = 'var(--warning, #F39C12)';
  }

  // Fade na 3 seconden
  el.style.opacity = '0.7';
  setTimeout(function() { el.style.opacity = '0.3'; }, 3000);
}

// ── Cloud sync status voor instellingen-pagina ──
function getCloudSyncStatus() {
  if (firebaseConfig.apiKey === "VERVANG_MET_JOUW_KEY") {
    return { enabled: false, reason: 'niet geconfigureerd' };
  }
  if (!firebaseSyncEnabled) {
    return { enabled: false, reason: 'niet verbonden' };
  }
  var lastSync = getStore('lastCloudSync', '');
  return {
    enabled: true,
    lastSync: lastSync,
    uid: firebaseUser ? firebaseUser.uid : 'onbekend'
  };
}

// ── Start Firebase bij laden ──
initFirebase();

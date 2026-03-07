// ================================================================
// FIREBASE CLOUD SYNC + KOPPELCODE MULTI-DEVICE
// ================================================================
// Automatische cloud backup voor trainingsdata.
// Alle data wordt lokaal opgeslagen (localStorage) EN naar Firebase gestuurd.
// Bij app-start: als lokaal leeg is maar cloud data heeft → auto-herstel.
//
// KOPPELCODE: Genereer een 6-cijferige code op apparaat 1,
// voer die in op apparaat 2 → beide delen dezelfde data.
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

// De UID die we gebruiken voor data — eigen UID of gekoppelde UID
function getSyncUid() {
  var linked = localStorage.getItem('lt_linkedUid');
  if (linked) return linked;
  return firebaseUser ? firebaseUser.uid : null;
}

function initFirebase() {
  try {
    if (firebaseConfig.apiKey === "VERVANG_MET_JOUW_KEY") {
      console.log('[CloudSync] Firebase config nog niet ingevuld — cloud sync uitgeschakeld.');
      return;
    }

    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.firestore();

    firebaseDb.enablePersistence({ synchronizeTabs: true }).catch(function(err) {
      console.log('[CloudSync] Persistence niet beschikbaar:', err.code);
    });

    firebase.auth().signInAnonymously().then(function(result) {
      firebaseUser = result.user;
      firebaseSyncEnabled = true;
      console.log('[CloudSync] Verbonden als:', firebaseUser.uid);
      console.log('[CloudSync] Sync UID:', getSyncUid());

      var storedUid = localStorage.getItem('lt_firebaseUid');
      if (!storedUid) {
        localStorage.setItem('lt_firebaseUid', firebaseUser.uid);
      }

      processFirebaseSyncQueue();
      checkCloudRestore();

    }).catch(function(err) {
      console.log('[CloudSync] Aanmelden mislukt:', err.message);
    });

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
  if (!firebaseSyncEnabled || !getSyncUid()) {
    firebaseSyncQueue.push({ key: key, value: value });
    return;
  }

  var docRef = firebaseDb.collection('users').doc(getSyncUid());
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
  if (!firebaseSyncEnabled || !getSyncUid()) return;

  var allData = {};
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.startsWith('lt_') && key !== 'lt_firebaseUid' && key !== 'lt_linkedUid' && key !== 'lt_koppelcode') {
      try {
        allData[key] = JSON.parse(localStorage.getItem(key));
      } catch(e) {
        allData[key] = localStorage.getItem(key);
      }
    }
  }
  allData['lastSyncedAt'] = new Date().toISOString();
  allData['lastFullSync'] = new Date().toISOString();

  var docRef = firebaseDb.collection('users').doc(getSyncUid());
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
  if (!firebaseSyncEnabled || !getSyncUid()) return;

  var localSessions = getStore('sessions', []);

  if (localSessions.length > 0) {
    fullSyncToCloud();
    return;
  }

  var docRef = firebaseDb.collection('users').doc(getSyncUid());
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

    console.log('[CloudSync] Cloud data gevonden! Herstellen...');

    var restored = 0;
    Object.keys(cloudData).forEach(function(key) {
      if (key.startsWith('lt_') && key !== 'lt_firebaseUid') {
        localStorage.setItem(key, JSON.stringify(cloudData[key]));
        restored++;
      }
    });

    console.log('[CloudSync] ' + restored + ' items hersteld vanuit cloud');

    alert('Je trainingsdata is hersteld vanuit de cloud! (' + (cloudData['lt_sessions'] ? cloudData['lt_sessions'].length : 0) + ' trainingen). De app wordt herladen.');
    location.reload();

  }).catch(function(err) {
    console.log('[CloudSync] Herstellen mislukt:', err.message);
  });
}

// ================================================================
// KOPPELCODE SYSTEEM — Multi-device sync
// ================================================================

// Genereer een willekeurige 6-cijferige code
function generateKoppelcode() {
  var code = '';
  for (var i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

// Maak een koppelcode aan en sla op in het eigen user-document
function createKoppelcode() {
  if (!firebaseSyncEnabled || !getSyncUid()) {
    alert('Firebase is nog niet verbonden. Probeer het opnieuw.');
    return;
  }

  var code = generateKoppelcode();
  var syncUid = getSyncUid();

  // Sla de code op in het eigen user-document (geen aparte collectie nodig)
  firebaseDb.collection('users').doc(syncUid).set({
    _koppelcode: code,
    _koppelcodeCreatedAt: new Date().toISOString()
  }, { merge: true }).then(function() {
    localStorage.setItem('lt_koppelcode', code);
    console.log('[Koppelcode] Code aangemaakt:', code);

    // Toon de code
    var el = document.getElementById('koppelcodeDisplay');
    if (el) {
      el.innerHTML = '<div style="text-align:center;padding:16px">' +
        '<div style="font-size:11px;color:var(--text-light);margin-bottom:8px">Jouw koppelcode:</div>' +
        '<div style="font-size:32px;font-weight:700;letter-spacing:8px;color:var(--primary);font-family:monospace">' + code + '</div>' +
        '<div style="font-size:12px;color:var(--text-light);margin-top:8px">Voer deze code in op je andere apparaat</div>' +
        '</div>';
    }
  }).catch(function(err) {
    console.log('[Koppelcode] Aanmaken mislukt:', err.message);
    alert('Kon de koppelcode niet aanmaken: ' + err.message);
  });
}

// Koppel dit apparaat aan een bestaande code
function useKoppelcode() {
  if (!firebaseSyncEnabled || !firebaseUser) {
    alert('Firebase is nog niet verbonden. Probeer het opnieuw.');
    return;
  }

  var input = document.getElementById('koppelcodeInput');
  if (!input) return;

  var code = input.value.trim();
  if (code.length !== 6 || !/^\d+$/.test(code)) {
    alert('Voer een geldige 6-cijferige code in.');
    return;
  }

  // Zoek de code op in alle user-documenten
  firebaseDb.collection('users').where('_koppelcode', '==', code).get().then(function(snapshot) {
    if (snapshot.empty) {
      alert('Code niet gevonden. Controleer of je de juiste code hebt.');
      return;
    }

    var linkedUid = snapshot.docs[0].id;

    if (linkedUid === firebaseUser.uid) {
      alert('Dit is je eigen code — je bent al gekoppeld!');
      return;
    }

    // Sla de gekoppelde UID op
    localStorage.setItem('lt_linkedUid', linkedUid);
    localStorage.setItem('lt_koppelcode', code);
    console.log('[Koppelcode] Gekoppeld aan UID:', linkedUid);

    // Haal data op van de gekoppelde account
    firebaseDb.collection('users').doc(linkedUid).get().then(function(userDoc) {
      if (!userDoc.exists) {
        alert('Gekoppeld! Maar er is nog geen data op de andere account.');
        location.reload();
        return;
      }

      var cloudData = userDoc.data();
      var restored = 0;
      Object.keys(cloudData).forEach(function(key) {
        if (key.startsWith('lt_') && key !== 'lt_firebaseUid') {
          localStorage.setItem(key, JSON.stringify(cloudData[key]));
          restored++;
        }
      });

      var sessionCount = cloudData['lt_sessions'] ? cloudData['lt_sessions'].length : 0;
      console.log('[Koppelcode] ' + restored + ' items hersteld van gekoppeld account');
      alert('Gekoppeld! ' + sessionCount + ' trainingen geladen. De app wordt herladen.');
      location.reload();

    }).catch(function(err) {
      console.log('[Koppelcode] Data ophalen mislukt:', err.message);
      alert('Gekoppeld, maar data ophalen mislukt: ' + err.message);
    });

  }).catch(function(err) {
    console.log('[Koppelcode] Code opzoeken mislukt:', err.message);
    alert('Fout bij het opzoeken van de code: ' + err.message);
  });
}

// Ontkoppel dit apparaat
function unlinkDevice() {
  if (!confirm('Weet je zeker dat je wilt ontkoppelen? Je lokale data blijft behouden.')) return;
  localStorage.removeItem('lt_linkedUid');
  localStorage.removeItem('lt_koppelcode');
  console.log('[Koppelcode] Ontkoppeld');
  renderHistory();
}

// Check of we gekoppeld zijn
function isDeviceLinked() {
  return !!localStorage.getItem('lt_linkedUid');
}

function getActiveKoppelcode() {
  return localStorage.getItem('lt_koppelcode') || null;
}

// ── Sync status indicator ──
function updateSyncIndicator(success) {
  var el = document.getElementById('syncIndicator');
  if (!el) {
    var topbar = document.getElementById('topbar');
    if (!topbar) return;
    el = document.createElement('div');
    el.id = 'syncIndicator';
    el.style.cssText = 'position:absolute;top:8px;right:12px;font-size:11px;opacity:0.7;transition:opacity 0.3s';
    topbar.style.position = 'relative';
    topbar.appendChild(el);
  }

  var ver = typeof APP_VERSION !== 'undefined' ? ' v' + APP_VERSION : '';
  if (success) {
    el.textContent = '\u2601\uFE0F Synced' + ver;
    el.style.color = 'var(--success, #27AE60)';
  } else {
    el.textContent = '\u2601\uFE0F Offline' + ver;
    el.style.color = 'var(--warning, #F39C12)';
  }

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
    uid: getSyncUid(),
    linked: isDeviceLinked(),
    koppelcode: getActiveKoppelcode()
  };
}

// ── Start Firebase bij laden ──
initFirebase();

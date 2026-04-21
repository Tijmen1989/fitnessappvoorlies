// ================================================================
// APP VERSION
// ================================================================
var APP_VERSION = '2.1.1';

// ================================================================
// STORAGE HELPERS
// ================================================================
function getStore(key, def) {
  try { var v = localStorage.getItem('lt_' + key); return v ? JSON.parse(v) : def; }
  catch(e) { return def; }
}
function setStore(key, val) {
  try {
    localStorage.setItem('lt_' + key, JSON.stringify(val));
  } catch(e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn('localStorage vol! Probeer oude sessies op te ruimen.');
      try {
        var sessions = JSON.parse(localStorage.getItem('lt_sessions') || '[]');
        if (sessions.length > 100) {
          localStorage.setItem('lt_sessions', JSON.stringify(sessions.slice(-100)));
          localStorage.setItem('lt_' + key, JSON.stringify(val));
        } else {
          showStorageWarning();
        }
      } catch(e2) {
        showStorageWarning();
      }
    }
  }
  // Cloud sync: stuur belangrijke data automatisch naar Firebase
  if (typeof saveToCloud === 'function') {
    var cloudKeys = ['sessions', 'measurements', 'onboardingDone', 'darkMode', 'startDate', 'weekType', 'calfPainHistory', 'weightGoal', 'weekBEnabled', 'phaseOverride', 'remindersEnabled', 'weightSteps', 'startWeights', 'availableWeights'];
    if (cloudKeys.indexOf(key) !== -1) {
      saveToCloud('lt_' + key, val);
    }
  }
}

var _storageWarningShown = false;
function showStorageWarning() {
  if (_storageWarningShown) return;
  _storageWarningShown = true;
  var banner = document.createElement('div');
  banner.id = 'storageBanner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#e74c3c;color:white;padding:12px 16px;font-size:13px;text-align:center;cursor:pointer';
  banner.innerHTML = '\u26A0\uFE0F Opslag bijna vol! Sommige data wordt mogelijk niet opgeslagen. Exporteer je data via Profiel.';
  banner.onclick = function() { banner.remove(); _storageWarningShown = false; };
  document.body.appendChild(banner);
}

// ================================================================
// TIMER SOUND
// ================================================================
var _audioCtx = null;
function playTimerSound(type) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    var ctx = _audioCtx;
    var now = ctx.currentTime;
    if (type === 'short') {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'double') {
      // Stronger notification for phase changes: three ascending tones
      [0, 0.2, 0.4].forEach(function(delay, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = [660, 880, 1100][i];
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.2);
        osc.start(now + delay); osc.stop(now + delay + 0.2);
      });
    } else {
      [0, 0.25].forEach(function(delay) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = delay === 0 ? 660 : 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.25, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.25);
        osc.start(now + delay); osc.stop(now + delay + 0.25);
      });
    }
  } catch(e) { /* AudioContext not supported */ }
}

function playBeep(frequency, duration) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.connect(gain);
    gain.connect(_audioCtx.destination);
    osc.frequency.value = frequency || 880;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(_audioCtx.currentTime + (duration || 0.15));
  } catch(e) {}
}

function hapticFeedback(pattern) {
  // pattern: 'light' (tap), 'medium' (timer done), 'heavy' (training done)
  if (navigator.vibrate) {
    if (pattern === 'light') navigator.vibrate(20);
    else if (pattern === 'medium') navigator.vibrate([200, 100, 200]);
    else if (pattern === 'heavy') navigator.vibrate([200, 100, 200, 100, 200]);
    else navigator.vibrate(pattern);
  } else {
    // iOS fallback: short beep
    if (pattern === 'light') playBeep(880, 0.05);
    else if (pattern === 'medium') playBeep(660, 0.2);
    else if (pattern === 'heavy') { playBeep(880, 0.15); setTimeout(function() { playBeep(1100, 0.2); }, 200); }
  }
}

// ================================================================
// DATE & WEEK HELPERS
// ================================================================
var DAYS_NL = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'];
var MONTHS_NL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

function formatDateNL(d) {
  return DAYS_NL[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_NL[d.getMonth()];
}

function getWeekNumber(d) {
  var date = new Date(d);
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  var week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getWeekType() {
  var weekBEnabled = getStore('weekBEnabled', false);
  if (!weekBEnabled) return 'A';
  return getWeekNumber(new Date()) % 2 === 0 ? 'A' : 'B';
}

function isWeekBReady() {
  // Check: kuitpijn < 2 gemiddeld over laatste 4 sessies met feedback
  var sessions = getStore('sessions', []);
  var withCalf = sessions.filter(function(s) { return s.feedback && s.feedback.calfPain !== null && s.feedback.calfPain !== undefined; });
  if (withCalf.length < 4) return false;
  var last4 = withCalf.slice(-4);
  var avg = last4.reduce(function(t, s) { return t + s.feedback.calfPain; }, 0) / last4.length;
  return avg < 2;
}

function toggleWeekB() {
  var current = getStore('weekBEnabled', false);
  setStore('weekBEnabled', !current);
  renderToday();
  renderHistory();
}

// ================================================================
// PROGRESSIVE PHASES
// ================================================================
function getCurrentPhase() {
  var override = getStore('phaseOverride', null);
  if (override) return override;

  var sessions = getStore('sessions', []);
  if (sessions.length < 12) return 1;

  // Check if at least 4 different weeks have sessions
  var weeks = {};
  sessions.forEach(function(s) {
    var d = new Date(s.date);
    var weekKey = d.getFullYear() + '-W' + getWeekNumber(d);
    weeks[weekKey] = true;
  });
  if (Object.keys(weeks).length < 4) return 1;

  return 2;
}

function isPhase2Available() {
  var sessions = getStore('sessions', []);
  var weeks = {};
  sessions.forEach(function(s) {
    var d = new Date(s.date);
    var weekKey = d.getFullYear() + '-W' + getWeekNumber(d);
    weeks[weekKey] = true;
  });
  return { sessions: sessions.length, weeks: Object.keys(weeks).length };
}

function getTrainingExercises(trainingKey) {
  var phase = getCurrentPhase();
  var config = PHASE_CONFIG[phase];
  if (config && config[trainingKey]) {
    return config[trainingKey];
  }
  // Fallback to default from TRAINING_DATA
  var td = TRAINING_DATA[trainingKey];
  return td ? td.exerciseIds : [];
}

function setPhaseOverride(phase) {
  if (phase === null) {
    localStorage.removeItem('lt_phaseOverride');
  } else {
    setStore('phaseOverride', phase);
  }
  renderToday();
  renderHistory();
}

function getTodayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function daysSinceLastTraining() {
  var sessions = getStore('sessions', []);
  if (sessions.length === 0) return 999;
  var last = sessions[sessions.length - 1].date;
  return Math.floor((new Date() - new Date(last)) / 86400000);
}

// ================================================================
// MISSED TRAINING CATCH-UP
// ================================================================
function getMissedTrainings() {
  var now = new Date();
  now.setHours(0,0,0,0);
  var sessions = getStore('sessions', []);
  var missed = [];
  var seen = {};

  // Look back up to 7 days (not including today)
  for (var daysAgo = 1; daysAgo <= 7; daysAgo++) {
    var checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - daysAgo);
    var checkDow = checkDate.getDay();

    var checkWeekType = getWeekTypeForDate(checkDate);
    var schedule = getSchedule(checkWeekType);
    var scheduledKey = schedule[checkDow];
    if (!scheduledKey) continue;
    if (!TRAINING_DATA[scheduledKey] || TRAINING_DATA[scheduledKey].type !== 'kracht') continue;
    if (seen[scheduledKey]) continue;

    var windowStart = new Date(checkDate);
    windowStart.setDate(windowStart.getDate() - 1);
    var windowEnd = new Date(now);

    var wasDone = sessions.some(function(s) {
      var sDate = new Date(s.date);
      sDate.setHours(0,0,0,0);
      return s.trainingKey === scheduledKey && sDate >= windowStart && sDate <= windowEnd;
    });

    if (!wasDone) {
      seen[scheduledKey] = true;
      missed.push({
        trainingKey: scheduledKey,
        scheduledDay: checkDow,
        daysAgo: daysAgo,
        name: TRAINING_DATA[scheduledKey].name || scheduledKey
      });
    }
  }
  return missed;
}

function getWeekTypeForDate(date) {
  return getWeekType();
}

function applyCatchUpSwap(missedKey) {
  // Sla de swap op: vandaag doen we de gemiste training
  setStore('catchUpToday', { trainingKey: missedKey, date: getTodayKey() });
  renderToday();
}

function skipCatchUp() {
  setStore('catchUpToday', { skipped: true, date: getTodayKey() });
  renderToday();
}

function catchUpFromPreview(trainingKey) {
  setStore('catchUpToday', { trainingKey: trainingKey, date: getTodayKey() });
  closeDayPreview();
  // Switch to today page
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('pageTrain').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.remove('active'); });
  document.querySelector('.nav-item').classList.add('active');
  window.scrollTo(0, 0);
  renderToday();
}

// ================================================================
// SMART RECOVERY
// ================================================================
function getRecoveryStatus() {
  var sessions = getStore('sessions', []);
  var now = new Date();
  var todayStr = getTodayKey();
  var result = { warnings: [], suggestion: null };

  // Bekijk de laatste 3 sessies
  var recent = sessions.slice(-3).reverse();
  if (recent.length === 0) return result;

  var last = recent[0];
  var lastDate = new Date(last.date);
  var daysSince = Math.floor((now - lastDate) / 86400000);
  var isToday = daysSince === 0;
  var isYesterday = daysSince === 1;
  var isTwoDaysAgo = daysSince <= 2;

  var lastIsKracht = last.type === 'kracht';
  var lastIsBoven = last.name && last.name.toLowerCase().indexOf('boven') >= 0;
  var lastIsOnder = last.name && last.name.toLowerCase().indexOf('onder') >= 0;

  // Regel 1: Vandaag al kracht gedaan → geen tweede kracht
  if (lastIsKracht && isToday) {
    result.warnings.push('Je hebt vandaag al krachttraining gedaan \u2014 goed bezig! Rust nu lekker uit.');
    result.suggestion = 'cardio';
  }
  // Regel 1b: Gisteren kracht → vandaag geen kracht
  if (lastIsKracht && isYesterday) {
    result.warnings.push('Gisteren was krachttraining \u2014 een rustdag of lichte cardio is beter voor herstel.');
    result.suggestion = 'cardio';
  }

  // Regel 2: Bovenlichaam recent → niet opnieuw boven (niet vandaag)
  if (lastIsBoven && !isToday && isTwoDaysAgo) {
    result.warnings.push('Laatste training was bovenlichaam (' + (daysSince === 1 ? 'gisteren' : daysSince + ' dagen geleden') + '). Onderlichaam of cardio is slimmer.');
    if (!result.suggestion) result.suggestion = 'krachtOnder';
  }

  // Regel 3: Onderlichaam recent → niet opnieuw onder (niet vandaag)
  if (lastIsOnder && !isToday && isTwoDaysAgo) {
    result.warnings.push('Laatste training was onderlichaam (' + (daysSince === 1 ? 'gisteren' : daysSince + ' dagen geleden') + '). Bovenlichaam of cardio is slimmer.');
    if (!result.suggestion) result.suggestion = 'krachtBoven';
  }

  // Regel 4: 2+ cardio achter elkaar → suggereer kracht
  if (recent.length >= 2 && recent[0].type === 'cardio' && recent[1].type === 'cardio') {
    if (daysSince <= 2) {
      result.suggestion = lastIsBoven ? 'krachtOnder' : 'krachtBoven';
    }
  }

  // Regel 5: Lang niet getraind → welkom terug
  if (daysSince >= 14) {
    result.warnings = ['Welkom terug! Het is ' + daysSince + ' dagen geleden. Begin rustig en iets lichter.'];
    result.suggestion = null;
  }

  return result;
}

function getRecoveryWarningForTraining(trainingKey) {
  var recovery = getRecoveryStatus();
  if (recovery.warnings.length === 0) return null;

  var training = TRAINING_DATA[trainingKey];
  if (!training || training.type !== 'kracht') return null;

  var sessions = getStore('sessions', []);
  var last = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  if (!last) return null;

  var daysSince = Math.floor((new Date() - new Date(last.date)) / 86400000);
  if (daysSince > 2) return null;

  var lastIsKracht = last.type === 'kracht';
  var lastIsBoven = last.name && last.name.toLowerCase().indexOf('boven') >= 0;
  var lastIsOnder = last.name && last.name.toLowerCase().indexOf('onder') >= 0;
  var todayIsBoven = trainingKey === 'krachtBoven';
  var todayIsOnder = trainingKey === 'krachtOnder';

  // Zelfde spiergroep?
  if (todayIsBoven && lastIsBoven && daysSince <= 2) {
    return '\u26A0 Laatste training was ook bovenlichaam. Overweeg onderlichaam of cardio voor beter herstel.';
  }
  if (todayIsOnder && lastIsOnder && daysSince <= 2) {
    return '\u26A0 Laatste training was ook onderlichaam. Overweeg bovenlichaam of cardio voor beter herstel.';
  }
  // Kracht na kracht vandaag of gisteren?
  if (lastIsKracht && daysSince === 0) {
    return '\u26A0 Je hebt vandaag al krachttraining gedaan \u2014 goed bezig! Rust nu lekker uit.';
  }
  if (lastIsKracht && daysSince === 1) {
    return '\u26A0 Gisteren was krachttraining \u2014 een rustdag of lichte cardio is beter voor herstel.';
  }

  return null;
}

function getSmartRestDayTip(dayOfWeek, isCycling) {
  var sessions = getStore('sessions', []);
  if (sessions.length === 0) return null;
  var last = sessions[sessions.length - 1];
  var daysSince = Math.floor((new Date() - new Date(last.date)) / 86400000);

  // Check recente kuitpijn
  var recentCalf = sessions.filter(function(s) {
    return s.feedback && s.feedback.calfPain !== null && s.feedback.calfPain !== undefined;
  }).slice(-3);
  var highCalfPain = recentCalf.length > 0 && recentCalf.some(function(s) { return s.feedback.calfPain >= 2; });

  if (isCycling && highCalfPain) {
    return '\uD83E\uDDB5 Je kuitpijn was recent hoog. Overweeg vandaag lichter te fietsen (lager verzet, hoger toerental) of de bus te pakken. Extra stretchen na het fietsen helpt ook.';
  }

  // Gisteren kracht + fietsdag vandaag
  if (isCycling && daysSince <= 1 && last.type === 'kracht') {
    var wasOnder = last.name && last.name.toLowerCase().indexOf('onder') >= 0;
    if (wasOnder) {
      return '\uD83D\uDCAA Gisteren was onderlichaam-training. Je benen kunnen stijf voelen op de fiets \u2014 dat is normaal. Fiets rustig en stretch goed na.';
    }
  }

  // Lang niet getraind
  if (daysSince >= 7 && daysSince < 999) {
    return '\uD83D\uDC4B Het is ' + daysSince + ' dagen geleden. Zin om vandaag iets te doen? Tik op "Toch zin om te trainen" hieronder!';
  }

  return null;
}

// ================================================================
// VIDEO / IMAGE HELPER
// ================================================================
// Priority: YouTube embed > MuscleWiki OG image fallback
function videoUrlToImageUrl(videoUrl) {
  if (!videoUrl) return '';
  return videoUrl
    .replace('/videos/branded/', '/')
    .replace(/\.mp4$/, '.jpg')
    .replace('/media/uploads/', '/media/uploads/og-');
}

function renderVideoHtml(ex) {
  // Local video (primary) — autoplay loop like MuscleWiki
  if (ex.videoUrl && ex.videoUrl.indexOf('videos/') === 0) {
    var fallbackHtml = ex.youtubeId
      ? 'this.parentElement.innerHTML=\'<a href=&quot;https://www.youtube.com/watch?v=' + ex.youtubeId + '&quot; target=&quot;_blank&quot; style=&quot;display:block;text-align:center;padding:16px;color:var(--primary);font-size:13px&quot;>Video laden mislukt — bekijk op YouTube ▶</a>\''
      : 'this.parentElement.style.display=\'none\'';
    return '<div class="exercise-video-container">' +
      '<video class="exercise-video loaded" ' +
      'src="' + ex.videoUrl + '" ' +
      'autoplay loop muted playsinline ' +
      'onerror="' + fallbackHtml + '">' +
      '</video></div>';
  }
  // YouTube embed (fallback for exercises without local video)
  if (ex.youtubeId) {
    return '<div class="exercise-video-container">' +
      '<iframe class="exercise-video loaded" ' +
      'src="https://www.youtube.com/embed/' + ex.youtubeId + '?rel=0&modestbranding=1" ' +
      'title="' + (ex.name || 'Oefening') + '" ' +
      'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
      'allowfullscreen loading="lazy"></iframe></div>';
  }
  // External video URL fallback (image)
  if (ex.videoUrl) {
    var imgUrl = videoUrlToImageUrl(ex.videoUrl);
    return '<div class="exercise-video-container">' +
      '<img class="exercise-image" src="' + imgUrl + '" alt="' + (ex.name || 'Oefening') + '" ' +
      'loading="lazy" onerror="this.parentElement.style.display=\'none\'" ' +
      'onload="this.classList.add(\'loaded\')">' +
      '</div>';
  }
  return '';
}

// Init observer (YouTube iframes handle their own lazy loading)
function initVideoObserver() {
}


// ================================================================
// EXERCISE HISTORY & PROGRESSION
// ================================================================
function getExerciseHistory(exerciseId) {
  var sessions = getStore('sessions', []);
  var history = [];
  for (var i = sessions.length - 1; i >= 0 && history.length < 6; i--) {
    var s = sessions[i];
    if (s.exercises) {
      var ex = s.exercises.find(function(e) { return e.id === exerciseId; });
      if (ex && ex.weight > 0) history.push({ date: s.date, weight: ex.weight, reps: ex.reps });
    }
  }
  return history;
}

function getLastWeight(exerciseId) {
  var hist = getExerciseHistory(exerciseId);
  return hist.length > 0 ? hist[0].weight : 0;
}

function getLastSession(exerciseId) {
  var hist = getExerciseHistory(exerciseId);
  if (hist.length === 0) return null;
  return { weight: hist[0].weight, reps: hist[0].reps, date: hist[0].date };
}

function isDumbbell(exerciseId) {
  var ex = getExercise(exerciseId);
  return ex && ex.apparaat && ex.apparaat.toLowerCase().indexOf('dumbbell') >= 0;
}

var DEFAULT_DUMBBELL_WEIGHTS = [1, 2, 3, 4, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30];

function getAvailableWeights(exerciseId) {
  var custom = getStore('availableWeights', {});
  if (custom[exerciseId] && custom[exerciseId].length > 0) return custom[exerciseId];
  return DEFAULT_DUMBBELL_WEIGHTS;
}

function setAvailableWeights(exerciseId, weights) {
  var custom = getStore('availableWeights', {});
  custom[exerciseId] = weights.sort(function(a, b) { return a - b; });
  setStore('availableWeights', custom);
}

function getWeightStep(exerciseId) {
  var custom = getStore('weightSteps', {});
  if (custom[exerciseId]) {
    if (typeof custom[exerciseId] === 'object') return custom[exerciseId].step;
    return custom[exerciseId];
  }
  var ex = getExercise(exerciseId);
  if (!ex) return 2.5;
  if (isDumbbell(exerciseId)) return 2;
  return 2.5;
}

function getWeightUnit(exerciseId) {
  var custom = getStore('weightSteps', {});
  if (custom[exerciseId] && typeof custom[exerciseId] === 'object') return custom[exerciseId].unit || 'kg';
  return 'kg';
}

function setWeightStep(exerciseId, step, el) {
  var custom = getStore('weightSteps', {});
  custom[exerciseId] = { step: parseFloat(step) || 2.5, unit: getWeightUnit(exerciseId) };
  setStore('weightSteps', custom);
  if (el) { el.style.borderColor = 'var(--success)'; setTimeout(function() { el.style.borderColor = ''; }, 800); }
}

function setWeightUnit(exerciseId, unit, el) {
  var custom = getStore('weightSteps', {});
  var currentStep = getWeightStep(exerciseId);
  custom[exerciseId] = { step: currentStep, unit: unit };
  setStore('weightSteps', custom);
  if (el) { el.style.borderColor = 'var(--success)'; setTimeout(function() { el.style.borderColor = ''; }, 800); }
}

function snapToAvailable(exerciseId, targetWeight) {
  var customWeights = getStore('availableWeights', {});
  var avail = customWeights[exerciseId];
  if (!avail || avail.length === 0) {
    if (isDumbbell(exerciseId)) avail = DEFAULT_DUMBBELL_WEIGHTS;
    else return targetWeight;
  }
  var closest = avail[0];
  for (var i = 1; i < avail.length; i++) {
    if (Math.abs(avail[i] - targetWeight) < Math.abs(closest - targetWeight)) closest = avail[i];
  }
  return closest;
}

function getNextWeightUp(exerciseId, currentWeight) {
  var customWeights = getStore('availableWeights', {});
  var avail = customWeights[exerciseId];
  if (!avail || avail.length === 0) {
    if (isDumbbell(exerciseId)) avail = DEFAULT_DUMBBELL_WEIGHTS;
    else return currentWeight + getWeightStep(exerciseId);
  }
  for (var i = 0; i < avail.length; i++) {
    if (avail[i] > currentWeight) return avail[i];
  }
  return currentWeight + getWeightStep(exerciseId);
}

function getStartWeight(exerciseId) {
  var custom = getStore('startWeights', {});
  if (custom[exerciseId] !== undefined) return custom[exerciseId];
  var ex = getExercise(exerciseId);
  var raw = (ex && ex.defaultWeight) ? ex.defaultWeight : 0;
  if (raw > 0) {
    return snapToAvailable(exerciseId, raw);
  }
  return raw;
}

function showInlineBanner(msg, type) {
  var existing = document.getElementById('inlineBanner');
  if (existing) existing.remove();
  var bg = type === 'success' ? 'var(--success, #4CAF50)' : type === 'warning' ? '#ff9800' : 'var(--primary)';
  var div = document.createElement('div');
  div.id = 'inlineBanner';
  div.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:' + bg + ';color:white;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);text-align:center;max-width:90%;animation:fadeIn 0.2s';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(function() { if (div.parentElement) div.remove(); }, 3000);
}

function setStartWeight(exerciseId, weight, el) {
  var custom = getStore('startWeights', {});
  custom[exerciseId] = parseFloat(weight) || 0;
  setStore('startWeights', custom);
  if (el) { el.style.borderColor = 'var(--success)'; setTimeout(function() { el.style.borderColor = ''; }, 800); }
}

function saveDumbbellWeights() {
  var input = document.getElementById('dbWeightInput');
  if (!input) return;
  var raw = input.value;
  var nums = raw.split(/[,;\s]+/).map(function(s) { return parseFloat(s.replace(',', '.')); }).filter(function(n) { return !isNaN(n) && n > 0; });
  if (nums.length === 0) {
    showInlineBanner('Voer minimaal \u00e9\u00e9n gewicht in', 'warning');
    return;
  }
  nums.sort(function(a, b) { return a - b; });
  var unique = [];
  nums.forEach(function(n) { if (unique.indexOf(n) < 0) unique.push(n); });
  var allExIds = Object.keys(typeof EXERCISE_DB !== 'undefined' ? EXERCISE_DB : {});
  var dbIds = allExIds.filter(function(id) { return isDumbbell(id); });
  dbIds.forEach(function(id) { setAvailableWeights(id, unique.slice()); });
  input.value = unique.map(function(n) { return ('' + n).replace('.', ','); }).join(', ');
  showInlineBanner('Dumbbell-gewichten opgeslagen! (' + unique.length + ' gewichten)', 'success');
}

function parseRepRange(repsStr) {
  var str = (repsStr || '10').replace(/[^\d\u2013\-]/g, '');
  var parts = str.split(/[\u2013\-]/);
  var min = parseInt(parts[0]) || 8;
  var max = parts.length > 1 ? (parseInt(parts[1]) || min) : min;
  return { min: min, max: max };
}

function getSmartWeightOptions(exerciseId, currentWeight, step) {
  var options = [];
  currentWeight = parseFloat(currentWeight) || 0;

  // Dumbbell-oefeningen: gebruik beschikbare-gewichten-lijst
  if (isDumbbell(exerciseId)) {
    var available = getAvailableWeights(exerciseId);
    if (currentWeight === 0) {
      var show = available.slice(0, Math.min(6, available.length));
      for (var i = 0; i < show.length; i++) {
        options.push({ value: show[i], isSuggestion: false });
      }
      return options;
    }
    var idx = -1;
    for (var j = 0; j < available.length; j++) {
      if (available[j] >= currentWeight) { idx = j; break; }
    }
    if (idx === -1) idx = available.length - 1;
    var shown = {};
    var vals = [];
    for (var k = Math.max(0, idx - 2); k <= Math.min(available.length - 1, idx + 1); k++) {
      var isSug = available[k] > currentWeight;
      vals.push({ value: available[k], isSuggestion: isSug });
      shown[available[k]] = true;
    }
    if (!shown[currentWeight] && currentWeight > 0) {
      vals.push({ value: currentWeight, isSuggestion: false });
      vals.sort(function(a, b) { return a.value - b.value; });
    }
    return vals;
  }

  // Machine-oefeningen: gebruik custom gewichtenlijst als die is ingesteld
  var machineWeights = getStore('availableWeights', {});
  var customMachineList = machineWeights[exerciseId];
  if (customMachineList && customMachineList.length > 0) {
    if (currentWeight === 0) {
      for (var mi = 0; mi < customMachineList.length; mi++) {
        options.push({ value: customMachineList[mi], isSuggestion: false });
      }
      return options;
    }
    var mIdx = -1;
    for (var mj = 0; mj < customMachineList.length; mj++) {
      if (customMachineList[mj] >= currentWeight) { mIdx = mj; break; }
    }
    if (mIdx === -1) mIdx = customMachineList.length - 1;
    var mVals = [];
    var mShown = {};
    for (var mk = Math.max(0, mIdx - 2); mk <= Math.min(customMachineList.length - 1, mIdx + 2); mk++) {
      mVals.push({ value: customMachineList[mk], isSuggestion: customMachineList[mk] > currentWeight });
      mShown[customMachineList[mk]] = true;
    }
    if (!mShown[currentWeight] && currentWeight > 0) {
      mVals.push({ value: currentWeight, isSuggestion: false });
      mVals.sort(function(a, b) { return a.value - b.value; });
    }
    return mVals;
  }

  // Fallback: geen custom lijst — gebruik ronde stappen passend bij step
  var unit = getWeightUnit(exerciseId);
  var fallbackList = [];
  if (unit === 'lbs') {
    fallbackList = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  } else {
    var fStep = step > 0 ? step : 5;
    for (var fi = fStep; fi <= 100; fi += fStep) {
      fallbackList.push(parseFloat(fi.toFixed(1)));
    }
  }

  if (currentWeight === 0) {
    for (var si = 0; si < Math.min(fallbackList.length, 8); si++) {
      options.push({ value: fallbackList[si], isSuggestion: false });
    }
    return options;
  }

  var fIdx = -1;
  for (var fj = 0; fj < fallbackList.length; fj++) {
    if (fallbackList[fj] >= currentWeight) { fIdx = fj; break; }
  }
  if (fIdx === -1) fIdx = fallbackList.length - 1;
  var vals = [];
  var shown2 = {};
  for (var fk = Math.max(0, fIdx - 2); fk <= Math.min(fallbackList.length - 1, fIdx + 2); fk++) {
    vals.push({ value: fallbackList[fk], isSuggestion: fallbackList[fk] > currentWeight });
    shown2[fallbackList[fk]] = true;
  }
  if (!shown2[currentWeight] && currentWeight > 0) {
    vals.push({ value: currentWeight, isSuggestion: false });
    vals.sort(function(a, b) { return a.value - b.value; });
  }

  return vals;
}

function getAllWeightOptions(exerciseId, step) {
  var currentWeight = getLastWeight(exerciseId);
  var progression = getProgressionSuggestion(exerciseId);
  var suggestedWeight = progression ? progression.suggested : 0;
  var options = [];

  if (isDumbbell(exerciseId)) {
    var available = getAvailableWeights(exerciseId);
    for (var i = 0; i < available.length; i++) {
      options.push({ value: available[i], isSuggestion: available[i] === suggestedWeight && suggestedWeight > currentWeight });
    }
    return options;
  }

  var machineWeights = getStore('availableWeights', {});
  var customList = machineWeights[exerciseId];
  if (customList && customList.length > 0) {
    for (var j = 0; j < customList.length; j++) {
      options.push({ value: customList[j], isSuggestion: customList[j] === suggestedWeight && suggestedWeight > currentWeight });
    }
    return options;
  }

  var unit = getWeightUnit(exerciseId);
  var fStep = step > 0 ? step : (unit === 'lbs' ? 10 : 5);
  var maxW = unit === 'lbs' ? 200 : 120;
  for (var fi = fStep; fi <= maxW; fi += fStep) {
    var val = parseFloat(fi.toFixed(1));
    options.push({ value: val, isSuggestion: val === suggestedWeight && suggestedWeight > currentWeight });
  }
  return options;
}

function selectWeight(value, btn) {
  var weightEl = document.getElementById('tmWeight');
  if (weightEl) weightEl.value = value;
  var picker = document.getElementById('tmWeightPicker');
  if (!picker) return;
  var buttons = picker.querySelectorAll('button');
  for (var i = 0; i < buttons.length; i++) {
    var bw = parseFloat(buttons[i].getAttribute('data-weight'));
    if (bw === value) {
      buttons[i].style.background = 'var(--primary)';
      buttons[i].style.color = 'white';
      buttons[i].style.borderColor = 'var(--primary)';
      buttons[i].style.borderStyle = 'solid';
    } else {
      buttons[i].style.background = 'var(--card)';
      buttons[i].style.color = 'var(--text)';
      buttons[i].style.borderColor = 'var(--border)';
      buttons[i].style.borderStyle = buttons[i].getAttribute('data-suggestion') === 'true' ? 'dashed' : 'solid';
    }
  }
}

function selectReps(value, btn) {
  var repsEl = document.getElementById('tmReps');
  if (repsEl) repsEl.value = value;
  var picker = document.getElementById('tmRepsPicker');
  if (!picker) return;
  var buttons = picker.querySelectorAll('button');
  for (var i = 0; i < buttons.length; i++) {
    var br = parseInt(buttons[i].getAttribute('data-reps'));
    if (br === value) {
      buttons[i].style.background = 'var(--primary)';
      buttons[i].style.color = 'white';
      buttons[i].style.borderColor = 'var(--primary)';
    } else {
      buttons[i].style.background = 'var(--card)';
      buttons[i].style.color = 'var(--text)';
      buttons[i].style.borderColor = 'var(--border)';
    }
  }
}

function getProgressionSuggestion(exerciseId) {
  var exerciseDef = getExercise(exerciseId);
  if (!exerciseDef) return null;

  // Parse rep range from exercise definition (e.g. "10-12" → min=10, max=12)
  var repRange = parseRepRange(exerciseDef.reps);
  var minReps = repRange.min;
  var maxReps = repRange.max;
  var numSets = 3;

  var isBodyweight = exerciseDef.isBodyweight || exerciseDef.isPlank;

  // Get last session data with full sets info
  var sessions = getStore('sessions', []);
  var lastSession = null;
  for (var i = sessions.length - 1; i >= 0; i--) {
    var s = sessions[i];
    if (s.exercises) {
      var ex = s.exercises.find(function(e) { return e.id === exerciseId; });
      if (ex && !ex.skipped && (isBodyweight || ex.weight > 0)) { lastSession = ex; break; }
    }
  }
  if (!lastSession) {
    if (isBodyweight) {
      return {
        ready: false, current: 0, suggested: 0, targetReps: minReps,
        message: '\uD83C\uDD95 Start met ' + numSets + '\u00d7' + minReps + (exerciseDef.isPlank ? ' sec' : ' reps')
      };
    }
    var sw = getStartWeight(exerciseId);
    if (sw > 0) {
      return {
        ready: false,
        current: 0,
        suggested: sw,
        targetReps: minReps,
        message: '\uD83C\uDD95 Start met ' + sw + ' ' + getWeightUnit(exerciseId) + ' \u00b7 ' + numSets + '\u00d7' + minReps
      };
    }
    return null;
  }

  // Bodyweight progression: only reps matter
  if (isBodyweight) {
    var bwReps = lastSession.reps || minReps;
    var bwUnit = exerciseDef.isPlank ? 'sec' : 'reps';
    if (bwReps >= maxReps) {
      return { ready: true, current: 0, suggested: 0, targetReps: maxReps,
        message: '\uD83D\uDCAA ' + numSets + '\u00d7' + maxReps + ' ' + bwUnit + ' gehaald! Probeer langzamer of met pauzes.'
      };
    }
    var bwNext = Math.min(bwReps + 1, maxReps);
    return { ready: false, current: 0, suggested: 0, targetReps: bwNext,
      message: 'Probeer ' + numSets + '\u00d7' + bwNext + ' ' + bwUnit + ' (was ' + bwReps + ')'
    };
  }

  var lastWeight = lastSession.weight;
  var lastReps = lastSession.reps || minReps;
  var lastSets = lastSession.sets || [];

  // Check if all sets hit max reps at this weight
  var allSetsAtMax = false;
  if (lastSets.length >= numSets) {
    allSetsAtMax = lastSets.every(function(set) {
      return (set.reps || 0) >= maxReps;
    });
  } else {
    // Fallback: use summary reps field
    allSetsAtMax = lastReps >= maxReps;
  }

  // Count how many consecutive sessions at this weight hit max reps
  // Skip sessions without this exercise (e.g. other training days in between)
  var consecutiveMaxSessions = 0;
  for (var j = sessions.length - 1; j >= 0; j--) {
    var sess = sessions[j];
    if (!sess.exercises) continue;
    var exData = sess.exercises.find(function(e) { return e.id === exerciseId; });
    if (!exData || exData.skipped) continue; // skip unrelated training days
    if (exData.weight !== lastWeight) break;
    var setsOk = false;
    if (exData.sets && exData.sets.length >= numSets) {
      setsOk = exData.sets.every(function(set) { return (set.reps || 0) >= maxReps; });
    } else {
      setsOk = (exData.reps || 0) >= maxReps;
    }
    if (setsOk) consecutiveMaxSessions++;
    else break;
  }

  // DOUBLE PROGRESSION LOGIC:
  var increment = getWeightStep(exerciseId);
  var unit = getWeightUnit(exerciseId);

  if (consecutiveMaxSessions >= 2) {
    // Hit max reps for 2+ sessions → increase weight, drop to min reps
    var nextWeight = getNextWeightUp(exerciseId, lastWeight);
    return {
      ready: true,
      current: lastWeight,
      suggested: nextWeight,
      targetReps: minReps,
      message: '\uD83D\uDCAA Verhoog naar ' + nextWeight + ' ' + unit + ' \u00b7 ' + numSets + '\u00d7' + minReps
    };
  } else if (allSetsAtMax) {
    // Hit max reps once → do it again to confirm
    return {
      ready: false,
      current: lastWeight,
      suggested: lastWeight,
      targetReps: maxReps,
      message: '\u2705 ' + lastWeight + ' ' + unit + ' \u00b7 ' + numSets + '\u00d7' + maxReps + ' \u2014 haal dit nog 1x, dan gewicht omhoog!'
    };
  } else if (lastReps < maxReps) {
    // Count consecutive sessions at same weight AND same reps
    var consecutiveSameReps = 0;
    for (var cr = sessions.length - 1; cr >= 0; cr--) {
      var crSess = sessions[cr];
      if (!crSess.exercises) continue;
      var crEx = crSess.exercises.find(function(e) { return e.id === exerciseId; });
      if (!crEx || crEx.skipped) continue;
      if (crEx.weight !== lastWeight) break;
      // Check reps: use minimum of all sets, or summary reps
      var crReps = crEx.reps || 0;
      if (crEx.sets && crEx.sets.length > 0) {
        crReps = Math.min.apply(null, crEx.sets.map(function(s) { return s.reps || 0; }));
      }
      if (crReps >= lastReps) consecutiveSameReps++;
      else break;
    }

    if (consecutiveSameReps >= 2) {
      // Consistent at this rep count for 2+ sessions → suggest +1 rep
      var nextReps = Math.min(lastReps + 1, maxReps);
      return {
        ready: false,
        current: lastWeight,
        suggested: lastWeight,
        targetReps: nextReps,
        message: lastWeight + ' ' + unit + ' \u00b7 probeer ' + numSets + '\u00d7' + nextReps + ' (zelfde gewicht, +1 herhaling)'
      };
    } else {
      // Not yet consistent — repeat same reps to build consistency
      // Check if plateauing (5+ sessions at same weight without progress)
      var sessionsAtWeight = 0;
      for (var pw = sessions.length - 1; pw >= 0; pw--) {
        var pwSess = sessions[pw];
        if (!pwSess.exercises) continue;
        var pwEx = pwSess.exercises.find(function(e) { return e.id === exerciseId; });
        if (!pwEx || pwEx.skipped) continue;
        if (pwEx.weight !== lastWeight) break;
        sessionsAtWeight++;
      }
      var plateauMsg = '';
      if (sessionsAtWeight >= 5) {
        plateauMsg = ' \u2014 je bouwt kracht op, dit is normaal!';
      }
      return {
        ready: false,
        current: lastWeight,
        suggested: lastWeight,
        targetReps: lastReps,
        message: lastWeight + ' ' + unit + ' \u00b7 ' + numSets + '\u00d7' + lastReps + ' nog een keer herhalen' + plateauMsg
      };
    }
  }

  return null;
}

// ================================================================
// WAKE LOCK (keep screen on during training)
// ================================================================
var wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', function() { wakeLock = null; });
    }
  } catch(e) { /* Wake lock not supported or failed */ }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// Background timer compensation: corrigeer timers op basis van echte kloktijd
var _bgHiddenAt = 0;
var _bgTmTimerAtHide = 0;
var _bgCardioPhaseAtHide = 0;
var _bgIntervalLeftAtHide = 0;
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') {
    _bgHiddenAt = Date.now();
    _bgTmTimerAtHide = tmTimerSeconds;
    _bgCardioPhaseAtHide = cardioPhaseSeconds;
    _bgIntervalLeftAtHide = intervalSecondsLeft;
  } else if (document.visibilityState === 'visible') {
    if (trainingModeActive) requestWakeLock();
    if (_bgHiddenAt > 0) {
      var elapsed = Math.floor((Date.now() - _bgHiddenAt) / 1000);
      _bgHiddenAt = 0;
      if (elapsed > 1 && trainingModeActive) {
        if (_bgTmTimerAtHide > 0 && (tmState === 'warmup-timer' || tmState === 'resting' || tmState === 'plank-timer' || tmState === 'cooldown-timer' || tmState === 'cooldown-stretch-timer')) {
          tmTimerSeconds = Math.max(0, _bgTmTimerAtHide - elapsed);
          if (tmTimerSeconds <= 0) {
            clearInterval(tmTimerInterval);
            hapticFeedback('medium');
            playTimerSound('double');
            if (tmState === 'warmup-timer') { tmState = 'idle'; finishWarmup(); }
            else if (tmState === 'resting') { tmState = 'idle'; renderTrainingStep(); }
            else if (tmState === 'plank-timer') { tmState = 'idle'; completeSet(); }
            else if (tmState === 'cooldown-timer') { finishCooldownWalking(); }
            else if (tmState === 'cooldown-stretch-timer') { tmState = 'idle'; advanceCooldownStretch(); }
          } else {
            var d = document.getElementById('tmTimerDisplay');
            if (d) d.textContent = formatTimer(tmTimerSeconds);
          }
        }
        if (cardioTimerActive && _bgCardioPhaseAtHide > 0) {
          cardioPhaseSeconds = Math.max(0, _bgCardioPhaseAtHide - elapsed);
          if (intervalIsAutoMode) intervalSecondsLeft = Math.max(0, _bgIntervalLeftAtHide - elapsed);
          if (cardioPhaseSeconds <= 0) {
            advanceCardioPhase();
          } else {
            renderCardioTimerStep();
          }
        }
      }
    }
  }
});

// ================================================================
// TRAINING MODE STATE — STRAIGHT SETS
// ================================================================
var trainingModeActive = false;
var currentTraining = null;
var currentTrainingKey = '';
var currentExerciseIds = [];
var currentExerciseIndex = 0;
var currentSet = 1;
var totalSets = 3;
var tmTimerInterval = null;
var tmTimerSeconds = 0;
var tmTimerEndTime = 0; // absolute end time for robust timer
var _timerStartTime = 0;
var _timerTotalSeconds = 0;
var _dailyTimerStartTime = 0;
var _dailyTimerTotalSeconds = 0;
var dailyRoutineActive = false;
var dailyRoutineIndex = 0;
var dailyRoutineTimerInterval = null;
var dailyRoutineTimerSeconds = 0;
var tmState = 'idle'; // idle, set, resting
var sessionExerciseLog = {};
var _lastActivityTime = Date.now();
var _skipConfirmed = false;
var _idleCheckInterval = null;
var trainingStartTime = null;
var trainingStartDate = null;
var trainingPhase = 'warmup'; // warmup, exercises, cooldown

function unlockAudio() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  try {
    var osc = _audioCtx.createOscillator();
    var gain = _audioCtx.createGain();
    osc.connect(gain); gain.connect(_audioCtx.destination);
    gain.gain.setValueAtTime(0, _audioCtx.currentTime);
    osc.start(_audioCtx.currentTime); osc.stop(_audioCtx.currentTime + 0.01);
  } catch(e) {}
}

function startTrainingMode(trainingKey) {
  unlockAudio();
  if (hasPausedTraining()) {
    if (!confirm('Je hebt nog een gepauzeerde training. Wil je die verwijderen en een nieuwe starten?')) return;
    setStore('pausedTraining', null);
  }
  currentTraining = TRAINING_DATA[trainingKey];
  currentTrainingKey = trainingKey;
  if (!currentTraining || currentTraining.type !== 'kracht') return;

  currentExerciseIds = getTrainingExercises(trainingKey);

  trainingModeActive = true;
  currentExerciseIndex = 0;
  currentSet = 1;
  sessionExerciseLog = {};
  trainingStartTime = new Date().toISOString();
  trainingStartDate = getTodayKey();
  tmState = 'idle';
  trainingPhase = 'warmup';

  requestWakeLock();
  document.getElementById('trainingMode').classList.add('active');
  document.getElementById('bottomNav').style.display = 'none';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  startIdleCheck();
  renderTrainingStep();
}

function resetActivity() { _lastActivityTime = Date.now(); }

function startIdleCheck() {
  _lastActivityTime = Date.now();
  clearInterval(_idleCheckInterval);
  _idleCheckInterval = setInterval(function() {
    if (!trainingModeActive) { clearInterval(_idleCheckInterval); return; }
    if (tmState !== 'idle' && tmState !== 'set') return;
    var idleMin = (Date.now() - _lastActivityTime) / 60000;
    if (idleMin >= 20) {
      _lastActivityTime = Date.now();
      if (confirm('Je training staat al 20 minuten stil. Wil je pauzeren?')) {
        pauseTraining();
      }
    }
  }, 60000);
}

function stopIdleCheck() {
  clearInterval(_idleCheckInterval);
}

var trainingPaused = false;
var pausedTimerSeconds = 0;

function pauseTraining() {
  if (trainingPaused) return;
  trainingPaused = true;
  pausedTimerSeconds = tmTimerSeconds;
  clearInterval(tmTimerInterval);

  var body = document.getElementById('tmBody');
  var overlay = document.createElement('div');
  overlay.id = 'pauseOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;';
  overlay.innerHTML = '<div style="font-size:48px;margin-bottom:16px">\u23F8\uFE0F</div>' +
    '<h2 style="font-size:24px;margin-bottom:8px">Gepauzeerd</h2>' +
    '<p style="opacity:0.7;margin-bottom:32px">Je training staat op pauze</p>' +
    '<button onclick="resumeFromPause()" style="background:var(--primary);color:white;border:none;padding:16px 48px;border-radius:12px;font-size:18px;font-weight:700;cursor:pointer;margin-bottom:12px">Hervat training</button>' +
    '<button onclick="exitPause()" style="background:transparent;color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.3);padding:10px 32px;border-radius:8px;font-size:14px;cursor:pointer">Training stoppen</button>';
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
}

function resumeFromPause() {
  trainingPaused = false;
  var overlay = document.getElementById('pauseOverlay');
  if (overlay) overlay.remove();
  tmTimerSeconds = pausedTimerSeconds;
  // Restart timer if we were in a timed state
  if (tmState === 'warmup-timer') startWarmupTimer(tmTimerSeconds / 60);
  else if (tmState === 'resting') startRestTimer();
  else if (tmState === 'plank-timer') {
    clearInterval(tmTimerInterval);
    _timerStartTime = Date.now();
    _timerTotalSeconds = tmTimerSeconds;
    tmTimerInterval = setInterval(function() {
      var elapsed = Math.floor((Date.now() - _timerStartTime) / 1000);
      tmTimerSeconds = Math.max(0, _timerTotalSeconds - elapsed);
      var display = document.getElementById('tmTimerDisplay');
      if (display) display.textContent = formatTimer(tmTimerSeconds);
      if (tmTimerSeconds <= 0) { clearInterval(tmTimerInterval); hapticFeedback('heavy'); playTimerSound('double'); tmState = 'idle'; completeSet(); }
    }, 500);
  }
  else if (tmState === 'cooldown-timer') startCooldownTimer();
  else renderTrainingStep();
}

function exitPause() {
  trainingPaused = false;
  var overlay = document.getElementById('pauseOverlay');
  if (overlay) overlay.remove();
  confirmExitTraining();
}

function hasPausedTraining() {
  var paused = getStore('pausedTraining', null);
  if (!paused) return false;
  var pausedTime = new Date(paused.pausedAt).getTime();
  if (Date.now() - pausedTime > 2 * 60 * 60 * 1000) {
    setStore('pausedTraining', null);
    return false;
  }
  return true;
}

function renderResumeBanner() {
  var paused = getStore('pausedTraining', null);
  if (!paused) return '';
  var training = TRAINING_DATA[paused.trainingKey];
  if (!training) return '';
  var doneCount = Object.keys(paused.sessionExerciseLog).length;
  var totalCount = (getTrainingExercises(paused.trainingKey) || []).length;
  var minAgo = Math.round((Date.now() - new Date(paused.pausedAt).getTime()) / 60000);
  var timeText = minAgo < 1 ? 'zojuist' : minAgo + ' min geleden';
  return '<div class="resume-banner" onclick="resumeTraining()">' +
    '<div style="font-size:28px">\u25B6\uFE0F</div>' +
    '<div style="flex:1">' +
    '<div style="font-weight:700;font-size:15px">Training hervatten</div>' +
    '<div style="font-size:13px;opacity:0.9">' + training.name + ' \u2014 ' + doneCount + '/' + totalCount + ' oefeningen \u2014 gepauzeerd ' + timeText + '</div>' +
    '</div></div>';
}

function resumeTraining() {
  var paused = getStore('pausedTraining', null);
  if (!paused) return;
  setStore('pausedTraining', null);

  currentTraining = TRAINING_DATA[paused.trainingKey];
  currentTrainingKey = paused.trainingKey;
  if (!currentTraining) return;

  currentExerciseIds = getTrainingExercises(paused.trainingKey);
  trainingModeActive = true;
  currentExerciseIndex = paused.exerciseIndex;
  currentSet = paused.currentSet;
  sessionExerciseLog = paused.sessionExerciseLog || {};
  trainingStartTime = paused.trainingStartTime;
  trainingPhase = paused.trainingPhase || 'exercises';
  tmState = 'idle';

  requestWakeLock();
  document.getElementById('trainingMode').classList.add('active');
  document.getElementById('bottomNav').style.display = 'none';
  document.body.style.overflow = 'hidden';
  renderTrainingStep();
}

function discardPausedTraining() {
  setStore('pausedTraining', null);
  renderToday();
}

function confirmExitTraining() {
  setStore('pausedTraining', null);
  var hasData = Object.keys(sessionExerciseLog).length > 0;
  if (hasData) {
    if (confirm('Wil je de ' + Object.keys(sessionExerciseLog).length + ' oefeningen die je al gedaan hebt opslaan?')) {
      exitTrainingMode(true); // save partial session
      return;
    }
    if (!confirm('Weet je zeker? Dan gaat alles verloren.')) return;
  }
  exitTrainingMode(false);
}

function exitTrainingMode(save) {
  trainingModeActive = false;
  clearInterval(tmTimerInterval);
  clearInterval(cardioTimerInterval);
  clearInterval(stretchTimerInterval);
  stopIdleCheck();
  cardioTimerActive = false;
  tmState = 'idle';
  releaseWakeLock();
  document.getElementById('trainingMode').classList.remove('active');
  document.getElementById('bottomNav').style.display = 'flex';
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';

  if (save) {
    saveFinalSession();
    renderCompletionInTrainingMode();
  } else {
    renderToday();
  }
}

function getCurrentExercise() {
  var ids = currentExerciseIds.length > 0 ? currentExerciseIds : currentTraining.exerciseIds;
  if (currentExerciseIndex >= ids.length) return null;
  return getExercise(ids[currentExerciseIndex]);
}

function renderTrainingStep() {
  var body = document.getElementById('tmBody');

  // Warmup phase
  if (trainingPhase === 'warmup') {
    renderWarmupScreen();
    return;
  }

  // Cooldown phase
  if (trainingPhase === 'cooldown') {
    renderCooldownScreen();
    return;
  }

  // Exercise phase
  var ex = getCurrentExercise();

  if (!ex) {
    // All exercises done → go to cooldown
    trainingPhase = 'cooldown';
    renderCooldownScreen();
    return;
  }

  updateProgressBar();

  var exId = ex.id;
  var prevWeight = getLastWeight(exId);
  var progression = getProgressionSuggestion(exId);
  var logKey = exId + '_s' + currentSet;

  if (tmState === 'resting') {
    renderRestScreen(ex);
    return;
  }

  // Show exercise screen — STRAIGHT SETS
  var exNum = currentExerciseIndex + 1;
  var ids = currentExerciseIds.length > 0 ? currentExerciseIds : currentTraining.exerciseIds;
  var totalEx = ids.length;
  var html = '';
  html += '<div class="tm-round-info">Oefening ' + exNum + '/' + totalEx + ' \u00b7 Set ' + currentSet + ' van ' + totalSets + '</div>';
  html += '<div class="tm-exercise-name">' + ex.name + '</div>';
  html += '<div class="tm-exercise-detail">' + ex.apparaat + ' \u00b7 ' + ex.reps + '</div>';

  var unit = getWeightUnit(exId);

  var lastSession = getLastSession(exId);
  if (progression) {
    html += '<div class="tm-suggestion" style="color:' + (progression.ready ? 'var(--success)' : 'var(--text-light)') + '">' + progression.message + '</div>';
  } else if (lastSession && lastSession.weight > 0) {
    html += '<div class="tm-prev-badge">';
    html += '<span class="tm-prev-label">Vorige keer</span>';
    html += '<span class="tm-prev-value">' + ('' + lastSession.weight).replace('.', ',') + ' ' + unit + ' \u00b7 ' + (lastSession.reps || '?') + ' reps</span>';
    html += '</div>';
  }

  if (!ex.isPlank) {
    var suggestedWeight = progression ? progression.suggested : prevWeight;
    var suggestedReps = progression ? progression.targetReps : (ex.defaultReps || 8);
    // Check vorige set van dezelfde oefening in deze sessie
    var prevSetWeight = 0, prevSetReps = 0;
    for (var ps = currentSet - 1; ps >= 1; ps--) {
      var prevSetKey = exId + '_s' + ps;
      if (sessionExerciseLog[prevSetKey] && sessionExerciseLog[prevSetKey].done) {
        prevSetWeight = sessionExerciseLog[prevSetKey].weight || 0;
        prevSetReps = sessionExerciseLog[prevSetKey].reps || 0;
        break;
      }
    }
    var defaultWeight = (sessionExerciseLog[logKey] && sessionExerciseLog[logKey].weight) || prevSetWeight || suggestedWeight || prevWeight || 0;
    var defaultReps = (sessionExerciseLog[logKey] && sessionExerciseLog[logKey].reps) || prevSetReps || suggestedReps || ex.defaultReps || 8;
    var step = getWeightStep(exId);
    var repRange = parseRepRange(ex.reps);

    // Weight picker — horizontale scroll strip
    if (!ex.isBodyweight) {
      var weightOptions = getAllWeightOptions(exId, step);
      html += '<div style="margin-bottom:16px;width:100%">';
      html += '<div style="font-size:12px;color:var(--text-light);margin-bottom:6px;text-align:center">Gewicht (' + unit + ') — swipe voor meer</div>';
      html += '<div id="tmWeightPicker" style="display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:8px 4px;scrollbar-width:none">';
      for (var wi = 0; wi < weightOptions.length; wi++) {
        var wo = weightOptions[wi];
        var isSelected = wo.value === defaultWeight;
        var isSuggestion = wo.isSuggestion;
        var btnStyle = isSelected
          ? 'background:var(--primary);color:white;border-color:var(--primary);transform:scale(1.1)'
          : isSuggestion
            ? 'background:var(--hint-bg);color:var(--success-text);border-color:var(--success);border-style:dashed'
            : 'background:var(--card);color:var(--text);border-color:var(--border)';
        html += '<button onclick="selectWeight(' + wo.value + ',this)" data-weight="' + wo.value + '" ';
        html += 'style="min-width:56px;flex-shrink:0;padding:12px 8px;border:2px solid;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;scroll-snap-align:center;transition:transform 0.15s,background 0.15s;' + btnStyle + '">';
        html += ('' + wo.value).replace('.', ',') + '</button>';
      }
      html += '</div>';
      html += '<input type="hidden" id="tmWeight" value="' + defaultWeight + '">';
      html += '</div>';
      // auto-scroll happens after innerHTML is set (see renderExerciseStep end)
    } else {
      html += '<div style="margin-bottom:12px;font-size:13px;color:var(--text-light);text-align:center">Lichaamsgewicht \u2014 geen gewicht nodig</div>';
      html += '<input type="hidden" id="tmWeight" value="0">';
    }

    // Reps picker
    html += '<div style="margin-bottom:20px;width:100%;max-width:340px">';
    html += '<div style="font-size:12px;color:var(--text-light);margin-bottom:6px;text-align:center">Herhalingen</div>';
    html += '<div id="tmRepsPicker" style="display:flex;gap:6px;justify-content:center">';
    for (var ri = repRange.min; ri <= repRange.max; ri++) {
      var rSelected = ri === defaultReps;
      var rStyle = rSelected
        ? 'background:var(--primary);color:white;border-color:var(--primary)'
        : 'background:var(--card);color:var(--text);border-color:var(--border)';
      html += '<button onclick="selectReps(' + ri + ',this)" data-reps="' + ri + '" ';
      html += 'style="min-width:44px;padding:10px 6px;border:2px solid;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;' + rStyle + '">';
      html += ri + '</button>';
    }
    html += '</div>';
    html += '<input type="hidden" id="tmReps" value="' + defaultReps + '">';
    html += '</div>';
  } else {
    // Plank with countdown timer — use progression to determine target seconds
    var plankRepRange = parseRepRange(ex.reps);
    var plankTarget = plankRepRange.min; // start at lower bound (e.g. 20)
    if (progression && progression.targetReps) {
      plankTarget = progression.targetReps;
    } else if (prevWeight > 0) {
      plankTarget = Math.min(prevWeight + 2, plankRepRange.max);
    }
    plankTarget = Math.max(plankRepRange.min, Math.min(plankTarget, plankRepRange.max));

    if (tmState === 'plank-timer') {
      html += '<div class="tm-timer plank-active" id="tmTimerDisplay">' + formatTimer(tmTimerSeconds) + '</div>';
      html += '<div style="font-size:14px;color:var(--text-light);margin-bottom:16px">Hou vol! Je kunt dit!</div>';
      html += '<button class="tm-btn tm-btn-success" onclick="stopPlankTimer()">Plank klaar! \u2714</button>';
    } else if (tmState === 'plank-confirm') {
      var confirmSec = _plankHeldSeconds || plankTarget;
      html += '<div style="font-size:14px;color:var(--text-light);margin-bottom:12px">Hoeveel seconden heb je volgehouden?</div>';
      html += '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:20px">';
      html += '<button onclick="adjustPlankSeconds(-1)" style="width:48px;height:48px;border-radius:50%;border:2px solid var(--border);background:var(--card);font-size:22px;font-weight:700;cursor:pointer;color:var(--text)">\u2212</button>';
      html += '<span id="plankSecDisplay" style="font-size:36px;font-weight:800;color:var(--primary);min-width:60px;text-align:center">' + confirmSec + '</span>';
      html += '<button onclick="adjustPlankSeconds(1)" style="width:48px;height:48px;border-radius:50%;border:2px solid var(--border);background:var(--card);font-size:22px;font-weight:700;cursor:pointer;color:var(--text)">+</button>';
      html += '</div>';
      html += '<button class="tm-btn tm-btn-success" onclick="confirmPlankSeconds()" style="width:100%">Bevestig \u2714</button>';
    } else {
      html += '<div style="margin-bottom:16px;font-size:16px;color:var(--text-light)">Doel: ' + plankTarget + ' seconden</div>';
      html += '<button class="tm-btn tm-btn-accent" onclick="startPlankTimer(' + plankTarget + ')" style="margin-bottom:8px">Start plank timer (' + plankTarget + ' sec)</button>';
      html += '<button class="tm-btn" onclick="skipPlankTimer(' + plankTarget + ')" style="font-size:13px;opacity:0.7">Zonder timer \u2014 zelf invullen</button>';
    }
  }

  // Instruction toggle
  if (ex.instruction) {
    html += '<button class="tm-instruction-toggle" onclick="toggleTmInstruction()">Hoe doe ik deze oefening?</button>';
    html += '<div class="tm-instruction-box" id="tmInstructionBox">';
    html += renderVideoHtml(ex);
    html += '<div class="instr-goal">' + ex.instruction.goal + '</div>';
    html += '<ol class="instr-steps">';
    ex.instruction.steps.forEach(function(s) { html += '<li>' + s + '</li>'; });
    html += '</ol>';
    html += '<div class="instr-focus">' + ex.instruction.focus + '</div>';
    html += '<div class="instr-mistake">' + ex.instruction.mistake + '</div>';
    html += '</div>';
  }

  if (!ex.isPlank || tmState !== 'plank-timer') {
    html += '<button class="tm-btn tm-btn-success" onclick="completeSet()">Set voltooid \u2714</button>';
  }
  html += '<div style="display:flex;gap:8px;justify-content:center;margin-top:4px">';
  if (currentExerciseIndex > 0 || currentSet > 1) {
    html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="goStepBack()" style="flex:1;max-width:150px">\u25C0 Vorige</button>';
  }
  html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="skipExercise()" style="flex:1;max-width:150px">Overslaan \u25B6</button>';
  html += '</div>';

  body.innerHTML = html;
  document.getElementById('tmHeader').querySelector('h2').textContent = currentTraining.name;
  // Auto-scroll weight picker naar geselecteerd gewicht
  setTimeout(function() {
    var picker = document.getElementById('tmWeightPicker');
    if (!picker) return;
    var weightEl = document.getElementById('tmWeight');
    if (!weightEl) return;
    var sel = picker.querySelector('[data-weight="' + weightEl.value + '"]');
    if (sel) sel.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
  }, 50);
  initVideoObserver();
}

function renderWarmupScreen() {
  var body = document.getElementById('tmBody');
  var warmup = currentTraining.warmup;
  if (!warmup) {
    trainingPhase = 'exercises';
    renderTrainingStep();
    return;
  }

  updateProgressBar();

  // Parse warmup duration for timer — use average of range (e.g. "5–8 min" → 6 min)
  var warmupMin = 5;
  if (warmup.duur) {
    var nums = warmup.duur.match(/(\d+)/g);
    if (nums && nums.length >= 2) {
      warmupMin = Math.round((parseInt(nums[0]) + parseInt(nums[1])) / 2);
    } else if (nums) {
      warmupMin = parseInt(nums[0]);
    }
  }

  var html = '';

  if (currentTraining.description) {
    html += '<div style="background:var(--info-bg);border-radius:12px;padding:12px 16px;margin-bottom:16px;text-align:left">';
    html += '<div style="font-size:12px;font-weight:700;color:var(--primary);text-transform:uppercase;margin-bottom:4px">Doel van vandaag</div>';
    html += '<div style="font-size:14px;color:var(--text);line-height:1.5">' + currentTraining.description + '</div>';
    html += '</div>';
  }

  html += '<div class="tm-warmup-cooldown">';
  html += '<div class="tm-phase-icon">\uD83D\uDD25</div>';
  html += '<div class="tm-exercise-name">Warming-up</div>';
  html += '<div class="tm-exercise-detail">' + warmup.apparaat + ' \u00b7 ' + warmup.duur + '</div>';
  html += '<div style="color:var(--text-light);font-size:15px;margin:8px 0 20px">' + warmup.detail + '</div>';

  if (tmState === 'warmup-timer') {
    html += '<div class="tm-timer warmup" id="tmTimerDisplay">' + formatTimer(tmTimerSeconds) + '</div>';
    html += '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px">';
    html += '<button class="tm-btn tm-btn-success" onclick="finishWarmup()">Klaar!</button>';
    html += '<button class="tm-btn tm-btn-outline" style="max-width:150px" onclick="addRestTime(60)">+1 min</button>';
    html += '</div>';
  } else {
    html += '<button class="tm-btn tm-btn-accent" onclick="startWarmupTimer(' + warmupMin + ')">Start warming-up timer (' + warmupMin + ' min)</button>';
    html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="finishWarmup()" style="margin-top:8px">Overslaan</button>';
  }

  html += '</div>';
  body.innerHTML = html;
  document.getElementById('tmHeader').querySelector('h2').textContent = 'Warming-up';
}

function startWarmupTimer(minutes) {
  tmState = 'warmup-timer';
  tmTimerSeconds = minutes * 60;
  clearInterval(tmTimerInterval);
  _timerStartTime = Date.now();
  _timerTotalSeconds = tmTimerSeconds;
  renderWarmupScreen();
  tmTimerInterval = setInterval(function() {
    var elapsed = Math.floor((Date.now() - _timerStartTime) / 1000);
    tmTimerSeconds = Math.max(0, _timerTotalSeconds - elapsed);
    var display = document.getElementById('tmTimerDisplay');
    if (display) display.textContent = formatTimer(tmTimerSeconds);
    if (tmTimerSeconds <= 0) {
      clearInterval(tmTimerInterval);
      hapticFeedback('heavy');
      playTimerSound('double');
      finishWarmup();
    }
  }, 500);
}

function finishWarmup() {
  clearInterval(tmTimerInterval);
  tmState = 'idle';
  trainingPhase = 'exercises';
  renderTrainingStep();
}

function getStretchById(id) {
  for (var i = 0; i < STRETCH_ROUTINES.length; i++) {
    if (STRETCH_ROUTINES[i].id === id) return STRETCH_ROUTINES[i];
  }
  return null;
}

var cooldownSubPhase = 'walking';
var cooldownStretchIdx = 0;
var cooldownStretchSide = 0;

function renderCooldownScreen() {
  var body = document.getElementById('tmBody');
  var stretchIds = currentTraining.cooldownStretches || [];

  updateProgressBar();

  if (cooldownSubPhase === 'walking') {
    var html = '<div class="tm-warmup-cooldown">';
    html += '<div class="tm-phase-icon">\uD83D\uDEB6</div>';
    html += '<div class="tm-exercise-name">Cooldown: wandelen</div>';
    html += '<div style="color:var(--text-light);font-size:15px;margin:8px 0 16px;line-height:1.5">5 min rustig wandelen op de loopband (5.0\u20135.5 km/u)</div>';

    if (tmState === 'cooldown-timer') {
      html += '<div class="tm-timer cooldown" id="tmTimerDisplay">' + formatTimer(tmTimerSeconds) + '</div>';
      html += '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px">';
      html += '<button class="tm-btn tm-btn-success" onclick="finishCooldownWalking()">Wandelen klaar \u2192 Stretches</button>';
      html += '<button class="tm-btn tm-btn-outline" style="max-width:150px" onclick="addRestTime(60)">+1 min</button>';
      html += '</div>';
    } else {
      html += '<button class="tm-btn tm-btn-accent" onclick="startCooldownTimer()" style="margin-top:16px">Start wandel-timer (5 min)</button>';
      html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="finishCooldownWalking()" style="margin-top:8px">Overslaan \u2192 Stretches</button>';
    }
    html += '</div>';
    body.innerHTML = html;
    document.getElementById('tmHeader').querySelector('h2').textContent = 'Cooldown \u2014 Wandelen';
  } else {
    // Stap-voor-stap stretches met timer
    if (cooldownStretchIdx >= stretchIds.length) {
      var html = '<div class="tm-warmup-cooldown">';
      html += '<div class="tm-phase-icon">\u2705</div>';
      html += '<div class="tm-exercise-name">Stretches klaar!</div>';
      html += '<div style="color:var(--text-light);font-size:15px;margin:8px 0 16px">Goed gedaan. Je cooldown is compleet.</div>';
      html += '<button class="tm-btn tm-btn-success" onclick="finishCooldown()" style="margin-top:8px">\u2705 Training afronden!</button>';
      html += '</div>';
      body.innerHTML = html;
      document.getElementById('tmHeader').querySelector('h2').textContent = 'Cooldown \u2014 Klaar!';
      return;
    }

    var sid = stretchIds[cooldownStretchIdx];
    var s = getStretchById(sid);
    if (!s) { cooldownStretchIdx++; renderCooldownScreen(); return; }

    var sideLabel = '';
    if (s.perKant) sideLabel = cooldownStretchSide === 0 ? ' (links)' : ' (rechts)';

    var html = '<div class="tm-warmup-cooldown">';
    html += '<div style="font-size:14px;color:var(--primary-light);font-weight:600;margin-bottom:8px">Stretch ' + (cooldownStretchIdx + 1) + ' / ' + stretchIds.length + sideLabel + '</div>';
    html += '<div class="tm-exercise-name" style="font-size:22px;margin-bottom:8px">' + s.name + '</div>';

    html += '<div style="font-size:13px;color:var(--text);line-height:1.5;max-width:320px;margin:0 auto 10px;padding:10px 14px;background:var(--card);border-radius:10px;text-align:left">' + s.instruction + '</div>';
    if (s.focus) html += '<div style="font-size:12px;color:var(--success);margin-bottom:10px">\u2714\uFE0F ' + s.focus + '</div>';

    if (s.videoUrl) {
      html += '<div style="margin:0 0 12px"><video src="' + s.videoUrl + '" autoplay loop muted playsinline style="width:100%;max-width:200px;border-radius:8px"></video></div>';
    }

    if (tmState === 'cooldown-stretch-timer') {
      html += '<div class="tm-timer cooldown" id="tmTimerDisplay" style="font-size:56px">' + tmTimerSeconds + '</div>';
      html += '<div style="font-size:13px;color:var(--text-light);margin-bottom:12px">Houd vast en adem rustig door</div>';
      html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="skipCooldownStretch()">Overslaan</button>';
    } else {
      html += '<div class="tm-timer" style="font-size:56px;color:var(--text-light)">' + s.duur + '</div>';
      html += '<button class="tm-btn tm-btn-accent" onclick="startCooldownStretchTimer(' + s.duur + ')">Start ' + s.duur + ' sec</button>';
      html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="skipCooldownStretch()" style="margin-top:6px">Overslaan</button>';
    }
    html += '</div>';
    body.innerHTML = html;
    document.getElementById('tmHeader').querySelector('h2').textContent = 'Cooldown \u2014 Stretches';
  }
}

function startCooldownTimer() {
  tmState = 'cooldown-timer';
  tmTimerSeconds = 5 * 60;
  renderCooldownScreen();
  clearInterval(tmTimerInterval);
  _timerStartTime = Date.now();
  _timerTotalSeconds = tmTimerSeconds;
  tmTimerInterval = setInterval(function() {
    var elapsed = Math.floor((Date.now() - _timerStartTime) / 1000);
    tmTimerSeconds = Math.max(0, _timerTotalSeconds - elapsed);
    var display = document.getElementById('tmTimerDisplay');
    if (display) display.textContent = formatTimer(tmTimerSeconds);
    if (tmTimerSeconds <= 0) {
      clearInterval(tmTimerInterval);
      hapticFeedback('heavy');
      playTimerSound('double');
      finishCooldownWalking();
    }
  }, 500);
}

function finishCooldownWalking() {
  clearInterval(tmTimerInterval);
  tmState = 'idle';
  cooldownSubPhase = 'stretches';
  cooldownStretchIdx = 0;
  cooldownStretchSide = 0;
  renderCooldownScreen();
}

function startCooldownStretchTimer(seconds) {
  tmState = 'cooldown-stretch-timer';
  tmTimerSeconds = seconds;
  renderCooldownScreen();
  clearInterval(tmTimerInterval);
  _timerStartTime = Date.now();
  _timerTotalSeconds = tmTimerSeconds;
  tmTimerInterval = setInterval(function() {
    var elapsed = Math.floor((Date.now() - _timerStartTime) / 1000);
    tmTimerSeconds = Math.max(0, _timerTotalSeconds - elapsed);
    var display = document.getElementById('tmTimerDisplay');
    if (display) display.textContent = tmTimerSeconds;
    if (tmTimerSeconds <= 0) {
      clearInterval(tmTimerInterval);
      hapticFeedback('light');
      playTimerSound('short');
      tmState = 'idle';
      advanceCooldownStretch();
    }
  }, 500);
}

function skipCooldownStretch() {
  clearInterval(tmTimerInterval);
  tmState = 'idle';
  advanceCooldownStretch();
}

function advanceCooldownStretch() {
  var stretchIds = currentTraining.cooldownStretches || [];
  if (cooldownStretchIdx < stretchIds.length) {
    var s = getStretchById(stretchIds[cooldownStretchIdx]);
    if (s && s.perKant && cooldownStretchSide === 0) {
      cooldownStretchSide = 1;
    } else {
      cooldownStretchIdx++;
      cooldownStretchSide = 0;
    }
  }
  renderCooldownScreen();
}

function finishCooldown() {
  clearInterval(tmTimerInterval);
  tmState = 'idle';
  cooldownSubPhase = 'walking';
  cooldownStretchIdx = 0;
  cooldownStretchSide = 0;
  exitTrainingMode(true);
}

var _plankHeldSeconds = 0;

function stopPlankTimer() {
  clearInterval(tmTimerInterval);
  var total = _timerTotalSeconds || 0;
  var remaining = tmTimerSeconds || 0;
  _plankHeldSeconds = Math.max(1, total - remaining);
  tmState = 'plank-confirm';
  renderTrainingStep();
}

function skipPlankTimer(target) {
  _plankHeldSeconds = target;
  tmState = 'plank-confirm';
  renderTrainingStep();
}

function adjustPlankSeconds(delta) {
  _plankHeldSeconds = Math.max(1, _plankHeldSeconds + delta);
  var display = document.getElementById('plankSecDisplay');
  if (display) display.textContent = _plankHeldSeconds;
}

function confirmPlankSeconds() {
  tmState = 'idle';
  completeSet();
}

function toggleTmInstruction() {
  var box = document.getElementById('tmInstructionBox');
  if (box) {
    box.classList.toggle('show');
    initVideoObserver();
  }
}

function startPlankTimer(seconds) {
  tmState = 'plank-timer';
  tmTimerSeconds = seconds;
  renderTrainingStep();
  clearInterval(tmTimerInterval);
  _timerStartTime = Date.now();
  _timerTotalSeconds = tmTimerSeconds;
  tmTimerInterval = setInterval(function() {
    var elapsed = Math.floor((Date.now() - _timerStartTime) / 1000);
    tmTimerSeconds = Math.max(0, _timerTotalSeconds - elapsed);
    var display = document.getElementById('tmTimerDisplay');
    if (display) display.textContent = formatTimer(tmTimerSeconds);
    if (tmTimerSeconds <= 0) {
      clearInterval(tmTimerInterval);
      hapticFeedback('heavy');
      playTimerSound('double');
      // Go to confirm screen instead of auto-completing
      _plankHeldSeconds = _timerTotalSeconds;
      tmState = 'plank-confirm';
      renderTrainingStep();
    }
  }, 500);
}

function completeSet() {
  resetActivity();
  var ex = getCurrentExercise();
  if (!ex) return;

  var logKey = ex.id + '_s' + currentSet;

  if (!ex.isPlank) {
    var wEl = document.getElementById('tmWeight');
    var rEl = document.getElementById('tmReps');
    var w = Math.max(0, parseFloat(String(wEl.value).replace(',', '.')) || 0);
    var r = Math.max(1, parseInt(rEl.value) || ex.defaultReps);
    sessionExerciseLog[logKey] = { id: ex.id, weight: w, reps: r, done: true };
  } else {
    // Plank: use confirmed seconds from plank-confirm screen
    var heldSec = _plankHeldSeconds || 0;
    sessionExerciseLog[logKey] = { id: ex.id, weight: 0, reps: heldSec, done: true };
  }

  // Start rest timer (shorter rest after last set before next exercise)
  tmState = 'resting';
  tmTimerSeconds = ex.rest;
  renderRestScreen(ex);
  startRestTimer();
}

function renderRestScreen(ex) {
  var body = document.getElementById('tmBody');
  var html = '';

  html += '<div class="tm-timer-label">Rusttijd</div>';
  html += '<div class="tm-timer resting" id="tmTimerDisplay">' + formatTimer(tmTimerSeconds) + '</div>';

  // Show what's next
  var nextEx = getNextExercisePreview();
  if (nextEx) {
    html += '<div style="font-size:14px;color:var(--text-light);margin-bottom:24px">Hierna: <strong>' + nextEx + '</strong></div>';
  }

  html += '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">';
  html += '<button class="tm-btn tm-btn-accent" style="max-width:150px" onclick="skipRest()">Klaar, door!</button>';
  html += '<button class="tm-btn tm-btn-outline" style="max-width:120px" onclick="addRestTime(30)">+30s</button>';
  html += '<button class="tm-btn tm-btn-outline" style="max-width:120px" onclick="addRestTime(60)">+1 min</button>';
  html += '</div>';
  html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="goStepBack()" style="margin-top:12px;opacity:0.7">\u25C0 Vorige stap (undo)</button>';

  body.innerHTML = html;
}

function getNextExercisePreview() {
  var ids = currentExerciseIds.length > 0 ? currentExerciseIds : currentTraining.exerciseIds;

  // Nog sets te doen van huidige oefening?
  if (currentSet < totalSets) {
    var curEx = getCurrentExercise();
    return curEx ? curEx.name + ' (set ' + (currentSet + 1) + ')' : null;
  }

  // Volgende oefening?
  var nextIdx = currentExerciseIndex + 1;
  if (nextIdx >= ids.length) return null; // klaar

  var nextEx = getExercise(ids[nextIdx]);
  if (!nextEx) return null;
  return nextEx.name + ' (set 1)';
}

function startRestTimer() {
  clearInterval(tmTimerInterval);
  _timerStartTime = Date.now();
  _timerTotalSeconds = tmTimerSeconds;
  tmTimerInterval = setInterval(function() {
    var elapsed = Math.floor((Date.now() - _timerStartTime) / 1000);
    tmTimerSeconds = Math.max(0, _timerTotalSeconds - elapsed);
    var display = document.getElementById('tmTimerDisplay');
    if (display) display.textContent = formatTimer(tmTimerSeconds);

    if (tmTimerSeconds <= 0) {
      clearInterval(tmTimerInterval);
      hapticFeedback('medium');
      playTimerSound('short');
      skipRest();
    }
  }, 500);
}

function skipRest() {
  resetActivity();
  clearInterval(tmTimerInterval);
  tmState = 'idle';

  // STRAIGHT SETS: volgende set van zelfde oefening
  if (currentSet < totalSets) {
    currentSet++;
  } else {
    // Alle sets klaar → volgende oefening
    currentExerciseIndex++;
    currentSet = 1;
  }

  renderTrainingStep();
}

function addRestTime(secs) {
  _timerTotalSeconds += secs;
  var elapsed = Math.floor((Date.now() - _timerStartTime) / 1000);
  tmTimerSeconds = Math.max(0, _timerTotalSeconds - elapsed);
  var display = document.getElementById('tmTimerDisplay');
  if (display) display.textContent = formatTimer(tmTimerSeconds);
}

function goStepBack() {
  clearInterval(tmTimerInterval);
  tmState = 'idle';

  if (trainingPhase === 'cooldown') {
    trainingPhase = 'exercises';
    var ids = currentExerciseIds.length > 0 ? currentExerciseIds : currentTraining.exerciseIds;
    currentExerciseIndex = ids.length - 1;
    currentSet = totalSets;
    var ex = getCurrentExercise();
    if (ex) delete sessionExerciseLog[ex.id + '_s' + currentSet];
    renderTrainingStep();
    return;
  }

  if (trainingPhase === 'exercises') {
    if (currentSet > 1) {
      currentSet--;
      var ex = getCurrentExercise();
      if (ex) delete sessionExerciseLog[ex.id + '_s' + (currentSet + 1)];
    } else if (currentExerciseIndex > 0) {
      currentExerciseIndex--;
      currentSet = totalSets;
      var ex = getCurrentExercise();
      if (ex) delete sessionExerciseLog[ex.id + '_s' + totalSets];
    } else {
      trainingPhase = 'warmup';
    }
    renderTrainingStep();
    return;
  }
}

function skipExercise() {
  var ex = getCurrentExercise();
  var exName = ex ? ex.name : 'deze oefening';
  // Inline confirm i.p.v. browser confirm()
  if (!_skipConfirmed) {
    _skipConfirmed = true;
    var btn = event && event.target;
    if (btn) {
      btn.textContent = 'Zeker weten?';
      btn.style.color = 'var(--danger, #c62828)';
      btn.style.borderColor = 'var(--danger, #c62828)';
      setTimeout(function() { _skipConfirmed = false; renderTrainingStep(); }, 3000);
    }
    return;
  }
  _skipConfirmed = false;
  if (ex) {
    for (var sk = 1; sk <= totalSets; sk++) {
      var skipKey = ex.id + '_s' + sk;
      if (!sessionExerciseLog[skipKey] || !sessionExerciseLog[skipKey].done) {
        sessionExerciseLog[skipKey] = { id: ex.id, weight: 0, reps: 0, done: false, skipped: true };
      }
    }
  }
  tmState = 'idle';
  currentExerciseIndex++;
  currentSet = 1;
  renderTrainingStep();
}

function updateProgressBar() {
  // Total = warmup(1) + exercises*sets + cooldown(1)
  var ids = currentExerciseIds.length > 0 ? currentExerciseIds : currentTraining.exerciseIds;
  var exWork = ids.length * totalSets;
  var total = 1 + exWork + 1;
  var done = 0;
  if (trainingPhase === 'warmup') done = 0;
  else if (trainingPhase === 'exercises') done = 1 + (currentExerciseIndex * totalSets) + (currentSet - 1);
  else if (trainingPhase === 'cooldown') done = 1 + exWork;
  var pct = Math.round((done / total) * 100);
  var bar = document.getElementById('tmProgressBar');
  if (bar) bar.style.width = pct + '%';
}

function formatTimer(secs) {
  if (secs < 0) secs = 0;
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// ================================================================
// COMPLETION SCREEN
// ================================================================
function renderCompletionInTrainingMode() {
  document.getElementById('trainingMode').classList.add('active');
  document.getElementById('bottomNav').style.display = 'none';
  document.body.style.overflow = 'hidden';

  var body = document.getElementById('tmBody');
  var header = document.getElementById('tmHeader').querySelector('h2');
  header.textContent = 'Voltooid!';

  // Calculate stats
  var exerciseCount = 0;
  var maxWeight = 0;
  var maxWeightExId = '';
  var completedSets = 0;
  var skippedIds = {};
  Object.keys(sessionExerciseLog).forEach(function(key) {
    var entry = sessionExerciseLog[key];
    if (entry.done) {
      completedSets++;
      if (entry.weight > maxWeight) { maxWeight = entry.weight; maxWeightExId = entry.id; }
    } else if (entry.skipped) {
      skippedIds[entry.id] = true;
    }
  });
  var skippedCount = Object.keys(skippedIds).length;
  var maxWeightUnit = maxWeightExId ? getWeightUnit(maxWeightExId) : 'kg';
  var activeIds = currentExerciseIds.length > 0 ? currentExerciseIds : currentTraining.exerciseIds;
  exerciseCount = activeIds.length;

  var html = '<div class="completion-screen">';
  html += '<div class="emoji">\uD83C\uDF89</div>';
  html += '<h2>Training voltooid!</h2>';
  html += '<p style="color:var(--text-light);margin-bottom:20px">Lekker bezig, Lisanne!</p>';
  html += '<div class="completion-stats">';
  html += '<div class="completion-stat"><span class="completion-stat-label">Training</span><span class="completion-stat-value">' + currentTraining.name + '</span></div>';
  html += '<div class="completion-stat"><span class="completion-stat-label">Oefeningen</span><span class="completion-stat-value">' + (exerciseCount - skippedCount) + '/' + exerciseCount + (skippedCount > 0 ? ' <span style="font-size:12px;color:var(--text-light)">(' + skippedCount + ' overgeslagen)</span>' : '') + '</span></div>';
  html += '<div class="completion-stat"><span class="completion-stat-label">Sets voltooid</span><span class="completion-stat-value">' + completedSets + '</span></div>';
  if (maxWeight > 0) {
    html += '<div class="completion-stat"><span class="completion-stat-label">Zwaarste gewicht</span><span class="completion-stat-value">' + maxWeight + ' ' + maxWeightUnit + '</span></div>';
  }
  html += '<div class="completion-stat"><span class="completion-stat-label">Datum</span><span class="completion-stat-value">' + formatDateNL(new Date()) + '</span></div>';
  html += '</div>';
  // Feedback section
  html += renderFeedbackForm();
  html += '<button class="tm-btn tm-btn-primary" style="margin-top:16px" onclick="saveFeedbackAndClose()">Opslaan &amp; sluiten</button>';
  html += '<button class="tm-btn tm-btn-outline" style="margin-top:8px" onclick="closeCompletionScreen()">Overslaan</button>';

  // Loopband optie na krachttraining
  html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);text-align:center">';
  html += '<div style="font-size:13px;color:var(--text-light);margin-bottom:8px">\uD83D\uDEB6\u200D\u2640\uFE0F Nog zin om te wandelen?</div>';
  html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="saveFeedbackAndStartWandelen()">Start loopband wandelen (35 min)</button>';
  html += '</div>';
  html += '</div>';

  body.innerHTML = html;
}

function renderFeedbackForm() {
  var html = '<div class="feedback-section" style="margin-top:20px;padding:16px;background:var(--bg);border-radius:12px">';
  html += '<div style="font-weight:600;font-size:15px;margin-bottom:12px">Hoe voelde het?</div>';

  // Energy/feeling rating (1-5 emoji)
  html += '<div style="margin-bottom:16px">';
  html += '<div style="font-size:14px;color:var(--text-light);margin-bottom:8px">Energie / gevoel</div>';
  html += '<div class="feedback-stars" id="feedbackEnergy" style="display:flex;gap:8px">';
  var energyEmojis = ['\uD83D\uDE29', '\uD83D\uDE14', '\uD83D\uDE10', '\uD83D\uDE0A', '\uD83D\uDCAA'];
  var energyLabels = ['Uitgeput', 'Moe', 'Oké', 'Goed', 'Super!'];
  for (var i = 0; i < 5; i++) {
    html += '<button class="feedback-emoji-btn" data-value="' + (i + 1) + '" onclick="selectFeedback(\'feedbackEnergy\',' + (i + 1) + ',this)" ';
    html += 'style="flex:1;min-height:56px;padding:10px 2px;border:2px solid var(--border);border-radius:12px;background:var(--card);font-size:24px;cursor:pointer;text-align:center">';
    html += energyEmojis[i] + '<div style="font-size:10px;margin-top:4px">' + energyLabels[i] + '</div></button>';
  }
  html += '</div></div>';

  // Calf pain score (0-3)
  html += '<div style="margin-bottom:16px">';
  html += '<div style="font-size:14px;color:var(--text-light);margin-bottom:8px">Kuitpijn vandaag?</div>';
  html += '<div class="feedback-stars" id="feedbackCalf" style="display:flex;gap:8px">';
  var calfLabels = ['Nee', 'Beetje', 'Best wel', 'Veel'];
  var calfColors = ['var(--success)', 'var(--warning)', 'var(--accent)', 'var(--danger)'];
  for (var c = 0; c < 4; c++) {
    html += '<button class="feedback-calf-btn" data-value="' + c + '" onclick="selectFeedback(\'feedbackCalf\',' + c + ',this)" ';
    html += 'style="flex:1;min-height:48px;padding:12px 4px;border:2px solid var(--border);border-radius:12px;background:var(--card);font-size:13px;font-weight:600;cursor:pointer;text-align:center">';
    html += calfLabels[c] + '</button>';
  }
  html += '</div></div>';

  // Optional note
  html += '<div>';
  html += '<div style="font-size:13px;color:var(--text-light);margin-bottom:6px">Notitie (optioneel)</div>';
  html += '<textarea id="feedbackNote" placeholder="bv. schouder voelde stijf, of: lekker getraind!" ';
  html += 'style="width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;resize:none;height:60px;font-family:inherit"></textarea>';
  html += '</div>';

  html += '</div>';
  return html;
}

var selectedFeedback = { energy: null };

function selectFeedback(groupId, value, btn) {
  var group = document.getElementById(groupId);
  if (!group) return;
  var buttons = group.querySelectorAll('button');
  buttons.forEach(function(b) {
    b.style.borderColor = 'var(--border)';
    b.style.background = 'var(--card)';
  });
  btn.style.borderColor = 'var(--primary)';
  btn.style.background = 'rgba(27,79,114,0.1)';
  if (groupId === 'feedbackEnergy') selectedFeedback.energy = value;
}

function saveFeedbackAndClose() {
  var note = document.getElementById('feedbackNote') ? document.getElementById('feedbackNote').value.trim() : '';
  var todayKey = getTodayKey();
  var sessions = getStore('sessions', []);
  for (var i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].date === todayKey) {
      sessions[i].feedback = {
        energy: selectedFeedback.energy,
        note: note || null
      };
      break;
    }
  }
  setStore('sessions', sessions);
  selectedFeedback = { energy: null };
  closeCompletionScreen();
}

function closeCompletionScreen() {
  selectedFeedback = { energy: null };
  document.getElementById('trainingMode').classList.remove('active');
  document.getElementById('bottomNav').style.display = 'flex';
  document.body.style.overflow = '';
  renderToday();
}

function saveFeedbackAndStartWandelen() {
  // Save feedback first (reuse same logic)
  var note = document.getElementById('feedbackNote') ? document.getElementById('feedbackNote').value.trim() : '';
  var todayKey = getTodayKey();
  var sessions = getStore('sessions', []);
  for (var i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].date === todayKey) {
      sessions[i].feedback = {
        energy: selectedFeedback.energy,
        note: note || null
      };
      break;
    }
  }
  setStore('sessions', sessions);
  selectedFeedback = { energy: null };

  // Close kracht completion and start loopband
  document.getElementById('trainingMode').classList.remove('active');
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  startLoopbandWandelen();
}

function saveFinalSession() {
  var todayKey = trainingStartDate || getTodayKey();
  var sessions = getStore('sessions', []);
  var existingIdx = -1;
  sessions.forEach(function(s, i) {
    if (s.date === todayKey && s.trainingKey === (currentTrainingKey || '')) existingIdx = i;
  });

  var exerciseMap = {};
  var skippedExercises = {};
  Object.keys(sessionExerciseLog).forEach(function(key) {
    var val = sessionExerciseLog[key];
    if (val.skipped && !val.done) {
      skippedExercises[val.id] = true;
      return;
    }
    if (!val.done) return;
    var baseId = val.id;
    if (!exerciseMap[baseId]) exerciseMap[baseId] = { id: baseId, sets: [] };
    exerciseMap[baseId].sets.push({ weight: val.weight || 0, reps: val.reps || 0 });
  });

  var exerciseLog = [];
  Object.keys(exerciseMap).forEach(function(key) {
    var ex = exerciseMap[key];
    var weights = ex.sets.map(function(s) { return s.weight; }).filter(function(w) { return w > 0; });
    var reps = ex.sets.map(function(s) { return s.reps; }).filter(function(r) { return r > 0; });
    exerciseLog.push({
      id: ex.id,
      weight: weights.length > 0 ? Math.max.apply(null, weights) : 0,
      reps: reps.length > 0 ? Math.max.apply(null, reps) : 0,
      sets: ex.sets
    });
  });
  Object.keys(skippedExercises).forEach(function(id) {
    if (!exerciseMap[id]) {
      exerciseLog.push({ id: id, weight: 0, reps: 0, sets: [], skipped: true });
    }
  });

  var sessionData = {
    date: todayKey,
    type: 'kracht',
    name: currentTraining.name,
    trainingKey: currentTrainingKey || '',
    exercises: exerciseLog,
    startedAt: trainingStartTime || null,
    completedAt: new Date().toISOString(),
    feedback: null  // filled in by feedback screen
  };

  if (existingIdx >= 0) {
    sessions[existingIdx] = sessionData;
  } else {
    sessions.push(sessionData);
  }
  setStore('sessions', sessions);
  return sessionData;
}

// ================================================================
// CARDIO TIMER MODE
// ================================================================
var cardioTimerActive = false;
var cardioPhases = [];
var cardioPhaseIndex = 0;
var cardioPhaseSeconds = 0;
var cardioTimerInterval = null;
var cardioIntervalMode = 'slow'; // slow, fast
var cardioIntervalConfig = null;
var cardioTrainingName = '';
var intervalSecondsLeft = 0; // seconds left in current interval segment
var intervalTotalCycles = 0; // how many fast+slow cycles completed
var intervalIsAutoMode = false; // true when in an auto-interval phase

function startLoopbandWandelen() {
  startCardioTimer('loopbandWandelen', 0);
}

function startCardioTimer(trainingKey, optionIndex) {
  var training = TRAINING_DATA[trainingKey];
  var opt = training.options[optionIndex];
  cardioPhases = opt.phases;
  cardioIntervalConfig = opt.interval || null;
  cardioPhaseIndex = 0;
  cardioPhaseSeconds = opt.phases[0].duur * 60;
  cardioIntervalMode = 'slow';
  intervalSecondsLeft = 0;
  intervalTotalCycles = 0;
  intervalIsAutoMode = false;
  cardioTimerActive = true;
  cardioTrainingName = training.name + ' \u2014 ' + opt.name;

  requestWakeLock();
  document.getElementById('trainingMode').classList.add('active');
  document.getElementById('bottomNav').style.display = 'none';
  document.body.style.overflow = 'hidden';
  initIntervalForPhase();
  renderCardioTimerStep();
  startCardioCountdown();
}

function initIntervalForPhase() {
  // Check if this phase is an auto-interval phase (has interval config + intensity 'high')
  var phase = cardioPhases[cardioPhaseIndex];
  if (cardioIntervalConfig && cardioIntervalConfig.fast && phase && phase.intensity !== 'low') {
    intervalIsAutoMode = true;
    cardioIntervalMode = 'slow';
    intervalSecondsLeft = cardioIntervalConfig.slow;
    intervalTotalCycles = 0;
  } else {
    intervalIsAutoMode = false;
    intervalSecondsLeft = 0;
  }
}

function renderCardioTimerStep() {
  var phase = cardioPhases[cardioPhaseIndex];
  var body = document.getElementById('tmBody');
  var header = document.getElementById('tmHeader').querySelector('h2');
  header.textContent = cardioTrainingName;

  updateCardioProgressBar();

  var html = '';
  html += '<div class="ct-phase-display">' + phase.name + '</div>';

  // Auto-interval mode: show interval UI
  if (intervalIsAutoMode) {
    var isFast = cardioIntervalMode === 'fast';
    var speedLabel = isFast ? cardioIntervalConfig.fastDetail : cardioIntervalConfig.slowDetail;
    var modeLabel = isFast ? 'STEVIG' : 'RUSTIG';

    html += '<div class="ct-detail">' + speedLabel + '</div>';

    // Big interval mode badge
    html += '<div class="ct-interval-badge ' + (isFast ? 'ct-interval-fast' : 'ct-interval-normal') + '" style="font-size:18px;padding:10px 24px">';
    html += modeLabel + '</div>';

    // Interval segment countdown
    html += '<div style="font-size:48px;font-weight:700;color:' + (isFast ? 'var(--danger)' : 'var(--primary)') + ';margin:8px 0" id="intervalTimerDisplay">' + formatTimer(intervalSecondsLeft) + '</div>';
    html += '<div style="font-size:12px;color:var(--text-light);margin-bottom:8px">Wissel over ' + formatTimer(intervalSecondsLeft) + ' naar ' + (isFast ? 'rustig' : 'stevig') + '</div>';

    // Total phase timer (smaller)
    html += '<div style="font-size:14px;color:var(--text-light);margin-bottom:4px">Totaal fase: <span id="cardioTimerDisplay" style="font-weight:600">' + formatTimer(cardioPhaseSeconds) + '</span></div>';
    html += '<div style="font-size:12px;color:var(--text-light)">Ronde ' + (intervalTotalCycles + 1) + '</div>';

  } else {
    // Normal phase display — show big detail instruction
    html += '<div style="font-size:18px;font-weight:600;color:var(--accent);margin:4px 0;padding:8px 16px;background:rgba(255,255,255,0.06);border-radius:12px;display:inline-block">' + phase.detail + '</div>';

    // Manual interval badge for medium-intensity phases with old-style interval config
    if (cardioIntervalConfig && cardioIntervalConfig.normalMin && phase.intensity === 'medium') {
      html += '<div style="font-size:12px;color:var(--text-light);margin-bottom:8px;padding:6px 12px;background:var(--bg);border-radius:8px">';
      html += '\uD83D\uDCA1 ' + cardioIntervalConfig.label;
      html += '</div>';
    }

    html += '<div class="tm-timer" id="cardioTimerDisplay">' + formatTimer(cardioPhaseSeconds) + '</div>';

    // Total elapsed timer
    var totalSecs = cardioPhases.reduce(function(t, p) { return t + p.duur * 60; }, 0);
    var elapsed = 0;
    for (var ei = 0; ei < cardioPhaseIndex; ei++) { elapsed += cardioPhases[ei].duur * 60; }
    elapsed += (cardioPhases[cardioPhaseIndex].duur * 60) - cardioPhaseSeconds;
    html += '<div style="font-size:13px;color:var(--text-light);margin-top:4px">Totaal: ' + formatTimer(elapsed) + ' / ' + formatTimer(totalSecs) + '</div>';
  }

  // Phase change warning (hidden, shown 10s before change)
  html += '<div id="cardioPhaseWarning" style="display:none;margin:8px 0;padding:10px 16px;background:linear-gradient(135deg,rgba(244,123,32,0.2),rgba(247,75,122,0.2));border:1px solid var(--accent);border-radius:12px;font-size:14px;font-weight:600;color:var(--accent);animation:pulse 1s infinite"></div>';

  // Next phase preview
  if (cardioPhaseIndex < cardioPhases.length - 1) {
    var nextPhase = cardioPhases[cardioPhaseIndex + 1];
    html += '<div class="ct-next-phase" style="font-size:13px;color:var(--text-light);margin:8px 0">Hierna: <strong>' + nextPhase.name + '</strong> — ' + nextPhase.detail + '</div>';
  }

  html += '<div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">';
  if (cardioPhaseIndex < cardioPhases.length - 1) {
    html += '<button class="tm-btn tm-btn-accent" style="max-width:180px" onclick="skipCardioPhase()">Volgende fase</button>';
  } else {
    html += '<button class="tm-btn tm-btn-success" onclick="completeCardioSession()">\u2705 Cooldown klaar!</button>';
  }
  html += '</div>';
  html += '<button class="tm-btn tm-btn-outline tm-btn-small" style="margin-top:12px" onclick="stopCardioTimer()">Training stoppen</button>';

  body.innerHTML = html;
}

function startCardioCountdown() {
  clearInterval(cardioTimerInterval);
  var cardioStartTime = Date.now();
  var cardioStartPhaseSeconds = cardioPhaseSeconds;
  var cardioStartIntervalSeconds = intervalSecondsLeft;
  var lastPhaseElapsed = 0;
  cardioTimerInterval = setInterval(function() {
    var elapsed = Math.floor((Date.now() - cardioStartTime) / 1000);
    var delta = elapsed - lastPhaseElapsed;
    if (delta <= 0) return;
    lastPhaseElapsed = elapsed;

    cardioPhaseSeconds = Math.max(0, cardioStartPhaseSeconds - elapsed);

    // Auto-interval mode: also tick the interval segment
    if (intervalIsAutoMode) {
      var prevMode = cardioIntervalMode;
      intervalSecondsLeft = Math.max(0, intervalSecondsLeft - delta);

      // Update interval display
      var intervalDisplay = document.getElementById('intervalTimerDisplay');
      if (intervalDisplay) intervalDisplay.textContent = formatTimer(intervalSecondsLeft);

      // Phase timer (smaller display)
      var phaseDisplay = document.getElementById('cardioTimerDisplay');
      if (phaseDisplay) phaseDisplay.textContent = formatTimer(cardioPhaseSeconds);

      // Interval segment ended — switch mode (while loop handles large deltas after tab switch)
      while (intervalSecondsLeft <= 0 && cardioPhaseSeconds > 0) {
        if (cardioIntervalMode === 'fast') {
          cardioIntervalMode = 'slow';
          intervalSecondsLeft += cardioIntervalConfig.slow;
          intervalTotalCycles++;
        } else {
          cardioIntervalMode = 'fast';
          intervalSecondsLeft += cardioIntervalConfig.fast;
        }
      }
      // Did a mode switch actually happen?
      if (cardioIntervalMode !== prevMode && cardioPhaseSeconds > 0) {
        intervalSecondsLeft = Math.min(intervalSecondsLeft, cardioPhaseSeconds);
        hapticFeedback(cardioIntervalMode === 'fast' ? 'heavy' : 'light');
        renderCardioTimerStep();
        return;
      }
    } else {
      // Normal mode: just update phase timer
      var display = document.getElementById('cardioTimerDisplay');
      if (display) display.textContent = formatTimer(cardioPhaseSeconds);
    }

    // 10-second warning before phase change
    if (cardioPhaseSeconds === 10 && cardioPhaseIndex < cardioPhases.length - 1) {
      playBeep(660, 0.1);
      hapticFeedback('light');
      var warn = document.getElementById('cardioPhaseWarning');
      if (warn) {
        var next = cardioPhases[cardioPhaseIndex + 1];
        warn.textContent = '⏱ Bijna klaar! Hierna: ' + next.name + ' — ' + next.detail;
        warn.style.display = 'block';
      }
    }

    // Phase ended
    if (cardioPhaseSeconds <= 0) {
      hapticFeedback('heavy');
      playTimerSound('double');
      advanceCardioPhase();
    }
  }, 500);
}

function advanceCardioPhase() {
  cardioPhaseIndex++;
  if (cardioPhaseIndex >= cardioPhases.length) {
    completeCardioSession();
    return;
  }
  cardioPhaseSeconds = cardioPhases[cardioPhaseIndex].duur * 60;
  cardioIntervalMode = 'slow';
  initIntervalForPhase();

  // Flash the screen to signal phase change
  var body = document.getElementById('tmBody');
  if (body) {
    body.style.transition = 'background 0.3s';
    body.style.background = 'rgba(123,63,160,0.4)';
    setTimeout(function() { body.style.background = ''; }, 600);
  }

  renderCardioTimerStep();
}

function skipCardioPhase() {
  advanceCardioPhase();
}

// toggleCardioInterval removed — intervals now auto-switch

function updateCardioProgressBar() {
  var totalSecs = cardioPhases.reduce(function(t, p) { return t + p.duur * 60; }, 0);
  var elapsed = 0;
  for (var i = 0; i < cardioPhaseIndex; i++) {
    elapsed += cardioPhases[i].duur * 60;
  }
  elapsed += (cardioPhases[cardioPhaseIndex].duur * 60) - cardioPhaseSeconds;
  var pct = Math.round((elapsed / totalSecs) * 100);
  var bar = document.getElementById('tmProgressBar');
  if (bar) bar.style.width = pct + '%';
}

function completeCardioSession() {
  clearInterval(cardioTimerInterval);
  cardioTimerActive = false;

  // Save session
  var todayKey = getTodayKey();
  var sessions = getStore('sessions', []);
  var existingIdx = -1;
  sessions.forEach(function(s, i) { if (s.date === todayKey && s.type === 'cardio') existingIdx = i; });

  var totalMin = cardioPhases.reduce(function(t, p) { return t + p.duur; }, 0);
  var sessionData = {
    date: todayKey,
    type: 'cardio',
    name: cardioTrainingName,
    duration: totalMin,
    completedAt: new Date().toISOString(),
    feedback: null  // filled in by feedback screen
  };

  if (existingIdx >= 0) {
    sessions[existingIdx] = sessionData;
  } else {
    sessions.push(sessionData);
  }
  setStore('sessions', sessions);

  // Show completion
  selectedFeedback = { energy: null };
  var body = document.getElementById('tmBody');

  var html = '<div class="completion-screen">';
  html += '<div class="emoji">\uD83C\uDF89</div>';
  html += '<h2>Cardio voltooid!</h2>';
  html += '<p style="color:var(--text-light);margin-bottom:20px">Lekker bezig, Lisanne!</p>';
  html += '<div class="completion-stats">';
  html += '<div class="completion-stat"><span class="completion-stat-label">Training</span><span class="completion-stat-value">' + cardioTrainingName + '</span></div>';
  html += '<div class="completion-stat"><span class="completion-stat-label">Totale duur</span><span class="completion-stat-value">' + totalMin + ' min</span></div>';
  html += '<div class="completion-stat"><span class="completion-stat-label">Datum</span><span class="completion-stat-value">' + formatDateNL(new Date()) + '</span></div>';
  html += '</div>';
  html += renderFeedbackForm();
  html += '<button class="tm-btn tm-btn-primary" style="margin-top:16px" onclick="saveFeedbackAndClose()">Opslaan &amp; sluiten</button>';
  html += '<button class="tm-btn tm-btn-outline" style="margin-top:8px" onclick="closeCompletionScreen()">Overslaan</button>';
  html += '</div>';

  body.innerHTML = html;
  releaseWakeLock();
}

function stopCardioTimer() {
  clearInterval(cardioTimerInterval);
  cardioTimerActive = false;
  releaseWakeLock();
  document.getElementById('trainingMode').classList.remove('active');
  document.getElementById('bottomNav').style.display = 'flex';
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  renderToday();
}

// ================================================================
// TODAY PAGE RENDERING
// ================================================================
function renderProteinReminder() {
  var todayKey = getTodayKey();
  var proteinLog = getStore('proteinLog', {});
  var checked = proteinLog[todayKey] || false;
  // Bereken eiwit-doel: 1.6g per kg lichaamsgewicht (iets lager voor beginners)
  var measurements = getStore('measurements', []);
  var bodyWeight = 60; // default
  if (measurements.length > 0) bodyWeight = measurements[measurements.length - 1].weight || 60;
  var proteinGoal = Math.round(bodyWeight * 1.6);

  var html = '<div class="card" style="margin:8px 16px;padding:0">';
  html += '<div style="display:flex;align-items:center;padding:12px 16px;gap:12px">';
  html += '<div onclick="toggleProteinCheck()" style="width:32px;height:32px;border-radius:50%;border:2px solid ' + (checked ? 'var(--success)' : 'var(--border)') + ';background:' + (checked ? 'var(--success)' : 'transparent') + ';display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.2s">';
  if (checked) html += '<span style="color:white;font-size:16px">\u2713</span>';
  html += '</div>';
  html += '<div style="flex:1">';
  html += '<div style="font-size:14px;font-weight:600;color:' + (checked ? 'var(--success)' : 'var(--text)') + '">' + (checked ? 'Eiwit-doel gehaald!' : 'Eiwit vandaag') + '</div>';
  html += '<div style="font-size:12px;color:var(--text-light);line-height:1.4">Doel: \u00b1' + proteinGoal + 'g eiwit (' + bodyWeight + ' kg \u00d7 1.6g)</div>';
  html += '</div>';
  if (!checked) {
    html += '<div onclick="toggleProteinTips()" style="font-size:18px;cursor:pointer">\uD83D\uDCA1</div>';
  }
  html += '</div>';
  // Tips panel (hidden)
  html += '<div id="proteinTipsPanel" style="display:none;padding:0 16px 12px;font-size:12px;color:var(--text-light);line-height:1.6;border-top:1px solid var(--border)">';
  html += '<div style="padding-top:10px"><strong>Voorbeelden voor \u00b1' + proteinGoal + 'g eiwit per dag:</strong></div>';
  html += '<div style="margin-top:6px">\uD83E\uDD5A 3 eieren (18g) + \uD83C\uDF57 kipfilet 150g (46g) + \uD83E\uDD5B kwark 250g (23g) + \uD83E\uDDC0 2 boterhammen kaas (10g) = ~97g</div>';
  html += '<div style="margin-top:4px">\uD83E\uDD64 Eiwitshake (25g) + \uD83C\uDF5D pasta bolognese (30g) + \uD83E\uDD5C handvol noten (8g) = +63g</div>';
  html += '<div style="margin-top:6px;color:var(--primary)"><strong>Tip:</strong> Verdeel eiwit over 3-4 maaltijden. Je lichaam kan max ~40g per maaltijd goed verwerken.</div>';
  html += '</div>';
  html += '</div>';
  return html;
}

function toggleProteinCheck() {
  var todayKey = getTodayKey();
  var proteinLog = getStore('proteinLog', {});
  proteinLog[todayKey] = !proteinLog[todayKey];
  // Ruim oude entries op (bewaar max 30 dagen)
  var keys = Object.keys(proteinLog);
  if (keys.length > 30) {
    keys.sort();
    keys.slice(0, keys.length - 30).forEach(function(k) { delete proteinLog[k]; });
  }
  setStore('proteinLog', proteinLog);
  renderToday();
}

function toggleProteinTips() {
  var panel = document.getElementById('proteinTipsPanel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function renderWeekSummary() {
  var now = new Date();
  // Only show on Monday (day 1)
  if (now.getDay() !== 1) return '';

  var sessions = getStore('sessions', []);
  if (sessions.length === 0) return '';

  // Get last week's Monday
  var lastMonday = new Date(now);
  lastMonday.setDate(lastMonday.getDate() - 7);
  lastMonday.setHours(0, 0, 0, 0);
  var lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 7);
  lastSunday.setHours(0, 0, 0, 0);

  var weekSessions = sessions.filter(function(s) {
    var d = new Date(s.date);
    return d >= lastMonday && d < lastSunday;
  });

  if (weekSessions.length === 0) return '';

  // Gather stats
  var kracht = weekSessions.filter(function(s) { return s.type === 'kracht'; }).length;
  var cardio = weekSessions.filter(function(s) { return s.type === 'cardio'; }).length;
  var avgEnergy = 0;
  var energyCount = 0;
  var calfSum = 0;
  var calfCount = 0;
  weekSessions.forEach(function(s) {
    if (s.feedback && s.feedback.energy) { avgEnergy += s.feedback.energy; energyCount++; }
    if (s.feedback && s.feedback.calfPain !== null && s.feedback.calfPain !== undefined) { calfSum += s.feedback.calfPain; calfCount++; }
  });
  if (energyCount > 0) avgEnergy = avgEnergy / energyCount;
  var avgCalf = calfCount > 0 ? (calfSum / calfCount) : -1;

  var energyEmojis = ['', '\uD83D\uDE29', '\uD83D\uDE14', '\uD83D\uDE10', '\uD83D\uDE0A', '\uD83D\uDCAA'];
  var energyEmoji = energyEmojis[Math.round(avgEnergy)] || '';

  var html = '<div class="card" style="margin:12px 16px">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCCA</span> Vorige week</div>';
  html += '<div style="padding:14px 16px">';

  // Stats row
  html += '<div style="display:flex;gap:12px;margin-bottom:12px;text-align:center">';
  html += '<div style="flex:1;background:var(--bg);border-radius:10px;padding:10px">';
  html += '<div style="font-size:22px;font-weight:700;color:var(--primary)">' + weekSessions.length + '</div>';
  html += '<div style="font-size:11px;color:var(--text-light)">trainingen</div></div>';
  if (kracht > 0) {
    html += '<div style="flex:1;background:var(--bg);border-radius:10px;padding:10px">';
    html += '<div style="font-size:22px;font-weight:700;color:var(--primary)">' + kracht + '</div>';
    html += '<div style="font-size:11px;color:var(--text-light)">kracht</div></div>';
  }
  if (cardio > 0) {
    html += '<div style="flex:1;background:var(--bg);border-radius:10px;padding:10px">';
    html += '<div style="font-size:22px;font-weight:700;color:var(--accent)">' + cardio + '</div>';
    html += '<div style="font-size:11px;color:var(--text-light)">cardio</div></div>';
  }
  if (energyCount > 0) {
    html += '<div style="flex:1;background:var(--bg);border-radius:10px;padding:10px">';
    html += '<div style="font-size:22px">' + energyEmoji + '</div>';
    html += '<div style="font-size:11px;color:var(--text-light)">energie</div></div>';
  }
  html += '</div>';

  // Smart message
  if (weekSessions.length >= 3) {
    html += '<div style="font-size:13px;color:var(--success);line-height:1.5">\uD83C\uDF1F Sterke week! ' + weekSessions.length + ' trainingen gedaan.</div>';
  } else if (weekSessions.length >= 1) {
    html += '<div style="font-size:13px;color:var(--text-light);line-height:1.5">Goed bezig vorige week! Elke training telt.</div>';
  }
  if (avgCalf >= 2) {
    html += '<div style="font-size:12px;color:var(--accent);margin-top:4px">\uD83E\uDDB5 Kuitpijn was gemiddeld ' + avgCalf.toFixed(1) + '/3 \u2014 neem het vandaag rustig aan.</div>';
  } else if (avgCalf >= 0 && avgCalf < 1) {
    html += '<div style="font-size:12px;color:var(--success);margin-top:4px">\uD83E\uDDB5 Kuiten voelden goed vorige week!</div>';
  }

  html += '</div></div>';
  return html;
}

function renderMotivationStrip() {
  var sessions = getStore('sessions', []);
  if (sessions.length === 0) return '';

  var streak = calcStreak(sessions);
  var thisWeek = countThisWeek(sessions);
  var total = sessions.length;
  var phase = getCurrentPhase();

  // Pick a motivational message
  var messages = [];
  if (streak >= 4) messages.push('\uD83D\uDD25 ' + streak + ' weken streak!');
  else if (streak >= 2) messages.push('\uD83D\uDCAA ' + streak + ' weken bezig!');
  if (thisWeek >= 3) messages.push('\uD83C\uDF1F Top week!');
  else if (thisWeek >= 1) messages.push('\u2705 ' + thisWeek + 'x deze week');
  if (total >= 10 && total < 15) messages.push('\uD83C\uDF89 Al ' + total + ' trainingen!');
  if (total >= 25) messages.push('\uD83C\uDFC6 ' + total + ' sessies voltooid!');
  if (phase === 2) messages.push('\u2B50 Fase 2');

  if (messages.length === 0) return '';

  var html = '<div class="motivation-strip">';
  html += messages.slice(0, 3).join(' &nbsp;\u00b7&nbsp; ');
  html += '</div>';
  return html;
}

// ================================================================
// VANDAAG ANDERS? — Alternative options on training days
// ================================================================
function renderVandaagAnders(currentTrainingKey) {
  var html = '';
  html += '<div class="vandaag-anders-section" style="margin:16px">';
  html += '<div class="vandaag-anders-toggle" onclick="toggleVandaagAnders(this)" style="text-align:center;padding:10px;color:var(--text-light);font-size:13px;cursor:pointer;border-radius:12px;background:var(--card);border:1px solid var(--border)">';
  html += '\uD83D\uDD04 Vandaag anders? \u25BC</div>';
  html += '<div class="vandaag-anders-options" style="display:none;margin-top:8px">';

  // Option 0: Verschuif naar morgen
  var alreadyPostponed = getStore('postponedTraining', null);
  if (!alreadyPostponed || alreadyPostponed.trainingKey !== currentTrainingKey) {
    html += '<div class="vandaag-anders-item" onclick="postponeTraining(\'' + currentTrainingKey + '\')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--card);border-radius:12px;margin-bottom:8px;cursor:pointer;border:1px solid var(--primary)">';
    html += '<span style="font-size:22px">\uD83D\uDCC5</span>';
    html += '<div style="flex:1"><div style="font-weight:600;font-size:14px">Verschuif naar morgen</div>';
    html += '<div style="font-size:12px;color:var(--text-light)">Geen energie? Doe deze training morgen</div></div>';
    html += '<span style="color:var(--primary);font-size:12px">\u27A1\uFE0F</span></div>';
  } else {
    html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--success-bg);border-radius:12px;margin-bottom:8px;border:1px solid var(--success)">';
    html += '<span style="font-size:22px">\u2705</span>';
    html += '<div style="flex:1"><div style="font-weight:600;font-size:14px;color:var(--success-text)">Verschoven naar morgen</div>';
    html += '<div style="font-size:12px;color:var(--text-light)">Deze training staat klaar voor morgen</div></div></div>';
  }

  // Option 0b: Snel loggen — "Ik heb vandaag gelopen"
  html += '<div class="vandaag-anders-item" onclick="showQuickWalkLog()" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--card);border-radius:12px;margin-bottom:8px;cursor:pointer;border:1px solid var(--success)">';
  html += '<span style="font-size:22px">\uD83D\uDEB6</span>';
  html += '<div style="flex:1"><div style="font-weight:600;font-size:14px">Ik heb vandaag gelopen</div>';
  html += '<div style="font-size:12px;color:var(--text-light)">Snel loggen zonder timer</div></div>';
  html += '<span style="color:var(--success);font-size:14px">\u2714\uFE0F</span></div>';

  // Option 1: Loopband wandelen (met timer)
  html += '<div class="vandaag-anders-item" onclick="startLoopbandWandelen()" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--card);border-radius:12px;margin-bottom:8px;cursor:pointer;border:1px solid var(--border)">';
  html += '<span style="font-size:22px">\uD83D\uDEB6\u200D\u2640\uFE0F</span>';
  html += '<div style="flex:1"><div style="font-weight:600;font-size:14px">Loopband wandelen (met timer)</div>';
  html += '<div style="font-size:12px;color:var(--text-light)">Rustig 30 min wandelen \u2014 laagdrempelig maar effectief</div></div>';
  html += '<span style="color:var(--text-light);font-size:12px">\u25B6</span></div>';

  // Option 2: Stretchen
  html += '<div class="vandaag-anders-item" onclick="startStretchTimer()" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--card);border-radius:12px;margin-bottom:8px;cursor:pointer;border:1px solid var(--border)">';
  html += '<span style="font-size:22px">\uD83E\uDDD8</span>';
  html += '<div style="flex:1"><div style="font-weight:600;font-size:14px">Alleen stretchen</div>';
  html += '<div style="font-size:12px;color:var(--text-light)">5 minuten stretch routine \u2014 beter dan niks!</div></div>';
  html += '<span style="color:var(--text-light);font-size:12px">\u25B6</span></div>';

  // Option 3: Vrije training (choose something else)
  html += '<div class="vandaag-anders-item" onclick="openVrijeTraining()" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--card);border-radius:12px;margin-bottom:8px;cursor:pointer;border:1px solid var(--border)">';
  html += '<span style="font-size:22px">\uD83C\uDFCB\uFE0F</span>';
  html += '<div style="flex:1"><div style="font-weight:600;font-size:14px">Zelf kiezen</div>';
  html += '<div style="font-size:12px;color:var(--text-light)">Kies een andere training uit de lijst</div></div>';
  html += '<span style="color:var(--text-light);font-size:12px">\u25B6</span></div>';

  // Option 4: Skip entirely
  html += '<div class="vandaag-anders-item" onclick="skipTrainingToday()" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--card);border-radius:12px;cursor:pointer;border:1px solid var(--border)">';
  html += '<span style="font-size:22px">\uD83D\uDE34</span>';
  html += '<div style="flex:1"><div style="font-weight:600;font-size:14px">Vandaag overslaan</div>';
  html += '<div style="font-size:12px;color:var(--text-light)">Rustdag \u2014 morgen weer een nieuwe kans</div></div>';
  html += '<span style="color:var(--text-light);font-size:12px">\u2714\uFE0F</span></div>';

  html += '</div></div>';
  return html;
}

function toggleVandaagAnders(el) {
  var panel = el.nextElementSibling;
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    el.innerHTML = '\uD83D\uDD04 Vandaag anders? \u25B2';
  } else {
    panel.style.display = 'none';
    el.innerHTML = '\uD83D\uDD04 Vandaag anders? \u25BC';
  }
}

function skipTrainingToday() {
  // Log a rest/skip day so it shows in history
  var today = new Date().toISOString().split('T')[0];
  var sessions = getStore('sessions', []);

  // Check if already skipped today
  var alreadySkipped = sessions.some(function(s) {
    return s.date === today && s.type === 'skip';
  });
  if (alreadySkipped) {
    var c = document.getElementById('todayContent');
    if (c) {
      var msg = document.createElement('div');
      msg.style.cssText = 'padding:12px 16px;background:var(--warning-bg);color:var(--text);border-radius:10px;margin:12px 16px;font-size:14px;text-align:center';
      msg.textContent = 'Je hebt vandaag al overgeslagen';
      c.prepend(msg);
      setTimeout(function() { msg.remove(); }, 3000);
    }
    return;
  }

  sessions.push({
    date: today,
    type: 'skip',
    name: 'Rustdag (overgeslagen)',
    duration: 0
  });
  setStore('sessions', sessions);

  // Show confirmation
  var content = document.getElementById('todayContent');
  var html = '<div class="card" style="text-align:center;padding:32px 24px">';
  html += '<div style="font-size:48px;margin-bottom:16px">\uD83D\uDE34</div>';
  html += '<h2 style="margin:0 0 8px;color:var(--text)">Oké, rustdag!</h2>';
  html += '<p style="color:var(--text-light);font-size:14px;margin:0 0 20px">Geen stress \u2014 luisteren naar je lichaam is ook belangrijk. Morgen weer een nieuwe kans!</p>';
  html += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">';
  html += '<button class="start-btn-primary" onclick="startLoopbandWandelen()" style="flex:1;min-width:140px">\uD83D\uDEB6 Toch even wandelen?</button>';
  html += '<button class="start-btn-primary" onclick="startStretchTimer()" style="flex:1;min-width:140px;background:var(--card);color:var(--text);border:1px solid var(--border)">\uD83E\uDDD8 Stretchen?</button>';
  html += '</div></div>';
  content.innerHTML = html;
}

// ================================================================
// SNEL LOGGEN — "Ik heb vandaag gelopen"
// ================================================================
function showQuickWalkLog() {
  var content = document.getElementById('todayContent');
  var html = '<div class="card" style="text-align:center;padding:24px 20px">';
  html += '<div style="font-size:40px;margin-bottom:12px">\uD83D\uDEB6</div>';
  html += '<h2 style="margin:0 0 12px;color:var(--text);font-size:20px">Hoe lang heb je gelopen?</h2>';

  // Duration picker — quick buttons
  html += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">';
  var durations = [15, 20, 30, 45, 60];
  for (var i = 0; i < durations.length; i++) {
    var d = durations[i];
    var sel = d === 30 ? 'background:var(--primary);color:white;border-color:var(--primary)' : 'background:var(--card);color:var(--text);border-color:var(--border)';
    html += '<button onclick="selectQuickWalkDuration(' + d + ',this)" data-dur="' + d + '" ';
    html += 'style="min-width:56px;padding:12px 10px;border:2px solid;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;' + sel + '">';
    html += d + ' min</button>';
  }
  html += '</div>';
  html += '<input type="hidden" id="quickWalkDuration" value="30">';

  // Optional: type of walk
  html += '<div style="margin-bottom:16px">';
  html += '<div style="font-size:12px;color:var(--text-light);margin-bottom:6px">Wat voor wandeling?</div>';
  html += '<div style="display:flex;gap:6px;justify-content:center">';
  var walkTypes = [
    { val: 'buiten', label: 'Buiten', emoji: '\uD83C\uDF33', sel: true },
    { val: 'loopband', label: 'Loopband', emoji: '\uD83C\uDFCB\uFE0F', sel: false },
    { val: 'hardlopen', label: 'Hardlopen', emoji: '\uD83C\uDFC3\u200D\u2640\uFE0F', sel: false }
  ];
  for (var t = 0; t < walkTypes.length; t++) {
    var wt = walkTypes[t];
    var wtStyle = wt.sel ? 'background:var(--primary);color:white;border-color:var(--primary)' : 'background:var(--card);color:var(--text);border-color:var(--border)';
    html += '<button onclick="selectQuickWalkType(\'' + wt.val + '\',this)" data-type="' + wt.val + '" ';
    html += 'style="flex:1;padding:10px 6px;border:2px solid;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;' + wtStyle + '">';
    html += wt.emoji + ' ' + wt.label + '</button>';
  }
  html += '</div>';
  html += '<input type="hidden" id="quickWalkType" value="buiten">';
  html += '</div>';

  html += '<button onclick="saveQuickWalk()" style="width:100%;padding:14px;background:var(--success);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer">\u2714 Opslaan</button>';
  html += '<button onclick="renderToday()" style="width:100%;padding:10px;background:none;border:none;color:var(--text-light);font-size:13px;cursor:pointer;margin-top:8px">Annuleren</button>';
  html += '</div>';
  content.innerHTML = html;
}

function selectQuickWalkDuration(dur, btn) {
  document.getElementById('quickWalkDuration').value = dur;
  var parent = btn.parentElement;
  var btns = parent.querySelectorAll('button');
  btns.forEach(function(b) {
    b.style.background = 'var(--card)';
    b.style.color = 'var(--text)';
    b.style.borderColor = 'var(--border)';
  });
  btn.style.background = 'var(--primary)';
  btn.style.color = 'white';
  btn.style.borderColor = 'var(--primary)';
}

function selectQuickWalkType(type, btn) {
  document.getElementById('quickWalkType').value = type;
  var parent = btn.parentElement;
  var btns = parent.querySelectorAll('button');
  btns.forEach(function(b) {
    b.style.background = 'var(--card)';
    b.style.color = 'var(--text)';
    b.style.borderColor = 'var(--border)';
  });
  btn.style.background = 'var(--primary)';
  btn.style.color = 'white';
  btn.style.borderColor = 'var(--primary)';
}

function saveQuickWalk() {
  var duration = parseInt(document.getElementById('quickWalkDuration').value) || 30;
  var walkType = document.getElementById('quickWalkType').value || 'buiten';
  var today = new Date().toISOString().split('T')[0];
  var sessions = getStore('sessions', []);

  var typeLabels = { buiten: 'Gewandeld (buiten)', loopband: 'Gewandeld (loopband)', hardlopen: 'Hardgelopen' };
  var name = typeLabels[walkType] || 'Gewandeld';

  // Check for duplicate
  var alreadyLogged = sessions.some(function(s) {
    return s.date === today && s.type === 'cardio' && s.quickWalk;
  });
  if (alreadyLogged) {
    if (!confirm('Je hebt vandaag al een wandeling gelogd. Nog een toevoegen?')) return;
  }

  sessions.push({
    date: today,
    type: 'cardio',
    name: name,
    trainingKey: 'quickWalk',
    duration: duration,
    quickWalk: true,
    walkType: walkType
  });
  setStore('sessions', sessions);

  // Show confirmation
  var content = document.getElementById('todayContent');
  var html = '<div class="card" style="text-align:center;padding:32px 24px">';
  html += '<div style="font-size:48px;margin-bottom:16px">\u2705</div>';
  html += '<h2 style="margin:0 0 8px;color:var(--text)">Lekker bezig!</h2>';
  html += '<p style="color:var(--text-light);font-size:14px;margin:0 0 4px">' + name + ' \u2014 ' + duration + ' minuten opgeslagen.</p>';
  html += '<p style="color:var(--success);font-size:13px;margin:0 0 20px">Elke stap telt \uD83D\uDC9A</p>';
  html += '<button onclick="renderToday()" style="padding:10px 24px;background:var(--primary);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Terug naar vandaag</button>';
  html += '</div>';
  content.innerHTML = html;
}

// ================================================================
// SPIERPIJN CHECK — per spiergroep, dagelijks bij te werken
// ================================================================
var SORENESS_GROUPS = [
  { id: 'boven', label: 'Armen & schouders', emoji: '\uD83D\uDCAA', question: 'Heb je last als je iets optilt of boven je hoofd reikt?' },
  { id: 'onder', label: 'Benen & billen', emoji: '\uD83E\uDDB5', question: 'Heb je last bij traplopen of hurken?' },
  { id: 'core', label: 'Buik & rug', emoji: '\uD83E\uDDD8', question: 'Heb je last bij bukken of draaien?' }
];

var SORENESS_LEVELS = [
  { value: 0, label: 'Nee', color: 'var(--success)', bg: 'var(--success-bg)', textColor: 'var(--success-text)' },
  { value: 1, label: 'Beetje stijf', color: 'var(--success)', bg: 'var(--success-bg)', textColor: 'var(--success-text)' },
  { value: 2, label: 'Best wel', color: 'var(--warning-border, orange)', bg: 'var(--warning-bg, #fff8e1)', textColor: 'var(--warning-text, #e65100)' },
  { value: 3, label: 'Flink!', color: 'var(--danger, #c62828)', bg: 'var(--danger-bg, #ffebee)', textColor: 'var(--danger-text, #c62828)' }
];

function getTrainingMuscleGroup(trainingKey) {
  if (!trainingKey) return [];
  if (trainingKey.indexOf('Boven') >= 0) return ['boven', 'core'];
  if (trainingKey.indexOf('Onder') >= 0) return ['onder', 'core'];
  if (trainingKey.indexOf('Compound') >= 0) return ['boven', 'onder', 'core'];
  return ['boven', 'onder', 'core'];
}

function renderSorenessCheck(trainingKey) {
  // Op rustdagen: toon alleen als recent getraind (gisteren/eergisteren)
  var isRestDay = !trainingKey;
  if (isRestDay) {
    var dsl = daysSinceLastTraining();
    if (dsl > 4 || dsl >= 999) return '';
  }

  var todayKey = getTodayKey();
  var sorenessLog = getStore('sorenessLog', {});
  var todayData = sorenessLog[todayKey] || {};

  var filledCount = SORENESS_GROUPS.filter(function(g) { return todayData[g.id] !== undefined; }).length;
  var allFilled = filledCount === SORENESS_GROUPS.length;

  var html = '<div class="card" style="margin:8px 16px;padding:0">';

  // Als alles ingevuld is: toon alleen compact advies
  if (allFilled) {
    var advice = getSorenessAdvice(todayData, trainingKey);
    if (advice) {
      html += '<div style="padding:12px 16px">';
      html += '<div style="font-size:13px;color:var(--text);line-height:1.5;background:' + advice.bg + ';border-radius:8px;padding:10px 12px;border:1px solid ' + advice.color + '">';
      html += '<strong>' + advice.emoji + ' ' + advice.title + '</strong><br>' + advice.text;
      if (advice.showPostpone) {
        var postponed = getStore('postponedTraining', null);
        if (postponed && postponed.trainingKey === trainingKey && postponed.fromDate === todayKey) {
          html += '<div style="margin-top:8px;font-size:12px;color:var(--text-light)">Training is verschoven naar morgen.</div>';
        } else {
          html += '<div style="margin-top:10px"><button onclick="postponeTraining(\'' + trainingKey + '\')" style="padding:8px 16px;border-radius:8px;border:1px solid ' + advice.color + ';background:var(--card);color:' + advice.color + ';cursor:pointer;font-size:13px;font-weight:600">Verschuif naar morgen</button></div>';
        }
      }
      html += '</div>';
      html += '<button onclick="resetSoreness()" style="display:block;margin:8px auto 0;background:none;border:none;color:var(--text-light);font-size:11px;cursor:pointer">Wijzigen</button>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  html += '<div class="card-header"><span class="icon">\uD83E\uDDB5</span>Nog last van vorige training?</div>';

  if (filledCount === 0) {
    html += '<div style="padding:10px 16px;border-top:1px solid var(--border);text-align:center">';
    html += '<button onclick="clearAllSoreness()" style="padding:10px 20px;border-radius:10px;border:2px solid var(--success);background:var(--success-bg);color:var(--success-text);cursor:pointer;font-size:14px;font-weight:600;width:100%">';
    html += '\u2705 Geen klachten \u2014 lekker bezig!</button></div>';
  }

  SORENESS_GROUPS.forEach(function(group) {
    var currentLevel = todayData[group.id];
    html += '<div style="padding:10px 16px;border-top:1px solid var(--border)">';
    html += '<div style="margin-bottom:6px">';
    html += '<span style="font-size:14px">' + group.emoji + '</span> <strong style="font-size:13px">' + group.label + '</strong>';
    html += '<div style="font-size:12px;color:var(--text-light);margin-top:1px">' + group.question + '</div>';
    html += '</div>';
    html += '<div style="display:flex;gap:6px">';
    SORENESS_LEVELS.forEach(function(lvl) {
      var isSelected = currentLevel === lvl.value;
      var border = isSelected ? '2px solid ' + lvl.color : '2px solid var(--border)';
      var bg = isSelected ? lvl.bg : 'var(--card)';
      var fontWeight = isSelected ? '700' : '400';
      html += '<button onclick="setSoreness(\'' + group.id + '\',' + lvl.value + ')" style="flex:1;padding:8px 2px;border-radius:8px;border:' + border + ';background:' + bg + ';cursor:pointer;text-align:center">';
      html += '<div style="font-size:11px;font-weight:' + fontWeight + ';color:' + (isSelected ? lvl.textColor : 'var(--text-light)') + '">' + lvl.label + '</div>';
      html += '</button>';
    });
    html += '</div></div>';
  });

  if (Object.keys(todayData).length > 0) {
    var advice = getSorenessAdvice(todayData, trainingKey);
    if (advice) {
      html += '<div style="padding:10px 16px;border-top:1px solid var(--border)">';
      html += '<div style="font-size:13px;color:var(--text);line-height:1.5;background:' + advice.bg + ';border-radius:8px;padding:10px 12px;border:1px solid ' + advice.color + '">';
      html += '<strong>' + advice.emoji + ' ' + advice.title + '</strong><br>' + advice.text;
      if (advice.showPostpone) {
        var postponed = getStore('postponedTraining', null);
        if (postponed && postponed.trainingKey === trainingKey && postponed.fromDate === todayKey) {
          html += '<div style="margin-top:8px;font-size:12px;color:var(--text-light)">Training is verschoven naar morgen.</div>';
        } else {
          html += '<div style="margin-top:10px"><button onclick="postponeTraining(\'' + trainingKey + '\')" style="padding:8px 16px;border-radius:8px;border:1px solid ' + advice.color + ';background:var(--card);color:' + advice.color + ';cursor:pointer;font-size:13px;font-weight:600">Verschuif naar morgen</button></div>';
        }
      }
      html += '</div></div>';
    }
  }

  html += '</div>';
  return html;
}

function getSorenessAdvice(todayData, trainingKey) {
  var isRestDay = !trainingKey;
  var targetGroups = isRestDay
    ? SORENESS_GROUPS.map(function(g) { return g.id; })
    : getTrainingMuscleGroup(trainingKey);
  var maxRelevant = 0;
  var relevantPain = [];
  targetGroups.forEach(function(gid) {
    var level = todayData[gid];
    if (level !== undefined && level > maxRelevant) maxRelevant = level;
    if (level >= 2) {
      var g = SORENESS_GROUPS.filter(function(x) { return x.id === gid; })[0];
      if (g) relevantPain.push(g.label.toLowerCase());
    }
  });

  // Rustdag-specifiek advies
  if (isRestDay) {
    if (maxRelevant === 0) {
      return { emoji: '\uD83D\uDE0C', title: 'Lekker hersteld!', text: 'Geen spierpijn — je herstel verloopt goed. Geniet van je rustdag!', color: 'var(--success)', bg: 'var(--success-bg)' };
    } else if (maxRelevant === 1) {
      return { emoji: '\uD83D\uDC4D', title: 'Goed bezig', text: 'Lichte stijfheid is normaal na training. Licht bewegen of stretchen helpt het herstel.', color: 'var(--success)', bg: 'var(--success-bg)' };
    } else if (maxRelevant === 2) {
      return { emoji: '\uD83E\uDDD8', title: 'Rust & herstel', text: 'Nog wat spierpijn — goed dat je vandaag rust hebt. Licht wandelen of stretchen kan helpen.', color: 'var(--warning-border, orange)', bg: 'var(--warning-bg, #fff8e1)' };
    } else {
      var where3 = relevantPain.length > 0 ? ' in je ' + relevantPain.join(' en ') : '';
      return { emoji: '\u26D4', title: 'Stevig herstel nodig', text: 'Flinke spierpijn' + where3 + '. Neem het rustig aan vandaag — geen zware activiteit. Hydratatie en eiwitten helpen bij herstel.', color: 'var(--danger, #c62828)', bg: 'var(--danger-bg, #ffebee)' };
    }
  }

  // Trainingsdag advies
  if (maxRelevant === 0) {
    return { emoji: '\u2705', title: 'Volledig trainen', text: 'Geen spierpijn in de spiergroepen die je vandaag gaat trainen. Ga ervoor!', color: 'var(--success)', bg: 'var(--success-bg)' };
  } else if (maxRelevant === 1) {
    return { emoji: '\u2705', title: 'Gewoon trainen', text: 'Lichte spierpijn is normaal en verdwijnt vaak na de warming-up. Train gewoon volgens schema.', color: 'var(--success)', bg: 'var(--success-bg)' };
  } else if (maxRelevant === 2) {
    var where = relevantPain.length > 0 ? ' (' + relevantPain.join(', ') + ')' : '';
    return { emoji: '\u26A0\uFE0F', title: 'Aangepast trainen', text: 'Matige spierpijn' + where + '. Begin 10\u201320% lichter dan normaal en focus op goede techniek. Als de pijn na de warming-up niet afneemt, overweeg dan om lichter door te gaan.', color: 'var(--warning-border, orange)', bg: 'var(--warning-bg, #fff8e1)' };
  } else {
    var where2 = relevantPain.length > 0 ? ' in je ' + relevantPain.join(' en ') : '';
    return { emoji: '\u26D4', title: 'Rust aanbevolen', text: 'Zware spierpijn' + where2 + '. Je spieren zijn nog aan het herstellen (DOMS). Overweeg vandaag alleen licht te wandelen of de training naar morgen te verschuiven.', color: 'var(--danger, #c62828)', bg: 'var(--danger-bg, #ffebee)', showPostpone: true };
  }
}

function postponeTraining(trainingKey) {
  var todayKey = getTodayKey();
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var tomorrowKey = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');
  var weekType = getWeekType();
  var tomorrowScheduled = getSchedule(weekType)[tomorrow.getDay()];
  if (tomorrowScheduled) {
    var tName = TRAINING_DATA[tomorrowScheduled] ? TRAINING_DATA[tomorrowScheduled].name : tomorrowScheduled;
    if (!confirm('Morgen staat al "' + tName + '" gepland. Wil je deze training er toch bij verschuiven?')) return;
  }
  setStore('postponedTraining', {
    trainingKey: trainingKey,
    fromDate: todayKey,
    toDate: tomorrowKey
  });
  renderToday();
}

function getPostponedTraining() {
  var p = getStore('postponedTraining', null);
  if (!p) return null;
  var todayKey = getTodayKey();
  if (p.toDate === todayKey) return p;
  if (p.toDate < todayKey) {
    setStore('postponedTraining', null);
    return null;
  }
  return null;
}

function setSoreness(groupId, level) {
  var todayKey = getTodayKey();
  var sorenessLog = getStore('sorenessLog', {});
  if (!sorenessLog[todayKey]) sorenessLog[todayKey] = {};
  sorenessLog[todayKey][groupId] = level;
  var keys = Object.keys(sorenessLog);
  if (keys.length > 30) {
    keys.sort();
    for (var i = 0; i < keys.length - 30; i++) delete sorenessLog[keys[i]];
  }
  setStore('sorenessLog', sorenessLog);
  renderToday();
}

function clearAllSoreness() {
  SORENESS_GROUPS.forEach(function(g) { setSoreness(g.id, 0); });
}

function resetSoreness() {
  var todayKey = getTodayKey();
  var sorenessLog = getStore('sorenessLog', {});
  delete sorenessLog[todayKey];
  setStore('sorenessLog', sorenessLog);
  renderToday();
}

function getRotatingGreeting() {
  var greetings = [
    'Hoi prachtige vrouw',
    'Hey sexy babe',
    'Hoi beautiful',
    'Hey schoonheid',
    'Hoi lekker ding',
    'Hey powervrouw',
    'Hoi stralende meid',
    'Hey supergirl',
    'Hoi gorgeous',
    'Hey queen'
  ];
  var now = new Date();
  var start = new Date(now.getFullYear(), 0, 0);
  var dayOfYear = Math.floor((now - start) / 86400000);
  return greetings[dayOfYear % greetings.length];
}

function renderToday() {
  var now = new Date();
  var weekType = getWeekType();
  var dayOfWeek = now.getDay();
  var schedule = getSchedule(weekType);
  var todayKey = getTodayKey();

  // Rotating compliment in topbar
  var topH1 = document.querySelector('.topbar h1');
  if (topH1) {
    var badge = document.getElementById('weekBadge');
    topH1.textContent = getRotatingGreeting() + ' ';
    if (badge) topH1.appendChild(badge);
  }

  document.getElementById('weekBadge').textContent = 'Week ' + weekType;
  document.getElementById('topbarDate').textContent = formatDateNL(now);

  var daysSince = daysSinceLastTraining();
  if (daysSince >= 14 && daysSince < 999) {
    document.getElementById('welcomeBanner').classList.add('show');
  }

  var content = document.getElementById('todayContent');
  var trainingKey = schedule[dayOfWeek];

  // Check voor verschoven training van gisteren
  var postponed = getPostponedTraining();
  var isPostponed = false;
  if (!trainingKey && postponed && postponed.trainingKey) {
    trainingKey = postponed.trainingKey;
    isPostponed = true;
  }

  // ── Inhaal-logica: check op gemiste krachttrainingen deze week ──
  var catchUp = getStore('catchUpToday', null);
  var catchUpActive = false;
  if (catchUp && catchUp.date === todayKey && catchUp.trainingKey) {
    // Gebruiker heeft al gekozen: doe de gemiste training
    trainingKey = catchUp.trainingKey;
    catchUpActive = true;
  }
  // Catch-up choice is now handled via agenda day-preview ("Nu doen" button)

  // Build motivation strip + weekly summary
  var motivHtml = '';
  if (hasPausedTraining()) {
    motivHtml += renderResumeBanner();
  }

  if (isPostponed) {
    motivHtml += '<div style="margin:8px 16px;padding:12px 16px;background:var(--info-bg);border:1px solid var(--primary);border-radius:12px;font-size:13px;line-height:1.5">';
    motivHtml += '<strong>Verschoven training</strong><br>Deze training is verschoven van gisteren omdat je spierpijn had. Voel je je vandaag beter? Dan kun je hem nu doen!';
    motivHtml += '<div style="margin-top:8px"><button onclick="setStore(\'postponedTraining\',null);renderToday()" style="padding:6px 12px;border-radius:6px;border:1px solid var(--border);background:var(--card);cursor:pointer;font-size:12px">Toch overslaan</button></div>';
    motivHtml += '</div>';
  }

  // (Inhaal-keuze is nu via agenda → dag aanklikken → "Nu doen")

  // Toon inhaal-banner als swap actief is
  if (catchUpActive) {
    var originalKey = schedule[dayOfWeek];
    var originalName = (TRAINING_DATA[originalKey] ? TRAINING_DATA[originalKey].name : originalKey) || 'je geplande training';
    motivHtml += '<div style="margin:8px 16px;padding:10px 16px;background:var(--success-bg);border:1px solid var(--success);border-radius:12px;font-size:13px;line-height:1.5">';
    motivHtml += '\u2705 <strong>Inhaaltraining</strong> \u2014 je doet vandaag de gemiste training in plaats van ' + originalName + '.';
    motivHtml += '</div>';
  }

  motivHtml += renderWeekSummary() + renderMotivationStrip();

  if (!trainingKey) {
    renderRestDay(content, dayOfWeek, motivHtml);
    return;
  }

  var training = TRAINING_DATA[trainingKey];
  if (training.type === 'kracht') {
    renderKrachtOverview(content, training, trainingKey, todayKey, motivHtml);
  } else {
    renderCardioOverview(content, training, trainingKey, motivHtml);
  }
  initVideoObserver();
}

function renderRestDay(container, dayOfWeek, motivHtml) {
  var isCycling = [1,4].includes(dayOfWeek);
  var html = (motivHtml || '');

  // Clean header
  html += '<div style="padding:24px 20px 16px;text-align:center">';
  html += '<div style="font-size:40px;margin-bottom:8px">' + (isCycling ? '\uD83D\uDEB4' : '\uD83D\uDE0C') + '</div>';
  html += '<h2 style="margin:0 0 6px;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:var(--text)">' + (isCycling ? 'Fietsdag' : 'Rustdag') + '</h2>';
  html += '<p style="margin:0;font-size:14px;color:var(--text-light)">' + (isCycling ? 'Fietsen naar school = \u00b130 min cardio' : 'Herstel is minstens zo belangrijk als trainen') + '</p>';
  html += '</div>';

  // Slimme rustdag-tips
  var smartTip = getSmartRestDayTip(dayOfWeek, isCycling);
  if (smartTip) {
    html += '<div class="recovery-warning">' + smartTip + '</div>';
  }

  // === Modern action cards ===
  var routineCompleted = getStore('dailyRoutineCompleted_' + getTodayKey(), false);

  // Card 1: Dagelijkse routine
  html += '<div onclick="' + (routineCompleted ? '' : 'startDailyRoutine()') + '" style="margin:8px 16px;padding:16px 18px;background:var(--card);border-radius:16px;border:1px solid var(--border);display:flex;align-items:center;gap:14px;' + (routineCompleted ? '' : 'cursor:pointer') + '">';
  html += '<div style="width:44px;height:44px;border-radius:12px;background:' + (routineCompleted ? 'var(--success-bg)' : 'var(--info-bg)') + ';display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">' + (routineCompleted ? '\u2705' : '\uD83E\uDDD8') + '</div>';
  html += '<div style="flex:1;min-width:0">';
  html += '<div style="font-weight:700;font-size:15px;color:var(--text)">' + (routineCompleted ? 'Routine voltooid!' : 'Dagelijkse routine') + '</div>';
  html += '<div style="font-size:13px;color:var(--text-light);margin-top:2px">' + (routineCompleted ? 'Core & mobiliteit gedaan' : DAILY_ROUTINE.length + ' oefeningen \u00b7 10\u201315 min') + '</div>';
  html += '</div>';
  if (!routineCompleted) html += '<div style="color:var(--text-light);font-size:18px;flex-shrink:0">\u203A</div>';
  html += '</div>';

  // Card 2: Stretchen
  html += '<div onclick="startStretchTimer()" style="margin:8px 16px;padding:16px 18px;background:var(--card);border-radius:16px;border:1px solid var(--border);display:flex;align-items:center;gap:14px;cursor:pointer">';
  html += '<div style="width:44px;height:44px;border-radius:12px;background:var(--success-bg);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">\uD83E\uDDD8\u200D\u2640\uFE0F</div>';
  html += '<div style="flex:1;min-width:0">';
  html += '<div style="font-weight:700;font-size:15px;color:var(--text)">Stretch routine</div>';
  html += '<div style="font-size:13px;color:var(--text-light);margin-top:2px">' + STRETCH_ROUTINES.length + ' stretches \u00b7 \u00b15 min</div>';
  html += '</div>';
  html += '<div style="color:var(--text-light);font-size:18px;flex-shrink:0">\u203A</div>';
  html += '</div>';

  // Card 3: Loopband wandelen
  html += '<div onclick="startLoopbandWandelen()" style="margin:8px 16px;padding:16px 18px;background:var(--card);border-radius:16px;border:1px solid var(--border);display:flex;align-items:center;gap:14px;cursor:pointer">';
  html += '<div style="width:44px;height:44px;border-radius:12px;background:var(--warning-bg);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">\uD83D\uDEB6</div>';
  html += '<div style="flex:1;min-width:0">';
  html += '<div style="font-weight:700;font-size:15px;color:var(--text)">Wandelen</div>';
  html += '<div style="font-size:13px;color:var(--text-light);margin-top:2px">' + (isCycling ? '20\u201330 min \u00b7 rondje met Milou' : '30\u201345 min \u00b7 goed voor herstel') + '</div>';
  html += '</div>';
  html += '<div style="color:var(--text-light);font-size:18px;flex-shrink:0">\u203A</div>';
  html += '</div>';

  // Kuit-tips op fietsdagen
  if (isCycling) {
    html += '<div style="margin:4px 16px">';
    html += '<button onclick="toggleKuitTips(this)" style="background:none;border:none;color:var(--primary);font-size:13px;font-weight:600;cursor:pointer;padding:4px 0">\uD83E\uDDB5 Tips tegen kuitpijn \u25BC</button>';
    html += '<div class="kuit-tips-body" style="display:none;margin-top:6px;font-size:12px;color:var(--text-light);line-height:1.5">';
    html += '<p style="margin:0 0 4px"><strong>Zadelhoogte:</strong> Hiel op pedaal \u2192 been net gestrekt.</p>';
    html += '<p style="margin:0 0 4px"><strong>Voetpositie:</strong> Trap met de bal van je voet.</p>';
    html += '<p style="margin:0 0 4px"><strong>Cadans:</strong> Lichter verzet, sneller trappen (70\u201390 rpm).</p>';
    html += '<p style="margin:0 0 4px"><strong>Na het fietsen:</strong> 30 sec kuiten stretchen per been.</p>';
    html += '</div></div>';
  }

  // Vrije training — subtle link
  html += '<div style="text-align:center;padding:20px 16px 32px">';
  html += '<button onclick="openVrijeTraining()" style="background:none;border:none;color:var(--primary);font-size:14px;font-weight:600;cursor:pointer;padding:8px 20px">Toch zin om te trainen? \u2192</button>';
  html += '</div>';

  container.innerHTML = html;
}

function renderKrachtOverview(container, training, trainingKey, todayKey, motivHtml) {
  var daysSince = daysSinceLastTraining();
  var recoveryWarning = getRecoveryWarningForTraining(trainingKey);

  var html = (motivHtml || '');

  // Herstelwaarschuwing
  if (recoveryWarning) {
    html += '<div class="recovery-warning">' + recoveryWarning + '</div>';
  }

  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83C\uDFCB</span><div>';
  html += '<div style="font-size:20px;font-weight:700;color:var(--primary)">' + training.name + '</div>';
  html += '<div style="font-size:13px;color:var(--text-light)">3 sets per oefening \u00b7 \u00b145 min</div>';
  html += '</div></div>';

  // Start button — prominent, direct zichtbaar
  var todaySessions = getStore('sessions', []).filter(function(s) { return s.date === todayKey && s.trainingKey === trainingKey; });
  if (todaySessions.length > 0) {
    var ts = todaySessions[todaySessions.length - 1];
    var exCount = ts.exercises ? ts.exercises.length : 0;
    html += '<div style="background:var(--success-bg);border:1px solid var(--success);border-radius:12px;padding:14px 16px;margin:4px 0 12px;text-align:center">';
    html += '<div style="font-size:24px;margin-bottom:4px">\u2705</div>';
    html += '<div style="font-size:16px;font-weight:700;color:var(--success-text)">Training afgerond!</div>';
    html += '<div style="font-size:13px;color:var(--text-light);margin-top:4px">' + exCount + ' oefeningen voltooid</div>';
    html += '</div>';
    html += '<button class="start-training-btn" onclick="startTrainingMode(\'' + trainingKey + '\')" style="opacity:0.6;font-size:14px;margin:0 0 12px">Opnieuw starten</button>';
  } else {
    html += '<button class="start-training-btn" onclick="startTrainingMode(\'' + trainingKey + '\')" style="margin:4px 0 12px">Training starten \u25B6</button>';
  }

  // Warmup
  html += '<div class="phase-block"><div class="phase-icon">\uD83D\uDD25</div>';
  html += '<div class="phase-text"><strong>Warming-up:</strong> ' + training.warmup.apparaat + ' ' + training.warmup.duur + ' \u2014 ' + training.warmup.detail + '</div></div>';

  // Exercise preview list (collapsible)
  var phaseExercises = getTrainingExercises(trainingKey);
  html += '<div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'span:last-child\').textContent=this.nextElementSibling.style.display===\'none\'?\'\u25B6\':\'\u25BC\'" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;cursor:pointer;color:var(--text-light);font-size:13px;font-weight:600;border-top:1px solid var(--border)">';
  html += '<span>' + phaseExercises.length + ' oefeningen bekijken</span><span>\u25B6</span></div>';
  html += '<div style="display:none">';
  phaseExercises.forEach(function(exId) {
    var ex = getExercise(exId);
    if (!ex) return;
    var prevWeight = getLastWeight(exId);
    var progression = getProgressionSuggestion(exId);

    html += '<div class="exercise-item"><div class="ex-top">';
    html += '<div class="ex-info">';
    html += '<div class="ex-name">' + ex.name + '</div>';
    if (ex.instruction && ex.instruction.goal) html += '<div style="font-size:11px;color:var(--text-light);margin-top:1px;line-height:1.3">' + ex.instruction.goal + '</div>';
    html += '<div class="ex-detail">' + ex.apparaat + ' \u00b7 ' + ex.reps;
    if (prevWeight > 0 && !progression) html += ' \u00b7 Vorige: ' + prevWeight + ' ' + getWeightUnit(exId);
    html += '</div>';
    if (progression) {
      var pColor = progression.ready ? 'var(--success)' : 'var(--text-light)';
      html += '<div style="font-size:12px;color:' + pColor + ';margin-top:3px">' + progression.message + '</div>';
    }
    html += '</div>';
    html += '<div class="ex-expand" onclick="toggleOverviewInstruction(\'' + exId + '\')">\u2139\uFE0F</div>';
    html += '</div>';

    // Instruction panel (hidden by default)
    if (ex.instruction) {
      html += '<div class="ex-extra" id="overview-instr-' + exId + '">';
      html += renderVideoHtml(ex);
      html += '<div class="instruction-panel">';
      html += '<div class="instr-goal">' + ex.instruction.goal + '</div>';
      html += '<ol class="instr-steps">';
      ex.instruction.steps.forEach(function(s) { html += '<li>' + s + '</li>'; });
      html += '</ol>';
      html += '<div class="instr-focus">' + ex.instruction.focus + '</div>';
      html += '<div class="instr-mistake">' + ex.instruction.mistake + '</div>';
      html += '</div></div>';
    }

    html += '</div>';
  });
  html += '</div>'; // close collapsible exercise list

  // Cooldown (compact summary)
  html += '<div class="phase-block"><div class="phase-icon">\u2744\uFE0F</div>';
  html += '<div class="phase-text"><strong>Cooldown:</strong> ' + training.cooldown + '</div></div>';

  html += '</div>'; // close card

  // Ease-back hint
  if (daysSince >= 14 && daysSince < 999) {
    html += '<div class="ease-back-hint show">Het is even geleden \u2014 begin gerust iets lichter dan vorige keer.</div>';
  }

  // Vandaag anders? section
  html += renderVandaagAnders(trainingKey);

  container.innerHTML = html;
  initVideoObserver();
}

function toggleOverviewInstruction(exId) {
  var el = document.getElementById('overview-instr-' + exId);
  if (el) {
    el.classList.toggle('show');
    initVideoObserver();
  }
}

function isCardioPhase2() {
  // Cardio phase 2 unlocks after 6+ cardio sessions with no high calf pain in the last 4
  var sessions = getStore('sessions', []);
  var cardioSessions = sessions.filter(function(s) { return s.type === 'cardio'; });
  if (cardioSessions.length < 6) return false;
  var last4 = cardioSessions.slice(-4);
  var highPain = last4.some(function(s) {
    return s.feedback && s.feedback.calfPain >= 2;
  });
  return !highPain;
}

function getFilteredOptions(training) {
  var phase2 = isCardioPhase2();
  var filtered = [];
  training.options.forEach(function(opt, i) {
    if (!opt.phase2Only || phase2) {
      filtered.push({ opt: opt, originalIdx: i });
    }
  });
  return filtered;
}

function renderCardioOverview(container, training, trainingKey, motivHtml) {
  var filteredOpts = getFilteredOptions(training);

  var html = (motivHtml || '') + '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCA8</span><div>';
  html += '<div style="font-size:20px;font-weight:700;color:var(--primary)">' + training.name + '</div>';

  // If only one option, no need to choose
  if (filteredOpts.length === 1) {
    var singleItem = filteredOpts[0];
    var singleMin = singleItem.opt.phases.reduce(function(t, p) { return t + p.duur; }, 0);
    html += '<div style="font-size:13px;color:var(--text-light)">' + singleMin + ' min</div>';
    html += '</div></div>';
    html += '<button class="start-btn-primary" onclick="startCardioTimer(\'' + trainingKey + '\',' + singleItem.originalIdx + ')">Start ' + singleItem.opt.name + ' (' + singleMin + ' min)</button>';
    html += '</div>';
    container.innerHTML = html;
    return;
  }

  html += '<div style="font-size:13px;color:var(--text-light)">' + (trainingKey === 'inclineWandelen' ? 'Kies je duur' : 'Kies je apparaat') + '</div>';
  html += '</div></div>';

  // Find primary option (or first)
  var primaryFiltered = filteredOpts[0];
  filteredOpts.forEach(function(item) {
    if (item.opt.isPrimary) primaryFiltered = item;
  });

  // Show primary option as prominent button
  var primaryMin = primaryFiltered.opt.phases.reduce(function(t, p) { return t + p.duur; }, 0);
  html += '<button class="start-btn-primary" onclick="startCardioTimer(\'' + trainingKey + '\',' + primaryFiltered.originalIdx + ')">';
  html += 'Start ' + primaryFiltered.opt.name + ' (' + primaryMin + ' min)</button>';

  // Show interval badge if phase 2 option is available
  if (filteredOpts.some(function(item) { return item.opt.phase2Only; })) {
    html += '<div style="text-align:center;padding:4px;font-size:11px;color:var(--success)">\u2B50 Interval-optie beschikbaar \u2014 je hebt genoeg sessies zonder kuitpijn!</div>';
  }

  // Other options collapsible — subtle styling
  var others = [];
  filteredOpts.forEach(function(item) {
    if (item.originalIdx !== primaryFiltered.originalIdx) others.push({ opt: item.opt, idx: item.originalIdx });
  });

  if (others.length > 0) {
    html += '<div class="other-cardio-toggle" onclick="toggleOtherCardio(this)" style="text-align:center;padding:8px;color:var(--text-light);font-size:13px;cursor:pointer">Andere opties \u25BC</div>';
    html += '<div class="other-cardio-options" style="display:none">';
    others.forEach(function(item) {
      var totalMin = item.opt.phases.reduce(function(t, p) { return t + p.duur; }, 0);
      html += '<div class="other-cardio-item" onclick="startCardioTimer(\'' + trainingKey + '\',' + item.idx + ')">';
      html += '<div><div class="oc-name">' + item.opt.name + '</div>';
      html += '<div class="oc-detail">' + totalMin + ' min \u00b7 ';
      html += item.opt.phases.map(function(p) { return p.name; }).join(' \u2192 ');
      html += '</div></div>';
      html += '<span style="color:var(--text-light);font-size:12px">\u25B6</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  html += '</div>';

  // Handmatig afvinken
  html += '<div style="text-align:center;margin:8px 16px">';
  html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="logManualCardio(\'' + trainingKey + '\')" style="font-size:12px;color:var(--text-light)">\u2705 Al buiten gewandeld/gelopen? Handmatig afvinken</button>';
  html += '</div>';

  // Vandaag anders? section
  html += renderVandaagAnders(trainingKey);

  container.innerHTML = html;
}

function logManualCardio(trainingKey) {
  var training = TRAINING_DATA[trainingKey];
  if (!training) return;
  var todayKey = getTodayKey();
  var sessions = getStore('sessions', []);
  var existingIdx = -1;
  sessions.forEach(function(s, i) { if (s.date === todayKey && s.type === 'cardio') existingIdx = i; });

  var sessionData = {
    date: todayKey,
    type: 'cardio',
    name: training.name + ' (handmatig)',
    duration: 0,
    completedAt: new Date().toISOString(),
    feedback: null
  };

  if (existingIdx >= 0) {
    if (!confirm('Je hebt vandaag al een sessie gelogd. Wil je deze overschrijven?')) return;
    sessions[existingIdx] = sessionData;
  } else {
    sessions.push(sessionData);
  }
  setStore('sessions', sessions);

  var content = document.getElementById('todayContent');
  var html = '<div class="card" style="text-align:center;padding:32px 24px;margin:16px">';
  html += '<div style="font-size:48px;margin-bottom:12px">\u2705</div>';
  html += '<h2 style="margin:0 0 8px">Afgevinkt!</h2>';
  html += '<p style="color:var(--text-light);font-size:14px;margin:0">Je sessie is opgeslagen. Lekker bezig, Lisanne!</p>';
  html += '</div>';
  content.innerHTML = html;
}

function toggleOtherCardio(el) {
  var panel = el.nextElementSibling;
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    el.textContent = 'Andere opties \u25B2';
  } else {
    panel.style.display = 'none';
    el.textContent = 'Andere opties \u25BC';
  }
}

function toggleKuitTips(el) {
  var body = el.nextElementSibling;
  var arrow = el.querySelector('.kuit-arrow');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    arrow.textContent = '\u25B2';
  } else {
    body.style.display = 'none';
    arrow.textContent = '\u25BC';
  }
}

function toggleMeetAdvies(btn) {
  var panel = btn.nextElementSibling;
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.textContent = 'Hoe meet ik goed? \u25B2';
  } else {
    panel.style.display = 'none';
    btn.textContent = 'Hoe meet ik goed? \u25BC';
  }
}

function toggleStretchRoutine(headerEl) {
  var body = headerEl.nextElementSibling;
  var arrow = headerEl.querySelector('.stretch-arrow');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    arrow.textContent = '\u25B2';
  } else {
    body.style.display = 'none';
    arrow.textContent = '\u25BC';
  }
}

function toggleStretchRoutineCompact() {
  var el = document.getElementById('stretchRoutineCompact');
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
}

function toggleStretchDetail(id) {
  var el = document.getElementById('stretchDetail_' + id);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
    initVideoObserver();
  }
}

var stretchTimerInterval = null;
var stretchCurrentIdx = 0;
var stretchSide = 0; // 0 = links/beide, 1 = rechts

function startStretchTimer() {
  stretchCurrentIdx = 0;
  stretchSide = 0;
  showStretchTimerOverlay();
  runStretchStep();
}

function showStretchTimerOverlay() {
  var overlay = document.createElement('div');
  overlay.id = 'stretchOverlay';
  overlay.className = 'training-mode active';
  overlay.innerHTML = '<div class="tm-header"><h2>Stretch routine</h2>' +
    '<button class="tm-close" onclick="stopStretchTimer()">Stoppen</button></div>' +
    '<div class="tm-progress"><div class="tm-progress-bar" id="stretchProgressBar" style="width:0%"></div></div>' +
    '<div class="tm-body" id="stretchBody"></div>';
  document.body.appendChild(overlay);
  document.getElementById('bottomNav').style.display = 'none';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
}

function runStretchStep() {
  if (stretchCurrentIdx >= STRETCH_ROUTINES.length) {
    finishStretchRoutine();
    return;
  }

  var s = STRETCH_ROUTINES[stretchCurrentIdx];
  var body = document.getElementById('stretchBody');
  if (!body) return;

  // Update progress
  var total = STRETCH_ROUTINES.reduce(function(t, r) { return t + (r.perKant ? 2 : 1); }, 0);
  var done = 0;
  for (var i = 0; i < stretchCurrentIdx; i++) {
    done += STRETCH_ROUTINES[i].perKant ? 2 : 1;
  }
  done += stretchSide;
  var pctBar = Math.round((done / total) * 100);
  var bar = document.getElementById('stretchProgressBar');
  if (bar) bar.style.width = pctBar + '%';

  var sideLabel = '';
  if (s.perKant) sideLabel = stretchSide === 0 ? ' (links)' : ' (rechts)';

  var html = '<div class="tm-warmup-cooldown">';
  html += '<div style="font-size:14px;color:var(--primary-light);font-weight:600;margin-bottom:12px">' + (stretchCurrentIdx + 1) + ' / ' + STRETCH_ROUTINES.length + sideLabel + '</div>';
  html += '<div class="tm-exercise-name" style="font-size:24px;margin-bottom:8px">' + s.name + '</div>';

  // Instruction FIRST (always visible)
  html += '<div style="font-size:14px;color:var(--text);line-height:1.6;max-width:320px;margin:0 auto 12px;padding:12px 16px;background:var(--card);border-radius:10px;text-align:left">' + s.instruction + '</div>';
  html += '<div style="font-size:13px;color:var(--success);margin-bottom:12px">\u2714\uFE0F ' + s.focus + '</div>';

  if (s.videoUrl) {
    html += '<div style="margin:0 0 12px"><video class="exercise-video" src="' + s.videoUrl + '" loop muted playsinline preload="none" onerror="this.parentElement.style.display=\'none\'" onloadeddata="this.classList.add(\'loaded\');this.play().catch(function(){})"></video></div>';
  }

  html += '<div class="tm-timer" id="stretchTimerDisplay" style="font-size:56px">' + s.duur + '</div>';
  html += '<button class="tm-btn tm-btn-accent" onclick="startStretchCountdown(' + s.duur + ')">Start ' + s.duur + ' sec</button>';
  html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="skipStretchStep()">Overslaan</button>';
  html += '</div>';
  body.innerHTML = html;
  initVideoObserver();
}

function startStretchCountdown(seconds) {
  var remaining = seconds;
  var body = document.getElementById('stretchBody');
  var s = STRETCH_ROUTINES[stretchCurrentIdx];
  var sideLabel = '';
  if (s.perKant) sideLabel = stretchSide === 0 ? ' (links)' : ' (rechts)';

  // Rebuild with timer running
  var html = '<div class="tm-warmup-cooldown">';
  html += '<div style="font-size:14px;color:var(--primary-light);font-weight:600;margin-bottom:12px">' + (stretchCurrentIdx + 1) + ' / ' + STRETCH_ROUTINES.length + sideLabel + '</div>';
  html += '<div class="tm-exercise-name" style="font-size:22px;margin-bottom:8px">' + s.name + '</div>';

  // Instruction stays visible during timer
  html += '<div style="font-size:13px;color:var(--text-light);line-height:1.5;max-width:300px;margin:0 auto 8px">' + s.instruction + '</div>';

  html += '<div style="font-size:13px;color:var(--success);margin-bottom:8px">\u2714\uFE0F ' + s.focus + '</div>';
  html += '<div class="tm-timer cooldown" id="stretchTimerDisplay" style="font-size:64px">' + remaining + '</div>';
  html += '<div style="font-size:14px;color:var(--text-light)">Houd vast en adem rustig door</div>';
  html += '</div>';
  body.innerHTML = html;

  clearInterval(stretchTimerInterval);
  stretchTimerInterval = setInterval(function() {
    remaining--;
    var display = document.getElementById('stretchTimerDisplay');
    if (display) display.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(stretchTimerInterval);
      hapticFeedback('light');
      playTimerSound('short');
      advanceStretchStep();
    }
  }, 1000);
}

function skipStretchStep() {
  clearInterval(stretchTimerInterval);
  advanceStretchStep();
}

function advanceStretchStep() {
  var s = STRETCH_ROUTINES[stretchCurrentIdx];
  if (s.perKant && stretchSide === 0) {
    stretchSide = 1;
  } else {
    stretchCurrentIdx++;
    stretchSide = 0;
  }
  runStretchStep();
}

function finishStretchRoutine() {
  var body = document.getElementById('stretchBody');
  if (!body) return;
  var bar = document.getElementById('stretchProgressBar');
  if (bar) bar.style.width = '100%';

  var html = '<div class="completion-screen">';
  html += '<div class="emoji">\uD83E\uDDD8</div>';
  html += '<h2>Lekker gestretcht!</h2>';
  html += '<p style="color:var(--text-light);margin-bottom:24px">Je lichaam bedankt je. Stretchen op rustdagen helpt je sneller herstellen.</p>';
  html += '<button class="tm-btn tm-btn-success" onclick="stopStretchTimer()">Klaar</button>';
  html += '</div>';
  body.innerHTML = html;
}

function stopStretchTimer() {
  clearInterval(stretchTimerInterval);
  var overlay = document.getElementById('stretchOverlay');
  if (overlay) overlay.remove();
  document.getElementById('bottomNav').style.display = 'flex';
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

// ================================================================
// DAILY ROUTINE (mobiliteit & core)
// ================================================================
function getLastPlankDuration(exerciseId) {
  var sessions = getStore('sessions', []);
  for (var i = sessions.length - 1; i >= 0; i--) {
    var s = sessions[i];
    if (s.exercises) {
      var ex = s.exercises.find(function(e) { return e.id === exerciseId; });
      if (ex && ex.plankSeconds) return ex.plankSeconds;
    }
  }
  return 0;
}

function startDailyRoutine() {
  dailyRoutineActive = true;
  dailyRoutineIndex = 0;
  dailyRoutineTimerSeconds = 0;

  var overlay = document.createElement('div');
  overlay.id = 'dailyRoutineOverlay';
  overlay.className = 'training-mode active';
  overlay.innerHTML = '<div class="tm-header"><h2>Dagelijkse routine</h2>' +
    '<button class="tm-close" onclick="stopDailyRoutine()">Stoppen</button></div>' +
    '<div class="tm-progress"><div class="tm-progress-bar" id="dailyRoutineProgressBar" style="width:0%"></div></div>' +
    '<div class="tm-body" id="dailyRoutineBody"></div>';
  document.body.appendChild(overlay);
  document.getElementById('bottomNav').style.display = 'none';

  renderDailyRoutineStep();
}

function renderDailyRoutineStep() {
  if (dailyRoutineIndex >= DAILY_ROUTINE.length) {
    finishDailyRoutine();
    return;
  }

  var exercise = DAILY_ROUTINE[dailyRoutineIndex];
  var body = document.getElementById('dailyRoutineBody');
  if (!body) return;

  var pctBar = Math.round(((dailyRoutineIndex + 1) / DAILY_ROUTINE.length) * 100);
  var bar = document.getElementById('dailyRoutineProgressBar');
  if (bar) bar.style.width = pctBar + '%';

  var exDef = getExercise(exercise.id);

  var html = '<div class="tm-warmup-cooldown">';
  html += '<div style="font-size:14px;color:var(--primary-light);font-weight:600;margin-bottom:12px">Oefening ' + (dailyRoutineIndex + 1) + ' / ' + DAILY_ROUTINE.length + '</div>';
  html += '<div class="tm-exercise-name" style="font-size:24px;margin-bottom:8px">' + exercise.name + '</div>';
  html += '<div class="tm-exercise-detail">Doel: ' + exercise.target + '</div>';

  if (exDef && exDef.instruction) {
    html += '<button class="tm-instruction-toggle" onclick="var el=document.getElementById(\'dailyInstr\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'">Hoe doe ik deze oefening?</button>';
    html += '<div id="dailyInstr" style="display:none;text-align:left;background:var(--card);border-radius:10px;padding:12px;margin:8px 0;font-size:13px;line-height:1.5">';
    html += '<div style="color:var(--primary);font-weight:600;margin-bottom:4px">' + exDef.instruction.goal + '</div>';
    html += '<ol style="margin:4px 0;padding-left:20px">';
    exDef.instruction.steps.forEach(function(s) { html += '<li style="margin-bottom:4px">' + s + '</li>'; });
    html += '</ol>';
    html += '<div style="color:var(--success);font-size:12px;margin-top:4px">' + exDef.instruction.focus + '</div>';
    html += '</div>';
  }

  if (exercise.type === 'timed') {
    html += '<div class="tm-timer" id="dailyRoutineTimer" style="font-size:48px;margin:24px 0">' + formatTimer(dailyRoutineTimerSeconds) + '</div>';
    html += '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px">';
    if (dailyRoutineTimerSeconds === 0) {
      var seconds = 30;
      if (exercise.id === 'plank') {
        var lastPlank = getLastPlankDuration('plank');
        if (lastPlank > 0) seconds = Math.min(lastPlank + 5, 120);
      }
      html += '<button class="tm-btn tm-btn-accent" onclick="startDailyRoutineTimer(' + seconds + ')">Start timer (' + seconds + 's)</button>';
    } else {
      html += '<button class="tm-btn tm-btn-success" onclick="nextDailyRoutineExercise()">Voltooid</button>';
      html += '<button class="tm-btn tm-btn-outline" style="max-width:150px" onclick="addDailyRoutineTime(5)">+5s</button>';
    }
    html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="nextDailyRoutineExercise()" style="margin-top:4px">Overslaan</button>';
    html += '</div>';
  } else {
    html += '<div style="text-align:center;padding:12px 0">';
    html += '<div style="font-size:14px;color:var(--text-light);margin-bottom:8px">Voer ' + exercise.target + ' uit</div>';
    html += '</div>';
    html += '<button class="tm-btn tm-btn-success" onclick="nextDailyRoutineExercise()" style="width:100%;margin-top:16px;padding:12px">Voltooid</button>';
    html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="nextDailyRoutineExercise()" style="margin-top:4px">Overslaan</button>';
  }

  html += '</div>';
  body.innerHTML = html;
}

function startDailyRoutineTimer(seconds) {
  dailyRoutineTimerSeconds = seconds;
  _dailyTimerTotalSeconds = seconds;
  renderDailyRoutineStep();
  clearInterval(dailyRoutineTimerInterval);
  _dailyTimerStartTime = Date.now();
  dailyRoutineTimerInterval = setInterval(function() {
    var elapsed = Math.floor((Date.now() - _dailyTimerStartTime) / 1000);
    dailyRoutineTimerSeconds = Math.max(0, _dailyTimerTotalSeconds - elapsed);
    var display = document.getElementById('dailyRoutineTimer');
    if (display) display.textContent = formatTimer(dailyRoutineTimerSeconds);
    if (dailyRoutineTimerSeconds <= 0) {
      clearInterval(dailyRoutineTimerInterval);
      hapticFeedback('heavy');
      nextDailyRoutineExercise();
    }
  }, 500);
}

function addDailyRoutineTime(seconds) {
  _dailyTimerTotalSeconds += seconds;
  var elapsed = Math.floor((Date.now() - _dailyTimerStartTime) / 1000);
  dailyRoutineTimerSeconds = Math.max(0, _dailyTimerTotalSeconds - elapsed);
  var display = document.getElementById('dailyRoutineTimer');
  if (display) display.textContent = formatTimer(dailyRoutineTimerSeconds);
}

function nextDailyRoutineExercise() {
  clearInterval(dailyRoutineTimerInterval);
  dailyRoutineTimerSeconds = 0;
  dailyRoutineIndex++;
  renderDailyRoutineStep();
}

function finishDailyRoutine() {
  var body = document.getElementById('dailyRoutineBody');
  if (!body) return;
  var bar = document.getElementById('dailyRoutineProgressBar');
  if (bar) bar.style.width = '100%';
  setStore('dailyRoutineCompleted_' + getTodayKey(), true);

  var html = '<div class="completion-screen">';
  html += '<div class="emoji">\uD83C\uDF1F</div>';
  html += '<h2>Goed gedaan!</h2>';
  html += '<p style="color:var(--text-light);margin-bottom:24px">Je dagelijkse routine is voltooid!</p>';
  html += '<button class="tm-btn tm-btn-success" onclick="stopDailyRoutine()">Klaar</button>';
  html += '</div>';
  body.innerHTML = html;
}

function stopDailyRoutine() {
  clearInterval(dailyRoutineTimerInterval);
  dailyRoutineActive = false;
  var overlay = document.getElementById('dailyRoutineOverlay');
  if (overlay) overlay.remove();
  document.getElementById('bottomNav').style.display = 'flex';
  showPage('pageTrain', document.querySelectorAll('.nav-item')[0]);
}

// ================================================================
// VRIJE TRAINING
// ================================================================
function openVrijeTraining() {
  var modal = document.getElementById('vrijModal');
  var opts = document.getElementById('vrijOptions');
  var weekType = getWeekType();
  var schedule = getSchedule(weekType);

  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var tomorrowTraining = schedule[tomorrow.getDay()];

  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayTraining = schedule[yesterday.getDay()];

  var options = [
    { key: 'krachtBoven', name: 'Kracht: bovenlichaam', desc: 'Chest press, shoulder press, dumbbell row, plank' },
    { key: 'krachtOnder', name: 'Kracht: onderlichaam', desc: 'Leg curl, leg extension, goblet squat, glute bridge, plank' },
    { key: 'loopbandWandelen', name: 'Loopband wandelen (35 min)', desc: 'Rustig wandelen op de loopband' },
    { key: 'cardioVariatie', name: 'Cardio variatie (40\u201345 min)', desc: 'Crosstrainer, loopband of recumbent bike' },
    { key: 'cardioLicht', name: 'Lichte cardio (30 min)', desc: 'Loopband, crosstrainer of hometrainer' },
  ];

  // Determine warnings per option
  var goodOptions = [];
  var warnOptions = [];
  options.forEach(function(opt) {
    var warning = '';
    if (tomorrowTraining && TRAINING_DATA[tomorrowTraining] && TRAINING_DATA[tomorrowTraining].type === 'kracht' &&
        (opt.key === 'krachtBoven' || opt.key === 'krachtOnder')) {
      warning = '\u26A0 Morgen staat krachttraining gepland \u2014 lichte cardio is misschien slimmer';
    }
    if (yesterdayTraining && TRAINING_DATA[yesterdayTraining] && TRAINING_DATA[yesterdayTraining].type === 'kracht' &&
        (opt.key === 'krachtBoven' || opt.key === 'krachtOnder')) {
      warning = '\u26A0 Gisteren was krachttraining \u2014 een rustdag ertussen is beter';
    }
    opt._warning = warning;
    if (warning) { warnOptions.push(opt); } else { goodOptions.push(opt); }
  });

  // Render good options first (with green accent), then warned options (dimmed)
  var html = '';
  if (goodOptions.length > 0) {
    html += '<div style="font-size:12px;color:var(--success);font-weight:600;padding:8px 16px 4px">\u2705 Aanbevolen voor vandaag</div>';
    goodOptions.forEach(function(opt) {
      html += '<div class="modal-option recommended" onclick="selectVrijeTraining(\'' + opt.key + '\')">';
      html += '<div class="opt-title">' + opt.name + '</div>';
      html += '<div class="opt-desc">' + opt.desc + '</div>';
      html += '</div>';
    });
  }
  if (warnOptions.length > 0) {
    html += '<div style="font-size:12px;color:var(--text-light);padding:12px 16px 4px;border-top:1px solid var(--border);margin-top:4px">Minder geschikt vandaag</div>';
    warnOptions.forEach(function(opt) {
      html += '<div class="modal-option warning" onclick="selectVrijeTraining(\'' + opt.key + '\')">';
      html += '<div class="opt-title">' + opt.name + '</div>';
      html += '<div class="opt-desc">' + opt.desc + '</div>';
      html += '<div class="opt-warn">' + opt._warning + '</div>';
      html += '</div>';
    });
  }

  opts.innerHTML = html;
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
}

function selectVrijeTraining(key) {
  closeModal();
  var training = TRAINING_DATA[key];
  if (training.type === 'kracht') {
    startTrainingMode(key);
  } else {
    var container = document.getElementById('todayContent');
    renderCardioOverview(container, training, key);
  }
}

function closeModal() {
  document.getElementById('vrijModal').classList.remove('show');
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}


// ================================================================
// HISTORY — Professional Chart.js Dashboard
// ================================================================
var _chartInstances = [];

function destroyCharts() {
  _chartInstances.forEach(function(chart) {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
  _chartInstances = [];
}

function getISOWeek(date) {
  var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

var _historyFilter = getStore('historyFilter', 'all'); // '4w', '8w', 'all', 'custom'
var _historyFrom = getStore('historyFrom', '');
var _historyTo = getStore('historyTo', '');

function setHistoryFilter(period) {
  _historyFilter = period;
  setStore('historyFilter', period);
  if (period !== 'custom') {
    _historyFrom = '';
    _historyTo = '';
    setStore('historyFrom', '');
    setStore('historyTo', '');
  }
  renderHistory();
}

function setHistoryCustomRange() {
  var fromEl = document.getElementById('filterFrom');
  var toEl = document.getElementById('filterTo');
  if (fromEl) { _historyFrom = fromEl.value; setStore('historyFrom', fromEl.value); }
  if (toEl) { _historyTo = toEl.value; setStore('historyTo', toEl.value); }
  _historyFilter = 'custom';
  setStore('historyFilter', 'custom');
  renderHistory();
}

function filterByPeriod(items, dateKey) {
  if (_historyFilter === 'all') return items;
  var now = new Date();
  var from, to;
  if (_historyFilter === 'custom') {
    from = _historyFrom ? new Date(_historyFrom) : new Date(0);
    to = _historyTo ? new Date(_historyTo + 'T23:59:59') : now;
  } else {
    var weeks = _historyFilter === '4w' ? 4 : 8;
    from = new Date(now);
    from.setDate(from.getDate() - (weeks * 7));
    to = now;
  }
  return items.filter(function(item) {
    var d = new Date(item[dateKey]);
    return d >= from && d <= to;
  });
}

function renderHistory() {
  var allSessions = getStore('sessions', []);
  var allMeasurements = getStore('measurements', []);
  var sessions = filterByPeriod(allSessions, 'date');
  var measurements = filterByPeriod(allMeasurements, 'date');
  var container = document.getElementById('pageHistory');

  var html = '';

  // ── PERIODEFILTER ──
  var btnStyle = function(id) {
    var active = _historyFilter === id;
    return 'padding:6px 14px;border-radius:20px;border:1.5px solid ' +
      (active ? 'var(--primary)' : 'var(--border)') + ';background:' +
      (active ? 'var(--primary)' : 'transparent') + ';color:' +
      (active ? 'white' : 'var(--text)') + ';font-size:13px;font-weight:' +
      (active ? '600' : '500') + ';cursor:pointer';
  };
  html += '<div class="card" style="padding:12px 16px">';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">';
  html += '<button onclick="setHistoryFilter(\'4w\')" style="' + btnStyle('4w') + '">4 weken</button>';
  html += '<button onclick="setHistoryFilter(\'8w\')" style="' + btnStyle('8w') + '">8 weken</button>';
  html += '<button onclick="setHistoryFilter(\'all\')" style="' + btnStyle('all') + '">Alles</button>';
  html += '<button onclick="setHistoryFilter(\'custom\')" style="' + btnStyle('custom') + '">Periode</button>';
  html += '</div>';
  if (_historyFilter === 'custom') {
    html += '<div style="display:flex;gap:8px;margin-top:10px;align-items:center">';
    html += '<input type="date" id="filterFrom" value="' + _historyFrom + '" onchange="setHistoryCustomRange()" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--card);color:var(--text)">';
    html += '<span style="color:var(--text-light)">t/m</span>';
    html += '<input type="date" id="filterTo" value="' + _historyTo + '" onchange="setHistoryCustomRange()" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--card);color:var(--text)">';
    html += '</div>';
  }
  if (_historyFilter !== 'all') {
    html += '<div style="font-size:11px;color:var(--text-light);margin-top:6px">' + sessions.length + ' trainingen in deze periode</div>';
  }
  html += '</div>';

  // ── STREAK & STATS SUMMARY ──
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCC8</span> Overzicht</div>';
  html += '<div class="stats-grid">';
  html += '<div class="stat-box"><div class="stat-num">' + sessions.length + '</div><div class="stat-label">Trainingen' + (_historyFilter !== 'all' ? '' : ' totaal') + '</div></div>';
  var streak = calcStreak(allSessions);
  html += '<div class="stat-box"><div class="stat-num">' + streak + '</div><div class="stat-label">Weken op rij</div></div>';
  var thisWeekCount = countThisWeek(allSessions);
  var weekScheduleCount = getWeekTrainingCount();
  html += '<div class="stat-box"><div class="stat-num">' + thisWeekCount + '/' + weekScheduleCount + '</div><div class="stat-label">Deze week gedaan</div></div>';
  var avgEnergy = calcAvgEnergy(sessions);
  var energyPeriod = calcAvgEnergyPeriod(sessions);
  html += '<div class="stat-box"><div class="stat-num">' + (avgEnergy > 0 ? avgEnergy.toFixed(1) : '-') + '/5</div><div class="stat-label">Gem. energie (' + energyPeriod + ')</div></div>';
  // Total volume for kracht sessions
  var krachtSessions = sessions.filter(function(s) { return s.exercises && s.exercises.length > 0; });
  if (krachtSessions.length > 0) {
    var lastKracht = krachtSessions[krachtSessions.length - 1];
    var lastVol = calcSessionVolume(lastKracht);
    if (lastVol > 0) {
      html += '<div class="stat-box"><div class="stat-num">' + (lastVol >= 1000 ? (lastVol / 1000).toFixed(1) + 'k' : lastVol) + '</div><div class="stat-label">Laatste volume (kg)</div></div>';
    }
  }
  html += '</div></div>';

  // ── WEIGHT TREND CHART ──
  if (measurements.length >= 2) {
    html += '<div class="card">';
    html += '<div class="card-header"><span class="icon">\uD83D\uDCC9</span> Gewichtstrend</div>';
    html += '<div class="chart-container"><canvas id="weightTrendChart"></canvas></div>';
    html += '</div>';
  }

  // ── TRAINING FREQUENCY CHART ──
  if (sessions.length >= 3) {
    html += '<div class="card">';
    html += '<div class="card-header"><span class="icon">\uD83D\uDCC5</span> Trainingsfrequentie per week</div>';
    html += '<div class="chart-container"><canvas id="frequencyChart"></canvas></div>';
    html += '</div>';
  }

  // ── STRENGTH PROGRESSION CHART ──
  var exerciseHistory = buildExerciseHistory(sessions);
  var exerciseKeys = Object.keys(exerciseHistory).filter(function(exId) {
    return exerciseHistory[exId].length >= 2;
  });
  if (exerciseKeys.length > 0) {
    html += '<div class="card">';
    html += '<div class="card-header"><span class="icon">\uD83D\uDCAA</span> Krachtprogressie</div>';

    // Summary table per exercise — tabular aligned layout
    html += '<table style="width:100%;border-collapse:collapse;padding:4px 16px 8px;font-size:13px">';
    exerciseKeys.forEach(function(exId) {
      var ex = getExercise(exId);
      if (!ex) return;
      var history = exerciseHistory[exId];
      if (history.length < 1) return;
      var latest = history[history.length - 1];
      var first = history[0];
      var isBw = latest.isBodyweight;
      var val = isBw ? latest.reps : latest.weight;
      var firstVal = isBw ? first.reps : first.weight;
      var unit = isBw ? 'reps' : getWeightUnit(exId);
      var diff = val - firstVal;
      var diffStr = diff > 0 ? '+' + diff : (diff < 0 ? '' + diff : '\u00B10');
      var diffColor = diff > 0 ? 'var(--success)' : (diff < 0 ? 'var(--danger)' : 'var(--text-light)');
      html += '<tr style="border-bottom:1px solid var(--border)">';
      html += '<td style="padding:6px 16px 6px 16px;font-weight:500">' + ex.name + '</td>';
      html += '<td style="padding:6px 4px;font-weight:700;text-align:right;white-space:nowrap">' + val + ' ' + unit + '</td>';
      html += '<td style="padding:6px 16px 6px 8px;font-weight:600;color:' + diffColor + ';font-size:11px;white-space:nowrap">(' + diffStr + ')</td>';
      html += '</tr>';
    });
    html += '</table>';

    html += '<div class="chart-container" ><canvas id="strengthChart"></canvas></div>';
    html += '</div>';
  }

  // ── VOLUME TREND CHART ──
  var volSessions = sessions.filter(function(s) {
    return s.exercises && s.exercises.length > 0 && calcSessionVolume(s) > 0;
  }).slice(-15);
  if (volSessions.length >= 3) {
    html += '<div class="card">';
    html += '<div class="card-header"><span class="icon">\uD83D\uDCCA</span> Volume per training</div>';
    html += '<div style="padding:0 16px 4px;font-size:11px;color:var(--text-light)">Totaal gewicht \u00d7 herhalingen \u00d7 sets per krachtsessie</div>';
    html += '<div class="chart-container"><canvas id="volumeChart"></canvas></div>';
    html += '</div>';
  }

  // ── ENERGY & CALF PAIN CHART ──
  var sessionsWithFeedback = sessions.filter(function(s) {
    return s.feedback && (s.feedback.energy || (s.feedback.calfPain !== null && s.feedback.calfPain !== undefined));
  }).slice(-20);
  if (sessionsWithFeedback.length >= 2) {
    html += '<div class="card">';
    html += '<div class="card-header"><span class="icon">\u26A1</span> Energie & kuitpijn</div>';
    html += '<div class="chart-container"><canvas id="energyPainChart"></canvas></div>';
    html += '</div>';
  }

  // ── BODY MEASUREMENTS ──
  var weightGoal = getStore('weightGoal', 70);
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCCF</span> Gewicht & metingen</div>';
  html += '<div id="measurementsList">';
  if (measurements.length > 0) {
    var latestM = measurements[measurements.length - 1];
    var firstM = measurements[0];

    html += '<div style="text-align:center;padding:16px 16px 8px">';
    html += '<div style="font-size:36px;font-weight:700;color:var(--primary)">' + latestM.weight + ' kg</div>';
    html += '<div style="font-size:13px;color:var(--text-light);margin-top:4px">Doel: ' + weightGoal + ' kg</div>';

    if (measurements.length >= 2) {
      var startWeight = firstM.weight;
      var totalToLose = startWeight - weightGoal;
      var lostSoFar = startWeight - latestM.weight;
      if (totalToLose > 0) {
        var goalPct = Math.max(0, Math.min(100, Math.round((lostSoFar / totalToLose) * 100)));
        html += '<div style="background:var(--border);border-radius:8px;height:8px;margin:12px auto;max-width:250px;overflow:hidden">';
        html += '<div style="background:var(--success);height:100%;width:' + goalPct + '%;border-radius:8px;transition:width 0.3s"></div></div>';
        html += '<div style="font-size:12px;color:var(--text-light)">' + goalPct + '% van je doel bereikt</div>';
      }
    }
    html += '</div>';

    html += '<div style="padding:8px 16px 12px">' + getWeightMessage(measurements, weightGoal) + '</div>';

    // Taille/heup chart
    var measWithBody = measurements.filter(function(m) { return m.waist && m.hip; });
    if (measWithBody.length >= 2) {
      html += '<div class="chart-container" ><canvas id="waistHipChart"></canvas></div>';
    }

    var extras = [];
    if (latestM.waist) extras.push('Taille: ' + latestM.waist + ' cm');
    if (latestM.hip) extras.push('Heup: ' + latestM.hip + ' cm');
    if (latestM.waist && latestM.hip) {
      var ratio = (latestM.waist / latestM.hip).toFixed(2);
      var ratioLabel = parseFloat(ratio) <= 0.80 ? ' \u2713 gezond' : parseFloat(ratio) <= 0.85 ? ' \u2014 verhoogd' : ' \u2014 te hoog';
      extras.push('T/H ratio: ' + ratio + ratioLabel);
    }
    if (extras.length > 0) {
      html += '<div style="font-size:12px;padding:0 16px 12px;color:var(--text-light)">' + extras.join(' \u00b7 ') + '</div>';
    }

    if (measurements.length > 1) {
      html += '<div style="padding:0 16px 12px">';
      html += '<button onclick="toggleMetingenLijst(this)" style="background:none;border:none;color:var(--primary-light);font-size:13px;cursor:pointer;padding:4px 0">Alle metingen (' + measurements.length + ') \u25BC</button>';
      html += '<div class="metingen-lijst" style="display:none;margin-top:8px">';
      measurements.slice().reverse().forEach(function(m, ri) {
        var idx = measurements.length - 1 - ri;
        var d = new Date(m.date);
        var details = m.weight + ' kg';
        if (m.waist) details += ' \u00b7 T: ' + m.waist + ' cm';
        if (m.hip) details += ' \u00b7 H: ' + m.hip + ' cm';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">';
        html += '<div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><strong>' + formatDateNL(d) + '</strong> \u2014 ' + details + '</div>';
        html += '<div style="display:flex;gap:4px;flex-shrink:0">';
        html += '<button onclick="editMeasurement(' + idx + ')" style="background:none;border:none;color:var(--primary-light);font-size:14px;cursor:pointer;padding:4px 6px" title="Bewerken">\u270F\uFE0F</button>';
        html += '<button onclick="deleteMeasurement(' + idx + ')" style="background:none;border:none;color:var(--text-light);font-size:14px;cursor:pointer;padding:4px 6px;opacity:0.5" title="Verwijderen">\uD83D\uDDD1\uFE0F</button>';
        html += '</div></div>';
      });
      html += '</div></div>';
    }
  } else {
    html += '<div style="padding:14px 18px;color:var(--text-light);font-size:13px">Nog geen metingen. Weeg jezelf en voeg je eerste meting toe!</div>';
  }
  html += '</div>';

  // Use allMeasurements for reminders (not filtered)
  var lastMeasDate = allMeasurements.length > 0 ? allMeasurements[allMeasurements.length - 1].date : null;
  var daysSinceWeight = lastMeasDate ? Math.floor((new Date() - new Date(lastMeasDate)) / 86400000) : 999;
  var lastBodyMeas = null;
  for (var bi = allMeasurements.length - 1; bi >= 0; bi--) {
    if (allMeasurements[bi].waist || allMeasurements[bi].hip) { lastBodyMeas = allMeasurements[bi]; break; }
  }
  var daysSinceBody = lastBodyMeas ? Math.floor((new Date() - new Date(lastBodyMeas.date)) / 86400000) : 999;
  var showBodyFields = daysSinceBody >= 30 || !lastBodyMeas;

  if (lastMeasDate) {
    var lastD = new Date(lastMeasDate);
    var dateStr = lastD.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
    html += '<table style="font-size:12px;color:var(--text-light);margin:4px 16px 8px;border-collapse:collapse">';
    html += '<tr><td style="padding:3px 12px 3px 0;white-space:nowrap">Laatste weging</td><td style="padding:3px 0">' + dateStr + ' <span style="opacity:0.7">(' + daysSinceWeight + ' dag' + (daysSinceWeight !== 1 ? 'en' : '') + ' geleden)</span></td></tr>';
    if (lastBodyMeas) {
      var bodyD = new Date(lastBodyMeas.date);
      var bodyDateStr = bodyD.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
      html += '<tr><td style="padding:3px 12px 3px 0;white-space:nowrap">Laatste taille/heup</td><td style="padding:3px 0">' + bodyDateStr + '</td></tr>';
    }
    html += '</table>';
  }

  if (daysSinceWeight >= 7 || measurements.length === 0) {
    html += '<div style="padding:8px 16px;background:var(--hint-bg);border-left:3px solid var(--success);margin:0 0 4px;font-size:13px;color:var(--text)">';
    html += '\uD83D\uDCC5 ' + (measurements.length === 0 ? 'Tip: weeg jezelf 1x per week.' : 'Het is weer tijd om je te wegen!');
    html += '</div>';
  }

  if (showBodyFields) {
    html += '<div style="padding:8px 16px;background:var(--info-bg);border-left:3px solid var(--primary);margin:4px 0;font-size:13px;color:var(--text)">';
    html += '\uD83D\uDCCF ' + (!lastBodyMeas ? 'Tip: meet ook je taille & heup \u2014 1x per maand is genoeg.' : 'Tijd voor je maandelijkse taille/heup meting!');
    html += '</div>';
  }

  html += '<div class="checkin-form">';
  html += '<div class="checkin-field"><label>Datum</label><input type="date" id="inputDate" value="' + getTodayKey() + '" max="' + getTodayKey() + '"></div>';
  html += '<div class="checkin-field"><label>Gewicht (kg)</label><input type="number" step="0.1" id="inputWeight" placeholder="bv. 74.5"></div>';
  if (showBodyFields) {
    html += '<div class="checkin-field"><label>Tailleomtrek (cm) <span style="font-weight:400;font-size:11px;color:var(--text-light)">\u2014 smalste punt, ter hoogte van navel</span></label><input type="number" step="0.5" id="inputWaist" placeholder="bv. 82"></div>';
    html += '<div class="checkin-field"><label>Heupomtrek (cm) <span style="font-weight:400;font-size:11px;color:var(--text-light)">\u2014 breedste punt van je heupen</span></label><input type="number" step="0.5" id="inputHip" placeholder="bv. 100"></div>';
  } else {
    html += '<input type="hidden" id="inputWaist" value=""><input type="hidden" id="inputHip" value="">';
  }
  html += '<div class="checkin-field"><label>Streefgewicht (kg)</label><input type="number" step="0.5" id="inputGoal" value="' + weightGoal + '"></div>';

  html += '<div style="margin-bottom:12px">';
  html += '<button onclick="toggleMeetAdvies(this)" style="background:none;border:none;color:var(--primary-light);font-size:13px;cursor:pointer;padding:4px 0">Hoe meet ik goed? \u25BC</button>';
  html += '<div class="meet-advies" style="display:none;font-size:12px;color:var(--text-light);line-height:1.6;margin-top:8px;padding:10px;background:var(--bg);border-radius:8px">';
  html += '<p style="margin:0 0 8px"><strong>\u2696\uFE0F Wegen:</strong> 1x per week, \'s ochtends, na het plassen, voor het ontbijt. Zonder kleding of in ondergoed. Zelfde weegschaal, zelfde plek.</p>';
  html += '<p style="margin:0 0 8px"><strong>\uD83D\uDCCF Taille/heup:</strong> 1x per maand. Taille: smalste plek (ter hoogte van navel). Heup: breedste punt. Meetlint horizontaal, niet te strak. Adem rustig uit.</p>';
  html += '<p style="margin:0"><strong>\uD83D\uDCC6 Wanneer:</strong> Altijd op dezelfde dag en tijdstip. Je gewicht schommelt dagelijks 0,5\u20131,5 kg door vocht en voeding \u2014 dat is normaal.</p>';
  html += '</div></div>';
  html += '<button class="save-btn" onclick="saveMeasurement()">Meting opslaan</button>';
  html += '</div></div>';

  // ── SESSION HISTORY (GROUPED BY WEEK) ──
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCDD</span> Trainingsgeschiedenis</div>';
  html += '<div id="historyList">';
  if (sessions.length === 0) {
    html += '<div class="history-empty"><div class="emoji">\uD83D\uDCDD</div><p>Nog geen trainingen.<br>Na je eerste training verschijnt hier je geschiedenis.</p></div>';
  } else {
    // Group sessions by ISO week
    var weekGroups = {};
    var reversedSessions = sessions.slice().reverse();
    reversedSessions.forEach(function(s, ri) {
      var sIdx = sessions.length - 1 - ri;
      var d = new Date(s.date);
      var yr = d.getFullYear();
      var wk = getISOWeek(d);
      var weekKey = yr + '-W' + (wk < 10 ? '0' : '') + wk;
      if (!weekGroups[weekKey]) {
        weekGroups[weekKey] = { week: wk, year: yr, sessions: [] };
      }
      weekGroups[weekKey].sessions.push({ s: s, sIdx: sIdx, d: d, ri: ri });
    });

    var weekKeys = Object.keys(weekGroups).sort().reverse();
    var showAllWeeks = getStore('showAllWeeks', false);
    var lastTwoWeeks = weekKeys.slice(0, 2);

    weekKeys.forEach(function(wk, wkIdx) {
      var group = weekGroups[wk];
      var isRecentWeek = lastTwoWeeks.indexOf(wk) >= 0;
      var isExpanded = showAllWeeks;
      var sessionCount = group.sessions.length;

      html += '<div style="border-bottom:1px solid var(--border);padding:12px 16px">';
      html += '<div onclick="toggleWeekGroup(\'' + wk + '\')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center">';
      html += '<span style="font-weight:600;color:var(--text);font-size:14px">Week ' + group.week + ' (' + sessionCount + ' trainingen)</span>';
      html += '<span style="color:var(--text-light);font-size:16px" id="weekToggle-' + wk + '">' + (isExpanded ? '▼' : '▶') + '</span>';
      html += '</div>';
      html += '<div id="weekContent-' + wk + '" style="display:' + (isExpanded ? 'block' : 'none') + ';margin-top:8px">';

      group.sessions.forEach(function(item) {
        var s = item.s;
        var sIdx = item.sIdx;
        var d = item.d;
        var dayName = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][d.getDay()];
        var dayNum = d.getDate();
        var monthStr = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][d.getMonth()];

        var typeStr = s.name || s.type;
        var weightStr = '';
        if (s.exercises) {
          var weights = s.exercises.filter(function(e) { return e.weight > 0; }).map(function(e) { return e.weight; });
          var maxW = weights.length > 0 ? Math.max.apply(null, weights) : 0;
          if (maxW > 0) {
            var maxEx = s.exercises.find(function(e) { return e.weight === maxW; });
            var maxUnit = maxEx ? getWeightUnit(maxEx.id) : 'kg';
            weightStr = '— ' + maxW + ' ' + maxUnit;
          }
        }

        var feedbackStr = '';
        if (s.feedback) {
          var energyEmojis = ['', '\uD83D\uDE29', '\uD83D\uDE14', '\uD83D\uDE10', '\uD83D\uDE0A', '\uD83D\uDCAA'];
          if (s.feedback.energy) feedbackStr += energyEmojis[s.feedback.energy] + ' ';
          if (s.feedback.calfPain !== null && s.feedback.calfPain !== undefined && s.feedback.calfPain > 0) feedbackStr += '\uD83E\uDDB5' + s.feedback.calfPain + '/3';
        }

        html += '<div>';
        html += '<div onclick="toggleSessionDetail(' + sIdx + ')" style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;gap:6px;cursor:pointer">';
        html += '<span style="color:var(--text-light);white-space:nowrap;min-width:60px">' + dayName + ' ' + dayNum + ' ' + monthStr + '</span>';
        html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + typeStr;
        if (weightStr) html += ' <span style="color:var(--text-light)">' + weightStr + '</span>';
        html += '</span>';
        if (feedbackStr) html += '<span style="white-space:nowrap">' + feedbackStr + '</span>';
        html += '<span style="color:var(--text-light);font-size:10px;opacity:0.4">\u25B6</span>';
        html += '</div>';
        html += '<div id="sessionDetail-' + sIdx + '" style="display:none;padding:6px 0 10px;border-bottom:1px solid var(--border);background:var(--bg);margin:0 -16px;padding-left:16px;padding-right:16px">';
        if (s.exercises && s.exercises.length > 0) {
          s.exercises.forEach(function(ex, exIdx) {
            var exData = getExercise(ex.id);
            var exName = exData ? exData.name : ex.id;
            var exUnit = getWeightUnit(ex.id);
            var exStep = getWeightStep(ex.id);
            var isBw = exData && (exData.isPlank || exData.isBodyweight);
            html += '<div style="padding:6px 0;border-bottom:1px solid var(--border)">';
            html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">' + exName + '</div>';
            if (ex.sets && ex.sets.length > 0) {
              html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
              ex.sets.forEach(function(set, setIdx) {
                html += '<div style="display:inline-flex;align-items:center;gap:3px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:3px 6px;font-size:11px">';
                html += '<span style="color:var(--text-light)">S' + (setIdx + 1) + ':</span>';
                if (!isBw) {
                  html += '<input type="number" step="' + exStep + '" value="' + (set.weight || 0) + '" onchange="updateSessionSetWeight(' + sIdx + ',' + exIdx + ',' + setIdx + ',this.value)" style="width:42px;padding:2px;border:1px solid var(--border);border-radius:4px;font-size:11px;text-align:center;background:var(--bg);color:var(--text)">' + exUnit + ' ';
                }
                html += '<input type="number" step="1" min="0" value="' + (set.reps || 0) + '" onchange="updateSessionSetReps(' + sIdx + ',' + exIdx + ',' + setIdx + ',this.value)" style="width:36px;padding:2px;border:1px solid var(--border);border-radius:4px;font-size:11px;text-align:center;background:var(--bg);color:var(--text)">' + (isBw ? '' : 'x');
                html += '</div>';
              });
              html += '</div>';
            } else if (!isBw) {
              html += '<div style="font-size:12px;color:var(--text-light)">';
              html += '<input type="number" step="' + exStep + '" value="' + (ex.weight || 0) + '" onchange="updateSessionWeight(' + sIdx + ',' + exIdx + ',this.value)" style="width:60px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px;text-align:center;background:var(--card);color:var(--text)"> ' + exUnit;
              html += '</div>';
            }
            html += '</div>';
          });
        }
        html += '<div style="display:flex;justify-content:flex-end;margin-top:6px">';
        html += '<button onclick="deleteSession(' + sIdx + ')" style="background:none;border:none;color:var(--danger);font-size:12px;cursor:pointer;padding:4px 8px;opacity:0.6">Verwijderen</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
      });

      html += '</div></div>';
    });

    if (!showAllWeeks && weekKeys.length > 2) {
      html += '<div style="padding:12px 16px;text-align:center">';
      html += '<button onclick="toggleShowAllWeeks()" style="background:none;border:none;color:var(--primary);font-size:13px;cursor:pointer;padding:4px 0;text-decoration:underline">Toon oudere sessies</button>';
      html += '</div>';
    }
  }
  html += '</div></div>';


  container.innerHTML = html;

  // Initialize charts after DOM is ready
  destroyCharts();
  setTimeout(function() { createProgressCharts(sessions, measurements, weightGoal); }, 60);
}

// ================================================================
// PROFILE PAGE RENDERING
// ================================================================
function renderProfile() {
  var container = document.getElementById('pageProfile');
  if (!container) return;

  var html = '';

  // ── INSTELLINGEN ──
  var weekBOn = getStore('weekBEnabled', false);
  var weekBReady = isWeekBReady();
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\u2699\uFE0F</span> Instellingen</div>';
  html += '<div style="padding:14px 16px">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
  html += '<div><div style="font-weight:600;font-size:14px">Week B inschakelen</div>';
  html += '<div style="font-size:12px;color:var(--text-light)">Voegt vrijdag lichte cardio toe (om de week)</div></div>';
  html += '<label class="toggle-switch"><input type="checkbox" ' + (weekBOn ? 'checked' : '') + ' onchange="toggleWeekB()"><span class="toggle-slider"></span></label>';
  html += '</div>';
  if (!weekBOn && weekBReady) {
    html += '<div style="font-size:12px;color:var(--success);margin-top:4px">\u2705 Je kuitpijn is de laatste weken laag \u2014 je kunt Week B proberen!</div>';
  }
  if (!weekBOn && !weekBReady) {
    html += '<div style="font-size:12px;color:var(--text-light);margin-top:4px">Week B wordt aanbevolen als je kuitpijn consequent onder controle is (gemiddeld &lt; 2/3).</div>';
  }
  var darkOn = getStore('darkMode', false);
  html += '<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">';
  html += '<div><div style="font-weight:600;font-size:14px">Donkere modus</div>';
  html += '<div style="font-size:12px;color:var(--text-light)">Makkelijker voor je ogen in het donker</div></div>';
  html += '<label class="toggle-switch"><input type="checkbox" ' + (darkOn ? 'checked' : '') + ' onchange="toggleDarkMode()"><span class="toggle-slider"></span></label>';
  html += '</div>';
  var remindersOn = getStore('remindersEnabled', false);
  html += '<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between">';
  html += '<div><div style="font-weight:600;font-size:14px">Herinneringen</div>';
  html += '<div style="font-size:12px;color:var(--text-light)">Krijg een melding op trainingsdagen</div></div>';
  html += '<label class="toggle-switch"><input type="checkbox" ' + (remindersOn ? 'checked' : '') + ' onchange="toggleReminders()"><span class="toggle-slider"></span></label>';
  html += '</div>';
  if (remindersOn && 'Notification' in window && Notification.permission === 'denied') {
    html += '<div style="font-size:12px;color:var(--warning);margin-top:4px">Meldingen zijn geblokkeerd in je browser. Sta ze toe in je instellingen.</div>';
  }
  html += '</div>';
  var phase = getCurrentPhase();
  var phaseInfo = PHASE_CONFIG[phase];
  var progress = isPhase2Available();
  html += '<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">';
  html += '<div><div style="font-weight:600;font-size:14px">' + phaseInfo.name + '</div>';
  html += '<div style="font-size:12px;color:var(--text-light)">' + phaseInfo.description + '</div></div>';
  html += '</div>';
  if (phase === 1) {
    var req = PHASE_CONFIG[2].unlockRequirement;
    html += '<div style="font-size:12px;color:var(--text-light);margin-top:6px">';
    html += 'Fase 2 unlock: ' + progress.sessions + '/' + req.sessions + ' sessies, ' + progress.weeks + '/' + req.weeks + ' weken actief';
    html += '</div>';
    var pctS = Math.min(100, Math.round(progress.sessions / req.sessions * 100));
    var pctW = Math.min(100, Math.round(progress.weeks / req.weeks * 100));
    var pct = Math.min(pctS, pctW);
    html += '<div style="background:var(--border);border-radius:6px;height:6px;margin-top:6px;overflow:hidden">';
    html += '<div style="background:var(--accent);height:100%;width:' + pct + '%;border-radius:6px;transition:width 0.3s"></div>';
    html += '</div>';
  } else {
    html += '<div style="font-size:12px;color:var(--success);margin-top:4px">\u2705 Fase 2 is ontgrendeld! Meer oefeningen en variatie beschikbaar.</div>';
  }
  html += '</div>';
  html += '</div></div>';

  // ── HOE KIES JE HET JUISTE GEWICHT ──
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCA1</span> Hoe kies je het juiste gewicht?</div>';
  html += '<div style="padding:14px 16px;font-size:13px;color:var(--text-light);line-height:1.6">';
  html += '<p style="margin:0 0 12px"><strong style="color:var(--text)">Begin licht.</strong> Kies een gewicht waarmee je makkelijk 12 herhalingen kunt doen. Het voelt misschien te makkelijk \u2014 dat is prima.</p>';
  html += '<p style="margin:0 0 12px"><strong style="color:var(--text)">De vuistregel:</strong> na je set moet je het gevoel hebben dat je nog 3\u20134 herhalingen had kunnen doen. Kun je dat niet? Dan is het te zwaar.</p>';
  html += '<p style="margin:0 0 6px"><strong style="color:var(--text)">Typische startgewichten:</strong></p>';
  html += '<p style="margin:0 0 4px;padding-left:6px">\u2022 Machine-oefeningen (chest press, leg ext): <strong style="color:var(--text)">10\u201320 kg / 22\u201344 lbs</strong></p>';
  html += '<p style="margin:0 0 4px;padding-left:6px">\u2022 Dumbbells (dumbbell row): <strong style="color:var(--text)">4\u20138 kg / 9\u201318 lbs</strong></p>';
  html += '<p style="margin:0 0 12px;padding-left:6px">\u2022 Shoulder press: <strong style="color:var(--text)">5\u201315 kg / 11\u201333 lbs</strong></p>';
  html += '<p style="margin:0"><strong style="color:var(--text)">De app regelt de rest:</strong> als je 3\u00d712 haalt, zegt de app automatisch wanneer je gewicht mag verhogen.</p>';
  html += '</div></div>';

  // ── GEWICHTSSTAPPEN PER OEFENING ──
  var phase = getCurrentPhase();
  var allExIds = Object.keys(typeof EXERCISE_DB !== 'undefined' ? EXERCISE_DB : {});
  var krachtExIds = allExIds.filter(function(id) {
    var e = getExercise(id);
    if (!e || e.isPlank || e.isBodyweight) return false;
    if (e.phase && e.phase > phase) return false;
    return true;
  });

  var machineExIds = krachtExIds.filter(function(id) { return !isDumbbell(id); });
  var dumbbellExIds = krachtExIds.filter(function(id) { return isDumbbell(id); });

  if (machineExIds.length > 0) {
    html += '<div class="card">';
    html += '<div class="card-header"><span class="icon">\uD83C\uDFCB\uFE0F</span> Gewichtsstappen (machines)</div>';
    html += '<div style="padding:14px 16px">';
    html += '<p style="font-size:13px;color:var(--text-light);margin-bottom:10px">Stel de gewichtsstap per machine in. Pas aan naar jouw sportschool.</p>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    machineExIds.forEach(function(exId) {
      var ex = getExercise(exId);
      if (!ex) return;
      var step = getWeightStep(exId);
      var unit = getWeightUnit(exId);
      html += '<tr style="border-bottom:1px solid var(--border)">';
      html += '<td style="padding:8px 0;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + ex.name + '</td>';
      html += '<td style="padding:8px 0;text-align:right;white-space:nowrap">';
      html += '<input type="number" step="0.25" min="0.25" value="' + step + '" oninput="setWeightStep(\'' + exId + '\',this.value,this)" style="width:56px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:13px;text-align:center;background:var(--card);color:var(--text);transition:border-color 0.3s">';
      html += ' <select onchange="setWeightUnit(\'' + exId + '\',this.value,this)" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--card);color:var(--text);transition:border-color 0.3s">';
      html += '<option value="kg"' + (unit === 'kg' ? ' selected' : '') + '>kg</option>';
      html += '<option value="lbs"' + (unit === 'lbs' ? ' selected' : '') + '>lbs</option>';
      html += '</select>';
      html += '</td></tr>';
    });
    html += '</table>';
    html += '</div></div>';
  }

  if (dumbbellExIds.length > 0) {
    html += '<div class="card">';
    html += '<div class="card-header"><span class="icon">\uD83D\uDCAA</span> Beschikbare dumbbells</div>';
    html += '<div style="padding:14px 16px">';
    html += '<p style="font-size:13px;color:var(--text-light);margin-bottom:10px">Typ hieronder welke dumbbell-gewichten beschikbaar zijn, gescheiden door komma\u2019s. Decimalen met punt of komma (bijv. 2.5 of 2,5). Dit geldt voor alle dumbbell-oefeningen.</p>';
    var refId = dumbbellExIds[0];
    var avail = getAvailableWeights(refId);
    var currentStr = avail.map(function(n) { return ('' + n).replace('.', ','); }).join(', ');
    html += '<input type="text" id="dbWeightInput" value="' + currentStr + '" placeholder="bijv. 2, 4, 6, 8, 10, 12, 14, 16, 20" style="width:100%;padding:10px 12px;border:2px solid var(--border);border-radius:8px;font-size:14px;background:var(--card);color:var(--text);box-sizing:border-box;margin-bottom:8px">';
    html += '<button onclick="saveDumbbellWeights()" style="width:100%;padding:10px;background:var(--primary);color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Opslaan</button>';
    html += '</div></div>';
  }

  // ── STARTGEWICHT PER OEFENING ──
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83C\uDFAF</span> Startgewicht</div>';
  html += '<div style="padding:14px 16px">';
  html += '<p style="font-size:13px;color:var(--text-light);margin-bottom:10px">Het gewicht waarmee je start als je een oefening voor het eerst doet. Je kunt dit aanpassen als de standaardwaarde niet past.</p>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
  krachtExIds.forEach(function(exId) {
    var ex = getExercise(exId);
    if (!ex) return;
    var sw = getStartWeight(exId);
    var unit = getWeightUnit(exId);
    html += '<tr style="border-bottom:1px solid var(--border)">';
    html += '<td style="padding:8px 0;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + ex.name + '</td>';
    html += '<td style="padding:8px 0;text-align:right;white-space:nowrap">';
    html += '<input type="number" step="0.5" min="0" value="' + sw + '" oninput="setStartWeight(\'' + exId + '\',this.value,this)" style="width:56px;padding:4px 6px;border:2px solid var(--border);border-radius:6px;font-size:13px;text-align:center;background:var(--card);color:var(--text);transition:border-color 0.3s">';
    html += ' <span style="color:var(--text-light);font-size:12px">' + unit + '</span>';
    html += '</td></tr>';
  });
  html += '</table>';
  html += '</div></div>';

  // ── CLOUD SYNC & KOPPELCODE ──
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\u2601\uFE0F</span> Cloud & Multi-device</div>';
  html += '<div style="padding:14px 16px">';
  if (typeof getCloudSyncStatus === 'function') {
    var syncStatus = getCloudSyncStatus();
    if (syncStatus.enabled) {
      var lastSync = syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString('nl-NL') : 'nog niet';

      // ── Sync status ──
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
      html += '<span style="color:var(--success);font-size:18px">\u25CF</span>';
      html += '<span style="font-size:14px;font-weight:600;color:var(--success)">Cloud actief</span>';
      html += '</div>';
      html += '<p style="font-size:13px;color:var(--text-light);margin-bottom:4px">Je data wordt automatisch gesynchroniseerd.</p>';
      html += '<p style="font-size:12px;color:var(--text-light);margin-bottom:12px">Laatste sync: ' + lastSync + '</p>';
      html += '<button class="save-btn" onclick="fullSyncToCloud()" style="font-size:13px;margin-bottom:16px">\uD83D\uDD04 Nu synchroniseren</button>';

      // ── Koppelcode sectie ──
      html += '<div style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px">';
      html += '<div style="font-size:14px;font-weight:600;margin-bottom:6px">\uD83D\uDD17 Apparaten koppelen</div>';

      if (typeof isDeviceLinked === 'function' && isDeviceLinked()) {
        // Gekoppeld — toon status
        var activeCode = typeof getActiveKoppelcode === 'function' ? getActiveKoppelcode() : '';
        html += '<div style="background:var(--success-bg, #e8f5e9);border-radius:10px;padding:12px;margin-bottom:10px">';
        html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
        html += '<span style="font-size:16px">\u2705</span>';
        html += '<span style="font-size:13px;font-weight:600;color:var(--success)">Gekoppeld</span>';
        html += '</div>';
        if (activeCode) {
          html += '<p style="font-size:12px;color:var(--text-light);margin-bottom:0">Koppelcode: <strong style="font-family:monospace;letter-spacing:2px">' + activeCode + '</strong></p>';
        }
        html += '</div>';
        html += '<p style="font-size:12px;color:var(--text-light);margin-bottom:8px">Dit apparaat deelt data met een ander apparaat. Alle trainingen worden automatisch gesynchroniseerd.</p>';
        html += '<button class="save-btn" onclick="unlinkDevice()" style="font-size:12px;background:var(--text-light);padding:8px 14px">\u274C Ontkoppelen</button>';
      } else {
        // Niet gekoppeld — toon opties
        html += '<p style="font-size:12px;color:var(--text-light);margin-bottom:12px">Gebruik dezelfde trainingsdata op meerdere apparaten (bijv. laptop \u0026 telefoon).</p>';

        // Stap 1: Code genereren
        html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">';
        html += '<div style="font-size:12px;font-weight:600;margin-bottom:6px">Stap 1 \u2014 Op dit apparaat:</div>';
        html += '<button class="save-btn" onclick="createKoppelcode()" style="font-size:13px;width:100%">\uD83D\uDD11 Genereer koppelcode</button>';
        html += '<div id="koppelcodeDisplay"></div>';
        html += '</div>';

        // Stap 2: Code invoeren
        html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px">';
        html += '<div style="font-size:12px;font-weight:600;margin-bottom:6px">Stap 2 \u2014 Op het andere apparaat:</div>';
        html += '<div style="display:flex;gap:8px">';
        html += '<input id="koppelcodeInput" type="text" inputmode="numeric" maxlength="6" placeholder="6-cijferige code" style="flex:1;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:16px;font-family:monospace;letter-spacing:4px;text-align:center;background:var(--bg);color:var(--text)">';
        html += '<button class="save-btn" onclick="useKoppelcode()" style="font-size:13px;padding:10px 16px">\u2192 Koppel</button>';
        html += '</div>';
        html += '</div>';
      }
      html += '</div>'; // einde koppelcode sectie

    } else {
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
      html += '<span style="color:var(--warning);font-size:18px">\u25CF</span>';
      html += '<span style="font-size:14px;font-weight:600;color:var(--warning)">Niet actief</span>';
      html += '</div>';
      html += '<p style="font-size:13px;color:var(--text-light)">Cloud backup is nog niet ingesteld. Je data staat alleen lokaal op dit apparaat.</p>';
    }
  } else {
    html += '<p style="font-size:13px;color:var(--text-light)">Cloud sync module niet geladen.</p>';
  }
  html += '</div></div>';

  // ── EXPORT / IMPORT ──
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCBE</span> Data beheer</div>';
  html += '<div style="padding:14px 16px">';
  html += '<p style="font-size:13px;color:var(--text-light);margin-bottom:12px">Exporteer al je trainingsdata als JSON-bestand. Handig als extra back-up of om naar een ander apparaat te verplaatsen.</p>';
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap">';
  html += '<button class="save-btn" onclick="exportData()" style="flex:1;min-width:120px">\u2B07 Exporteren</button>';
  html += '<button class="save-btn" onclick="triggerImport()" style="flex:1;min-width:120px;background:var(--border);color:var(--text)">\u2B06 Importeren</button>';
  html += '</div>';
  html += '<input type="file" id="importFileInput" accept=".json" style="display:none" onchange="importData(this)">';
  html += '</div></div>';

  // ── OFFLINE VIDEO'S ──
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83C\uDFA5</span> Offline afbeeldingen</div>';
  html += '<div style="padding:14px 16px">';
  html += '<p style="font-size:13px;color:var(--text-light);margin-bottom:12px">Download alle oefening-afbeeldingen zodat ze ook zonder internet werken.</p>';
  html += '<div id="videoCacheProgress"></div>';
  html += '<button class="save-btn" onclick="cacheAllVideos()" id="cacheVideosBtn">\u2B07 Afbeeldingen downloaden</button>';
  html += '</div></div>';

  // ── AGENDA EXPORT ──
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCC5</span> Agenda</div>';
  html += '<div style="padding:14px 16px">';
  html += '<p style="font-size:13px;color:var(--text-light);margin-bottom:12px">Zet je trainingsschema en wekelijks weegmoment (za 07:15) in je telefoonagenda.</p>';
  html += '<button class="save-btn" onclick="exportCalendar()" style="width:100%">\uD83D\uDCC5 Voeg toe aan agenda</button>';
  html += '</div></div>';

  // ── ONBOARDING OPNIEUW ──
  html += '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCD6</span> Introductie</div>';
  html += '<div style="padding:14px 16px">';
  html += '<p style="font-size:13px;color:var(--text-light);margin-bottom:12px">Bekijk de uitleg over het trainingsschema, progressiesysteem en weekindeling opnieuw.</p>';
  html += '<button onclick="showOnboarding()" style="background:var(--primary);color:white;border:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;width:100%">\uD83D\uDCD6 Introductie bekijken</button>';
  html += '</div></div>';

  // ── DATA RESETTEN ──
  html += '<div class="card" style="margin-top:24px">';
  html += '<div class="card-header"><span class="icon">\u26A0\uFE0F</span> Gevarenzone</div>';
  html += '<div style="padding:14px 16px">';
  html += '<p style="font-size:13px;color:var(--text-light);margin-bottom:12px">Verwijder alle trainingsdata en begin opnieuw. Dit kan niet ongedaan worden gemaakt!</p>';
  html += '<button onclick="confirmResetAllData()" style="background:var(--danger);color:white;border:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;width:100%">\uD83D\uDDD1\uFE0F Alle data wissen</button>';
  html += '</div></div>';

  // ── VERSIE ──
  html += '<div style="text-align:center;padding:20px 16px 40px;font-size:11px;color:var(--text-light);opacity:0.5">Trainingsschema Lisanne v' + APP_VERSION + '</div>';

  container.innerHTML = html;
}

// ================================================================
// CHART CREATION — Professional Chart.js visualizations
// ================================================================
function createProgressCharts(sessions, measurements, weightGoal) {
  if (typeof Chart === 'undefined') return;

  var isDark = true; // Design D is always dark
  var textColor = '#ccc';
  var gridColor = 'rgba(255,255,255,0.08)';
  var tooltipBg = '#333';
  var tooltipColor = '#eee';

  // Mobile detection and responsive settings
  var isMobile = window.innerWidth < 600;
  var chartFontSize = isMobile ? 10 : 12;
  var chartTicksLimit = isMobile ? 6 : 12;

  var defaultTooltip = {
    backgroundColor: tooltipBg,
    titleColor: tooltipColor,
    bodyColor: tooltipColor,
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    displayColors: true
  };

  // ─── 1. WEIGHT TREND ───
  var weightCanvas = document.getElementById('weightTrendChart');
  if (weightCanvas && measurements.length >= 2) {
    var wLabels = measurements.map(function(m) {
      var d = new Date(m.date);
      return d.getDate() + '/' + (d.getMonth() + 1);
    });
    var wData = measurements.map(function(m) { return m.weight; });
    var wMin = Math.min.apply(null, wData.concat([weightGoal])) - 1;
    var wMax = Math.max.apply(null, wData.concat([weightGoal])) + 1;

    _chartInstances.push(new Chart(weightCanvas, {
      type: 'line',
      data: {
        labels: wLabels,
        datasets: [{
          label: 'Gewicht',
          data: wData,
          borderColor: '#B794D6',
          backgroundColor: function(ctx) {
            var chart = ctx.chart;
            if (!chart.chartArea) return 'rgba(27,79,114,0.15)';
            var g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
            g.addColorStop(0, 'rgba(27,79,114,0.25)');
            g.addColorStop(1, 'rgba(27,79,114,0.02)');
            return g;
          },
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#B794D6',
          pointBorderColor: '#1A1030',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          pointHoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: isMobile ? 1.3 : 2,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false, position: 'bottom', labels: { boxWidth: isMobile ? 8 : 12, font: { size: chartFontSize } } },
          tooltip: Object.assign({}, defaultTooltip, {
            callbacks: {
              label: function(ctx) { return ctx.parsed.y + ' kg'; }
            }
          }),
          annotation: {
            annotations: {
              goalLine: {
                type: 'line',
                yMin: weightGoal,
                yMax: weightGoal,
                borderColor: 'rgba(39,174,96,0.6)',
                borderWidth: 2,
                borderDash: [6, 4],
                label: {
                  display: true,
                  content: 'Doel: ' + weightGoal + ' kg',
                  position: 'start',
                  backgroundColor: 'rgba(39,174,96,0.15)',
                  color: '#8DC63F',
                  font: { size: 11, weight: '600' },
                  padding: { top: 3, bottom: 3, left: 6, right: 6 }
                }
              }
            }
          }
        },
        scales: {
          y: {
            min: wMin, max: wMax,
            ticks: { callback: function(v) { return v + ' kg'; }, color: textColor, font: { size: chartFontSize } },
            grid: { color: gridColor }
          },
          x: {
            ticks: { color: textColor, font: { size: chartFontSize }, maxRotation: 45, maxTicksLimit: chartTicksLimit },
            grid: { display: false }
          }
        }
      }
    }));
  }

  // ─── 2. TRAINING FREQUENCY ───
  var freqCanvas = document.getElementById('frequencyChart');
  if (freqCanvas && sessions.length >= 3) {
    var weekMap = {};
    var weekDates = {};
    sessions.forEach(function(s) {
      if (s.type === 'skip') return;
      var d = new Date(s.date);
      var yr = d.getFullYear();
      var wk = getISOWeek(d);
      var key = yr + '-W' + (wk < 10 ? '0' : '') + wk;
      if (!weekMap[key]) { weekMap[key] = { kracht: 0, cardio: 0 }; weekDates[key] = s.date; }
      var t = s.type === 'kracht' ? 'kracht' : 'cardio';
      weekMap[key][t] = (weekMap[key][t] || 0) + 1;
    });

    var wKeys = Object.keys(weekMap).sort().slice(-12);
    var wKrachtData = wKeys.map(function(w) { return weekMap[w].kracht || 0; });
    var wCardioData = wKeys.map(function(w) { return weekMap[w].cardio || 0; });
    var wLabelsF = wKeys.map(function(w) {
      var d = new Date(weekDates[w]);
      return d.getDate() + '/' + (d.getMonth() + 1);
    });

    _chartInstances.push(new Chart(freqCanvas, {
      type: 'bar',
      data: {
        labels: wLabelsF,
        datasets: [
          { label: 'Kracht', data: wKrachtData, backgroundColor: '#7B3FA0', borderRadius: 4, barPercentage: 0.7 },
          { label: 'Cardio', data: wCardioData, backgroundColor: '#F47B20', borderRadius: 4, barPercentage: 0.7 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: isMobile ? 1.3 : 2,
        interaction: { mode: 'index' },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: textColor, padding: 16, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: isMobile ? 8 : 12, font: { size: chartFontSize } } },
          tooltip: defaultTooltip
        },
        scales: {
          x: { stacked: true, ticks: { color: textColor, font: { size: chartFontSize }, maxRotation: 45, maxTicksLimit: chartTicksLimit }, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, color: textColor, font: { size: chartFontSize } }, grid: { color: gridColor }, title: { display: true, text: 'Sessies', color: textColor, font: { size: 11 } } }
        }
      }
    }));
  }

  // ─── 3. STRENGTH PROGRESSION ───
  var strengthCanvas = document.getElementById('strengthChart');
  if (strengthCanvas) {
    var exHistory = buildExerciseHistory(sessions);
    var colors = ['#B794D6', '#F47B20', '#8DC63F', '#F74B7A', '#FCC200', '#CDB4E6', '#7B3FA0', '#A8D96A'];
    var datasets = [];
    var ci = 0;

    // Build unified date labels
    var allDates = [];
    Object.keys(exHistory).forEach(function(exId) {
      if (exHistory[exId].length < 2) return;
      exHistory[exId].forEach(function(h) {
        if (allDates.indexOf(h.date) === -1) allDates.push(h.date);
      });
    });
    allDates.sort();

    Object.keys(exHistory).forEach(function(exId) {
      var hist = exHistory[exId];
      if (hist.length < 2) return;
      var ex = getExercise(exId);
      if (!ex) return;
      var color = colors[ci % colors.length];

      // Map data to allDates positions (sparse)
      var isBw = hist[0] && hist[0].isBodyweight;
      var dateMap = {};
      hist.forEach(function(h) { dateMap[h.date] = isBw ? h.reps : h.weight; });
      var mappedData = allDates.map(function(d) { return dateMap[d] !== undefined ? dateMap[d] : null; });

      datasets.push({
        label: ex.name + (isBw ? ' (reps)' : ''),
        data: mappedData,
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 2,
        fill: false,
        tension: 0.3,
        spanGaps: true,
        pointRadius: 3,
        pointBackgroundColor: color,
        pointBorderColor: '#1A1030',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6
      });
      ci++;
    });

    if (datasets.length > 0) {
      var dateLabels = allDates.map(function(d) {
        var dt = new Date(d);
        return dt.getDate() + '/' + (dt.getMonth() + 1);
      });

      _chartInstances.push(new Chart(strengthCanvas, {
        type: 'line',
        data: { labels: dateLabels, datasets: datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          aspectRatio: isMobile ? 1.3 : 2,
          interaction: { mode: 'nearest', intersect: false },
          plugins: {
            legend: { display: true, position: 'bottom', labels: { color: textColor, padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: chartFontSize }, boxWidth: isMobile ? 8 : 12 } },
            tooltip: Object.assign({}, defaultTooltip, {
              callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y + ' kg'; } }
            })
          },
          scales: {
            x: {
              ticks: { color: textColor, font: { size: chartFontSize }, maxTicksLimit: chartTicksLimit, maxRotation: 45 },
              grid: { display: false }
            },
            y: {
              beginAtZero: false,
              ticks: { callback: function(v) { return v + ' kg'; }, color: textColor, font: { size: chartFontSize } },
              grid: { color: gridColor },
              title: { display: true, text: 'Gewicht (kg)', color: textColor, font: { size: 11 } }
            }
          }
        }
      }));
    }
  }

  // ─── 4. ENERGY & CALF PAIN ───
  var epCanvas = document.getElementById('energyPainChart');
  if (epCanvas) {
    var fbSessions = sessions.filter(function(s) {
      return s.feedback && (s.feedback.energy || (s.feedback.calfPain !== null && s.feedback.calfPain !== undefined));
    }).slice(-20);

    if (fbSessions.length >= 2) {
      var epLabels = fbSessions.map(function(s) {
        var d = new Date(s.date);
        return d.getDate() + '/' + (d.getMonth() + 1);
      });
      var energyData = fbSessions.map(function(s) { return s.feedback.energy || null; });
      var painData = fbSessions.map(function(s) {
        return (s.feedback.calfPain !== null && s.feedback.calfPain !== undefined) ? s.feedback.calfPain : null;
      });

      // Converteer kuitpijn naar zelfde schaal (0-3 → 1-4) voor single axis
      var painScaled = painData.map(function(v) { return v !== null ? v + 1 : null; });

      _chartInstances.push(new Chart(epCanvas, {
        type: 'line',
        data: {
          labels: epLabels,
          datasets: [
            {
              label: 'Energie',
              data: energyData,
              borderColor: '#8DC63F',
              backgroundColor: 'transparent',
              borderWidth: 2.5,
              fill: false,
              tension: 0.3,
              pointRadius: isMobile ? 3 : 4,
              pointBackgroundColor: '#8DC63F',
              pointBorderColor: '#1A1030',
              pointBorderWidth: 1.5
            },
            {
              label: 'Kuitpijn',
              data: painScaled,
              borderColor: '#F47B20',
              backgroundColor: 'rgba(244,123,32,0.08)',
              borderWidth: 2,
              borderDash: [4, 3],
              fill: true,
              tension: 0.3,
              pointRadius: isMobile ? 3 : 4,
              pointBackgroundColor: function(ctx) {
                var val = ctx.raw;
                var cs = getComputedStyle(document.documentElement);
                if (!val || val <= 1) return cs.getPropertyValue('--success').trim();
                if (val === 2) return cs.getPropertyValue('--warning').trim();
                if (val === 3) return cs.getPropertyValue('--accent').trim();
                return cs.getPropertyValue('--danger').trim();
              },
              pointBorderColor: '#1A1030',
              pointBorderWidth: 1.5,
              pointStyle: 'triangle'
            }
          ]
        },
        options: {
          responsive: true,
          aspectRatio: isMobile ? 1.3 : 2,
          interaction: { mode: 'index', intersect: false },
          layout: { padding: { top: 6 } },
          plugins: {
            legend: { display: true, position: 'bottom', labels: { color: textColor, padding: 14, usePointStyle: true, boxWidth: isMobile ? 8 : 12, font: { size: chartFontSize } } },
            tooltip: Object.assign({}, defaultTooltip, {
              callbacks: {
                label: function(ctx) {
                  if (ctx.dataset.label === 'Energie') return 'Energie: ' + ctx.parsed.y + '/5';
                  var painLabels = ['', 'Geen', 'Beetje', 'Best wel', 'Veel'];
                  return 'Kuitpijn: ' + (painLabels[ctx.parsed.y] || ctx.parsed.y);
                }
              }
            })
          },
          scales: {
            y: {
              min: -0.2, max: 5.8,
              ticks: { stepSize: 1, color: textColor, font: { size: chartFontSize }, callback: function(v) { if (v < 0 || v > 5) return ''; var l = ['', '\u2014', '', '\u2B50', '', '\uD83D\uDCAA']; return l[v] || v; } },
              grid: { color: gridColor }
            },
            x: { ticks: { color: textColor, font: { size: chartFontSize }, maxRotation: 45, maxTicksLimit: chartTicksLimit }, grid: { display: false } }
          }
        }
      }));
    }
  }

  // ─── 4b. VOLUME TREND ───
  var volCanvas = document.getElementById('volumeChart');
  if (volCanvas) {
    var vSessions = sessions.filter(function(s) {
      return s.exercises && s.exercises.length > 0 && calcSessionVolume(s) > 0;
    }).slice(-15);
    if (vSessions.length >= 3) {
      var volLabels = vSessions.map(function(s) { var d = new Date(s.date); return d.getDate() + '/' + (d.getMonth() + 1); });
      var volData = vSessions.map(function(s) { return calcSessionVolume(s); });
      _chartInstances.push(new Chart(volCanvas, {
        type: 'bar',
        data: {
          labels: volLabels,
          datasets: [{
            label: 'Volume (kg)',
            data: volData,
            backgroundColor: 'rgba(39,174,96,0.5)',
            borderColor: '#8DC63F',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          aspectRatio: isMobile ? 1.3 : 2,
          plugins: {
            legend: { display: false },
            tooltip: Object.assign({}, defaultTooltip, {
              callbacks: { label: function(ctx) { return 'Volume: ' + ctx.parsed.y.toLocaleString() + ' kg'; } }
            })
          },
          scales: {
            x: { ticks: { color: textColor, font: { size: chartFontSize }, maxRotation: 45 }, grid: { display: false } },
            y: {
              beginAtZero: true,
              ticks: { color: textColor, font: { size: chartFontSize }, callback: function(v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v; } },
              grid: { color: gridColor },
              title: { display: true, text: 'Volume (kg)', color: textColor, font: { size: 11 } }
            }
          }
        }
      }));
    }
  }

  // ─── 5. WAIST/HIP TREND ───
  var whCanvas = document.getElementById('waistHipChart');
  if (whCanvas) {
    var measWH = measurements.filter(function(m) { return m.waist && m.hip; });
    if (measWH.length >= 2) {
      var whLabels = measWH.map(function(m) { var d = new Date(m.date); return d.getDate() + '/' + (d.getMonth() + 1); });
      var waistD = measWH.map(function(m) { return m.waist; });
      var hipD = measWH.map(function(m) { return m.hip; });

      _chartInstances.push(new Chart(whCanvas, {
        type: 'line',
        data: {
          labels: whLabels,
          datasets: [
            { label: 'Taille (cm)', data: waistD, borderColor: '#F47B20', backgroundColor: 'rgba(244,123,32,0.08)', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#F47B20', pointBorderColor: '#1A1030', pointBorderWidth: 2 },
            { label: 'Heup (cm)', data: hipD, borderColor: '#8E44AD', backgroundColor: 'rgba(142,68,173,0.08)', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#8E44AD', pointBorderColor: '#1A1030', pointBorderWidth: 2 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          aspectRatio: isMobile ? 1.3 : 2,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: true, position: 'bottom', labels: { color: textColor, padding: 12, usePointStyle: true, boxWidth: isMobile ? 8 : 12, font: { size: chartFontSize } } },
            tooltip: Object.assign({}, defaultTooltip, { callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y + ' cm'; } } })
          },
          scales: {
            y: { beginAtZero: false, ticks: { callback: function(v) { return v + ' cm'; }, color: textColor, font: { size: chartFontSize } }, grid: { color: gridColor } },
            x: { ticks: { color: textColor, font: { size: chartFontSize }, maxRotation: 45, maxTicksLimit: chartTicksLimit }, grid: { display: false } }
          }
        }
      }));
    }
  }
}

// ── EXPORT / IMPORT FUNCTIONS ──
// ── AGENDA / iCAL EXPORT ──
function exportCalendar() {
  var weekBEnabled = getStore('weekBEnabled', false);
  var lines = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Trainingsschema Lisanne//NL');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push('X-WR-CALNAME:Trainingsschema Lisanne');
  lines.push('X-WR-TIMEZONE:Europe/Amsterdam');

  // Generate 4 weeks of training events starting from next Monday
  var now = new Date();
  var startMonday = new Date(now);
  startMonday.setDate(startMonday.getDate() - ((startMonday.getDay() + 6) % 7) + 7);
  startMonday.setHours(0, 0, 0, 0);

  for (var w = 0; w < 4; w++) {
    var weekStart = new Date(startMonday);
    weekStart.setDate(weekStart.getDate() + (w * 7));
    var wkNum = getWeekNumber(weekStart);
    var weekType = weekBEnabled ? (wkNum % 2 === 0 ? 'A' : 'B') : 'A';
    var schedule = getSchedule(weekType);

    for (var d = 0; d < 7; d++) {
      var trainingKey = schedule[d];
      if (!trainingKey || trainingKey === 'rust') continue;

      var training = TRAINING_DATA[trainingKey];
      if (!training) continue;

      var eventDate = new Date(weekStart);
      eventDate.setDate(eventDate.getDate() + ((d === 0 ? 6 : d - 1)));
      // Map JS day (0=Sun) to Mon-start offset: Mo=0, Di=1, Wo=2, Do=3, Vr=4, Za=5, Zo=6
      eventDate = new Date(weekStart);
      eventDate.setDate(weekStart.getDate() + (d === 0 ? 6 : d - 1));

      var dateStr = icsDate(eventDate, 9, 0);
      var endStr = icsDate(eventDate, 10, 0);
      var summary = training.name + (weekType === 'B' ? ' (Week B)' : '');
      var desc = training.type === 'kracht'
        ? '3 sets per oefening, ±45 min'
        : training.options
          ? '±45 min - ' + training.options[0].name
          : '±35 min';

      lines.push('BEGIN:VEVENT');
      lines.push('DTSTART;TZID=Europe/Amsterdam:' + dateStr);
      lines.push('DTEND;TZID=Europe/Amsterdam:' + endStr);
      lines.push('SUMMARY:' + icsEscape(summary));
      lines.push('DESCRIPTION:' + icsEscape(desc));
      lines.push('LOCATION:Sportschool');
      lines.push('STATUS:CONFIRMED');
      lines.push('UID:training-' + icsDate(eventDate, 9, 0) + '-' + trainingKey + '@lisanne');
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-PT30M');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:Over 30 min: ' + icsEscape(summary));
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    }
  }

  // Add weekly weigh-in reminder (Saturday 07:15) for 8 weeks
  for (var ww = 0; ww < 8; ww++) {
    var satDate = new Date(startMonday);
    satDate.setDate(startMonday.getDate() + (ww * 7) + 5); // Saturday = Monday + 5
    lines.push('BEGIN:VEVENT');
    lines.push('DTSTART;TZID=Europe/Amsterdam:' + icsDate(satDate, 7, 15));
    lines.push('DTEND;TZID=Europe/Amsterdam:' + icsDate(satDate, 7, 30));
    lines.push('SUMMARY:' + icsEscape('\u2696\uFE0F Wegen'));
    lines.push('DESCRIPTION:' + icsEscape('Weeg jezelf: ochtend, na het plassen, voor ontbijt. Open de app en vul je gewicht in bij Voortgang.'));
    lines.push('STATUS:CONFIRMED');
    lines.push('UID:weigh-' + icsDate(satDate, 7, 15) + '@lisanne');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:PT0M');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:Tijd om je te wegen!');
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'trainingsschema-lisanne.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function icsDate(date, hours, minutes) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  var h = String(hours).padStart(2, '0');
  var min = String(minutes).padStart(2, '0');
  return y + m + d + 'T' + h + min + '00';
}

function icsEscape(str) {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function exportData() {
  var data = buildExportData();
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'lisanne-training-' + getTodayKey() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Track backup
  setStore('lastBackupDate', new Date().toISOString());
  setStore('lastBackupSessionCount', getStore('sessions', []).length);
}

function triggerImport() {
  document.getElementById('importFileInput').click();
}

function importData(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data.sessions || !Array.isArray(data.sessions)) {
        alert('Ongeldig bestand: geen trainingsdata gevonden.');
        return;
      }

      if (!confirm('Weet je zeker dat je wilt importeren? Dit vervangt je huidige data (' + getStore('sessions', []).length + ' trainingen).')) {
        return;
      }

      setStore('sessions', data.sessions);
      if (data.measurements) setStore('measurements', data.measurements);

      // Restore all lt_ keys
      if (data.weights) {
        Object.keys(data.weights).forEach(function(key) {
          localStorage.setItem(key, JSON.stringify(data.weights[key]));
        });
      }

      renderHistory();
      alert('Import gelukt! ' + data.sessions.length + ' trainingen geladen.');
    } catch(err) {
      alert('Fout bij importeren: ' + err.message);
    }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
}

// ── AUTO-BACKUP ──
function checkAutoBackup() {
  var sessions = getStore('sessions', []);
  if (sessions.length === 0) return;

  var lastBackup = getStore('lastBackupDate', '');
  var now = new Date();
  var todayKey = getTodayKey();

  // Auto-backup after every 5 sessions since last backup
  var lastBackupSessionCount = getStore('lastBackupSessionCount', 0);
  if (sessions.length - lastBackupSessionCount >= 5) {
    autoSaveBackup();
    return;
  }

  // Remind weekly if no backup in 7 days
  if (lastBackup) {
    var daysSinceBackup = Math.floor((now - new Date(lastBackup)) / 86400000);
    if (daysSinceBackup >= 7) {
      showBackupReminder();
    }
  } else if (sessions.length >= 3) {
    // First time, suggest backup after 3 sessions
    showBackupReminder();
  }
}

function autoSaveBackup() {
  try {
    var data = buildExportData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'trainingsdata-backup-' + getTodayKey() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStore('lastBackupDate', new Date().toISOString());
    setStore('lastBackupSessionCount', getStore('sessions', []).length);
  } catch(e) {}
}

function buildExportData() {
  var data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    sessions: getStore('sessions', []),
    measurements: getStore('measurements', []),
    settings: {}
  };
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.startsWith('lt_') && key !== 'lt_sessions' && key !== 'lt_measurements') {
      try { data.settings[key] = JSON.parse(localStorage.getItem(key)); } catch(e) {}
    }
  }
  return data;
}

function showBackupReminder() {
  var existing = document.getElementById('backupReminder');
  if (existing) return; // Don't show twice

  var div = document.createElement('div');
  div.id = 'backupReminder';
  div.className = 'backup-reminder';
  div.innerHTML = '<span>\uD83D\uDCBE Tijd voor een back-up van je trainingsdata!</span>' +
    '<div style="display:flex;gap:8px;margin-top:8px">' +
    '<button class="save-btn" onclick="exportData();dismissBackupReminder()" style="font-size:12px;padding:6px 12px">Nu exporteren</button>' +
    '<button onclick="dismissBackupReminder()" style="background:none;border:none;color:var(--text-light);font-size:12px;cursor:pointer">Later</button>' +
    '</div>';
  var content = document.getElementById('todayContent');
  if (content && content.firstChild) {
    content.insertBefore(div, content.firstChild);
  }
}

function dismissBackupReminder() {
  var el = document.getElementById('backupReminder');
  if (el) el.remove();
  setStore('lastBackupDate', new Date().toISOString());
}

// ── DARK MODE ──
function applyDarkMode() {
  var dark = getStore('darkMode', false);
  document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
  // Update theme-color meta tag
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#0F0A1E' : '#1A1030';
}

function toggleDarkMode() {
  var current = getStore('darkMode', false);
  setStore('darkMode', !current);
  applyDarkMode();
  renderHistory();
}

// ── HERINNERINGEN / NOTIFICATIES ──
function setupReminders() {
  var enabled = getStore('remindersEnabled', false);
  if (!enabled) return;
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    Notification.requestPermission();
    return;
  }
  if (Notification.permission !== 'granted') return;

  // Check if we already sent a reminder today
  var todayKey = getTodayKey();
  var lastReminder = getStore('lastReminderDate', '');
  if (lastReminder === todayKey) return;

  // Check if today is a training day
  var dayOfWeek = new Date().getDay();
  var weekType = getWeekType();
  var schedule = getSchedule(weekType);
  var trainingKey = schedule[dayOfWeek] || null;

  if (trainingKey) {
    var training = TRAINING_DATA[trainingKey];
    if (training) {
      // Schedule a notification after a short delay (so it feels like a reminder)
      setTimeout(function() {
        try {
          new Notification('Trainingsschema Lisanne', {
            body: 'Vandaag: ' + training.name + ' \u2014 Succes! \uD83D\uDCAA',
            icon: './manifest.json',
            tag: 'training-reminder'
          });
          setStore('lastReminderDate', todayKey);
        } catch(e) {}
      }, 2000);
    }
  }

  // ── WEEGHERINNERING ──
  var measurements = getStore('measurements', []);
  var lastMeasDate = measurements.length > 0 ? measurements[measurements.length - 1].date : null;
  var daysSinceWeigh = lastMeasDate ? Math.floor((new Date() - new Date(lastMeasDate)) / 86400000) : 999;
  var lastWeighReminder = getStore('lastWeighReminderDate', '');
  if (daysSinceWeigh >= 7 && lastWeighReminder !== todayKey) {
    setTimeout(function() {
      try {
        new Notification('Trainingsschema Lisanne', {
          body: daysSinceWeigh >= 14
            ? '\u2696\uFE0F Al ' + daysSinceWeigh + ' dagen niet gewogen \u2014 even op de weegschaal?'
            : '\u2696\uFE0F Tijd om jezelf te wegen! Ga naar Voortgang.',
          icon: './manifest.json',
          tag: 'weigh-reminder'
        });
        setStore('lastWeighReminderDate', todayKey);
      } catch(e) {}
    }, 4000);
  }
}

function toggleReminders() {
  var current = getStore('remindersEnabled', false);
  if (!current && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(function(perm) {
      if (perm === 'granted') {
        setStore('remindersEnabled', true);
        renderHistory();
      }
    });
  } else {
    setStore('remindersEnabled', !current);
    renderHistory();
  }
}

// ── IMAGE/VIDEO CACHING ──
function cacheAllVideos() {
  var urls = [];
  Object.keys(EXERCISE_DB).forEach(function(key) {
    var ex = EXERCISE_DB[key];
    if (ex.videoUrl) {
      urls.push(videoUrlToImageUrl(ex.videoUrl));
    }
  });

  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    alert('Service worker niet beschikbaar. Herlaad de app en probeer opnieuw.');
    return;
  }

  var btn = document.getElementById('cacheVideosBtn');
  if (btn) { btn.textContent = 'Bezig met downloaden...'; btn.disabled = true; }

  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_VIDEOS',
    urls: urls
  });
}

// Listen for video cache progress messages
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'VIDEO_CACHE_PROGRESS') {
      var el = document.getElementById('videoCacheProgress');
      var btn = document.getElementById('cacheVideosBtn');
      if (el) {
        var pct = Math.round((event.data.done / event.data.total) * 100);
        el.innerHTML = '<div style="background:var(--border);border-radius:6px;height:6px;margin-bottom:8px;overflow:hidden">' +
          '<div style="background:var(--success);height:100%;width:' + pct + '%;border-radius:6px;transition:width 0.3s"></div></div>' +
          '<div style="font-size:12px;color:var(--text-light)">' + event.data.done + ' / ' + event.data.total + ' video\'s</div>';
      }
      if (event.data.done >= event.data.total && btn) {
        btn.textContent = '\u2705 Alle video\'s opgeslagen!';
        btn.disabled = false;
      }
    }
  });
}

// ── PROGRESS HELPER FUNCTIONS ──
function calcStreak(sessions) {
  if (sessions.length === 0) return 0;
  // Count consecutive weeks that have at least 1 session
  var now = new Date();
  var streak = 0;
  for (var w = 0; w < 52; w++) {
    var weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7) - (w * 7));
    weekStart.setHours(0,0,0,0);
    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    var hasSession = sessions.some(function(s) {
      var d = new Date(s.date);
      return d >= weekStart && d < weekEnd;
    });
    if (hasSession) {
      streak++;
    } else if (w > 0) {
      break;
    }
  }
  return streak;
}

function countThisWeek(sessions) {
  var now = new Date();
  var monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0,0,0,0);
  var sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 7);
  return sessions.filter(function(s) { var d = new Date(s.date); return d >= monday && d < sunday; }).length;
}

function calcAvgEnergy(sessions) {
  var energySessions = sessions.filter(function(s) { return s.feedback && s.feedback.energy; });
  if (energySessions.length === 0) return 0;
  var sum = energySessions.reduce(function(t, s) { return t + s.feedback.energy; }, 0);
  return sum / energySessions.length;
}

function calcAvgEnergyPeriod(sessions) {
  var energySessions = sessions.filter(function(s) { return s.feedback && s.feedback.energy; });
  if (energySessions.length === 0) return 'geen data';
  if (energySessions.length <= 4) return energySessions.length + ' sessies';
  var first = new Date(energySessions[0].date);
  var last = new Date(energySessions[energySessions.length - 1].date);
  var weeks = Math.round((last - first) / (7 * 86400000));
  return weeks <= 1 ? energySessions.length + ' sessies' : weeks + ' weken';
}

function getWeekTrainingCount() {
  var dayOfWeek = new Date().getDay();
  var weekType = getWeekType();
  var schedule = getSchedule(weekType);
  var count = 0;
  for (var d = 0; d < 7; d++) {
    if (schedule[d] && schedule[d] !== 'rust') count++;
  }
  return count;
}

function calcSessionVolume(session) {
  if (!session.exercises) return 0;
  var vol = 0;
  session.exercises.forEach(function(ex) {
    if (ex.skipped) return;
    var w = ex.weight || 0;
    var r = ex.reps || 0;
    var s = ex.sets || 1;
    vol += w * r * s;
  });
  return Math.round(vol);
}

function buildExerciseHistory(sessions) {
  var history = {};
  sessions.forEach(function(s) {
    if (!s.exercises) return;
    s.exercises.forEach(function(ex) {
      if (ex.skipped) return;
      var exDef = getExercise(ex.id);
      var isBodyweight = exDef && (exDef.isBodyweight || exDef.isPlank);
      if (!isBodyweight && ex.weight <= 0) return;
      if (isBodyweight && (!ex.reps || ex.reps <= 0)) return;
      if (!history[ex.id]) history[ex.id] = [];
      history[ex.id].push({ date: s.date, weight: ex.weight || 0, reps: ex.reps || 0, isBodyweight: !!isBodyweight });
    });
  });
  return history;
}

function saveMeasurement() {
  var dateEl = document.getElementById('inputDate');
  var measureDate = (dateEl && dateEl.value) ? dateEl.value : getTodayKey();
  var weight = parseFloat(document.getElementById('inputWeight').value);
  var waist = parseFloat(document.getElementById('inputWaist').value) || null;
  var hip = parseFloat(document.getElementById('inputHip').value) || null;
  var goal = parseFloat(document.getElementById('inputGoal').value) || null;
  if (!weight || weight < 30 || weight > 300) return;

  if (goal && goal > 0) setStore('weightGoal', goal);

  var measurements = getStore('measurements', []);
  var existing = measurements.findIndex(function(m) { return m.date === measureDate; });
  if (existing >= 0) {
    measurements[existing] = { date: measureDate, weight: weight, waist: waist, hip: hip };
  } else {
    measurements.push({ date: measureDate, weight: weight, waist: waist, hip: hip });
    measurements.sort(function(a, b) { return a.date.localeCompare(b.date); });
  }
  setStore('measurements', measurements);

  document.getElementById('inputWeight').value = '';
  document.getElementById('inputWaist').value = '';
  document.getElementById('inputHip').value = '';
  renderHistory();
}

// ── METINGEN BEHEER ──
function toggleMetingenLijst(btn) {
  var list = btn.parentElement.querySelector('.metingen-lijst');
  if (list.style.display === 'none') {
    list.style.display = 'block';
    btn.textContent = btn.textContent.replace('\u25BC', '\u25B2');
  } else {
    list.style.display = 'none';
    btn.textContent = btn.textContent.replace('\u25B2', '\u25BC');
  }
}

function editMeasurement(idx) {
  var measurements = getStore('measurements', []);
  var m = measurements[idx];
  if (!m) return;

  var newWeight = prompt('Gewicht (kg):', m.weight);
  if (newWeight === null) return;
  newWeight = parseFloat(newWeight);
  if (!newWeight || newWeight < 30 || newWeight > 300) { alert('Ongeldig gewicht.'); return; }

  var newWaist = prompt('Tailleomtrek (cm) — laat leeg om over te slaan:', m.waist || '');
  var newHip = prompt('Heupomtrek (cm) — laat leeg om over te slaan:', m.hip || '');

  measurements[idx].weight = newWeight;
  measurements[idx].waist = newWaist ? (parseFloat(newWaist) || null) : null;
  measurements[idx].hip = newHip ? (parseFloat(newHip) || null) : null;

  setStore('measurements', measurements);
  renderHistory();
}

function deleteMeasurement(idx) {
  var measurements = getStore('measurements', []);
  var m = measurements[idx];
  if (!m) return;
  var d = new Date(m.date);

  if (!confirm('Meting van ' + formatDateNL(d) + ' verwijderen?\n(' + m.weight + ' kg)')) return;

  measurements.splice(idx, 1);
  setStore('measurements', measurements);
  renderHistory();
}

// ── SESSIES BEHEER ──
function toggleSessionDetail(idx) {
  var el = document.getElementById('sessionDetail-' + idx);
  if (!el) return;
  var isVisible = el.style.display !== 'none';
  el.style.display = isVisible ? 'none' : 'block';
}

function updateSessionWeight(sessionIdx, exerciseIdx, newWeight) {
  var sessions = getStore('sessions', []);
  if (!sessions[sessionIdx] || !sessions[sessionIdx].exercises || !sessions[sessionIdx].exercises[exerciseIdx]) return;
  var val = parseFloat(newWeight);
  if (isNaN(val) || val < 0) return;
  sessions[sessionIdx].exercises[exerciseIdx].weight = val;
  setStore('sessions', sessions);
}

function updateSessionSetWeight(sessionIdx, exerciseIdx, setIdx, newWeight) {
  var sessions = getStore('sessions', []);
  var ex = sessions[sessionIdx] && sessions[sessionIdx].exercises && sessions[sessionIdx].exercises[exerciseIdx];
  if (!ex || !ex.sets || !ex.sets[setIdx]) return;
  var val = parseFloat(newWeight);
  if (isNaN(val) || val < 0) return;
  ex.sets[setIdx].weight = val;
  var maxW = Math.max.apply(null, ex.sets.map(function(s) { return s.weight || 0; }));
  ex.weight = maxW;
  setStore('sessions', sessions);
}

function updateSessionSetReps(sessionIdx, exerciseIdx, setIdx, newReps) {
  var sessions = getStore('sessions', []);
  var ex = sessions[sessionIdx] && sessions[sessionIdx].exercises && sessions[sessionIdx].exercises[exerciseIdx];
  if (!ex || !ex.sets || !ex.sets[setIdx]) return;
  var val = parseInt(newReps);
  if (isNaN(val) || val < 0) return;
  ex.sets[setIdx].reps = val;
  var maxR = Math.max.apply(null, ex.sets.map(function(s) { return s.reps || 0; }));
  ex.reps = maxR;
  setStore('sessions', sessions);
}

function deleteSession(idx) {
  var sessions = getStore('sessions', []);
  var s = sessions[idx];
  if (!s) return;
  var d = new Date(s.date);

  if (!confirm('Training van ' + formatDateNL(d) + ' verwijderen?\n(' + (s.name || s.type) + ')')) return;

  sessions.splice(idx, 1);
  setStore('sessions', sessions);
  renderHistory();
}

function confirmResetAllData() {
  if (!confirm('Weet je ZEKER dat je alle data wilt wissen?\n\nAlle trainingen, metingen en instellingen worden verwijderd.\nDit kan NIET ongedaan worden gemaakt!')) return;
  if (!confirm('Laatste kans: echt ALLES verwijderen?')) return;

  // Verwijder alle lt_ keys uit localStorage
  var keysToRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.startsWith('lt_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(function(k) {
    localStorage.removeItem(k);
  });

  // Wis ook de cloud data in Firebase — wacht tot het klaar is vóór reload
  if (typeof firebaseDb !== 'undefined' && firebaseDb && typeof getSyncUid === 'function') {
    var uid = getSyncUid();
    if (uid) {
      firebaseDb.collection('users').doc(uid).delete().then(function() {
        // console.log('[Reset] Cloud data verwijderd');
        alert('Alle data is gewist (lokaal + cloud). De app wordt herladen.');
        location.reload();
      }).catch(function(err) {
        // console.log('[Reset] Cloud data wissen mislukt:', err.message);
        alert('Lokale data gewist. Cloud data wissen mislukt: ' + err.message + '\nDe app wordt herladen.');
        location.reload();
      });
      return; // Wacht op Firebase response
    }
  }

  // Fallback als Firebase niet beschikbaar is
  alert('Alle data is gewist. De app wordt herladen.');
  location.reload();
}

function toggleWeekGroup(weekKey) {
  var content = document.getElementById('weekContent-' + weekKey);
  var toggle = document.getElementById('weekToggle-' + weekKey);
  if (!content || !toggle) return;

  var isHidden = content.style.display === 'none';
  content.style.display = isHidden ? 'block' : 'none';
  toggle.textContent = isHidden ? '▼' : '▶';
}

function toggleShowAllWeeks() {
  setStore('showAllWeeks', true);
  renderHistory();
}

function getWeightMessage(measurements, goal) {
  if (measurements.length < 2) {
    return '<div style="font-size:13px;color:var(--text-light);text-align:center;padding:4px 0">Na je volgende weging kan ik je voortgang laten zien.</div>';
  }

  var latest = measurements[measurements.length - 1].weight;
  var prev = measurements[measurements.length - 2].weight;
  var first = measurements[0].weight;
  var diff = latest - prev;
  var totalDiff = latest - first;

  // Check for plateau (last 3+ measurements roughly the same)
  var isPlat = false;
  if (measurements.length >= 3) {
    var last3 = measurements.slice(-3).map(function(m) { return m.weight; });
    var range = Math.max.apply(null, last3) - Math.min.apply(null, last3);
    isPlat = range < 0.5;
  }

  var msg = '';
  if (latest <= goal) {
    // Goal reached!
    msg = '<div style="font-size:14px;color:var(--success);text-align:center;font-weight:600;padding:4px 0">\uD83C\uDF89 Je hebt je streefgewicht bereikt! Wat een prestatie!</div>';
  } else if (diff < -0.3) {
    // Losing weight
    msg = '<div style="font-size:13px;color:var(--success);text-align:center;padding:4px 0">\u2B07\uFE0F Je bent op de goede weg! ' + Math.abs(diff).toFixed(1) + ' kg eraf sinds vorige meting.</div>';
  } else if (diff > 0.5) {
    // Gaining weight
    msg = '<div style="font-size:13px;color:var(--text-light);text-align:center;padding:4px 0;line-height:1.5">';
    msg += 'Je gewicht is iets gestegen. Dat kan normaal zijn \u2014 door spiermassa, vochtbalans, of gewoon een zwaardere maaltijd. ';
    msg += 'Kijk naar de trend over weken, niet naar \u00e9\u00e9n meting. Blijf lekker bezig!</div>';
  } else if (isPlat) {
    // Plateau
    msg = '<div style="font-size:13px;color:var(--text-light);text-align:center;padding:4px 0;line-height:1.5">';
    msg += 'Je gewicht is stabiel. Plateaus zijn normaal en horen bij het proces \u2014 je lichaam past zich aan. ';
    msg += 'Als je blijft trainen en gezond eet, gaat het vanzelf weer bewegen. Vertrouw het proces!</div>';
  } else {
    // Stable / minor change
    msg = '<div style="font-size:13px;color:var(--text-light);text-align:center;padding:4px 0">Stabiel \u2014 goed bezig! Consistentie is het belangrijkste.</div>';
  }

  // If overall trend is good, add encouragement
  if (totalDiff < -1 && latest > goal) {
    msg += '<div style="font-size:12px;color:var(--success);text-align:center;margin-top:4px">In totaal al ' + Math.abs(totalDiff).toFixed(1) + ' kg kwijt \uD83D\uDCAA</div>';
  }

  return msg;
}

// ================================================================
// AGENDA / PLANNING
// ================================================================
var DAY_ABBR = ['zo','ma','di','wo','do','vr','za'];

function renderAgenda() {
  var container = document.getElementById('agendaContent');
  var now = new Date();
  var todayStr = getTodayKey();
  var sessions = getStore('sessions', []);
  var sessionDates = {};
  sessions.forEach(function(s) { sessionDates[s.date] = s; });

  // Legend
  var html = '<div class="agenda-legend">';
  html += '<div class="agenda-legend-item"><div class="agenda-legend-dot" style="background:var(--primary)"></div>Kracht</div>';
  html += '<div class="agenda-legend-item"><div class="agenda-legend-dot" style="background:var(--accent)"></div>Cardio</div>';
  html += '<div class="agenda-legend-item"><div class="agenda-legend-dot" style="background:var(--neutral-bg)"></div>Fietsen</div>';
  html += '<div class="agenda-legend-item"><div class="agenda-legend-dot" style="background:transparent;border:2px solid var(--border)"></div>Rust</div>';
  html += '</div>';

  // Show 5 weeks: previous week + this week + 3 ahead
  for (var w = -1; w < 4; w++) {
    var weekStart = getMonday(now, w);
    var weekNum = getWeekNumber(weekStart);
    var weekBEnabled = getStore('weekBEnabled', false);
    var weekType = (weekBEnabled && weekNum % 2 !== 0) ? 'B' : 'A';
    var isCurrentWeek = w === 0;

    html += '<div class="agenda-week"' + (isCurrentWeek ? ' id="agendaCurrentWeek"' : '') + '>';
    html += '<div class="agenda-week-header">';
    html += '<span>Week ' + weekNum + (w === -1 ? ' (vorige week)' : '') + '</span>';
    html += '<span class="agenda-week-badge ' + (isCurrentWeek ? 'current' : '') + '">Week ' + weekType + (isCurrentWeek ? ' (deze week)' : w === -1 ? ' (vorige)' : '') + '</span>';
    html += '</div>';
    html += '<div class="agenda-days">';

    var schedule = getSchedule(weekType);

    for (var d = 0; d < 7; d++) {
      var dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + d);
      var dayOfWeek = dayDate.getDay();
      var dayKey = dayDate.getFullYear() + '-' + String(dayDate.getMonth()+1).padStart(2,'0') + '-' + String(dayDate.getDate()).padStart(2,'0');

      var isToday = dayKey === todayStr;
      var isPast = dayDate < now && !isToday;
      var isDone = !!sessionDates[dayKey];

      var trainingKey = schedule[dayOfWeek];
      var isCycling = !trainingKey && [1,4].includes(dayOfWeek);

      var dotClass = 'agenda-dot-rust';
      var title = 'Rustdag';
      var subtitle = '';

      if (trainingKey) {
        var training = TRAINING_DATA[trainingKey];
        title = training.name;
        if (training.type === 'kracht') {
          dotClass = 'agenda-dot-kracht';
          subtitle = '3 sets per oefening \u00b7 \u00b145 min';
        } else {
          dotClass = 'agenda-dot-cardio';
          var minTotal = training.options ? training.options[0].totalMin || 45 : 45;
          subtitle = '\u00b1' + minTotal + ' min';
        }
      } else if (isCycling) {
        dotClass = 'agenda-dot-fiets';
        title = 'Fietsen';
        subtitle = '\u00b18 km naar school en terug';
      } else {
        subtitle = 'Hersteldag';
      }

      var isClickable = !!trainingKey;
      var clickAttr = '';
      if (isClickable) {
        var dayLabel = formatDateNL(dayDate);
        clickAttr = ' onclick="openDayPreview(\'' + trainingKey + '\',\'' + dayKey + '\',\'' + dayLabel.replace(/'/g, "\\'") + '\')"';
      }

      html += '<div class="agenda-day' + (isToday ? ' today' : '') + (isPast && !isToday ? ' past' : '') + (isClickable ? ' clickable' : '') + '"' + clickAttr + '>';
      html += '<div class="agenda-day-name">';
      html += '<div class="day-abbr">' + DAY_ABBR[dayOfWeek] + '</div>';
      html += '<div class="day-num">' + dayDate.getDate() + '</div>';
      html += '</div>';
      html += '<div class="agenda-day-dot ' + dotClass + '"></div>';
      html += '<div class="agenda-day-info">';
      html += '<div class="agenda-day-title">' + title + '</div>';
      html += '<div class="agenda-day-sub">' + subtitle + '</div>';
      html += '</div>';
      if (isDone) {
        html += '<div class="agenda-day-done">\u2713</div>';
      } else if (isPast && isClickable) {
        html += '<div style="font-size:11px;color:var(--accent);font-weight:600;white-space:nowrap">Inhalen \u203A</div>';
      } else if (isClickable) {
        html += '<div class="agenda-day-arrow">\u203A</div>';
      }
      html += '</div>';
    }

    html += '</div></div>';
  }

  container.innerHTML = html;

  // Auto-scroll to current week
  setTimeout(function() {
    var cw = document.getElementById('agendaCurrentWeek');
    if (cw) cw.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, 50);
}

// ================================================================
// DAY PREVIEW (from agenda)
// ================================================================
function openDayPreview(trainingKey, dateStr, dayLabel) {
  var training = TRAINING_DATA[trainingKey];
  if (!training) return;

  var overlay = document.getElementById('dayPreviewOverlay');
  var body = document.getElementById('dpBody');
  var title = document.getElementById('dpTitle');

  title.textContent = dayLabel;

  if (training.type === 'kracht') {
    renderKrachtPreview(body, training, trainingKey, dateStr);
  } else {
    renderCardioPreview(body, training, trainingKey);
  }

  overlay.classList.add('active');
  document.getElementById('bottomNav').style.display = 'none';
  document.body.style.overflow = 'hidden';
  initVideoObserver();
}

function closeDayPreview() {
  document.getElementById('dayPreviewOverlay').classList.remove('active');
  document.getElementById('bottomNav').style.display = 'flex';
  document.body.style.overflow = '';
}

function renderKrachtPreview(container, training, trainingKey, dateStr) {
  var isMissed = false;
  var isFuture = false;
  if (dateStr) {
    var previewDate = new Date(dateStr);
    var today = new Date();
    today.setHours(0,0,0,0);
    previewDate.setHours(0,0,0,0);
    if (previewDate < today) {
      var sessions = getStore('sessions', []);
      var wasDone = sessions.some(function(s) {
        var sDate = new Date(s.date);
        sDate.setHours(0,0,0,0);
        return s.trainingKey === trainingKey && sDate.getTime() === previewDate.getTime();
      });
      if (!wasDone) {
        var daysAgo = Math.floor((today - previewDate) / 86400000);
        if (daysAgo <= 7) isMissed = true;
      }
    } else if (previewDate > today) {
      isFuture = true;
    }
  }

  var html = '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83C\uDFCB</span><div>';
  html += '<div style="font-size:20px;font-weight:700;color:var(--primary)">' + training.name + '</div>';
  html += '<div style="font-size:13px;color:var(--text-light)">3 sets per oefening \u00b7 \u00b145 min</div>';
  html += '</div></div>';

  if (isMissed) {
    html += '<div style="padding:14px 18px;background:var(--info-bg);border-bottom:1px solid var(--border)">';
    html += '<div style="font-size:13px;color:var(--text-light);margin-bottom:10px">\u26A0\uFE0F Deze training is niet gedaan. Wil je hem nu alsnog doen?</div>';
    html += '<button onclick="catchUpFromPreview(\'' + trainingKey + '\')" style="width:100%;padding:14px;border-radius:50px;border:none;background:linear-gradient(135deg,#7B3FA0,#B794D6);color:white;font-size:16px;font-weight:700;cursor:pointer;box-shadow:var(--glow-primary)">';
    html += '\uD83D\uDCAA Nu doen</button>';
    html += '</div>';
  } else if (isFuture) {
    html += '<div style="padding:14px 18px;background:var(--info-bg);border-bottom:1px solid var(--border)">';
    html += '<div style="font-size:13px;color:var(--text-light);margin-bottom:10px">\u23E9 Training staat gepland voor deze dag. Wil je hem vandaag alvast doen?</div>';
    html += '<button onclick="catchUpFromPreview(\'' + trainingKey + '\')" style="width:100%;padding:14px;border-radius:50px;border:none;background:linear-gradient(135deg,#7B3FA0,#B794D6);color:white;font-size:16px;font-weight:700;cursor:pointer;box-shadow:var(--glow-primary)">';
    html += '\uD83D\uDCAA Nu alvast doen</button>';
    html += '</div>';
  }

  // Warmup
  html += '<div class="phase-block"><div class="phase-icon">\uD83D\uDD25</div>';
  html += '<div class="phase-text"><strong>Warming-up:</strong> ' + training.warmup.apparaat + ' ' + training.warmup.duur + ' \u2014 ' + training.warmup.detail + '</div></div>';

  // Exercise list (phase-aware)
  var previewExercises = getTrainingExercises(trainingKey);
  previewExercises.forEach(function(exId) {
    var ex = getExercise(exId);
    if (!ex) return;
    var prevWeight = getLastWeight(exId);
    var progression = getProgressionSuggestion(exId);

    html += '<div class="exercise-item"><div class="ex-top">';
    html += '<div class="ex-info">';
    html += '<div class="ex-name">' + ex.name + '</div>';
    html += '<div class="ex-detail">' + ex.apparaat + ' \u00b7 ' + ex.reps;
    if (prevWeight > 0 && !progression) html += ' \u00b7 Vorige: ' + prevWeight + ' ' + getWeightUnit(exId);
    html += '</div>';
    if (progression) {
      var pColor = progression.ready ? 'var(--success)' : 'var(--text-light)';
      html += '<div style="font-size:12px;color:' + pColor + ';margin-top:3px">' + progression.message + '</div>';
    }
    html += '</div>';
    html += '<div class="ex-expand" onclick="togglePreviewInstruction(\'' + exId + '\')">\u2139\uFE0F</div>';
    html += '</div>';

    if (ex.instruction) {
      html += '<div class="ex-extra" id="preview-instr-' + exId + '">';
      html += renderVideoHtml(ex);
      html += '<div class="instruction-panel">';
      html += '<div class="instr-goal">' + ex.instruction.goal + '</div>';
      html += '<ol class="instr-steps">';
      ex.instruction.steps.forEach(function(s) { html += '<li>' + s + '</li>'; });
      html += '</ol>';
      html += '<div class="instr-focus">' + ex.instruction.focus + '</div>';
      html += '<div class="instr-mistake">' + ex.instruction.mistake + '</div>';
      html += '</div></div>';
    }

    html += '</div>';
  });

  // Cooldown
  html += '<div class="phase-block"><div class="phase-icon">\u2744\uFE0F</div>';
  html += '<div class="phase-text"><strong>Cooldown:</strong> ' + training.cooldown;
  if (training.cooldownStretches && training.cooldownStretches.length > 0) {
    html += '<div style="margin-top:8px">';
    training.cooldownStretches.forEach(function(sid, idx) {
      var s = getStretchById(sid);
      if (!s) return;
      html += '<div style="font-size:13px;color:var(--text);padding:6px 0;border-top:' + (idx === 0 ? 'none' : '1px solid var(--border)') + '">';
      html += '<div style="display:flex;align-items:center;gap:6px">';
      html += '<span style="font-weight:700;color:var(--primary);min-width:18px">' + (idx + 1) + '.</span>';
      html += '<span style="flex:1">' + s.name + ' <span style="color:var(--text-light)">(' + s.duur + 's' + (s.perKant ? '/kant' : '') + ')</span></span>';
      html += '<span style="cursor:pointer;font-size:16px" onclick="togglePreviewInstruction(\'stretch-' + sid + '\')">\u2139\uFE0F</span>';
      html += '</div>';
      html += '<div class="ex-extra" id="preview-instr-stretch-' + sid + '">';
      html += '<div style="padding:8px 0 4px 24px">';
      if (s.videoUrl) html += '<video src="' + s.videoUrl + '" autoplay loop muted playsinline style="width:100%;max-width:200px;border-radius:8px;margin-bottom:6px"></video>';
      html += '<p style="font-size:12px;color:var(--text-light);line-height:1.5;margin:0">' + s.instruction + '</p>';
      if (s.focus) html += '<p style="font-size:12px;color:var(--success);line-height:1.4;margin:4px 0 0">\u2714\uFE0F ' + s.focus + '</p>';
      html += '</div></div>';
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div></div>';
  html += '</div>';

  container.innerHTML = html;
}

function renderCardioPreview(container, training, trainingKey) {
  var html = '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCA8</span><div>';
  html += '<div style="font-size:20px;font-weight:700;color:var(--primary)">' + training.name + '</div>';
  html += '<div style="font-size:13px;color:var(--text-light)">' + (trainingKey === 'inclineWandelen' ? 'Kies je duur' : 'Kies je apparaat') + '</div>';
  html += '</div></div>';

  training.options.forEach(function(opt, i) {
    var totalMin = opt.phases.reduce(function(t, p) { return t + p.duur; }, 0);
    html += '<div class="exercise-item">';
    html += '<div class="ex-top">';
    html += '<div class="ex-info"><div class="ex-name">' + opt.name + '</div>';
    html += '<div class="ex-detail">' + totalMin + ' min \u00b7 ';
    html += opt.phases.map(function(p) { return p.name; }).join(' \u2192 ');
    html += '</div>';

    // Show phase details
    html += '<div style="margin-top:8px">';
    opt.phases.forEach(function(p) {
      html += '<div style="font-size:12px;color:var(--text-light);padding:2px 0">';
      html += '<strong style="color:var(--text)">' + p.name + '</strong> (' + p.duur + ' min): ' + p.detail;
      html += '</div>';
    });
    html += '</div>';

    html += '</div>';
    html += '</div></div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

function togglePreviewInstruction(exId) {
  var el = document.getElementById('preview-instr-' + exId);
  if (el) {
    el.classList.toggle('show');
    initVideoObserver();
  }
}

function getMonday(refDate, weeksAhead) {
  var d = new Date(refDate);
  d.setHours(0,0,0,0);
  var day = d.getDay();
  // Go to Monday of current week (Monday = 1)
  var diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  // Add weeks
  d.setDate(d.getDate() + (weeksAhead * 7));
  return d;
}

// ================================================================
// NAVIGATION
// ================================================================
function showPage(pageId, btn) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');

  // Scroll to top on page switch
  window.scrollTo(0, 0);

  if (pageId === 'pageHistory') renderHistory();
  if (pageId === 'pageProfile') renderProfile();
  if (pageId === 'pageAgenda') renderAgenda();
  if (pageId === 'pageTrain') renderToday();
}

function closeBanner() {
  document.getElementById('welcomeBanner').classList.remove('show');
}

// ================================================================
// ONBOARDING
// ================================================================
var onboardingStep = 0;

function showOnboarding() {
  var overlay = document.createElement('div');
  overlay.id = 'onboardingOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:20px';
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  onboardingStep = 0;
  renderOnboardingStep();
}

function renderOnboardingStep() {
  var overlay = document.getElementById('onboardingOverlay');
  if (!overlay) return;

  var steps = [
    {
      emoji: '\uD83C\uDFCB\uFE0F\u200D\u2640\uFE0F',
      title: 'Welkom Lisanne!',
      text: 'Dit is jouw persoonlijke trainingsapp. Speciaal voor jou gemaakt, met oefeningen, video\u2019s en progressie die bij jou passen.',
      btn: 'Hoe werkt het?'
    },
    {
      emoji: '\uD83D\uDCC5',
      title: 'Jouw weekschema',
      text: 'Je traint 4 dagen per week met een vast schema:',
      sub: '<div style="text-align:left;line-height:2;font-size:14px">\uD83D\uDD35 <b>Dinsdag</b> \u2014 Loopband wandelen (35 min)<br>\uD83D\uDD35 <b>Woensdag</b> \u2014 Kracht: onderlichaam<br>\uD83D\uDD35 <b>Zaterdag</b> \u2014 Kracht: bovenlichaam<br>\uD83D\uDFE0 <b>Zondag</b> \u2014 Cardio variatie (45 min)</div>',
      btn: 'Volgende'
    },
    {
      emoji: '\uD83D\uDCAA',
      title: 'Progressie',
      text: 'Bij krachttraining houdt de app bij wat je vorige keer deed. Je bouwt langzaam op:',
      sub: '<div style="text-align:left;font-size:13px;line-height:1.8">1\uFE0F\u20E3 Begin op 3\u00d78 herhalingen<br>2\uFE0F\u20E3 Verhoog naar 3\u00d710, dan 3\u00d712<br>3\uFE0F\u20E3 Lukt 3\u00d712 twee keer? Gewicht omhoog!<br><br>De app vertelt je precies wanneer.</div>',
      btn: 'Volgende'
    },
    {
      emoji: '\uD83D\uDCCA',
      title: 'Voortgang bijhouden',
      text: 'Weeg jezelf 1x per week (zaterdag voor ontbijt). De app toont je trend, krachtprogressie en energielevel in mooie grafieken.',
      sub: 'Geen stress over dagelijkse schommelingen \u2014 het gaat om de trend.',
      btn: 'Volgende'
    },
    {
      emoji: '\uD83C\uDFAF',
      title: getStore('onboardingDone', false) ? 'Dat was het!' : 'Laten we beginnen!',
      text: getStore('onboardingDone', false)
        ? 'Je bent helemaal klaar. Ga lekker trainen!'
        : 'Vul hieronder je startgewicht en streefgewicht in. Je kunt dit later altijd aanpassen bij Voortgang.',
      form: !getStore('onboardingDone', false),
      btn: getStore('onboardingDone', false) ? 'Sluiten' : 'Start!'
    }
  ];

  var s = steps[onboardingStep];
  var dots = '';
  for (var i = 0; i < steps.length; i++) {
    dots += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 4px;background:' + (i === onboardingStep ? 'var(--primary)' : 'var(--border)') + '"></span>';
  }

  var html = '<div style="max-width:360px;text-align:center">';
  html += '<div style="font-size:64px;margin-bottom:16px">' + s.emoji + '</div>';
  html += '<h2 style="font-size:24px;font-weight:700;color:var(--text);margin:0 0 12px">' + s.title + '</h2>';
  html += '<p style="font-size:15px;color:var(--text);line-height:1.6;margin:0 0 8px">' + s.text + '</p>';

  if (s.sub) {
    html += '<p style="font-size:13px;color:var(--text-light);line-height:1.5;margin:0 0 20px">' + s.sub + '</p>';
  }

  if (s.form) {
    html += '<div style="text-align:left;margin:16px 0 20px">';
    html += '<div style="margin-bottom:12px"><label style="font-size:13px;font-weight:600;color:var(--text);display:block;margin-bottom:4px">Huidig gewicht (kg)</label>';
    html += '<input type="number" step="0.1" id="onboardWeight" placeholder="bv. 75" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:10px;font-size:16px;background:var(--card);color:var(--text);box-sizing:border-box"></div>';
    html += '<div><label style="font-size:13px;font-weight:600;color:var(--text);display:block;margin-bottom:4px">Streefgewicht (kg)</label>';
    html += '<input type="number" step="0.5" id="onboardGoal" value="70" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:10px;font-size:16px;background:var(--card);color:var(--text);box-sizing:border-box"></div>';
    html += '</div>';
  }

  html += '<div style="margin:8px 0 20px">' + dots + '</div>';
  html += '<button onclick="nextOnboardingStep()" style="width:100%;padding:14px;background:var(--primary);color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer">' + s.btn + '</button>';

  if (onboardingStep > 0) {
    html += '<button onclick="prevOnboardingStep()" style="width:100%;padding:10px;background:none;color:var(--text-light);border:none;font-size:14px;cursor:pointer;margin-top:8px">Terug</button>';
  }

  html += '</div>';
  overlay.innerHTML = html;
}

function nextOnboardingStep() {
  if (onboardingStep === 4) {
    // Save initial measurement if provided
    var weightEl = document.getElementById('onboardWeight');
    var goalEl = document.getElementById('onboardGoal');
    var weight = weightEl ? parseFloat(weightEl.value) : 0;
    var goal = goalEl ? parseFloat(goalEl.value) : 70;

    if (weight && weight >= 30 && weight <= 300) {
      var measurements = getStore('measurements', []);
      measurements.push({ date: getTodayKey(), weight: weight, waist: null, hip: null });
      setStore('measurements', measurements);
    }
    if (goal && goal > 0) {
      setStore('weightGoal', goal);
    }

    // Mark onboarding as done
    setStore('onboardingDone', true);

    // Remove overlay and start app
    var overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
    renderToday();
    return;
  }
  onboardingStep++;
  renderOnboardingStep();
}

function prevOnboardingStep() {
  if (onboardingStep > 0) {
    onboardingStep--;
    renderOnboardingStep();
  }
}

// ================================================================
// INIT
// ================================================================
applyDarkMode();
if (!getStore('onboardingDone', false)) {
  showOnboarding();
} else {
  renderToday();
}
setupReminders();
setTimeout(checkAutoBackup, 3000); // Check after app loaded

// ================================================================
// STORAGE HELPERS
// ================================================================
function getStore(key, def) {
  try { var v = localStorage.getItem('lt_' + key); return v ? JSON.parse(v) : def; }
  catch(e) { return def; }
}
function setStore(key, val) {
  localStorage.setItem('lt_' + key, JSON.stringify(val));
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
  return getWeekNumber(new Date()) % 2 === 0 ? 'A' : 'B';
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
// VIDEO HELPER
// ================================================================
function renderVideoHtml(ex) {
  if (!ex.videoUrl) return '';
  return '<div class="exercise-video-container"><video class="exercise-video" src="' + ex.videoUrl + '" autoplay loop muted playsinline></video></div>';
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

function getProgressionSuggestion(exerciseId) {
  var hist = getExerciseHistory(exerciseId);
  if (hist.length < 3) return null;
  var last3 = hist.slice(0, 3);
  // All 3 sessions same weight and all reps completed
  if (last3[0].weight > 0 && last3.every(function(h) { return h.weight === last3[0].weight; })) {
    var currentWeight = last3[0].weight;
    // Suggest small increment
    var increment = currentWeight < 10 ? 1 : 2.5;
    return {
      ready: true,
      current: currentWeight,
      suggested: currentWeight + increment,
      message: 'Probeer ' + (currentWeight + increment) + ' kg'
    };
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

// Re-acquire wake lock when page becomes visible again
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && trainingModeActive) {
    requestWakeLock();
  }
});

// ================================================================
// TRAINING MODE STATE
// ================================================================
var trainingModeActive = false;
var currentTraining = null;
var currentExerciseIndex = 0;
var currentRound = 1;
var totalRounds = 3;
var tmTimerInterval = null;
var tmTimerSeconds = 0;
var tmState = 'idle'; // idle, set, resting
var sessionExerciseLog = {};

function startTrainingMode(trainingKey) {
  currentTraining = TRAINING_DATA[trainingKey];
  if (!currentTraining || currentTraining.type !== 'kracht') return;

  trainingModeActive = true;
  currentExerciseIndex = 0;
  currentRound = 1;
  sessionExerciseLog = {};
  tmState = 'idle';

  requestWakeLock();
  document.getElementById('trainingMode').classList.add('active');
  document.getElementById('bottomNav').style.display = 'none';
  renderTrainingStep();
}

function exitTrainingMode(save) {
  trainingModeActive = false;
  clearInterval(tmTimerInterval);
  releaseWakeLock();
  document.getElementById('trainingMode').classList.remove('active');
  document.getElementById('bottomNav').style.display = 'flex';

  if (save) {
    saveFinalSession();
    renderCompletionInTrainingMode();
  } else {
    renderToday();
  }
}

function getCurrentExercise() {
  var ids = currentTraining.exerciseIds;
  if (currentExerciseIndex >= ids.length) return null;
  return getExercise(ids[currentExerciseIndex]);
}

function renderTrainingStep() {
  var body = document.getElementById('tmBody');
  var ex = getCurrentExercise();

  if (!ex) {
    // All exercises done for this round
    if (currentRound < totalRounds) {
      currentRound++;
      currentExerciseIndex = 0;
      renderTrainingStep();
      return;
    }
    // All rounds done
    exitTrainingMode(true);
    return;
  }

  updateProgressBar();

  var exId = ex.id;
  var prevWeight = getLastWeight(exId);
  var progression = getProgressionSuggestion(exId);
  var logKey = exId + '_r' + currentRound;

  if (tmState === 'resting') {
    renderRestScreen(ex);
    return;
  }

  // Show exercise screen
  var html = '';
  html += '<div class="tm-round-info">Ronde ' + currentRound + ' van ' + totalRounds + '</div>';
  html += '<div class="tm-exercise-name">' + ex.name + '</div>';
  html += '<div class="tm-exercise-detail">' + ex.apparaat + ' \u00b7 ' + ex.reps + '</div>';

  if (prevWeight > 0) {
    html += '<div class="tm-prev-weight">Vorige: ' + prevWeight + ' kg</div>';
  }
  if (progression && progression.ready) {
    html += '<div class="tm-suggestion">\uD83D\uDCAA ' + progression.message + '</div>';
  }

  if (!ex.isPlank) {
    var defaultWeight = (sessionExerciseLog[logKey] && sessionExerciseLog[logKey].weight) || prevWeight || '';
    var defaultReps = (sessionExerciseLog[logKey] && sessionExerciseLog[logKey].reps) || ex.defaultReps || '';
    html += '<div class="tm-inputs">';
    html += '<div class="tm-input-group"><label>Gewicht (kg)</label>';
    html += '<input class="tm-input" type="number" step="0.5" id="tmWeight" value="' + defaultWeight + '"></div>';
    html += '<div class="tm-input-group"><label>Herhalingen</label>';
    html += '<input class="tm-input" type="number" id="tmReps" value="' + defaultReps + '"></div>';
    html += '</div>';
  } else {
    html += '<div style="margin-bottom:16px;font-size:16px;color:var(--text-light)">Houd ' + ex.reps + ' vol</div>';
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

  html += '<button class="tm-btn tm-btn-success" onclick="completeSet()">Set voltooid \u2714</button>';
  html += '<button class="tm-btn tm-btn-outline tm-btn-small" onclick="skipExercise()">Overslaan</button>';

  body.innerHTML = html;
  document.getElementById('tmHeader').querySelector('h2').textContent = currentTraining.name;
}

function toggleTmInstruction() {
  var box = document.getElementById('tmInstructionBox');
  if (box) box.classList.toggle('show');
}

function completeSet() {
  var ex = getCurrentExercise();
  if (!ex) return;

  var logKey = ex.id + '_r' + currentRound;

  if (!ex.isPlank) {
    var w = parseFloat(document.getElementById('tmWeight').value) || 0;
    var r = parseInt(document.getElementById('tmReps').value) || ex.defaultReps;
    sessionExerciseLog[logKey] = { id: ex.id, weight: w, reps: r, done: true };
  } else {
    sessionExerciseLog[logKey] = { id: ex.id, weight: 0, reps: 0, done: true };
  }

  // Start rest timer
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
  html += '<button class="tm-btn tm-btn-outline" style="max-width:150px" onclick="addRestTime(30)">+30 sec</button>';
  html += '</div>';

  body.innerHTML = html;
}

function getNextExercisePreview() {
  var ids = currentTraining.exerciseIds;
  var nextIdx = currentExerciseIndex + 1;
  var nextRound = currentRound;

  if (nextIdx >= ids.length) {
    nextIdx = 0;
    nextRound = currentRound + 1;
  }

  if (nextRound > totalRounds) return null;

  var nextEx = getExercise(ids[nextIdx]);
  if (!nextEx) return null;
  return nextEx.name + ' (ronde ' + nextRound + ')';
}

function startRestTimer() {
  clearInterval(tmTimerInterval);
  tmTimerInterval = setInterval(function() {
    tmTimerSeconds--;
    var display = document.getElementById('tmTimerDisplay');
    if (display) display.textContent = formatTimer(tmTimerSeconds);

    if (tmTimerSeconds <= 0) {
      clearInterval(tmTimerInterval);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      skipRest();
    }
  }, 1000);
}

function skipRest() {
  clearInterval(tmTimerInterval);
  tmState = 'idle';
  currentExerciseIndex++;

  var ids = currentTraining.exerciseIds;
  if (currentExerciseIndex >= ids.length) {
    if (currentRound < totalRounds) {
      currentRound++;
      currentExerciseIndex = 0;
    } else {
      exitTrainingMode(true);
      return;
    }
  }

  renderTrainingStep();
}

function addRestTime(secs) {
  tmTimerSeconds += secs;
  var display = document.getElementById('tmTimerDisplay');
  if (display) display.textContent = formatTimer(tmTimerSeconds);
}

function skipExercise() {
  tmState = 'idle';
  currentExerciseIndex++;
  var ids = currentTraining.exerciseIds;
  if (currentExerciseIndex >= ids.length) {
    if (currentRound < totalRounds) {
      currentRound++;
      currentExerciseIndex = 0;
    } else {
      exitTrainingMode(true);
      return;
    }
  }
  renderTrainingStep();
}

function updateProgressBar() {
  var totalExercises = currentTraining.exerciseIds.length * totalRounds;
  var done = ((currentRound - 1) * currentTraining.exerciseIds.length) + currentExerciseIndex;
  var pct = Math.round((done / totalExercises) * 100);
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

  var body = document.getElementById('tmBody');
  var header = document.getElementById('tmHeader').querySelector('h2');
  header.textContent = 'Voltooid!';

  // Calculate stats
  var exerciseCount = 0;
  var maxWeight = 0;
  var totalSets = 0;
  Object.keys(sessionExerciseLog).forEach(function(key) {
    var entry = sessionExerciseLog[key];
    if (entry.done) {
      totalSets++;
      if (entry.weight > maxWeight) maxWeight = entry.weight;
    }
  });
  exerciseCount = currentTraining.exerciseIds.length;

  var html = '<div class="completion-screen">';
  html += '<div class="emoji">\uD83C\uDF89</div>';
  html += '<h2>Training voltooid!</h2>';
  html += '<p style="color:var(--text-light);margin-bottom:20px">Lekker bezig, Lisanne!</p>';
  html += '<div class="completion-stats">';
  html += '<div class="completion-stat"><span class="completion-stat-label">Training</span><span class="completion-stat-value">' + currentTraining.name + '</span></div>';
  html += '<div class="completion-stat"><span class="completion-stat-label">Oefeningen</span><span class="completion-stat-value">' + exerciseCount + '</span></div>';
  html += '<div class="completion-stat"><span class="completion-stat-label">Sets voltooid</span><span class="completion-stat-value">' + totalSets + '</span></div>';
  if (maxWeight > 0) {
    html += '<div class="completion-stat"><span class="completion-stat-label">Zwaarste gewicht</span><span class="completion-stat-value">' + maxWeight + ' kg</span></div>';
  }
  html += '<div class="completion-stat"><span class="completion-stat-label">Datum</span><span class="completion-stat-value">' + formatDateNL(new Date()) + '</span></div>';
  html += '</div>';
  html += '<button class="tm-btn tm-btn-primary" style="margin-top:24px" onclick="closeCompletionScreen()">Sluiten</button>';
  html += '</div>';

  body.innerHTML = html;
}

function closeCompletionScreen() {
  document.getElementById('trainingMode').classList.remove('active');
  document.getElementById('bottomNav').style.display = 'flex';
  renderToday();
}

function saveFinalSession() {
  var todayKey = getTodayKey();
  var sessions = getStore('sessions', []);
  if (sessions.find(function(s) { return s.date === todayKey; })) return;

  var exerciseMap = {};
  Object.keys(sessionExerciseLog).forEach(function(key) {
    var val = sessionExerciseLog[key];
    if (!val.done) return;
    var baseId = val.id;
    if (!exerciseMap[baseId]) exerciseMap[baseId] = { id: baseId, weights: [], reps: [] };
    if (val.weight > 0) exerciseMap[baseId].weights.push(val.weight);
    if (val.reps > 0) exerciseMap[baseId].reps.push(val.reps);
  });

  var exerciseLog = [];
  Object.keys(exerciseMap).forEach(function(key) {
    var ex = exerciseMap[key];
    exerciseLog.push({
      id: ex.id,
      weight: ex.weights.length > 0 ? Math.max.apply(null, ex.weights) : 0,
      reps: ex.reps.length > 0 ? Math.max.apply(null, ex.reps) : 0,
    });
  });

  sessions.push({
    date: todayKey,
    type: 'kracht',
    name: currentTraining.name,
    exercises: exerciseLog,
  });
  setStore('sessions', sessions);
}

// ================================================================
// CARDIO TIMER MODE
// ================================================================
var cardioTimerActive = false;
var cardioPhases = [];
var cardioPhaseIndex = 0;
var cardioPhaseSeconds = 0;
var cardioTimerInterval = null;
var cardioIntervalMode = 'normal'; // normal, fast
var cardioIntervalConfig = null;
var cardioTrainingName = '';

function startCardioTimer(trainingKey, optionIndex) {
  var training = TRAINING_DATA[trainingKey];
  var opt = training.options[optionIndex];
  cardioPhases = opt.phases;
  cardioIntervalConfig = opt.interval || null;
  cardioPhaseIndex = 0;
  cardioPhaseSeconds = opt.phases[0].duur * 60;
  cardioIntervalMode = 'normal';
  cardioTimerActive = true;
  cardioTrainingName = training.name + ' \u2014 ' + opt.name;

  requestWakeLock();
  document.getElementById('trainingMode').classList.add('active');
  document.getElementById('bottomNav').style.display = 'none';
  renderCardioTimerStep();
  startCardioCountdown();
}

function renderCardioTimerStep() {
  var phase = cardioPhases[cardioPhaseIndex];
  var body = document.getElementById('tmBody');
  var header = document.getElementById('tmHeader').querySelector('h2');
  header.textContent = cardioTrainingName;

  updateCardioProgressBar();

  var html = '';
  html += '<div class="ct-phase-display">' + phase.name + '</div>';
  html += '<div class="ct-detail">' + phase.detail + '</div>';

  // Interval badge
  if (cardioIntervalConfig && phase.intensity === 'medium') {
    if (cardioIntervalMode === 'fast') {
      html += '<div class="ct-interval-badge ct-interval-fast">Sneller tempo!</div>';
    } else {
      html += '<div class="ct-interval-badge ct-interval-normal">Normaal tempo</div>';
    }
  }

  html += '<div class="tm-timer" id="cardioTimerDisplay">' + formatTimer(cardioPhaseSeconds) + '</div>';

  // Next phase preview
  if (cardioPhaseIndex < cardioPhases.length - 1) {
    html += '<div class="ct-next-phase">Hierna: ' + cardioPhases[cardioPhaseIndex + 1].name + '</div>';
  }

  html += '<div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">';
  if (cardioPhaseIndex < cardioPhases.length - 1) {
    html += '<button class="tm-btn tm-btn-accent" style="max-width:180px" onclick="skipCardioPhase()">Volgende fase</button>';
  }
  if (cardioIntervalConfig && phase.intensity === 'medium') {
    html += '<button class="tm-btn tm-btn-outline" style="max-width:180px" onclick="toggleCardioInterval()">';
    html += cardioIntervalMode === 'normal' ? 'Start interval' : 'Terug normaal';
    html += '</button>';
  }
  html += '</div>';
  html += '<button class="tm-btn tm-btn-outline tm-btn-small" style="margin-top:12px" onclick="stopCardioTimer()">Training stoppen</button>';

  body.innerHTML = html;
}

function startCardioCountdown() {
  clearInterval(cardioTimerInterval);
  cardioTimerInterval = setInterval(function() {
    cardioPhaseSeconds--;
    var display = document.getElementById('cardioTimerDisplay');
    if (display) display.textContent = formatTimer(cardioPhaseSeconds);

    if (cardioPhaseSeconds <= 0) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      advanceCardioPhase();
    }
  }, 1000);
}

function advanceCardioPhase() {
  cardioPhaseIndex++;
  if (cardioPhaseIndex >= cardioPhases.length) {
    completeCardioSession();
    return;
  }
  cardioPhaseSeconds = cardioPhases[cardioPhaseIndex].duur * 60;
  cardioIntervalMode = 'normal';
  renderCardioTimerStep();
}

function skipCardioPhase() {
  advanceCardioPhase();
}

function toggleCardioInterval() {
  cardioIntervalMode = cardioIntervalMode === 'normal' ? 'fast' : 'normal';
  renderCardioTimerStep();
}

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
  if (!sessions.find(function(s) { return s.date === todayKey; })) {
    sessions.push({ date: todayKey, type: 'cardio', name: cardioTrainingName });
    setStore('sessions', sessions);
  }

  // Show completion
  var body = document.getElementById('tmBody');
  var totalMin = cardioPhases.reduce(function(t, p) { return t + p.duur; }, 0);

  var html = '<div class="completion-screen">';
  html += '<div class="emoji">\uD83C\uDF89</div>';
  html += '<h2>Cardio voltooid!</h2>';
  html += '<p style="color:var(--text-light);margin-bottom:20px">Lekker bezig!</p>';
  html += '<div class="completion-stats">';
  html += '<div class="completion-stat"><span class="completion-stat-label">Training</span><span class="completion-stat-value">' + cardioTrainingName + '</span></div>';
  html += '<div class="completion-stat"><span class="completion-stat-label">Totale duur</span><span class="completion-stat-value">' + totalMin + ' min</span></div>';
  html += '<div class="completion-stat"><span class="completion-stat-label">Datum</span><span class="completion-stat-value">' + formatDateNL(new Date()) + '</span></div>';
  html += '</div>';
  html += '<button class="tm-btn tm-btn-primary" style="margin-top:24px" onclick="closeCompletionScreen()">Sluiten</button>';
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
  renderToday();
}

// ================================================================
// TODAY PAGE RENDERING
// ================================================================
function renderToday() {
  var now = new Date();
  var weekType = getWeekType();
  var dayOfWeek = now.getDay();
  var schedule = getSchedule(weekType);
  var todayKey = getTodayKey();

  document.getElementById('weekBadge').textContent = 'Week ' + weekType;
  document.getElementById('topbarDate').textContent = formatDateNL(now);

  var daysSince = daysSinceLastTraining();
  if (daysSince >= 14 && daysSince < 999) {
    document.getElementById('welcomeBanner').classList.add('show');
  }

  var content = document.getElementById('todayContent');
  var trainingKey = schedule[dayOfWeek];

  if (!trainingKey) {
    renderRestDay(content, dayOfWeek);
    return;
  }

  var training = TRAINING_DATA[trainingKey];
  if (training.type === 'kracht') {
    renderKrachtOverview(content, training, trainingKey, todayKey);
  } else {
    renderCardioOverview(content, training, trainingKey);
  }
}

function renderRestDay(container, dayOfWeek) {
  var isCycling = [1,2,4].includes(dayOfWeek);
  var html = '<div class="card"><div class="rest-day-msg">';
  html += '<div class="emoji">' + (isCycling ? '\uD83D\uDEB4' : '\uD83D\uDE0C') + '</div>';
  html += '<h2>' + (isCycling ? 'Fietsdag' : 'Rustdag') + '</h2>';
  html += '<p>' + (isCycling
    ? 'Vandaag fiets je naar school en terug \u2014 dat is al \u00b130 min cardio.'
    : 'Rust is onderdeel van de training. Je lichaam herstelt en wordt sterker.'
  ) + '</p></div></div>';
  html += '<button class="vrije-training-btn" onclick="openVrijeTraining()">Toch zin om te trainen?</button>';
  container.innerHTML = html;
}

function renderKrachtOverview(container, training, trainingKey, todayKey) {
  var daysSince = daysSinceLastTraining();

  var html = '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83C\uDFCB</span><div>';
  html += '<div style="font-size:20px;font-weight:700;color:var(--primary)">' + training.name + '</div>';
  html += '<div style="font-size:13px;color:var(--text-light)">3 rondes \u00b7 \u00b145 min</div>';
  html += '</div></div>';

  // Warmup
  html += '<div class="phase-block"><div class="phase-icon">\uD83D\uDD25</div>';
  html += '<div class="phase-text"><strong>Warming-up:</strong> ' + training.warmup.apparaat + ' ' + training.warmup.duur + ' \u2014 ' + training.warmup.detail + '</div></div>';

  // Exercise preview list
  training.exerciseIds.forEach(function(exId) {
    var ex = getExercise(exId);
    if (!ex) return;
    var prevWeight = getLastWeight(exId);
    var progression = getProgressionSuggestion(exId);

    html += '<div class="exercise-item"><div class="ex-top">';
    html += '<div class="ex-info">';
    html += '<div class="ex-name">' + ex.name + '</div>';
    html += '<div class="ex-detail">' + ex.apparaat + ' \u00b7 ' + ex.reps;
    if (prevWeight > 0) html += ' \u00b7 Vorige: ' + prevWeight + ' kg';
    html += '</div>';
    if (progression && progression.ready) {
      html += '<div style="font-size:12px;color:var(--success);margin-top:3px">\uD83D\uDCAA ' + progression.message + '</div>';
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

  // Cooldown
  html += '<div class="phase-block"><div class="phase-icon">\u2744\uFE0F</div>';
  html += '<div class="phase-text"><strong>Cooldown:</strong> ' + training.cooldown + '</div></div>';
  html += '</div>';

  // Ease-back hint
  if (daysSince >= 14 && daysSince < 999) {
    html += '<div class="ease-back-hint show">Het is even geleden \u2014 begin gerust iets lichter dan vorige keer.</div>';
  }

  // Start button
  html += '<button class="start-training-btn" onclick="startTrainingMode(\'' + trainingKey + '\')">Training starten \u25B6</button>';

  container.innerHTML = html;
}

function toggleOverviewInstruction(exId) {
  var el = document.getElementById('overview-instr-' + exId);
  if (el) el.classList.toggle('show');
}

function renderCardioOverview(container, training, trainingKey) {
  var html = '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCA8</span><div>';
  html += '<div style="font-size:20px;font-weight:700;color:var(--primary)">' + training.name + '</div>';
  html += '<div style="font-size:13px;color:var(--text-light)">Kies je apparaat</div>';
  html += '</div></div>';

  training.options.forEach(function(opt, i) {
    var totalMin = opt.phases.reduce(function(t, p) { return t + p.duur; }, 0);
    html += '<div class="exercise-item" style="cursor:pointer" onclick="startCardioTimer(\'' + trainingKey + '\',' + i + ')">';
    html += '<div class="ex-top">';
    html += '<div class="ex-info"><div class="ex-name">' + opt.name + '</div>';
    html += '<div class="ex-detail">' + totalMin + ' min \u00b7 ';
    html += opt.phases.map(function(p) { return p.name; }).join(' \u2192 ');
    html += '</div></div>';
    html += '<div class="ex-expand">\u25B6</div>';
    html += '</div></div>';
  });

  html += '</div>';
  container.innerHTML = html;
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
    { key: 'krachtOnder', name: 'Kracht: onderlichaam', desc: 'Leg extension, leg curl, chest press, plank' },
    { key: 'cardioVariatie', name: 'Cardio variatie (45 min)', desc: 'Crosstrainer, hometrainer of buiten fietsen' },
    { key: 'cardioLicht', name: 'Lichte cardio (30 min)', desc: 'Loopband, crosstrainer of hometrainer' },
  ];

  var html = '';
  options.forEach(function(opt) {
    var warning = '';
    if (tomorrowTraining && TRAINING_DATA[tomorrowTraining] && TRAINING_DATA[tomorrowTraining].type === 'kracht' &&
        (opt.key === 'krachtBoven' || opt.key === 'krachtOnder')) {
      warning = '<div class="opt-warn">\u26A0 Morgen staat krachttraining gepland \u2014 lichte cardio is misschien slimmer</div>';
    }
    if (yesterdayTraining && TRAINING_DATA[yesterdayTraining] && TRAINING_DATA[yesterdayTraining].type === 'kracht' &&
        (opt.key === 'krachtBoven' || opt.key === 'krachtOnder')) {
      warning = '<div class="opt-warn">\u26A0 Gisteren was krachttraining \u2014 een rustdag ertussen is beter</div>';
    }

    html += '<div class="modal-option ' + (warning ? 'warning' : '') + '" onclick="selectVrijeTraining(\'' + opt.key + '\')">';
    html += '<div class="opt-title">' + opt.name + '</div>';
    html += '<div class="opt-desc">' + opt.desc + '</div>';
    html += warning + '</div>';
  });

  opts.innerHTML = html;
  modal.classList.add('show');
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
}

// ================================================================
// HISTORY
// ================================================================
function renderHistory() {
  var sessions = getStore('sessions', []);
  var list = document.getElementById('historyList');

  if (sessions.length === 0) {
    list.innerHTML = '<div class="history-empty"><div class="emoji">\uD83D\uDCDD</div><p>Nog geen trainingen.<br>Na je eerste training verschijnt hier je geschiedenis.</p></div>';
  } else {
    var html = '';
    sessions.slice().reverse().forEach(function(s) {
      var d = new Date(s.date);
      var stats = '';
      if (s.exercises) {
        var weights = s.exercises.filter(function(e) { return e.weight > 0; }).map(function(e) { return e.weight; });
        var maxW = weights.length > 0 ? Math.max.apply(null, weights) : 0;
        if (maxW > 0) stats = 'Zwaarste gewicht: ' + maxW + ' kg';
      }
      html += '<div class="history-item">';
      html += '<div class="history-date">' + formatDateNL(d) + '</div>';
      html += '<div class="history-type">' + (s.name || s.type) + '</div>';
      if (stats) html += '<div class="history-stats">' + stats + '</div>';
      html += '</div>';
    });
    list.innerHTML = html;
  }

  // Measurements
  var measurements = getStore('measurements', []);
  var mList = document.getElementById('measurementsList');
  if (measurements.length > 0) {
    var mHtml = '';
    measurements.slice().reverse().forEach(function(m) {
      var d = new Date(m.date);
      mHtml += '<div class="history-item">';
      mHtml += '<div class="history-date">' + formatDateNL(d) + '</div>';
      mHtml += '<div class="history-stats">Gewicht: ' + m.weight + ' kg';
      if (m.waist) mHtml += ' \u00b7 Taille: ' + m.waist + ' cm';
      mHtml += '</div></div>';
    });
    mList.innerHTML = mHtml;
  } else {
    mList.innerHTML = '<div style="padding:14px 18px;color:var(--text-light);font-size:13px">Nog geen metingen.</div>';
  }
}

function saveMeasurement() {
  var weight = parseFloat(document.getElementById('inputWeight').value);
  var waist = parseFloat(document.getElementById('inputWaist').value) || null;
  if (!weight) return;

  var measurements = getStore('measurements', []);
  measurements.push({ date: getTodayKey(), weight: weight, waist: waist });
  setStore('measurements', measurements);

  document.getElementById('inputWeight').value = '';
  document.getElementById('inputWaist').value = '';
  renderHistory();
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
  html += '<div class="agenda-legend-item"><div class="agenda-legend-dot" style="background:#BDC3C7"></div>Fietsen</div>';
  html += '<div class="agenda-legend-item"><div class="agenda-legend-dot" style="background:transparent;border:2px solid var(--border)"></div>Rust</div>';
  html += '</div>';

  // Show 4 weeks: this week + 3 ahead
  for (var w = 0; w < 4; w++) {
    var weekStart = getMonday(now, w);
    var weekNum = getWeekNumber(weekStart);
    var weekType = weekNum % 2 === 0 ? 'A' : 'B';
    var isCurrentWeek = w === 0;

    html += '<div class="agenda-week">';
    html += '<div class="agenda-week-header">';
    html += '<span>Week ' + weekNum + '</span>';
    html += '<span class="agenda-week-badge ' + (isCurrentWeek ? 'current' : '') + '">Week ' + weekType + (isCurrentWeek ? ' (deze week)' : '') + '</span>';
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
      var isCycling = [1,2,4].includes(dayOfWeek);

      var dotClass = 'agenda-dot-rust';
      var title = 'Rustdag';
      var subtitle = '';

      if (trainingKey) {
        var training = TRAINING_DATA[trainingKey];
        title = training.name;
        if (training.type === 'kracht') {
          dotClass = 'agenda-dot-kracht';
          subtitle = '3 rondes \u00b7 \u00b145 min';
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
      } else if (isClickable) {
        html += '<div class="agenda-day-arrow">\u203A</div>';
      }
      html += '</div>';
    }

    html += '</div></div>';
  }

  container.innerHTML = html;
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
    renderKrachtPreview(body, training, trainingKey);
  } else {
    renderCardioPreview(body, training, trainingKey);
  }

  overlay.classList.add('active');
  document.getElementById('bottomNav').style.display = 'none';
}

function closeDayPreview() {
  document.getElementById('dayPreviewOverlay').classList.remove('active');
  document.getElementById('bottomNav').style.display = 'flex';
}

function renderKrachtPreview(container, training, trainingKey) {
  var html = '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83C\uDFCB</span><div>';
  html += '<div style="font-size:20px;font-weight:700;color:var(--primary)">' + training.name + '</div>';
  html += '<div style="font-size:13px;color:var(--text-light)">3 rondes \u00b7 \u00b145 min</div>';
  html += '</div></div>';

  // Warmup
  html += '<div class="phase-block"><div class="phase-icon">\uD83D\uDD25</div>';
  html += '<div class="phase-text"><strong>Warming-up:</strong> ' + training.warmup.apparaat + ' ' + training.warmup.duur + ' \u2014 ' + training.warmup.detail + '</div></div>';

  // Exercise list
  training.exerciseIds.forEach(function(exId) {
    var ex = getExercise(exId);
    if (!ex) return;
    var prevWeight = getLastWeight(exId);
    var progression = getProgressionSuggestion(exId);

    html += '<div class="exercise-item"><div class="ex-top">';
    html += '<div class="ex-info">';
    html += '<div class="ex-name">' + ex.name + '</div>';
    html += '<div class="ex-detail">' + ex.apparaat + ' \u00b7 ' + ex.reps;
    if (prevWeight > 0) html += ' \u00b7 Vorige: ' + prevWeight + ' kg';
    html += '</div>';
    if (progression && progression.ready) {
      html += '<div style="font-size:12px;color:var(--success);margin-top:3px">\uD83D\uDCAA ' + progression.message + '</div>';
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
  html += '<div class="phase-text"><strong>Cooldown:</strong> ' + training.cooldown + '</div></div>';
  html += '</div>';

  container.innerHTML = html;
}

function renderCardioPreview(container, training, trainingKey) {
  var html = '<div class="card">';
  html += '<div class="card-header"><span class="icon">\uD83D\uDCA8</span><div>';
  html += '<div style="font-size:20px;font-weight:700;color:var(--primary)">' + training.name + '</div>';
  html += '<div style="font-size:13px;color:var(--text-light)">Kies je apparaat</div>';
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
  if (el) el.classList.toggle('show');
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

  if (pageId === 'pageHistory') renderHistory();
  if (pageId === 'pageAgenda') renderAgenda();
  if (pageId === 'pageTrain') renderToday();
}

function closeBanner() {
  document.getElementById('welcomeBanner').classList.remove('show');
}

// ================================================================
// INIT
// ================================================================
renderToday();

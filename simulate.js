// ============================================
// SIMULATIE: 10 weken trainingsdata voor Lisanne
// Open de app in de browser en plak dit in de console (F12)
// OF open simulate.js rechtstreeks via: javascript:void(0)
// ============================================

(function() {
  var startDate = new Date('2025-12-29'); // Week 1 begint maandag 29 dec
  var sessions = [];
  var measurements = [];

  // Startgewicht en progressie
  var weight = 75.0;
  var waist = 85;
  var hip = 102;
  var weightGoal = 70;

  // Oefening-gewichten (begingewichten) — IDs uit EXERCISE_DB / data.js
  var exerciseWeights = {
    'chest-press': 10,
    'incline-press': 8,
    'shoulder-press': 8,
    'dumbbell-row': 6,
    'leg-ext': 15,
    'leg-curl': 15,
    // Phase 2 (komen later erbij)
    'lat-pulldown': 20,
    'cable-row': 18,
    'leg-press': 30,
    'side-plank': 0
  };

  // Welke oefeningen per type (match PHASE_CONFIG uit data.js)
  var krachtBoven = ['chest-press', 'incline-press', 'shoulder-press', 'dumbbell-row'];
  var krachtOnder = ['leg-curl', 'leg-ext', 'chest-press', 'shoulder-press'];
  // Phase 2 uitbreiding
  var krachtBovenP2 = ['chest-press', 'incline-press', 'shoulder-press', 'dumbbell-row', 'lat-pulldown'];
  var krachtOnderP2 = ['leg-curl', 'leg-ext', 'leg-press', 'cable-row', 'shoulder-press'];

  function dateStr(d) {
    return d.toISOString().split('T')[0];
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randFloat(min, max) {
    return Math.round((min + Math.random() * (max - min)) * 10) / 10;
  }

  // Simuleer 10 weken
  for (var week = 0; week < 10; week++) {
    var weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (week * 7));
    var weekType = week % 2 === 0 ? 'A' : 'B';
    var isPhase2 = week >= 6; // Fase 2 na 6 weken

    // Realistische motivatie: soms slaat ze een dag over
    var motivation = rand(60, 100);
    var calfPain = week < 3 ? rand(1, 3) : (week < 6 ? rand(0, 2) : rand(0, 1));

    // Welke oefeningen deze week
    var bovenExercises = isPhase2 ? krachtBovenP2 : krachtBoven;
    var onderExercises = isPhase2 ? krachtOnderP2 : krachtOnder;

    // === ZONDAG: Cardio variatie ===
    var sun = new Date(weekStart);
    sun.setDate(sun.getDate() - 1);
    if (week > 0 && motivation > 40) {
      sessions.push({
        date: dateStr(sun),
        type: 'cardio',
        name: 'Cardio variatie',
        duration: rand(30, 45),
        feedback: {
          energy: rand(3, 5),
          calfPain: Math.max(0, calfPain - 1),
          note: ['Lekker rustig gewandeld', 'Voelde goed vandaag', 'Beetje moe maar gedaan!', 'Fijn tempo gehouden', 'Crosstrainer vandaag, ging lekker'][rand(0, 4)]
        }
      });
    }

    // === DINSDAG: Loopband wandelen ===
    var tue = new Date(weekStart);
    tue.setDate(tue.getDate() + 1);
    if (motivation > 30) {
      sessions.push({
        date: dateStr(tue),
        type: 'cardio',
        name: 'Loopband wandelen',
        duration: rand(30, 38),
        feedback: {
          energy: rand(3, 5),
          calfPain: calfPain,
          note: ['Rustig wandeltempo', 'Goed vol kunnen houden', 'Lekker gewandeld', ''][rand(0, 3)]
        }
      });
    }

    // === WOENSDAG: Kracht onderlichaam ===
    var wed = new Date(weekStart);
    wed.setDate(wed.getDate() + 2);
    if (motivation > 25) {
      var exData = [];
      onderExercises.forEach(function(exId) {
        var w = exerciseWeights[exId] || 10;
        // Progressie: soms lukt het, soms niet
        if (rand(1, 100) > 55 && week > 1) {
          w += 2.5;
          exerciseWeights[exId] = w;
        }
        exData.push({
          id: exId,
          weight: w,
          reps: '3x' + rand(8, 12),
          difficulty: rand(2, 4)
        });
      });

      sessions.push({
        date: dateStr(wed),
        type: 'kracht',
        name: 'Kracht: onderlichaam',
        duration: rand(40, 55),
        exercises: exData,
        feedback: {
          energy: rand(3, 5),
          calfPain: calfPain,
          note: week < 3 ? 'Nog even wennen aan de oefeningen' : ['Goed getraind!', 'Sterk gevoel vandaag', 'Laatste sets waren pittig', 'Gewichten verhoogd!', 'Leg press voelde zwaar'][rand(0, 4)]
        }
      });
    }

    // === ZATERDAG: Kracht bovenlichaam ===
    var sat = new Date(weekStart);
    sat.setDate(sat.getDate() + 5);
    if (motivation > 20) {
      var exDataBoven = [];
      bovenExercises.forEach(function(exId) {
        var w = exerciseWeights[exId] || 8;
        if (rand(1, 100) > 50 && week > 1) {
          w += 2.5;
          exerciseWeights[exId] = w;
        }
        exDataBoven.push({
          id: exId,
          weight: w,
          reps: '3x' + rand(8, 12),
          difficulty: rand(2, 4)
        });
      });

      sessions.push({
        date: dateStr(sat),
        type: 'kracht',
        name: 'Kracht: bovenlichaam',
        duration: rand(40, 55),
        exercises: exDataBoven,
        feedback: {
          energy: rand(3, 5),
          calfPain: 0,
          note: ['Fijn getraind', 'Armen voelen het!', 'Goede sessie', 'Makkelijker dan vorige week', 'Shoulder press gaat beter'][rand(0, 4)]
        }
      });
    }

    // === VRIJDAG Week B: Cardio licht (alleen na week 4) ===
    if (weekType === 'B' && week >= 4 && motivation > 50) {
      var fri = new Date(weekStart);
      fri.setDate(fri.getDate() + 4);
      sessions.push({
        date: dateStr(fri),
        type: 'cardio',
        name: 'Lichte cardio',
        duration: rand(25, 35),
        feedback: {
          energy: rand(3, 4),
          calfPain: 0,
          note: 'Rustig bijgedaan op vrijdag'
        }
      });
    }

    // === METING (wekelijks op maandag) ===
    if (week > 0) {
      var weeklyLoss = randFloat(0, 0.6);
      if (week === 4 || week === 7) weeklyLoss = randFloat(-0.2, 0.2); // plateau weken
      if (week === 3) weeklyLoss = randFloat(0.5, 0.8); // goede week
      weight = Math.round((weight - weeklyLoss) * 10) / 10;
      weight = Math.max(weight, 71.5);
    }

    // Taille en heup: langzaam afnemen (elke 4 weken)
    if (week > 0 && week % 4 === 0) {
      waist = Math.round((waist - randFloat(0.5, 1.5)) * 10) / 10;
      hip = Math.round((hip - randFloat(0.3, 1.0)) * 10) / 10;
    }

    measurements.push({
      date: dateStr(weekStart),
      weight: weight,
      waist: (week === 0 || week % 4 === 0) ? waist : null,
      hip: (week === 0 || week % 4 === 0) ? hip : null
    });
  }

  // Sorteer sessies op datum
  sessions.sort(function(a, b) { return a.date.localeCompare(b.date); });

  // Sla alles op in localStorage
  localStorage.setItem('lt_sessions', JSON.stringify(sessions));
  localStorage.setItem('lt_measurements', JSON.stringify(measurements));
  localStorage.setItem('lt_weightGoal', JSON.stringify(weightGoal));
  localStorage.setItem('lt_onboardingDone', JSON.stringify(true));
  localStorage.setItem('lt_startDate', JSON.stringify('2025-12-29'));
  localStorage.setItem('lt_weekBEnabled', JSON.stringify(true));

  // Sync naar Firebase als beschikbaar
  if (typeof fullSyncToCloud === 'function') {
    setTimeout(function() {
      fullSyncToCloud();
      console.log('[Simulatie] Data gesynchroniseerd naar Firebase');
    }, 2000);
  }

  console.log('[Simulatie] 10 weken data gegenereerd:');
  console.log('- ' + sessions.length + ' trainingen');
  console.log('- ' + measurements.length + ' metingen');
  console.log('- Startgewicht: 75 kg → Huidig: ' + weight + ' kg');
  console.log('- Taille: 85 → ' + waist + ' cm');
  console.log('- Heup: 102 → ' + hip + ' cm');

  alert('Simulatie klaar! ' + sessions.length + ' trainingen en ' + measurements.length + ' metingen geladen.\n\nGewicht: 75 → ' + weight + ' kg\n\nDe data wordt nu naar Firebase gestuurd.\nHerlaad de pagina om alles te zien.');

  location.reload();
})();

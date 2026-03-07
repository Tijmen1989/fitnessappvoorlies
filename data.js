// ================================================================
// TRAINING DATA MODEL - Alle trainingsdata op één plek
// ================================================================

const EXERCISE_DB = {
  'chest-press': {
    id: 'chest-press',
    name: 'Chest press',
    apparaat: 'Multipress \u2013 liggend',
    reps: '8\u201312',
    defaultReps: 8,
    rest: 90,
    tip: 'Langzaam omhoog duwen, niet de armen volledig strekken',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-Machine-machine-chest-press-side.mp4',
    youtubeId: 'xUm0BiZCWlQ',
    instruction: {
      goal: 'Borst en voorkant van de armen trainen.',
      steps: [
        'Ga met je rug plat tegen de leuning zitten.',
        'Pak de handgrepen vast op schouderhoogte.',
        'Duw de grepen naar voren tot je armen b\u00edjna gestrekt zijn.',
        'Laat langzaam en gecontroleerd terugkomen.'
      ],
      focus: 'Schouders laag houden, niet ophalen richting je oren. Adem uit bij het duwen, adem in bij het terugkomen.',
      mistake: 'Armen helemaal op slot duwen. Houd altijd een kleine buiging in je ellebogen.'
    }
  },
  'incline-press': {
    id: 'incline-press',
    name: 'Incline chest press',
    apparaat: 'Multipress \u2013 half liggend',
    reps: '8\u201312',
    defaultReps: 8,
    rest: 90,
    tip: 'Zelfde beweging als chest press, iets meer schouder-activatie',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-dumbbell-incline-bench-press-side_cQCX9or.mp4',
    youtubeId: '8iPEnn-ltC8',
    instruction: {
      goal: 'Bovenste deel van de borst en voorkant schouders trainen.',
      steps: [
        'Zet de stoel in de half liggende stand.',
        'Ga met je rug plat tegen de leuning zitten.',
        'Pak de handgrepen vast en duw naar voren en iets omhoog.',
        'Laat langzaam terugkomen tot je handen op borsthoogte zijn.'
      ],
      focus: 'Dezelfde beweging als chest press, maar door de hoek voelt het iets meer in je schouders. Dat is normaal.',
      mistake: 'Je rug van de leuning halen om meer kracht te zetten. Houd je rug altijd tegen de leuning.'
    }
  },
  'shoulder-press': {
    id: 'shoulder-press',
    name: 'Shoulder press',
    apparaat: 'Multipress \u2013 rechtop',
    reps: '8\u201312',
    defaultReps: 8,
    rest: 90,
    tip: 'Niet hoger duwen dan comfortabel, schouders laag houden',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-dumbbell-seated-overhead-press-side.mp4',
    youtubeId: 'qEwKCR5JCog',
    instruction: {
      goal: 'Schouders en bovenste deel van de armen trainen.',
      steps: [
        'Zet de stoel rechtop.',
        'Ga zitten met je rug tegen de leuning.',
        'Pak de handgrepen vast op schouderhoogte.',
        'Duw omhoog tot je armen b\u00edjna gestrekt zijn, laat langzaam zakken.'
      ],
      focus: 'Schouders bewust laag houden \u2014 niet optrekken richting je oren. Duw recht omhoog, niet naar voren.',
      mistake: 'Te hoog duwen of met je rug meehelpen. Houd je rug tegen de leuning en stop voordat je armen volledig gestrekt zijn.'
    }
  },
  'dumbbell-row': {
    id: 'dumbbell-row',
    name: 'Dumbbell row',
    apparaat: 'Dumbbell + bankje',
    reps: '8\u201312 per arm',
    defaultReps: 8,
    rest: 90,
    tip: 'Rug recht, elleboog langs lichaam omhoog trekken',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-Dumbbells-dumbbell-row-unilateral-side.mp4',
    youtubeId: 'pYcpY20QaE8',
    instruction: {
      goal: 'Rug en achterkant van de armen trainen.',
      steps: [
        'Zet \u00e9\u00e9n knie en hand op het bankje, andere voet op de grond.',
        'Pak de dumbbell met je vrije hand.',
        'Trek de dumbbell omhoog door je elleboog langs je lichaam te trekken.',
        'Laat langzaam zakken tot je arm gestrekt is. Wissel daarna van kant.'
      ],
      focus: 'Rug recht en stil houden. De beweging komt uit je arm en rug, niet uit je romp. Denk aan "elleboog naar het plafond trekken".',
      mistake: 'Je romp meedraaien om de dumbbell omhoog te krijgen. Als dat gebeurt, is het gewicht te zwaar.'
    }
  },
  'leg-ext': {
    id: 'leg-ext',
    name: 'Leg extension',
    apparaat: 'Leg extension apparaat',
    reps: '8\u201312',
    defaultReps: 8,
    rest: 90,
    tip: 'Langzaam omhoog, gecontroleerd terug laten zakken',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-machine-leg-extension-side.mp4',
    youtubeId: 'YyvSfVjQeL0',
    instruction: {
      goal: 'Voorkant van de bovenbenen (quadriceps) trainen.',
      steps: [
        'Ga zitten met je rug tegen de leuning.',
        'Plaats je enkels achter het kussentje.',
        'Strek je benen langzaam naar voren tot ze bijna recht zijn.',
        'Laat langzaam en gecontroleerd terugkomen.'
      ],
      focus: 'Langzaam bewegen, vooral bij het terug laten zakken. Niet met een ruk omhoog schoppen.',
      mistake: 'Te snel bewegen of het gewicht "laten vallen" op de terugweg. De terugweg is net zo belangrijk als het strekken.'
    }
  },
  'leg-curl': {
    id: 'leg-curl',
    name: 'Leg curl',
    apparaat: 'Leg curl apparaat',
    reps: '8\u201312',
    defaultReps: 8,
    rest: 90,
    tip: 'Langzaam buigen, niet met een ruk',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-Machine-machine-seated-leg-curl-side.mp4',
    youtubeId: 'ELOCsoDSmrg',
    instruction: {
      goal: 'Achterkant van de bovenbenen (hamstrings) trainen.',
      steps: [
        'Ga zitten met je rug tegen de leuning.',
        'Plaats je enkels boven het kussentje.',
        'Buig je benen langzaam naar achteren (richting je billen).',
        'Laat langzaam terugkomen tot je benen bijna gestrekt zijn.'
      ],
      focus: 'Gecontroleerd bewegen. Houd je bovenlichaam stil en ontspannen.',
      mistake: 'Met een ruk buigen of je lichaam naar voren kantelen om mee te helpen. Houd je rug tegen de leuning.'
    }
  },
  'plank': {
    id: 'plank',
    name: 'Plank',
    apparaat: 'Op de grond',
    reps: '20\u201330 sec',
    defaultReps: 0,
    rest: 60,
    tip: 'Lichaam recht, billen niet omhoog of omlaag',
    isPlank: true,
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-hand-plank-side_PurCsSV.mp4',
    youtubeId: 'pSHjTRCQxIw',
    instruction: {
      goal: 'Buikspieren en core (romp) sterker maken.',
      steps: [
        'Ga op je onderarmen en tenen liggen, gezicht naar de grond.',
        'Houd je lichaam in \u00e9\u00e9n rechte lijn van hoofd tot voeten.',
        'Span je buik aan alsof iemand er tegenaan duwt.',
        'Houd deze positie aan en adem rustig door.'
      ],
      focus: 'Billen niet omhoog steken en niet laten doorzakken. Stel je voor dat er een rechte lat op je rug ligt.',
      mistake: 'Adem inhouden. Blijf rustig doorademen. Begin met 20 seconden \u2014 dat is prima.'
    }
  },
  // Phase 2 exercise (side plank is bodyweight, no equipment needed)
  'side-plank': {
    id: 'side-plank',
    name: 'Side plank',
    apparaat: 'Op de grond',
    reps: '15\u201320 sec per kant',
    defaultReps: 0,
    rest: 60,
    isPlank: true,
    phase: 2,
    tip: 'Heupen omhoog, lichaam in rechte lijn',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-elbow-side-plank-front.mp4',
    youtubeId: 'fLkJT44bRHo',
    instruction: {
      goal: 'Zijwaartse buikspieren en core sterker maken.',
      steps: [
        'Ga op je zij liggen, leun op je onderarm.',
        'Til je heupen op zodat je lichaam een rechte lijn vormt.',
        'Houd deze positie aan, wissel daarna van kant.',
        'Begin met 15 seconden per kant.'
      ],
      focus: 'Heupen niet laten doorzakken. Span je buik aan en adem rustig door.',
      mistake: 'Naar voren of achteren rollen. Houd je lichaam in \u00e9\u00e9n lijn.'
    }
  }
};

// Phase configuration
var PHASE_CONFIG = {
  1: {
    name: 'Fase 1 \u2014 Basis',
    description: 'Leer de basisoefeningen goed uitvoeren',
    unlockRequirement: null,
    krachtBoven: ['chest-press', 'incline-press', 'shoulder-press', 'dumbbell-row', 'plank'],
    krachtOnder: ['leg-curl', 'leg-ext', 'chest-press', 'shoulder-press', 'plank']
  },
  2: {
    name: 'Fase 2 \u2014 Uitbreiding',
    description: 'Meer oefeningen en variatie + side plank',
    unlockRequirement: { sessions: 12, weeks: 4 },
    krachtBoven: ['chest-press', 'incline-press', 'shoulder-press', 'dumbbell-row', 'plank', 'side-plank'],
    krachtOnder: ['leg-curl', 'leg-ext', 'chest-press', 'shoulder-press', 'plank', 'side-plank']
  }
};

const TRAINING_DATA = {
  krachtBoven: {
    id: 'kracht-boven',
    name: 'Kracht: bovenlichaam',
    type: 'kracht',
    warmup: { apparaat: 'Crosstrainer', duur: '5\u20138 min', detail: 'Laag tempo, lichte weerstand' },
    cooldown: '5 min rustig wandelen of licht stretchen (schouders, borst, rug)',
    exerciseIds: ['chest-press', 'incline-press', 'shoulder-press', 'dumbbell-row', 'plank']
  },
  krachtOnder: {
    id: 'kracht-onder',
    name: 'Kracht: onderlichaam',
    type: 'kracht',
    warmup: { apparaat: 'Loopband', duur: '5\u20138 min', detail: '5.0\u20135.5 km/u, incline 0\u20131% \u2014 rustig wandelen' },
    cooldown: '5 min rustig wandelen of stretchen van bovenbenen + 30 sec kuiten stretchen per been',
    exerciseIds: ['leg-curl', 'leg-ext', 'chest-press', 'shoulder-press', 'plank']
  },
  cardioVariatie: {
    id: 'cardio-variatie',
    name: 'Cardio variatie',
    type: 'cardio',
    options: [
      {
        name: 'Crosstrainer (aanbevolen)',
        totalMin: 45,
        isPrimary: true,
        phases: [
          { name: 'Warming-up', duur: 5, detail: 'Rustig tempo, weerstand stand 3\u20134', intensity: 'low' },
          { name: 'Hoofddeel', duur: 35, detail: 'Gemiddeld tempo, weerstand stand 4\u20136, praattest = OK', intensity: 'medium' },
          { name: 'Cooldown', duur: 5, detail: 'Rustig tempo, weerstand stand 3\u20134', intensity: 'low' }
        ],
        interval: { normalMin: 3, fastMin: 1, label: 'Elke 10 min optioneel: 1 min iets sneller' }
      },
      {
        name: 'Loopband',
        totalMin: 45,
        phases: [
          { name: 'Warming-up', duur: 5, detail: '5.5 km/u, incline 1%', intensity: 'low' },
          { name: 'Hoofddeel', duur: 30, detail: '6.3\u20136.5 km/u, incline 2%', intensity: 'medium' },
          { name: 'Lichte push', duur: 5, detail: '6.5 km/u, incline 2\u20133%', intensity: 'high' },
          { name: 'Cooldown', duur: 5, detail: '5.5 km/u, incline 1%', intensity: 'low' }
        ],
        interval: null
      },
      {
        name: 'Recumbent bike',
        totalMin: 40,
        phases: [
          { name: 'Warming-up', duur: 5, detail: 'Rustig tempo, weerstand stand 2\u20133', intensity: 'low' },
          { name: 'Hoofddeel', duur: 30, detail: '60\u201370 RPM, weerstand stand 3\u20135, praattest = OK', intensity: 'medium' },
          { name: 'Cooldown', duur: 5, detail: 'Rustig tempo, weerstand stand 2\u20133', intensity: 'low' }
        ],
        interval: null
      }
    ]
  },
  loopbandWandelen: {
    id: 'loopband-wandelen',
    name: 'Loopband wandelen',
    type: 'cardio',
    options: [
      {
        name: 'Loopband wandelen',
        totalMin: 35,
        isPrimary: true,
        phases: [
          { name: 'Warming-up', duur: 5, detail: '5.2\u20135.5 km/u, incline 0\u20131%', intensity: 'low' },
          { name: 'Hoofddeel', duur: 25, detail: '5.5\u20135.9 km/u, incline 0\u20131% (alleen hoger als kuiten OK zijn)', intensity: 'medium' },
          { name: 'Cooldown', duur: 5, detail: '5.0\u20135.2 km/u, incline 0%', intensity: 'low' }
        ],
        interval: null
      },
      {
        name: 'Loopband met interval',
        totalMin: 30,
        phase2Only: true,
        phases: [
          { name: 'Warming-up', duur: 5, detail: '5.5 km/u, incline 0\u20131%', intensity: 'low' },
          { name: 'Intervals', duur: 20, detail: 'Wissel af: 1 min stevig (6.5\u20137.0 km/u) / 2 min rustig (5.5 km/u)', intensity: 'high' },
          { name: 'Cooldown', duur: 5, detail: '5.0 km/u, incline 0%', intensity: 'low' }
        ],
        interval: { fast: 60, slow: 120, fastDetail: '6.5\u20137.0 km/u', slowDetail: '5.5 km/u' }
      }
    ]
  },
  cardioLicht: {
    id: 'cardio-licht',
    name: 'Lichte cardio',
    type: 'cardio',
    options: [
      {
        name: 'Loopband (aanbevolen)',
        totalMin: 32,
        phases: [
          { name: 'Warming-up', duur: 5, detail: '5.5 km/u, incline 1%', intensity: 'low' },
          { name: 'Hoofddeel', duur: 22, detail: '6.0\u20136.3 km/u, incline 1\u20132%', intensity: 'medium' },
          { name: 'Cooldown', duur: 5, detail: '5.0\u20135.5 km/u, incline 0\u20131%', intensity: 'low' }
        ],
        interval: null
      },
      {
        name: 'Crosstrainer',
        totalMin: 30,
        phases: [
          { name: 'Warming-up', duur: 5, detail: 'Rustig tempo, weerstand stand 3\u20134', intensity: 'low' },
          { name: 'Hoofddeel', duur: 20, detail: 'Rustig-gemiddeld, weerstand stand 3\u20135', intensity: 'medium' },
          { name: 'Cooldown', duur: 5, detail: 'Rustig tempo', intensity: 'low' }
        ],
        interval: null
      },
      {
        name: 'Hometrainer / Recumbent bike',
        totalMin: 30,
        phases: [
          { name: 'Warming-up', duur: 5, detail: 'Rustig, weerstand stand 2\u20133', intensity: 'low' },
          { name: 'Hoofddeel', duur: 20, detail: '55\u201365 RPM, weerstand stand 2\u20134', intensity: 'medium' },
          { name: 'Cooldown', duur: 5, detail: 'Rustig uitfietsen', intensity: 'low' }
        ],
        interval: null
      },
      {
        name: 'Loopband interval',
        totalMin: 28,
        phase2Only: true,
        phases: [
          { name: 'Warming-up', duur: 5, detail: '5.5 km/u, incline 1%', intensity: 'low' },
          { name: 'Intervals', duur: 18, detail: 'Wissel af: 1 min stevig (6.5\u20137.5 km/u) / 2 min rustig (5.5 km/u)', intensity: 'high' },
          { name: 'Cooldown', duur: 5, detail: '5.0\u20135.5 km/u, incline 0%', intensity: 'low' }
        ],
        interval: { fast: 60, slow: 120, fastDetail: '6.5\u20137.5 km/u', slowDetail: '5.5 km/u' }
      }
    ]
  }
};

function getExercise(id) {
  // Some exercises are reused with suffix (e.g. chest-press-o for onderlichaam)
  var baseId = id.replace(/-o$/, '');
  return EXERCISE_DB[baseId] || EXERCISE_DB[id] || null;
}

// ================================================================
// STRETCH ROUTINES (rustdagen)
// ================================================================
var STRETCH_ROUTINES = [
  {
    id: 'hamstrings',
    name: 'Hamstrings stretch',
    duur: 30,
    perKant: true,
    instruction: 'Ga op je rug liggen bij een muur. Strek je benen omhoog tegen de muur, billen zo dicht mogelijk bij de muur. Buig \u00e9\u00e9n been, houd het andere gestrekt. Duw je dij richting de muur tot je een rek voelt. Houd 30 seconden, wissel dan.',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-hamstrings-stretch-variation-1-side.mp4',
    focus: 'Billen dicht bij de muur, been gestrekt houden'
  },
  {
    id: 'quads',
    name: 'Bovenbeen stretch',
    duur: 30,
    perKant: true,
    instruction: 'Sta rechtop (houd je ergens aan vast voor balans). Pak je enkel vast en trek je hiel naar je billen. Je knie wijst naar de grond. Houd 30 seconden, wissel dan.',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-quads-stretch-variation-1-side.mp4',
    focus: 'Knie\u00ebn naast elkaar houden, niet naar buiten'
  },
  {
    id: 'calves',
    name: 'Kuiten stretch',
    duur: 30,
    perKant: true,
    instruction: 'Zet de bal van je voet tegen de muur, hiel blijft op de grond. Handen op schouderhoogte tegen de muur. Leun langzaam naar voren tot je een rek voelt in je kuit. Houd 30 seconden, wissel dan.',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-calves-stretch-variation-1-side.mp4',
    focus: 'Knie gestrekt houden, langzaam en gecontroleerd'
  },
  {
    id: 'chest-doorway',
    name: 'Borst & schouders stretch',
    duur: 30,
    perKant: true,
    instruction: 'Ga bij een muur of deuropening staan. Plaats je arm in een 90-graden hoek tegen de muur. Leun langzaam naar voren tot je een rek voelt in je borst. Houd 30 seconden, draai dan om voor de andere kant.',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-chest-stretch-variation-1-side.mp4',
    focus: 'Niet te ver doorduwen, rustig ademen'
  },
  {
    id: 'rug-stretch',
    name: 'Rug stretch (cobra)',
    duur: 30,
    perKant: false,
    instruction: 'Ga op je buik liggen met je onderarmen plat op de grond. Duw je bovenlichaam omhoog door je ellebogen te strekken. Houd 30 seconden en kom langzaam terug.',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-abdominals-stretch-variation-1-side.mp4',
    focus: 'Schouders laag, kijk recht vooruit, niet te ver doorduwen'
  },
  {
    id: 'glutes',
    name: 'Billen & heup stretch',
    duur: 30,
    perKant: true,
    instruction: 'Ga op de grond zitten. Breng \u00e9\u00e9n been gebogen voor je, het andere been strek je naar achteren. Strek je arm aan dezelfde kant als je voorste been uit over de grond. Leun voorover tot je een rek voelt in je bil. Houd 30 seconden, wissel dan.',
    videoUrl: 'https://media.musclewiki.com/media/uploads/videos/branded/female-glutes-stretch-variation-1-side.mp4',
    focus: 'Houd je heupen zo recht mogelijk, leun rustig voorover'
  }
];

function getSchedule(weekType) {
  var base = {
    0: 'cardioVariatie',      // Zondag
    2: 'loopbandWandelen',    // Dinsdag
    3: 'krachtOnder',         // Woensdag
    6: 'krachtBoven'          // Zaterdag
  };
  if (weekType === 'B') {
    base[5] = 'cardioLicht';  // Vrijdag (alleen Week B)
  }
  return base;
}

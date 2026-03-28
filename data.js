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
    defaultWeight: 10,
    rest: 60,
    tip: 'Langzaam omhoog duwen, niet de armen volledig strekken',
    videoUrl: 'videos/chest-press.mp4',
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
    defaultWeight: 7.5,
    rest: 60,
    tip: 'Zelfde beweging als chest press, iets meer schouder-activatie',
    videoUrl: 'videos/incline-press.mp4',
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
    defaultWeight: 7.5,
    rest: 60,
    tip: 'Niet hoger duwen dan comfortabel, schouders laag houden',
    videoUrl: 'videos/shoulder-press.mp4',
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
    defaultWeight: 6,
    rest: 60,
    tip: 'Rug recht, elleboog langs lichaam omhoog trekken',
    videoUrl: 'videos/dumbbell-row.mp4',
    youtubeId: 'pYcpY20QaE8',
    instruction: {
      goal: 'Rug en achterkant van de armen trainen.',
      steps: [
        'Zet \u00e9\u00e9n knie en hand op het bankje, andere voet op de grond.',
        'Pak de dumbbell met je vrije hand.',
        'Trek de dumbbell omhoog door je elleboog langs je lichaam te trekken.',
        'Laat langzaam zakken tot je arm gestrekt is. Wissel daarna van kant.'
      ],
      focus: 'Rug recht en stil houden. De beweging komt uit je arm en rug, niet uit je romp. Denk aan "elleboog naar het plafond trekken". Beide armen = 1 set.',
      mistake: 'Je romp meedraaien om de dumbbell omhoog te krijgen. Als dat gebeurt, is het gewicht te zwaar.'
    }
  },
  'leg-ext': {
    id: 'leg-ext',
    name: 'Leg extension',
    apparaat: 'Leg extension apparaat',
    reps: '8\u201312',
    defaultReps: 8,
    defaultWeight: 15,
    rest: 60,
    tip: 'Langzaam omhoog, gecontroleerd terug laten zakken',
    videoUrl: 'videos/leg-ext.mp4',
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
    defaultWeight: 10,
    rest: 60,
    tip: 'Langzaam buigen, niet met een ruk',
    videoUrl: 'videos/leg-curl.mp4',
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
  'goblet-squat': {
    id: 'goblet-squat',
    name: 'Goblet squat',
    apparaat: 'Dumbbell',
    reps: '8\u201312',
    defaultReps: 8,
    defaultWeight: 6,
    rest: 60,
    tip: 'Houd de dumbbell tegen je borst, ga diep door je knie\u00ebn.',
    videoUrl: 'videos/goblet-squat.mp4',
    youtubeId: 'MeIiIdhvXT4',
    instruction: {
      goal: 'Benen, billen en core trainen met \u00e9\u00e9n oefening.',
      steps: [
        'Houd een dumbbell met beide handen tegen je borst.',
        'Voeten op schouderbreedte, tenen iets naar buiten.',
        'Zak langzaam door je knie\u00ebn alsof je op een stoel gaat zitten.',
        'Duw jezelf via je hielen terug omhoog.'
      ],
      focus: 'Knie\u00ebn in lijn met je tenen houden. Rug recht, borst vooruit. Ga zo diep als comfortabel is.',
      mistake: 'Knie\u00ebn naar binnen laten vallen of op je tenen gaan staan. Duw bewust je knie\u00ebn naar buiten.'
    }
  },
  'glute-bridge': {
    id: 'glute-bridge',
    name: 'Glute bridge',
    apparaat: 'Op de grond',
    reps: '10\u201315',
    defaultReps: 10,
    defaultWeight: 0,
    rest: 45,
    tip: 'Knijp je billen samen bovenaan, houd 1\u20132 sec vast.',
    isBodyweight: true,
    videoUrl: 'videos/glute-bridge.mp4',
    youtubeId: 'Xp33YgPZgns',
    instruction: {
      goal: 'Bilspieren en achterkant bovenbenen (hamstrings) versterken.',
      steps: [
        'Ga op je rug liggen, knie\u00ebn gebogen, voeten plat op de grond.',
        'Duw je heupen omhoog door je billen aan te spannen.',
        'Houd bovenaan 1\u20132 seconden vast \u2014 knijp je billen samen.',
        'Laat langzaam zakken, net niet de grond raken, en herhaal.'
      ],
      focus: 'De beweging komt uit je billen, niet uit je onderrug. Houd je buik aangespannen.',
      mistake: 'Te ver doorduwen met je onderrug (holle rug). Je lichaam moet een rechte lijn vormen van schouders tot knie\u00ebn.'
    }
  },
  'dead-bug': {
    id: 'dead-bug',
    name: 'Dead bug',
    apparaat: 'Op de grond',
    reps: '8 per kant',
    defaultReps: 8,
    rest: 45,
    isBodyweight: true,
    tip: 'Rechts + links = 1 herhaling. Onderrug blijft op de grond!',
    videoUrl: 'videos/dead-bug.mp4',
    youtubeId: 'x-BStnplCYg',
    instruction: {
      goal: 'Diepe core-stabiliteit. Topexercise voor rug-stabiliteit.',
      steps: [
        'Ga op je rug liggen, armen recht omhoog, knieën op 90 graden.',
        'Strek tegelijkertijd je rechterarm achter je hoofd en je linkerbeen naar voren.',
        'Kom terug en wissel: linkerarm + rechterbeen. Rechts + links = 1 herhaling.',
        'Houd je onderrug plat op de grond — dat is het belangrijkste.'
      ],
      focus: 'Je onderrug mag NIET van de grond komen. Als dat wel gebeurt, maak de beweging kleiner.',
      mistake: 'Onderrug laten opkomen van de grond. Maak de beweging kleiner totdat je het gecontroleerd kunt.'
    }
  },
  'bird-dog': {
    id: 'bird-dog',
    name: 'Bird-dog',
    apparaat: 'Op de grond',
    reps: '8 per kant',
    defaultReps: 8,
    rest: 45,
    isBodyweight: true,
    tip: 'Rechts + links = 1 herhaling. Rug stil houden!',
    videoUrl: 'videos/bird-dog.mp4',
    youtubeId: 'vtwhC3tfVow',
    instruction: {
      goal: 'Rug-stabiliteit. De oefening die je rug het meest helpt.',
      steps: [
        'Ga op handen en knieën zitten.',
        'Strek tegelijkertijd je rechterarm naar voren en je linkerbeen naar achteren.',
        'Houd 2–3 seconden stil, rug blijft recht.',
        'Kom terug en wissel: linkerarm + rechterbeen. Rechts + links = 1 herhaling.'
      ],
      focus: 'Je rug en heupen blijven stil — niet meedraaien of kantelen. Span je buik licht aan.',
      mistake: 'Je heup laten zakken naar de kant van het opgetilde been. Houd je heupen evenwijdig aan de grond.'
    }
  },
  'plank': {
    id: 'plank',
    name: 'Plank',
    apparaat: 'Op de grond',
    reps: '20\u201330 sec',
    defaultReps: 0,
    rest: 45,
    tip: 'Lichaam recht, billen niet omhoog of omlaag',
    isPlank: true,
    videoUrl: 'videos/plank.mp4',
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
  }
};

// Phase configuration
var PHASE_CONFIG = {
  1: {
    name: 'Fase 1 \u2014 Basis',
    description: 'Leer de basisoefeningen goed uitvoeren',
    unlockRequirement: null,
    krachtBoven: ['chest-press', 'shoulder-press', 'dumbbell-row', 'plank', 'dead-bug'],
    krachtOnder: ['leg-curl', 'leg-ext', 'goblet-squat', 'glute-bridge', 'plank', 'bird-dog']
  },
  2: {
    name: 'Fase 2 \u2014 Uitbreiding',
    description: 'Meer oefeningen en hogere intensiteit',
    unlockRequirement: { sessions: 12, weeks: 4 },
    krachtBoven: ['chest-press', 'incline-press', 'shoulder-press', 'dumbbell-row', 'plank', 'dead-bug'],
    krachtOnder: ['leg-curl', 'leg-ext', 'goblet-squat', 'glute-bridge', 'plank', 'bird-dog']
  }
};

const TRAINING_DATA = {
  krachtBoven: {
    id: 'kracht-boven',
    name: 'Kracht: bovenlichaam',
    description: 'Focus op borst, schouders en rug. Core stabiliteit met plank en dead bug.',
    type: 'kracht',
    warmup: { apparaat: 'Crosstrainer', duur: '5\u20138 min', detail: 'Laag tempo, lichte weerstand' },
    cooldown: '5 min rustig wandelen, daarna deze stretches:',
    cooldownStretches: ['chest-doorway', 'rug-stretch'],
    exerciseIds: ['chest-press', 'incline-press', 'shoulder-press', 'dumbbell-row', 'plank', 'dead-bug']
  },
  krachtOnder: {
    id: 'kracht-onder',
    name: 'Kracht: onderlichaam',
    description: 'Focus op benen en billen. Core stabiliteit met plank en bird-dog.',
    type: 'kracht',
    warmup: { apparaat: 'Loopband', duur: '5\u20138 min', detail: '5.0\u20135.5 km/u, incline 0\u20131% \u2014 rustig wandelen' },
    cooldown: '5 min rustig wandelen, daarna deze stretches:',
    cooldownStretches: ['hamstrings', 'quads', 'calves', 'glutes'],
    exerciseIds: ['leg-curl', 'leg-ext', 'goblet-squat', 'glute-bridge', 'plank', 'bird-dog']
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
        totalMin: 31,
        phase2Only: true,
        phases: [
          { name: 'Warming-up', duur: 5, detail: '5.5 km/u, incline 0\u20131%', intensity: 'low' },
          { name: 'Intervals', duur: 21, detail: '7 rondes: 1 min stevig (6.5\u20137.0 km/u) + 2 min rustig (5.5 km/u)', intensity: 'high' },
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
// DAILY ROUTINE (mobiliteit & core — elke dag)
// ================================================================
var DAILY_ROUTINE = [
  { id: 'cat-cow', name: 'Cat-cow', target: '10x', type: 'reps', totalTime: 30 },
  { id: 'dead-bug', name: 'Dead bug', target: '10/kant', type: 'reps', totalTime: 40 },
  { id: 'bird-dog', name: 'Bird-dog', target: '10/kant', type: 'reps', totalTime: 40 },
  { id: 'plank', name: 'Plank', target: '30 sec', type: 'timed', totalTime: 45 },
  { id: 'glute-bridge', name: 'Glute bridge', target: '15x', type: 'reps', totalTime: 30 },
  { id: 'neck-mobility', name: 'Neck mobility', target: '5/richting', type: 'reps', totalTime: 20 },
  { id: 'shoulder-mobility', name: 'Shoulder mobility', target: '10x', type: 'reps', totalTime: 20 }
];

// ================================================================
// STRETCH ROUTINES (rustdagen)
// ================================================================
var STRETCH_ROUTINES = [
  {
    id: 'hip-flexor',
    name: 'Heup stretch (staand)',
    duur: 30,
    perKant: true,
    instruction: 'Sta rechtop, houd je ergens aan vast. Zet een voet een stap naar achteren. Buig je voorste knie licht en duw je heup van het achterste been naar voren. Je voelt een rek aan de voorkant van je heup. Houd 30 seconden per kant.',
    videoUrl: 'videos/hip-flexor.mp4',
    focus: 'Rug recht houden, niet voorover leunen.'
  },
  {
    id: 'hamstrings',
    name: 'Achterbeen stretch (staand)',
    duur: 30,
    perKant: true,
    instruction: 'Zet een voet een kleine stap naar voren, hiel op de grond, tenen omhoog. Buig licht door je achterste knie en leun met rechte rug voorover. Je voelt een rek achter in je bovenbeen. Houd 30 seconden, wissel dan.',
    videoUrl: 'videos/hamstrings.mp4',
    focus: 'Rug recht houden, niet afronden.'
  },
  {
    id: 'quads',
    name: 'Bovenbeen stretch',
    duur: 30,
    perKant: true,
    instruction: 'Sta rechtop (houd je ergens aan vast voor balans). Pak je enkel vast en trek je hiel naar je billen. Je knie wijst naar de grond. Houd 30 seconden, wissel dan.',
    videoUrl: 'videos/quads.mp4',
    focus: 'Knie\u00ebn naast elkaar houden, niet naar buiten'
  },
  {
    id: 'calves',
    name: 'Kuiten stretch (staand)',
    duur: 30,
    perKant: true,
    instruction: 'Zet een voet een stap naar achteren. Houd je achterste been gestrekt en druk je hiel in de grond. Leun licht naar voren tot je een rek voelt in je kuit. Houd 30 seconden, wissel dan.',
    videoUrl: 'videos/calves.mp4',
    focus: 'Achterste been gestrekt, hiel op de grond.'
  },
  {
    id: 'chest-doorway',
    name: 'Borst & schouders stretch',
    duur: 30,
    perKant: true,
    instruction: 'Ga bij een muur of deuropening staan. Plaats je arm in een 90-graden hoek tegen de muur. Leun langzaam naar voren tot je een rek voelt in je borst. Houd 30 seconden, draai dan om voor de andere kant.',
    videoUrl: 'videos/chest-doorway.mp4',
    focus: 'Niet te ver doorduwen, rustig ademen'
  },
  {
    id: 'rug-stretch',
    name: 'Rug stretch (staand)',
    duur: 30,
    perKant: false,
    instruction: 'Sta rechtop. Leg je handen op je onderrug. Leun rustig naar achteren en duw je heupen licht naar voren. Je voelt een zachte rek in je onderrug. Houd 30 seconden.',
    videoUrl: 'videos/rug-stretch.mp4',
    focus: 'Niet te ver, rustig ademen. Knieën licht gebogen houden.'
  },
  {
    id: 'glutes',
    name: 'Billen stretch (zittend)',
    duur: 30,
    perKant: true,
    instruction: 'Ga op een stoel of bankje zitten. Leg je rechterenkel op je linkerknie (figuur-4 houding). Leun rustig voorover tot je een rek voelt in je rechterbil. Houd 30 seconden, wissel dan.',
    videoUrl: 'videos/glutes.mp4',
    focus: 'Rug recht houden, rustig ademen.'
  }
];

function getSchedule(weekType) {
  var base = {
    2: 'loopbandWandelen',    // Dinsdag
    3: 'krachtOnder',         // Woensdag (benen/onderlichaam)
    6: 'krachtBoven'          // Zaterdag (armen/bovenlichaam)
  };
  if (weekType === 'B') {
    base[5] = 'cardioLicht';  // Vrijdag (alleen Week B)
  }
  return base;
}

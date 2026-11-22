// Missions and story: Rio, a newcomer driver, does jobs for the fixer Mara Voss.
// Four story missions chain in order; taxi fares and a time trial fill free roam.

import { PLACES } from './config.js';
import { createCar, nearestCar } from './vehicles.js';
import { randomRoadPoint } from './world.js';
import { addCrime } from './police.js';

export const STORY = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    briefing: 'Mara needs wheels. Take any car and bring it to Marlin Garage.',
    reward: 250,
    steps: [
      { type: 'getCar', label: 'Take a car (walk up to one and press E)' },
      { type: 'reach', x: PLACES.garage.x, y: PLACES.garage.y, r: 100, label: 'Drive to Marlin Garage' },
    ],
  },
  {
    id: 'sunset-fare',
    title: 'Sunset Fare',
    briefing: 'A client waits at Sunset Plaza. Pick them up and drop them at the Palma Hotel.',
    reward: 350,
    steps: [
      { type: 'reach', x: PLACES.plaza.x, y: PLACES.plaza.y, r: 90, label: 'Go to Sunset Plaza' },
      { type: 'pickup', label: 'Wait for the passenger to get in' },
      { type: 'reach', x: PLACES.hotel.x, y: PLACES.hotel.y, r: 100, label: 'Drop the passenger at the Palma Hotel' },
    ],
  },
  {
    id: 'lose-the-heat',
    title: 'Lose the Heat',
    briefing: 'Mara left a marked car by the Old Market road. Take it — the police will notice. Then lose them.',
    reward: 500,
    steps: [
      { type: 'stealMarked', label: 'Take the marked car' },
      { type: 'loseWanted', label: 'Lose the police (get to 0 stars)' },
    ],
  },
  {
    id: 'last-delivery',
    title: 'The Last Delivery',
    briefing: 'One package, one harbour. Pick it up at the Old Market and run it to the docks before the clock runs out.',
    reward: 750,
    steps: [
      { type: 'reach', x: PLACES.market.x, y: PLACES.market.y, r: 90, label: 'Pick up the package at the Old Market' },
      { type: 'timedReach', x: PLACES.docks.x, y: PLACES.docks.y, r: 110, time: 120, label: 'Deliver to the Harbor Docks' },
    ],
  },
  {
    id: 'beach-run',
    title: 'Beach Run',
    briefing: 'Mara has a friend waiting at Boardwalk Beach. Pick them up and drive them to the Safe House across town.',
    reward: 600,
    steps: [
      { type: 'reach', x: PLACES.beach.x, y: PLACES.beach.y, r: 90, label: 'Go to Boardwalk Beach' },
      { type: 'pickup', label: 'Wait for the friend to get in' },
      { type: 'reach', x: PLACES.safehouse.x, y: PLACES.safehouse.y, r: 100, label: 'Drive to the Safe House' },
    ],
  },
  {
    id: 'heavy-load',
    title: 'Heavy Load',
    briefing: 'A cargo truck sits at the Harbor Docks with Mara’s name on it. Take it and haul it to Marlin Garage.',
    reward: 800,
    steps: [
      { type: 'stealMarked', label: 'Take the cargo truck' },
      { type: 'reach', x: PLACES.garage.x, y: PLACES.garage.y, r: 100, label: 'Haul the truck to Marlin Garage' },
    ],
  },
  {
    id: 'big-score',
    title: 'The Big Score',
    briefing: 'The Sunset Bank job. Grab the cash and run it to Sunset Pier — and the alarms are already ringing.',
    reward: 1000,
    steps: [
      { type: 'reach', x: PLACES.bank.x, y: PLACES.bank.y, r: 90, label: 'Get to the Sunset Bank' },
      { type: 'pickup', label: 'Grab the cash' },
      { type: 'timedReach', x: PLACES.pier.x, y: PLACES.pier.y, r: 110, time: 150, label: 'Run the cash to Sunset Pier' },
    ],
  },
];

export function createMissionState() {
  return {
    index: -1,
    step: 0,
    active: false,
    timer: 0,
    evadeTimer: 0,
    pickupTimer: 0,
    markedCar: null,
    done: [],
    banner: null,
  };
}

export function startMission(game, index) {
  const m = game.mission;
  m.index = index;
  m.step = 0;
  m.active = true;
  m.timer = 0;
  m.evadeTimer = 0;
  m.pickupTimer = 0;
  m.markedCar = null;
  const def = STORY[index];
  game.banner = { title: def.title, sub: def.briefing, t: 4 };
  if (def.id === 'lose-the-heat') {
    const car = createCar('sport', 1500, 930, 0, '#e8e8e8');
    car.driver = 'none';
    car.marked = true;
    game.cars.push(car);
    m.markedCar = car;
  }
  if (def.id === 'heavy-load') {
    const truck = createCar('truck', PLACES.docks.x, PLACES.docks.y, 0, '#a0a0a0');
    truck.driver = 'none';
    truck.marked = true;
    game.cars.push(truck);
    m.markedCar = truck;
  }
  if (def.id === 'big-score') {
    // The alarms are already ringing when the job starts.
    addCrime(game, 30, 'bank job');
  }
}

export function currentStep(game) {
  if (!game.mission.active || game.mission.index < 0) return null;
  return STORY[game.mission.index].steps[game.mission.step] || null;
}

export function missionTarget(game) {
  const step = currentStep(game);
  if (!step) return null;
  if (step.type === 'stealMarked' && game.mission.markedCar) {
    return { x: game.mission.markedCar.x, y: game.mission.markedCar.y, label: step.label };
  }
  if (step.x !== undefined) return { x: step.x, y: step.y, label: step.label };
  return null;
}

function completeStep(game) {
  const m = game.mission;
  m.step += 1;
  const def = STORY[m.index];
  if (m.step >= def.steps.length) {
    game.cash += def.reward;
    m.done.push(def.id);
    m.active = false;
    m.index = -1;
    m.step = 0;
    game.events.push({ type: 'missionDone', title: def.title, reward: def.reward });
    // The next job unlocks after a breath.
    if (m.done.length < STORY.length) {
      m.nextAt = game.time + 3;
    }
  } else {
    game.events.push({ type: 'stepDone', label: def.steps[m.step].label });
  }
}

/** Advance the active story mission; returns nothing, posts events on game.events. */
export function updateMissions(game, dt) {
  const m = game.mission;
  if (!m.active && m.nextAt && game.time >= m.nextAt && m.done.length < STORY.length) {
    m.nextAt = null;
    startMission(game, m.done.length);
    return;
  }
  if (!m.active) return;
  const step = currentStep(game);
  if (!step) return;
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;

  if (step.type === 'getCar') {
    if (player.car) completeStep(game);
    return;
  }
  if (step.type === 'reach') {
    if (Math.hypot(px - step.x, py - step.y) < step.r) completeStep(game);
    return;
  }
  if (step.type === 'pickup') {
    m.pickupTimer += dt;
    if (m.pickupTimer > 1.2) completeStep(game);
    return;
  }
  if (step.type === 'stealMarked') {
    if (player.car === m.markedCar) {
      game.events.push({ type: 'markedStolen' });
      completeStep(game);
    }
    return;
  }
  if (step.type === 'loseWanted') {
    if (game.wanted.stars === 0) {
      m.evadeTimer += dt;
      if (m.evadeTimer > 1) completeStep(game);
    } else {
      m.evadeTimer = 0;
    }
    return;
  }
  if (step.type === 'timedReach') {
    if (m.timer === 0) m.timer = step.time;
    m.timer -= dt;
    if (Math.hypot(px - step.x, py - step.y) < step.r) {
      m.timer = 0;
      completeStep(game);
    } else if (m.timer <= 0) {
      m.timer = 0;
      game.events.push({ type: 'missionFailed', title: STORY[m.index].title });
      m.active = false;
      m.index = -1;
      m.step = 0;
      m.nextAt = game.time + 3;
    }
  }
}

// ---- Free-roam taxi fares ----

export function startTaxiFare(game) {
  if (game.taxi || game.mission.active) return false;
  const rng = game.rng;
  const p1 = randomRoadPoint(rng);
  const p2 = randomRoadPoint(rng);
  if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 800) return false;
  const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  game.taxi = {
    phase: 'pickup',
    pickup: { x: p1.x, y: p1.y },
    dropoff: { x: p2.x, y: p2.y },
    fare: Math.round(60 + dist / 12),
    timer: 100,
    wait: 0,
  };
  game.banner = { title: 'Taxi fare', sub: `Pick up the passenger — fare $${game.taxi.fare}.`, t: 3 };
  return true;
}

export function updateTaxi(game, dt) {
  const taxi = game.taxi;
  if (!taxi) return;
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  taxi.timer -= dt;
  if (taxi.timer <= 0) {
    game.taxi = null;
    game.banner = { title: 'Fare lost', sub: 'The passenger gave up waiting.', t: 3 };
    return;
  }
  if (taxi.phase === 'pickup') {
    if (Math.hypot(px - taxi.pickup.x, py - taxi.pickup.y) < 90) {
      taxi.wait += dt;
      if (taxi.wait > 1) {
        taxi.phase = 'dropoff';
        taxi.wait = 0;
        game.events.push({ type: 'stepDone', label: 'Passenger aboard — drive to the destination' });
      }
    }
  } else if (Math.hypot(px - taxi.dropoff.x, py - taxi.dropoff.y) < 100) {
    game.cash += taxi.fare;
    game.events.push({ type: 'cash', amount: taxi.fare, label: `Taxi fare paid: $${taxi.fare}` });
    game.taxi = null;
  }
}

// ---- Free-roam delivery runs: pick up a package, run it across town. ----

export function startDelivery(game) {
  if (game.delivery || game.taxi || game.mission.active) return false;
  const rng = game.rng;
  const p1 = randomRoadPoint(rng);
  const p2 = randomRoadPoint(rng);
  if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 900) return false;
  const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  game.delivery = {
    phase: 'pickup',
    pickup: { x: p1.x, y: p1.y },
    dropoff: { x: p2.x, y: p2.y },
    pay: Math.round(70 + dist / 10),
    timer: 120,
    wait: 0,
  };
  game.banner = { title: 'Delivery run', sub: `Pick up the package — pays $${game.delivery.pay}.`, t: 3 };
  return true;
}

export function updateDelivery(game, dt) {
  const delivery = game.delivery;
  if (!delivery) return;
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  delivery.timer -= dt;
  if (delivery.timer <= 0) {
    game.delivery = null;
    game.banner = { title: 'Delivery late', sub: 'The client gave the package to someone else.', t: 3 };
    return;
  }
  if (delivery.phase === 'pickup') {
    if (Math.hypot(px - delivery.pickup.x, py - delivery.pickup.y) < 90) {
      delivery.wait += dt;
      if (delivery.wait > 1) {
        delivery.phase = 'dropoff';
        delivery.wait = 0;
        game.events.push({ type: 'stepDone', label: 'Package collected — deliver it across town' });
      }
    }
  } else if (Math.hypot(px - delivery.dropoff.x, py - delivery.dropoff.y) < 100) {
    game.cash += delivery.pay;
    game.events.push({ type: 'cash', amount: delivery.pay, label: `Delivery paid: $${delivery.pay}` });
    game.delivery = null;
  }
}

// ---- Time trial: drive the pier gate, then three checkpoints in order. ----

export const TRIAL_GATE = { x: PLACES.pier.x, y: PLACES.pier.y, r: 90 };
export const TRIAL_CHECKPOINTS = [
  { x: 1500, y: 300 },
  { x: 2100, y: 2100 },
  { x: 3300, y: 3300 },
];

export function updateTrial(game, dt) {
  const trial = game.trial;
  const player = game.player;
  if (!player.car || game.mission.active) return;
  const px = player.car.x;
  const py = player.car.y;
  if (!trial.active) {
    if (Math.hypot(px - TRIAL_GATE.x, py - TRIAL_GATE.y) < TRIAL_GATE.r) {
      trial.active = true;
      trial.cp = 0;
      trial.time = 0;
      game.banner = { title: 'Time trial', sub: 'Three checkpoints, fastest time wins. Go!', t: 3 };
    }
    return;
  }
  trial.time += dt;
  const cp = TRIAL_CHECKPOINTS[trial.cp];
  if (cp && Math.hypot(px - cp.x, py - cp.y) < 100) {
    trial.cp += 1;
    game.events.push({ type: 'stepDone', label: `Checkpoint ${trial.cp} of 3` });
    if (trial.cp >= TRIAL_CHECKPOINTS.length) {
      trial.active = false;
      const t = trial.time;
      const best = trial.best === null || t < trial.best;
      if (best) trial.best = t;
      if (t < 90) {
        game.cash += 200;
        game.events.push({ type: 'cash', amount: 200, label: `Trial finished in ${t.toFixed(1)}s — $200 prize` });
      } else {
        game.banner = { title: 'Trial finished', sub: `Time ${t.toFixed(1)}s — beat 90s for the $200 prize.`, t: 4 };
      }
    }
  }
}

/** The nearest car to the player, for the "press E" prompt. */
export function nearestUsableCar(game) {
  const player = game.player;
  if (player.car) return null;
  return nearestCar(game, player.x, player.y, 80);
}

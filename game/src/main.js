// Sunset City — boot and the one loop.
// Input is read every frame, the world advances in fixed 1/60 s steps, and the
// renderer paints what is there. Screens: title, play, paused, mission list,
// and full-screen event overlays (mission done, busted, wasted).
//
// ?seed=N fixes the city. ?shot=cover|play|chase|mission (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { STEP, WORLD, PLAYER, SAVE_KEY, SPAWN, PLACES, WANTED } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_INTERACT, ACTION_PUNCH, ACTION_MISSIONS, ACTION_TAXI } from './input.js';
import { createAudio } from './audio.js';
import { createCity, createPed, updatePeds, createParticles, updateParticles, collideBuildings, burst } from './world.js';
import { spawnCityCars, createCar, nearestCar, enterCar, exitCar, drivePlayerCar, updateTraffic, collideCarsAndPeds, carCircles } from './vehicles.js';
import { createWanted, addCrime, updateWanted, updatePolice } from './police.js';
import { STORY, createMissionState, startMission, currentStep, missionTarget, updateMissions, startTaxiFare, updateTaxi, updateTrial, TRIAL_CHECKPOINTS, nearestUsableCar } from './missions.js';
import { drawHUD, drawTitle, drawPaused, drawMissionList, drawEventOverlay } from './hud.js';
import { createRenderer, drawWorld } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);

/** A fresh game: the city, the player, the traffic, the first job waiting. */
function createGame(seedValue) {
  const rng = createRandom(seedValue);
  const game = {
    seed: seedValue,
    rng,
    city: createCity(rng),
    time: 0,
    screen: 'title',
    player: {
      x: SPAWN.x,
      y: SPAWN.y,
      angle: SPAWN.angle,
      car: null,
      health: PLAYER.health,
      weapon: 'fists',
      punchTimer: 0,
      punchCooldown: 0,
      invuln: 0,
    },
    cars: [],
    peds: [],
    particles: createParticles(),
    wanted: createWanted(),
    mission: createMissionState(),
    taxi: null,
    trial: { active: false, cp: 0, time: 0, best: null, next: null },
    cash: 0,
    stats: { stolen: 0, crimes: 0 },
    cam: { x: SPAWN.x, y: SPAWN.y },
    events: [],
    banner: null,
    prompt: '',
    objectiveText: '',
    currentTarget: null,
    bat: { x: 3180, y: 372, taken: false },
    overlay: null,
    input: null,
    titleButtons: null,
  };
  spawnCityCars(game);
  for (let i = 0; i < 24; i += 1) game.peds.push(createPed(rng, game.city));
  return game;
}

const game = createGame(seed);
const input = createInput(canvas);
game.input = input;

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: game.cash,
      done: game.mission.done,
      x: game.player.car ? game.player.car.x : game.player.x,
      y: game.player.car ? game.player.car.y : game.player.y,
      health: game.player.health,
      best: game.trial.best,
      weapon: game.player.weapon,
    }));
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

function announce(message) {
  status.textContent = message;
}

function startNewGame() {
  const fresh = createGame(seed);
  // Keep the input, renderer and audio wired to the same game object.
  fresh.input = game.input;
  Object.keys(fresh).forEach((key) => { game[key] = fresh[key]; });
  game.screen = 'play';
  startMission(game, 0);
  writeSave();
  announce('Playing. First job: First Wheels.');
}

function continueGame(save) {
  game.cash = save.cash || 0;
  game.mission.done = save.done || [];
  game.player.x = save.x || SPAWN.x;
  game.player.y = save.y || SPAWN.y;
  game.player.health = save.health || PLAYER.health;
  game.player.weapon = save.weapon || 'fists';
  game.trial.best = save.best || null;
  game.cam.x = game.player.x;
  game.cam.y = game.player.y;
  game.screen = 'play';
  if (game.mission.done.length < STORY.length) {
    game.mission.nextAt = game.time + 1;
  }
  announce('Welcome back to Sunset City.');
}

function respawnAt(place, reason) {
  const wasMission = game.mission.active ? game.mission.index : -1;
  game.player.car = null;
  game.player.x = place.x;
  game.player.y = place.y;
  game.player.angle = 0;
  game.player.health = PLAYER.health;
  game.player.invuln = 2;
  game.wanted = createWanted();
  game.taxi = null;
  game.trial.active = false;
  // Clear police cars.
  game.cars = game.cars.filter((c) => c.driver !== 'police');
  if (reason === 'busted') {
    game.cash = Math.floor(game.cash * 0.8);
  } else {
    game.cash = Math.max(0, game.cash - 100);
  }
  if (wasMission >= 0) {
    // The job is still open — start it over from the first step.
    startMission(game, wasMission);
  }
  game.cam.x = game.player.x;
  game.cam.y = game.player.y;
  writeSave();
}

/** Drain the event queue the modules filled this step. */
function handleEvents() {
  for (const event of game.events) {
    if (event.type === 'carHitBuilding') {
      audio.thud();
    } else if (event.type === 'carCrash') {
      audio.crash();
      addCrime(game, WANTED.hitCar, 'crash');
    } else if (event.type === 'hitPed') {
      audio.thud();
      addCrime(game, WANTED.hitPed, 'hit pedestrian');
    } else if (event.type === 'carBroken') {
      game.banner = { title: 'Car broken', sub: 'This one is done — find another ride.', t: 3 };
    } else if (event.type === 'markedStolen') {
      addCrime(game, 30, 'stole the marked car');
      game.banner = { title: 'The police saw that!', sub: 'Lose the heat — get to 0 stars.', t: 4 };
    } else if (event.type === 'stepDone') {
      game.banner = { title: 'Step done', sub: event.label, t: 2.5 };
      audio.pickup();
    } else if (event.type === 'missionDone') {
      audio.missionDone();
      game.overlay = { kind: 'missionDone', title: 'JOB DONE', sub: `${event.title} — paid $${event.reward}.`, t: 3, color: '#f2c230' };
      writeSave();
    } else if (event.type === 'missionFailed') {
      game.overlay = { kind: 'missionFailed', title: 'JOB FAILED', sub: `${event.title} — Mara will call again.`, t: 3, color: '#e5534b' };
    } else if (event.type === 'cash') {
      audio.cash();
      game.banner = { title: `+$${event.amount}`, sub: event.label, t: 3 };
      writeSave();
    } else if (event.type === 'busted') {
      audio.busted();
      game.overlay = { kind: 'busted', title: 'BUSTED', sub: 'The police took you in. You lost 20% of your cash.', t: 3, color: '#3f7de0' };
    } else if (event.type === 'wasted') {
      audio.busted();
      game.overlay = { kind: 'wasted', title: 'WASTED', sub: 'You woke up at City Hospital. The bill was $100.', t: 3, color: '#e5534b' };
    }
  }
  game.events.length = 0;
}

function updatePlayerOnFoot(dt, actions) {
  const player = game.player;
  const move = input.move();
  const len = Math.hypot(move.x, move.y);
  if (len > 0) {
    const speed = move.run ? PLAYER.run : PLAYER.walk;
    const nx = player.x + (move.x / len) * speed * dt;
    const ny = player.y + (move.y / len) * speed * dt;
    const fixed = collideBuildings(game.city, nx, ny, PLAYER.radius);
    player.x = Math.max(30, Math.min(WORLD.size - 30, fixed.x));
    player.y = Math.max(30, Math.min(WORLD.size - 30, fixed.y));
    player.angle = Math.atan2(move.y, move.x);
  }
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  player.punchTimer = Math.max(0, player.punchTimer - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  if (actions & ACTION_PUNCH && player.punchCooldown <= 0) {
    player.punchCooldown = 0.45;
    player.punchTimer = 0.25;
    audio.punch();
    const range = player.weapon === 'bat' ? PLAYER.batRange : PLAYER.punchRange;
    const damage = player.weapon === 'bat' ? PLAYER.batDamage : PLAYER.punchDamage;
    // Peds in front of the fist go down.
    for (const ped of game.peds) {
      if (ped.down > 0) continue;
      const dx = ped.x - player.x;
      const dy = ped.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d < range + 10) {
        const facing = dx * Math.cos(player.angle) + dy * Math.sin(player.angle);
        if (facing > -10) {
          ped.down = 3;
          ped.state = 'down';
          ped.x += Math.cos(player.angle) * 20;
          ped.y += Math.sin(player.angle) * 20;
          burst(game.particles, ped.x, ped.y, 5, '#ffffff', 120, 0.3, 3);
          addCrime(game, WANTED.punchPed, 'punched a pedestrian');
        }
      }
    }
    // Cars in front get dented.
    for (const car of game.cars) {
      const d = Math.hypot(car.x - player.x, car.y - player.y);
      if (d < range + car.len / 2) {
        car.health -= damage / 4;
        burst(game.particles, car.x, car.y, 4, '#ffd23f', 100, 0.3, 3);
      }
    }
  }
  // The bat, lying by the garage.
  if (game.bat && !game.bat.taken && Math.hypot(player.x - game.bat.x, player.y - game.bat.y) < 30) {
    game.bat.taken = true;
    player.weapon = 'bat';
    audio.pickup();
    game.banner = { title: 'Picked up a bat', sub: 'Longer reach, harder hits.', t: 3 };
  }
  // Traffic that runs the player over hurts.
  if (player.invuln <= 0) {
    for (const car of game.cars) {
      if (Math.abs(car.speed) < 80) continue;
      for (const c of carCircles(car)) {
        if (Math.hypot(player.x - c.x, player.y - c.y) < c.r + 10) {
          player.health -= 20;
          player.invuln = 1;
          player.x += (player.x - car.x) * 0.4;
          player.y += (player.y - car.y) * 0.4;
          audio.thud();
          burst(game.particles, player.x, player.y, 6, '#e5534b', 120, 0.4, 3);
          if (player.health <= 0) {
            game.events.push({ type: 'wasted' });
          }
          break;
        }
      }
    }
  }
}

function updateCamera(dt) {
  const player = game.player;
  const tx = player.car ? player.car.x : player.x;
  const ty = player.car ? player.car.y : player.y;
  const k = Math.min(1, 4 * dt);
  game.cam.x += (tx - game.cam.x) * k;
  game.cam.y += (ty - game.cam.y) * k;
}

function updateObjective() {
  const m = game.mission;
  if (m.active) {
    const step = currentStep(game);
    if (step) {
      let text = `${STORY[m.index].title}: ${step.label}`;
      if (step.type === 'timedReach' && m.timer > 0) text += ` — ${Math.ceil(m.timer)}s`;
      if (step.type === 'loseWanted') text += ` — ${game.wanted.stars}★ now`;
      game.objectiveText = text;
      game.currentTarget = missionTarget(game);
      return;
    }
  }
  if (game.taxi) {
    const t = game.taxi;
    game.objectiveText = t.phase === 'pickup'
      ? `Taxi fare $${t.fare}: pick up the passenger — ${Math.ceil(t.timer)}s`
      : `Taxi fare $${t.fare}: drop off the passenger — ${Math.ceil(t.timer)}s`;
    game.currentTarget = t.phase === 'pickup' ? t.pickup : t.dropoff;
    return;
  }
  if (game.trial.active) {
    game.objectiveText = `Time trial: checkpoint ${game.trial.cp + 1} of 3 — ${game.trial.time.toFixed(1)}s`;
    game.trial.next = TRIAL_CHECKPOINTS[game.trial.cp] || null;
    game.currentTarget = game.trial.next;
    return;
  }
  game.objectiveText = 'Free roam — M: jobs, T: taxi fare, pier gate: time trial';
  game.trial.next = null;
  game.currentTarget = null;
}

function updatePrompt() {
  const player = game.player;
  if (player.car) {
    game.prompt = player.car.broken ? 'Car broken — press E to get out' : 'Press E to get out';
    return;
  }
  const car = nearestUsableCar(game);
  if (car) {
    game.prompt = car.driver === 'traffic' ? 'Press E to steal this car' : 'Press E to get in';
    return;
  }
  if (game.bat && !game.bat.taken && Math.hypot(player.x - game.bat.x, player.y - game.bat.y) < 90) {
    game.prompt = 'A bat is lying here';
    return;
  }
  game.prompt = '';
}

function step(dt, actions) {
  game.time += dt;
  // Overlay countdowns (mission done / busted / wasted) freeze the world briefly.
  if (game.overlay) {
    game.overlay.t -= dt;
    if (game.overlay.t <= 0) {
      const kind = game.overlay.kind;
      game.overlay = null;
      if (kind === 'busted') respawnAt(PLACES.station, 'busted');
      else if (kind === 'wasted') respawnAt(PLACES.hospital, 'wasted');
    }
    return;
  }
  if (game.banner) {
    game.banner.t -= dt;
    if (game.banner.t <= 0) game.banner = null;
  }

  // Enter / exit cars.
  if (actions & ACTION_INTERACT) {
    if (game.player.car) {
      exitCar(game);
      audio.click();
    } else {
      const car = nearestUsableCar(game);
      if (car) {
        const wasTraffic = car.driver === 'traffic';
        enterCar(game, car);
        audio.click();
        if (wasTraffic) addCrime(game, WANTED.stealCar, 'stole a car');
      }
    }
  }
  // Taxi fare on demand.
  if (actions & ACTION_TAXI) {
    startTaxiFare(game);
  }

  // Player.
  if (game.player.car) {
    const car = game.player.car;
    const result = drivePlayerCar(game, car, input.drive(), dt);
    game.player.x = car.x;
    game.player.y = car.y;
    game.player.angle = car.angle;
    if (result.skid) {
      const bx = car.x - Math.cos(car.angle) * car.len / 2;
      const by = car.y - Math.sin(car.angle) * car.len / 2;
      game.particles.push({
        x: bx, y: by, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
        life: 0.6, maxLife: 0.6, color: '#888888', size: 4,
      });
    }
    audio.skid(result.skid);
    audio.engine(Math.min(1, Math.abs(car.speed) / car.maxSpeed), true);
  } else {
    updatePlayerOnFoot(dt, actions);
    audio.engine(0, false);
    audio.skid(false);
  }

  // Traffic, police, peds, particles.
  for (const car of game.cars) {
    if (car.driver === 'traffic') updateTraffic(game, car, dt);
  }
  collideCarsAndPeds(game, dt);
  updatePeds(game, dt);
  updateParticles(game.particles, dt);
  updateWanted(game, dt);
  updatePolice(game, dt);

  // Missions and side work.
  updateMissions(game, dt);
  updateTaxi(game, dt);
  updateTrial(game, dt);

  // Police siren when a police car is close.
  let siren = false;
  const px = game.player.car ? game.player.car.x : game.player.x;
  const py = game.player.car ? game.player.car.y : game.player.y;
  for (const car of game.cars) {
    if (car.driver === 'police' && Math.hypot(car.x - px, car.y - py) < 700) {
      siren = true;
      break;
    }
  }
  audio.siren(siren, dt);

  handleEvents();
  updateCamera(dt);
  updateObjective();
  updatePrompt();
}

function draw(view) {
  const save = readSave();
  if (game.screen === 'title') {
    // The city drifts behind the title.
    game.cam.x = SPAWN.x + Math.sin(game.time * 0.05) * 200;
    game.cam.y = SPAWN.y + Math.cos(game.time * 0.04) * 200;
    drawWorld(renderer, game, view);
    game.titleButtons = drawTitle(renderer.ctx, game, view, !!save);
    return;
  }
  drawWorld(renderer, game, view);
  drawHUD(renderer.ctx, game, view);
  if (game.screen === 'paused') drawPaused(renderer.ctx, view);
  else if (game.screen === 'list') drawMissionList(renderer.ctx, game, view);
  else if (game.overlay) {
    drawEventOverlay(renderer.ctx, view, game.overlay.title, game.overlay.sub, game.overlay.color);
  }
}

function viewSize() {
  return { w: window.innerWidth, h: window.innerHeight };
}

function runShot(name) {
  const scene = stageShot(name, game);
  game.banner = null;
  updateObjective();
  updatePrompt();
  const view = viewSize();
  renderer.resize(view.w, view.h, window.devicePixelRatio || 1);
  let painted = 0;
  function paint() {
    drawWorld(renderer, game, view);
    drawHUD(renderer.ctx, game, view);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  void scene;
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  const save = readSave();
  announce('Sunset City. Press Enter or click Start.');

  function resize() {
    const view = viewSize();
    renderer.resize(view.w, view.h, window.devicePixelRatio || 1);
  }
  window.addEventListener('resize', resize);
  resize();

  function handleTitleClick() {
    if (!game.titleButtons) return;
    const mouse = input.mouse;
    const b = game.titleButtons;
    if (b.start && mouse.x >= b.start.x && mouse.x <= b.start.x + b.start.w && mouse.y >= b.start.y && mouse.y <= b.start.y + b.start.h) {
      audio.ensure();
      audio.click();
      startNewGame();
      return;
    }
    if (b.cont && mouse.x >= b.cont.x && mouse.x <= b.cont.x + b.cont.w && mouse.y >= b.cont.y && mouse.y <= b.cont.y + b.cont.h) {
      audio.ensure();
      audio.click();
      continueGame(readSave());
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    const view = viewSize();

    if (game.screen === 'title') {
      game.time += 1 / 60;
      if (input.mouse.clicked) handleTitleClick();
      else if (actions & ACTION_CONFIRM) {
        audio.ensure();
        const existing = readSave();
        if (existing) continueGame(existing);
        else startNewGame();
      }
      draw(view);
      input.endFrame();
      return;
    }

    if (actions & ACTION_PAUSE) {
      if (game.screen === 'play') game.screen = 'paused';
      else if (game.screen === 'paused') game.screen = 'play';
      else if (game.screen === 'list') game.screen = 'play';
    }
    if (actions & ACTION_MISSIONS) {
      if (game.screen === 'play') game.screen = 'list';
      else if (game.screen === 'list') game.screen = 'play';
    }

    if (game.screen === 'play') {
      while (accumulator >= STEP) {
        step(STEP, actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    draw(view);
    input.endFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.screen === 'play') {
      game.screen = 'paused';
      writeSave();
    }
  });
  window.addEventListener('beforeunload', writeSave);

  requestAnimationFrame(frame);
}

// For the play-test harness: the live game, its screens and its save key.
window.__sunset = { game, STEP };

if (shot) runShot(shot);
else runGame();

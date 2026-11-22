// Cars: driving physics for the player, traffic that follows the roads,
// stealing, and the collisions between cars, buildings and people.

import { WORLD } from './config.js';
import { collideBuildings, roadCenters, isRoad, randomRoadPoint, burst, knockPedDown } from './world.js';

/** Car kinds: size, top speed, acceleration, and the colour set they spawn in. */
export const CAR_KINDS = {
  sedan: { len: 64, wid: 32, maxSpeed: 470, accel: 380, colors: ['#c94f4f', '#4f7ac9', '#c9a24f', '#7a8a99', '#8a5fc9'] },
  taxi: { len: 64, wid: 32, maxSpeed: 470, accel: 380, colors: ['#f2c230'] },
  sport: { len: 66, wid: 30, maxSpeed: 580, accel: 490, colors: ['#d94f4f', '#2ec4b6', '#e8e8e8'] },
  truck: { len: 86, wid: 36, maxSpeed: 370, accel: 260, colors: ['#8a7a5a', '#5a6e8a', '#a0a0a0'] },
  police: { len: 66, wid: 32, maxSpeed: 560, accel: 460, colors: ['#1d2733'] },
};

let nextCarId = 1;

export function createCar(kind, x, y, angle, color) {
  const spec = CAR_KINDS[kind];
  return {
    id: nextCarId,
    kind,
    x,
    y,
    angle,
    speed: 0,
    color: color || spec.colors[Math.floor(Math.random() * spec.colors.length)],
    len: spec.len,
    wid: spec.wid,
    maxSpeed: spec.maxSpeed,
    accel: spec.accel,
    driver: 'none',
    health: 100,
    broken: false,
    cruise: 150 + Math.random() * 90,
    axis: 'h',
    dir: 1,
    stuck: 0,
  };
}

/** Two circles (front and rear) that approximate a car for collisions. */
export function carCircles(car) {
  const dx = Math.cos(car.angle);
  const dy = Math.sin(car.angle);
  const off = car.len / 4;
  const r = car.wid * 0.58;
  return [
    { x: car.x + dx * off, y: car.y + dy * off, r },
    { x: car.x - dx * off, y: car.y - dy * off, r },
  ];
}

/** Spawn the city's traffic and parked cars. */
export function spawnCityCars(game) {
  const rng = game.rng;
  for (let i = 0; i < 14; i += 1) {
    const p = randomRoadPoint(rng);
    const kind = rng.chance(0.14) ? 'taxi' : rng.chance(0.12) ? 'truck' : rng.chance(0.14) ? 'sport' : 'sedan';
    const car = createCar(kind, p.x, p.y, p.angle);
    car.driver = 'traffic';
    car.axis = p.axis;
    car.dir = p.dir;
    car.speed = car.cruise * 0.7;
    game.cars.push(car);
  }
  // Parked cars along the roads near the spawn, for the player to take.
  const parked = [
    { x: 390, y: 300, angle: 0, kind: 'sedan', color: '#c94f4f' },
    { x: 300, y: 420, angle: Math.PI / 2, kind: 'taxi' },
    { x: 930, y: 300, angle: 0, kind: 'sport', color: '#2ec4b6' },
    { x: 300, y: 930, angle: Math.PI / 2, kind: 'sedan', color: '#4f7ac9' },
    { x: 1500, y: 330, angle: 0, kind: 'truck', color: '#8a7a5a' },
    { x: 2100, y: 930, angle: Math.PI / 2, kind: 'sedan', color: '#c9a24f' },
  ];
  for (const spot of parked) {
    const car = createCar(spot.kind, spot.x, spot.y, spot.angle, spot.color);
    car.driver = 'none';
    game.cars.push(car);
  }
}

/** The nearest car to a point, within maxDist (0 when none). */
export function nearestCar(game, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of game.cars) {
    if (car.driver === 'police') continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

/** Get in a car. A traffic car loses its driver (they get out and run); that is a crime. */
export function enterCar(game, car) {
  const player = game.player;
  if (car.driver === 'traffic') {
    // The driver bails out and runs away.
    game.peds.push({
      x: car.x - Math.cos(car.angle) * 30,
      y: car.y - Math.sin(car.angle) * 30,
      angle: car.angle + Math.PI,
      speed: 80,
      state: 'flee',
      color: '#d9a066',
      timer: 3,
      down: 0,
      axis: 'h',
      dir: 1,
    });
    game.stats.stolen += 1;
  }
  car.driver = 'player';
  car.speed = 0;
  player.car = car;
  player.x = car.x;
  player.y = car.y;
}

/** Get out: the player appears beside the car, which stays where it is. */
export function exitCar(game) {
  const player = game.player;
  const car = player.car;
  if (!car) return;
  car.driver = 'none';
  car.speed *= 0.3;
  player.car = null;
  const side = Math.cos(car.angle + Math.PI / 2);
  const sideY = Math.sin(car.angle + Math.PI / 2);
  player.x = car.x + side * (car.wid / 2 + 20);
  player.y = car.y + sideY * (car.wid / 2 + 20);
  player.angle = car.angle;
  const fixed = collideBuildings(game.city, player.x, player.y, 14);
  player.x = fixed.x;
  player.y = fixed.y;
}

/** Arcade driving: throttle, steering that bites harder at speed, drag, skid. */
export function drivePlayerCar(game, car, drive, dt) {
  if (car.broken) {
    car.speed *= 0.94;
    return { skid: false };
  }
  const spec = CAR_KINDS[car.kind];
  if (drive.throttle > 0) car.speed += spec.accel * dt;
  else if (drive.throttle < 0) {
    if (car.speed > 20) car.speed -= spec.accel * 1.4 * dt;
    else car.speed -= spec.accel * 0.45 * dt;
  }
  if (drive.brake) car.speed *= Math.max(0, 1 - 3.2 * dt);
  car.speed -= car.speed * 0.35 * dt;
  if (car.speed > spec.maxSpeed) car.speed = spec.maxSpeed;
  if (car.speed < -170) car.speed = -170;
  const speedRatio = Math.min(1, Math.abs(car.speed) / 260);
  const steer = drive.steer * 2.4 * speedRatio * (car.speed < 0 ? -1 : 1);
  car.angle += steer * dt;
  const skid = Math.abs(drive.steer) > 0.7 && Math.abs(car.speed) > 300;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(40, Math.min(WORLD.size - 40, car.x));
  car.y = Math.max(40, Math.min(WORLD.size - 40, car.y));
  // Buildings stop the car hard.
  for (const c of carCircles(car)) {
    const fixed = collideBuildings(game.city, c.x, c.y, c.r);
    if (fixed.hit) {
      const before = car.speed;
      car.x += fixed.x - c.x;
      car.y += fixed.y - c.y;
      if (Math.abs(before) > 180) {
        car.health -= 8;
        game.events.push({ type: 'carHitBuilding', speed: Math.abs(before) });
        burst(game.particles, c.x, c.y, 8, '#ffd23f', 160, 0.4, 3);
      }
      car.speed *= 0.4;
    }
  }
  return { skid };
}

/** Traffic brains: follow the road, slow for the car ahead, turn at intersections. */
export function updateTraffic(game, car, dt) {
  if (car.driver !== 'traffic') return;
  const centers = roadCenters();
  // Stay on the road: if pushed off, steer back to the nearest centreline.
  const onRoad = isRoad(car.x, car.y);
  if (!onRoad) {
    // Drift back toward the nearest road line.
    let best = null;
    let bestD = Infinity;
    for (const c of centers) {
      const d1 = Math.abs(car.x - c);
      const d2 = Math.abs(car.y - c);
      if (d1 < bestD) { bestD = d1; best = { axis: 'v', line: c }; }
      if (d2 < bestD) { bestD = d2; best = { axis: 'h', line: c }; }
    }
    const target = best.axis === 'h' ? Math.atan2(best.line - car.y, 0) : Math.atan2(0, best.line - car.x);
    car.angle = turnToward(car.angle, target, 2.2 * dt);
    car.speed = Math.min(car.speed + 120 * dt, 120);
  } else {
    // Car ahead in the same lane? Slow down.
    let blocked = false;
    for (const other of game.cars) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (ahead > 0 && ahead < 110 && side < 40) {
        blocked = true;
        break;
      }
    }
    const want = blocked ? 0 : car.cruise;
    car.speed += (want - car.speed) * Math.min(1, 1.6 * dt);
    // At an intersection, sometimes turn onto the crossing road.
    if (nearIntersection(car.x, car.y) && game.rng.chance(0.012)) {
      const horizontal = car.axis === 'h';
      car.axis = horizontal ? 'v' : 'h';
      car.dir = game.rng.chance(0.5) ? 1 : -1;
      car.angle = car.axis === 'h' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(40, Math.min(WORLD.size - 40, car.x));
  car.y = Math.max(40, Math.min(WORLD.size - 40, car.y));
  for (const c of carCircles(car)) {
    const fixed = collideBuildings(game.city, c.x, c.y, c.r);
    if (fixed.hit) {
      car.x += fixed.x - c.x;
      car.y += fixed.y - c.y;
      car.speed *= 0.5;
    }
  }
}

function nearIntersection(x, y) {
  const centers = roadCenters();
  let onV = false;
  let onH = false;
  for (const c of centers) {
    if (Math.abs(x - c) < 70) onV = true;
    if (Math.abs(y - c) < 70) onH = true;
  }
  return onV && onH;
}

export function turnToward(angle, target, maxStep) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return angle + Math.sign(diff) * maxStep;
}

/** Car vs car and car vs pedestrian collisions, with damage and crime events. */
export function collideCarsAndPeds(game, dt) {
  const cars = game.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      for (const ca of carCircles(a)) {
        for (const cb of carCircles(b)) {
          const dx = cb.x - ca.x;
          const dy = cb.y - ca.y;
          const d = Math.hypot(dx, dy);
          const min = ca.r + cb.r - 4;
          if (d >= min || d < 0.001) continue;
          const push = (min - d) / 2 / d;
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
          const impact = Math.abs(a.speed - b.speed) + 60;
          if (impact > 200) {
            a.health -= 4;
            b.health -= 4;
            burst(game.particles, (ca.x + cb.x) / 2, (ca.y + cb.y) / 2, 6, '#ffd23f', 140, 0.35, 3);
            if ((a.driver === 'player' || b.driver === 'player') && impact > 320) {
              game.events.push({ type: 'carCrash', speed: impact });
            }
          }
          const avg = (a.speed + b.speed) / 2;
          a.speed = avg;
          b.speed = avg;
        }
      }
    }
  }
  // Cars vs pedestrians.
  for (const car of cars) {
    if (Math.abs(car.speed) < 30) continue;
    for (const ped of game.peds) {
      if (ped.down > 0) continue;
      for (const c of carCircles(car)) {
        const d = Math.hypot(ped.x - c.x, ped.y - c.y);
        if (d < c.r + 10) {
          knockPedDown(ped);
          ped.x += Math.cos(car.angle) * 26;
          ped.y += Math.sin(car.angle) * 26;
          burst(game.particles, ped.x, ped.y, 6, '#e5534b', 120, 0.5, 3);
          if (car.driver === 'player') {
            game.events.push({ type: 'hitPed' });
          }
          car.speed *= 0.7;
        }
      }
    }
  }
  // Broken cars smoke and stop.
  for (const car of cars) {
    if (car.health <= 0 && !car.broken) {
      car.broken = true;
      car.speed = 0;
      burst(game.particles, car.x, car.y, 14, '#888888', 90, 1.2, 4);
      if (car.driver === 'player') game.events.push({ type: 'carBroken' });
    }
    if (car.broken && Math.random() < dt * 6) {
      game.particles.push({
        x: car.x + (Math.random() - 0.5) * 20,
        y: car.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 20,
        vy: -40 - Math.random() * 30,
        life: 1,
        maxLife: 1,
        color: '#999999',
        size: 5,
      });
    }
  }
}

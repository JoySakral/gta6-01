// Wanted level and police: crimes raise heat, stars follow heat, police cars
// spawn and chase, and getting caught on foot means busted.
// Police roles: chasers steer at the player, interceptors aim where the player
// is about to be, and at 3+ stars two cars park across the road ahead as a
// roadblock. Police never drive through buildings.

import { WANTED, WORLD } from './config.js';
import { createCar, carCircles, turnToward } from './vehicles.js';
import { randomRoadPoint, roadCenters, isRoad, collideBuildings, burst } from './world.js';

export function createWanted() {
  return { heat: 0, stars: 0, lastCrimeAt: -999, bust: 0 };
}

export function starsForHeat(heat) {
  let stars = 0;
  for (let i = 0; i < WANTED.thresholds.length; i += 1) {
    if (heat >= WANTED.thresholds[i]) stars = i;
  }
  return stars;
}

/** A crime: heat goes up, the wanted clock restarts, the star count follows. */
export function addCrime(game, heat, reason) {
  game.wanted.heat = Math.min(120, game.wanted.heat + heat);
  game.wanted.lastCrimeAt = game.time;
  game.wanted.stars = starsForHeat(game.wanted.heat);
  game.stats.crimes += 1;
  void reason;
}

/** Heat decays when the player has been quiet and no police are close. */
export function updateWanted(game, dt) {
  const wanted = game.wanted;
  if (wanted.heat <= 0) {
    wanted.stars = 0;
    return;
  }
  const quietFor = game.time - wanted.lastCrimeAt;
  let nearPolice = false;
  for (const car of game.cars) {
    if (car.driver !== 'police') continue;
    const px = game.player.car ? game.player.car.x : game.player.x;
    const py = game.player.car ? game.player.car.y : game.player.y;
    if (Math.hypot(car.x - px, car.y - py) < 500) {
      nearPolice = true;
      break;
    }
  }
  if (quietFor > WANTED.decayDelay && !nearPolice) {
    wanted.heat = Math.max(0, wanted.heat - WANTED.decayPerSecond * dt);
    wanted.stars = starsForHeat(wanted.heat);
  }
}

/** How many police cars a wanted level fields. */
function policeTarget(stars) {
  if (stars <= 0) return 0;
  return Math.min(1 + stars, 5);
}

/** Spawn and steer the police: they chase the player, cut them off, block the road, and bust on foot. */
export function updatePolice(game, dt) {
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  const pvx = player.car ? Math.cos(player.car.angle) * player.car.speed : 0;
  const pvy = player.car ? Math.sin(player.car.angle) * player.car.speed : 0;
  const target = policeTarget(game.wanted.stars);

  // Spawn more police until the target is met, on roads near the player.
  let policeCars = game.cars.filter((c) => c.driver === 'police');
  if (policeCars.length < target) {
    for (let tries = 0; tries < 8 && policeCars.length < target; tries += 1) {
      const p = randomRoadPoint(game.rng);
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < 500 || d > 1400) continue;
      const car = createCar('police', p.x, p.y, p.angle, '#1d2733');
      car.driver = 'police';
      // Every second car is an interceptor: it aims ahead of the player.
      car.role = game.wanted.stars >= 3 && policeCars.length % 2 === 1 ? 'intercept' : 'chase';
      car.speed = 200;
      game.cars.push(car);
      policeCars.push(car);
      game.events.push({ type: 'policeSpawned' });
      burst(game.particles, p.x, p.y, 6, '#3f7de0', 100, 0.5, 3);
    }
  }

  // Roadblock: at 3+ stars, two cars park across the road ahead of the player.
  if (game.wanted.stars >= 3) {
    const blockers = policeCars.filter((c) => c.role === 'block');
    if (blockers.length === 0 && (!game.lastBlockAt || game.time - game.lastBlockAt > 18)) {
      game.lastBlockAt = game.time;
      const heading = player.car ? player.car.angle : player.angle;
      const aheadX = px + Math.cos(heading) * 520;
      const aheadY = py + Math.sin(heading) * 520;
      // Snap the block to the nearest road centreline.
      let bestLine = null;
      let bestD = Infinity;
      for (const c of roadCenters()) {
        if (Math.abs(aheadX - c) < bestD) { bestD = Math.abs(aheadX - c); bestLine = { axis: 'v', line: c }; }
        if (Math.abs(aheadY - c) < bestD) { bestD = Math.abs(aheadY - c); bestLine = { axis: 'h', line: c }; }
      }
      const spots = bestLine.axis === 'h'
        ? [{ x: aheadX - 55, y: bestLine.line }, { x: aheadX + 55, y: bestLine.line }]
        : [{ x: bestLine.line, y: aheadY - 55 }, { x: bestLine.line, y: aheadY + 55 }];
      for (const spot of spots) {
        const car = createCar('police', spot.x, spot.y, bestLine.axis === 'h' ? Math.PI / 2 : 0, '#1d2733');
        car.driver = 'police';
        car.role = 'block';
        car.blockT = 14;
        car.speed = 0;
        game.cars.push(car);
        policeCars.push(car);
        game.events.push({ type: 'policeSpawned' });
        burst(game.particles, spot.x, spot.y, 6, '#e23b3b', 100, 0.5, 3);
      }
      game.banner = { title: 'ROADBLOCK AHEAD', sub: 'The police parked across the road — go around or through.', t: 3 };
    }
  } else {
    // Below 3 stars the blockers give up and join the chase.
    for (const car of policeCars) {
      if (car.role === 'block') car.role = 'chase';
    }
  }

  // Wanted is gone: blockers leave at once; chasers drive off down the road, then leave.
  if (game.wanted.stars === 0) {
    for (let i = game.cars.length - 1; i >= 0; i -= 1) {
      const car = game.cars[i];
      if (car.driver !== 'police') continue;
      if (car.role === 'block') {
        game.cars.splice(i, 1);
        continue;
      }
      // Steer back to the nearest road instead of ploughing through buildings.
      if (!isRoad(car.x, car.y)) {
        let best = null;
        let bestD = Infinity;
        for (const c of roadCenters()) {
          const d1 = Math.abs(car.x - c);
          const d2 = Math.abs(car.y - c);
          if (d1 < bestD) { bestD = d1; best = { axis: 'v', line: c }; }
          if (d2 < bestD) { bestD = d2; best = { axis: 'h', line: c }; }
        }
        const targetAngle = best.axis === 'h' ? Math.atan2(best.line - car.y, 0) : Math.atan2(0, best.line - car.x);
        car.angle = turnToward(car.angle, targetAngle, 2.2 * dt);
      }
      car.speed = Math.min(car.speed + 200 * dt, 300);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      // Buildings stop a leaving police car too — the drive back to the road
      // must not cut through them.
      for (const c of carCircles(car)) {
        const fixed = collideBuildings(game.city, c.x, c.y, c.r);
        if (fixed.hit) {
          car.x += fixed.x - c.x;
          car.y += fixed.y - c.y;
          car.speed *= 0.6;
        }
      }
      if (Math.hypot(car.x - px, car.y - py) > 1600) {
        game.cars.splice(i, 1);
      }
    }
    game.wanted.bust = 0;
    return;
  }

  // Chase: steer at the player (interceptors aim ahead of them), a little faster than a normal car.
  for (const car of policeCars) {
    // A roadblock car stays parked until its timer runs out.
    if (car.role === 'block') {
      car.blockT -= dt;
      if (car.blockT <= 0) car.role = 'chase';
      continue;
    }
    const dx = px - car.x;
    const dy = py - car.y;
    const dist = Math.hypot(dx, dy);
    const tx = car.role === 'intercept' ? px + pvx * 1.4 : px;
    const ty = car.role === 'intercept' ? py + pvy * 1.4 : py;
    const wantAngle = Math.atan2(ty - car.y, tx - car.x);
    car.angle = turnToward(car.angle, wantAngle, 2.6 * dt);
    const wantSpeed = Math.min(car.maxSpeed, 380 + game.wanted.stars * 40);
    car.speed += (wantSpeed - car.speed) * Math.min(1, 1.2 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = Math.max(40, Math.min(WORLD.size - 40, car.x));
    car.y = Math.max(40, Math.min(WORLD.size - 40, car.y));
    // Buildings stop a police car, like any other car.
    for (const c of carCircles(car)) {
      const fixed = collideBuildings(game.city, c.x, c.y, c.r);
      if (fixed.hit) {
        car.x += fixed.x - c.x;
        car.y += fixed.y - c.y;
        car.speed *= 0.6;
      }
    }
    // Ramming the player's car hurts it; ramming the player on foot builds the bust meter.
    if (player.car) {
      for (const c of carCircles(car)) {
        for (const pc of carCircles(player.car)) {
          const d = Math.hypot(c.x - pc.x, c.y - pc.y);
          if (d < c.r + pc.r - 4) {
            player.car.health -= 14 * dt * 10;
            car.speed *= 0.92;
            if (Math.random() < dt * 4) {
              burst(game.particles, (c.x + pc.x) / 2, (c.y + pc.y) / 2, 4, '#ffd23f', 120, 0.3, 3);
            }
          }
        }
      }
    } else if (dist < 70) {
      game.wanted.bust += dt / 2.2;
      if (game.wanted.bust >= 1) {
        game.wanted.bust = 0;
        game.events.push({ type: 'busted' });
      }
    }
  }
}

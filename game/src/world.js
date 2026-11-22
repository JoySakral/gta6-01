// The city itself: a road grid with buildings, parks and trees, plus the people
// who walk its sidewalks and the particles that make it feel alive.
// All art is drawn from data — no image files anywhere.

import { WORLD, PLACES } from './config.js';

/** Road centrelines, both directions. */
export function roadCenters() {
  const centers = [];
  for (let i = 0; i < 6; i += 1) centers.push(WORLD.roadOffset + i * WORLD.pitch);
  return centers;
}

export function isRoad(x, y) {
  const half = WORLD.roadWidth / 2;
  for (const c of roadCenters()) {
    if (Math.abs(x - c) <= half || Math.abs(y - c) <= half) return true;
  }
  return false;
}

/** Distance from a point to the nearest road centreline (0 when on a road). */
function roadDistance(x, y) {
  let best = Infinity;
  for (const c of roadCenters()) {
    best = Math.min(best, Math.abs(x - c), Math.abs(y - c));
  }
  return best;
}

const BUILDING_COLORS = ['#b98a5e', '#8a6f5c', '#7a5a6e', '#5e7a8a', '#a88a6a', '#9a7a5a', '#6e7a5e'];

/** The beach strip: water at the far west edge, sand, then the boardwalk road. */
function createBeach(rng) {
  const palms = [];
  for (let y = 140; y < WORLD.size - 100; y += 150) {
    palms.push({ x: rng.range(130, 225), y: y + rng.range(-40, 40), r: rng.range(9, 13) });
  }
  // A few palms around the plaza too.
  for (let i = 0; i < 6; i += 1) {
    palms.push({ x: rng.range(820, 980), y: rng.range(820, 980), r: rng.range(9, 13) });
  }
  return { water: { x: 0, w: 110 }, sand: { x: 110, w: 130 }, palms };
}

/** Street lamps: one at each intersection corner, for the evening glow. */
function createLamps() {
  const lamps = [];
  for (const cx of roadCenters()) {
    for (const cy of roadCenters()) {
      lamps.push({ x: cx + WORLD.roadWidth / 2 + 12, y: cy + WORLD.roadWidth / 2 + 12 });
    }
  }
  return lamps;
}

/** Named signs that stand by the city's places, so the map reads at a glance. */
function createLandmarks() {
  const spots = [
    { key: 'pier', dx: 70, dy: -70 },
    { key: 'plaza', dx: 70, dy: -70 },
    { key: 'garage', dx: -70, dy: 70 },
    { key: 'hotel', dx: 70, dy: 70 },
    { key: 'market', dx: -70, dy: -70 },
    { key: 'docks', dx: 70, dy: -70 },
    { key: 'hospital', dx: -70, dy: 70 },
    { key: 'station', dx: 70, dy: -70 },
    { key: 'beach', dx: 70, dy: 70 },
    { key: 'bank', dx: 70, dy: -70 },
    { key: 'safehouse', dx: -70, dy: -70 },
    { key: 'park', dx: 70, dy: 70 },
  ];
  return spots.map((s) => {
    const p = PLACES[s.key];
    return { x: p.x + s.dx, y: p.y + s.dy, label: p.label.toUpperCase() };
  });
}

/** Build the city from a seeded rng: buildings fill every block, some blocks are parks. */
export function createCity(rng) {
  const buildings = [];
  const parks = [];
  const trees = [];
  const stalls = [];
  const ponds = [];
  const centers = roadCenters();
  for (let bx = 0; bx < centers.length; bx += 1) {
    for (let by = 0; by < centers.length; by += 1) {
      const x0 = centers[bx] + WORLD.roadWidth / 2 + 14;
      const y0 = centers[by] + WORLD.roadWidth / 2 + 14;
      const x1 = (bx + 1 < centers.length ? centers[bx + 1] : WORLD.size) - WORLD.roadWidth / 2 - 14;
      const y1 = (by + 1 < centers.length ? centers[by + 1] : WORLD.size) - WORLD.roadWidth / 2 - 14;
      const w = x1 - x0;
      const h = y1 - y0;
      if (w <= 0 || h <= 0) continue;
      // The Old Market square: a plaza of stalls instead of buildings.
      if (bx === 2 && by === 4) {
        parks.push({ x: x0, y: y0, w, h });
        for (let sx = 0; sx < 3; sx += 1) {
          for (let sy = 0; sy < 2; sy += 1) {
            stalls.push({
              x: x0 + 60 + sx * 300,
              y: y0 + 70 + sy * 190,
              w: 180,
              h: 110,
              color: rng.pick(['#d94f4f', '#f2c230', '#2ec4b6', '#8a5fc9', '#e8912d']),
            });
          }
        }
        continue;
      }
      // Sunset Park: lawn, a pond and a ring of trees.
      if (bx === 1 && by === 1) {
        parks.push({ x: x0, y: y0, w, h });
        ponds.push({ x: x0 + w * 0.62, y: y0 + h * 0.55, r: 90 });
        const count = rng.int(10, 14);
        for (let i = 0; i < count; i += 1) {
          trees.push({ x: rng.range(x0 + 20, x1 - 20), y: rng.range(y0 + 20, y1 - 20), r: rng.range(10, 18) });
        }
        continue;
      }
      if (rng.chance(0.16)) {
        parks.push({ x: x0, y: y0, w, h });
        const count = rng.int(4, 9);
        for (let i = 0; i < count; i += 1) {
          trees.push({ x: rng.range(x0 + 20, x1 - 20), y: rng.range(y0 + 20, y1 - 20), r: rng.range(10, 18) });
        }
        continue;
      }
      const cols = rng.chance(0.5) ? 2 : 1;
      const rows = rng.chance(0.5) ? 2 : 1;
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          const bw = w / cols - 24;
          const bh = h / rows - 24;
          if (bw < 60 || bh < 60) continue;
          buildings.push({
            x: x0 + (w / cols) * cx + 12,
            y: y0 + (h / rows) * cy + 12,
            w: bw,
            h: bh,
            color: rng.pick(BUILDING_COLORS),
            shade: rng.range(0.75, 1),
            windows: rng.int(2, 4),
          });
        }
      }
    }
  }
  return { buildings, parks, trees, stalls, ponds, beach: createBeach(rng), lamps: createLamps(), landmarks: createLandmarks() };
}

/** Push a circle out of every building it overlaps; returns true when a hit happened. */
export function collideBuildings(city, x, y, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      const push = (r - d) / d;
      x += dx * push;
      y += dy * push;
    } else {
      // Dead centre: push out along the shortest side.
      const left = x - b.x;
      const right = b.x + b.w - x;
      const top = y - b.y;
      const bottom = b.y + b.h - y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = b.x - r;
      else if (m === right) x = b.x + b.w + r;
      else if (m === top) y = b.y - r;
      else y = b.y + b.h + r;
    }
  }
  return { x, y, hit };
}

/** A random point on a road (for spawning traffic), with the road's axis and direction. */
export function randomRoadPoint(rng) {
  const centers = roadCenters();
  const horizontal = rng.chance(0.5);
  const line = rng.pick(centers);
  const along = rng.range(80, WORLD.size - 80);
  const lane = rng.chance(0.5) ? 30 : -30;
  const dir = rng.chance(0.5) ? 1 : -1;
  if (horizontal) return { x: along, y: line + lane, axis: 'h', dir, angle: dir > 0 ? 0 : Math.PI };
  return { x: line + lane, y: along, axis: 'v', dir, angle: dir > 0 ? Math.PI / 2 : -Math.PI / 2 };
}

/** A random point on a sidewalk, on the edge of a road. */
export function randomSidewalkPoint(rng) {
  const centers = roadCenters();
  const horizontal = rng.chance(0.5);
  const line = rng.pick(centers);
  const along = rng.range(80, WORLD.size - 80);
  const side = rng.chance(0.5) ? 1 : -1;
  const off = WORLD.roadWidth / 2 + WORLD.sidewalk / 2 + rng.range(-6, 6);
  if (horizontal) return { x: along, y: line + side * off };
  return { x: line + side * off, y: along };
}

const PED_COLORS = ['#e8b4a0', '#d9a066', '#a87c5a', '#7a9ab8', '#c98a8a', '#8aa87c', '#b8a86a'];

/** One pedestrian: walks the sidewalks, flees from danger, falls when hit.
 *  Kinds: walkers stroll, joggers hurry, workers wear hi-vis vests. */
export function createPed(rng, city) {
  const p = randomSidewalkPoint(rng);
  const kind = rng.chance(0.2) ? 'jogger' : rng.chance(0.25) ? 'worker' : 'walker';
  return {
    x: p.x,
    y: p.y,
    angle: rng.range(0, Math.PI * 2),
    speed: kind === 'jogger' ? rng.range(110, 150) : rng.range(45, 80),
    state: 'walk',
    color: kind === 'worker' ? '#e8912d' : rng.pick(PED_COLORS),
    kind,
    r: kind === 'jogger' ? 7 : 9,
    timer: rng.range(2, 8),
    down: 0,
    axis: rng.chance(0.5) ? 'h' : 'v',
    dir: rng.chance(0.5) ? 1 : -1,
  };
}

/** Pedestrian brains: stroll the sidewalk, turn at random, flee from the player. */
export function updatePeds(game, dt) {
  const player = game.player;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  for (const ped of game.peds) {
    if (ped.down > 0) {
      ped.down -= dt;
      if (ped.down <= 0) {
        ped.state = 'flee';
        ped.timer = 2.5;
      }
      continue;
    }
    const dx = ped.x - px;
    const dy = ped.y - py;
    const dist = Math.hypot(dx, dy);
    const threat = game.player.car ? 90 : 60;
    if (dist < threat && ped.state !== 'flee') {
      ped.state = 'flee';
      ped.timer = 2;
    }
    if (ped.state === 'flee') {
      ped.timer -= dt;
      const run = 190;
      ped.x += (dx / (dist || 1)) * run * dt;
      ped.y += (dy / (dist || 1)) * run * dt;
      ped.angle = Math.atan2(dy, dx);
      const fixed = collideBuildings(game.city, ped.x, ped.y, 10);
      ped.x = fixed.x;
      ped.y = fixed.y;
      if (ped.timer <= 0) ped.state = 'walk';
      continue;
    }
    ped.timer -= dt;
    if (ped.timer <= 0) {
      ped.timer = game.rng.range(2, 7);
      if (game.rng.chance(0.35)) {
        ped.axis = ped.axis === 'h' ? 'v' : 'h';
        ped.dir = game.rng.chance(0.5) ? 1 : -1;
      }
    }
    const step = ped.speed * dt;
    if (ped.axis === 'h') {
      ped.x += ped.dir * step;
      ped.angle = ped.dir > 0 ? 0 : Math.PI;
    } else {
      ped.y += ped.dir * step;
      ped.angle = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    if (ped.x < 60 || ped.x > WORLD.size - 60 || ped.y < 60 || ped.y > WORLD.size - 60) {
      ped.dir *= -1;
    }
  }
}

/** Knock a pedestrian down (they get up and run away after a few seconds). */
export function knockPedDown(ped) {
  ped.down = 3;
  ped.state = 'down';
}

// ---- Particles: skid smoke, sparks, exhaust puffs, punch stars. ----

export function createParticles() {
  return [];
}

export function addParticle(list, x, y, vx, vy, life, color, size) {
  if (list.length > 400) list.shift();
  list.push({ x, y, vx, vy, life, maxLife: life, color, size });
}

export function burst(list, x, y, count, color, speed, life, size) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.8);
    addParticle(list, x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.7), color, size);
  }
}

export function updateParticles(list, dt) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
  }
}

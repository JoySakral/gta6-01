// Rendering: the camera, the city, the cars and people, the markers,
// and the warm sunset light that falls over all of it.

import { WORLD, PALETTE, FONT } from './config.js';
import { roadCenters } from './world.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    canvas,
    ctx,
    resize(w, h, dpr) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCarShape(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const len = car.len;
  const wid = car.wid;
  // Long sunset shadow, just a few pixels off the body so it reads as shade.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  roundRect(ctx, -len / 2 + 6, -wid / 2 + 5, len, wid, 8);
  ctx.fill();
  // Wheels.
  ctx.fillStyle = '#141414';
  const ww = 12;
  const wh = 6;
  ctx.fillRect(-len / 2 + 6, -wid / 2 - 3, ww, wh);
  ctx.fillRect(len / 2 - 18, -wid / 2 - 3, ww, wh);
  ctx.fillRect(-len / 2 + 6, wid / 2 - 3, ww, wh);
  ctx.fillRect(len / 2 - 18, wid / 2 - 3, ww, wh);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 8);
  ctx.fill();
  // Roof and windshield.
  ctx.fillStyle = 'rgba(20,28,38,0.85)';
  roundRect(ctx, -len / 2 + 12, -wid / 2 + 6, len - 24, wid - 12, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,180,220,0.5)';
  ctx.fillRect(len / 2 - 16, -wid / 2 + 7, 8, wid - 14);
  // Headlights (the sun is low).
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(len / 2 - 2, -wid / 2 + 4, 3, 5);
  ctx.fillRect(len / 2 - 2, wid / 2 - 9, 3, 5);
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#1d2733';
    ctx.fillRect(-8, -wid / 2 + 2, 16, 8);
    ctx.fillStyle = '#f2c230';
    ctx.font = 'bold 7px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, -wid / 2 + 8);
  }
  if (car.kind === 'police') {
    const flash = Math.floor(time * 5) % 2 === 0;
    ctx.fillStyle = flash ? '#3f7de0' : '#e23b3b';
    ctx.fillRect(-10, -wid / 2 - 2, 10, 5);
    ctx.fillStyle = flash ? '#e23b3b' : '#3f7de0';
    ctx.fillRect(0, -wid / 2 - 2, 10, 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
  }
  if (car.marked) {
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 3;
    ctx.strokeRect(-len / 2 - 6, -wid / 2 - 6, len + 12, wid + 12);
  }
  if (car.broken) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-len / 2, -wid / 2, len, wid);
  }
  ctx.restore();
}

function drawPedShape(ctx, ped, time) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  if (ped.down > 0) {
    ctx.rotate(0.6);
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.rotate(ped.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(4, 3, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2622';
  ctx.beginPath();
  ctx.arc(4, -3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  void time;
}

function drawPlayerShape(ctx, player, time) {
  if (player.car) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(5, 4, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Teal jacket, dark hair, the newcomer stands out.
  ctx.fillStyle = '#2ec4b6';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(5, -4, 6, 0, Math.PI * 2);
  ctx.fill();
  // Punch swing.
  if (player.punchTimer > 0) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(16, 0, 10, -0.8, 0.8);
    ctx.stroke();
  }
  if (player.weapon === 'bat') {
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(24, 20);
    ctx.stroke();
  }
  ctx.restore();
  void time;
}

/** Draw the whole world through the camera, then the sunset light. */
export function drawWorld(renderer, game, view) {
  const ctx = renderer.ctx;
  const cam = game.cam;
  const vw = view.w;
  const vh = view.h;
  ctx.save();
  ctx.clearRect(0, 0, vw, vh);
  // Sky-tinted ground beyond the city edge.
  ctx.fillStyle = '#5a4a3e';
  ctx.fillRect(0, 0, vw, vh);
  ctx.translate(vw / 2 - cam.x, vh / 2 - cam.y);

  const x0 = cam.x - vw / 2 - 80;
  const y0 = cam.y - vh / 2 - 80;
  const x1 = cam.x + vw / 2 + 80;
  const y1 = cam.y + vh / 2 + 80;

  // Ground.
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Parks.
  for (const park of game.city.parks) {
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = PALETTE.parkDark;
    ctx.fillRect(park.x + 8, park.y + 8, park.w - 16, park.h - 16);
  }
  // Roads: asphalt, sidewalks, lane dashes, crosswalks.
  const centers = roadCenters();
  ctx.fillStyle = PALETTE.road;
  for (const c of centers) {
    ctx.fillRect(x0, c - WORLD.roadWidth / 2, x1 - x0, WORLD.roadWidth);
    ctx.fillRect(c - WORLD.roadWidth / 2, y0, WORLD.roadWidth, y1 - y0);
  }
  ctx.fillStyle = PALETTE.sidewalk;
  for (const c of centers) {
    ctx.fillRect(x0, c - WORLD.roadWidth / 2 - WORLD.sidewalk, x1 - x0, WORLD.sidewalk);
    ctx.fillRect(x0, c + WORLD.roadWidth / 2, x1 - x0, WORLD.sidewalk);
    ctx.fillRect(c - WORLD.roadWidth / 2 - WORLD.sidewalk, y0, WORLD.sidewalk, y1 - y0);
    ctx.fillRect(c + WORLD.roadWidth / 2, y0, WORLD.sidewalk, y1 - y0);
  }
  // Lane dashes.
  ctx.fillStyle = PALETTE.lane;
  for (const c of centers) {
    for (let d = 0; d < WORLD.size; d += 90) {
      if (d % 600 < 200) continue; // keep intersections clear
      ctx.fillRect(d, c - 2, 44, 4);
      ctx.fillRect(c - 2, d, 4, 44);
    }
  }
  // Crosswalks at intersections.
  ctx.fillStyle = PALETTE.crosswalk;
  for (const cx of centers) {
    for (const cy of centers) {
      for (let i = -3; i <= 3; i += 1) {
        ctx.fillRect(cx + i * 16 - 5, cy - WORLD.roadWidth / 2 - 4, 10, 8);
        ctx.fillRect(cx + i * 16 - 5, cy + WORLD.roadWidth / 2 - 4, 10, 8);
        ctx.fillRect(cx - WORLD.roadWidth / 2 - 4, cy + i * 16 - 5, 8, 10);
        ctx.fillRect(cx + WORLD.roadWidth / 2 - 4, cy + i * 16 - 5, 8, 10);
      }
    }
  }
  // Trees.
  for (const tree of game.city.trees) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(tree.x + 8, tree.y + 6, tree.r, tree.r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f6b2f';
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d8a44';
    ctx.beginPath();
    ctx.arc(tree.x - 3, tree.y - 3, tree.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Buildings: long shadow, walls, roof lines, lit windows.
  for (const b of game.city.buildings) {
    if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x + 16, b.y + 14, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.globalAlpha = b.shade;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    // Windows, some lit gold by the evening.
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 34));
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        const lit = ((cx * 7 + cy * 5 + Math.floor(b.x / 60)) % 3) === 0;
        ctx.fillStyle = lit ? '#ffd98a' : 'rgba(20,24,32,0.55)';
        ctx.fillRect(b.x + 10 + cx * 34, b.y + 10 + cy * 34, 16, 14);
      }
    }
  }
  // Bat pickup.
  if (game.bat && !game.bat.taken) {
    ctx.save();
    ctx.translate(game.bat.x, game.bat.y);
    ctx.rotate(-0.6);
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-12, -8);
    ctx.lineTo(12, 8);
    ctx.stroke();
    ctx.restore();
  }
  // Mission / taxi / trial markers: a beacon column and a pulsing ring.
  const target = game.currentTarget;
  if (target) drawMarker(ctx, target.x, target.y, '#ffd23f', game.time);
  if (game.taxi) {
    const t = game.taxi.phase === 'pickup' ? game.taxi.pickup : game.taxi.dropoff;
    drawMarker(ctx, t.x, t.y, '#2ec4b6', game.time);
  }
  if (game.trial.active) {
    const next = game.trial.cp < 3 ? game.trial.next : null;
    if (next) drawMarker(ctx, next.x, next.y, '#2ec4b6', game.time);
  } else if (!game.mission.active && !game.taxi) {
    drawMarker(ctx, 300, 300, 'rgba(46,196,182,0.8)', game.time);
  }
  // Pedestrians, cars, player.
  for (const ped of game.peds) drawPedShape(ctx, ped, game.time);
  for (const car of game.cars) drawCarShape(ctx, car, game.time);
  drawPlayerShape(ctx, game.player, game.time);
  // Particles.
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Sunset light: warm wash from the west, darker at the edges.
  const grad = ctx.createLinearGradient(0, 0, vw, 0);
  grad.addColorStop(0, 'rgba(255,150,60,0.14)');
  grad.addColorStop(0.5, 'rgba(255,120,80,0.05)');
  grad.addColorStop(1, 'rgba(90,40,90,0.10)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, vw, vh);
  const vig = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.42, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(20,8,4,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vw, vh);
}

function drawMarker(ctx, x, y, color, time) {
  const pulse = 1 + Math.sin(time * 4) * 0.15;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = color;
  ctx.fillRect(x - 8, y - 260, 16, 260);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 42 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// HUD and screens: cash, health, wanted stars, speed, the live minimap,
// the mission objective, and the title / pause / mission-list overlays.

import { WORLD, PALETTE, FONT } from './config.js';
import { STORY } from './missions.js';
import { roadCenters } from './world.js';

function drawStars(ctx, stars, x, y) {
  ctx.font = '28px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < stars ? '#ffd23f' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', x + i * 32, y);
  }
}

function drawBar(ctx, x, y, w, h, ratio, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
}

/** The minimap: roads, buildings, the player, cars, police and the mission marker. */
export function drawMinimap(ctx, game, x, y, size) {
  const scale = size / WORLD.size;
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,14,0.82)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  // Roads.
  ctx.strokeStyle = '#6a625a';
  ctx.lineWidth = Math.max(2, (120 * scale));
  for (const c of roadCenters()) {
    const p = x + c * scale;
    ctx.beginPath();
    ctx.moveTo(p, y);
    ctx.lineTo(p, y + size);
    ctx.stroke();
    const q = y + c * scale;
    ctx.beginPath();
    ctx.moveTo(x, q);
    ctx.lineTo(x + size, q);
    ctx.stroke();
  }
  // Buildings.
  ctx.fillStyle = '#8a6f5c';
  for (const b of game.city.buildings) {
    ctx.fillRect(x + b.x * scale, y + b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.h * scale));
  }
  // Mission / taxi / trial markers.
  const target = game.currentTarget;
  if (target) {
    const pulse = 3 + Math.sin(game.time * 5) * 1.5;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x + target.x * scale, y + target.y * scale, pulse + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (game.taxi) {
    const t = game.taxi.phase === 'pickup' ? game.taxi.pickup : game.taxi.dropoff;
    ctx.fillStyle = '#2ec4b6';
    ctx.beginPath();
    ctx.arc(x + t.x * scale, y + t.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cars.
  for (const car of game.cars) {
    ctx.fillStyle = car.driver === 'police' ? (Math.floor(game.time * 4) % 2 ? '#3f7de0' : '#e23b3b') : '#c9c9c9';
    ctx.fillRect(x + car.x * scale - 2, y + car.y * scale - 2, 4, 4);
  }
  // Player.
  const px = game.player.car ? game.player.car.x : game.player.x;
  const py = game.player.car ? game.player.car.y : game.player.y;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + px * scale, y + py * scale, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2ec4b6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + px * scale, y + py * scale, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The in-game HUD: cash, health, stars, speed, objective, prompt, banner. */
export function drawHUD(ctx, game, view) {
  const w = view.w;
  const h = view.h;
  ctx.save();
  ctx.textBaseline = 'middle';
  // Cash.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, 14, 170, 40);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 24px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText('$' + game.cash, 26, 35);
  // Health.
  drawBar(ctx, 14, 62, 170, 12, game.player.health / 100, PALETTE.health);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '12px ' + FONT;
  ctx.fillText('HEALTH', 16, 88);
  // Wanted stars, top right.
  drawStars(ctx, game.wanted.stars, w - 178, 34);
  if (game.wanted.stars > 0) {
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText('WANTED', w - 14, 62);
    // Bust meter when police are close on foot.
    if (!game.player.car && game.wanted.bust > 0) {
      drawBar(ctx, w - 184, 74, 170, 10, game.wanted.bust, PALETTE.danger);
      ctx.fillStyle = PALETTE.danger;
      ctx.textAlign = 'right';
      ctx.fillText('BUSTED?', w - 14, 96);
    }
  }
  // Objective, top centre.
  const objective = game.objectiveText;
  if (objective) {
    ctx.font = 'bold 15px ' + FONT;
    const tw = ctx.measureText(objective).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(w / 2 - tw / 2 - 14, 12, tw + 28, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(objective, w / 2, 30);
  }
  // Speed, bottom left, when driving.
  if (game.player.car) {
    const kmh = Math.round(Math.abs(game.player.car.speed) * 0.22);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(14, h - 64, 120, 50);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 26px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(kmh, 26, h - 46);
    ctx.font = '12px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('km/h', 26, h - 22);
    if (game.player.car.broken) {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = 'bold 13px ' + FONT;
      ctx.fillText('CAR BROKEN', 146, h - 40);
    }
  }
  // Context prompt, bottom centre.
  if (game.prompt) {
    ctx.font = 'bold 15px ' + FONT;
    const tw = ctx.measureText(game.prompt).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(w / 2 - tw / 2 - 12, h - 44, tw + 24, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(game.prompt, w / 2, h - 28);
  }
  // Banner (mission title / event), centre.
  if (game.banner) {
    const a = Math.min(1, game.banner.t);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 34px ' + FONT;
    ctx.fillText(game.banner.title, w / 2, h * 0.32);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '17px ' + FONT;
    ctx.fillText(game.banner.sub, w / 2, h * 0.32 + 34);
    ctx.globalAlpha = 1;
  }
  // Minimap, bottom right.
  drawMinimap(ctx, game, w - 194, h - 194, 180);
  ctx.restore();
}

function menuButton(ctx, label, x, y, w, h, hover) {
  ctx.fillStyle = hover ? '#f2c230' : 'rgba(20,16,12,0.85)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = hover ? '#fff' : '#f2c230';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = hover ? '#1d2733' : PALETTE.text;
  ctx.font = 'bold 20px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

/** Title screen: name, story intro, controls, Start / Continue buttons. */
export function drawTitle(ctx, game, view, hasSave) {
  const w = view.w;
  const h = view.h;
  ctx.save();
  ctx.fillStyle = 'rgba(20,10,8,0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 64px ' + FONT;
  ctx.fillText('SUNSET CITY', w / 2, h * 0.2);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px ' + FONT;
  ctx.fillText('A newcomer driver. A fixer with jobs. A city that never cools down.', w / 2, h * 0.2 + 52);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '15px ' + FONT;
  const story = [
    'Rio just rolled into Sunset City with empty pockets and a fast mouth.',
    'Mara Voss runs the jobs here — if you can drive, she can pay.',
    'Steal a car, lose the police, run the fares, and make the city yours.',
  ];
  story.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.36 + i * 24));
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px ' + FONT;
  ctx.fillText('WASD move / drive   •   E enter or steal a car   •   SPACE punch   •   SHIFT run', w / 2, h * 0.52);
  ctx.fillText('P pause   •   M missions   •   T call a taxi fare   •   drive through the pier gate for a time trial', w / 2, h * 0.52 + 26);
  const bw = 260;
  const bh = 54;
  const bx = w / 2 - bw / 2;
  const mouse = game.input.mouse;
  const hoverStart = mouse.x >= bx && mouse.x <= bx + bw && mouse.y >= h * 0.64 && mouse.y <= h * 0.64 + bh;
  const hoverContinue = hasSave && mouse.x >= bx && mouse.x <= bx + bw && mouse.y >= h * 0.64 + 66 && mouse.y <= h * 0.64 + 66 + bh;
  menuButton(ctx, 'START', bx, h * 0.64, bw, bh, hoverStart);
  if (hasSave) menuButton(ctx, 'CONTINUE', bx, h * 0.64 + 66, bw, bh, hoverContinue);
  if (game.trial.best !== null) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '14px ' + FONT;
    ctx.fillText(`Best time trial: ${game.trial.best.toFixed(1)}s`, w / 2, h * 0.64 + (hasSave ? 150 : 84));
  }
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '13px ' + FONT;
  ctx.fillText('An original game. No real city, person or brand appears in it.', w / 2, h - 28);
  ctx.restore();
  return {
    start: { x: bx, y: h * 0.64, w: bw, h: bh },
    cont: hasSave ? { x: bx, y: h * 0.64 + 66, w: bw, h: bh } : null,
  };
}

/** Pause overlay. */
export function drawPaused(ctx, view) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,6,0.66)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 44px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', view.w / 2, view.h * 0.4);
  ctx.font = '16px ' + FONT;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('P or Esc to keep playing  •  M for the mission list', view.w / 2, view.h * 0.4 + 44);
  ctx.restore();
}

/** Mission list overlay (M key). */
export function drawMissionList(ctx, game, view) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,6,0.94)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 30px ' + FONT;
  ctx.fillText('JOBS FOR MARA VOSS', 60, 70);
  ctx.font = '16px ' + FONT;
  STORY.forEach((m, i) => {
    const done = game.mission.done.includes(m.id);
    const active = game.mission.active && game.mission.index === i;
    const y = 120 + i * 64;
    ctx.fillStyle = done ? PALETTE.health : active ? PALETTE.gold : PALETTE.text;
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText(`${done ? '✓' : active ? '►' : '○'}  ${m.title} — $${m.reward}`, 60, y);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '15px ' + FONT;
    ctx.fillText(m.briefing, 60, y + 24);
  });
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '15px ' + FONT;
  ctx.fillText('Side work: press T on foot to call a taxi fare. Drive through the Sunset Pier gate for a time trial.', 60, 120 + STORY.length * 64 + 20);
  ctx.fillText('M or Esc to close.', 60, 120 + STORY.length * 64 + 46);
  ctx.restore();
}

/** Full-screen event overlay (mission complete, busted, wasted). */
export function drawEventOverlay(ctx, view, title, sub, color) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,6,0.7)';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color || PALETTE.gold;
  ctx.font = 'bold 46px ' + FONT;
  ctx.fillText(title, view.w / 2, view.h * 0.42);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px ' + FONT;
  ctx.fillText(sub, view.w / 2, view.h * 0.42 + 44);
  ctx.restore();
}

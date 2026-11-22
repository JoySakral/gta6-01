// Screenshot scenes: each one stages a real moment of the game — a drive
// down the beach avenue, a walk through the Old Market stalls, a police
// chase with a roadblock ahead, a truck run to the garage — from a fixed
// seed, so the same frame comes out every time.
// ?shot=cover|play|chase|mission (with &seed=N) paints that scene instead of
// running the loop, and sets window.__shotReady for a screenshot.

import { createCar } from './vehicles.js';
import { addCrime } from './police.js';
import { startMission } from './missions.js';

/** Remove traffic cars near a point, so the staged car never overlaps one. */
function clearNear(game, x, y, radius) {
  game.cars = game.cars.filter((car) => {
    if (car.driver !== 'traffic') return true;
    return Math.hypot(car.x - x, car.y - y) > radius;
  });
}

/** Put the game in the named scene and return the screen to draw over it. */
export function stageShot(name, game) {
  game.time = 2.5;
  game.screen = 'play';
  if (name === 'play') {
    // On foot at the Old Market stalls, next to a parked van, workers and a
    // jogger nearby, the market sign in frame.
    game.player.x = 1500;
    game.player.y = 2650;
    game.player.angle = -Math.PI / 4;
    game.cam.x = game.player.x;
    game.cam.y = game.player.y;
    const van = createCar('van', 1540, 2700, 0, '#7a8a99');
    van.driver = 'none';
    game.cars.push(van);
    for (const spot of [
      { x: 1420, y: 2620, angle: 0, kind: 'worker', color: '#e8912d', speed: 60, r: 9 },
      { x: 1620, y: 2620, angle: Math.PI, kind: 'jogger', color: '#7a9ab8', speed: 130, r: 7 },
      { x: 1380, y: 2720, angle: Math.PI / 2, kind: 'walker', color: '#d9a066', speed: 60, r: 9 },
      { x: 1700, y: 2740, angle: -Math.PI / 2, kind: 'walker', color: '#c98a8a', speed: 60, r: 9 },
    ]) {
      game.peds.push({
        x: spot.x, y: spot.y, angle: spot.angle, speed: spot.speed, state: 'walk',
        color: spot.color, kind: spot.kind, r: spot.r, timer: 5, down: 0, axis: 'h', dir: 1,
      });
    }
    return { screen: 'play' };
  }
  if (name === 'chase') {
    // Four stars, three police cars closing in from behind, and two more
    // parked across the road ahead as a roadblock; skid smoke behind the car.
    clearNear(game, 1500, 1500, 300);
    const car = createCar('sport', 1500, 1500, 0, '#d94f4f');
    car.driver = 'player';
    car.speed = 380;
    game.cars.push(car);
    game.player.car = car;
    game.player.x = car.x;
    game.player.y = car.y;
    addCrime(game, 80, 'chase');
    const spots = [
      { x: 1150, y: 1470, angle: 0 },
      { x: 1230, y: 1530, angle: 0 },
      { x: 1190, y: 1500, angle: 0.05 },
    ];
    for (const spot of spots) {
      const cop = createCar('police', spot.x, spot.y, spot.angle, '#1d2733');
      cop.driver = 'police';
      cop.role = 'chase';
      cop.speed = 420;
      game.cars.push(cop);
    }
    // The roadblock: two cars parked across the road ahead.
    for (const spot of [
      { x: 2080, y: 1470, angle: Math.PI / 2 },
      { x: 2120, y: 1530, angle: Math.PI / 2 },
    ]) {
      const block = createCar('police', spot.x, spot.y, spot.angle, '#1d2733');
      block.driver = 'police';
      block.role = 'block';
      block.blockT = 14;
      block.speed = 0;
      game.cars.push(block);
    }
    game.lastBlockAt = game.time;
    // Skid smoke trailing the player's car.
    for (let i = 0; i < 8; i += 1) {
      game.particles.push({
        x: 1500 - 40 - i * 14, y: 1500 + (i % 2 === 0 ? 14 : -14),
        vx: -20, vy: (Math.random() - 0.5) * 20,
        life: 0.8, maxLife: 0.8, color: '#999999', size: 5,
      });
    }
    game.cam.x = car.x + 200;
    game.cam.y = car.y;
    return { screen: 'play' };
  }
  if (name === 'mission') {
    // Mission six, second step: haul the marked cargo truck to Marlin Garage,
    // two stars and one police car on the tail.
    clearNear(game, 900, 3300, 250);
    startMission(game, 5);
    game.mission.step = 1;
    const truck = game.mission.markedCar;
    truck.x = 900;
    truck.y = 3300;
    truck.angle = 0;
    truck.speed = 300;
    truck.driver = 'player';
    game.cars = game.cars.filter((c) => c !== truck);
    game.cars.push(truck);
    game.player.car = truck;
    game.player.x = truck.x;
    game.player.y = truck.y;
    addCrime(game, 30, 'truck run');
    const cop = createCar('police', 600, 3300, 0, '#1d2733');
    cop.driver = 'police';
    cop.role = 'chase';
    cop.speed = 340;
    game.cars.push(cop);
    // A little traffic ahead on the same avenue.
    for (const spot of [
      { x: 1300, y: 3270, angle: 0, kind: 'sedan' },
      { x: 1600, y: 3330, angle: 0, kind: 'taxi' },
    ]) {
      const c = createCar(spot.kind, spot.x, spot.y, spot.angle);
      c.driver = 'traffic';
      c.speed = 200;
      game.cars.push(c);
    }
    game.cam.x = truck.x + 200;
    game.cam.y = truck.y;
    return { screen: 'play' };
  }
  // cover: cruising the beach avenue at sunset, mission five live, the water
  // and palms on the left, traffic ahead, HUD and minimap up.
  clearNear(game, 300, 1500, 250);
  startMission(game, 4);
  game.mission.step = 2;
  const car = createCar('sport', 300, 1500, Math.PI / 2, '#2ec4b6');
  car.driver = 'player';
  car.speed = 340;
  game.cars.push(car);
  game.player.car = car;
  game.player.x = car.x;
  game.player.y = car.y;
  // Traffic on the same avenue, both directions.
  const ahead = [
    { x: 270, y: 1800, angle: Math.PI / 2, kind: 'taxi' },
    { x: 330, y: 1250, angle: -Math.PI / 2, kind: 'sedan' },
    { x: 270, y: 2050, angle: Math.PI / 2, kind: 'van' },
    { x: 330, y: 1050, angle: -Math.PI / 2, kind: 'muscle' },
  ];
  for (const spot of ahead) {
    const c = createCar(spot.kind, spot.x, spot.y, spot.angle);
    c.driver = 'traffic';
    c.speed = 200;
    game.cars.push(c);
  }
  game.cam.x = car.x;
  game.cam.y = car.y + 140;
  return { screen: 'play' };
}

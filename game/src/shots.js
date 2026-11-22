// Screenshot scenes: each one stages a real moment of the game — a drive
// down the avenue, a walk through the plaza, a police chase, a mission run —
// from a fixed seed, so the same frame comes out every time.
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
    // On foot on the plaza sidewalk, next to a parked car, pedestrians nearby.
    game.player.x = 340;
    game.player.y = 960;
    game.player.angle = -Math.PI / 4;
    game.cam.x = game.player.x;
    game.cam.y = game.player.y;
    for (const spot of [
      { x: 420, y: 945, angle: 0 },
      { x: 470, y: 985, angle: Math.PI },
      { x: 380, y: 1010, angle: Math.PI / 2 },
    ]) {
      game.peds.push({
        x: spot.x, y: spot.y, angle: spot.angle, speed: 60, state: 'walk',
        color: '#d9a066', timer: 5, down: 0, axis: 'h', dir: 1,
      });
    }
    return { screen: 'play' };
  }
  if (name === 'chase') {
    // Three stars, three police cars closing in from behind.
    clearNear(game, 1500, 1500, 300);
    const car = createCar('sport', 1500, 1500, 0, '#d94f4f');
    car.driver = 'player';
    car.speed = 380;
    game.cars.push(car);
    game.player.car = car;
    game.player.x = car.x;
    game.player.y = car.y;
    addCrime(game, 55, 'chase');
    const spots = [
      { x: 1150, y: 1470, angle: 0 },
      { x: 1230, y: 1530, angle: 0 },
      { x: 1190, y: 1500, angle: 0.05 },
    ];
    for (const spot of spots) {
      const cop = createCar('police', spot.x, spot.y, spot.angle, '#1d2733');
      cop.driver = 'police';
      cop.speed = 420;
      game.cars.push(cop);
    }
    game.cam.x = car.x + 120;
    game.cam.y = car.y;
    return { screen: 'play' };
  }
  if (name === 'mission') {
    // Mission one, second step: drive the sedan to Marlin Garage.
    clearNear(game, 2700, 300, 250);
    startMission(game, 0);
    game.mission.step = 1;
    const car = createCar('sedan', 2700, 300, 0, '#c94f4f');
    car.driver = 'player';
    car.speed = 320;
    game.cars.push(car);
    game.player.car = car;
    game.player.x = car.x;
    game.player.y = car.y;
    game.cam.x = car.x + 120;
    game.cam.y = car.y;
    return { screen: 'play' };
  }
  // cover: cruising the avenue at sunset, mission one live, HUD and minimap up.
  clearNear(game, 1500, 300, 250);
  startMission(game, 0);
  game.mission.step = 1;
  const car = createCar('sport', 1650, 270, 0, '#2ec4b6');
  car.driver = 'player';
  car.speed = 340;
  game.cars.push(car);
  game.player.car = car;
  game.player.x = car.x;
  game.player.y = car.y;
  // A little traffic ahead on the same avenue.
  const ahead = [
    { x: 1900, y: 330, angle: 0, kind: 'taxi' },
    { x: 2120, y: 270, angle: 0, kind: 'sedan' },
    { x: 1300, y: 330, angle: 0, kind: 'truck' },
  ];
  for (const spot of ahead) {
    const c = createCar(spot.kind, spot.x, spot.y, spot.angle);
    c.driver = 'traffic';
    c.speed = 200;
    game.cars.push(c);
  }
  game.cam.x = car.x + 140;
  game.cam.y = car.y;
  return { screen: 'play' };
}

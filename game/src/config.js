// Sunset City — tuning numbers, palette and shared constants.
// Every number that shapes how the city feels lives here, in one place.

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The city is one square, WORLD.size pixels a side, on a regular road grid. */
export const WORLD = {
  size: 3600,
  pitch: 600,
  roadOffset: 300,
  roadWidth: 120,
  sidewalk: 26,
};

/** Where the browser keeps a save between visits (this browser only). */
export const SAVE_KEY = 'sunset-city.save.v1';

export const PLAYER = {
  radius: 13,
  walk: 235,
  run: 360,
  health: 100,
  punchRange: 46,
  punchDamage: 34,
  batRange: 62,
  batDamage: 60,
};

/** The starting point: the plaza by Sunset Pier, on foot, with a few parked cars nearby. */
export const SPAWN = { x: 330, y: 330, angle: -Math.PI / 4 };

/** Named places on the map, all on roads so a car can reach them. */
export const PLACES = {
  pier: { x: 300, y: 300, label: 'Sunset Pier' },
  plaza: { x: 900, y: 900, label: 'Sunset Plaza' },
  garage: { x: 3300, y: 300, label: 'Marlin Garage' },
  hotel: { x: 2100, y: 1500, label: 'Palma Hotel' },
  market: { x: 1500, y: 2700, label: 'Old Market' },
  docks: { x: 300, y: 3300, label: 'Harbor Docks' },
  hospital: { x: 2700, y: 2100, label: 'City Hospital' },
  station: { x: 900, y: 2100, label: 'Police Station' },
  beach: { x: 300, y: 1500, label: 'Boardwalk Beach' },
  bank: { x: 2700, y: 300, label: 'Sunset Bank' },
  safehouse: { x: 3300, y: 2700, label: 'Safe House' },
  park: { x: 1500, y: 1500, label: 'Sunset Park' },
};

/** Heat thresholds: how much heat each wanted star needs. */
export const WANTED = {
  thresholds: [0, 12, 30, 55, 80, 105],
  stealCar: 14,
  hitPed: 16,
  hitCar: 5,
  punchPed: 8,
  decayPerSecond: 1.6,
  decayDelay: 8,
};

/** Sunset palette: warm asphalt, long shadows, orange evening light. */
export const PALETTE = {
  ground: '#6b5a49',
  park: '#5d7a4a',
  parkDark: '#4d6839',
  road: '#33302f',
  roadEdge: '#4a423c',
  lane: '#d8c27a',
  sidewalk: '#8a7f74',
  crosswalk: '#cfc4b2',
  buildingRoof: '#8a6f5c',
  text: '#f5efe4',
  muted: '#c9bda9',
  gold: '#f2c230',
  red: '#d94f4f',
  teal: '#2ec4b6',
  policeBlue: '#3f7de0',
  policeRed: '#e23b3b',
  marker: '#ffd23f',
  health: '#58d68d',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

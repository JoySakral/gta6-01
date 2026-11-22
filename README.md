# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/JoySakral/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/JoySakral/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunset City — an original 2D top-down open-world crime game in plain HTML/CSS/JS canvas. Walk and drive a sun-soaked city, steal cars, dodge the police under a 5-star wanted system, run four story jobs for the fixer Mara Voss, take taxi fares, race the pier time trial, and save your progress. Built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

## Run it

Serve `game/` with any static server, then open the page in desktop Chrome:

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080
```

No build step, no network requests, no assets to download — every sprite is drawn in code and every sound is synthesized with WebAudio.

## Controls

- **WASD / arrows** — walk (Shift to run) or drive
- **E** — get in a car / steal it / get out
- **Space** — punch (pick up the bat by Marlin Garage for a harder hit)
- **P / Esc** — pause · **M** — mission list · **T** — call a taxi fare

## The game

- **A city on foot and by car** — a 6×6 road grid with buildings, parks, crosswalks and lit windows at sunset.
- **Traffic and pedestrians** — cars follow the roads and slow for each other; people stroll the sidewalks and flee from danger.
- **Stealing cars** — walk up to a parked or traffic car and press E; the driver bails out.
- **Wanted 0–5 stars + police** — crimes raise heat; police cars spawn, chase and ram; lose them and the heat cools off. Get caught on foot and you are busted.
- **Missions and story** — Rio, a newcomer driver, does four jobs for Mara Voss, each with objectives, a map marker, a reward and a briefing. Free-roam taxi fares and a three-checkpoint time trial fill the gaps.
- **Combat** — fists, and a bat pickup by the garage.
- **HUD with a live minimap** — cash, health, wanted stars, speed, objective text and a minimap showing the player, cars, police and the mission marker.
- **Start and save** — title screen with the story intro, and a save (cash, jobs done, position) in localStorage with Continue.
- **Polish** — sunset lighting with long shadows, engine/skid/siren sounds synthesized in WebAudio, skid smoke, sparks and collision particles, pause and mission-complete screens.

## Screenshots

`?shot=cover|play|chase|mission` (with `&seed=N`) stages a scene from a fixed seed for screenshots.

## License

MIT — see LICENSE.

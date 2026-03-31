# 🎈 Sh👀tBall👀n

A vibe-coded water balloon battle game by **Julia Forest**.

Play it in your browser — no install, no dependencies, pure HTML/CSS/JS.

---

## 🎮 How to Play

First player to land **10 hits** wins.

| Mode | Description |
|------|-------------|
| 1 Player | You vs the AI |
| 2 Players | Local multiplayer on the same keyboard |

### Controls

| Action | Player 1 | Player 2 |
|--------|----------|----------|
| Move | `A` / `D` | `←` / `→` |
| Aim cannon | `W` / `S` | `↑` / `↓` |
| Throw balloon | `T` | `M` |

---

## ✨ Features

- **16 playable characters** — Boy, Girl, Princess, Prince, Frog, Panda, Fox, Cat, Dog, Unicorn, Robot, Ghost, Wizard, Hero, Mermaid, Dragon
- **8 cannon types** — Classic, Disco, Speed ⚡, Mega 🎳, Penguin 🐧, Rainbow 🌈, Ice ❄️, Fire 🔥 — each with unique stats (speed, reload, balloon size)
- **10 worlds** — Sunny Meadow, Night Sky, Dark Castle, and more, each with hand-drawn animated backgrounds and a unique obstacle
- **3 AI difficulty levels** — Easy, Medium, Hard (with obstacle-aware aiming)
- **Full trajectory preview** — real-time dotted arc showing exactly where your balloon will land, including obstacle deflections
- **MegaBall power-up** 🌈 — a giant rainbow ball that appears randomly mid-game; catch it to unleash a slow, powerful shot that bounces once and deals 5× damage
- **Live side panels** — shows each player's character, cannon, HP, shots fired, hits landed and MegaBall status during the game
- **Animated menu** with floating card, K-pop synth music, and a floating background

---

## 🕹️ Running Locally

Just open `index.html` in any modern browser:

```bash
open index.html
```

Or serve it with any static server:

```bash
npx serve . -p 3000
```

---

## 🛠️ Tech Stack

- **Pure HTML / CSS / JavaScript** — zero frameworks, zero dependencies
- **Canvas 2D API** for all game rendering
- **Web Audio API** for synthesised sound effects and menu music

---

*Created by Julia Forest*

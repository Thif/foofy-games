# Stick Stack 🏗️

A physics-based puzzle game where you remove sticks from a structure — without letting the **red stick** collapse!

## How to Play

1. A structure made of sticks is displayed on screen
2. One stick is **red** — this is the target stick you must protect
3. Click any other stick to remove it
4. Remove as many sticks as you can before the red stick falls
5. Your score = number of sticks successfully removed

## Levels

| Level    | Difficulty | Description                    |
|----------|------------|--------------------------------|
| Tower    | Easy       | A simple layered tower         |
| Bridge   | Medium     | A bridge with pillars & deck   |
| Pyramid  | Hard       | A multi-row pyramid structure  |
| Random   | Varies     | Randomly generated structure   |

## Running Locally

No build step required — just open `index.html` in a browser, or serve it:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080).

## Tech Stack

- **HTML5 Canvas** for rendering
- **[Matter.js](https://brm.io/matter-js/)** for 2D rigid-body physics
- **Vanilla CSS & JS** — no build tools needed

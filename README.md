# WHACK-A-WAVE

**An Arcade Game About Controlling the Basic Reproduction Number**

A 60-second arcade strategy edutainment game where the player controls pandemic waves by managing Rₜ (the basic reproduction number) across multiple regions using different public-health interventions, learning how timing, strategy, and intervention choice affect outbreak dynamics.

## Core Educational Concept

**What Is Rₜ?**
- Rₜ (R-t) is the basic reproduction number at time t
- It means: how many people, on average, one infected person infects right now
- Rₜ > 1 → cases increase (wave grows)
- Rₜ < 1 → cases decrease (wave shrinks)

## How to Play

### Win Condition
Keep the **Average Rₜ below 1 for 8 consecutive seconds** before the 60-second timer runs out.

### Interventions
Select an intervention type, then click a region to apply it:

| Intervention | Rₜ Reduction | Deploy Delay | Duration | Cooldown | Rebound |
|--------------|--------------|--------------|----------|----------|---------|
| 🟦 Mask Mandate | -0.20 | 1.0s | 5s | 6s | +0.05 over 4s |
| 🟩 Vaccine Push | -0.35 | 3.0s | 8s | 10s | +0.10 over 10s |
| 🟥 Lockdown | -0.60 | 0.75s | 3s | 12s | +0.20 over 4s |

### Rules
- Multiple regions can have interventions at the same time
- Each region can have only ONE intervention active
- Each intervention type has its own cooldown
- When interventions end, transmission returns gradually (rebound)

### Drift Mechanics
- Baseline drift: Rₜ increases +0.008 per second
- If 3+ regions have Rₜ > 1.2, drift increases to +0.015
- Drift pauses when Average Rₜ < 1

## Project Structure

```
├── index.html          # Game shell
├── src/
│   └── main.js         # All game scenes and logic
│       ├── WelcomeScene    # Title screen
│       ├── TrainingScene   # Interactive tutorial
│       ├── GameScene       # Main gameplay
│       └── EndScene        # Results screen
└── assets/             # (No external assets - all graphics drawn in code)
```

## Game Flow

1. **Welcome Screen** - Narrative setup (Year 2029, COVID resurgence)
2. **Training Simulation** - 8-step interactive tutorial teaching Rₜ concepts and interventions
3. **Level 1** - 6 regions, 60 seconds, manage transmission
4. **End Screen** - Stats and retry option

## Visual Style

- Dark neon aesthetic with pulsing wave animations
- Color-coded Rₜ levels:
  - 🟢 Green: < 0.95
  - 🟡 Yellow: 0.95 - 1.05
  - 🟠 Orange: 1.05 - 1.20
  - 🔴 Red: > 1.20

## Technical Details

- Built with Phaser 3.90
- No external assets required (all graphics are procedurally drawn)
- Mouse/touch input only (no keyboard controls needed)
- Responsive scaling to fit any screen size

## Running the Game

Open `index.html` in a modern web browser. No build step required.

## Credits

Created as an educational game to teach pandemic management concepts through interactive gameplay.


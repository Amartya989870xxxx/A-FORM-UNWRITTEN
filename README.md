# A FORM UNWRITTEN

> *"An immortal soul. An unfinished form. A story yet to be written."*

**A FORM UNWRITTEN** is an atmospheric 2D dark-fantasy narrative exploration and puzzle-platformer prototype built for desktop browsers with **Phaser 3**, **TypeScript**, and **Vite**.

---

## Game Overview

You awaken upon **The Shattered Verge**—immortal, nameless, and physically incomplete. Convinced that your original existence was stolen, you set out to recover lost **Remnants** of your being.

Every restoration carries real consequences:
- **Before restoring Weight (*Unbound Outline*):** You are an incomplete, translucent silhouette able to drift gently through the air and ride rising wind currents across high chasms—yet ancient stone mechanisms and heavy monoliths barely register your presence.
- **After restoring Weight (*Grounded Vessel*):** Golden seams bind your form into physical substance. The sky releases you—floating and wind-riding are lost—while your newfound mass depresses heavy counterweights, moves runic granite monoliths, and shatters weakened rune-slabs via **Ground Impact**.

Along the journey, encounters leave lasting **Imprints** (*Resonance* — Becoming vs. *Resolve* — Original Self), posing the central philosophical conflict of the game:

> *"He began his journey to discover who he was. He never expected to discover who he could become."*

---

## Installation & Development Commands

### Prerequisites
- **Node.js** `>= 20` and **npm**

### Setup
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in a modern desktop browser.

### Typecheck & Production Build
```bash
npm run build
npm run preview
```

### Run Automated Tests
```bash
# Core progression systems unit suite (Vitest)
npm test

# End-to-end headless Chrome gameplay verification (requires dev server running on :5173)
npm run verify:e2e
```

---

## Controls (Desktop Keyboard + Mouse UI)

| Input | Action |
|---|---|
| `A` / `Left Arrow` | Move left |
| `D` / `Right Arrow` | Move right |
| `Space` | Jump (variable height; coyote time & jump buffer enabled) |
| `Hold Space` *(airborne, pre-Weight)* | Drift / slow descent & rise inside glowing wind currents |
| `S` / `Down Arrow` + `Space` *(airborne, post-Weight)* | **Ground Impact** — plunge to shatter fractured rune-slabs |
| `E` | Interact / Converse / Attune Conduits / Read Echo Tablets |
| `1` / `2` or `W/S` + `Space` *(in dialogue)* | Select dialogue choices (mouse click also supported) |
| `J` | Toggle **Chronicle (Journal)** — Remnants, Imprints, Quests & Echo Tablets |
| `M` | Toggle procedural ambient audio & sound effects |
| `Escape` | Toggle Pause Menu / Close overlays |

---

## Current Vertical Slice Features (Chapters 0–5)

- **Main Menu (`MenuScene`):** Animated parallax twilight backdrop, *Continue Journey* checkpoint detection, *Begin New Journey*, *Controls & Premise* modal, and audio mute toggle.
- **Chapter 0 (`AwakeningScene`):** Interactive minimalist opening sequence introducing the incomplete immortal protagonist.
- **Playable Interconnected World (`GameScene` — *The Shattered Verge*):**
  - **Zone 1 — The Whispering Precipice:** Movement/jump/updraft tutorial and foreshadowed heavy counterweight courtyard.
  - **Zone 2 — The Forgotten Mechanism:** Encounter with **Oren, the Hollow Chronicler** and **Puzzle 1 (Wind-Spire Conduit Alignment)** using wind-vane redirection, thermal updrafts, and slow-descent floating.
  - **Zone 3 — The Crucible of Mass:** In-engine **Remnant of Weight** restoration sequence, permanent visual metamorphosis, audio register shift, and ability trade-off overlay.
  - **Zone 4 — A Changed World:** Ground Impact descent into the Return Gallery, reactive post-restoration dialogue with Oren, and revisiting Zone 1's Courtyard with newfound physical mass.
  - **Zone 5 — The Sunken Sanctum & Cradle of First Names:** **Puzzle 2 (Counterweight & Calcified Vault Chamber)**, emotional encounter with **Vespera, the Bound Warden**, meaningful player decision granting an **Imprint of Experience**, and the **Fractured Mirror-Arch** threshold revelation.
- **Prototype Ending (`EndingScene`):** Inner-chains origin hook, personalized Imprint reflection, Echo Tablet tally (`3` optional hidden steles), and one-click replay/restart.
- **Chronicle (`[J]`) & Validated LocalStorage Save System:** Schema-checked auto-saves at major checkpoints with automatic corruption recovery.


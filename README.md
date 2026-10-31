# A FORM UNWRITTEN

> *"An immortal soul. An unfinished form. A story yet to be written."*

**A FORM UNWRITTEN** is an atmospheric 2.5D dark-fantasy exploration, narrative discovery, and environmental puzzle-platforming RPG built for desktop browsers with **Phaser 3**, **TypeScript**, and **Vite**.

This repository contains **Chapter One: The Shattered Verge**, the playable opening chapter and architectural foundation of a multi-continent fantasy adventure.

---

## Canonical Premise & Character Identity

You awaken upon **The Shattered Verge** as an immortal existence **without a physical biological body** and without memory of your past.

* **The Stabilizing Garment:** You are not a human wearing enchanted clothing. Your visible presence in the physical world is sustained by an extraordinary **charcoal and dark-ash layered garment** stitched with kintsugi-gold seams, a parchment-lined flowing mantle, and swept silver-ash folds concealing a dark void where a face would be. Nobody in the opening chapter knows who wove the garment or why it binds you.
* **Transformative Stabilization (`Remnant of Weight`):**
  * **Unanchored State *(Pre-Weight)*:** Your garment drifts effortlessly on the wind and rises inside glowing air currents across high chasms, yet heavy stone plinths and runic monoliths barely register your step.
  * **Grounded State *(Post-Weight)*:** After solving the **Wind-Spires**, traversing the **Shattered Sky-Arch**, and unlocking the **three Stabilization Seals** inside the **Crucible of Mass**, a ceremonial warning confirms your irreversible transition before your garment anchors to the physical earth. Floating and wind-riding are surrendered in exchange for depressing heavy counterweights, pushing runic granite monoliths, shattering weakened rune-slabs via **Ground Impact**, and engaging **Grounded Counterweight Lifts** to revisit elevated spires and optional discoveries.
* **Identity & Consequence:** Choose a name for your journey (defaulting to *The Unwritten*), chart fog-of-war ruins on the **Cartographic World Atlas**, uncover optional hidden relics, and face **Vespera, Warden of the First Names**, whose **Memory Crucible** poses the philosophical heart of the game:

> *"What if reclaiming your original state means surrendering everything you have chosen to become along the way?"*

For complete worldbuilding, continental lore, factions, Soul Spectrum affinities, the Black Orb, and quest taxonomy, see:
* [`WORLD_BIBLE.md`](./WORLD_BIBLE.md)
* [`QUEST_DESIGN.md`](./QUEST_DESIGN.md)
* [`DECISIONS.md`](./DECISIONS.md)
* [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)
* [`qa/release-readiness/RELEASE_READINESS_AUDIT.md`](./qa/release-readiness/RELEASE_READINESS_AUDIT.md)
* `design-references/` *(preserved original concept & composition reference sheets, excluded from `dist/` production bundles)*

---

## Installation & Development Commands

### Prerequisites
* **Node.js** `>= 20` and **npm**

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

### Run Automated Verification
```bash
# Core progression, Save v1->v2 migration, Exploration & punctuation unit suite (Vitest)
npm test

# Full HD (1920x1080) end-to-end headless Chrome gameplay verification (Playwright)
npm run verify:e2e
```

---

## Controls (Desktop Keyboard + Mouse UI)

| Input | Action |
| :--- | :--- |
| `A` / `Left Arrow` | Move left |
| `D` / `Right Arrow` | Move right |
| `Space` | Leap (variable height; coyote time & jump buffer enabled) |
| `Hold Space` *(airborne, Unanchored State)* | Drift slowly on air & ascend glowing wind currents |
| `S` / `Down Arrow` + `Space` *(airborne, Grounded State)* | **Ground Impact**: plunge to shatter fractured amber rune-slabs |
| `E` | Interact / Converse / Attune Conduits / Inspect Reliquaries |
| `Tab` | Toggle **Cartographic World Atlas** (`[1]` Regional Survey / `[2]` World Continents / `[V]` Switch) |
| `J` | Toggle **Chronicle (Journal)**: Quests, Rank, Mystery Age, Relics, Remnants & Hints (`[H]`) |
| `1` / `2` or `W/S` + `Space` *(in dialogue)* | Select dialogue choices (mouse click also supported) |
| `M` | Toggle procedural ambient audio & sound effects |
| `Escape` | Toggle Pause Menu / Close active overlay |

---

## Chapter One Features (*The Shattered Verge*)

* **Full HD `1920 x 1080` Cinematic 2.5D Presentation:** Dual-camera rendering (`WORLD_CAMERA_ZOOM = 1.42` gameplay camera + dedicated `1:1` crisp `UICamera`), multi-layer atmospheric ruins, Broken Ring-Monolith horizon, flickering warm braziers, cascading waterfalls, and foreground parallax silhouettes.
* **Player Naming (`<dialog>` Modal):** Native accessible name inscription on *Begin Journey* persisted across saves, HUD, Atlas, Chronicle, and NPC dialogue.
* **Expanded 6-Stage Main Quest (*Echoes of Substance*):**
  1. Inspect the **Surveyor Stele** east of Oren's Observatory.
  2. Attune the **North Wind-Spire Conduit** and redirect the **East Wind Vane** to reach the **East Balcony Conduit**.
  3. Cross the **Shattered Sky-Arch** above the clouds and ring the **Aerial Resonance Bell**.
  4. Enter the **Crucible of Mass** and release all **three Dome Stabilization Seals** (*West Lever*, *East Harmonic Dial*, and high *Zenith Cupola Keystone* via the newly ignited dome thermal) to uncage the **Remnant of Weight**.
* **Optional Hidden Discovery Quest (*Threads of the Silent Loom*):** Unmarked Rank `F` (`1,000-Year Mystery`) side investigation across hidden corners of the Verge, rewarding the Rare Relic **Wayfarer's Compass-Lens** (`+45%` World Atlas fog-of-war reveal radius plus subtle proximity resonance highlighting nearby undiscovered inscriptions within `480px`) and `+4` Silver Soul Affinity.
* **Interactive Cartographic World Atlas (`[Tab]`):**
  * **Regional Survey:** Live `28 x 8` opaque dark-mist fog-of-war discovery, `10` inspectable Verge landmarks, and live wayfarer beacon.
  * **World Continents:** Four sculpted known continents (`18` total known regions) with honest regional vs. global exploration percentages, plus a fifth eastern horizon veiled in eternal black-violet tempest mist.
* **Progression & Save Safety (`SaveState` v2 & Confirmation Guards):** Schema-checked `localStorage` persistence with pre-Weight and post-Weight `v1 -> v2` save migration, non-destructive fallback recovery, coherent Oren-bypass quest tracking, and explicit Cancel/Confirm dialogues protecting against accidental save deletion.

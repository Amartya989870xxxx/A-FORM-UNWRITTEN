# ARCHITECTURE & DESIGN DECISIONS: A FORM UNWRITTEN

This document records significant technical, gameplay, narrative, and visual engineering decisions so any developer or AI model working on future chapters has complete architectural clarity.

---

## 1. Core Architecture & Rendering Decisions

### 1.1 Dual-Camera Full HD (`1920 x 1080`) Pipeline
* **Problem:** Upgrading the canvas from `1280 x 720` to `1920 x 1080` (`1.5x` pixel dimensions) without adjusting camera zoom would shrink the protagonist on screen and expose overly wide puzzle rooms, while zooming a single camera would blur HUD/Journal text.
* **Solution (`src/game/scenes/GameScene.ts`):**
  * `cameras.main` runs at `WORLD_CAMERA_ZOOM = 1.42`, preserving intimate character framing and exact Arcade Physics jump kinematics across the expanded `5500 x 1420` world.
  * Fixed `scrollFactor(0)` sky and `1920px`-wide parallax textures apply `.setScale(1 / WORLD_CAMERA_ZOOM)` so background artwork renders at crisp `1:1` native Full HD pixels without cropping or upscaling blur.
  * A dedicated `UICamera` (`zoom = 1.0`, `scroll = 0, 0`) renders `HUD`, `DialogueBox`, `WorldMap`, `Journal`, `PauseMenu`, `RestorationOverlay`, and `vignetteImage` at razor-sharp native `1920 x 1080` resolution, with strict `cameras.main.ignore(uiRoots)` and `syncUiCameraIgnores()` isolation.

### 1.2 Native Accessible `<dialog>` for Player Naming
* **Decision (`index.html`, `src/style.css`, `src/game/ui/NamePrompt.ts`):** Used a native `<dialog id="name-dialog">` with `<form method="dialog">` rather than reinventing canvas text-input caret/IME handling inside WebGL.
* **Key Safeguards:**
  * Placed `<button type="submit" value="confirm">` first in DOM order so pressing `Enter` inside `<input id="player-name-input">` natively submits `confirm`.
  * Guarded IME composition (`event.isComposing`), temporarily suspended Phaser's keyboard manager while typing so `Space`/`W`/`A`/`S`/`D` never fire menu actions behind the modal, and reset `dialog.returnValue = ''` immediately on close so `Escape` dismissals never leak stale confirm states.

### 1.3 Schema-Validated `SaveState` v2 & Seamless v1 Migration
* **Decision (`src/game/systems/SaveManager.ts`):** Upgraded saves to `version: 2` while writing a deterministic `migrateV1ToV2()` converter.
* **Coordinate & Rank Remapping:** Because inserting the **Shattered Sky-Arch** (`x: 3320..4120`) shifted the **Crucible of Mass** and **Cradle of First Names** eastward, `SaveManager` differentiates **post-Weight** vs. **pre-Weight** legacy `v1` saves:
  * **Post-Weight `v1` saves** migrate with `adventurerRank: 'F'`, shift eastern Crucible coordinates `+1040px` (`3440 -> 4480`) and lower Sanctum coordinates `+760px`, and reconcile `sky_bell_rung` + `crucible_lock_*` + `crucible_unsealed` flags.
  * **Pre-Weight `v1` saves** migrate with `adventurerRank: 'G'` and are **never** shifted inside the newly sealed Crucible (`x >= 4120`); eastern upper-level pre-Weight saves land safely on the Sky-Arch threshold (`x = 3268, y = 514` if both Wind-Spire conduits were attuned, or `x = 3168, y = 514` west of the Outer Spire Gate if not).
  * Incomplete saves with recoverable progress fields fall back safely without calling `localStorage.removeItem(...)` on valid JSON objects.

### 1.4 DOM-Free Pure Systems for Fast Vitest Verification
* **Decision (`src/game/systems/`):** Core systems (`ExplorationManager`, `QuestManager`, `DialogueManager`, `RemnantManager`, `ImprintManager`, `SaveManager`) avoid runtime DOM/Canvas globals (`import type Phaser from 'phaser'` and `Math.hypot`), allowing `npm test` to execute all unit, migration, cartography, and source-wide punctuation audits in `< 400ms` in Node.

### 1.5 Modular Environment Architecture & Platform Body Freeze (Phase 2)
* **Problem:** Environmental rendering, platform skins, props, mist, and parallax positioning were concentrated inside `GameScene.ts`, creating tight coupling between game progression logic and visual rendering, hindering multi-biome expansion.
* **Solution (`src/game/environment/`):**
  * Created `EnvironmentRenderer` as an orchestrator managing `ParallaxLayer`, `TerrainSkinner`, `PropPlacer`, and `AtmosphereFX`.
  * Preserved the immutable 45 platform colliders in `WORLD_PLATFORMS`, decoupling the visual skins drawn by `TerrainSkinner` from static Arcade Physics collision bodies.
  * Separated decorative parallax layers (`scrollFactorX < 1.0`, `depth < 10`) from gameplay collision planes (`depth 16+`, `scrollFactorX = 1.0`).
  * Implemented `isLegacyEnvironmentMode` (`?env=legacy`) allowing instant regression testing against the legacy inline rendering pipeline without duplicate game objects.
  * Utilized `import type Phaser from 'phaser'` across all environment modules to maintain Node testability in Vitest without requiring jsdom or triggering Phaser browser device detection.

---

## 2. Character Canon & Gameplay Redesign Decisions

### 2.1 Enforcing the Stabilizing Garment Canon (`src/game/entities/Player.ts`)
* **Canon Rule:** The protagonist has no biological body; his visible manifestation is the **charcoal-and-gold Stabilizing Garment**, and the cyan/multicolored astral essence must never be rendered as the playable character model.
* **Implementation:** Replaced the earlier translucent cyan humanoid outline with a consistent side-view **Stabilizing Garment** renderer across both **Unanchored State** and **Grounded State**:
  * Layered charcoal/dark-ash tunic and split robes, warm parchment-ash inner mantle lining, antique gold waist-ring clasp, cloth-wrapped boots, swept silver-ash cowl folds around a completely dark void visage, and kintsugi-gold seams.
  * Multi-segment trailing mantle physics spreads into a wide glider silhouette during airborne float (`Unanchored State`) and settles into a weighted, earthbound drape after reclaiming Weight (`Grounded State`), with instant node-snap protection if the player respawns or teleports `> 85px`.

### 2.2 Multi-Stage Remnant Journey & Crucible Containment (`Echoes of Substance`)
* **Problem:** Allowing the player to claim the Remnant of Weight immediately upon opening the Wind-Spire gate undercut the sense of earning a 3,000-year stabilization rite.
* **Solution:**
  1. Added diegetic architectural clue-gathering at the **Surveyor Stele** (`survey_stele`).
  2. Expanded upper traversal with the high-altitude **Shattered Sky-Arch** and **Aerial Resonance Bell** (`sky_bell`).
  3. Encased `remnant_weight` inside three visible crimson-bronze containment rings (`getLockCountRemaining()`) and blocked early interaction until the player releases the **West Lever**, aligns the **East Harmonic Dial** (igniting the central **Crucible Dome Updraft**), and ascends to unseal the **Zenith Cupola Keystone**.

### 2.3 Honest Regional vs. Continental Cartography (`ExplorationManager.ts`, `WorldMap.ts`)
* **Regional Fog of War:** Maps *The Shattered Verge* onto a `28 x 8` grid filtered by `REACHABLE_VERGE_CELLS` (excluding solid bedrock so 100% regional discovery is genuinely achievable) plus `10` named landmarks.
* **Continental Scaling & Secret Fifth Continent:** Models `18` total regions across the `4` known continents (`100%` of the Shattered Verge = `5.56%` of the Known World) while rendering the **Fifth Secret Continent** (`cont_veiled_abyss`, `totalRegions: 0`) strictly as a swirling black-violet tempest shroud on the far-eastern sea, keeping its existence a genuine visual mystery rather than a percentage spoiler.

### 2.4 Orthogonal Rank (`G` to `S`) vs. Mystery Age & Punctuation Discipline
* Separated **Adventurer Rank** (operational hazard/complexity) from **Mystery Age** (`10-Year` through `Million-Year / Ancient Epoch`) in `QuestDefinition`, HUD, and Chronicle.
* Replaced all Unicode em dashes (`U+2014`) and en dashes (`U+2013`) across every source file, UI string, dialogue node, and HTML shell with clean colons, commas, periods, or parentheses, backed by an automated regression test in `src/game/__tests__/systems.test.ts`.

### 2.5 Release-Readiness Hardening Decisions
* **Single-Authority Canvas Centering (`src/style.css`, `src/game/config.ts`):** Removed CSS Grid/Flexbox centering from `#game-shell` and `#game-container` so Phaser `Scale.FIT` + `Scale.CENTER_BOTH` is the sole centering authority, eliminating `3:1` margin+flexbox asymmetry on `21:9`, `16:10`, and `4:3` displays.
* **Non-Destructive Confirmation Modal (`src/game/ui/ConfirmModal.ts`):** Added a reusable in-canvas confirmation dialogue defaulting focus to `Cancel` (`index 0`) before any destructive save action (*Begin New Journey*, *Restart Chapter One*, *Replay Chapter One*) and before anchoring the *Remnant of Weight*.
* **Optional Sky-Discovery Preservation (`waystone_lift` Grounded Counterweight Lifts):** Paired the pre-Weight stabilization warning with four post-Weight **Grounded Counterweight Lifts** so players who claim Weight before finding high-spire Echo Tablets or upper fog-of-war cells never permanently lose optional discoveries, while keeping optional collectibles strictly non-mandatory.
* **Wayfarer's Compass-Lens Proximity Resonance (`Interactable.ts`, `GameScene.ts`):** Implemented the Relic's secondary effect as a restrained kintsugi-gold shimmer on undiscovered `echo` and `loom_clue` interactables within `480px` plus a subtle outer astrolabe directional arc around the Stabilizing Garment when equipped.
* **Reference Artwork Packaging Hygiene (`design-references/`):** Moved internal concept and composition sheets from `public/assets/reference/` to top-level `design-references/`, preserving all reference PNGs in Git while keeping `dist/` free of unused `10.3 MB` development assets.
* **Atmosphere and Time-of-Day Architecture (Phase 1):** Implemented continuous 24-hour atmosphere interpolation across six core stages (Dawn, Morning, Day, Golden Hour, Sunset, Night) powered by pure `TimeOfDayService` and `LightingController`.
* **Separate Settings Persistence (`auf_settings_v1`):** Decoupled visual atmosphere preferences (mode, fixed phase, cycle duration, quality) from `SaveState` v2 (`auf_save_v1`), ensuring zero save migration risk or save state bloat.
* **Throttled Dynamic Rendering and Readability Floors:** Dynamic sky canvas repaints and atmosphere sampling are throttled (~250-1200ms) with zero per-frame canvas allocation. Moonlit night style enforces a 0.65 ambient brightness floor so platforms, interactables, and the bodiless Stabilizing Garment remain crisply readable. The 1:1 Full HD UICamera is excluded from all world tints.

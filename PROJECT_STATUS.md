# PROJECT STATUS: A FORM UNWRITTEN

**Last Updated:** 2026-10-31  
**Current Milestone:** Chapter One Release-Ready (*The Shattered Verge* Full HD RPG Foundation + All Release Audit Fixes Verified)

---

## 1. Completed Features

- [x] **Engine & Core Systems Preserved:** Phaser 3 + TypeScript + Vite architecture maintained with responsive movement, coyote time, jump buffering, Web Audio synthesis (`AudioManager`), branching dialogue (`DialogueManager`), and non-combat exploration focus.
- [x] **Canonical Stabilizing Garment Protagonist (`src/game/entities/Player.ts`):**
  - Bodiless immortal presence rendered exclusively through the layered charcoal and dark-ash **Stabilizing Garment** with parchment-ash inner mantle lining, swept silver-ash crest folds concealing a dark void face, antique gold waist-ring clasp, cloth-wrapped boots, and kintsugi-gold seams.
  - Zero exposed human skin, eyes, or cyan astral humanoid body in gameplay; higher beings (such as Vespera) reference the unsettled multicolored astral prism beneath the seams while keeping the garment's origin an unresolved mystery.
  - Multi-segment physics-driven mantle with teleport/respawn snap protection, airborne glider spread in **Unanchored State**, and heavier grounded stride + Ground Impact shockwave in **Grounded State**.
- [x] **Player Naming & SaveState v2 (`src/game/ui/NamePrompt.ts`, `src/game/systems/SaveManager.ts`):**
  - Native accessible HTML `<dialog id="name-dialog">` modal on *Begin Journey* (defaulting to `'The Unwritten'`), reflected in HUD, World Atlas, Chronicle, Pause Menu, NPC dialogue, and Chapter One ending, plus Cancel/Confirm confirmation dialogues (`src/game/ui/ConfirmModal.ts`) guarding *Begin New Journey*, *Restart Chapter One*, and *Replay Chapter One* against accidental save deletion.
  - `SaveState` upgraded to `version: 2` (persisting `playerName`, `adventurerRank`, `discoveredCells`, `discoveredLocations`, `relics`, `soulAffinities`, `blackOrbUsedCount`, and `garmentOriginMystery: 'unresolved'`) with hardened pre-Weight (`Rank G`, safe Sky-Arch placement) and post-Weight (`Rank F`, reconciled Crucible flags) `v1 -> v2` migration and non-destructive fallback recovery.
- [x] **Expanded Quest Arc & Optional Hidden Quest (`src/game/data/quests.ts`, `src/game/scenes/GameScene.ts`):**
  - Remnant of Weight is caged behind three concentric containment rings and **cannot be claimed early**; interacting once uncaged presents an explicit pre-stabilization confirmation modal warning that Unanchored Drift and wind ascent will be surrendered, while **Grounded Counterweight Lifts** awaken post-Weight so optional high-spire Echo Tablets and upper fog cells remain revisitable.
  - `Echoes of Substance` expanded into a 6-stage investigation across the **Surveyor Stele**, **Twin Wind-Spires**, **Shattered Sky-Arch** (*Aerial Resonance Bell*), and **Crucible of Mass 3-Lock Dome Puzzle** (*West Lever*, *East Harmonic Dial*, ignited central dome updraft, and *Zenith Cupola Keystone*), with coherent Oren-bypass quest self-healing in `QuestManager`.
  - Added optional Rank `F` (`1,000-Year Mystery`) Hidden Quest **Threads of the Silent Loom** (`hq_silent_loom`): recovering the *Frayed Gold Spool* (western Precipice) and *Astral Weaver Spindle* (Echoing Underwalk) unlocks the *Sealed Reliquary Loom* (Sunken Sanctum), awarding the Rare Relic **Wayfarer's Compass-Lens** (`+45%` map reveal radius plus subtle proximity shimmer and directional astrolabe arc for nearby undiscovered inscriptions within `480px`) and `+4 Silver` Soul Affinity.
  - Orthogonal **Adventurer Rank (`G` to `S`)** and **Mystery Age** labels displayed across HUD and Chronicle, with simultaneous non-overlapping HUD rows for active Imprint and equipped Compass-Lens relic.
- [x] **Interactive Cartographic World Atlas (`src/game/ui/WorldMap.ts`, `src/game/systems/ExplorationManager.ts`):**
  - Accessible via `[Tab]`, Chronicle button, and Pause Menu.
  - **Regional Survey:** Live `28 x 8` uniform opaque dark-mist fog-of-war grid across *The Shattered Verge* (with zero unexplored room silhouettes or route-line bleed), `10` discoverable landmarks with lore notes, and pulsing player pin.
  - **World Continents:** Four sculpted known continents (*Aethelgard & The Crown Reaches*, *Aurelia of the Ivory Spires*, *The Solis Aridlands*, *The Sylphic Marches* totaling `18` known regions) plus a fifth far-eastern landmass veiled in dynamic black-violet tempest mist (`totalRegions: 0`, excluded from standard Known World percentages).
- [x] **Full HD `1920 x 1080` Cinematic 2.5D Upgrade, Clean Packaging & Responsive Centering:**
  - Upgraded viewport to `1920 x 1080` (`WORLD_CAMERA_ZOOM = 1.42` for gameplay + `1:1` native `UICamera` for razor-sharp UI typography), verified with exact `1:1` symmetric centering across `16:9`, `21:9`, `16:10`, and `4:3` viewports (`1920x1080`, `1366x768`, `2560x1080`, `1440x900`, `1024x768`, `800x500`).
  - Moved reference concept sheets out of `public/` into `design-references/` at repository root, shrinking `dist/` production output from `14 MB` to `1.6 MB` while preserving all original reference artwork in Git.
  - Layered 2.5D bevelled stone platforms, Broken Ring-Monolith horizon, flickering warm braziers, animated waterfalls, non-occluding foreground parallax silhouettes, non-overlapping top-sky zone banners, and Chapter One conclusion framing (`EndingScene.ts`).
  - Removed all Unicode em dashes (`U+2014`) and en dashes (`U+2013`) across all game source files and HTML, enforced via automated `12`-test Vitest suite and expanded Full HD Playwright E2E verification.
- [x] **Worldbuilding, Quest Architecture & Release Audit Documentation:**
  - Authored [`WORLD_BIBLE.md`](./WORLD_BIBLE.md), [`QUEST_DESIGN.md`](./QUEST_DESIGN.md), and [`qa/release-readiness/RELEASE_READINESS_AUDIT.md`](./qa/release-readiness/RELEASE_READINESS_AUDIT.md).

---

## 2. Deferred / Future Chapter Scope

- **Chapter Two Region (*Ashenweld Frontier & Highcrown Citadel*):** Crossing the Fractured Mirror-Arch currently concludes Chapter One and saves completion state; physical traversal of Aethelgard's interior towns and first Adventurers' Guild Charter Hall begins in Chapter Two.
- **Playable Companion Recruitment & Black Orb Encounters:** Data models (`soulAffinities`, `blackOrbUsedCount`) and narrative hooks are in place; active companion traversal puzzles (*Lyra of the Brass Astrolabe*) and the first optional Black Orb anomaly are scheduled for Chapters Two and Three.
- **Runtime Keybind Remapping UI:** Desktop keyboard + mouse defaults are supported across all menus; customizable keybind remapping remains a future QoL addition.

---

## 3. Known Bugs

- None currently open. Vitest unit tests (`npm test`) and Full HD `1920 x 1080` Playwright headless Chrome verification (`npm run verify:e2e`) pass with zero console errors, zero uncaught exceptions, and zero failed network requests.

---

## 4. Next Implementation Steps (Chapter Two Kickoff)

1. **Ashenweld Frontier Hub & Guild Charter Hall:** Implement the Chapter Two arrival scene beyond the Fractured Mirror-Arch, featuring formal Rank `F -> E` Guild registration and Relic appraisal.
2. **First Companion (*Lyra*) Co-Op Environmental Puzzles:** Introduce dual-bell harmonic aqueduct puzzles in *Vaelen Sky-Aqueducts* where Lyra holds resonance nodes on player signal.
3. **Multi-Arc Seed II (*Cartography of the Black Tempest*):** Add the first censored eastern mariner log anomaly connecting Chapter One's *Wayfarer's Compass-Lens* to Aurelia's Ivory Cartographers.

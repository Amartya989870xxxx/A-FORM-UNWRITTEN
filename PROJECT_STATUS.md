# PROJECT STATUS — A FORM UNWRITTEN

**Last Updated:** 2026-10-31  
**Current Milestone:** Milestone 7 Completed (Playable Vertical Slice — Chapters 0 through 5)

---

## 1. Completed Features

- [x] **Milestone 1 — Foundation & Scenes:** Vite + TypeScript + Phaser 3 setup, responsive `16:9` viewport (`100dvw` / `100dvh`, forced dark color-scheme), `BootScene`, `MenuScene`, `AwakeningScene`, `GameScene`, and `EndingScene`.
- [x] **Milestone 2 — Dual-State Player Controller (`src/game/entities/Player.ts`):**
  - Responsive 2D Arcade Physics movement with acceleration/drag curves, `115ms` coyote time, `125ms` jump buffering, and variable jump height.
  - *Unbound Form (Pre-Weight):* Low gravity (`620`), slow-descent midair **Float** (`Hold Space`), and upward thermal lift inside `WindUpdraft` columns.
  - *Grounded Vessel (Post-Weight):* Grounded gravity (`1180`), floating and wind-lift disabled, **Ground Impact** plunge (`S / Down + Space` in midair), heavy block pushing, and pressure plate activation.
  - Distinct 60 FPS procedural vector/particle animations for both forms (drifting incomplete shadow-shards & cyan wisps -> solid obsidian-slate humanoid with articulated striding legs, flowing cloak, and kintsugi-gold chest seams).
- [x] **Milestone 3 — *The Shattered Verge* Environment (`src/game/data/world.ts`):**
  - 5 interconnected zones across a `4700 x 1360` world with 3-layer seamless parallax ruins + twilight starfield/fractured celestial ring, carved masonry platforms, glowing conduit traces, diegetic rune tutorials, and immortal safe-ledge reformation.
- [x] **Milestone 4 — Narrative, Quests & Puzzle 1:**
  - `QuestManager` (`NOT_STARTED` / `ACTIVE` / `COMPLETED`) driving 3 chained quests (`Whispers of the Verge`, `Echoes of Substance`, `The Weight of Becoming`) + 3 optional hidden **Echo Tablets**.
  - `DialogueManager` & `DialogueBox` supporting typewriter reveal, conditional dialogue branches, keyboard/mouse choice selection, and quest/imprint triggers.
  - **Oren, the Hollow Chronicler** (with distinct pre-Weight and post-Weight dialogue) and **Puzzle 1 (Wind-Spire Conduit Alignment)**.
- [x] **Milestone 5 — Remnant of Weight Restoration:**
  - Single-trigger restoration ceremony with camera zoom, spiraling golden fragments, sub-bass/harmonic audio transition, permanent form & physics switch, and `RestorationOverlay` detailing gained vs. surrendered capabilities.
- [x] **Milestone 6 — Post-Restoration Loop, Puzzle 2, First Choice & Ending:**
  - Ground Impact descent through `slab_crucible` into the Return Gallery back to Zone 1's Courtyard.
  - Courtyard dual counterweight unsealing (`HeavyBlock` + `PressurePlate` pair) + **Puzzle 2 (Sunken Causeway Calcified Vault & Counterweight Chamber)**.
  - **Vespera, the Bound Warden** encounter & philosophical choice awarding **Imprint of Resonance** (*Becoming*) or **Imprint of Resolve** (*Original Self*).
  - **Fractured Mirror-Arch** mystery hook and `EndingScene` summary + clean replay/restart.
- [x] **Milestone 7 — UI, Audio, Persistence & Verification:**
  - Minimalist `HUD`, two-column `Journal` (`[J]`), `PauseMenu` (`[Esc]`), procedural Web Audio synthesizer (`AudioManager`), schema-validated `SaveManager` with corrupted JSON recovery, Vitest unit suite (`src/game/__tests__/systems.test.ts`), and Playwright Chrome E2E verification (`scripts/verify-gameplay.mjs`).

---

## 2. Incomplete / Deferred Features (Beyond MVP Scope)

- **Custom Key Remapping UI:** Controls currently use sensible desktop defaults (`A/D` + Arrow keys, `Space`, `S+Space`, `E`, `J`, `M`, `Esc`); runtime keybind remapping is deferred to post-vertical-slice polish.
- **Hand-Illustrated Final Sprite/Audio Assets:** Visuals and audio currently use cohesive custom procedural canvas textures, dynamic vector/particle rendering, and Web Audio synthesis (see `DECISIONS.md` for asset replacement paths).
- **Future Regions & Remnants:** *The Forgotten Kingdom*, *The Realm of Echoes*, and *The Silent Expanse*—along with the Remnants of *Reflection*, *Voice*, *Memory*, *Emotion*, and *Form*—are planned for subsequent chapters.

---

## 3. Known Bugs

- None currently open. Automated unit tests and headless Chrome E2E verification confirm movement, float, updrafts, dialogue, quest chaining, single-trigger Weight restoration, float disabling, Ground Impact slab shattering, heavy block pushing, pressure plate activation, Imprint choice, LocalStorage save/reload, corruption recovery, ending reachability, and zero console/network errors.

---

## 4. Exact Next Implementation Tasks (For Next Session / Chapter II Expansion)

1. **Control Remapping Panel:** Extract input bindings in `GameScene.ts` into an `InputBindingManager` persisted to `localStorage` and expose a remapping tab inside `PauseMenu.ts` and `MenuScene.ts`.
2. **Bespoke Sprite & Audio Asset Drop-in Support:** Add optional sprite-sheet and `.ogg/.mp3` asset manifest loading in `BootScene.ts` (`src/assets/sprites/`, `src/assets/images/`, `src/assets/audio/`) while retaining `ArtGenerator` and `AudioManager` fallbacks.
3. **Region 2 Prototype (*The Forgotten Kingdom* — Remnant of Reflection):** Design the mirror-plane traversal mechanic where restoring *Reflection* reveals submerged/mirrored architecture while altering shadow-passthrough interactions.


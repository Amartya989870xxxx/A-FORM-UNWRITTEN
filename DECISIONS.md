# ARCHITECTURE & DESIGN DECISIONS — A FORM UNWRITTEN

This document records key engineering, gameplay, visual, and audio decisions made during the vertical slice implementation so any developer or AI assistant switching onto the project has full context.

---

## 1. Architecture Decisions

### 1.1 Modular Separation Without Over-Engineering
- **Entities (`src/game/entities/`)** encapsulate physics bodies and visual rendering (`Player`, `NPC`, `Interactable`, `WindUpdraft`, `HeavyBlock`, `PressurePlate`, `FracturedSlab`, `RunicGate`).
- **Systems (`src/game/systems/`)** are pure or event-driven TypeScript classes (`QuestManager`, `DialogueManager`, `RemnantManager`, `ImprintManager`, `SaveManager`, `AudioManager`) decoupled from Phaser rendering so they can be unit-tested directly in Vitest (`src/game/__tests__/systems.test.ts`).
- **Declarative Data (`src/game/data/`)** stores quest definitions (`quests.ts`), branching dialogue trees (`dialogues.ts`), and level geometry (`world.ts`) separately from scene orchestration (`GameScene.ts`).

### 1.2 Scene Restart Safety
- Phaser's per-scene `this.events` emitter persists across `scene.restart()`. `GameScene.create()` explicitly registers a `Phaser.Scenes.Events.SHUTDOWN` cleanup handler to clear custom `GAME_EVENTS` listeners, preventing duplicate HUD notifications or stale references across restarts.

### 1.3 Schema-Validated LocalStorage Persistence
- `SaveManager.ts` validates every field (`version === 1`, finite player coordinates, valid `imprint` union, non-null objects/arrays) on both `save()` and `load()`. If corrupted JSON or an incompatible schema is encountered, `SaveManager.load()` purges the bad entry and returns `null` rather than throwing a runtime exception.

---

## 2. Gameplay Design Decisions

### 2.1 Making Weight Restoration a True Transformation (Not a Stat Upgrade)
- **Pre-Weight (`PHYSICS_PROFILES.UNBOUND`):** `gravityY: 620`, `floatMaxFallSpeed: 58`, and `updraftMaxRiseSpeed: -275`. Allows effortless traversal of high vertical wind spires and wide chasms in Zones 1–2, while `HeavyBlock` (`pushable = false, immovable = true`), `PressurePlate` (diegetic *"you carry no weight"* feedback), and `FracturedSlab` ignore the player.
- **Post-Weight (`PHYSICS_PROFILES.GROUNDED`):** `gravityY: 1180`, floating and wind-updraft lift disabled, **Ground Impact** (`S / Down + Space` in midair) enabled, `HeavyBlock` pushing enabled, and `PressurePlate` activation enabled.
- **Re-Contextualizing Existing Space (Chapter 4):** Rather than funneling forward through a linear hallway, restoring Weight drops the player through the fractured Crucible floor into a Return Gallery leading back to Zone 1's opening courtyard. There, the very Updraft Chasm used in minute 1 can no longer lift the player, while the previously unresponsive Courtyard Monolith & Dual Pressure Plinths now unseal the subterranean **Sunken Sanctum**.

### 2.2 Anti-Softlock Level Engineering
- Every jump gap and step height in `src/game/data/world.ts` was tuned against exact kinematics (Unbound jump apex `~139px` + float glide vs. Grounded jump apex `~117px`, horizontal span `~209px`; vertical stair steps kept to `58–75px`).
- Pushable `HeavyBlock` entities are constrained to safe `[minX, maxX]` horizontal stone tracks so they cannot fall off cliffs or wedge irreversibly against walls, supplemented by nearby **Reset Runic Monolith** pedestals (`Interactable` kind `'reset_rune'`).
- Courtyard and Sanctum dual-seal gates **permanently latch open** once all required seals are simultaneously satisfied, preventing players from locking themselves out when stepping off a plate to walk through the gate.

### 2.3 Non-Binary Philosophical Choice (Chapter 5)
- In **The Cradle of First Names**, **Vespera, the Bound Warden** presents a genuine dilemma without a "good vs. evil" framing:
  - **Lend Your Weight (*Imprint of Resonance* — Becoming):** Preserves a fragile mortal hearth-memory in the present at the cost of clarity about your past.
  - **Reclaim the Echo Core (*Imprint of Resolve* — Original Self):** With Vespera's peaceful consent, releases her centuries-long vigil into rest so you can awaken a vision of your origin.
- The ending hook at the **Fractured Mirror-Arch** reveals chains broken *from the inside*—challenging the protagonist's initial assumption that his form was stolen by an enemy.

---

## 3. Visual, Asset & Audio Direction Decisions

### 3.1 Cohesive Procedural Art & Final Asset Replacement Strategy
- Per project guidelines (*"Visual consistency is more important than asset quantity. Do not use random unrelated stock sprites"*), all environment textures, particles, parallax layers, ruins, and character animations are rendered procedurally via `ArtGenerator.ts` (offscreen HTML5 Canvas gradients/silhouettes) and dynamic `Phaser.GameObjects.Graphics` vector + particle rigs.
- **Protagonist Readability:** Decoupling the `24x52` Arcade Physics hitbox from `Player.render()` ensures rock-solid collision stability across transformation while making the visual shift—from a translucent cyan-rimmed silhouette with floating limb-gaps to a solid obsidian-and-kintsugi-gold mantled figure with striding legs—immediately recognizable at any viewport size.
- **Where Final Production Assets Should Be Placed:**
  - `src/assets/sprites/` — Protagonist sprite sheets (`unbound.png/.json`, `grounded.png/.json`) and NPC animations (`oren`, `vespera`).
  - `src/assets/images/` — Hand-painted parallax layers (`sky`, `far`, `mid`, `near`) and tileable ruin tilesets.
  - `src/assets/audio/` — Recorded ambient wind loops, chamber strings/cello stems, and Foley SFX.
  - `src/assets/fonts/` — Licensed display serif typeface (currently styled with universal Georgia/Palatino serif stack for zero missing-font network errors).

### 3.2 Procedural Web Audio Soundscape (`AudioManager.ts`)
- Built directly atop the browser's `AudioContext` (filtered brown/pink noise wind bed + LFO sweep, generative Aeolian harmonic pads that drop an octave and warm from sine to triangle timbres after restoring Weight, plus synthesized Foley/chimes).
- Eliminates missing audio file errors, respects browser autoplay policies by unlocking on first input, persists mute preference (`[M]`), and remains 100% playable when muted or headless.


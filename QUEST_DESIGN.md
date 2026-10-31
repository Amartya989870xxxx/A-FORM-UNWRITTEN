# A FORM UNWRITTEN: QUEST ARCHITECTURE & DESIGN

This document defines the quest philosophy, structural taxonomy, ranking model, and authored quest blueprints for **A FORM UNWRITTEN**, bridging the playable **Chapter One: The Shattered Verge** experience with the multi-continent RPG ahead.

---

## 1. Core Quest Design Principles

1. **No Instant Payoffs for Major Milestones:** Major narrative and mechanical milestones (such as reclaiming a Remnant) must unfold across multi-stage environmental investigation, traversal challenges, and spatial puzzle mechanisms rather than walking up to an unguarded pedestal.
2. **No Combat-Filler or Fetch Padding:** Quests never ask the player to "kill 10 creatures" or walk across barren expanses. Every objective introduces a piece of lore, a spatial traversal problem, an environmental clue, or a character decision.
3. **Orthogonal Rank vs. Mystery Age:** Operational Guild Rank and historical Mystery Age are independent axes. A low-rank frontier errand can uncover a million-year artifact, while a high-rank Guild emergency may concern a collapse from ten years ago.
4. **Genuine Hidden Discovery:** Hidden quests are never shouted at the player via glowing checklist boards. They begin naturally when an observant player inspects an off-path alcove, deciphers a stele, or follows a subtle environmental irregularity.
5. **Meaningful Rewards:** Completing quests awards transformative capabilities, functional Relics (such as expanding World Atlas perception), Guild Rank promotions, new world routes, or lasting narrative consequences.

---

## 2. Two Independent Classification Axes

Every quest in `src/game/data/quests.ts` carries both an **Adventurer Rank** (`G` through `S`) and a **Mystery Age** label:

### 2.1 Adventurer Rank (`G` to `S`): Operational Scope & Hazard
* **Rank G:** Introductory local traversal and observation within a single ruin cluster.
* **Rank F:** Multi-mechanism ruin surveys requiring environmental coordination or hidden clue synthesis.
* **Rank E - D:** Province-spanning investigations, hazardous subterranean vaults, and multi-stage aqueduct engineering.
* **Rank C - B:** Cross-kingdom expeditions involving faction diplomacy, companion coordination, and unstable Crucibles.
* **Rank A - S:** Continental turning points that reshape world cartography or challenge immortal laws.

### 2.2 Mystery Age: Historical Depth of the Subject
* **10-Year Mystery:** Recent disappearances, Verge Sundering aftermath, lost survey expeditions, censored harbor logs.
* **100-Year Mystery:** Guild Concordat secrets, sealed aristocratic vaults, forgotten architectural treaties.
* **1,000-Year Mystery:** Relics and hidden workshops of the vanished **Silent Loom** weavers.
* **3,000-Year Mystery:** Age of Harmonic Masonry engineering, Crucibles of Mass, and Warden oaths.
* **Ancient Epoch / Million-Year Mystery:** Pre-continental Ring-Monoliths, the nature of bodiless existence, and phenomena tied to the Abyssal Shroud.

---

## 3. Quest Categories

### Category A: Main & Chartered Guild Quests
Structured narrative arcs and official Guild survey charters that advance chapter progression, unlock regional thresholds, and deepen the protagonist's philosophical conflict between **Original Essence** and **Chosen Becoming**.

### Category B: Hidden Discovery Quests
Unmarked optional investigations triggered by curiosity: inspecting secluded ledges, matching inscriptions across elevations, or testing newly gained physical states (such as *Grounded State*) in earlier areas. They never block main progression, and always grant distinctive Relics, Silver Soul Affinity, or early Guild Rank recognition.

### Category C: Multi-Arc World Quests
Long-horizon mysteries seeded across multiple chapters and continents. Individual clues appear as quiet regional anomalies before converging into world-altering revelations, culminating in unlocking the **Fifth Secret Continent (Uncharted Abyssal Shroud)**.

---

## 4. Playable Chapter One Quests (Implemented in `src/game/data/quests.ts`)

### 4.1 `q_awakening_verge` : *Whispers of the Verge*
* **Category:** Main (`Chapter I, Part 1`)
* **Rank:** `G`  |  **Mystery Age:** `Ancient Epoch Mystery`
* **Flow:**
  1. Awaken in the **Unanchored State** atop the Whispering Precipice wearing the charcoal-and-gold Stabilizing Garment.
  2. Learn airborne drifting and ascend the rising cyan wind column (`obj_cross_chasm`) to reach the upper aqueduct observatory.
  3. Converse with **Oren, the Hollow Chronicler** (`obj_speak_oren`), whose dialogue reflects the protagonist's chosen name and bodiless garment silhouette.
* **Outcome:** Chains into `q_echoes_of_substance`.

### 4.2 `q_echoes_of_substance` : *Echoes of Substance* *(Expanded 6-Stage Arc)*
* **Category:** Main (`Chapter I, Part 2`)
* **Rank:** `F`  |  **Mystery Age:** `3,000-Year Mystery`
* **Design Purpose:** Replaces direct Remnant pickup with an atmospheric multi-landmark journey across the upper Verge.
* **Flow:**
  1. **Surveyor Investigation (`obj_inspect_survey`):** Inspect the **Surveyor Stele** east of Oren to learn how the Twin Wind-Spires, the Sky-Arch bell, and the triple-sealed Crucible dome interlock.
  2. **North Wind-Spire Alignment (`obj_conduit_north`):** Ride the northern spire updraft and attune the high resonance conduit.
  3. **East Wind Vane & Balcony Conduit (`obj_conduit_east`):** Rotate the mechanical wind vane on the central span to awaken a dormant eastern air column, then ascend to attune the East Balcony Conduit and unseal the outer spire gate.
  4. **Shattered Sky-Arch Traversal (`obj_sky_arch_bell`):** Drift across high-altitude broken bridge spans suspended over the cloud-sea and ring the **Aerial Resonance Bell** to unseal the Crucible of Mass entry gate.
  5. **Crucible of Mass 3-Lock Stabilization Puzzle (`obj_crucible_locks`):** Inside the Crucible dome, the Remnant of Weight is caged behind three concentric containment rings and **cannot be claimed early**. The player must:
     * Release the **West Counterweight Lever**;
     * Calibrate the **East Harmonic Dial** (which together ignite the central **Crucible Dome Updraft**); and
     * Ride the newly ignited central updraft into the upper cupola to disengage the **Zenith Keystone**.
  6. **Garment Anchoring (`obj_claim_weight`):** After confirming the pre-stabilization rite warning, reclaim the uncaged **Remnant of Weight**, triggering the stabilization ceremony, promoting the protagonist to **Adventurer Rank `F`**, and transitioning permanently from **Unanchored State** to **Grounded State** (while awakening **Grounded Counterweight Lifts** so high-spire Echo Tablets and upper fog cells remain revisitable).
  *(Note: If an explorative player bypasses Oren and directly begins investigating the Surveyor Stele or Wind-Spires, `QuestManager` coherently auto-resolves `q_awakening_verge` so the HUD quest tracker never stalls.)*
* **Outcome:** Chains into `q_changed_world` and awards `+2 Amber` Soul Affinity.

### 4.3 `q_changed_world` : *The Weight of Becoming*
* **Category:** Main (`Chapter I, Part 3`)
* **Rank:** `F`  |  **Mystery Age:** `Ancient Epoch Mystery`
* **Flow:**
  1. **Shatter the Crucible Floor (`obj_shatter_crucible`):** Use the newly unlocked **Ground Impact** (`S / Down + Space` in midair) to smash through the cracked amber slab into the Echoing Underwalk.
  2. **Unseal the Precipice Courtyard (`obj_unseal_courtyard`):** Return to the opening courtyard with newfound physical mass, push the runic granite monolith onto the western plinth, and stand upon the eastern plinth to open the Sunken Causeway shaft.
  3. **The Memory Crucible (`obj_meet_vespera`):** Solve the subterranean Sunken Causeway lock puzzle, meet **Vespera, Warden of the First Names** (who perceives the unsettled multicolored astral prism beneath the garment's gold seams), and make a permanent philosophical choice between the **Imprint of Resonance** (*Becoming*) and the **Imprint of Resolve** (*Original Essence*).
  4. **Threshold of Chapter One (`obj_cross_threshold`):** Step beyond Vespera's unsealed gate to the **Fractured Mirror-Arch** overlooking the Crown Reaches, concluding Chapter One.

### 4.4 `hq_silent_loom` : *Threads of the Silent Loom* *(Playable Optional Hidden Quest)*
* **Category:** Hidden (`Hidden Discovery`)
* **Rank:** `F`  |  **Mystery Age:** `1,000-Year Mystery`
* **Discovery Hook:** Completely unmarked at journey start. Auto-activates the moment the player discovers either hidden weaver tool or inspects the mysterious recessed coffer in the Sunken Sanctum.
* **Flow:**
  1. **Western Cliff Secret (`obj_loom_thread`):** Walk *west* behind the initial awakening dais instead of heading straight east to discover the **Frayed Gold Spool** (`clue_loom_1`), spun from the exact metallic thread stitching the protagonist's garment.
  2. **Underwalk Alcove (`obj_loom_spindle`):** After shattering into the Echoing Underwalk, explore its central shadowed colonnade to recover the **Astral Weaver Spindle** (`clue_loom_2`).
  3. **Sanctum Reliquary (`obj_loom_reliquary`):** Fit both weaver tools into the **Sealed Reliquary Loom** (`reliquary_loom`) inside the Sunken Sanctum before Vespera's hall.
* **Reward:**
  * Rare Relic: **Wayfarer's Compass-Lens** (`relic_compass_lens`), functionally expanding live World Atlas fog-of-war discovery radius by **+45%** (`270px -> 392px`) and rendering a subtle kintsugi-gold astrolabe proximity shimmer around nearby undiscovered inscriptions (`echo` tablets and `loom_clue` relics within `480px`).
  * `+4 Silver` Soul Affinity (across clues and reliquary), Guild Rank `F` recognition fallback, and a lore inscription hinting at the outer mist.

---

## 5. Planned Future Quest Blueprints (Chapters Two and Beyond)

### 5.1 Ordinary & Chartered Guild Quests
| Working Title | Region | Rank | Mystery Age | Premise & Consequence |
| :--- | :--- | :---: | :--- | :--- |
| **Charter of the Sundered Ledger** | Ashenweld Frontier | `F` | `10-Year Mystery` | Recover missing survey tallies from a collapsed border tollhouse and decide whether to report an unlicensed squatter settlement to Highcrown magistrates or register them as Guild wardens. |
| **Bells of the Dry Aqueduct** | Vaelen Sky-Aqueducts | `E` | `100-Year Mystery` | Re-balance three suspended water-locks with companion Lyra to restore water to either the lower quarry commons or the upper glassworks first. |
| **The Glass Oath of Oakhaven** | Aurelia | `D` | `3,000-Year Mystery` | Translate a fractured Harmonic Masonry treaty proving the Crucibles of Mass were built as voluntary sanctuaries rather than prisons. |

### 5.2 Future Hidden Discovery Quests
| Working Title | Region | Rank | Mystery Age | Discovery Trigger & Reward |
| :--- | :--- | :---: | :--- | :--- |
| **Seamstress of the Hollow Wind** | Highcrown Citadel | `E` | `1,000-Year Mystery` | Wearing the *Wayfarer's Compass-Lens* near Highcrown's dormant belfry reveals a bricked-over Silent Loom workshop containing an **Epic Mantle Clasp** and a diagram of an empty robe standing upright. |
| **Voice in the Obsidian Glass** | Solis Aridlands | `C` | `Million-Year Mystery` | Ringing a harmonic chime inside the Obsidian Caldera at dusk awakens a pre-human acoustic recording that reacts differently if `blackOrbUsedCount > 0`. |

### 5.3 Multi-Arc World Quest: *Cartography of the Black Tempest*
* **Category:** Multi-Arc (`Spans Chapters I - V`)
* **Rank Escalation:** Begins as `Rank F` curiosity, escalates to `Rank A / S`
* **Mystery Age:** `Million-Year / Pre-Epoch Mystery`
* **Arc Progression:**
  1. **Seed (Chapter One, Implemented Hint):** The inscription inside the unsealed *Silent Loom Reliquary* dedicates the Compass-Lens *"for the unbodied traveller, until the outer mist parts."*
  2. **Arc II (Aurelia):** Uncover confiscated mariner astrolabes inside the Concord of Ivory Cartographers' restricted basement.
  3. **Arc III (Solis Aridlands):** Align the Vault of the First Anvil's solar meridian toward the eastern ocean, revealing a fifth coordinate anchor omitted from all Guild globes.
  4. **Arc IV (Sylphic Marches):** Assemble the harmonic storm-bell atop Lantern-Gate Port's drowned lighthouse during a black-tide equinox.
  5. **Culmination:** Parts the abyssal tempest barrier on the World Atlas, unveiling the **Fifth Secret Continent** and its regions for physical exploration.

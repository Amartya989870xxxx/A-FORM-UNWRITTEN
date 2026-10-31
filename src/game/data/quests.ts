import type { AdventurerRank } from '../constants';

export type QuestStatus = 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED';
export type QuestCategory = 'Main' | 'Hidden' | 'Multi-Arc';

export interface QuestObjectiveDef {
  id: string;
  description: string;
}

export interface QuestDefinition {
  id: string;
  title: string;
  chapterLabel: string;
  category: QuestCategory;
  rank: AdventurerRank;
  mysteryAge: string;
  summary: string;
  journalHint: string;
  objectives: QuestObjectiveDef[];
  nextQuestId?: string;
}

export interface EchoFragmentDef {
  id: string;
  title: string;
  locationHint: string;
  inscription: string;
}

export interface RelicDef {
  id: string;
  name: string;
  rarity: 'Rare' | 'Epic' | 'Legendary';
  effectSummary: string;
  lore: string;
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'q_awakening_verge',
    title: 'Whispers of the Verge',
    chapterLabel: 'Chapter I, Part 1',
    category: 'Main',
    rank: 'G',
    mysteryAge: 'Ancient Epoch Mystery',
    summary:
      'You awoke without flesh or memory upon a ruined precipice, held in shape only by a charcoal and gold stabilizing garment.',
    journalHint:
      'Step into the rising cyan wind column east of the courtyard and hold SPACE in midair to ascend to the upper aqueduct.',
    objectives: [
      {
        id: 'obj_cross_chasm',
        description: 'Ride the updraft chasm (Hold SPACE in midair) to reach the upper aqueduct',
      },
      {
        id: 'obj_speak_oren',
        description: 'Speak with Oren, the stone sentinel beside the Forgotten Mechanism',
      },
    ],
    nextQuestId: 'q_echoes_of_substance',
  },
  {
    id: 'q_echoes_of_substance',
    title: 'Echoes of Substance',
    chapterLabel: 'Chapter I, Part 2',
    category: 'Main',
    rank: 'F',
    mysteryAge: '3,000-Year Mystery',
    summary:
      'The Remnant of Weight lies locked behind ancient containment trials across the Wind-Spires, the Shattered Sky-Arch, and the Crucible of Mass.',
    journalHint:
      'Read the Surveyor Stele east of Oren for the spire sequence. After attuning both Wind-Spire conduits, drift across the Sky-Arch to ring the Resonance Bell. Inside the Crucible dome, release the West Lever, the East Dial, and the high Zenith Keystone before claiming the Remnant.',
    objectives: [
      {
        id: 'obj_inspect_survey',
        description: 'Inspect the Surveyor Stele in the Forgotten Mechanism to uncover Crucible clues',
      },
      {
        id: 'obj_conduit_north',
        description: 'Attune the North Wind-Spire Resonance Conduit',
      },
      {
        id: 'obj_conduit_east',
        description: 'Redirect the Wind Vane and attune the East Balcony Conduit',
      },
      {
        id: 'obj_sky_arch_bell',
        description: 'Traverse the Shattered Sky-Arch and ring the Aerial Resonance Bell',
      },
      {
        id: 'obj_crucible_locks',
        description: 'Release all three Stabilization Locks inside the Crucible of Mass',
      },
      {
        id: 'obj_claim_weight',
        description: 'Anchor your stabilizing garment with the Remnant of Weight',
      },
    ],
    nextQuestId: 'q_changed_world',
  },
  {
    id: 'q_changed_world',
    title: 'The Weight of Becoming',
    chapterLabel: 'Chapter I, Part 3',
    category: 'Main',
    rank: 'F',
    mysteryAge: 'Ancient Epoch Mystery',
    summary:
      'Anchored by Weight, your garment no longer rides the wind, yet ancient stone mechanisms now yield to your step. A sealed path beneath the first courtyard awaits.',
    journalHint:
      'Jump above cracked amber floor slabs and press S (or Down) + SPACE in midair. In the Precipice Courtyard, push the runic granite block onto the western plate while standing upon the eastern plate.',
    objectives: [
      {
        id: 'obj_shatter_crucible',
        description: 'Use Ground Impact (S or Down + SPACE in midair) to break the Crucible floor',
      },
      {
        id: 'obj_unseal_courtyard',
        description: 'Return to the Precipice Courtyard and depress its dual counterweight seals',
      },
      {
        id: 'obj_meet_vespera',
        description: 'Traverse the Sunken Causeway and speak with Vespera at the Memory Crucible',
      },
      {
        id: 'obj_cross_threshold',
        description: 'Approach the Fractured Mirror-Arch at the eastern edge of the Sanctum',
      },
    ],
  },
  {
    id: 'hq_silent_loom',
    title: 'Threads of the Silent Loom',
    chapterLabel: 'Hidden Discovery',
    category: 'Hidden',
    rank: 'F',
    mysteryAge: '1,000-Year Mystery',
    summary:
      'Fragments of metallic gold thread matching the seams of your garment were left behind in hidden corners of the Verge by an unknown order of weavers.',
    journalHint:
      'Search the westernmost cliff edge behind your awakening dais, the central alcove of the Echoing Underwalk, and the side reliquary before Vespera in the Sunken Sanctum.',
    objectives: [
      {
        id: 'obj_loom_thread',
        description: 'Recover the Frayed Gold Spool behind the western Awakening Precipice',
      },
      {
        id: 'obj_loom_spindle',
        description: 'Recover the Astral Weaver Spindle inside the Echoing Underwalk',
      },
      {
        id: 'obj_loom_reliquary',
        description: 'Unlock the Sealed Reliquary Loom inside the Sunken Sanctum',
      },
    ],
  },
];

export const ECHO_FRAGMENT_DEFINITIONS: EchoFragmentDef[] = [
  {
    id: 'echo_first_law',
    title: 'Tablet I: The Unmarked Earth',
    locationHint: 'Whispering Precipice Sky Alcove',
    inscription:
      '"What carries no anchor leaves no memory in stone. Unmoored garments drift forever above a world they cannot alter."',
  },
  {
    id: 'echo_sky_bargain',
    title: 'Tablet II: The Bargain of Anchoring',
    locationHint: 'High Spire Overlook',
    inscription:
      '"Every stabilization asks a price. When an unbound presence claims mass, it trades the open sky for a single honest footprint."',
  },
  {
    id: 'echo_sunken_oath',
    title: 'Tablet III: Vigil of the Wardens',
    locationHint: 'Sunken Causeway Mezzanine',
    inscription:
      '"We once believed the empty garments were curses left by conquerors. Only the eldest wardens recall the quiet night before the breaking, when no enemy stood at the gate."',
  },
];

export const RELIC_DEFINITIONS: Record<string, RelicDef> = {
  relic_compass_lens: {
    id: 'relic_compass_lens',
    name: 'Wayfarer’s Compass-Lens',
    rarity: 'Rare',
    effectSummary:
      'Expands World Atlas fog-of-war perception radius by 45% and highlights nearby hidden inscriptions.',
    lore: 'An astrolabe lens wound with the same kintsugi gold thread that binds your garment. Its needle points toward places not yet written on mortal maps.',
  },
};

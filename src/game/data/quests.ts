export type QuestStatus = 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED';

export interface QuestObjectiveDef {
  id: string;
  description: string;
}

export interface QuestDefinition {
  id: string;
  title: string;
  chapterLabel: string;
  summary: string;
  objectives: QuestObjectiveDef[];
  nextQuestId?: string;
}

export interface EchoFragmentDef {
  id: string;
  title: string;
  locationHint: string;
  inscription: string;
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'q_awakening_verge',
    title: 'Whispers of the Verge',
    chapterLabel: 'Chapter I',
    summary:
      'You awoke without memory or substance upon a ruined precipice. Only the wind answers your weightless form.',
    objectives: [
      {
        id: 'obj_cross_chasm',
        description: 'Ride the updraft chasm (Hold SPACE in midair) to reach the upper aqueduct',
      },
      {
        id: 'obj_speak_oren',
        description: 'Speak with the sentinel beside the Forgotten Mechanism',
      },
    ],
    nextQuestId: 'q_echoes_of_substance',
  },
  {
    id: 'q_echoes_of_substance',
    title: 'Echoes of Substance',
    chapterLabel: 'Chapter II–III',
    summary:
      'Oren, the Hollow Chronicler, recognized your unfinished outline. Beyond the sealed vault lies the Remnant of Weight—an aspect of what you once were.',
    objectives: [
      {
        id: 'obj_conduit_north',
        description: 'Attune the North Wind-Spire Resonance Conduit',
      },
      {
        id: 'obj_conduit_east',
        description: 'Redirect the Wind Vane and attune the East Balcony Conduit',
      },
      {
        id: 'obj_claim_weight',
        description: 'Enter the Crucible of Mass and reclaim the Remnant of Weight',
      },
    ],
    nextQuestId: 'q_changed_world',
  },
  {
    id: 'q_changed_world',
    title: 'The Weight of Becoming',
    chapterLabel: 'Chapter IV–V',
    summary:
      'The sky no longer carries you, yet the ancient stone now yields to your presence. A sealed path beneath the first courtyard awaits.',
    objectives: [
      {
        id: 'obj_shatter_crucible',
        description: 'Use Ground Impact (S / Down + SPACE in midair) to break the Crucible floor',
      },
      {
        id: 'obj_unseal_courtyard',
        description: 'Revisit the Precipice Courtyard and depress its dual counterweight seals',
      },
      {
        id: 'obj_meet_vespera',
        description: 'Traverse the Sunken Causeway and speak with Vespera at the Memory Crucible',
      },
      {
        id: 'obj_cross_threshold',
        description: 'Approach the Fractured Mirror-Arch at the edge of the Sanctum',
      },
    ],
  },
];

export const ECHO_FRAGMENT_DEFINITIONS: EchoFragmentDef[] = [
  {
    id: 'echo_first_law',
    title: 'Tablet I — The Unmarked Earth',
    locationHint: 'Whispering Precipice Alcove',
    inscription:
      '"What carries no mass leaves no memory in stone. The unbound drift forever above a world they cannot alter."',
  },
  {
    id: 'echo_sky_bargain',
    title: 'Tablet II — The Bargain of Form',
    locationHint: 'High Spire Overlook',
    inscription:
      '"Every restoration is a surrender. When the boundless wind takes flesh, it trades the whole horizon for a single honest footprint."',
  },
  {
    id: 'echo_sunken_oath',
    title: 'Tablet III — Vigil of the Unwritten',
    locationHint: 'Sunken Causeway Vault',
    inscription:
      '"We thought our vessels were shattered by an enemy. Only the eldest wardens recall the silence before the breaking—and why nobody raised a shield."',
  },
];


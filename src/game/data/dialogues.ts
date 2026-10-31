import type { DialogueTree } from '../systems/DialogueManager';

export const DIALOGUE_TREES: DialogueTree[] = [
  {
    id: 'npc_oren',
    getEntryNodeId: (ctx) => {
      if (ctx.hasWeight) {
        return 'oren_post_weight';
      }
      if (ctx.flags['met_oren']) {
        return 'oren_repeat_pre_weight';
      }
      return 'oren_intro_1';
    },
    nodes: {
      oren_intro_1: {
        id: 'oren_intro_1',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'Hold a moment, drifting one. I nearly mistook you for another ribbon of evening mist.',
        nextNodeId: 'oren_intro_2',
        onEnterActionId: 'met_oren',
      },
      oren_intro_2: {
        id: 'oren_intro_2',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'Look at your hands—or where hands ought to be. You pass across these stones without leaving so much as a tremor. Death cannot end you, yet the world barely registers you are here.',
        choices: [
          {
            label: '"I remember nothing. Something essential was taken from me."',
            nextNodeId: 'oren_taken',
          },
          {
            label: '"What is this place, and why are you bound to the stone?"',
            nextNodeId: 'oren_place',
          },
        ],
      },
      oren_taken: {
        id: 'oren_taken',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'Taken, surrendered, or scattered—every unfinished soul wakes believing a thief is to blame. What you lack are Remnants: the foundational truths of an existence.',
        nextNodeId: 'oren_vault_explain',
      },
      oren_place: {
        id: 'oren_place',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'This is the Shattered Verge, threshold to older kingdoms. My order carved ourselves into its arches so someone would remain to witness those who return without their forms.',
        nextNodeId: 'oren_vault_explain',
      },
      oren_vault_explain: {
        id: 'oren_vault_explain',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'East of here, inside the Crucible of Mass, rests the Remnant of Weight. Two wind-spire conduits seal its door—reachable only by one light enough to ride the drafts.',
        nextNodeId: 'oren_warning',
      },
      oren_warning: {
        id: 'oren_warning',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'Heed one truth before you claim it: restoration is never a simple gift. When the earth claims you, the sky will let you go.',
        onEnterActionId: 'start_echoes_quest',
        choices: [
          {
            label: '"Even so—I will reclaim what I was."',
            nextNodeId: null,
          },
          {
            label: '"Better a heavy step than an existence like smoke."',
            nextNodeId: null,
          },
        ],
      },
      oren_repeat_pre_weight: {
        id: 'oren_repeat_pre_weight',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: (ctx) => {
          const north = ctx.flags['conduit_north'];
          const east = ctx.flags['conduit_east'];
          if (north && east) {
            return 'Both spire conduits hum in harmony. The Crucible to the east stands open—go, if you are ready to feel the pull of the earth.';
          }
          if (north || east) {
            return 'One conduit sings; one still sleeps among the eastern gusts. Turn the old wind vane if the high balcony eludes your reach.';
          }
          return 'Ride the thermals beyond this arch. Attune the North Spire and the East Balcony conduits while the wind still carries you.';
        },
        nextNodeId: null,
      },
      oren_post_weight: {
        id: 'oren_post_weight',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'Listen... footsteps. Real, resonant footsteps upon the slate. For the first time in an age, the Verge feels a visitor arrive.',
        nextNodeId: 'oren_post_weight_2',
      },
      oren_post_weight_2: {
        id: 'oren_post_weight_2',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'The high winds will no longer lift you, traveler. Return westward to the Precipice Courtyard—the sunken counterweight plates that ignored your mist-form will answer your mass now.',
        nextNodeId: null,
      },
    },
  },
  {
    id: 'npc_vespera',
    getEntryNodeId: (ctx) => {
      if (ctx.imprint === 'resonance') {
        return 'vespera_after_resonance';
      }
      if (ctx.imprint === 'resolve') {
        return 'vespera_after_resolve';
      }
      return 'vespera_intro_1';
    },
    nodes: {
      vespera_intro_1: {
        id: 'vespera_intro_1',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'Step softly... The roots of this sanctum have not felt a living weight in centuries, and the Crucible beside me is fracturing.',
        nextNodeId: 'vespera_intro_2',
        onEnterActionId: 'met_vespera',
      },
      vespera_intro_2: {
        id: 'vespera_intro_2',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'I know that golden seam across your chest. You are hunting the pieces of your Original Self, convinced that wholeness lies backward in time.',
        choices: [
          {
            label: '"You know what I was? Tell me what lies inside that Crucible."',
            nextNodeId: 'vespera_crucible',
          },
          {
            label: '"You are fading. Why bind yourself to an empty ruin?"',
            nextNodeId: 'vespera_vigil',
          },
        ],
      },
      vespera_crucible: {
        id: 'vespera_crucible',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'Inside burns an Echo Core from the day the Unwritten broke. Around it sleep the last memories of a mortal town that sheltered me when I too had no name.',
        nextNodeId: 'vespera_dilemma',
      },
      vespera_vigil: {
        id: 'vespera_vigil',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'It is not empty to me. Long ago, mortals here taught an immortal shade how to grieve and how to care. I gave up my own Remnant of Name to anchor their final hearth-memory.',
        nextNodeId: 'vespera_dilemma',
      },
      vespera_dilemma: {
        id: 'vespera_dilemma',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'My tether can no longer hold both. If you draw the Echo Core into yourself, you will glimpse your former self—and my vigil here will finally dissolve into rest.',
        nextNodeId: 'vespera_choice_prompt',
      },
      vespera_choice_prompt: {
        id: 'vespera_choice_prompt',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'Or you can press your newly restored Weight into this cracked anchor—steadying their memory a while longer, though the vision of your past will dim. Neither path is wicked. Tell me: who are you choosing to be?',
        choices: [
          {
            label: '[Lend Your Weight] Stabilize Vespera’s hearth — let what remains endure',
            nextNodeId: 'vespera_chose_resonance',
            accent: 'becoming',
            actionId: 'choose_imprint_resonance',
          },
          {
            label: '[Reclaim the Echo Core] Awaken your past and release Vespera’s long vigil',
            nextNodeId: 'vespera_chose_resolve',
            accent: 'original',
            actionId: 'choose_imprint_resolve',
          },
        ],
      },
      vespera_chose_resonance: {
        id: 'vespera_chose_resonance',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'Warmth returns to the stone... Look at that: you crossed the dark to recover what was lost, yet the first gift of your substance was shelter for strangers. Go now—the Mirror-Arch ahead awaits.',
        nextNodeId: null,
      },
      vespera_chose_resolve: {
        id: 'vespera_chose_resolve',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'Ah... how light the silence feels after all these ages. Carry that starlight carefully, traveler. Look into the Mirror-Arch ahead—and do not flinch from who struck your chains.',
        nextNodeId: null,
      },
      vespera_after_resonance: {
        id: 'vespera_after_resonance',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'The hearth holds steady through the Weight you shared. Step through the Mirror-Arch to the east whenever you are ready.',
        nextNodeId: null,
      },
      vespera_after_resolve: {
        id: 'vespera_after_resolve',
        speaker: 'Fading Echo of Vespera',
        speakerTitle: 'Unbound Rest',
        text: 'Only a peaceful warmth lingers above the quiet crucible. Ahead, the Fractured Mirror-Arch hums with awakened memory.',
        nextNodeId: null,
      },
    },
  },
];


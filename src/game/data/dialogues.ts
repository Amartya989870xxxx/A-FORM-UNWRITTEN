import { DEFAULT_PLAYER_NAME } from '../constants';
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
        text: 'Hold a step, traveler. From across the aqueduct I took your dark mantle for smoke blowing off the chasm.',
        nextNodeId: 'oren_intro_2',
        onEnterActionId: 'met_oren',
      },
      oren_intro_2: {
        id: 'oren_intro_2',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'Closer now, I see no flesh beneath that charcoal weave, only gold seams holding an empty silhouette together. Some scholars call garments like yours a cursed relic; others say they are stabilizers made for souls without a body.',
        choices: [
          {
            label: '"I remember nothing, only that something essential is missing."',
            nextNodeId: 'oren_taken',
          },
          {
            label: '"What is this ruin, and why do you keep watch here?"',
            nextNodeId: 'oren_place',
          },
        ],
      },
      oren_taken: {
        id: 'oren_taken',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: (ctx) => {
          const name = ctx.playerName && ctx.playerName !== DEFAULT_PLAYER_NAME ? `, ${ctx.playerName}` : '';
          return `Every unmoored wanderer wakes believing a thief stripped them bare${name}. What your garment lacks are Remnants: anchors that bind an immortal presence to physical law.`;
        },
        nextNodeId: 'oren_vault_explain',
      },
      oren_place: {
        id: 'oren_place',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'This is the Shattered Verge, high borderland above the Inner Kingdoms. My order carved ourselves into its stone so a witness would remain along the old sky-road.',
        nextNodeId: 'oren_vault_explain',
      },
      oren_vault_explain: {
        id: 'oren_vault_explain',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'Farther east stands the Crucible of Mass, where the Remnant of Weight is kept. You cannot simply walk in and take it. Three layers of old containment guard that chamber.',
        nextNodeId: 'oren_warning',
      },
      oren_warning: {
        id: 'oren_warning',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'Read the Surveyor Stele beyond my arch, attune the Twin Wind-Spires, and drift across the Shattered Sky-Arch while your cloth is still light. Once your garment anchors to the earth, the winds will never carry you again.',
        onEnterActionId: 'start_echoes_quest',
        choices: [
          {
            label: '"I will face the trials and anchor my presence."',
            nextNodeId: null,
          },
          {
            label: '"Better an anchored step than drifting forever like ash."',
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
          const bell = ctx.flags['sky_bell_rung'] || ctx.flags['sky_arch_bell'];
          if (north && east && bell) {
            return 'The Sky-Arch bell has rung. Enter the Crucible of Mass and release its three interior stabilization locks to free the Remnant.';
          }
          if (north && east) {
            return 'Both Wind-Spires sing. Drift across the Shattered Sky-Arch to the east and wake the Aerial Resonance Bell before entering the Crucible.';
          }
          if (north || east) {
            return 'One spire conduit hums; one still sleeps among the eastern gusts. Turn the ancient wind vane if the upper balcony stays out of reach.';
          }
          return 'Examine the Surveyor Stele just east of here, then ride the thermals to attune the North Spire and East Balcony conduits.';
        },
        nextNodeId: null,
      },
      oren_post_weight: {
        id: 'oren_post_weight',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        onEnterActionId: 'met_oren',
        text: (ctx) => {
          const name = ctx.playerName && ctx.playerName !== DEFAULT_PLAYER_NAME ? `, ${ctx.playerName}` : '';
          return `Listen to that... real footsteps ringing against the slate${name}. Your garment hangs with true gravity now, as though the stone finally trusts you exist.`;
        },
        nextNodeId: 'oren_post_weight_2',
      },
      oren_post_weight_2: {
        id: 'oren_post_weight_2',
        speaker: 'Oren',
        speakerTitle: 'The Hollow Chronicler',
        text: 'The high thermals will no longer lift you. Head back west to the Precipice Courtyard; the sunken counterweight plinths that ignored you earlier will answer your mass.',
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
        text: 'Tread gently. These roots have not felt an anchored step in centuries, and the Memory Crucible beside me is fracturing.',
        nextNodeId: 'vespera_intro_2',
        onEnterActionId: 'met_vespera',
      },
      vespera_intro_2: {
        id: 'vespera_intro_2',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'Mortals would see only dark ash-cloth and golden thread when they look at you. Yet through those seams I perceive an unsettled prism of every colour, an immortal essence with no body of flesh at all. Who wove such a stabilizer around silence, I wonder?',
        choices: [
          {
            label: '"You can see beneath this garment? Tell me what burns in that Crucible."',
            nextNodeId: 'vespera_crucible',
          },
          {
            label: '"Your own light is fading. Why bind yourself to a buried sanctuary?"',
            nextNodeId: 'vespera_vigil',
          },
        ],
      },
      vespera_crucible: {
        id: 'vespera_crucible',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'Within it rests an Echo Core from an older age, alongside the last hearth-memories of a mortal village that once sheltered me before I knew what sorrow or belonging meant.',
        nextNodeId: 'vespera_dilemma',
      },
      vespera_vigil: {
        id: 'vespera_vigil',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'It is not empty to me. Long ago, mortals here taught a timeless wanderer how to care for fleeting lives. I surrendered my own name to keep their final memory from vanishing.',
        nextNodeId: 'vespera_dilemma',
      },
      vespera_dilemma: {
        id: 'vespera_dilemma',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'My tether can no longer hold both. If you draw the Echo Core inward, you will glimpse a truth of your past, and my long vigil here will dissolve peacefully into rest.',
        nextNodeId: 'vespera_choice_prompt',
      },
      vespera_choice_prompt: {
        id: 'vespera_choice_prompt',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: (ctx) => {
          const who = ctx.playerName || DEFAULT_PLAYER_NAME;
          return `Or you may press your newly reclaimed Weight into this cracked anchor to preserve their hearth a while longer, even if the vision of your origin dims. Neither choice is wicked, ${who}. Who are you choosing to become?`;
        },
        choices: [
          {
            label: '[Lend Your Weight] Steady Vespera’s hearth so what remains may endure',
            nextNodeId: 'vespera_chose_resonance',
            accent: 'becoming',
            actionId: 'choose_imprint_resonance',
          },
          {
            label: '[Reclaim the Echo Core] Awaken your past and grant Vespera peaceful rest',
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
        text: 'Warmth returns to the roots... You crossed the dark seeking what was lost, yet the first gift of your anchored presence was shelter for strangers. Beyond the Mirror-Arch ahead, the wider kingdoms await you.',
        nextNodeId: null,
      },
      vespera_chose_resolve: {
        id: 'vespera_chose_resolve',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'How gentle the quiet feels after so many centuries. Carry that starlight beyond the Mirror-Arch ahead, traveler, and do not flinch when you see how your chains were broken.',
        nextNodeId: null,
      },
      vespera_after_resonance: {
        id: 'vespera_after_resonance',
        speaker: 'Vespera',
        speakerTitle: 'The Bound Warden',
        text: 'The sanctuary holds steady through the Weight you shared. Step toward the Fractured Mirror-Arch to the east whenever you are ready to leave the Verge.',
        nextNodeId: null,
      },
      vespera_after_resolve: {
        id: 'vespera_after_resolve',
        speaker: 'Quiet Crucible',
        speakerTitle: 'Unbound Rest',
        text: 'Only a calm twilight warmth lingers above the still crucible. To the east, the Fractured Mirror-Arch hums with awakened memory.',
        nextNodeId: null,
      },
    },
  },
];

import type Phaser from 'phaser';
import { DEFAULT_PLAYER_NAME } from '../constants';
import { sanitizePlayerName } from '../systems/SaveManager';

export interface NamePromptResult {
  cancelled: boolean;
  playerName: string;
}

/**
 * Opens the native HTML <dialog> modal so the player can name their bodiless
 * protagonist at the start of a new journey while temporarily suspending
 * Phaser's global key-capture listeners.
 */
export function promptForPlayerName(
  scene: Phaser.Scene,
  initialValue = ''
): Promise<NamePromptResult> {
  const dialog = document.getElementById('name-dialog') as HTMLDialogElement | null;
  const input = document.getElementById('player-name-input') as HTMLInputElement | null;

  if (!dialog || !input || typeof dialog.showModal !== 'function') {
    return Promise.resolve({
      cancelled: false,
      playerName: sanitizePlayerName(initialValue),
    });
  }

  const kbManager = scene.game.input.keyboard;
  const kbPlugin = scene.input.keyboard;
  const prevManagerEnabled = kbManager ? kbManager.enabled : true;
  const prevPreventDefault = kbManager ? kbManager.preventDefault : true;
  const prevPluginEnabled = kbPlugin ? kbPlugin.enabled : true;

  if (kbManager) {
    kbManager.enabled = false;
    kbManager.preventDefault = false;
  }
  if (kbPlugin) {
    kbPlugin.enabled = false;
  }

  return new Promise<NamePromptResult>((resolve) => {
    input.value = initialValue;

    const onInputKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && event.isComposing) {
        event.preventDefault();
      }
      event.stopPropagation();
    };

    const onClose = () => {
      const outcome = dialog.returnValue;
      dialog.returnValue = '';

      input.removeEventListener('keydown', onInputKeyDown);
      dialog.removeEventListener('close', onClose);

      if (kbManager) {
        kbManager.enabled = prevManagerEnabled;
        kbManager.preventDefault = prevPreventDefault;
      }
      if (kbPlugin) {
        kbPlugin.enabled = prevPluginEnabled;
      }

      if (outcome !== 'confirm') {
        resolve({
          cancelled: true,
          playerName: DEFAULT_PLAYER_NAME,
        });
        return;
      }

      resolve({
        cancelled: false,
        playerName: sanitizePlayerName(input.value),
      });
    };

    input.addEventListener('keydown', onInputKeyDown);
    dialog.addEventListener('close', onClose);

    dialog.returnValue = '';
    if (!dialog.open) {
      dialog.showModal();
    }
    input.focus();
    input.select();
  });
}

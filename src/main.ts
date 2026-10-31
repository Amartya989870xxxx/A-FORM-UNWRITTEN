import Phaser from 'phaser';
import './style.css';
import { gameConfig } from './game/config';
import { SCENE_KEYS } from './game/constants';
import type { EndingScene } from './game/scenes/EndingScene';
import type { GameScene } from './game/scenes/GameScene';
import type { MenuScene } from './game/scenes/MenuScene';

const game = new Phaser.Game(gameConfig);

// Expose clean read/inspection bridge for automated browser verification
declare global {
  interface Window {
    __AUF_GAME__?: Phaser.Game;
    __AUF_STATE__?: () => Record<string, unknown>;
  }
}

window.__AUF_GAME__ = game;
window.__AUF_STATE__ = () => {
  const activeScenes = game.scene.getScenes(true).map((s) => s.scene.key);
  const ms = game.scene.getScene(SCENE_KEYS.MENU) as MenuScene | undefined;
  const es = game.scene.getScene(SCENE_KEYS.ENDING) as EndingScene | undefined;
  const gs = game.scene.getScene(SCENE_KEYS.GAME) as GameScene | undefined;

  const nonGameConfirmOpen =
    (activeScenes.includes(SCENE_KEYS.MENU) && Boolean(ms?.isConfirmModalOpen())) ||
    (activeScenes.includes(SCENE_KEYS.ENDING) && Boolean(es?.isConfirmModalOpen()));
  const nonGameConfirmTitle = activeScenes.includes(SCENE_KEYS.MENU)
    ? (ms?.getConfirmModalTitle() ?? null)
    : activeScenes.includes(SCENE_KEYS.ENDING)
      ? (es?.getConfirmModalTitle() ?? null)
      : null;

  if (!gs || !activeScenes.includes(SCENE_KEYS.GAME) || !gs.player) {
    return {
      activeScenes,
      fps: Math.round(game.loop.actualFps),
      canvasWidth: game.canvas.width,
      canvasHeight: game.canvas.height,
      confirmModalOpen: nonGameConfirmOpen,
      confirmModalTitle: nonGameConfirmTitle,
    };
  }
  const body = gs.player.sprite.body as Phaser.Physics.Arcade.Body | null;
  return {
    activeScenes,
    fps: Math.round(game.loop.actualFps),
    canvasWidth: game.canvas.width,
    canvasHeight: game.canvas.height,
    playerName: gs.playerName,
    adventurerRank: gs.adventurerRank,
    playerX: Math.round(gs.player.sprite.x),
    playerY: Math.round(gs.player.sprite.y),
    velX: body ? Math.round(body.velocity.x) : 0,
    velY: body ? Math.round(body.velocity.y) : 0,
    onGround: body ? body.blocked.down || body.touching.down : false,
    isFloating: gs.player.isFloating(),
    hasWeight: gs.remnantManager.hasWeight(),
    stabilizationState: gs.remnantManager.hasWeight() ? 'Grounded State' : 'Unanchored State',
    imprint: gs.imprintManager.getCurrentId(),
    activeQuest: gs.questManager.getActiveQuest()?.definition.id ?? null,
    questStates: gs.questManager.serialize(),
    worldFlags: { ...gs.worldFlags },
    crucibleLocksReleased: gs.getCrucibleLocksReleasedCount(),
    echoCount: gs.discoveredEchoes.size,
    discoveredEchoes: Array.from(gs.discoveredEchoes),
    relics: Array.from(gs.relics),
    compassSensedInscriptionIds: gs.getCompassSensedInteractableIds(),
    regionExplorationPct: gs.explorationManager.getRegionExplorationPercent(),
    worldExplorationPct: gs.explorationManager.getWorldExplorationPercent(),
    discoveredLocations: gs.explorationManager.getDiscoveredLocations(),
    worldMapOpen: gs.isWorldMapOpen(),
    journalOpen: gs.isJournalOpen(),
    confirmModalOpen: gs.isConfirmModalOpen(),
    confirmModalTitle: gs.getConfirmModalTitle(),
  };
};

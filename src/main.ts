import Phaser from 'phaser';
import './style.css';
import { gameConfig } from './game/config';
import { SCENE_KEYS } from './game/constants';
import type { GameScene } from './game/scenes/GameScene';

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
  const gs = game.scene.getScene(SCENE_KEYS.GAME) as GameScene | undefined;
  if (!gs || !activeScenes.includes(SCENE_KEYS.GAME) || !gs.player) {
    return {
      activeScenes,
      fps: Math.round(game.loop.actualFps),
    };
  }
  const body = gs.player.sprite.body as Phaser.Physics.Arcade.Body | null;
  return {
    activeScenes,
    fps: Math.round(game.loop.actualFps),
    playerX: Math.round(gs.player.sprite.x),
    playerY: Math.round(gs.player.sprite.y),
    velX: body ? Math.round(body.velocity.x) : 0,
    velY: body ? Math.round(body.velocity.y) : 0,
    onGround: body ? body.blocked.down || body.touching.down : false,
    isFloating: gs.player.isFloating(),
    hasWeight: gs.remnantManager.hasWeight(),
    imprint: gs.imprintManager.getCurrentId(),
    activeQuest: gs.questManager.getActiveQuest()?.definition.id ?? null,
    questStates: gs.questManager.serialize(),
    worldFlags: { ...gs.worldFlags },
    echoCount: gs.discoveredEchoes.size,
  };
};


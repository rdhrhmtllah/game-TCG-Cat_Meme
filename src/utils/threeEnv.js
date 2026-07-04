import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Scene RoomEnvironment bisa di-share antar pemanggil (hanya geometri+lampu),
// tapi texture hasil PMREM TIDAK bisa — render target terikat ke WebGL context
// pembuatnya, dan tiap Card3D/GachaPack punya renderer sendiri. Jadi texture
// digenerate per-renderer; pemanggil wajib dispose lewat return value.
let roomScene = null;

function getRoomScene() {
  if (!roomScene) roomScene = new RoomEnvironment();
  return roomScene;
}

/**
 * Buat environment map (PMREM) untuk satu renderer.
 * Pakai: scene.environment = createEnvironmentTexture(renderer)
 * dan dispose texture-nya di cleanup.
 */
export function createEnvironmentTexture(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(getRoomScene(), 0.04).texture;
  pmrem.dispose();
  return texture;
}

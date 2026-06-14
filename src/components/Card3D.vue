<template>
  <div ref="containerRef" class="w-full h-full relative" @mousemove="onMouseMove" @mouseleave="onMouseLeave" @touchmove="onTouchMove" @touchend="onMouseLeave">
    <!-- Three.js canvas akan di-mount di sini -->
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';

const props = defineProps({
  imageUrl: { type: String, default: '' },
  rarity: { type: String, default: 'Common' },
  mode: { type: String, default: 'full' }, // 'full' (GachaShop) | 'mini' (Binder)
});

const containerRef = ref(null);

// Three.js objects
let scene, camera, renderer, cardMesh, cardGeometry, baseTexture;
let customShaderMaterial = null;
let animationId = null;
let targetRotationX = 0;
let targetRotationY = 0;
let currentRotationX = 0;
let currentRotationY = 0;

// Vertex shader untuk Epic/Legendary
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader holografik (Bagian 10.1 PRD)
const fragmentShader = `
  uniform sampler2D baseTexture;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec4 baseColor = texture2D(baseTexture, vUv);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.0);
    vec3 rainbowGlow = vec3(
      sin(fresnel * 6.28 + 0.0) * 0.5 + 0.5,
      sin(fresnel * 6.28 + 2.1) * 0.5 + 0.5,
      sin(fresnel * 6.28 + 4.2) * 0.5 + 0.5
    );
    gl_FragColor = vec4(mix(baseColor.rgb, rainbowGlow, fresnel * 0.5), baseColor.a);
  }
`;

const needsShader = () => props.rarity === 'Epic' || props.rarity === 'Legendary';

function initScene() {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  if (width === 0 || height === 0) return;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.z = props.mode === 'mini' ? 6 : 5;

  // Renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  containerRef.value.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 10);
  scene.add(directionalLight);

  // Geometry — BoxGeometry(2.5, 3.5, 0.05) sesuai Bagian 10.1
  cardGeometry = new THREE.BoxGeometry(2.5, 3.5, 0.05);

  // Texture
  const textureLoader = new THREE.TextureLoader();
  const textureUrl = props.imageUrl || `/placeholders/${props.rarity.toLowerCase()}-placeholder.svg`;

  if (needsShader()) {
    // Epic/Legendary: ShaderMaterial dengan efek holografik
    baseTexture = textureLoader.load(textureUrl);
    customShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: baseTexture },
      },
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
    });

    const materials = [
      new THREE.MeshBasicMaterial({ color: 0x333333 }), // right
      new THREE.MeshBasicMaterial({ color: 0x333333 }), // left
      new THREE.MeshBasicMaterial({ color: 0x333333 }), // top
      new THREE.MeshBasicMaterial({ color: 0x333333 }), // bottom
      customShaderMaterial,                              // front
      new THREE.MeshBasicMaterial({ color: 0x333333 }), // back
    ];
    cardMesh = new THREE.Mesh(cardGeometry, materials);
  } else {
    // Common/Rare: MeshBasicMaterial (unlit, hemat)
    baseTexture = textureLoader.load(textureUrl);
    const material = new THREE.MeshBasicMaterial({ map: baseTexture });
    cardMesh = new THREE.Mesh(cardGeometry, material);
  }

  scene.add(cardMesh);
  animate();
}

function animate() {
  animationId = requestAnimationFrame(animate);

  if (!cardMesh) return;

  // Smooth tilt interpolation
  currentRotationX += (targetRotationX - currentRotationX) * 0.1;
  currentRotationY += (targetRotationY - currentRotationY) * 0.1;

  cardMesh.rotation.x = currentRotationY;
  cardMesh.rotation.y = currentRotationX;

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Pointer interaction (tilt effect — Bagian 10.2)
function onMouseMove(e) {
  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return;
  const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
  const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  const tiltFactor = props.mode === 'mini' ? 0.15 : 0.3;
  targetRotationX = x * tiltFactor;
  targetRotationY = -y * tiltFactor;
}

function onMouseLeave() {
  targetRotationX = 0;
  targetRotationY = 0;
}

function onTouchMove(e) {
  if (e.touches.length === 1) {
    const rect = containerRef.value?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.touches[0].clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.touches[0].clientY - rect.top) / rect.height - 0.5) * 2;
    const tiltFactor = props.mode === 'mini' ? 0.15 : 0.3;
    targetRotationX = x * tiltFactor;
    targetRotationY = -y * tiltFactor;
  }
}

function cleanup() {
  // Stop animation loop
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Remove mesh dari scene
  if (cardMesh && scene) {
    scene.remove(cardMesh);
  }

  // Dispose geometry
  if (cardGeometry) {
    cardGeometry.dispose();
    cardGeometry = null;
  }

  // Dispose texture
  if (baseTexture) {
    baseTexture.dispose();
    baseTexture = null;
  }

  // Dispose custom shader material
  if (customShaderMaterial) {
    customShaderMaterial.dispose();
    customShaderMaterial = null;
  }

  // Dispose renderer
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer = null;
  }

  scene = null;
  camera = null;
  cardMesh = null;
}

// Watch untuk imageUrl change (jika kartu ganti)
watch(() => props.imageUrl, (newUrl) => {
  if (newUrl && baseTexture && cardMesh) {
    const loader = new THREE.TextureLoader();
    loader.load(newUrl, (tex) => {
      if (customShaderMaterial) {
        customShaderMaterial.uniforms.baseTexture.value = tex;
        customShaderMaterial.needsUpdate = true;
      } else if (cardMesh.material.map) {
        cardMesh.material.map = tex;
        cardMesh.material.needsUpdate = true;
      }
      if (baseTexture) baseTexture.dispose();
      baseTexture = tex;
    });
  }
});

onMounted(() => {
  initScene();
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  cleanup();
});

function onResize() {
  if (!containerRef.value || !renderer || !camera) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  if (width === 0 || height === 0) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
</script>

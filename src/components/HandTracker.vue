<template>
  <div ref="containerRef" class="w-full h-full relative overflow-hidden rounded-lg bg-gray-900">
    <video
      ref="videoEl"
      class="w-full h-full object-cover"
      autoplay
      playsinline
      muted
    ></video>

    <!-- Canvas overlay untuk drawing landmark (opsional, debug) -->
    <canvas
      ref="canvasEl"
      class="absolute inset-0 w-full h-full"
    ></canvas>

    <!-- Status overlay -->
    <div class="absolute bottom-2 left-2 right-2 flex justify-between items-center text-xs">
      <span v-if="cameraReady" class="bg-green-900/80 text-green-400 px-2 py-0.5 rounded-full">
        📷 Gesture aktif
      </span>
      <span v-else-if="cameraUnavailable" class="bg-yellow-900/80 text-yellow-400 px-2 py-0.5 rounded-full">
        📱 Tap mode
      </span>
      <span v-else class="bg-gray-800/80 text-gray-400 px-2 py-0.5 rounded-full">
        ⏳ Menyalakan kamera...
      </span>

      <span v-if="pinchDetected" class="bg-purple-900/80 text-purple-300 px-2 py-0.5 rounded-full animate-pulse">
        ✨ Cubit!
      </span>
    </div>

    <!-- Instruction overlay -->
    <div v-if="!cameraReady && !cameraUnavailable" class="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-sm text-gray-400">
      <p>Mengakses kamera...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits(['gacha-trigger', 'camera-unavailable']);

const containerRef = ref(null);
const videoEl = ref(null);
const canvasEl = ref(null);
const cameraReady = ref(false);
const cameraUnavailable = ref(false);
const pinchDetected = ref(false);

let handsInstance = null;
let lastPinchState = false;
let pinchStartY = 0;
let animationFrameId = null;
let stream = null;

// Threshold untuk deteksi pinch (jarak thumb tip ke index tip)
const PINCH_THRESHOLD = 0.05;
// Threshold kecepatan vertikal untuk trigger gacha (pull down cepat)
const VELOCITY_THRESHOLD = 0.02;

async function initCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
      audio: false,
    });

    if (videoEl.value) {
      videoEl.value.srcObject = stream;
      await videoEl.value.play();
      cameraReady.value = true;
      initMediaPipe();
    }
  } catch (err) {
    console.log('[HandTracker] Camera unavailable:', err.message);
    cameraUnavailable.value = true;
    emit('camera-unavailable');
  }
}

async function initMediaPipe() {
  try {
    // Lazy-load MediaPipe Hands (Bagian 11.1)
    const { Hands } = await import('@mediapipe/hands');

    handsInstance = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    handsInstance.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    handsInstance.onResults(onHandResults);
    startTracking();
  } catch (err) {
    console.error('[HandTracker] MediaPipe load failed:', err.message);
    cameraUnavailable.value = true;
    emit('camera-unavailable');
    // Cleanup camera stream
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
  }
}

function startTracking() {
  async function processFrame() {
    if (!handsInstance || !videoEl.value || !cameraReady.value) return;

    try {
      await handsInstance.send({ image: videoEl.value });
    } catch (e) {
      // MediaPipe sometimes throws during initialization
    }

    animationFrameId = requestAnimationFrame(processFrame);
  }
  processFrame();
}

function onHandResults(results) {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    if (pinchDetected.value) pinchDetected.value = false;
    lastPinchState = false;
    return;
  }

  const landmarks = results.multiHandLandmarks[0];
  if (!landmarks || landmarks.length < 21) return;

  // Landmark 4 = thumb tip, Landmark 8 = index tip
  const thumb = landmarks[4];
  const index = landmarks[8];

  // Jarak Euclidean antara thumb tip dan index tip
  const dx = thumb.x - index.x;
  const dy = thumb.y - index.y;
  const dz = (thumb.z || 0) - (index.z || 0);
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const isPinching = distance < PINCH_THRESHOLD;

  // Deteksi transisi pinch start
  if (isPinching && !lastPinchState) {
    pinchStartY = index.y;
    pinchDetected.value = true;
  }

  // Deteksi transisi pinch end + pull down
  if (!isPinching && lastPinchState) {
    const velocityY = index.y - pinchStartY;
    if (velocityY > VELOCITY_THRESHOLD) {
      emit('gacha-trigger');
    }
    pinchDetected.value = false;
  }

  lastPinchState = isPinching;

  // Draw landmarks ke canvas (debug visual)
  drawLandmarks(landmarks);
}

function drawLandmarks(landmarks) {
  if (!canvasEl.value) return;
  const canvas = canvasEl.value;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Draw connections
  ctx.strokeStyle = 'rgba(168, 139, 250, 0.5)';
  ctx.lineWidth = 2;
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],   // thumb
    [0, 5], [5, 6], [6, 7], [7, 8],   // index
    [0, 9], [9, 10], [10, 11], [11, 12], // middle
    [0, 13], [13, 14], [14, 15], [15, 16], // ring
    [0, 17], [17, 18], [18, 19], [19, 20], // pinky
    [5, 9], [9, 13], [13, 17],          // palm
  ];

  ctx.beginPath();
  for (const [i, j] of connections) {
    if (landmarks[i] && landmarks[j]) {
      ctx.moveTo(landmarks[i].x * width, landmarks[i].y * height);
      ctx.lineTo(landmarks[j].x * width, landmarks[j].y * height);
    }
  }
  ctx.stroke();

  // Draw thumb (4) and index (8) tips — highlight untuk pinch
  for (const idx of [4, 8]) {
    if (landmarks[idx]) {
      ctx.beginPath();
      ctx.arc(landmarks[idx].x * width, landmarks[idx].y * height, 6, 0, 2 * Math.PI);
      ctx.fillStyle = lastPinchState ? '#A78BFA' : '#60A5FA';
      ctx.fill();
    }
  }
}

function cleanup() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  if (handsInstance) {
    handsInstance.close();
    handsInstance = null;
  }
  cameraReady.value = false;
}

onMounted(() => {
  initCamera();
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

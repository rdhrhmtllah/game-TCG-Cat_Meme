<template>
  <div ref="container" class="turnstile-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits(['update:modelValue', 'verified', 'expired', 'error']);
defineProps({ modelValue: { type: String, default: '' } });

// Site key publik. Fallback ke TEST KEY Cloudflare (selalu lolos) supaya
// dev/pre-key tetap jalan. Set VITE_TURNSTILE_SITE_KEY di env untuk key asli.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const container = ref(null);
let widgetId = null;
let scriptPromise = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      if (window.turnstile) resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return scriptPromise;
}

function renderWidget() {
  if (!window.turnstile || !container.value || widgetId !== null) return;
  widgetId = window.turnstile.render(container.value, {
    sitekey: SITE_KEY,
    theme: 'dark',
    callback: (token) => { emit('update:modelValue', token); emit('verified', token); },
    'expired-callback': () => { emit('update:modelValue', ''); emit('expired'); },
    'error-callback': () => { emit('update:modelValue', ''); emit('error'); },
  });
}

function reset() {
  if (window.turnstile && widgetId !== null) {
    try { window.turnstile.reset(widgetId); } catch { /* abaikan */ }
    emit('update:modelValue', '');
  }
}

defineExpose({ reset });

onMounted(async () => {
  try { await loadScript(); renderWidget(); }
  catch { emit('error'); }
});
onBeforeUnmount(() => {
  if (window.turnstile && widgetId !== null) {
    try { window.turnstile.remove(widgetId); } catch { /* abaikan */ }
  }
});
</script>

<style scoped>
.turnstile-container { display: flex; justify-content: center; min-height: 65px; }
</style>

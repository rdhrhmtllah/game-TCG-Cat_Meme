<template>
  <Teleport to="body">
    <TransitionGroup
      name="toast"
      tag="div"
      class="toast-container"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="'toast-' + toast.type"
        @click="dismiss(toast.id)"
      >
        <div class="flex items-center gap-2">
          <IconBase
            :name="iconFor(toast.type)"
            :size="18"
          />
          <span class="text-sm font-medium flex-1">{{ toast.message }}</span>
          <button
            @click.stop="dismiss(toast.id)"
            class="opacity-50 hover:opacity-100 transition-opacity"
          >
            <IconBase name="close" :size="14" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import IconBase from './IconBase.vue';
import { useToast } from '@/composables/useToast.js';

const { toasts, dismiss } = useToast();

function iconFor(type) {
  return { success: 'check', error: 'alert', info: 'info' }[type] || 'info';
}
</script>

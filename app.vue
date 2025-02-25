<script setup lang="ts">
import { ref, computed } from 'vue';
import InteractiveMap from '~/components/maps/InteractiveMap.vue';
import Map3DLayer from '~/components/maps/Map3DLayer.vue';

// Reactive variable to track the current map component
const currentMap = ref<'interactive' | '3d'>('interactive');

// Computed property for dynamic button label
const buttonLabel = computed(() => {
  return currentMap.value === 'interactive' ? 'Switch to 3D Map' : 'Switch to Interactive Map';
});

// Function to toggle between the map components
const toggleMap = () => {
  currentMap.value = currentMap.value === 'interactive' ? '3d' : 'interactive';
};
</script>

<template>
  <div class="relative min-h-screen">
    <Button @click="toggleMap" class="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
      {{ buttonLabel }}
    </Button>
    <component :is="currentMap === 'interactive' ? InteractiveMap : Map3DLayer" />
  </div>
</template>
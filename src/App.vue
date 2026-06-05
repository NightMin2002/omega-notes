<script setup lang="ts">
import { useAppMode } from './composables/useAppMode'
import DesktopLayout from './layouts/DesktopLayout.vue'
import MobileLayout from './mobile/MobileLayout.vue'

const { isMobileMode, isPopoutMode } = useAppMode()
</script>

<template>
  <RouterView v-if="isPopoutMode" />
  <MobileLayout v-else-if="isMobileMode" />
  <DesktopLayout v-else />
</template>

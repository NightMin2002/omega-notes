<script setup lang="ts">
import CountdownModule from '../shared/CountdownModule.vue'
</script>

<template>
  <div class="hub-timer-container">
    <CountdownModule />
  </div>
</template>

<style scoped>
.hub-timer-container {
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
</style>

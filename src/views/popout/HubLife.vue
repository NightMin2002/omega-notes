<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

import '@fontsource/vt323'
import '@fontsource/press-start-2p'
import '@fontsource/share-tech-mono'
import '@fontsource/orbitron'
import '@fontsource/dotgothic16'
import '@fontsource/chakra-petch'
import '@fontsource/wallpoet'

// 简单的本地存储读取
const birthDate = ref('2000-01-01')
const currentTime = ref(Date.now())
const isTicking = ref(false)

const fonts = [
  { label: 'VT323', value: 'VT323' },
  { label: 'Press Start', value: 'Press Start 2P' },
  { label: 'Share Tech', value: 'Share Tech Mono' },
  { label: 'Orbitron', value: 'Orbitron' },
  { label: 'DotGothic', value: 'DotGothic16' },
  { label: 'Chakra Petch', value: 'Chakra Petch' },
  { label: 'Wallpoet', value: 'Wallpoet' }
]
const selectedFont = ref('DotGothic16')

const isFontDropdownOpen = ref(false)
const fontSelectRef = ref<HTMLElement | null>(null)

function closeDropdown(e: MouseEvent) {
  if (fontSelectRef.value && !fontSelectRef.value.contains(e.target as Node)) {
    isFontDropdownOpen.value = false
  }
}

let timer: number

onMounted(() => {
  const savedBirth = localStorage.getItem('hub-life-birth')
  if (savedBirth) birthDate.value = savedBirth
  const savedFont = localStorage.getItem('hub-life-font')
  if (savedFont) selectedFont.value = savedFont

  // 1秒滴答，并且同步物理心跳特效 (急起缓落)
  timer = window.setInterval(() => {
    currentTime.value = Date.now()
    isTicking.value = true
    setTimeout(() => {
      isTicking.value = false
    }, 100) // 100ms 强烈的心室收缩后立刻回弹
  }, 1000)

  window.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('click', closeDropdown)
})

watch([birthDate, selectedFont], () => {
  localStorage.setItem('hub-life-birth', birthDate.value)
  localStorage.setItem('hub-life-font', selectedFont.value)
})

const lifeStats = computed(() => {
  const birth = new Date(birthDate.value).getTime()
  const now = currentTime.value // 绑定高频响应源
  const elapsedMs = now - birth
  
  const elapsedDays = Math.floor(elapsedMs / 86400000)
  const elapsedMinutes = Math.floor(elapsedMs / 60000)
  const elapsedSeconds = Math.floor(elapsedMs / 1000)
  
  return {
    elapsedDays,
    elapsedMinutes,
    elapsedSeconds,
  }
})

// 摒弃过度抒情，使用终端式成熟格言
const terminalLogs = [
  "SYS_LOG: 种一棵树最好的时间是十年前...",
  "SYS_LOG: 你可以选择在此时离开世间。 - M. Aurelius",
  "SYS_LOG: 只有现在，才是你唯一拥有力量的时刻。",
  "SYS_LOG: 昨日不可留，明日尚不可知。",
  "SYS_LOG: 万物皆流，无物常驻。 - Heraclitus"
]

const activeLog = computed(() => {
  // 每分钟（基于系统时间戳跨越）切换一次箴言，保证平静感
  const minuteIndex = Math.floor(currentTime.value / 60000)
  return terminalLogs[minuteIndex % terminalLogs.length]
})
</script>

<template>
  <div class="hub-life">
    <div class="life-header">
      <div class="life-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-success)">
          <path d="M12 22c4-4 8-10 8-14a8 8 0 1 0-16 0c0 4 4 10 8 14z"></path>
          <path d="M12 22V12"></path>
          <path d="M12 16h4"></path>
          <path d="M12 14H8"></path>
        </svg>
        人生进度条
      </div>
      <div class="life-settings">
        <label>
          生日
          <input type="text" v-model="birthDate" class="life-input birth-input" placeholder="YYYY-MM-DD" autocomplete="off" />
        </label>
        <label class="custom-select-wrap" style="margin-left: auto;">
          字体
          <div class="custom-select" ref="fontSelectRef">
            <div class="select-trigger" @click="isFontDropdownOpen = !isFontDropdownOpen">
              {{ fonts.find(f => f.value === selectedFont)?.label || '选择字体' }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div v-show="isFontDropdownOpen" class="select-dropdown">
              <div 
                v-for="f in fonts" 
                :key="f.value" 
                class="select-option"
                :class="{ active: f.value === selectedFont }"
                @click="selectedFont = f.value; isFontDropdownOpen = false"
                :style="{ fontFamily: `'${f.value}', monospace` }"
              >
                {{ f.label }}
              </div>
            </div>
          </div>
        </label>
      </div>
    </div>
    
    <div class="life-stats-advanced">
      <div class="adv-stat-row">
        <span class="adv-label">已生存（天）</span>
        <span class="adv-value" :style="{ fontFamily: `'${selectedFont}', monospace` }">{{ lifeStats.elapsedDays.toLocaleString() }}</span>
      </div>
      <div class="adv-stat-row">
        <span class="adv-label">已流失（分钟）</span>
        <span class="adv-value" :style="{ fontFamily: `'${selectedFont}', monospace` }">{{ lifeStats.elapsedMinutes.toLocaleString() }}</span>
      </div>
      <div class="adv-stat-row pulse-row">
        <span class="adv-label">消逝（秒）</span>
        <span 
          class="adv-value adv-glow" 
          :class="{ 
            'pixel-font-adjust': selectedFont === 'Press Start 2P' || selectedFont === 'Wallpoet',
            'heartbeat-active': isTicking
          }"
          :style="{ fontFamily: `'${selectedFont}', monospace` }"
        >
          {{ lifeStats.elapsedSeconds.toLocaleString() }}
        </span>
      </div>
    </div>
    <div class="terminal-log">
      > {{ activeLog }}
    </div>
  </div>
</template>

<style scoped>
.hub-life {
  display: flex;
  flex-direction: column;
  padding: var(--space-3);
  height: 100%;
}

.life-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.life-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-primary);
}

.life-settings {
  display: flex;
  gap: var(--space-2);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
.life-settings label {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

/* Custom Select Styling */
.custom-select-wrap {
  position: relative;
}
.custom-select {
  position: relative;
  min-width: 140px;
}
.select-trigger {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.select-trigger:hover {
  border-color: var(--color-accent);
}
.select-trigger svg {
  width: 12px;
  height: 12px;
  color: var(--color-text-secondary);
}
.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: max-content;
  min-width: 100%;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
}
.select-dropdown::-webkit-scrollbar {
  width: 4px;
}
.select-dropdown::-webkit-scrollbar-track {
  background: transparent;
}
.select-dropdown::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}
.select-option {
  padding: 6px 8px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  white-space: nowrap;
}
.select-option:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}
.select-option.active {
  background: var(--color-accent-muted, rgba(99, 102, 241, 0.15));
  color: var(--color-accent);
}

.life-input {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  appearance: none;
  -webkit-appearance: none;
}

.life-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-muted, rgba(99, 102, 241, 0.2));
}

.birth-input {
  width: 90px;
  text-align: center;
}

.life-stats-advanced {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  background: var(--color-bg-secondary);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.adv-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.adv-label {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
}

.adv-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
}

.pulse-row {
  position: relative;
  border-top: 1px dashed var(--color-border);
  padding-top: var(--space-3);
  margin-top: 4px;
}

.pulse-row .adv-label {
  color: var(--color-warning);
  font-weight: 600;
}

.pulse-row .adv-glow {
  color: var(--color-warning);
  transform: scale(1.1);
  font-size: 1.6rem;
  letter-spacing: 1px;
  text-shadow: 0 0 6px var(--color-warning-muted, rgba(245, 158, 11, 0.3));
  word-break: break-all;
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), text-shadow 0.6s ease-out; /* 慢速平滑的心室舒张回落 */
  display: inline-block; /* 保证 transform 稳定渲染 */
}

/* 剧烈的心脏收缩 */
.pulse-row .heartbeat-active {
  transform: scale(1.14);
  text-shadow: 0 0 20px var(--color-warning, rgba(245, 158, 11, 1));
  transition: transform 0.05s ease-in, text-shadow 0.05s ease-in; /* 瞬间爆发 */
}

/* Specially targeted extremely wide fonts */
.pixel-font-adjust {
  font-size: 1.1rem !important;
  letter-spacing: -1px !important;
}

.terminal-log {
  margin-top: auto;
  text-align: left;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  opacity: 0.65;
  border-left: 2px solid var(--color-border);
  padding-left: 8px;
  letter-spacing: -0.2px;
}
</style>

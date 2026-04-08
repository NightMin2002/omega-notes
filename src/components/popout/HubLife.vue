<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

import '@fontsource/vt323'
import '@fontsource/press-start-2p'
import '@fontsource/share-tech-mono'
import '@fontsource/orbitron'
import '@fontsource/dotgothic16'
import '@fontsource/chakra-petch'
import '@fontsource/wallpoet'

// ─── 生日（年/月/日） ───
const birthYear = ref(2000)
const birthMonth = ref(1)
const birthDay = ref(1)

const currentTime = ref(Date.now())
const isTicking = ref(false)

// 年份范围
const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i).reverse()
const months = Array.from({ length: 12 }, (_, i) => i + 1)

// 日联动：根据年月计算当月天数
const daysInMonth = computed(() => {
  return new Date(birthYear.value, birthMonth.value, 0).getDate()
})

const days = computed(() => Array.from({ length: daysInMonth.value }, (_, i) => i + 1))

// 当月天数改变时自动修正日
watch(daysInMonth, (max) => {
  if (birthDay.value > max) birthDay.value = max
})

// 合成 birthDate 用于计算
const birthDate = computed(() =>
  `${birthYear.value}-${String(birthMonth.value).padStart(2, '0')}-${String(birthDay.value).padStart(2, '0')}`
)

// ─── 字体选择 ───
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

// ─── 生日下拉菜单状态 ───
const openPicker = ref<'year' | 'month' | 'day' | null>(null)
const yearPickerRef = ref<HTMLElement | null>(null)
const monthPickerRef = ref<HTMLElement | null>(null)
const dayPickerRef = ref<HTMLElement | null>(null)
const pickerRefs = {
  year: yearPickerRef,
  month: monthPickerRef,
  day: dayPickerRef,
}

function togglePicker(which: 'year' | 'month' | 'day') {
  openPicker.value = openPicker.value === which ? null : which
}

function closePickers(e: MouseEvent) {
  const target = e.target as Node
  if (
    openPicker.value &&
    pickerRefs[openPicker.value].value &&
    !pickerRefs[openPicker.value].value!.contains(target)
  ) {
    openPicker.value = null
  }
}

let timer: number

onMounted(() => {
  // 向后兼容：解析已有的 YYYY-MM-DD 格式
  const savedBirth = localStorage.getItem('hub-life-birth')
  if (savedBirth) {
    const parts = savedBirth.split('-').map(Number)
    const [y, m, d] = parts
    if (parts.length === 3 && y != null && m != null && d != null && y >= 1900 && m >= 1 && d >= 1) {
      birthYear.value = y
      birthMonth.value = m
      birthDay.value = Math.min(d, new Date(y, m, 0).getDate())
    }
  }
  const savedFont = localStorage.getItem('hub-life-font')
  if (savedFont) selectedFont.value = savedFont

  timer = window.setInterval(() => {
    currentTime.value = Date.now()
    isTicking.value = true
    setTimeout(() => {
      isTicking.value = false
    }, 100)
  }, 1000)

  window.addEventListener('click', closeDropdown)
  window.addEventListener('click', closePickers)
})

onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('click', closeDropdown)
  window.removeEventListener('click', closePickers)
})

watch([birthDate, selectedFont], () => {
  localStorage.setItem('hub-life-birth', birthDate.value)
  localStorage.setItem('hub-life-font', selectedFont.value)
})

// ─── 统计数据 ───
const lifeStats = computed(() => {
  const birth = new Date(birthDate.value).getTime()
  const now = currentTime.value
  const elapsedMs = now - birth

  const elapsedDays = Math.floor(elapsedMs / 86400000)
  const elapsedMinutes = Math.floor(elapsedMs / 60000)
  const elapsedSeconds = Math.floor(elapsedMs / 1000)

  return { elapsedDays, elapsedMinutes, elapsedSeconds }
})

// ─── 年龄计算 ───
const ageText = computed(() => {
  const birth = new Date(birthDate.value)
  const now = new Date(currentTime.value)
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return Math.max(0, age)
})

const ageMonths = computed(() => {
  const birth = new Date(birthDate.value)
  const now = new Date(currentTime.value)
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth()
  if (now.getDate() < birth.getDate()) months--
  return Math.max(0, months)
})

// ─── 终端箴言 ───
const terminalLogs = [
  "SYS_LOG: 种一棵树最好的时间是十年前...",
  "SYS_LOG: 你可以选择在此时离开世间。 - M. Aurelius",
  "SYS_LOG: 只有现在，才是你唯一拥有力量的时刻。",
  "SYS_LOG: 昨日不可留，明日尚不可知。",
  "SYS_LOG: 万物皆流，无物常驻。 - Heraclitus"
]

const activeLog = computed(() => {
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
        <!-- 年/月/日 三级选择器 -->
        <div class="birth-picker-row">
          <span class="birth-label">生日</span>
          <!-- 年 -->
          <div class="mini-select" ref="yearPickerRef">
            <button class="mini-trigger" @click.stop="togglePicker('year')">
              {{ birthYear }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div v-show="openPicker === 'year'" class="mini-dropdown year-dropdown">
              <div
                v-for="y in years" :key="y"
                class="mini-option"
                :class="{ active: y === birthYear }"
                @click="birthYear = y; openPicker = null"
              >{{ y }}</div>
            </div>
          </div>
          <span class="birth-sep">年</span>
          <!-- 月 -->
          <div class="mini-select" ref="monthPickerRef">
            <button class="mini-trigger" @click.stop="togglePicker('month')">
              {{ String(birthMonth).padStart(2, '0') }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div v-show="openPicker === 'month'" class="mini-dropdown">
              <div
                v-for="m in months" :key="m"
                class="mini-option"
                :class="{ active: m === birthMonth }"
                @click="birthMonth = m; openPicker = null"
              >{{ String(m).padStart(2, '0') }}</div>
            </div>
          </div>
          <span class="birth-sep">月</span>
          <!-- 日 -->
          <div class="mini-select" ref="dayPickerRef">
            <button class="mini-trigger" @click.stop="togglePicker('day')">
              {{ String(birthDay).padStart(2, '0') }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div v-show="openPicker === 'day'" class="mini-dropdown">
              <div
                v-for="d in days" :key="d"
                class="mini-option"
                :class="{ active: d === birthDay }"
                @click="birthDay = d; openPicker = null"
              >{{ String(d).padStart(2, '0') }}</div>
            </div>
          </div>
          <span class="birth-sep">日</span>
        </div>

        <!-- 字体选择器 -->
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

    <!-- 年龄展示 -->
    <div class="life-age-row">
      <span class="age-badge">🌱 已活 {{ ageText }} 岁</span>
      <span class="age-months">{{ ageMonths }} 个月</span>
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
  overflow-y: auto;
  overflow-x: hidden;
}

.life-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
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
  flex-direction: column;
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

/* ─── 年/月/日 三级选择器 ─── */
.birth-picker-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.birth-label {
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-right: 4px;
  flex-shrink: 0;
}

.birth-sep {
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.mini-select {
  position: relative;
}

.mini-trigger {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.mini-trigger:hover {
  border-color: var(--color-accent);
}

.mini-trigger:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent-muted);
  outline: none;
}

.mini-trigger svg {
  width: 10px;
  height: 10px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.mini-dropdown {
  position: absolute;
  top: calc(100% + 3px);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  min-width: 100%;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  z-index: 100;
  max-height: 160px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 3px;
}

.mini-dropdown::-webkit-scrollbar { width: 4px; }
.mini-dropdown::-webkit-scrollbar-track { background: transparent; }
.mini-dropdown::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }

.year-dropdown {
  min-width: 70px;
}

.mini-option {
  padding: 4px 8px;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.12s ease;
  white-space: nowrap;
  text-align: center;
}

.mini-option:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.mini-option.active {
  background: var(--color-accent-muted, rgba(99, 102, 241, 0.15));
  color: var(--color-accent);
  font-weight: 600;
}

/* ─── 年龄展示 ─── */
.life-age-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.age-badge {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.age-months {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
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
.select-trigger:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent-muted);
  outline: none;
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

.life-stats-advanced {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  background: var(--color-bg-secondary);
  padding: var(--space-2) var(--space-3);
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
  transform: scale(1.05);
  font-size: 1.3rem;
  letter-spacing: 0.5px;
  text-shadow: 0 0 6px var(--color-warning-muted, rgba(245, 158, 11, 0.3));
  word-break: break-all;
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), text-shadow 0.6s ease-out;
  display: inline-block;
}

/* 剧烈的心脏收缩 */
.pulse-row .heartbeat-active {
  transform: scale(1.14);
  text-shadow: 0 0 20px var(--color-warning, rgba(245, 158, 11, 1));
  transition: transform 0.05s ease-in, text-shadow 0.05s ease-in;
}

/* Specially targeted extremely wide fonts */
.pixel-font-adjust {
  font-size: 1.1rem !important;
  letter-spacing: -1px !important;
}

.terminal-log {
  margin-top: var(--space-2);
  flex-shrink: 0;
  text-align: left;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  opacity: 0.65;
  border-left: 2px solid var(--color-border);
  padding-left: 8px;
  letter-spacing: -0.2px;
}

@media (prefers-reduced-motion: reduce) {
  .pulse-row .adv-glow {
    animation: none;
    transition: none;
  }
  .pulse-row .heartbeat-active {
    transform: none;
    transition: none;
  }
  .mini-trigger,
  .mini-option,
  .select-trigger,
  .select-option {
    transition: none;
  }
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

// 简单的本地存储读取
const birthDate = ref('2000-01-01')
const expectedAge = ref(80)

onMounted(() => {
  const savedBirth = localStorage.getItem('hub-life-birth')
  if (savedBirth) birthDate.value = savedBirth
  const savedAge = localStorage.getItem('hub-life-age')
  if (savedAge) expectedAge.value = parseInt(savedAge, 10)
})

watch([birthDate, expectedAge], () => {
  localStorage.setItem('hub-life-birth', birthDate.value)
  localStorage.setItem('hub-life-age', expectedAge.value.toString())
})

const lifeStats = computed(() => {
  const birth = new Date(birthDate.value).getTime()
  const now = Date.now()
  const totalDays = expectedAge.value * 365.25
  const elapsedDays = (now - birth) / (1000 * 60 * 60 * 24)
  
  const percentage = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100))
  const remainingDays = Math.max(0, totalDays - elapsedDays)
  
  return {
    percentage: percentage.toFixed(4),
    elapsedDays: Math.floor(elapsedDays),
    remainingDays: Math.floor(remainingDays)
  }
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
        <label>
          预期(岁)
          <input type="number" v-model="expectedAge" class="life-input age-input" min="1" max="150" />
        </label>
      </div>
    </div>
    
    <div class="life-progress-wrap">
      <div class="life-percentage">{{ lifeStats.percentage }}%</div>
      <div class="life-track">
        <div class="life-fill" :style="{ width: lifeStats.percentage + '%' }"></div>
      </div>
    </div>
    
    <div class="life-stats">
      <div class="stat-box">
        <div class="stat-value">{{ lifeStats.elapsedDays }}</div>
        <div class="stat-label">已度过 (天)</div>
      </div>
      <div class="stat-box">
        <div class="stat-value highlight">{{ lifeStats.remainingDays }}</div>
        <div class="stat-label">剩余 (天)</div>
      </div>
    </div>
    <div class="zen-quote">
      “种一棵树最好的时间是十年前，其次是现在。”
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

/* Removing spin buttons for number input */
.age-input::-webkit-inner-spin-button,
.age-input::-webkit-outer-spin-button {
  appearance: none;
  -webkit-appearance: none;
  margin: 0;
}
.age-input {
  appearance: textfield;
  -moz-appearance: textfield;
  text-align: center;
  width: 48px;
}

.life-progress-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.life-percentage {
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -1px;
}

.life-track {
  width: 100%;
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.life-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success), var(--color-warning));
  transition: width 1s ease-out;
}

.life-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: var(--space-4);
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 600;
}
.stat-value.highlight {
  color: var(--color-accent);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.zen-quote {
  margin-top: auto;
  text-align: center;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  font-style: italic;
  opacity: 0.8;
}
</style>

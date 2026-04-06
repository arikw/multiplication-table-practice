<template>
  <div class="table-view">
    <h2 class="view-title">הטבלה שלי</h2>

    <!-- Shared controls: view mode + difficulty -->
    <div class="results-controls">
      <div class="mode-toggle">
        <button
          :class="['mode-btn', { active: store.viewMode === 'weighted' }]"
          @click="store.viewMode = 'weighted'"
        >⏱ משוקלל</button>
        <button
          :class="['mode-btn', { active: store.viewMode === 'accuracy' }]"
          @click="store.viewMode = 'accuracy'"
        >✓ נכונות</button>
      </div>
      <div v-if="store.viewMode === 'weighted'" class="difficulty-bar">
        <span class="difficulty-label">רמה:</span>
        <button
          v-for="level in difficulties"
          :key="level.key"
          :class="['difficulty-btn', { active: store.difficulty === level.key }]"
          @click="setDifficulty(level.key)"
        >{{ level.label }}</button>
      </div>
    </div>

    <div class="grid-wrapper">
      <table class="mult-table">
        <thead>
          <tr>
            <th></th>
            <th v-for="b in range" :key="b">{{ b }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in range" :key="a">
            <th>{{ a }}</th>
            <td
              v-for="b in range"
              :key="b"
              :class="['mult-cell', colorClass(a, b)]"
              :title="`${a} × ${b} = ${a * b}`"
            >
              {{ cellText(a, b) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend (only in weighted mode) -->
    <div v-if="store.viewMode === 'weighted'" class="table-legend">
      <div class="legend-item"><div class="legend-dot cell-green"></div><span>מהיר (עד {{ thresholds.green }} שנ׳)</span></div>
      <div class="legend-item"><div class="legend-dot cell-yellow"></div><span>בסדר ({{ thresholds.green }}–{{ thresholds.yellow }} שנ׳)</span></div>
      <div class="legend-item"><div class="legend-dot cell-orange"></div><span>איטי (מעל {{ thresholds.yellow }} שנ׳)</span></div>
      <div class="legend-item"><div class="legend-dot cell-red"></div><span>טעות</span></div>
      <div class="legend-item"><div class="legend-dot cell-unattempted"></div><span>עוד לא ניסית</span></div>
    </div>
  </div>
</template>

<script>
import { store, scoreToColorClass, accuracyColorClass, saveCurrentProfile, DIFFICULTY_THRESHOLDS } from '../store.js'

export default {
  name: 'TableView',

  data() {
    return {
      store,
      range: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      difficulties: [
        { key: 'beginner', label: 'מתחיל' },
        { key: 'normal',   label: 'רגיל'  },
        { key: 'expert',   label: 'מנוסה' }
      ]
    }
  },

  computed: {
    thresholds() {
      return DIFFICULTY_THRESHOLDS[store.difficulty] || DIFFICULTY_THRESHOLDS.normal
    }
  },

  methods: {
    setDifficulty(level) {
      store.difficulty = level
      saveCurrentProfile()
    },

    colorClass(a, b) {
      const rec = store.results[String(a)][String(b)]
      if (store.viewMode === 'accuracy') {
        return accuracyColorClass(rec.correctCount || 0, rec.totalCount || 0)
      }
      return scoreToColorClass(rec.weightedScore)
    },

    cellText(a, b) {
      const rec = store.results[String(a)][String(b)]
      if (store.viewMode === 'accuracy') {
        if ((rec.totalCount || 0) === 0) return '?'
        if (this.colorClass(a, b) === 'cell-red') return '?'
        return a * b
      }
      if (rec.weightedScore === null) return '?'
      if (this.colorClass(a, b) === 'cell-red') return '?'
      return a * b
    }
  }
}
</script>

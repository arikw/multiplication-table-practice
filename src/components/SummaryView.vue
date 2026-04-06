<template>
  <div class="summary-view">
    <h2 class="view-title">סיכום מיומנות</h2>

    <!-- Difficulty selector -->
    <div class="results-controls">
      <div class="difficulty-bar">
        <span class="difficulty-label">רמה:</span>
        <button
          v-for="level in difficulties"
          :key="level.key"
          :class="['difficulty-btn', { active: store.difficulty === level.key }]"
          @click="setDifficulty(level.key)"
        >{{ level.label }}</button>
      </div>
    </div>

    <!-- Progress section -->
    <div class="progress-section">
      <div class="progress-bar-wrap">
        <div class="progress-bar-header">
          <span class="progress-bar-title">כפולות שניסית</span>
          <span class="progress-bar-fraction">{{ attemptedCount }} / 121</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </div>
      <div class="progress-stats">
        <div class="progress-stat">
          <span class="progress-stat-value">{{ masteredCount }}<span class="progress-stat-total">/121</span></span>
          <span class="progress-stat-label">תשובות נכונות מהירות</span>
        </div>
        <div class="progress-stat">
          <span class="progress-stat-value">{{ store.practiceDays.length }}</span>
          <span class="progress-stat-label">ימי תרגול</span>
        </div>
      </div>
    </div>

    <!-- Recommendation box -->
    <div v-if="recommendation" class="recommendation-box">
      <div class="recommendation-text">{{ recommendation.text }}</div>
      <div v-if="recommendation.numbers.length > 0" class="recommendation-numbers">
        <span
          v-for="n in recommendation.numbers"
          :key="n"
          class="rec-number-badge"
        >{{ n }}</span>
      </div>
      <button
        v-if="recommendation.numbers.length > 0"
        class="rec-practice-btn"
        @click="startPracticeWith(recommendation.numbers)"
      >
        בואו נתרגל את אלה! 🚀
      </button>
    </div>

    <!-- Per-number summary rows -->
    <div class="summary-grid">
      <div
        v-for="row in summaryRows"
        :key="row.n"
        class="summary-row"
      >
        <div :class="['number-badge', row.overallClass]">{{ row.n }}</div>
        <div class="pairs-strip">
          <div
            v-for="pair in row.pairs"
            :key="pair.factor"
            :class="['mini-cell', pair.colorClass]"
            :title="`${row.n} × ${pair.factor} = ${pair.product}`"
          >
            {{ pair.factor }}
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="table-legend">
      <div class="legend-item"><div class="legend-dot cell-green"></div><span>מהיר (עד {{ thresholds.green }} שנ׳)</span></div>
      <div class="legend-item"><div class="legend-dot cell-yellow"></div><span>בסדר ({{ thresholds.green }}–{{ thresholds.yellow }} שנ׳)</span></div>
      <div class="legend-item"><div class="legend-dot cell-orange"></div><span>איטי (מעל {{ thresholds.yellow }} שנ׳)</span></div>
      <div class="legend-item"><div class="legend-dot cell-red"></div><span>טעות</span></div>
      <div class="legend-item"><div class="legend-dot cell-unattempted"></div><span>עוד לא ניסית</span></div>
    </div>

    <button class="reset-btn" @click="confirmReset">
      🗑️ איפוס כל הנתונים
    </button>
  </div>
</template>

<script>
import { store, resetAll, scoreToColorClass, saveCurrentProfile, DIFFICULTY_THRESHOLDS } from '../store.js'

export default {
  name: 'SummaryView',

  emits: ['start-practice'],

  data() {
    return {
      store,
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
    },

    attemptedCount() {
      let count = 0
      for (let a = 0; a <= 10; a++)
        for (let b = 0; b <= 10; b++)
          if (store.results[String(a)][String(b)].weightedScore !== null) count++
      return count
    },

    masteredCount() {
      let count = 0
      const t = DIFFICULTY_THRESHOLDS[store.difficulty] || DIFFICULTY_THRESHOLDS.normal
      for (let a = 0; a <= 10; a++)
        for (let b = 0; b <= 10; b++) {
          const score = store.results[String(a)][String(b)].weightedScore
          if (score !== null && score <= t.green) count++
        }
      return count
    },

    progressPercent() {
      return Math.round(this.attemptedCount / 121 * 100)
    },

    numberScores() {
      const scores = {}
      for (let n = 0; n <= 10; n++) {
        const all = []
        for (let f = 0; f <= 10; f++) {
          const sAB = store.results[String(n)][String(f)].weightedScore
          const sBA = store.results[String(f)][String(n)].weightedScore
          if (sAB !== null) all.push(sAB)
          if (sBA !== null && f !== n) all.push(sBA)
        }
        scores[n] = all.length > 0 ? all.reduce((s, x) => s + x, 0) / all.length : null
      }
      return scores
    },

    recommendation() {
      const scores = this.numberScores
      const t = this.thresholds
      const unattempted = []
      const weak = []

      for (let n = 0; n <= 10; n++) {
        const s = scores[n]
        if (s === null) unattempted.push(n)
        else if (s > t.yellow) weak.push(n)
      }

      if (unattempted.length === 11) {
        return { text: 'עוד לא התחלת לתרגל. בואו נתחיל!', numbers: [0,1,2,3,4,5,6,7,8,9,10] }
      }
      if (weak.length === 0 && unattempted.length === 0) {
        return { text: 'כל הכבוד! אתה שולט בכל הכפולות. המשך לתרגל כדי לשמור על הרמה.', numbers: [] }
      }

      const focus = [...weak, ...unattempted].sort((a, b) => a - b)

      if (unattempted.length > 0 && weak.length === 0) {
        return { text: `עדיין לא תירגלת את כפולות ${formatNumbers(unattempted)}. כדאי להתחיל!`, numbers: focus }
      }
      if (weak.length > 0 && unattempted.length === 0) {
        return { text: `כפולות ${formatNumbers(weak)} דורשות חיזוק. בואו נתרגל אותן!`, numbers: focus }
      }
      return {
        text: `כפולות ${formatNumbers(weak)} דורשות חיזוק, וכפולות ${formatNumbers(unattempted)} עוד לא תורגלו.`,
        numbers: focus
      }
    },

    summaryRows() {
      const rows = []
      for (let n = 0; n <= 10; n++) {
        const pairs = []
        for (let f = 0; f <= 10; f++) {
          const rec = store.results[String(n)][String(f)]
          pairs.push({ factor: f, product: n * f, colorClass: scoreToColorClass(rec.weightedScore) })
        }
        const s = this.numberScores[n]
        rows.push({ n, pairs, overallClass: s !== null ? scoreToColorClass(s) : 'cell-unattempted' })
      }
      return rows
    }
  },

  methods: {
    setDifficulty(level) {
      store.difficulty = level
      saveCurrentProfile()
    },

    startPracticeWith(numbers) {
      store.selectedNumbers = [...numbers]
      saveCurrentProfile()
      this.$emit('start-practice')
    },

    confirmReset() {
      if (window.confirm('לאפס את כל נתוני התרגול? לא ניתן לשחזר.')) {
        resetAll()
      }
    }
  }
}

function formatNumbers(nums) {
  const sorted = [...nums].sort((a, b) => a - b)
  const groups = []
  let start = sorted[0], end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) { end = sorted[i] }
    else { groups.push(start === end ? `${start}` : `${start}–${end}`); start = sorted[i]; end = sorted[i] }
  }
  groups.push(start === end ? `${start}` : `${start}–${end}`)
  return groups.join(', ')
}
</script>

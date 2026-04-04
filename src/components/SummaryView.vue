<template>
  <div class="summary-view">
    <h2 class="view-title">סיכום מיומנות</h2>

    <!-- Progress bar -->
    <div class="progress-section">
      <div class="progress-labels">
        <span>ניסית {{ attemptedCount }} מתוך 121 כפולות</span>
        <span>{{ masteredCount }} מיומנות</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- Per-number summary rows -->
    <div class="summary-grid">
      <div
        v-for="row in summaryRows"
        :key="row.n"
        class="summary-row"
      >
        <div :class="['number-badge', row.overallClass]">
          {{ row.n }}
        </div>
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

    <button class="reset-btn" @click="confirmReset">
      איפוס כל הנתונים
    </button>
  </div>
</template>

<script>
import { store, resetAll, scoreToColorClass } from '../store.js'

export default {
  name: 'SummaryView',

  computed: {
    attemptedCount() {
      let count = 0
      for (let a = 0; a <= 10; a++) {
        for (let b = 0; b <= 10; b++) {
          if (store.results[String(a)][String(b)].weightedScore !== null) count++
        }
      }
      return count
    },

    masteredCount() {
      let count = 0
      for (let a = 0; a <= 10; a++) {
        for (let b = 0; b <= 10; b++) {
          const score = store.results[String(a)][String(b)].weightedScore
          if (score !== null && score <= 15) count++
        }
      }
      return count
    },

    progressPercent() {
      return Math.round(this.attemptedCount / 121 * 100)
    },

    summaryRows() {
      const rows = []
      for (let n = 0; n <= 10; n++) {
        // Collect all pairs involving n (as either factor)
        const pairs = []
        for (let f = 0; f <= 10; f++) {
          // Use n as 'a', f as 'b'
          const score = store.results[String(n)][String(f)].weightedScore
          pairs.push({
            factor: f,
            product: n * f,
            colorClass: scoreToColorClass(score),
            score
          })
        }

        // Aggregate: average of all attempted scores involving n (as a or b)
        const allScores = []
        for (let f = 0; f <= 10; f++) {
          const scoreAB = store.results[String(n)][String(f)].weightedScore
          const scoreBA = store.results[String(f)][String(n)].weightedScore
          if (scoreAB !== null) allScores.push(scoreAB)
          if (scoreBA !== null && f !== n) allScores.push(scoreBA) // avoid double-counting n×n
        }

        let overallClass = 'cell-unattempted'
        if (allScores.length > 0) {
          const avg = allScores.reduce((sum, s) => sum + s, 0) / allScores.length
          overallClass = scoreToColorClass(avg)
        }

        rows.push({ n, pairs, overallClass })
      }
      return rows
    }
  },

  methods: {
    confirmReset() {
      if (window.confirm('לאפס את כל נתוני התרגול? לא ניתן לשחזר.')) {
        resetAll()
      }
    }
  }
}
</script>

<template>
  <div class="practice-view">

    <!-- ── Ready / Settings screens ── -->
    <div v-if="!ready || settingsOpen" class="ready-card">

      <template v-if="!ready">
        <div class="ready-emoji">🧠</div>
        <h2 class="ready-title">מוכן להתחיל?</h2>
      </template>
      <template v-else>
        <div class="ready-emoji">⚙️</div>
        <h2 class="ready-title">מה לתרגל?</h2>
      </template>

      <!-- Number selector -->
      <div class="number-selector">
        <p class="number-selector-label">בחר כפולות לתרגול:</p>
        <div class="number-buttons">
          <button
            v-for="n in 11"
            :key="n - 1"
            class="number-toggle"
            :class="{ selected: store.selectedNumbers.includes(n - 1) }"
            @click="toggleNumber(n - 1)"
          >{{ n - 1 }}</button>
        </div>
        <div class="selector-shortcuts">
          <button class="shortcut-btn" @click="selectAllNumbers">הכל</button>
        </div>
      </div>

      <template v-if="!ready">
        <button
          class="start-btn"
          :disabled="store.selectedNumbers.length === 0"
          @click="startPractice"
        >
          בואו נתרגל! 🚀
        </button>
      </template>
      <template v-else>
        <button
          class="start-btn"
          :disabled="store.selectedNumbers.length === 0"
          @click="closeSettings"
        >
          המשך ✓
        </button>
      </template>

      <p class="practice-status-hint">{{ practiceLabel }}</p>

    </div>

    <!-- ── Active question screen ── -->
    <template v-else>

      <!-- Pause overlay (window blur) -->
      <Transition name="pause-fade">
        <div v-if="paused" class="pause-overlay">
          <div class="pause-card">
            <span class="pause-icon">⏸️</span>
            <span class="pause-text">תרגול מושהה</span>
            <span class="pause-hint">חזור לחלון כדי להמשיך</span>
          </div>
        </div>
      </Transition>

      <div class="question-card">
        <div class="question-area">
          <span class="factor">{{ a }}</span>
          <span class="operator">×</span>
          <span class="factor">{{ b }}</span>
          <span class="operator">=</span>
          <input
            ref="answerInput"
            class="answer-input"
            type="number"
            inputmode="numeric"
            min="0"
            max="100"
            v-model="userAnswer"
            :disabled="feedbackState !== null || paused"
            @keydown.enter="submitAnswer"
            @focus="scrollSubmitIntoView"
            autocomplete="off"
          />
        </div>

        <button
          class="submit-btn"
          :disabled="feedbackState !== null || userAnswer === '' || paused"
          @click="submitAnswer"
        >
          בדוק!
        </button>
      </div>

      <div class="feedback-area">
        <Transition name="feedback">
          <div v-if="feedbackState" :class="['feedback', feedbackState]">
            {{ feedbackMessage }}
          </div>
        </Transition>
      </div>
    </template>

  </div>
</template>

<script>
import { store, recordAttempt, scoreToColorClass, saveCurrentProfile } from '../store.js'

const PRAISE = [
  '🎉 כל הכבוד!',
  '⭐ מעולה!',
  '🌟 נהדר!',
  '👏 יופי!',
  '🏆 מצוין!',
  '🎯 בול!',
  '💪 כוכב!'
]

// Base weights by skill level
const BASE_WEIGHTS = {
  'cell-unattempted': 200,
  'cell-red':          80,
  'cell-orange':       25,
  'cell-yellow':        8,
  'cell-green':         3
}

// Penalty multipliers by recency position (0 = just shown, 1 = one before, …)
// Position 0 is excluded entirely; further positions get progressively lighter penalties.
// Red/orange pairs need a longer cool-down so we use a bigger window.
const RECENCY_PENALTIES = [0, 0, 0, 0.15, 0.15, 0.4, 0.4, 0.7, 1]
const RECENT_MAX = RECENCY_PENALTIES.length

function daysSince(iso) {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / 86400000
}

export default {
  name: 'PracticeView',

  data() {
    return {
      store,
      ready: false,
      settingsOpen: false,
      // Question
      a: null,
      b: null,
      userAnswer: '',
      // Timer
      startTime: null,
      timerInterval: null,
      elapsedSeconds: 0,
      totalPausedMs: 0,
      // Pause (window blur)
      paused: false,
      pauseStartedAt: null,
      // Feedback
      feedbackState: null,
      feedbackMessage: '',
      feedbackTimeout: null,
      // Anti-repetition: newest first, max RECENT_MAX entries
      recentShown: []
    }
  },

  computed: {
    correctAnswer() {
      return this.a * this.b
    },

    practiceLabel() {
      const nums = store.selectedNumbers
      if (nums.length === 0) return 'יש לבחור לפחות כפולה אחת'
      if (nums.length === 11) return 'תרגול של כל הכפולות'
      const sorted = [...nums].sort((a, b) => a - b)
      const groups = []
      let start = sorted[0], end = sorted[0]
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) { end = sorted[i] }
        else { groups.push(start === end ? `${start}` : `${start}-${end}`); start = sorted[i]; end = sorted[i] }
      }
      groups.push(start === end ? `${start}` : `${start}-${end}`)
      return 'תרגול כפולות ' + groups.join(', ')
    }
  },

  watch: {
    'store.openPracticeSettings'(val) {
      if (val) {
        store.openPracticeSettings = false
        if (this.ready && !this.settingsOpen) this.openSettings()
      }
    }
  },

  methods: {
    // ── Start / Settings ────────────────────────

    startPractice() {
      this.ready = true
      this.recentShown = []
      store.practiceActive = true
      this.$nextTick(() => this.nextQuestion())
    },

    openSettings() {
      this.pauseTimer()
      this.settingsOpen = true
      store.practiceActive = false
    },

    closeSettings() {
      this.settingsOpen = false
      store.practiceActive = true
      this.resumeTimer()
      this.$nextTick(() => {
        if (this.$refs.answerInput) this.$refs.answerInput.focus()
      })
    },

    // ── Number filter ────────────────────────────

    toggleNumber(n) {
      const idx = store.selectedNumbers.indexOf(n)
      if (idx === -1) {
        store.selectedNumbers.push(n)
        store.selectedNumbers.sort((x, y) => x - y)
      } else if (store.selectedNumbers.length > 1) {
        store.selectedNumbers.splice(idx, 1)
      }
      saveCurrentProfile()
    },

    selectAllNumbers() {
      store.selectedNumbers = store.selectedNumbers.length === 11
        ? []
        : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      saveCurrentProfile()
    },

    // ── Timer pause / resume ─────────────────────

    pauseTimer() {
      if (this.paused) return
      this.paused = true
      this.pauseStartedAt = Date.now()
      clearInterval(this.timerInterval)
      this.timerInterval = null
    },

    resumeTimer() {
      if (!this.paused) return
      this.paused = false
      if (this.pauseStartedAt !== null) {
        this.totalPausedMs += Date.now() - this.pauseStartedAt
        this.pauseStartedAt = null
      }
      this.timerInterval = setInterval(() => { this.elapsedSeconds++ }, 1000)
    },

    onWindowBlur() {
      if (this.ready && !this.settingsOpen && this.feedbackState === null && !this.paused) {
        this.pauseTimer()
      }
    },

    onWindowFocus() {
      if (this.ready && this.paused && !this.settingsOpen) {
        this.resumeTimer()
      }
    },

    // ── Question logic ───────────────────────────

    pickNextPair() {
      const selected = new Set(store.selectedNumbers)

      // Build recency map using canonical key min,max so both orientations share one slot
      const recentMap = new Map()
      this.recentShown.forEach((p, i) => {
        recentMap.set(`${Math.min(p.a, p.b)},${Math.max(p.a, p.b)}`, i)
      })

      // Build pool of canonical pairs (a ≤ b) only — avoids counting the same concept twice.
      // The display order is randomised separately in nextQuestion.
      const pairs = []

      for (let a = 0; a <= 10; a++) {
        for (let b = a; b <= 10; b++) {
          if (!selected.has(a) && !selected.has(b)) continue

          const record = store.results[String(a)][String(b)]
          const colorClass = scoreToColorClass(record.weightedScore)
          let weight = BASE_WEIGHTS[colorClass]

          // Staleness boost for green cells not practiced recently
          if (colorClass === 'cell-green') {
            const days = daysSince(record.lastCorrectAt)
            if (days > 7)      weight = 20
            else if (days > 3) weight = 8
          }

          // Recency penalty via canonical key
          const recentIdx = recentMap.get(`${a},${b}`)
          if (recentIdx !== undefined) {
            weight = Math.round(weight * RECENCY_PENALTIES[recentIdx])
          }

          pairs.push({ a, b, weight })
        }
      }

      // Fallback: if all weights zeroed (tiny pool, everything blocked), lift exclusion
      let total = pairs.reduce((s, p) => s + p.weight, 0)
      if (total === 0) {
        pairs.forEach(p => {
          const rec = store.results[String(p.a)][String(p.b)]
          p.weight = BASE_WEIGHTS[scoreToColorClass(rec.weightedScore)]
        })
        total = pairs.reduce((s, p) => s + p.weight, 0)
      }
      if (total === 0) return { a: 0, b: 0 }

      let r = Math.random() * total
      for (const pair of pairs) {
        r -= pair.weight
        if (r <= 0) return pair
      }
      return pairs[pairs.length - 1]
    },

    nextQuestion() {
      clearInterval(this.timerInterval)
      clearTimeout(this.feedbackTimeout)

      const pair = this.pickNextPair()
      // Store canonical form for recency tracking
      this.recentShown.unshift({ a: Math.min(pair.a, pair.b), b: Math.max(pair.a, pair.b) })
      if (this.recentShown.length > RECENT_MAX) this.recentShown.pop()
      // Randomise display order so both orientations appear over time
      if (Math.random() < 0.5) {
        this.a = pair.a; this.b = pair.b
      } else {
        this.a = pair.b; this.b = pair.a
      }
      this.userAnswer = ''
      this.feedbackState = null
      this.feedbackMessage = ''
      this.elapsedSeconds = 0
      this.totalPausedMs = 0
      this.paused = false
      this.pauseStartedAt = null
      this.startTime = Date.now()

      if (document.hasFocus()) {
        this.timerInterval = setInterval(() => { this.elapsedSeconds++ }, 1000)
      } else {
        this.paused = true
        this.pauseStartedAt = Date.now()
      }

      this.$nextTick(() => {
        if (this.$refs.answerInput) this.$refs.answerInput.focus()
      })
    },

    scrollSubmitIntoView() {
      // On mobile, opening the keyboard shrinks the viewport and can hide the submit button.
      // Wait for the keyboard animation then scroll it into view.
      setTimeout(() => {
        this.$el.querySelector('.submit-btn')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 350)
    },

    submitAnswer() {
      if (this.feedbackState !== null || this.userAnswer === '' || this.paused) return

      clearInterval(this.timerInterval)
      this.timerInterval = null

      const elapsed = (Date.now() - this.startTime - this.totalPausedMs) / 1000
      const answer = parseInt(this.userAnswer, 10)
      const isCorrect = !isNaN(answer) && answer === this.correctAnswer

      recordAttempt(this.a, this.b, elapsed, isCorrect)

      if (isCorrect) {
        this.feedbackState = 'correct'
        this.feedbackMessage = PRAISE[Math.floor(Math.random() * PRAISE.length)]
      } else {
        this.feedbackState = 'wrong'
        this.feedbackMessage = `התשובה הנכונה היא ${this.correctAnswer}`
      }

      this.feedbackTimeout = setTimeout(() => this.nextQuestion(), 1800)
    }
  },

  mounted() {
    this._onBlur = () => this.onWindowBlur()
    this._onFocus = () => this.onWindowFocus()
    window.addEventListener('blur', this._onBlur)
    window.addEventListener('focus', this._onFocus)
  },

  beforeUnmount() {
    store.practiceActive = false
    clearInterval(this.timerInterval)
    clearTimeout(this.feedbackTimeout)
    window.removeEventListener('blur', this._onBlur)
    window.removeEventListener('focus', this._onFocus)
  }
}
</script>

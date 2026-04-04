<template>
  <div class="table-view">
    <h2 class="view-title">הטבלה שלי</h2>

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

    <div class="table-legend">
      <div class="legend-item">
        <div class="legend-dot cell-green"></div>
        <span>מהיר (עד 15 שניות)</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot cell-yellow"></div>
        <span>בסדר (15–25 שניות)</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot cell-orange"></div>
        <span>איטי (מעל 25 שניות)</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot cell-red"></div>
        <span>טעות</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot cell-unattempted"></div>
        <span>עוד לא ניסית</span>
      </div>
    </div>
  </div>
</template>

<script>
import { store, scoreToColorClass } from '../store.js'

export default {
  name: 'TableView',

  data() {
    return {
      range: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }
  },

  methods: {
    colorClass(a, b) {
      return scoreToColorClass(store.results[String(a)][String(b)].weightedScore)
    },

    cellText(a, b) {
      const record = store.results[String(a)][String(b)]
      if (record.weightedScore === null) return '?'
      return a * b
    }
  }
}
</script>

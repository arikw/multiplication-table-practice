<template>
  <header class="app-header">
    <span class="app-title">תרגול לוח הכפל</span>

    <template v-if="currentProfile">
      <div class="profile-badge">
        <span>{{ currentProfileEmoji }} {{ currentProfile }}</span>
        <button class="switch-btn" @click="switchToProfiles">החלף</button>
      </div>

      <nav class="app-nav">
        <button
          class="nav-btn"
          :class="{ active: currentView === 'practice' }"
          @click="currentView = 'practice'"
        >תרגול</button>
        <button
          class="nav-btn"
          :class="{ active: currentView === 'table' }"
          @click="currentView = 'table'"
        >הטבלה שלי</button>
        <button
          class="nav-btn"
          :class="{ active: currentView === 'summary' }"
          @click="currentView = 'summary'"
        >סיכום</button>
      </nav>
    </template>
  </header>

  <!-- Practice sub-header: shown below the white header during practice -->
  <div
    v-if="currentProfile && currentView === 'practice' && store.practiceActive"
    class="practice-sub-header"
  >
    <span class="sub-header-label">{{ practiceLabel }}</span>
    <span class="sub-header-sep" aria-hidden="true">·</span>
    <button class="sub-header-change" @click="triggerSettings">שינוי</button>
  </div>

  <main class="app-main">
    <ProfileView
      v-if="!currentProfile"
      @profile-selected="onProfileSelected"
    />
    <template v-else>
      <PracticeView v-if="currentView === 'practice'" />
      <TableView    v-else-if="currentView === 'table'" />
      <SummaryView  v-else-if="currentView === 'summary'" @start-practice="onStartPractice" />
    </template>
  </main>
</template>

<script>
import { store, switchProfile } from './store.js'
import ProfileView from './components/ProfileView.vue'
import PracticeView from './components/PracticeView.vue'
import TableView from './components/TableView.vue'
import SummaryView from './components/SummaryView.vue'

export default {
  name: 'App',
  components: { ProfileView, PracticeView, TableView, SummaryView },

  data() {
    return {
      currentView: 'practice',
      store
    }
  },

  computed: {
    currentProfile() {
      return store.currentProfile
    },
    currentProfileEmoji() {
      return store.currentProfileEmoji
    },

    practiceLabel() {
      const nums = store.selectedNumbers
      if (nums.length === 0) return 'לא נבחרו כפולות'
      if (nums.length === 11) return 'תרגול של כל הכפולות'

      const sorted = [...nums].sort((a, b) => a - b)
      const groups = []
      let start = sorted[0], end = sorted[0]
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) {
          end = sorted[i]
        } else {
          groups.push(start === end ? `${start}` : `${start}-${end}`)
          start = sorted[i]; end = sorted[i]
        }
      }
      groups.push(start === end ? `${start}` : `${start}-${end}`)
      return 'תרגול כפולות ' + groups.join(', ')
    }
  },

  methods: {
    onProfileSelected() {
      this.currentView = 'practice'
    },

    switchToProfiles() {
      switchProfile()
      this.currentView = 'practice'
    },

    triggerSettings() {
      store.openPracticeSettings = true
    },

    onStartPractice() {
      this.currentView = 'practice'
    }
  }
}
</script>

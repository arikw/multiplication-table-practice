import { reactive } from 'vue'

const PROFILES_KEY = 'multiplicationProfiles'

export const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐻', '🐼', '🦊', '🐸', '🐯', '🦁',
  '🐮', '🐷', '🐨', '🐙', '🦋', '🦄', '🐬', '🦉', '🐧', '🐳'
]

// Time thresholds (seconds) per difficulty level
export const DIFFICULTY_THRESHOLDS = {
  beginner: { green: 25, yellow: 45, orange: 90,  label: 'מתחיל' },
  normal:   { green: 15, yellow: 25, orange: 60,  label: 'רגיל'  },
  expert:   { green:  8, yellow: 15, orange: 30,  label: 'מנוסה' }
}

function profileDataKey(name) {
  return `multiplicationData_${name}`
}

function buildEmptyResults() {
  const obj = {}
  for (let a = 0; a <= 10; a++) {
    obj[String(a)] = {}
    for (let b = 0; b <= 10; b++) {
      obj[String(a)][String(b)] = {
        weightedScore: null,
        attemptCount: 0,
        correctCount: 0,
        totalCount: 0,
        lastAttemptAt: null
      }
    }
  }
  return obj
}

// Ensure cells from old saves have the new fields
function migrateResults(results) {
  for (let a = 0; a <= 10; a++) {
    for (let b = 0; b <= 10; b++) {
      const cell = results[String(a)]?.[String(b)]
      if (cell) {
        if (cell.correctCount === undefined) cell.correctCount = 0
        if (cell.totalCount   === undefined) cell.totalCount   = 0
      }
    }
  }
  return results
}

// Parse profile list — handles legacy plain-string entries
function parseProfileList(raw) {
  const parsed = JSON.parse(raw)
  return parsed.map(p =>
    typeof p === 'string' ? { name: p, emoji: AVATARS[0] } : p
  )
}

const ALL_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function loadProfileData(name) {
  try {
    const raw = localStorage.getItem(profileDataKey(name))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.results) return {
        results:         migrateResults(parsed.results),
        selectedNumbers: parsed.selectedNumbers || ALL_NUMBERS,
        practiceDays:    parsed.practiceDays    || [],
        difficulty:      parsed.difficulty      || 'normal'
      }
    }
  } catch (_) {
    // ignore
  }
  return {
    results:         buildEmptyResults(),
    selectedNumbers: ALL_NUMBERS,
    practiceDays:    [],
    difficulty:      'normal'
  }
}

export function saveCurrentProfile() {
  if (!store.currentProfile) return
  try {
    localStorage.setItem(
      profileDataKey(store.currentProfile),
      JSON.stringify({
        results:         store.results,
        selectedNumbers: store.selectedNumbers,
        practiceDays:    store.practiceDays,
        difficulty:      store.difficulty
      })
    )
  } catch (_) {
    // ignore quota errors
  }
}

export const store = reactive({
  currentProfile:      null,
  currentProfileEmoji: null,
  results:             buildEmptyResults(),
  selectedNumbers:     [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  practiceDays:        [],
  difficulty:          'normal',
  viewMode:            'weighted', // 'weighted' | 'accuracy' — shared across table & summary
  openPracticeSettings: false,
  practiceActive:       false
})

// ── Profile management ──────────────────────────

export function listProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (raw) return parseProfileList(raw)
  } catch (_) {
    // ignore
  }
  return []
}

function saveProfilesList(profiles) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  } catch (_) {
    // ignore
  }
}

export function selectProfile(name) {
  const profiles = listProfiles()
  const found = profiles.find(p => p.name === name)
  store.currentProfile      = name
  store.currentProfileEmoji = found ? found.emoji : AVATARS[0]
  const data = loadProfileData(name)
  store.results         = data.results
  store.selectedNumbers = data.selectedNumbers
  store.practiceDays    = data.practiceDays
  store.difficulty      = data.difficulty
}

export function createProfile(name, emoji) {
  const profiles = listProfiles()
  if (!profiles.find(p => p.name === name)) {
    profiles.push({ name, emoji })
    saveProfilesList(profiles)
    try {
      localStorage.setItem(
        profileDataKey(name),
        JSON.stringify({ results: buildEmptyResults() })
      )
    } catch (_) {
      // ignore
    }
  }
  selectProfile(name)
}

export function renameProfile(oldName, newName, newEmoji) {
  if (oldName !== newName) {
    try {
      const data = localStorage.getItem(profileDataKey(oldName))
      if (data) localStorage.setItem(profileDataKey(newName), data)
      localStorage.removeItem(profileDataKey(oldName))
    } catch (_) {
      // ignore
    }
  }

  const profiles = listProfiles()
  const idx = profiles.findIndex(p => p.name === oldName)
  if (idx !== -1) {
    profiles[idx] = { name: newName, emoji: newEmoji }
    saveProfilesList(profiles)
  }

  if (store.currentProfile === oldName) {
    store.currentProfile      = newName
    store.currentProfileEmoji = newEmoji
  }
}

export function deleteProfile(name) {
  const profiles = listProfiles().filter(p => p.name !== name)
  saveProfilesList(profiles)
  try {
    localStorage.removeItem(profileDataKey(name))
  } catch (_) {
    // ignore
  }
  if (store.currentProfile === name) {
    store.currentProfile      = null
    store.currentProfileEmoji = null
    store.results             = buildEmptyResults()
    store.practiceDays        = []
    store.difficulty          = 'normal'
  }
}

export function switchProfile() {
  store.currentProfile      = null
  store.currentProfileEmoji = null
  store.results             = buildEmptyResults()
  store.selectedNumbers     = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  store.practiceDays        = []
  store.difficulty          = 'normal'
  store.viewMode            = 'weighted'
  store.openPracticeSettings = false
  store.practiceActive       = false
}

// ── Attempt recording ───────────────────────────

function applyAttempt(a, b, rawScore, isCorrect, now) {
  const record = store.results[String(a)][String(b)]
  const prev = record.weightedScore
  const newScore = prev === null ? rawScore : 0.7 * rawScore + 0.3 * prev
  record.weightedScore = Math.round(newScore * 10) / 10
  record.attemptCount += 1
  record.totalCount   += 1
  if (isCorrect) record.correctCount += 1
  record.lastAttemptAt = now
}

export function recordAttempt(a, b, elapsedSeconds, isCorrect) {
  const rawScore = isCorrect ? elapsedSeconds : 999
  const now   = new Date().toISOString()
  const today = now.slice(0, 10) // YYYY-MM-DD

  applyAttempt(a, b, rawScore, isCorrect, now)
  if (a !== b) applyAttempt(b, a, rawScore, isCorrect, now)

  if (!store.practiceDays.includes(today)) {
    store.practiceDays.push(today)
  }

  saveCurrentProfile()
}

export function resetAll() {
  store.results      = buildEmptyResults()
  store.practiceDays = []
  saveCurrentProfile()
}

// ── Color helpers ───────────────────────────────

export function scoreToColorClass(weightedScore) {
  if (weightedScore === null) return 'cell-unattempted'
  const t = DIFFICULTY_THRESHOLDS[store.difficulty] || DIFFICULTY_THRESHOLDS.normal
  if (weightedScore <= t.green)  return 'cell-green'
  if (weightedScore <= t.yellow) return 'cell-yellow'
  if (weightedScore <= t.orange) return 'cell-orange'
  return 'cell-red'
}

export function accuracyColorClass(correctCount, totalCount) {
  if (totalCount === 0) return 'cell-unattempted'
  const ratio = correctCount / totalCount
  if (ratio >= 1.0) return 'cell-green'
  if (ratio >= 0.8) return 'cell-yellow'
  if (ratio >= 0.5) return 'cell-orange'
  return 'cell-red'
}

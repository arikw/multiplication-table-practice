import { reactive } from 'vue'

const PROFILES_KEY = 'multiplicationProfiles'

export const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐻', '🐼', '🦊', '🐸', '🐯', '🦁',
  '🐮', '🐷', '🐨', '🐙', '🦋', '🦄', '🐬', '🦉', '🐧', '🐳'
]

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
        lastAttemptAt: null
      }
    }
  }
  return obj
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
        results: parsed.results,
        selectedNumbers: parsed.selectedNumbers || ALL_NUMBERS
      }
    }
  } catch (_) {
    // ignore
  }
  return { results: buildEmptyResults(), selectedNumbers: ALL_NUMBERS }
}

export function saveCurrentProfile() {
  if (!store.currentProfile) return
  try {
    localStorage.setItem(
      profileDataKey(store.currentProfile),
      JSON.stringify({ results: store.results, selectedNumbers: store.selectedNumbers })
    )
  } catch (_) {
    // ignore quota errors
  }
}

export const store = reactive({
  currentProfile: null,
  currentProfileEmoji: null,
  results: buildEmptyResults(),
  selectedNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  openPracticeSettings: false,
  practiceActive: false
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
  store.currentProfile = name
  store.currentProfileEmoji = found ? found.emoji : AVATARS[0]
  const data = loadProfileData(name)
  store.results = data.results
  store.selectedNumbers = data.selectedNumbers
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
  // Migrate data to new key (if name changed)
  if (oldName !== newName) {
    try {
      const data = localStorage.getItem(profileDataKey(oldName))
      if (data) localStorage.setItem(profileDataKey(newName), data)
      localStorage.removeItem(profileDataKey(oldName))
    } catch (_) {
      // ignore
    }
  }

  // Update profiles list
  const profiles = listProfiles()
  const idx = profiles.findIndex(p => p.name === oldName)
  if (idx !== -1) {
    profiles[idx] = { name: newName, emoji: newEmoji }
    saveProfilesList(profiles)
  }

  // Reflect change in reactive store if this is the active profile
  if (store.currentProfile === oldName) {
    store.currentProfile = newName
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
    store.currentProfile = null
    store.currentProfileEmoji = null
    store.results = buildEmptyResults()
  }
}

export function switchProfile() {
  store.currentProfile = null
  store.currentProfileEmoji = null
  store.results = buildEmptyResults()
  store.selectedNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  store.openPracticeSettings = false
  store.practiceActive = false
}

// ── Attempt recording ───────────────────────────

function applyAttempt(a, b, rawScore, now) {
  const prev = store.results[String(a)][String(b)].weightedScore
  const newScore = prev === null ? rawScore : 0.7 * rawScore + 0.3 * prev
  store.results[String(a)][String(b)].weightedScore = Math.round(newScore * 10) / 10
  store.results[String(a)][String(b)].attemptCount += 1
  store.results[String(a)][String(b)].lastAttemptAt = now
}

export function recordAttempt(a, b, elapsedSeconds, isCorrect) {
  const rawScore = isCorrect ? elapsedSeconds : 999
  const now = new Date().toISOString()

  applyAttempt(a, b, rawScore, now)
  // a×b = b×a — mirror the result so both table cells update together
  if (a !== b) applyAttempt(b, a, rawScore, now)

  saveCurrentProfile()
}

export function resetAll() {
  store.results = buildEmptyResults()
  saveCurrentProfile()
}

// ── Color helpers ───────────────────────────────

export function scoreToColorClass(weightedScore) {
  if (weightedScore === null) return 'cell-unattempted'
  if (weightedScore <= 15) return 'cell-green'
  if (weightedScore <= 25) return 'cell-yellow'
  if (weightedScore <= 60) return 'cell-orange'
  return 'cell-red'
}

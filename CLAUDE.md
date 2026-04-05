# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server
npm run build     # production build (verify no errors before shipping)
npm run preview   # preview production build
```

No test suite exists.

## Architecture

### Stack
- **Vue 3 with Options API exclusively** — no Composition API, no `setup()`
- **Vite 5**, `base: './'` in vite.config.js
- **No router** — view switching via `currentView` string in `App.vue`
- **No Vuex/Pinia** — global state via `Vue.reactive()` in `src/store.js`
- **No CSS framework** — styles split across `src/style.css` (entry point + responsive) and `src/styles/` partials
- Page is `dir="rtl"`; math expressions use `direction: ltr`

### Store (`src/store.js`)
Single source of truth. Key reactive properties:

| Property | Purpose |
|---|---|
| `currentProfile` / `currentProfileEmoji` | Active profile name + emoji |
| `results` | 11×11 grid: `results["a"]["b"] = { weightedScore, attemptCount, lastAttemptAt }` |
| `selectedNumbers` | Which tables (0–10) to include in practice questions |
| `openPracticeSettings` | Flag: App.vue sets `true` → PracticeView watches and opens settings |
| `practiceActive` | Flag: PracticeView sets it; App.vue uses it to show/hide the sub-header strip |

**Scoring**: `rawScore = isCorrect ? elapsedSeconds : 999`. `newWeighted = 0.7 * raw + 0.3 * prev` (first attempt: `= raw`). Color thresholds on `weightedScore`: ≤15 green, ≤25 yellow, ≤60 orange, >60 red, null grey — defined in `scoreToColorClass()`.

**Symmetry**: `recordAttempt(a, b, ...)` calls internal `applyAttempt` for both `(a,b)` and `(b,a)` so both table cells update together.

**Persistence**: Each profile stored at `localStorage['multiplicationData_${name}']` as `{ results, selectedNumbers }`. Profile list at `localStorage['multiplicationProfiles']` as `{ name, emoji }[]` (with legacy plain-string backward compat via `parseProfileList`).

### Cross-Component Communication Pattern
Two store boolean flags handle signaling across the component tree without props/events:
- `store.openPracticeSettings`: set by App.vue's "שינוי" button → watched in PracticeView to trigger `openSettings()`
- `store.practiceActive`: set by PracticeView lifecycle (`startPractice`, `openSettings`, `closeSettings`, `beforeUnmount`) → read by App.vue to conditionally render the sub-header strip

### PracticeView Timer
- Timer is **silent** — elapsed time is never rendered
- `startTime = Date.now()` set per question; `totalPausedMs` accumulates all pause durations
- Actual scored elapsed: `(Date.now() - startTime - totalPausedMs) / 1000`
- `window.blur` → `pauseTimer()`, `window.focus` → `resumeTimer()`
- `nextQuestion()` checks `document.hasFocus()` to start in paused state if window is unfocused

### Practice Filter
`store.selectedNumbers` (array of 0–10) controls which pairs appear. `pickNextPair()` in PracticeView only considers pairs where `selectedNumbers` contains `a` OR `b`. Weighted random selection: unattempted=100, red=80, orange=50, yellow=20, green=5.

The `practiceLabel` computed (range-compressed display like "תרגול כפולות 3-6, 8") is **duplicated** in both `App.vue` and `PracticeView.vue` — both must stay in sync if the logic changes.

### CSS Structure
`src/style.css` is the sole entry point (imported by `main.js`). It `@import`s six partials then adds the responsive `@media` block:

| File | Contents |
|---|---|
| `styles/base.css` | Reset, body, color utility classes, user-select rules |
| `styles/layout.css` | Header, nav, main, profile badge, sub-header strip |
| `styles/practice.css` | Question card, ready screen, number selector, pause overlay |
| `styles/table.css` | Multiplication grid, legend |
| `styles/summary.css` | Progress bar, summary rows, mini-cells, reset button |
| `styles/profile.css` | Profile cards, management mode, emoji-embedded input widget |

Other conventions:
- Use logical CSS properties (`inset-inline-start/end`, `border-inline-end`) for RTL correctness
- `.input-with-emoji`: emoji button + `<input>` share a single border wrapper; picker is `position: absolute; bottom: calc(100% + 6px)` dropdown
- `.pause-overlay` is `position: absolute; inset: 0` anchored to `.question-card` (which has `position: relative; overflow: hidden`)

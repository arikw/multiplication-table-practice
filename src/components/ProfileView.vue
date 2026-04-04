<template>
  <div class="profile-view">
    <div class="profile-hero">
      <div class="profile-hero-emoji">🌟</div>
      <h1 class="profile-hero-title">מי מתרגל היום?</h1>
    </div>

    <!-- ── Selection mode ── -->
    <template v-if="!managementMode">
      <div v-if="profiles.length > 0" class="profile-list">
        <button
          v-for="p in profiles"
          :key="p.name"
          class="profile-card"
          @click="select(p.name)"
        >
          <span class="profile-avatar">{{ p.emoji }}</span>
          <span class="profile-name">{{ p.name }}</span>
        </button>
      </div>

      <div v-if="profiles.length > 0" class="profile-actions-row">
        <button class="manage-btn" @click="managementMode = true">
          ✏️ ניהול תרגולים
        </button>
      </div>

      <div v-if="profiles.length > 0" class="profile-divider">— או הוסף ילד חדש —</div>
    </template>

    <!-- ── Management mode ── -->
    <template v-else>
      <div class="management-header">
        <span class="management-title">ניהול תרגולים</span>
        <button class="done-manage-btn" @click="exitManagement">סיום</button>
      </div>

      <div v-if="profiles.length > 0" class="management-list">
        <div
          v-for="p in profiles"
          :key="p.name"
          class="management-row"
        >
          <!-- View mode -->
          <template v-if="editingName !== p.name">
            <span class="management-avatar">{{ p.emoji }}</span>
            <span class="management-name">{{ p.name }}</span>
            <button class="edit-btn" @click="startEdit(p)">✏️ שנה</button>
            <button class="delete-btn" @click="confirmDelete(p.name)">🗑️ מחק</button>
          </template>

          <!-- Edit mode for this row -->
          <template v-else>
            <div class="edit-row">
              <div class="edit-row-controls">
                <!-- Emoji embedded in rename input -->
                <div class="input-with-emoji">
                  <button
                    class="emoji-in-input-btn"
                    @click.stop="showEditEmojiPicker = !showEditEmojiPicker"
                    :title="'שנה אמוג\'י'"
                  >{{ editEmoji }}</button>
                  <input
                    class="inline-text-input"
                    v-model="editNameValue"
                    type="text"
                    maxlength="20"
                    @keydown.enter="saveEdit(p.name)"
                    @keydown.escape="cancelEdit"
                  />
                  <div v-if="showEditEmojiPicker" class="emoji-picker emoji-picker--dropdown">
                    <button
                      v-for="em in AVATARS"
                      :key="em"
                      class="emoji-option"
                      :class="{ selected: editEmoji === em }"
                      @click.stop="editEmoji = em; showEditEmojiPicker = false"
                    >{{ em }}</button>
                  </div>
                </div>
                <button class="save-edit-btn" @click="saveEdit(p.name)" :disabled="!editNameValue.trim()">שמור</button>
                <button class="cancel-edit-btn" @click="cancelEdit">ביטול</button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <p v-else class="profile-empty">אין תרגולים שמורים</p>
    </template>

    <!-- ── Create new profile (always visible) ── -->
    <div class="new-profile-section">
      <div class="new-profile-form">
        <!-- Emoji embedded in create input -->
        <div class="input-with-emoji">
          <button
            class="emoji-in-input-btn"
            @click="showNewEmojiPicker = !showNewEmojiPicker"
            :title="'בחר אמוג\'י'"
          >{{ newEmoji }}</button>
          <input
            ref="nameInput"
            v-model="newName"
            class="inline-text-input"
            type="text"
            placeholder="שם ילד חדש..."
            maxlength="20"
            @keydown.enter="create"
            autocomplete="off"
          />
          <div v-if="showNewEmojiPicker" class="emoji-picker emoji-picker--dropdown">
            <button
              v-for="em in AVATARS"
              :key="em"
              class="emoji-option"
              :class="{ selected: newEmoji === em }"
              @click="newEmoji = em; showNewEmojiPicker = false"
            >{{ em }}</button>
          </div>
        </div>

        <button
          class="new-profile-btn"
          :disabled="!newName.trim()"
          @click="create"
        >
          הוסף
        </button>
      </div>

      <p v-if="error" class="profile-error">{{ error }}</p>
    </div>
  </div>
</template>

<script>
import {
  AVATARS,
  listProfiles,
  createProfile,
  renameProfile,
  deleteProfile,
  selectProfile
} from '../store.js'

export default {
  name: 'ProfileView',

  emits: ['profile-selected'],

  data() {
    return {
      AVATARS,
      profiles: [],
      newName: '',
      newEmoji: AVATARS[0],
      showNewEmojiPicker: false,
      error: '',
      managementMode: false,
      editingName: null,
      editNameValue: '',
      editEmoji: AVATARS[0],
      showEditEmojiPicker: false
    }
  },

  methods: {
    loadProfiles() {
      this.profiles = listProfiles()
    },

    select(name) {
      selectProfile(name)
      this.$emit('profile-selected')
    },

    create() {
      const name = this.newName.trim()
      if (!name) return

      if (this.profiles.find(p => p.name === name)) {
        this.error = `כבר יש ילד בשם "${name}"`
        return
      }

      createProfile(name, this.newEmoji)
      this.newName = ''
      this.newEmoji = AVATARS[0]
      this.showNewEmojiPicker = false
      this.error = ''
      this.$emit('profile-selected')
    },

    exitManagement() {
      this.managementMode = false
      this.cancelEdit()
    },

    startEdit(profile) {
      this.editingName = profile.name
      this.editNameValue = profile.name
      this.editEmoji = profile.emoji
      this.showEditEmojiPicker = false
    },

    saveEdit(originalName) {
      const newName = this.editNameValue.trim()
      if (!newName) return

      const conflict = this.profiles.find(p => p.name === newName && p.name !== originalName)
      if (conflict) {
        this.error = `כבר יש ילד בשם "${newName}"`
        return
      }

      renameProfile(originalName, newName, this.editEmoji)
      this.error = ''
      this.cancelEdit()
      this.loadProfiles()
    },

    cancelEdit() {
      this.editingName = null
      this.editNameValue = ''
      this.editEmoji = AVATARS[0]
      this.showEditEmojiPicker = false
    },

    confirmDelete(name) {
      if (window.confirm(`למחוק את כל נתוני התרגול של "${name}"?\nלא ניתן לשחזר.`)) {
        deleteProfile(name)
        this.loadProfiles()
        if (this.profiles.length === 0) this.managementMode = false
      }
    }
  },

  mounted() {
    this.loadProfiles()
    this.$nextTick(() => {
      if (this.$refs.nameInput && this.profiles.length === 0) {
        this.$refs.nameInput.focus()
      }
    })
  }
}
</script>

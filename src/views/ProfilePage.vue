<template>
  <ion-page class="profile-page">
    
    <ion-content :fullscreen="true" class="profile-content" :style="{ '--padding-top': 'calc(5rem + env(safe-area-inset-top, 0))' }">
      <main class="profile-shell">
        <section class="profile-hero">
          <div class="hero-copy">
            <p class="eyebrow">Your profile</p>
            <h1>Your <span>account.</span></h1>
            <p class="page-subtitle">Manage your account, goals and preferences.</p>
          </div>
          <div class="hero-side">
            <span class="page-tag">Member since {{ memberSinceMonth || '—' }}</span>
          </div>
        </section>

        <section class="profile-banner">
          <div class="banner-main">
            <div class="avatar-ring">
              <img :src="avatarSrc" :alt="displayName || 'Member avatar'" />
            </div>
            <div class="profile-info">
              <span class="banner-kicker">Member profile</span>
              <h2>{{ displayName || 'Guest' }}</h2>
              <p>Member · {{ streak ? `${streak}-day streak` : 'No streak yet' }}</p>
              <div class="profile-tags">
                <span>Goal: {{ labels.goal }}</span>
                <span>Experience: {{ labels.experience }}</span>
              </div>
            </div>
            <button class="edit-button" type="button" @click="openEditor">
              Edit Profile <ion-icon :icon="arrowForwardOutline" />
            </button>
          </div>

          <div class="banner-stats">
            <div class="banner-stat">
              <span>Current streak</span>
              <strong>{{ streak }}<small>days</small></strong>
            </div>
            <div class="banner-stat">
              <span>Member since</span>
              <strong>{{ memberSinceMonth || '—' }}</strong>
            </div>
            <div class="banner-stat">
              <span>Plan</span>
              <strong>Free</strong>
            </div>
          </div>
        </section>

        <section class="profile-grid">
          <div class="profile-column">
            <article class="settings-card">
              <div class="card-head">
                <div>
                  <span class="card-kicker">Account</span>
                  <h3>Personal details</h3>
                </div>
                <span class="head-icon"><ion-icon :icon="personCircleOutline" /></span>
              </div>
              <div class="info-list">
                <div class="info-row"><span>Email</span><b>{{ userEmail }}</b></div>
                <div class="info-row"><span>Age</span><b>{{ profile.age ? `${profile.age} years` : 'Not set' }}</b></div>
                <div class="info-row"><span>Height</span><b>{{ profile.heightCm ? `${profile.heightCm} cm` : 'Not set' }}</b></div>
                <div class="info-row"><span>Weight</span><b>{{ profile.weightKg ? `${profile.weightKg} kg` : 'Not set' }}</b></div>
              </div>
              <div class="card-foot">
                <span>Profile completion</span>
                <strong>{{ completion }}%</strong>
              </div>
            </article>

            <article class="settings-card">
              <div class="card-head">
                <div>
                  <span class="card-kicker">Fitness</span>
                  <h3>Goals and targets</h3>
                </div>
                <span class="head-icon"><ion-icon :icon="trophyOutline" /></span>
              </div>
              <div class="info-list">
                <div class="info-row"><span>Main goal</span><b>{{ labels.goal }}</b></div>
                <div class="info-row"><span>Daily calories</span><b>{{ profile.dailyCalories ? `${profile.dailyCalories} kcal` : 'Not set' }}</b></div>
                <div class="info-row"><span>Daily protein</span><b>{{ profile.dailyProtein ? `${profile.dailyProtein} g` : 'Not set' }}</b></div>
                <div class="info-row"><span>Activity level</span><b>{{ labels.activity }}</b></div>
                <div class="info-row"><span>Weekly training</span><b>{{ profile.trainingTarget }} sessions</b></div>
              </div>
              <div class="card-foot">
                <span>Last updated</span>
                <strong>{{ updatedLabel }}</strong>
              </div>
            </article>
          </div>

          <div class="settings-column">
            <article class="settings-card">
              <div class="card-head">
                <div>
                  <span class="card-kicker">Preferences</span>
                  <h3>App settings</h3>
                </div>
                <span class="head-icon"><ion-icon :icon="settingsOutline" /></span>
              </div>
              <div class="action-grid">
                <button class="action-item" type="button" @click="openPanel('notifications')">
                  <span class="action-icon"><ion-icon :icon="notificationsOutline" /></span>
                  <span class="action-copy"><strong>Notifications</strong><small>{{ enabledNotifications }}/4 enabled</small></span>
                  <ion-icon class="chevron" :icon="chevronForwardOutline" />
                </button>
                <button class="action-item" type="button" @click="openPanel('theme')">
                  <span class="action-icon"><ion-icon :icon="moonOutline" /></span>
                  <span class="action-copy"><strong>Theme</strong><small>{{ themeLabel(settings.theme) }}</small></span>
                  <ion-icon class="chevron" :icon="chevronForwardOutline" />
                </button>
                <button class="action-item" type="button" @click="openPanel('privacy')">
                  <span class="action-icon"><ion-icon :icon="shieldCheckmarkOutline" /></span>
                  <span class="action-copy"><strong>Privacy and security</strong><small>Password & data</small></span>
                  <ion-icon class="chevron" :icon="chevronForwardOutline" />
                </button>
              </div>

              <div class="sync-strip" :class="`sync-${dbStatus}`">
                <span class="sync-dot" aria-hidden="true"></span>
                <div class="sync-copy">
                  <strong>{{ syncTitle }}</strong>
                  <small>{{ syncDetail }}</small>
                </div>
                <button class="sync-refresh" type="button" :disabled="dataLoading" @click="refreshData">
                  {{ dataLoading ? 'Syncing' : 'Refresh' }}
                </button>
              </div>
            </article>

            <article class="settings-card">
              <div class="card-head">
                <div>
                  <span class="card-kicker">Support</span>
                  <h3>Help and about</h3>
                </div>
                <span class="head-icon"><ion-icon :icon="helpCircleOutline" /></span>
              </div>
              <div class="action-grid">
                <button class="action-item" type="button" @click="openPanel('terms')">
                  <span class="action-icon"><ion-icon :icon="documentTextOutline" /></span>
                  <span class="action-copy"><strong>Terms and conditions</strong><small>Read</small></span>
                  <ion-icon class="chevron" :icon="chevronForwardOutline" />
                </button>
                <button class="action-item" type="button" @click="openPanel('policy')">
                  <span class="action-icon"><ion-icon :icon="lockClosedOutline" /></span>
                  <span class="action-copy"><strong>Privacy Policy</strong><small>Read</small></span>
                  <ion-icon class="chevron" :icon="chevronForwardOutline" />
                </button>
                <button class="action-item" type="button" @click="openPanel('about')">
                  <span class="action-icon"><ion-icon :icon="informationCircleOutline" /></span>
                  <span class="action-copy"><strong>About NutriFit</strong><small>v1.0.0</small></span>
                  <ion-icon class="chevron" :icon="chevronForwardOutline" />
                </button>
                <button class="action-item danger" type="button" :disabled="signingOut" @click="requestSignOut">
                  <span class="action-icon"><ion-icon :icon="logOutOutline" /></span>
                  <span class="action-copy">
                    <strong>{{ signingOut ? 'Signing out...' : 'Sign out' }}</strong>
                    <small>Leave your account</small>
                  </span>
                  <ion-icon class="chevron" :icon="chevronForwardOutline" />
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </ion-content>

    <transition name="modal-fade">
      <div v-if="showEditor" class="profile-modal-backdrop" @click="closeEditor">
        <div class="profile-modal-card" @click.stop>
          <div class="pm-header">
            <div>
              <span class="pm-kicker">Your details</span>
              <h2>Edit profile</h2>
            </div>
            <button class="modal-close-btn" type="button" @click="closeEditor" aria-label="Close">
              <ion-icon :icon="closeOutline" />
            </button>
          </div>

          <form class="profile-form" @submit.prevent="saveEditor">
            <label class="pf-field pf-full">
              <span>Full name</span>
              <input v-model="form.fullName" type="text" autocomplete="name" placeholder="Your name" />
            </label>

            <div class="pf-field pf-full">
              <span>Profile picture</span>
              <div class="avatar-upload-row">
                <input ref="avatarInput" type="file" accept="image/*" @change="handleAvatarFile" id="avatar-file-upload" class="file-input-hidden" />
                <button type="button" class="file-upload-btn" @click="requestPhotoAccess">
                  <ion-icon :icon="cameraOutline" />
                  <span>{{ form.avatarUrl ? 'Change photo' : 'Upload photo' }}</span>
                </button>
                <div class="avatar-preview-mini" v-if="form.avatarUrl">
                  <img :src="form.avatarUrl" alt="Avatar preview" @error="form.avatarUrl = ''" />
                </div>
                <button v-if="form.avatarUrl" class="remove-avatar-btn" type="button" @click="form.avatarUrl = ''">Remove</button>
              </div>
              <small class="pf-hint">Choose a photo, crop it, then save your profile.</small>
              <span v-if="photoProcessing" class="avatar-processing">
                <span class="avatar-processing-spinner" aria-hidden="true"></span>
                Preparing photo...
              </span>
            </div>

            <label class="pf-field">
              <span>Age</span>
              <input v-model.number="form.age" type="number" min="1" max="120" placeholder="—" />
            </label>
            <label class="pf-field">
              <span>Height (cm)</span>
              <input v-model.number="form.heightCm" type="number" min="50" max="260" placeholder="—" />
            </label>
            <label class="pf-field">
              <span>Weight (kg)</span>
              <input v-model.number="form.weightKg" type="number" min="20" max="400" step="0.1" placeholder="—" />
            </label>
            <label class="pf-field">
              <span>Target weight (kg)</span>
              <input v-model.number="form.targetWeightKg" type="number" min="20" max="400" step="0.1" placeholder="—" />
            </label>

            <div class="pf-field custom-dropdown" :class="{ open: openEditorDropdown === 'goal' }">
              <span class="cd-label">Main goal</span>
              <button class="cd-trigger" type="button" @click.stop="toggleEditorDropdown('goal')">
                <span>{{ GOAL_OPTIONS.find(o => o.value === form.goal)?.label || 'Not set' }}</span>
                <ion-icon :icon="chevronDownOutline" />
              </button>
              <div v-if="openEditorDropdown === 'goal'" class="cd-menu">
                <button
                  class="cd-option"
                  :class="{ active: !form.goal }"
                  type="button"
                  @click="form.goal = ''; openEditorDropdown = null"
                >Not set</button>
                <button
                  v-for="option in GOAL_OPTIONS"
                  :key="option.value"
                  class="cd-option"
                  :class="{ active: form.goal === option.value }"
                  type="button"
                  @click="form.goal = option.value; openEditorDropdown = null"
                >{{ option.label }}</button>
              </div>
            </div>

            <div class="pf-field custom-dropdown" :class="{ open: openEditorDropdown === 'experience' }">
              <span class="cd-label">Experience</span>
              <button class="cd-trigger" type="button" @click.stop="toggleEditorDropdown('experience')">
                <span>{{ EXPERIENCE_OPTIONS.find(o => o.value === form.experience)?.label || 'Not set' }}</span>
                <ion-icon :icon="chevronDownOutline" />
              </button>
              <div v-if="openEditorDropdown === 'experience'" class="cd-menu">
                <button
                  class="cd-option"
                  :class="{ active: !form.experience }"
                  type="button"
                  @click="form.experience = ''; openEditorDropdown = null"
                >Not set</button>
                <button
                  v-for="option in EXPERIENCE_OPTIONS"
                  :key="option.value"
                  class="cd-option"
                  :class="{ active: form.experience === option.value }"
                  type="button"
                  @click="form.experience = option.value; openEditorDropdown = null"
                >{{ option.label }}</button>
              </div>
            </div>

            <div class="pf-field custom-dropdown" :class="{ open: openEditorDropdown === 'activityLevel' }">
              <span class="cd-label">Activity level</span>
              <button class="cd-trigger" type="button" @click.stop="toggleEditorDropdown('activityLevel')">
                <span>{{ ACTIVITY_OPTIONS.find(o => o.value === form.activityLevel)?.label || 'Not set' }}</span>
                <ion-icon :icon="chevronDownOutline" />
              </button>
              <div v-if="openEditorDropdown === 'activityLevel'" class="cd-menu">
                <button
                  class="cd-option"
                  :class="{ active: !form.activityLevel }"
                  type="button"
                  @click="form.activityLevel = ''; openEditorDropdown = null"
                >Not set</button>
                <button
                  v-for="option in ACTIVITY_OPTIONS"
                  :key="option.value"
                  class="cd-option"
                  :class="{ active: form.activityLevel === option.value }"
                  type="button"
                  @click="form.activityLevel = option.value; openEditorDropdown = null"
                >{{ option.label }}</button>
              </div>
            </div>

            <div class="pf-field custom-dropdown" :class="{ open: openEditorDropdown === 'equipment' }">
              <span class="cd-label">Preferred equipment</span>
              <button class="cd-trigger" type="button" @click.stop="toggleEditorDropdown('equipment')">
                <span>{{ EQUIPMENT_OPTIONS.find(o => o.value === form.equipment)?.label || 'Not set' }}</span>
                <ion-icon :icon="chevronDownOutline" />
              </button>
              <div v-if="openEditorDropdown === 'equipment'" class="cd-menu">
                <button
                  class="cd-option"
                  :class="{ active: !form.equipment }"
                  type="button"
                  @click="form.equipment = ''; openEditorDropdown = null"
                >Not set</button>
                <button
                  v-for="option in EQUIPMENT_OPTIONS"
                  :key="option.value"
                  class="cd-option"
                  :class="{ active: form.equipment === option.value }"
                  type="button"
                  @click="form.equipment = option.value; openEditorDropdown = null"
                >{{ option.label }}</button>
              </div>
            </div>

            <label class="pf-field">
              <span>Daily calories</span>
              <input v-model.number="form.dailyCalories" type="number" min="500" max="10000" placeholder="—" />
            </label>
            <label class="pf-field">
              <span>Daily protein (g)</span>
              <input v-model.number="form.dailyProtein" type="number" min="0" max="500" placeholder="—" />
            </label>
            <label class="pf-field">
              <span>Water target (glasses)</span>
              <input v-model.number="form.waterTarget" type="number" min="1" max="40" placeholder="8" />
            </label>
            <label class="pf-field">
              <span>Weekly training target</span>
              <input v-model.number="form.trainingTarget" type="number" min="1" max="14" placeholder="4" />
            </label>

            <p v-if="formError" class="pf-error pf-full">{{ formError }}</p>

            <div class="pf-actions pf-full">
              <button type="button" class="pf-cancel" @click="closeEditor">Cancel</button>
              <button type="submit" class="pf-save" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save changes' }}
              </button>
            </div>
          </form>
        </div>

        <div v-if="saving" class="profile-loading-overlay" role="status" aria-live="polite" @click.stop>
          <span class="profile-spinner" aria-hidden="true"></span>
          <strong>Saving profile...</strong>
          <small>Please wait while we upload your changes.</small>
        </div>
      </div>
    </transition>

    <!-- Photo permission primer -->
    <transition name="modal-fade">
      <div v-if="showPhotoPermission" class="profile-modal-backdrop" @click="dismissPhotoPermission">
        <div class="confirm-card" @click.stop>
          <span class="confirm-icon"><ion-icon :icon="imageOutline" /></span>
          <h2>Allow photo access</h2>
          <p>NutriFit needs access to your photos so you can choose, crop and upload a profile picture. Android will open your photo picker next — only the photo you pick is used.</p>
          <div class="confirm-actions">
            <button class="pf-cancel" type="button" @click="dismissPhotoPermission">Not now</button>
            <button class="pf-save" type="button" @click="allowPhotoAccess">Continue</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Crop profile picture -->
    <transition name="modal-fade">
      <div v-if="showCropper" class="profile-modal-backdrop crop-backdrop" @click="cancelCrop">
        <div class="profile-modal-card crop-card" @click.stop>
          <div class="pm-header">
            <div>
              <span class="pm-kicker">Profile picture</span>
              <h2>Crop photo</h2>
            </div>
            <button class="modal-close-btn" type="button" :disabled="cropBusy" @click="cancelCrop" aria-label="Close cropper">
              <ion-icon :icon="closeOutline" />
            </button>
          </div>

          <div class="crop-stage">
            <div
              ref="cropViewportRef"
              class="crop-viewport"
              @pointerdown="onCropPointerDown"
              @pointermove="onCropPointerMove"
              @pointerup="onCropPointerUp"
              @pointercancel="onCropPointerUp"
            >
              <img
                ref="cropImageRef"
                :src="cropSource"
                class="crop-image"
                :style="cropImageStyle"
                alt="Crop preview"
                draggable="false"
                @load="onCropImageLoad"
              />
              <span class="crop-grid" aria-hidden="true"></span>
            </div>
          </div>

          <div class="crop-controls">
            <span>Zoom</span>
            <input v-model.number="cropZoom" type="range" min="1" max="3" step="0.01" aria-label="Zoom photo" />
          </div>
          <p class="pf-hint crop-hint">Drag the photo to reposition it, or use the slider to zoom.</p>

          <div class="pf-actions">
            <button class="pf-cancel" type="button" :disabled="cropBusy" @click="cancelCrop">Cancel</button>
            <button class="pf-save" type="button" :disabled="cropBusy || !cropMeta" @click="applyCrop">
              {{ cropBusy ? 'Cropping...' : 'Use photo' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Settings panel -->
    <transition name="modal-fade">
      <div v-if="activePanel" class="profile-modal-backdrop" @click="closePanel">
        <div class="profile-modal-card panel-card" @click.stop>
          <div class="pm-header">
            <div>
              <span class="pm-kicker">{{ panelKicker }}</span>
              <h2>{{ panelTitle }}</h2>
            </div>
            <button class="modal-close-btn" type="button" @click="closePanel" aria-label="Close">
              <ion-icon :icon="closeOutline" />
            </button>
          </div>

          <div class="panel-body">
            <p v-if="panelNote" class="panel-note">{{ panelNote }}</p>

            <template v-if="activePanel === 'notifications'">
              <div class="pref-list">
                <div v-for="item in NOTIFICATION_ITEMS" :key="item.key" class="pref-row">
                  <div class="pref-copy">
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.hint }}</small>
                  </div>
                  <button
                    class="toggle"
                    :class="{ on: settings.notifications[item.key] }"
                    type="button"
                    role="switch"
                    :aria-checked="settings.notifications[item.key]"
                    :aria-label="item.label"
                    :disabled="settingsSaving"
                    @click="toggleNotification(item.key)"
                  >
                    <span></span>
                  </button>
                </div>
              </div>
              <p class="panel-hint">Reminders are stored with your account and applied on every device you sign in to.</p>
            </template>

            <template v-else-if="activePanel === 'theme'">
              <div class="option-list">
                <button
                  v-for="option in THEME_OPTIONS"
                  :key="option.value"
                  class="option-row"
                  :class="{ active: settings.theme === option.value }"
                  type="button"
                  :disabled="settingsSaving"
                  @click="setTheme(option.value)"
                >
                  <span class="option-swatch" :data-swatch="option.value" aria-hidden="true"></span>
                  <span class="option-copy">
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.hint }}</small>
                  </span>
                  <ion-icon v-if="settings.theme === option.value" class="option-check" :icon="checkmarkCircleOutline" />
                </button>
              </div>
            </template>

            <template v-else-if="activePanel === 'privacy'">
              <section class="panel-section">
                <h3>Change password</h3>
                <p class="panel-hint">Use at least 6 characters. You stay signed in after the change.</p>
                <form class="profile-form password-form" @submit.prevent="changePassword">
                  <label class="pf-field pf-full">
                    <span>New password</span>
                    <input v-model="passwordForm.password" type="password" autocomplete="new-password" placeholder="New password" />
                  </label>
                  <label class="pf-field pf-full">
                    <span>Confirm new password</span>
                    <input v-model="passwordForm.confirm" type="password" autocomplete="new-password" placeholder="Repeat password" />
                  </label>
                  <p v-if="passwordError" class="pf-error pf-full">{{ passwordError }}</p>
                  <p v-if="passwordSuccess" class="pf-success pf-full">{{ passwordSuccess }}</p>
                  <div class="pf-actions pf-full">
                    <button type="submit" class="pf-save" :disabled="passwordSaving">
                      {{ passwordSaving ? 'Updating...' : 'Update password' }}
                    </button>
                  </div>
                </form>
              </section>

              <section class="panel-section">
                <h3>Your data</h3>
                <div class="pref-list">
                  <div class="pref-row">
                    <div class="pref-copy">
                      <strong>Download my data</strong>
                      <small>Export your profile, meals, workouts and settings as JSON.</small>
                    </div>
                    <button class="panel-action" type="button" @click="downloadData">Download</button>
                  </div>
                  <div class="pref-row">
                    <div class="pref-copy">
                      <strong>Sign out everywhere</strong>
                      <small>End every active session on all of your devices.</small>
                    </div>
                    <button class="panel-action" type="button" :disabled="privacyBusy" @click="confirmSignOutEverywhere">
                      Sign out
                    </button>
                  </div>
                  <div class="pref-row danger-row">
                    <div class="pref-copy">
                      <strong>Delete account</strong>
                      <small>Permanently remove your account and all synced data.</small>
                    </div>
                    <button class="panel-action danger" type="button" @click="openDeleteConfirm">Delete</button>
                  </div>
                </div>
              </section>
            </template>

            <template v-else-if="activePanel === 'terms'">
              <div class="legal-copy">
                <p class="legal-meta">Last updated: 31 October 2026</p>
                <h3>1. Using NutriFit</h3>
                <p>NutriFit helps you record meals, hydration, workouts and goals. By creating an account you agree to use the app for personal, lawful purposes and to keep your login details secure.</p>
                <h3>2. Not medical advice</h3>
                <p>Nutrition and training information in NutriFit is general guidance, not medical advice. Speak to a qualified professional before changing your diet, training or supplements, especially if you have a medical condition.</p>
                <h3>3. Your content</h3>
                <p>You own the data you enter. You grant NutriFit permission to store and sync that data so the service can work across your devices. You are responsible for the accuracy of what you log.</p>
                <h3>4. Availability</h3>
                <p>We aim to keep the service available but cannot guarantee uninterrupted access. Features may change as the app develops.</p>
                <h3>5. Ending your account</h3>
                <p>You can delete your account at any time from Privacy and security. Deletion removes your profile and synced records.</p>
                <h3>6. Contact</h3>
                <p>Questions about these terms can be sent to thenutrifitcom@gmail.com.</p>
              </div>
            </template>

            <template v-else-if="activePanel === 'policy'">
              <div class="legal-copy">
                <p class="legal-meta">Last updated: 31 October 2026</p>
                <h3>What we store</h3>
                <p>Your email address, display name, profile details, goals, water logs, meals, workouts, plans and preferences. Meal photos stay on your device and are never uploaded to our database.</p>
                <h3>Where it is stored</h3>
                <p>Account data is stored in Supabase, protected by row level security so only you can read or write your rows. A local copy is kept on your device for fast loading and offline use.</p>
                <h3>How it is used</h3>
                <p>Your data is used only to run the app: showing progress, generating summaries and syncing between your devices. We do not sell your data or use it for advertising.</p>
                <h3>Third parties</h3>
                <p>Supabase provides authentication and database hosting. Google sign-in is optional. The AI coach sends the prompt you write to Google Gemini to generate a reply.</p>
                <h3>Your controls</h3>
                <p>You can export your data, change your password, sign out of every device, or delete your account from Privacy and security.</p>
                <h3>Contact</h3>
                <p>Privacy questions can be sent to privacy@nutrifit.app.</p>
              </div>
            </template>

            <template v-else-if="activePanel === 'about'">
              <div class="about-block">
                <div class="about-mark">
                  <img src="/nf-icon.png" alt="NutriFit logo" />
                </div>
                <div>
                  <h3>NutriFit</h3>
                  <p>Elite fitness and nutrition tracking. Log meals, water and training, plan your week and keep your goals in view.</p>
                </div>
              </div>
              <div class="info-list about-info">
                <div class="info-row"><span>Version</span><b>{{ appVersion }}</b></div>
                <div class="info-row"><span>Account</span><b>{{ userEmail }}</b></div>
                <div class="info-row"><span>Cloud database</span><b>{{ dbStatus === 'error' ? 'Needs setup' : 'Supabase' }}</b></div>
                <div class="info-row"><span>Last sync</span><b>{{ lastSyncLabel }}</b></div>
              </div>
              <p class="panel-hint">Built with Vue, Ionic and Supabase. Your data belongs to you.</p>
            </template>
          </div>
        </div>
      </div>
    </transition>

    <!-- Sign out confirmation -->
    <transition name="modal-fade">
      <div v-if="showSignOutConfirm" class="profile-modal-backdrop" @click="closeSignOut">
        <div class="confirm-card" @click.stop>
          <span class="confirm-icon"><ion-icon :icon="logOutOutline" /></span>
          <h2>Sign out of NutriFit?</h2>
          <p class="alert-message">⚠️ Logout confirmation: Your data stays safely synced to your Supabase account. You can sign back in at any time.</p>
          <div class="confirm-actions">
            <button class="pf-cancel" type="button" :disabled="signingOut" @click="closeSignOut">Stay signed in</button>
            <button class="pf-save" type="button" :disabled="signingOut" @click="confirmSignOut">
              {{ signingOut ? 'Signing out...' : 'Sign out' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Delete account confirmation -->
    <transition name="modal-fade">
      <div v-if="showDeleteConfirm" class="profile-modal-backdrop" @click="closeDeleteConfirm">
        <div class="confirm-card" @click.stop>
          <span class="confirm-icon danger"><ion-icon :icon="trashOutline" /></span>
          <h2>Delete your account?</h2>
          <p>This permanently removes your profile, meals, workouts, plans and settings from Supabase. This cannot be undone.</p>
          <label class="pf-field delete-field">
            <span>Type DELETE to confirm</span>
            <input v-model="deleteText" type="text" autocomplete="off" placeholder="DELETE" />
          </label>
          <p v-if="deleteError" class="pf-error">{{ deleteError }}</p>
          <div class="confirm-actions">
            <button class="pf-cancel" type="button" :disabled="deleting" @click="closeDeleteConfirm">Keep account</button>
            <button class="pf-save danger-fill" type="button" :disabled="deleting || deleteText !== 'DELETE'" @click="confirmDeleteAccount">
              {{ deleting ? 'Deleting...' : 'Delete account' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Sign out everywhere confirmation modal -->
    <transition name="modal-fade">
      <div v-if="showSignOutEverywhereConfirm" class="profile-modal-backdrop" @click="showSignOutEverywhereConfirm = false">
        <div class="confirm-card" @click.stop>
          <span class="confirm-icon"><ion-icon :icon="logOutOutline" /></span>
          <h2>Sign out everywhere?</h2>
          <p>This will end every active session across all devices where you are currently signed in.</p>
          <div class="confirm-actions">
            <button class="pf-cancel" type="button" :disabled="privacyBusy" @click="showSignOutEverywhereConfirm = false">Cancel</button>
            <button class="pf-save danger-fill" type="button" :disabled="privacyBusy" @click="executeSignOutEverywhere">
              {{ privacyBusy ? 'Signing out...' : 'Sign out everywhere' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </ion-page>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { IonPage, IonContent } from '@ionic/vue';
import {
  arrowForwardOutline,
  personCircleOutline,
  trophyOutline,
  settingsOutline,
  notificationsOutline,
  moonOutline,
  shieldCheckmarkOutline,
  helpCircleOutline,
  documentTextOutline,
  lockClosedOutline,
  informationCircleOutline,
  logOutOutline,
  trashOutline,
  chevronForwardOutline,
  closeOutline,
  checkmarkCircleOutline,
  chevronDownOutline,
  cameraOutline,
  imageOutline,
} from 'ionicons/icons';
import { useAuth } from '../composables/useAuth';
import { useUserData } from '../composables/useUserData';
import { useSession } from '../composables/useSession';
import { updatePassword } from '../services/auth';
import {
  NOTIFICATION_ITEMS,
  THEME_OPTIONS,
  getLocale,
  themeLabel,
} from '../services/preferences';
import {
  ACTIVITY_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  clearUserStore,
} from '../services/userData';

const router = useRouter();
const { setProfileModalOpen } = useSession();
const {
  user,
  displayName,
  initials,
  avatarUrl,
  signOut,
  signOutEverywhere,
  deleteAccount,
  updateDisplayName,
  updateAvatar,
} = useAuth();
const {
  profile,
  labels,
  streak,
  memberSinceMonth,
  completion,
  settings,
  saveProfile,
  saveSettings,
  exportUserData,
  refreshData,
  dataLoading,
  dbStatus,
  dbError,
  lastSyncedAt,
} = useUserData();

const appVersion = '1.0.0';
const signingOut = ref(false);
const showEditor = ref(false);
const saving = ref(false);
const formError = ref('');
const form = ref({});

const avatarInput = ref(null);
const showPhotoPermission = ref(false);
const photoProcessing = ref(false);

const showCropper = ref(false);
const cropSource = ref('');
const cropImageRef = ref(null);
const cropViewportRef = ref(null);
const cropMeta = ref(null);
const cropZoom = ref(1);
const cropOffset = ref({ x: 0, y: 0 });
const cropBusy = ref(false);
const cropDrag = ref(null);

const openEditorDropdown = ref(null);
const toggleEditorDropdown = (name) => {
  openEditorDropdown.value = openEditorDropdown.value === name ? null : name;
};

const activePanel = ref('');
const settingsSaving = ref(false);
const panelNote = ref('');
let noteTimer = 0;

const showSignOutConfirm = ref(false);
const showDeleteConfirm = ref(false);
const showSignOutEverywhereConfirm = ref(false);
const deleteText = ref('');
const deleteError = ref('');
const deleting = ref(false);
const privacyBusy = ref(false);

const confirmSignOutEverywhere = () => {
  showSignOutEverywhereConfirm.value = true;
};

const executeSignOutEverywhere = async () => {
  if (privacyBusy.value) return;
  privacyBusy.value = true;
  try {
    await signOutEverywhere();
    showSignOutEverywhereConfirm.value = false;
    closePanel();
    await router.replace('/auth');
  } catch (error) {
    setNote(error?.message || 'Could not sign out everywhere.');
  } finally {
    privacyBusy.value = false;
  }
};

const passwordForm = ref({ password: '', confirm: '' });
const passwordSaving = ref(false);
const passwordError = ref('');
const passwordSuccess = ref('');

watch([showEditor, activePanel, showSignOutConfirm, showDeleteConfirm, showSignOutEverywhereConfirm, showPhotoPermission, showCropper], ([editor, panel, signOutModal, deleteModal, signOutEverywhereModal, photoPrompt, cropper]) => {
  setProfileModalOpen(Boolean(editor || panel || signOutModal || deleteModal || signOutEverywhereModal || photoPrompt || cropper));
  if (!editor) openEditorDropdown.value = null;
});

const userEmail = computed(() => user.value?.email || 'Not signed in');

const avatarSrc = computed(() => {
  if (avatarUrl.value) return avatarUrl.value;
  const text = String(initials.value || 'NF').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="#1c1c1c"/><text x="80" y="80" fill="#f5f5f5" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="500" text-anchor="middle" dominant-baseline="central">${text}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
});

const updatedLabel = computed(() => {
  if (!profile.value.updatedAt) return 'Never';
  const date = new Date(profile.value.updatedAt);
  if (Number.isNaN(date.getTime())) return 'Never';
  return new Intl.DateTimeFormat(getLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
});

const lastSyncLabel = computed(() => {
  if (!lastSyncedAt.value) return dbStatus.value === 'synced' ? 'Just now' : 'Not yet';
  const date = new Date(lastSyncedAt.value);
  if (Number.isNaN(date.getTime())) return 'Not yet';
  return new Intl.DateTimeFormat(getLocale(), {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(date);
});

const enabledNotifications = computed(
  () => NOTIFICATION_ITEMS.filter((item) => settings.value.notifications?.[item.key]).length
);

const syncTitle = computed(() => {
  if (dataLoading.value) return 'Syncing your data';
  if (dbStatus.value === 'error') return 'Cloud sync needs attention';
  if (dbStatus.value === 'synced') return 'Synced to Supabase';
  return 'Saved on this device';
});

const syncDetail = computed(() => {
  if (dataLoading.value) return 'Reading your account from Supabase...';
  if (dbStatus.value === 'error') {
    return dbError.value || 'Your changes are safe on this device. Check DATABASE_SETUP.md.';
  }
  if (dbStatus.value === 'synced') return `Last synced ${lastSyncLabel.value}`;
  return 'Sign in to sync your profile with Supabase.';
});

const PANEL_META = {
  notifications: { kicker: 'Preferences', title: 'Notifications' },
  theme: { kicker: 'Preferences', title: 'Theme' },
  privacy: { kicker: 'Account', title: 'Privacy and security' },
  terms: { kicker: 'Support', title: 'Terms and conditions' },
  policy: { kicker: 'Support', title: 'Privacy Policy' },
  about: { kicker: 'Support', title: 'About NutriFit' },
};

const panelKicker = computed(() => PANEL_META[activePanel.value]?.kicker || 'Settings');
const panelTitle = computed(() => PANEL_META[activePanel.value]?.title || 'Settings');

const setNote = (message) => {
  panelNote.value = message;
  window.clearTimeout(noteTimer);
  if (message) noteTimer = window.setTimeout(() => (panelNote.value = ''), 4000);
};

const openPanel = (panel) => {
  activePanel.value = panel;
  panelNote.value = '';
  passwordError.value = '';
  passwordSuccess.value = '';
  passwordForm.value = { password: '', confirm: '' };
};

const closePanel = () => {
  activePanel.value = '';
  panelNote.value = '';
};

const applySettings = async (patch) => {
  if (settingsSaving.value) return;
  settingsSaving.value = true;
  const result = await saveSettings(patch);
  settingsSaving.value = false;
  setNote(
    result?.ok === false
      ? result.error || 'Could not save that preference. It is stored on this device only.'
      : 'Preference saved.'
  );
};

const toggleNotification = (key) =>
  applySettings({
    notifications: { [key]: !settings.value.notifications[key] },
  });

const setTheme = (theme) => {
  if (settings.value.theme === theme) return;
  applySettings({ theme });
};

const PHOTO_PRIMER_KEY = 'nutrifit:photo-primer-seen';
let photoPrimerSeen = false;
try {
  photoPrimerSeen = localStorage.getItem(PHOTO_PRIMER_KEY) === '1';
} catch {
  // Storage can be unavailable; the primer then shows on every upload.
}

const openAvatarPicker = () => avatarInput.value?.click();

const requestPhotoAccess = () => {
  if (photoPrimerSeen) {
    openAvatarPicker();
    return;
  }
  showPhotoPermission.value = true;
};

const allowPhotoAccess = () => {
  showPhotoPermission.value = false;
  photoPrimerSeen = true;
  try {
    localStorage.setItem(PHOTO_PRIMER_KEY, '1');
  } catch {
    // Ignore storage failures.
  }
  openAvatarPicker();
};

const dismissPhotoPermission = () => {
  showPhotoPermission.value = false;
};

const handleAvatarFile = (event) => {
  const file = event.target.files?.[0];
  // Reset so the same photo can be picked again after cancelling the cropper.
  event.target.value = '';
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    formError.value = 'Please select a valid image file.';
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    formError.value = 'That photo is too large. Choose an image under 15 MB.';
    return;
  }

  formError.value = '';
  photoProcessing.value = true;

  const reader = new FileReader();
  reader.onload = async (e) => {
    photoProcessing.value = false;
    const src = String(e.target?.result || '');
    if (!src) {
      formError.value = 'Could not read that photo. Please try another image.';
      return;
    }
    cropSource.value = src;
    cropZoom.value = 1;
    cropOffset.value = { x: 0, y: 0 };
    cropMeta.value = null;
    showCropper.value = true;
    await nextTick();
  };
  reader.onerror = () => {
    photoProcessing.value = false;
    formError.value = 'Could not read that photo. Please try another image.';
  };
  reader.readAsDataURL(file);
};

const clampCropOffset = () => {
  const meta = cropMeta.value;
  if (!meta) return;
  const maxX = Math.max(0, (meta.baseW * cropZoom.value - meta.boxW) / 2);
  const maxY = Math.max(0, (meta.baseH * cropZoom.value - meta.boxH) / 2);
  cropOffset.value = {
    x: Math.min(maxX, Math.max(-maxX, cropOffset.value.x)),
    y: Math.min(maxY, Math.max(-maxY, cropOffset.value.y)),
  };
};

const cropImageStyle = computed(() => {
  const meta = cropMeta.value;
  if (!meta) return { opacity: 0 };
  return {
    width: `${meta.baseW}px`,
    height: `${meta.baseH}px`,
    transform: `translate(-50%, -50%) translate(${cropOffset.value.x}px, ${cropOffset.value.y}px) scale(${cropZoom.value})`,
  };
});

const onCropImageLoad = () => {
  const img = cropImageRef.value;
  const box = cropViewportRef.value;
  if (!img || !box) return;

  const boxW = box.clientWidth;
  const boxH = box.clientHeight;
  const coverScale = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight);
  cropMeta.value = {
    w: img.naturalWidth,
    h: img.naturalHeight,
    boxW,
    boxH,
    baseW: img.naturalWidth * coverScale,
    baseH: img.naturalHeight * coverScale,
  };
  clampCropOffset();
};

const onCropPointerDown = (event) => {
  if (!cropMeta.value) return;
  cropDrag.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: cropOffset.value.x,
    originY: cropOffset.value.y,
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
};

const onCropPointerMove = (event) => {
  const drag = cropDrag.value;
  if (!drag) return;
  cropOffset.value = {
    x: drag.originX + (event.clientX - drag.startX),
    y: drag.originY + (event.clientY - drag.startY),
  };
  clampCropOffset();
};

const onCropPointerUp = () => {
  cropDrag.value = null;
};

const cancelCrop = () => {
  if (cropBusy.value) return;
  showCropper.value = false;
  cropSource.value = '';
  cropMeta.value = null;
  cropDrag.value = null;
};

const applyCrop = () => {
  const img = cropImageRef.value;
  const box = cropViewportRef.value;
  const meta = cropMeta.value;
  if (!img || !box || !meta || cropBusy.value) return;

  cropBusy.value = true;
  try {
    const viewport = box.getBoundingClientRect();
    const image = img.getBoundingClientRect();
    const scaleX = meta.w / image.width;
    const scaleY = meta.h / image.height;

    const sx = Math.max(0, (viewport.left - image.left) * scaleX);
    const sy = Math.max(0, (viewport.top - image.top) * scaleY);
    const sw = Math.min(meta.w - sx, viewport.width * scaleX);
    const sh = Math.min(meta.h - sy, viewport.height * scaleY);

    if (sw <= 0 || sh <= 0) {
      formError.value = 'Could not crop that photo. Please try another image.';
      return;
    }

    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);

    form.value.avatarUrl = canvas.toDataURL('image/jpeg', 0.8);
    showCropper.value = false;
    cropSource.value = '';
    cropMeta.value = null;
    cropDrag.value = null;
    formError.value = '';
  } finally {
    cropBusy.value = false;
  }
};

watch(cropZoom, clampCropOffset);

const openEditor = () => {
  form.value = { ...profile.value, avatarUrl: avatarUrl.value || '' };
  formError.value = '';
  showEditor.value = true;
};

const closeEditor = () => {
  if (saving.value) return;
  showEditor.value = false;
  formError.value = '';
};

const saveEditor = async () => {
  if (saving.value) return;
  formError.value = '';
  saving.value = true;

  try {
    const nextName = String(form.value.fullName || '').trim();
    const nextAvatar = String(form.value.avatarUrl || '').trim();
    const result = await saveProfile({ ...form.value, fullName: nextName, avatarUrl: nextAvatar });

    if (result?.ok === false) {
      formError.value = result.error || 'Could not save your profile to Supabase.';
      return;
    }

    if (nextName && nextName !== displayName.value) {
      try {
        await updateDisplayName(nextName);
      } catch (error) {
        formError.value = 'Profile saved, but your account name could not be updated.';
        return;
      }
    }

    if (nextAvatar !== (avatarUrl.value || '')) {
      try {
        await updateAvatar(nextAvatar);
      } catch (error) {
        formError.value = 'Profile saved, but your avatar could not be updated.';
        return;
      }
    }

    showEditor.value = false;
  } catch (error) {
    formError.value = error?.message || 'Could not save your profile. Please try again.';
  } finally {
    saving.value = false;
  }
};

const changePassword = async () => {
  passwordError.value = '';
  passwordSuccess.value = '';

  const password = passwordForm.value.password || '';
  if (password.length < 6) {
    passwordError.value = 'Password must be at least 6 characters.';
    return;
  }
  if (password !== passwordForm.value.confirm) {
    passwordError.value = 'The two passwords do not match.';
    return;
  }

  passwordSaving.value = true;
  try {
    await updatePassword(password);
    passwordForm.value = { password: '', confirm: '' };
    passwordSuccess.value = 'Password updated. Use it next time you sign in.';
  } catch (error) {
    passwordError.value = error?.message || 'Could not update your password.';
  } finally {
    passwordSaving.value = false;
  }
};

const downloadData = () => {
  const payload = exportUserData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `nutrifit-data-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setNote('Your data export has been downloaded.');
};

const requestSignOut = () => {
  showSignOutConfirm.value = true;
};

const closeSignOut = () => {
  if (signingOut.value) return;
  showSignOutConfirm.value = false;
};

const confirmSignOut = async () => {
  if (signingOut.value) return;
  signingOut.value = true;
  try {
    await signOut();
    showSignOutConfirm.value = false;
    await router.replace('/auth');
  } finally {
    signingOut.value = false;
  }
};

const openDeleteConfirm = () => {
  deleteText.value = '';
  deleteError.value = '';
  showDeleteConfirm.value = true;
};

const closeDeleteConfirm = () => {
  if (deleting.value) return;
  showDeleteConfirm.value = false;
};

const confirmDeleteAccount = async () => {
  if (deleting.value || deleteText.value !== 'DELETE') return;
  deleting.value = true;
  deleteError.value = '';
  const userId = user.value?.id;
  try {
    await deleteAccount();
    if (userId) clearUserStore(userId);
    showDeleteConfirm.value = false;
    await router.replace('/auth');
  } catch (error) {
    deleteError.value =
      error?.message ||
      'Could not delete your account. Make sure the database migration has been applied.';
  } finally {
    deleting.value = false;
  }
};
</script>

<style scoped>
  :host {
    display: block;
    padding-top: 0;
  }

  .profile-content {
    --background: var(--bg);
  }

  .profile-shell {
    width: 100%;
    max-width: none;
    margin: 0;
    padding-top: clamp(0.6rem, 1.2vw, 0.9rem);
  }

  .profile-hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: clamp(1rem, 2.5vw, 3rem);
    padding-bottom: clamp(0.8rem, 1.4vw, 1.1rem);
    border-bottom: 1px solid var(--line);
  }

  .hero-copy h1 {
    margin-top: 0.3rem;
    font-size: clamp(2rem, 4.6vw, 3.3rem);
    font-weight: 500;
    line-height: 0.88;
    letter-spacing: 0.005em;
    text-transform: uppercase;
  }

  .hero-copy h1 span {
    color: var(--dim);
  }

  .page-subtitle {
    max-width: 48ch;
    margin-top: 0.55rem;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.7;
  }

  .hero-side {
    padding-bottom: 0.2rem;
  }

  .page-tag {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    color: var(--text-soft);
    font-size: 0.46rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .profile-banner {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: clamp(1rem, 2.5vw, 2.5rem);
    margin-top: clamp(0.9rem, 1.6vw, 1.3rem);
    padding: clamp(1.1rem, 2.2vw, 1.6rem);
    border-left: 1px solid var(--line-strong);
    border-right: 1px solid var(--line-strong);
    border-top: none;
    border-bottom: none;
    border-radius: var(--radius-lg);
    background:
      linear-gradient(135deg, rgba(14, 14, 14, 0.94), rgba(22, 22, 22, 0.9)),
      url('/nf-icon.png');
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;
    color: var(--always-white);
    overflow: hidden;
  }

  .profile-banner::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(16, 16, 16, 0.65) 0%, rgba(10, 10, 10, 0.92) 85%);
    pointer-events: none;
    z-index: 0;
  }

  .banner-main,
  .banner-stats {
    position: relative;
    z-index: 1;
  }

  .banner-main {
    display: flex;
    align-items: center;
    gap: clamp(0.9rem, 1.8vw, 1.3rem);
    min-width: 0;
  }

  .avatar-ring {
    flex-shrink: 0;
    padding: 0.25rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.05);
  }

  .avatar-ring img {
    display: block;
    width: clamp(3.4rem, 5.2vw, 4.4rem);
    height: clamp(3.4rem, 5.2vw, 4.4rem);
    border-radius: 0.75rem;
    filter: none;
  }

  .profile-info {
    display: grid;
    gap: 0.15rem;
    min-width: 0;
  }

  .banner-kicker {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .profile-info h2 {
    margin-top: 0.05rem;
    color: var(--always-white);
    font-size: clamp(1.3rem, 2.4vw, 1.8rem);
    font-weight: 500;
    line-height: 0.95;
    letter-spacing: 0.005em;
    text-transform: uppercase;
  }

  .profile-info p {
    color: var(--muted);
    font-size: 0.62rem;
  }

  .profile-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.45rem;
  }

  .profile-tags span {
    display: inline-flex;
    align-items: center;
    padding: 0.28rem 0.52rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-soft);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .edit-button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-left: auto;
    padding: 0.6rem 0.95rem;
    border: 1px solid var(--always-white);
    border-radius: 9px;
    background: var(--always-white);
    color: var(--always-black);
    font-family: var(--font-display);
    font-size: 0.54rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    transition: background-color 0.3s var(--ease), transform 0.3s var(--ease);
  }

  .edit-button:hover {
    background: #e2e2e2;
  }

  .edit-button:active {
    transform: scale(0.98);
  }

  .banner-stats {
    display: flex;
    gap: clamp(1rem, 2.5vw, 2.2rem);
    padding-left: clamp(1rem, 2.5vw, 2.2rem);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  .banner-stat {
    display: grid;
    gap: 0.2rem;
    min-width: 70px;
  }

  .banner-stat span {
    color: var(--dim);
    font-size: 0.42rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .banner-stat strong {
    color: var(--always-white);
    font-family: var(--font-display);
    font-size: clamp(1.1rem, 1.8vw, 1.5rem);
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
  }

  .banner-stat strong small {
    margin-left: 0.1rem;
    color: var(--muted);
    font-family: var(--font-body);
    font-size: 0.36em;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    align-items: start;
    gap: clamp(0.7rem, 1.2vw, 1rem);
    margin-top: clamp(0.7rem, 1.2vw, 1rem);
  }

  .profile-column,
  .settings-column {
    display: grid;
    gap: clamp(0.7rem, 1.2vw, 1rem);
    min-width: 0;
  }

  .settings-card {
    padding: clamp(0.85rem, 1.5vw, 1.15rem);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--line);
  }

  .card-head h3 {
    margin-top: 0.25rem;
    font-size: clamp(1.05rem, 1.5vw, 1.25rem);
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 1;
    text-transform: uppercase;
  }

  .head-icon {
    display: grid;
    place-items: center;
    width: 1.8rem;
    height: 1.8rem;
    flex-shrink: 0;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    color: var(--text-soft);
    font-size: 0.8rem;
  }

  .info-list {
    display: grid;
  }

  .info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    padding: 0.55rem 0;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
    font-size: 0.6rem;
  }

  .info-row b {
    color: var(--text);
    font-size: 0.58rem;
    font-weight: 500;
    text-align: right;
  }

  .card-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    padding-top: 0.7rem;
    color: var(--dim);
    font-size: 0.46rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .card-foot strong {
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.62rem;
    font-weight: 400;
    letter-spacing: 0.04em;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
    padding-top: 0.7rem;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    padding: 0.6rem;
    border: 1px solid var(--line);
    border-radius: 0.65rem;
    background: var(--surface-2);
    color: var(--text-soft);
    text-align: left;
  }

  .action-item:hover {
    border-color: var(--line-strong);
    background: var(--surface-3);
    transform: translateY(-2px);
  }

  .action-icon {
    display: grid;
    place-items: center;
    width: 1.6rem;
    height: 1.6rem;
    flex-shrink: 0;
    border: 1px solid var(--line);
    border-radius: 0.4rem;
    color: var(--muted);
    font-size: 0.72rem;
  }

  .action-copy {
    display: grid;
    gap: 0.05rem;
    min-width: 0;
  }

  .action-copy strong {
    overflow: hidden;
    color: var(--text-soft);
    font-size: 0.56rem;
    font-weight: 500;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .action-copy small {
    color: var(--dim);
    font-size: 0.46rem;
  }

  .action-item .chevron {
    margin-left: auto;
    color: var(--dim);
    font-size: 0.65rem;
  }

  .action-item.danger {
    border-color: var(--line-strong);
  }

  .action-item.danger .action-icon,
  .action-item.danger .chevron,
  .action-item.danger strong {
    color: var(--white);
  }

  /* ------------------------------------------------------------------ */
  /* Edit profile modal                                                  */
  /* ------------------------------------------------------------------ */

  .profile-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: grid;
    place-items: center;
    padding: clamp(0.8rem, 3vw, 2rem);
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(6px);
    overflow-y: auto;
  }

  .profile-modal-card {
    position: relative;
    width: min(100%, 640px);
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    padding: clamp(1rem, 2.4vw, 1.5rem);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
  }

  .pm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid var(--line);
  }

  .pm-kicker {
    display: block;
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .pm-header h2 {
    margin-top: 0.25rem;
    font-size: clamp(1.2rem, 2.4vw, 1.6rem);
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 1;
    text-transform: uppercase;
  }

  .modal-close-btn {
    display: grid;
    place-items: center;
    width: 1.9rem;
    height: 1.9rem;
    flex-shrink: 0;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    background: var(--surface-2);
    color: var(--text-soft);
    font-size: 0.85rem;
    transition: border-color 0.25s var(--ease), background-color 0.25s var(--ease);
  }

  .modal-close-btn:hover {
    border-color: var(--line-strong);
    background: var(--surface-3);
  }

  .profile-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem;
    padding-top: 0.9rem;
  }

  .pf-field {
    display: grid;
    gap: 0.3rem;
    min-width: 0;
  }

  .pf-field > span {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .pf-field input,
  .pf-field select {
    width: 100%;
    min-width: 0;
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--line);
    border-radius: 0.55rem;
    background: var(--surface-2);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 0.66rem;
    outline: none;
    transition: border-color 0.25s var(--ease), background-color 0.25s var(--ease);
  }

  .pf-field input:focus,
  .pf-field select:focus {
    border-color: var(--line-strong);
    background: var(--surface-3);
  }

  .pf-field input::placeholder {
    color: var(--dim);
  }

  .pf-field select option {
    background: var(--surface);
    color: var(--text);
  }

  .pf-full {
    grid-column: 1 / -1;
  }

  .pf-error {
    margin: 0;
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.55rem;
    color: var(--text-soft);
    font-size: 0.58rem;
    line-height: 1.5;
  }

  .pf-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.3rem;
  }

  .pf-cancel,
  .pf-save {
    padding: 0.6rem 0.95rem;
    border-radius: 9px;
    font-family: var(--font-display);
    font-size: 0.54rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: background-color 0.25s var(--ease), border-color 0.25s var(--ease), transform 0.25s var(--ease);
  }

  .pf-cancel {
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--text-soft);
  }

  .pf-cancel:hover {
    background: var(--surface-2);
  }

  .pf-save {
    border: 1px solid var(--white);
    background: var(--white);
    color: var(--black);
  }

  .pf-save:hover:not(:disabled) {
    background: #e2e2e2;
  }

  .pf-save:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .pf-cancel:active,
  .pf-save:active:not(:disabled) {
    transform: scale(0.98);
  }

  .modal-fade-enter-active,
  .modal-fade-leave-active {
    transition: opacity 0.22s var(--ease);
  }

  .modal-fade-enter-from,
  .modal-fade-leave-to {
    opacity: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Sync status                                                         */
  /* ------------------------------------------------------------------ */

  .sync-strip {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    margin-top: 0.7rem;
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--line);
    border-radius: 0.65rem;
    background: var(--surface-2);
  }

  .sync-dot {
    width: 0.4rem;
    height: 0.4rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--muted);
  }

  .sync-synced .sync-dot {
    background: var(--white);
  }

  .sync-error .sync-dot {
    background: var(--white);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.16);
  }

  .sync-copy {
    display: grid;
    gap: 0.1rem;
    min-width: 0;
  }

  .sync-copy strong {
    color: var(--text-soft);
    font-size: 0.54rem;
    font-weight: 500;
  }

  .sync-copy small {
    overflow: hidden;
    color: var(--dim);
    font-size: 0.46rem;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sync-refresh {
    margin-left: auto;
    flex-shrink: 0;
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    background: transparent;
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.44rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sync-refresh:hover:not(:disabled) {
    background: var(--surface-3);
  }

  .sync-refresh:disabled {
    opacity: 0.55;
  }

  /* ------------------------------------------------------------------ */
  /* Settings panel                                                      */
  /* ------------------------------------------------------------------ */

  .panel-card {
    width: min(100%, 560px);
  }

  .panel-body {
    display: grid;
    gap: 0.9rem;
    padding-top: 0.9rem;
  }

  .panel-note {
    margin: 0;
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.55rem;
    background: var(--surface-2);
    color: var(--text-soft);
    font-size: 0.56rem;
    line-height: 1.5;
  }

  .panel-hint {
    margin: 0;
    color: var(--dim);
    font-size: 0.52rem;
    line-height: 1.6;
  }

  .pref-list,
  .option-list {
    display: grid;
    gap: 0.45rem;
  }

  .pref-row {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.65rem;
    border: 1px solid var(--line);
    border-radius: 0.65rem;
    background: var(--surface-2);
  }

  .pref-copy {
    display: grid;
    gap: 0.12rem;
    min-width: 0;
  }

  .pref-copy strong {
    color: var(--text-soft);
    font-size: 0.6rem;
    font-weight: 500;
    line-height: 1.3;
  }

  .pref-copy small {
    color: var(--dim);
    font-size: 0.5rem;
    line-height: 1.45;
  }

  .toggle {
    position: relative;
    width: 2.1rem;
    height: 1.15rem;
    margin-left: auto;
    flex-shrink: 0;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: var(--surface-3);
    transition: background-color 0.25s var(--ease), border-color 0.25s var(--ease);
  }

  .toggle span {
    position: absolute;
    top: 50%;
    left: 0.15rem;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: var(--muted);
    transform: translateY(-50%);
    transition: left 0.25s var(--ease), background-color 0.25s var(--ease);
  }

  .toggle.on {
    border-color: var(--white);
    background: var(--white);
  }

  .toggle.on span {
    left: calc(100% - 0.9rem);
    background: var(--black);
  }

  .toggle:disabled {
    opacity: 0.6;
  }

  .option-row {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.7rem;
    border: 1px solid var(--line);
    border-radius: 0.65rem;
    background: var(--surface-2);
    color: var(--text-soft);
    text-align: left;
    transition: border-color 0.25s var(--ease), background-color 0.25s var(--ease);
  }

  .option-row:hover {
    border-color: var(--line-strong);
    background: var(--surface-3);
  }

  .option-row.active {
    border-color: var(--line-strong);
    background: var(--surface-3);
  }

  .option-swatch {
    width: 1.6rem;
    height: 1.6rem;
    flex-shrink: 0;
    border: 1px solid var(--line-strong);
    border-radius: 0.4rem;
    background: #050505;
  }

  .option-swatch[data-swatch='dim'] {
    background: #1d2126;
  }

  .option-swatch[data-swatch='contrast'] {
    background: #000000;
    box-shadow: inset 0 0 0 2px #ffffff;
  }

  .option-copy {
    display: grid;
    gap: 0.1rem;
    min-width: 0;
  }

  .option-copy strong {
    font-size: 0.6rem;
    font-weight: 500;
    line-height: 1.3;
  }

  .option-copy small {
    color: var(--dim);
    font-size: 0.5rem;
  }

  .option-check {
    margin-left: auto;
    flex-shrink: 0;
    color: var(--white);
    font-size: 1rem;
  }

  .panel-section {
    display: grid;
    gap: 0.6rem;
  }

  .panel-section + .panel-section {
    padding-top: 0.9rem;
    border-top: 1px solid var(--line);
  }

  .panel-section h3 {
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .password-form {
    grid-template-columns: 1fr;
    padding-top: 0;
  }

  .pf-success {
    margin: 0;
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.55rem;
    color: var(--text-soft);
    font-size: 0.58rem;
    line-height: 1.5;
  }

  .panel-action {
    margin-left: auto;
    flex-shrink: 0;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    background: transparent;
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.46rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .panel-action:hover:not(:disabled) {
    background: var(--surface-3);
  }

  .panel-action:disabled {
    opacity: 0.55;
  }

  .panel-action.danger {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .danger-row {
    border-color: var(--line-strong);
  }

  .legal-copy {
    display: grid;
    gap: 0.4rem;
  }

  .legal-copy h3 {
    margin-top: 0.45rem;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 0.62rem;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: 0;
    text-transform: none;
  }

  .legal-copy p {
    margin: 0;
    color: var(--muted);
    font-size: 0.56rem;
    line-height: 1.7;
  }

  .legal-meta {
    color: var(--dim) !important;
    font-size: 0.48rem !important;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .about-block {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.8rem;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    background: var(--surface-2);
  }

  .about-mark {
    display: grid;
    place-items: center;
    width: 2.8rem;
    height: 2.8rem;
    flex-shrink: 0;
    border: 1px solid var(--line-strong);
    border-radius: 0.6rem;
  }

  .about-mark img {
    width: 1.9rem;
    height: 1.9rem;
    object-fit: contain;
  }

  .about-block h3 {
    font-size: 1rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .about-block p {
    margin-top: 0.2rem;
    color: var(--muted);
    font-size: 0.54rem;
    line-height: 1.55;
  }

  .about-info {
    border-top: 1px solid var(--line);
  }

  /* ------------------------------------------------------------------ */
  /* Confirmation dialogs                                                */
  /* ------------------------------------------------------------------ */

  .confirm-card {
    width: min(100%, 400px);
    padding: clamp(1.1rem, 3vw, 1.5rem);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--text);
    text-align: center;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
  }

  .confirm-icon {
    display: inline-grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    margin-bottom: 0.7rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.7rem;
    color: var(--text-soft);
    font-size: 1.1rem;
  }

  .confirm-icon.danger {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .confirm-card h2 {
    font-size: clamp(1.15rem, 2.6vw, 1.45rem);
    font-weight: 500;
    line-height: 1.05;
    text-transform: uppercase;
  }

  .confirm-card > p {
    margin: 0.55rem 0 0;
    color: var(--muted);
    font-size: 0.58rem;
    line-height: 1.65;
  }

  .confirm-actions {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .delete-field {
    margin-top: 0.85rem;
    text-align: left;
  }

  .confirm-card .pf-error {
    margin-top: 0.6rem;
    text-align: left;
  }

  .danger-fill {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .danger-fill:disabled {
    opacity: 0.4;
  }

  @media (max-width: 1100px) {
    .profile-banner {
      grid-template-columns: 1fr;
    }

    .banner-stats {
      padding-top: 0.85rem;
      padding-left: 0;
      border-top: 1px solid var(--line);
      border-left: 0;
    }
  }

  @media (max-width: 960px) {
    .profile-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 820px) {
    .profile-hero {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.8rem;
    }

    .banner-main {
      flex-wrap: wrap;
    }

    .profile-info {
      flex: 1;
      min-width: 160px;
    }

    .edit-button {
      order: 3;
      margin-left: 0;
    }
  }

  @media (max-width: 700px) {
    .hero-copy h1 {
      font-size: clamp(1.9rem, 9vw, 2.7rem);
    }

    .action-grid {
      grid-template-columns: 1fr;
    }

    .profile-modal-backdrop {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .profile-modal-card,
    .confirm-card {
      max-height: none;
    }

    .sync-copy small {
      white-space: normal;
    }

    .pref-row {
      align-items: flex-start;
    }

    .toggle {
      margin-top: 0.1rem;
    }
  }

  @media (max-width: 480px) {
    .profile-banner {
      padding: 0.85rem;
    }

    .avatar-ring img {
      width: 3rem;
      height: 3rem;
    }

    .profile-info h2 {
      font-size: 1.25rem;
    }

    .profile-tags span:last-child {
      display: none;
    }

    .edit-button {
      width: 100%;
      justify-content: center;
    }
  }
  /* Custom Dropdowns (Exercise style) */
  .profile-form .custom-dropdown {
    position: relative;
    display: grid;
    gap: 0.3rem;
    min-width: 0;
  }

  .profile-form .cd-label {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .profile-form .cd-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.3rem;
    width: 100%;
    min-width: 0;
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--line);
    border-radius: 0.55rem;
    background: var(--surface-2);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 0.66rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: border-color 0.25s var(--ease), background-color 0.25s var(--ease);
  }

  .profile-form .cd-trigger span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .profile-form .cd-trigger ion-icon {
    font-size: 0.65rem;
    color: var(--dim);
    flex-shrink: 0;
  }

  .profile-form .cd-trigger:hover {
    border-color: var(--line-strong);
    background: var(--surface-3);
  }

  .profile-form .custom-dropdown.open .cd-trigger {
    border-color: var(--line-strong);
    background: var(--surface-3);
  }

  .profile-form .cd-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    min-width: 160px;
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: 0.65rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
    padding: 0.3rem;
    display: grid;
    gap: 0.15rem;
    z-index: 1500;
    animation: cdMenuIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes cdMenuIn {
    from { transform: translateY(-4px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .profile-form .cd-option {
    width: 100%;
    padding: 0.5rem 0.65rem;
    background: transparent;
    border: none;
    border-radius: 0.45rem;
    color: var(--muted);
    font-size: 0.62rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s var(--ease);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .profile-form .cd-option:hover {
    background: var(--surface-3);
    color: var(--text);
  }

  .profile-form .cd-option.active {
    background: var(--white);
    color: var(--black);
    font-weight: 600;
  }

  .file-input-hidden {
    display: none;
  }

  .avatar-upload-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .file-upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 0.85rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.55rem;
    background: var(--surface-2);
    color: var(--text);
    font-size: 0.62rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s var(--ease);
  }

  .file-upload-btn:hover {
    border-color: var(--line-strong);
    background: var(--surface-3);
  }

  .remove-avatar-btn {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: 0.45rem;
    background: transparent;
    color: var(--muted);
    font-size: 0.55rem;
    cursor: pointer;
  }

  .remove-avatar-btn:hover {
    color: var(--text);
    border-color: var(--line-strong);
  }

  .avatar-preview-mini {
    flex-shrink: 0;
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    border: 1px solid var(--line-strong);
    overflow: hidden;
    background: var(--surface-2);
  }

  .avatar-preview-mini img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .pf-hint {
    color: var(--dim);
    font-size: 0.44rem;
    margin-top: 0.2rem;
    display: block;
  }

  .avatar-processing {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.35rem;
    color: var(--muted);
    font-size: 0.5rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .avatar-processing-spinner {
    width: 0.75rem;
    height: 0.75rem;
    border: 1.5px solid rgba(255, 255, 255, 0.2);
    border-top-color: var(--white);
    border-radius: 50%;
    animation: profileSpin 0.7s linear infinite;
  }

  /* Profile save loading state */
  .profile-loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 6;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    padding: 1rem;
    border-radius: inherit;
    background: rgba(5, 5, 5, 0.84);
    backdrop-filter: blur(9px);
    text-align: center;
  }

  .profile-spinner {
    width: 2.4rem;
    height: 2.4rem;
    border: 2px solid rgba(255, 255, 255, 0.18);
    border-top-color: var(--white);
    border-radius: 50%;
    animation: profileSpin 0.8s linear infinite;
  }

  .profile-loading-overlay strong {
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .profile-loading-overlay small {
    color: var(--muted);
    font-size: 0.55rem;
  }

  @keyframes profileSpin {
    to { transform: rotate(360deg); }
  }

  /* Crop photo */
  .crop-card {
    width: min(100%, 420px);
  }

  .crop-stage {
    display: flex;
    justify-content: center;
    padding: 1rem 0 0.8rem;
  }

  .crop-viewport {
    position: relative;
    width: min(300px, calc(100vw - 5rem));
    aspect-ratio: 1;
    overflow: hidden;
    border: 1px solid var(--line-strong);
    border-radius: 0.85rem;
    background: #050505;
    touch-action: none;
    cursor: grab;
    user-select: none;
  }

  .crop-viewport:active {
    cursor: grabbing;
  }

  .crop-image {
    position: absolute;
    left: 50%;
    top: 50%;
    max-width: none;
    pointer-events: none;
    transform-origin: center;
    transition: opacity 0.2s var(--ease);
  }

  .crop-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(to right, transparent 33.2%, rgba(255, 255, 255, 0.28) 33.3%, transparent 33.4%, transparent 66.5%, rgba(255, 255, 255, 0.28) 66.6%, transparent 66.7%),
      linear-gradient(to bottom, transparent 33.2%, rgba(255, 255, 255, 0.28) 33.3%, transparent 33.4%, transparent 66.5%, rgba(255, 255, 255, 0.28) 66.6%, transparent 66.7%);
  }

  .crop-controls {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0 0.15rem;
  }

  .crop-controls span {
    color: var(--dim);
    font-size: 0.46rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .crop-controls input[type="range"] {
    flex: 1;
    accent-color: var(--white);
  }

  .crop-hint {
    margin-top: 0.55rem;
  }
</style>

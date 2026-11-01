<template>
  <ion-page class="scanner-page">
    <ion-content :fullscreen="true" class="scanner-content" :style="{ '--padding-top': 'calc(5rem + env(safe-area-inset-top, 0))' }">
      <main class="scanner-shell-page">
        <section class="scanner-hero">
          <div class="hero-copy">
            <p class="eyebrow">Meal Scanner &amp; History</p>
            <h1>Scan. <span>Review.</span><br />Log.</h1>
          </div>
        </section>

        <section class="scanner-workspace">
          <article class="scanner-shell">
            <div class="scanner-window">
              <video
                v-show="cameraActive"
                ref="videoRef"
                class="camera-feed"
                autoplay
                playsinline
                muted
              ></video>
              <img v-if="capturedImage" :src="capturedImage" alt="Captured meal preview" />
              <div v-else-if="!cameraActive" class="camera-placeholder">
                <span class="placeholder-frame">
                  <ion-icon :icon="cameraOutline" />
                </span>
                <strong>Camera preview</strong>
                <small>Start the camera or upload a photo of your meal.</small>
              </div>
              <div class="scanner-overlay"></div>

              <!-- Clean Laser Scanning Animation -->
              <transition name="fade-scale">
                <div v-if="isScanning" class="scan-loading-overlay">
                  <div class="scan-laser-beam"></div>
                  <div class="scan-loading-badge">
                    <span class="spinner-dot"></span>
                    <span>Analyzing image &amp; calculating...</span>
                  </div>
                </div>
              </transition>

              <div class="scan-box" v-if="!capturedImage && !isScanning">
                <span class="corner tl"></span>
                <span class="corner tr"></span>
                <span class="corner bl"></span>
                <span class="corner br"></span>
                <span class="scan-line"></span>
              </div>
            </div>

            <!-- Action buttons placed cleanly outside window for guaranteed accessibility and clickability -->
            <div class="scan-actions-container">
              <transition name="fade-slide" mode="out-in">
                <button
                  v-if="isScanning"
                  key="cancel-scan"
                  class="scan-button cancel-scan-btn"
                  type="button"
                  @click="requestCancelScan"
                >
                  <ion-icon :icon="closeOutline" /> Cancel scan execution
                </button>

                <button
                  v-else
                  key="primary-action"
                  class="scan-button emphasized-btn"
                  type="button"
                  @click="cameraActive ? capturePhoto() : capturedImage ? scanFood() : startCamera()"
                >
                  <ion-icon :icon="cameraActive ? cameraOutline : capturedImage ? analyticsOutline : cameraOutline" />
                  {{ cameraActive ? 'Take photo' : capturedImage ? 'Scan meal' : 'Start camera' }}
                </button>
              </transition>

              <transition name="fade-slide" mode="out-in">
                <button 
                  v-if="!isScanning"
                  key="secondary-action"
                  class="ghost-button" 
                  type="button" 
                  @click="capturedImage ? cancelCapture() : cameraActive ? stopCamera() : triggerUpload()"
                >
                  <ion-icon :icon="capturedImage ? closeOutline : cameraActive ? closeOutline : imageOutline" />
                  {{ capturedImage ? 'Cancel photo' : cameraActive ? 'Close camera' : 'Upload photo' }}
                </button>
              </transition>
            </div>

            <input
              ref="fileInput"
              class="file-input"
              type="file"
              accept="image/*"
              @change="handleUpload"
            />

            <div class="scan-status">
              <span class="status-dot"></span>
              <p>{{ statusText }}</p>
              <p v-if="scanError" class="status-error">{{ scanError }}</p>
            </div>
          </article>

          <!-- Sidebar with Nutrition and Intake stacked vertically on lines of their own -->
          <aside class="scanner-sidebar">
            <article class="analysis-card">
              <div class="sidebar-head">
                <div>
                  <span class="card-kicker">Nutrition breakdown</span>
                  <h2>Meal Details</h2>
                </div>
                <span class="status-icon-badge" :class="{ active: showAnalysis }">
                  <ion-icon :icon="showAnalysis ? checkmarkCircleOutline : timeOutline" />
                </span>
              </div>

              <div v-if="!showAnalysis" class="analysis-empty">
                <span class="empty-icon"><ion-icon :icon="analyticsOutline" /></span>
                <div>
                  <p>No meal scanned yet</p>
                  <small>Take or upload a photo to view calories and nutrients.</small>
                </div>
              </div>

              <div v-else-if="analysis" class="analysis-details">
                <div class="meal-name">{{ analysis.name }}</div>
                <div class="meal-meta">{{ analysis.mealType }}{{ analysis.servingSize ? ` · ${analysis.servingSize}` : '' }}</div>
                <div class="cal-row"><span>Total Calories</span><b>{{ analysis.calories }} kcal</b></div>
                <div class="macro-grid">
                  <span><b>{{ analysis.protein }}g</b><small>Protein</small></span>
                  <span><b>{{ analysis.carbs }}g</b><small>Carbs</small></span>
                  <span><b>{{ analysis.fat }}g</b><small>Fat</small></span>
                </div>
                <div v-if="analysis.items?.length" class="items">
                  <div v-for="(it,i) in analysis.items" :key="i" class="item"><span>{{ it.name }} ({{ it.amount }})</span><span>{{ it.calories }} kcal</span></div>
                </div>
              </div>

              <div v-else class="analysis-empty">
                <span class="empty-icon"><ion-icon :icon="analyticsOutline" /></span>
                <div>
                  <p>No details found</p>
                  <small>Details will appear here after scanning.</small>
                </div>
              </div>
            </article>

            <div class="sidebar-divider"></div>

            <article class="trends-card">
              <div class="sidebar-head">
                <div>
                  <span class="card-kicker">Intake summary</span>
                  <h2>Daily &amp; Weekly</h2>
                </div>
                <span class="trends-tag">Recent</span>
              </div>

              <div class="trend-row">
                <span>Calories today</span>
                <b>{{ formatCalories(todayCalories) }} kcal</b>
              </div>
              <div class="trend-row">
                <span>Daily average</span>
                <b>{{ formatCalories(weeklyCalorieAverage) }} kcal</b>
              </div>
              <div class="trend-row">
                <span>Total logged</span>
                <b>{{ history.length }} meals</b>
              </div>

              <div class="mini-bars" aria-hidden="true">
                <span
                  v-for="day in intakeBars"
                  :key="day.key"
                  :class="{ today: day.key === todayKeyValue }"
                  :style="{ height: `${day.height}%` }"
                ></span>
              </div>
            </article>
          </aside>
        </section>

        <!-- Meal History with Search and Delete -->
        <section class="history">
          <div class="section-head">
            <div>
              <span class="card-kicker">Logged history</span>
              <h2>Your Scans</h2>
            </div>
            <div class="history-controls">
              <div class="search-box" v-if="history.length > 0">
                <ion-icon :icon="searchOutline" />
                <input v-model="searchQuery" type="text" placeholder="Search meals..." />
              </div>
              <span class="history-count-pill">{{ filteredHistory.length }} Saved</span>
            </div>
          </div>

          <div v-if="history.length === 0" class="history-empty">
            <span class="empty-icon"><ion-icon :icon="restaurantOutline" /></span>
            <div class="history-copy">
              <p>No meals logged yet</p>
              <small>Your scanned meals will appear here with nutrition summaries.</small>
            </div>
            <div class="history-slots" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
          </div>
          <div v-else-if="filteredHistory.length === 0" class="history-empty">
            <span class="empty-icon"><ion-icon :icon="searchOutline" /></span>
            <div class="history-copy">
              <p>No matching meals found</p>
              <small>Try searching with a different keyword.</small>
            </div>
          </div>
          <div v-else class="history-list">
            <article 
              v-for="h in filteredHistory" 
              :key="h.id" 
              class="history-item"
              @click="openMealModal(h)"
            >
              <div class="history-img-wrap">
                <img :src="h.image" alt="meal" />
                <button 
                  class="delete-btn" 
                  type="button" 
                  title="Delete meal"
                  @click.stop="requestDeleteMeal(h.id)"
                >
                  <ion-icon :icon="trashOutline" />
                </button>
              </div>
              <div class="history-info">
                <strong class="h-name">{{ h.name }}</strong>
                <div class="h-sub">
                  <span class="h-cal">{{ h.calories }} kcal</span>
                  <span class="h-date">{{ h.date.split(',')[0] }}</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    </ion-content>

    <!-- Refined Premium Monochrome Meal Modal -->
    <transition name="modal-fade">
      <div v-if="selectedMeal" class="meal-modal-backdrop" @click="closeMealModal">
        <div class="meal-modal-card" @click.stop>
          <!-- Top Bar -->
          <div class="mod-top-bar">
            <div class="mod-badge">
              <ion-icon :icon="restaurantOutline" />
              <span>{{ selectedMeal.mealType || 'Meal Record' }}</span>
            </div>
            <button class="mod-close-btn" type="button" @click="closeMealModal" aria-label="Close">
              <ion-icon :icon="closeOutline" />
            </button>
          </div>

          <!-- Hero Image Banner with Floating Calorie Badge -->
          <div class="mod-hero">
            <img :src="selectedMeal.image" alt="Meal photo" />
            <div class="mod-cal-pill">
              <span class="mcp-num">{{ selectedMeal.calories }}</span>
              <span class="mcp-lbl">kcal</span>
            </div>
          </div>

          <!-- Title & Meta Chips -->
          <div class="mod-title-area">
            <h2>{{ selectedMeal.name }}</h2>
            <div class="mod-chips-row">
              <span class="mod-chip"><ion-icon :icon="timeOutline" /> {{ selectedMeal.date }}</span>
              <span class="mod-chip" v-if="selectedMeal.servingSize"><ion-icon :icon="analyticsOutline" /> {{ selectedMeal.servingSize }}</span>
            </div>
          </div>

          <!-- Unified Macro Ribbon (Monochrome/Platinum) -->
          <div class="mod-macro-strip">
            <div class="mms-cell">
              <span class="mms-val">{{ selectedMeal.protein }}g</span>
              <span class="mms-lbl">Protein</span>
            </div>
            <div class="mms-divider"></div>
            <div class="mms-cell">
              <span class="mms-val">{{ selectedMeal.carbs }}g</span>
              <span class="mms-lbl">Carbs</span>
            </div>
            <div class="mms-divider"></div>
            <div class="mms-cell">
              <span class="mms-val">{{ selectedMeal.fat }}g</span>
              <span class="mms-lbl">Fat</span>
            </div>
          </div>

          <!-- Ingredients Section -->
          <div v-if="selectedMeal.items?.length" class="mod-ingredients-box">
            <div class="mib-head">
              <span>Detected Ingredients</span>
              <span class="mib-count">{{ selectedMeal.items.length }} Items</span>
            </div>
            <div class="mib-list">
              <div v-for="(it,i) in selectedMeal.items" :key="i" class="mib-row">
                <div class="mib-info">
                  <span class="mib-name">{{ it.name }}</span>
                  <span class="mib-qty">{{ it.amount }}</span>
                </div>
                <span class="mib-cal"><b>{{ it.calories }}</b> kcal</span>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="mod-footer">
            <button class="ghost-button mod-delete-btn" type="button" @click="requestDeleteMeal(selectedMeal.id)">
              <ion-icon :icon="trashOutline" /> Delete
            </button>
            <button class="scan-button mod-done-btn" type="button" @click="closeMealModal">
              Close
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Custom Glassmorphism Alert Dialog -->
    <transition name="modal-fade">
      <div v-if="activeAlert" class="custom-alert-backdrop" @click="activeAlert = null">
        <div class="custom-alert-card" @click.stop>
          <div class="alert-icon-wrap">
            <ion-icon :icon="activeAlert.icon || alertCircleOutline" />
          </div>
          <h3>{{ activeAlert.title }}</h3>
          <p>{{ activeAlert.message }}</p>
          <div class="alert-actions">
            <button class="ghost-button" type="button" @click="activeAlert = null">
              Cancel
            </button>
            <button class="scan-button alert-confirm-btn" type="button" @click="activeAlert.onConfirm(); activeAlert = null">
              {{ activeAlert.confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Floating Custom Toast Notification Banner -->
    <transition name="toast-center">
      <div v-if="toastMessage" class="custom-toast" :class="toastType">
        <ion-icon :icon="toastType === 'error' ? alertCircleOutline : checkmarkCircleOutline" />
        <span>{{ toastMessage }}</span>
      </div>
    </transition>
  </ion-page>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { IonPage, IonContent, onIonViewDidLeave } from '@ionic/vue';
import { 
  analyticsOutline, 
  cameraOutline, 
  imageOutline, 
  restaurantOutline, 
  closeOutline, 
  checkmarkCircleOutline, 
  timeOutline, 
  searchOutline, 
  trashOutline,
  alertCircleOutline 
} from 'ionicons/icons';
import { analyzeFoodImage } from '../services/aiService';
import { useSession } from '../composables/useSession';
import { useUserData } from '../composables/useUserData';
import { todayKey } from '../services/userData';

const { setDetailOpen } = useSession();
const {
  mealHistory: history,
  addMeal,
  deleteMeal,
  todayCalories,
  weekStats,
  calorieTarget,
  formatCalories,
} = useUserData();

const videoRef = ref(null);
const fileInput = ref(null);
const stream = ref(null);
const cameraActive = ref(false);
const capturedImage = ref('');
const statusText = ref('Start the camera or upload a photo of your meal.');
const showAnalysis = ref(false);
const scanError = ref('');
const isScanning = ref(false);
const searchQuery = ref('');
const selectedMeal = ref(null);

const todayKeyValue = todayKey();

const weeklyCalorieAverage = computed(() => {
  const days = weekStats.value.filter((day) => day.meals.length > 0);
  if (!days.length) return 0;
  return Math.round(days.reduce((total, day) => total + day.calories, 0) / days.length);
});

const intakeBars = computed(() => {
  const maxCalories = Math.max(
    Number(calorieTarget.value) || 0,
    ...weekStats.value.map((day) => day.calories),
    1
  );
  return weekStats.value.map((day) => ({
    key: day.key,
    height: day.calories ? Math.max(4, Math.round((day.calories / maxCalories) * 100)) : 0,
  }));
});

const activeAlert = ref(null);
const toastMessage = ref('');
const toastType = ref('success');
let toastTimer = null;
let scanAbortController = null;

const showToast = (msg, type = 'success') => {
  toastMessage.value = msg;
  toastType.value = type;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastMessage.value = '';
  }, 3200);
};

const stopCamera = () => {
  stream.value?.getTracks().forEach((track) => track.stop());
  stream.value = null;
  if (videoRef.value) videoRef.value.srcObject = null;
  cameraActive.value = false;
};

const cancelCapture = () => {
  capturedImage.value = '';
  showAnalysis.value = false;
  statusText.value = 'Photo cleared. Take or upload a new photo.';
  showToast('Photo cleared', 'info');
};

const requestCancelScan = () => {
  activeAlert.value = {
    title: 'Cancel Scan',
    message: 'Are you sure you want to cancel the ongoing scan execution?',
    confirmText: 'Yes, cancel',
    icon: alertCircleOutline,
    onConfirm: () => {
      if (scanAbortController) {
        scanAbortController.abort();
        scanAbortController = null;
      }
      isScanning.value = false;
      statusText.value = 'Scan cancelled. Ready when you are.';
      showToast('Scan execution cancelled', 'error');
    }
  };
};

const openMealModal = (meal) => {
  selectedMeal.value = meal;
  setDetailOpen(true);
};

const closeMealModal = () => {
  selectedMeal.value = null;
  setDetailOpen(false);
};

const requestDeleteMeal = (id) => {
  activeAlert.value = {
    title: 'Delete Meal',
    message: 'Are you sure you want to delete this meal from your saved history?',
    confirmText: 'Yes, delete',
    icon: trashOutline,
    onConfirm: () => {
      deleteMeal(id);
      if (selectedMeal.value?.id === id) {
        closeMealModal();
      }
      showToast('Meal deleted from history', 'info');
    }
  };
};

const filteredHistory = computed(() => {
  if (!searchQuery.value.trim()) return history.value;
  const q = searchQuery.value.toLowerCase();
  return history.value.filter(h => h.name.toLowerCase().includes(q) || (h.mealType && h.mealType.toLowerCase().includes(q)));
});

const cameraConstraints = [
  { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1600 } } },
  { audio: false, video: { facingMode: 'environment' } },
  { audio: false, video: { width: { ideal: 1280 } } },
  { audio: false, video: true },
];

const startCamera = async () => {
  capturedImage.value = '';
  showAnalysis.value = false;

  if (!navigator.mediaDevices?.getUserMedia) {
    statusText.value = 'Camera is not available. Please upload a photo instead.';
    showToast('Camera not available', 'error');
    return;
  }

  if (!window.isSecureContext) {
    statusText.value = 'Camera requires a secure connection (HTTPS). Please upload a photo instead.';
    showToast('HTTPS required for camera', 'error');
    return;
  }

  statusText.value = 'Starting camera...';
  stopCamera();

  let lastError = null;

  for (const constraints of cameraConstraints) {
    try {
      stream.value = await navigator.mediaDevices.getUserMedia(constraints);
      cameraActive.value = true;
      await nextTick();
      if (videoRef.value) {
        videoRef.value.srcObject = stream.value;
        await videoRef.value.play().catch(() => {});
      }
      statusText.value = 'Camera ready. Position your meal and take a photo.';
      showToast('Camera active', 'success');
      return;
    } catch (error) {
      lastError = error;
      if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') break;
    }
  }

  stopCamera();
  statusText.value = 'Could not access camera. Please upload a photo instead.';
  showToast('Camera access denied', 'error');
};

const capturePhoto = () => {
  const video = videoRef.value;
  if (!video?.videoWidth) {
    statusText.value = 'Camera is still initializing. Please try again.';
    return;
  }

  const maxSize = 1600;
  const scale = Math.min(1, maxSize / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

  capturedImage.value = canvas.toDataURL('image/jpeg', 0.9);
  showAnalysis.value = false;
  stopCamera();
  statusText.value = 'Photo captured successfully. Tap scan meal to continue.';
  showToast('Photo captured!', 'success');
};

const triggerUpload = () => fileInput.value?.click();

const handleUpload = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    statusText.value = 'Please select a valid image file.';
    showToast('Invalid image file', 'error');
    event.target.value = '';
    return;
  }

  stopCamera();
  showAnalysis.value = false;
  const reader = new FileReader();
  reader.onload = () => {
    capturedImage.value = String(reader.result || '');
    statusText.value = 'Photo loaded. Tap scan meal to continue.';
    showToast('Photo uploaded successfully', 'success');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
};

const analysis = ref(null);

const scanFood = async () => {
  if (!capturedImage.value) {
    statusText.value = 'Please capture or upload a photo first.';
    showToast('No photo selected', 'error');
    return;
  }

  isScanning.value = true;
  statusText.value = 'Analyzing image & calculating nutrition...';
  scanError.value = '';
  scanAbortController = new AbortController();

  try {
    const result = await analyzeFoodImage(capturedImage.value, scanAbortController.signal);
    analysis.value = result;
    const newEntry = {
      id: Date.now(),
      image: capturedImage.value,
      name: result.name,
      mealType: result.mealType,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      servingSize: result.servingSize,
      items: result.items || [],
      date: new Date().toLocaleString(),
      dateISO: todayKey()
    };
    addMeal(newEntry);
    statusText.value = 'Scan completed successfully.';
    showAnalysis.value = true;
    showToast('Meal scanned & logged!', 'success');
  } catch (e) {
    if (e?.name === 'AbortError') {
      statusText.value = 'Scan cancelled.';
    } else {
      console.error('Food scan failed', e);
      scanError.value = e?.message || 'Scan failed';
      statusText.value = 'Scan failed. Please try again.';
      showAnalysis.value = false;
      showToast('Scan failed', 'error');
    }
  } finally {
    isScanning.value = false;
    scanAbortController = null;
  }
};

onIonViewDidLeave(stopCamera);
onBeforeUnmount(stopCamera);
</script>

<style scoped>
  :host {
    display: block;
    padding-top: 0;
  }

  .scanner-content {
    --background: var(--bg);
  }

  .scanner-shell-page {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: clamp(0.6rem, 1.2vw, 0.9rem);
  }

  .scanner-hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--line);
  }

  .hero-copy h1 {
    margin-top: 0.2rem;
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 500;
    line-height: 0.9;
    letter-spacing: 0.005em;
    text-transform: uppercase;
  }

  .hero-copy h1 span {
    color: var(--dim);
  }

  .scanner-workspace {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.6fr);
    align-items: start;
    gap: clamp(0.8rem, 1.4vw, 1.2rem);
    margin-top: clamp(0.8rem, 1.4vw, 1.1rem);
  }

  .scanner-shell {
    min-width: 0;
    padding: 0.75rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    display: grid;
    gap: 0.75rem;
  }

  /* Camera scanner taking ~60% prominence */
  .scanner-window {
    position: relative;
    height: clamp(380px, 60vh, 580px);
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 0.9rem;
    background: #060606;
  }

  .scanner-window > img,
  .camera-feed {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .scanner-window > img {
    opacity: 0.88;
  }

  .camera-feed {
    opacity: 0.92;
  }

  .file-input {
    display: none;
  }

  .camera-placeholder {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 0.4rem;
    padding: 1.5rem;
    color: var(--muted);
    text-align: center;
  }

  .placeholder-frame {
    display: grid;
    place-items: center;
    width: 3.6rem;
    height: 3.6rem;
    margin-bottom: 0.3rem;
    border: 1px dashed rgba(255, 255, 255, 0.35);
    border-radius: 1rem;
    color: var(--text-soft);
    font-size: 1.4rem;
  }

  .camera-placeholder strong {
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .camera-placeholder small {
    max-width: 36ch;
    font-size: 0.58rem;
    line-height: 1.6;
  }

  .scanner-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 35%, transparent 65%, rgba(0, 0, 0, 0.8));
    pointer-events: none;
  }

  /* Clean Laser Scanning Animation */
  .scan-loading-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    background: rgba(5, 5, 5, 0.85);
    backdrop-filter: blur(8px);
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .scan-laser-beam {
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, transparent, #ffffff, transparent);
    box-shadow: 0 0 25px #ffffff, 0 0 50px rgba(255, 255, 255, 0.7);
    animation: laserBeamSweep 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .scan-loading-badge {
    position: relative;
    z-index: 5;
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 999px;
    background: rgba(12, 12, 12, 0.9);
    backdrop-filter: blur(16px);
    color: var(--white);
    font-family: var(--font-display);
    font-size: 0.6rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 255, 255, 0.18);
  }

  .spinner-dot {
    width: 8px;
    height: 8px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes laserBeamSweep {
    0% { top: 0%; opacity: 0.2; }
    50% { top: 100%; opacity: 1; }
    100% { top: 0%; opacity: 0.2; }
  }

  /* Wider Scan Frame Overlay */
  .scan-box {
    position: absolute;
    z-index: 2;
    inset: 10% 8% 20%;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 1rem;
    pointer-events: none;
  }

  .corner {
    position: absolute;
    width: 1.35rem;
    height: 1.35rem;
    border: 2px solid var(--white);
  }

  .corner.tl { top: -1px; left: -1px; border-right: 0; border-bottom: 0; border-top-left-radius: 0.4rem; }
  .corner.tr { top: -1px; right: -1px; border-left: 0; border-bottom: 0; border-top-right-radius: 0.4rem; }
  .corner.bl { bottom: -1px; left: -1px; border-right: 0; border-top: 0; border-bottom-left-radius: 0.4rem; }
  .corner.br { bottom: -1px; right: -1px; border-left: 0; border-top: 0; border-bottom-right-radius: 0.4rem; }

  .scan-line {
    position: absolute;
    left: 4%;
    right: 4%;
    top: 45%;
    height: 1px;
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
    animation: scanSweep 3s ease-in-out infinite;
  }

  /* Action Buttons Container placed cleanly outside window */
  .scan-actions-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    width: 100%;
  }

  .scan-button,
  .ghost-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.85rem 1.1rem;
    border-radius: 10px;
    font-family: var(--font-display);
    font-size: 0.62rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1), 
                border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1), 
                color 0.25s cubic-bezier(0.16, 1, 0.3, 1), 
                transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Highly Emphasized Scan Meal Button */
  .emphasized-btn {
    background: linear-gradient(135deg, #ffffff 0%, #dcdcdc 100%);
    border: 1px solid rgba(255, 255, 255, 1);
    color: #050505;
    font-weight: 700;
    font-size: 0.66rem;
    box-shadow: 0 6px 24px rgba(255, 255, 255, 0.35);
  }

  .emphasized-btn:hover {
    background: #ffffff;
    box-shadow: 0 8px 32px rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
  }

  .scan-button {
    flex: 1;
  }

  .scan-button:active,
  .ghost-button:active {
    transform: scale(0.96);
  }

  .cancel-scan-btn {
    background: rgba(220, 38, 38, 0.95);
    border-color: #ef4444;
    color: #ffffff;
    font-weight: 700;
    box-shadow: 0 6px 24px rgba(220, 38, 38, 0.4);
  }

  .cancel-scan-btn:hover {
    background: rgba(239, 68, 68, 1);
    border-color: #f87171;
    transform: translateY(-1px);
  }

  .ghost-button {
    flex: 1;
    border: 1px solid rgba(255, 255, 255, 0.4);
    background: rgba(10, 10, 10, 0.6);
    color: var(--text);
    backdrop-filter: blur(12px);
  }

  .ghost-button:hover {
    border-color: var(--white);
    background: rgba(10, 10, 10, 0.85);
  }

  /* Smooth Transitions for Buttons */
  .fade-slide-enter-active,
  .fade-slide-leave-active {
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .fade-slide-enter-from,
  .fade-slide-leave-to {
    opacity: 0;
    transform: translateY(6px);
  }

  .fade-scale-enter-active,
  .fade-scale-leave-active {
    transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .fade-scale-enter-from,
  .fade-scale-leave-to {
    opacity: 0;
  }

  .scan-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.2rem;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--white);
  }

  .scan-status p {
    color: var(--muted);
    font-size: 0.62rem;
  }

  .status-error {
    color: var(--white);
    font-size: 0.56rem;
    line-height: 1.5;
  }

  .meal-meta {
    color: var(--dim);
    font-size: 0.52rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* Sidebar Stacked Vertically with Lines of Their Own */
  .scanner-sidebar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
    min-width: 0;
  }

  .sidebar-divider {
    height: 1px;
    background: var(--line);
    margin: 1rem 0;
  }

  .analysis-card,
  .trends-card {
    padding: clamp(0.95rem, 1.5vw, 1.25rem);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  }

  .sidebar-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
    padding-bottom: 0.8rem;
    border-bottom: 1px solid var(--line);
  }

  .sidebar-head h2 {
    margin-top: 0.2rem;
    font-size: clamp(1.15rem, 1.8vw, 1.4rem);
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  /* Icon Badge replacement for text status */
  .status-icon-badge {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.03);
    color: var(--dim);
    font-size: 1rem;
    transition: all 0.3s var(--ease);
  }

  .status-icon-badge.active {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.1);
    color: var(--white);
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.15);
  }

  .analysis-empty {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 1.2rem 0;
  }

  .empty-icon {
    display: grid;
    place-items: center;
    width: 2.4rem;
    height: 2.4rem;
    flex-shrink: 0;
    border: 1px solid var(--line);
    border-radius: 0.7rem;
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-soft);
    font-size: 1rem;
  }

  .analysis-empty p {
    font-family: var(--font-display);
    font-size: 0.88rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .analysis-empty small {
    display: block;
    margin-top: 0.25rem;
    color: var(--dim);
    font-size: 0.58rem;
    line-height: 1.5;
  }

  .analysis-details {
    padding-top: 0.6rem;
    display: grid;
    gap: 0.6rem;
  }

  .meal-name {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .cal-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-radius: 0.6rem;
    background: rgba(255, 255, 255, 0.04);
    font-size: 0.65rem;
    color: var(--muted);
  }

  .cal-row b {
    color: var(--white);
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
  }

  .macro-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
    margin-top: 0.2rem;
  }

  .macro-grid span {
    display: grid;
    gap: 0.15rem;
    padding: 0.65rem 0.5rem;
    border: 1px solid var(--line);
    border-radius: 0.6rem;
    background: rgba(255, 255, 255, 0.02);
    text-align: center;
  }

  .macro-grid b {
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 500;
  }

  .macro-grid small {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .items {
    margin-top: 0.4rem;
    display: grid;
    gap: 0.35rem;
    max-height: 120px;
    overflow-y: auto;
  }

  .item {
    display: flex;
    justify-content: space-between;
    font-size: 0.58rem;
    color: var(--muted);
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid var(--line);
  }

  .trends-tag {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .trend-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 0;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
    font-size: 0.64rem;
  }

  .trend-row b {
    color: var(--text);
    font-family: var(--font-display);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .mini-bars {
    display: flex;
    align-items: flex-end;
    gap: 0.35rem;
    height: 48px;
    margin-top: 0.85rem;
  }

  .mini-bars span {
    flex: 1;
    border-radius: 0.3rem 0.3rem 0 0;
    background: #2a2a2a;
    transition: background 0.3s var(--ease);
  }

  .mini-bars span:hover {
    background: #555555;
  }

  .mini-bars span.today {
    background: var(--white);
  }

  .history {
    margin-top: clamp(1.4rem, 2.6vw, 2rem);
    padding-top: clamp(1.2rem, 2vw, 1.6rem);
    padding-bottom: calc(7.5rem + env(safe-area-inset-bottom, 0));
    border-top: 1px solid var(--line);
  }

  .section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.8rem;
    margin-bottom: 1rem;
  }

  .section-head h2 {
    margin-top: 0.25rem;
    font-size: clamp(1.3rem, 2.4vw, 1.8rem);
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
  }

  .history-controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .history-count-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--line-strong);
    color: var(--white);
    font-family: var(--font-display);
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .search-box input {
    background: transparent;
    border: 0;
    outline: none;
    color: var(--text);
    font-size: 0.58rem;
    width: 110px;
  }

  .search-box input::placeholder {
    color: var(--dim);
  }

  .history-empty {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) minmax(180px, 0.5fr);
    align-items: center;
    gap: clamp(1rem, 2vw, 1.6rem);
    padding: clamp(1.5rem, 2.2vw, 2rem);
    border: 1px solid var(--line-strong);
    border-radius: 1.25rem;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  }

  .history-copy p {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .history-copy small {
    display: block;
    max-width: 58ch;
    margin-top: 0.2rem;
    color: var(--muted);
    font-size: 0.62rem;
    line-height: 1.6;
  }

  .history-slots {
    display: grid;
    gap: 0.35rem;
  }

  .history-slots span {
    display: block;
    height: 0.35rem;
    border-radius: 99px;
    background: #232323;
  }

  .history-slots span:nth-child(2) {
    width: 74%;
  }

  .history-slots span:nth-child(3) {
    width: 46%;
  }

  /* Meal history: 3 per line on mobile device with pristine typography & font positioning (No overlaps) */
  .history-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .history-item {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.5rem;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    background: var(--surface);
    cursor: pointer;
    transition: border-color 0.3s var(--ease), transform 0.3s var(--ease), box-shadow 0.3s var(--ease);
  }

  .history-item:hover {
    border-color: rgba(255, 255, 255, 0.35);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .history-img-wrap {
    position: relative;
    width: 100%;
    height: 78px;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .history-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s var(--ease);
  }

  .history-item:hover img {
    transform: scale(1.04);
  }

  .delete-btn {
    position: absolute;
    top: 0.3rem;
    right: 0.3rem;
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
    color: var(--white);
    font-size: 0.7rem;
    opacity: 0;
    transition: opacity 0.25s var(--ease), background 0.25s var(--ease);
  }

  .history-item:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    background: rgba(220, 38, 38, 0.85);
  }

  .history-info {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    padding: 0 0.1rem;
    min-width: 0;
  }

  .h-name {
    font-family: var(--font-display);
    font-size: 0.66rem;
    font-weight: 500;
    color: var(--text-soft);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .h-sub {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.2rem;
    line-height: 1.1;
  }

  .h-cal {
    color: var(--white);
    font-family: var(--font-display);
    font-size: 0.58rem;
    font-weight: 600;
  }

  .h-date {
    color: var(--dim);
    font-size: 0.44rem;
    white-space: nowrap;
  }

  /* Refined Premium Monochrome Meal Modal */
  .meal-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483655;
    display: grid;
    place-items: center;
    background: transparent;
    padding: 1rem;
  }

  .meal-modal-backdrop::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: rgba(2, 2, 2, 0.94);
    pointer-events: none;
  }

  .meal-modal-card {
    width: 100%;
    max-width: 420px;
    max-height: 86vh;
    overflow-y: auto;
    border-radius: 1.75rem;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: #0c0c0e;
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.98), 0 0 50px rgba(255, 255, 255, 0.03);
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
    padding: 1.5rem;
    will-change: transform, opacity;
  }

  .mod-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mod-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.85rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--white);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .mod-badge ion-icon {
    font-size: 0.8rem;
    color: var(--muted);
  }

  .mod-close-btn {
    display: grid;
    place-items: center;
    width: 2.15rem;
    height: 2.15rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
    font-size: 1.05rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mod-close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.28);
  }

  .mod-hero {
    position: relative;
    width: 100%;
    height: 165px;
    border-radius: 1.2rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: #000;
    box-shadow: 0 10px 25px rgba(0,0,0,0.6);
  }

  .mod-hero img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .mod-cal-pill {
    position: absolute;
    bottom: 0.75rem;
    right: 0.75rem;
    display: flex;
    align-items: baseline;
    gap: 0.2rem;
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    background: rgba(12, 12, 14, 0.92);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 20px rgba(0,0,0,0.7);
  }

  .mcp-num {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--white);
    line-height: 1;
  }

  .mcp-lbl {
    font-size: 0.55rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--dim);
  }

  .mod-title-area {
    display: grid;
    gap: 0.3rem;
  }

  .mod-title-area h2 {
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: capitalize;
    color: var(--white);
    line-height: 1.2;
    margin: 0;
  }

  .mod-chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .mod-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.6rem;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--muted);
    font-size: 0.6rem;
    font-weight: 500;
  }

  .mod-chip ion-icon {
    font-size: 0.7rem;
    color: var(--dim);
  }

  .mod-macro-strip {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.9rem;
    padding: 0.75rem 0.5rem;
    text-align: center;
  }

  .mms-cell {
    display: grid;
    gap: 0.1rem;
  }

  .mms-val {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--white);
  }

  .mms-lbl {
    font-size: 0.52rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--dim);
  }

  .mms-divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.08);
  }

  .mod-ingredients-box {
    display: grid;
    gap: 0.5rem;
  }

  .mib-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--dim);
  }

  .mib-list {
    display: grid;
    gap: 0.35rem;
    max-height: 130px;
    overflow-y: auto;
    padding-right: 0.15rem;
  }

  .mib-row {
    padding: 0.55rem 0.8rem;
    border-radius: 0.7rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mib-info {
    display: grid;
    gap: 0.05rem;
  }

  .mib-name {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--white);
    text-transform: capitalize;
  }

  .mib-qty {
    font-size: 0.58rem;
    color: var(--dim);
  }

  .mib-cal {
    font-size: 0.7rem;
    color: var(--muted);
  }

  .mib-cal b {
    color: var(--white);
    font-weight: 700;
  }

  .mod-footer {
    display: flex;
    gap: 0.7rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 1.1rem;
  }

  .mod-delete-btn {
    border-color: rgba(220, 38, 38, 0.4);
    color: #f87171;
    padding: 0.7rem 1.1rem;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .mod-done-btn {
    flex: 1;
    padding: 0.7rem 1.1rem;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* Custom Alert Dialog */
  .custom-alert-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483665;
    display: grid;
    place-items: center;
    background: transparent;
    padding: 1rem;
  }

  .custom-alert-backdrop::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: rgba(5, 5, 5, 0.9);
    pointer-events: none;
  }

  .custom-alert-card {
    width: 100%;
    max-width: 380px;
    border: 1px solid var(--line-strong);
    border-radius: 1.25rem;
    background: #0d0d0d;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.95);
    display: grid;
    gap: 0.85rem;
    padding: 1.5rem;
    text-align: center;
  }

  .alert-icon-wrap {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    margin: 0 auto;
    border-radius: 50%;
    background: rgba(220, 38, 38, 0.15);
    color: #f87171;
    font-size: 1.4rem;
  }

  .custom-alert-card h3 {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0;
  }

  .custom-alert-card p {
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.6;
    margin: 0;
  }

  .alert-actions {
    display: flex;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }

  .alert-confirm-btn {
    background: #ef4444 !important;
    border-color: #ef4444 !important;
    color: #ffffff !important;
  }

  .alert-confirm-btn:hover {
    background: #dc2626 !important;
  }

  /* Centered Floating Custom Toast with Smooth Animations */
  .custom-toast {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2147483675;
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.85rem 1.4rem;
    border-radius: 999px;
    background: rgba(18, 18, 18, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.28);
    color: var(--white);
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 255, 255, 0.15);
    pointer-events: none;
  }

  .custom-toast.success ion-icon {
    color: #4ade80;
  }

  .custom-toast.error ion-icon {
    color: #f87171;
  }

  .custom-toast.info ion-icon {
    color: #60a5fa;
  }

  .toast-center-enter-active,
  .toast-center-leave-active {
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toast-center-enter-from,
  .toast-center-leave-to {
    opacity: 0;
    transform: translate(-50%, -40%) scale(0.92);
  }

  /* Modal Transition */
  .modal-fade-enter-active {
    transition: opacity 0.28s var(--ease-out);
  }

  .modal-fade-leave-active {
    transition: opacity 0.2s var(--ease);
  }

  .modal-fade-enter-active::before {
    transition: opacity 0.22s var(--ease-out);
  }

  .modal-fade-leave-active::before {
    transition: opacity 0.18s var(--ease);
  }

  .modal-fade-enter-from::before,
  .modal-fade-leave-to::before {
    opacity: 0;
  }

  .modal-fade-enter-active .meal-modal-card,
  .modal-fade-enter-active .custom-alert-card {
    transition: transform 0.28s var(--ease-out), opacity 0.22s var(--ease-out);
    will-change: transform, opacity;
  }

  .modal-fade-leave-active .meal-modal-card,
  .modal-fade-leave-active .custom-alert-card {
    transition: transform 0.2s var(--ease), opacity 0.16s var(--ease);
    will-change: transform, opacity;
  }

  .modal-fade-enter-from .meal-modal-card,
  .modal-fade-enter-from .custom-alert-card {
    opacity: 0;
    transform: translate3d(0, 12px, 0) scale(0.97);
  }

  .modal-fade-leave-to .meal-modal-card,
  .modal-fade-leave-to .custom-alert-card {
    opacity: 0;
    transform: translate3d(0, 6px, 0) scale(0.985);
  }

  @media (max-width: 767px) {
    .modal-fade-enter-from .meal-modal-card,
    .modal-fade-enter-from .custom-alert-card {
      transform: translate3d(0, 18px, 0) scale(0.96);
    }

    .modal-fade-leave-to .meal-modal-card,
    .modal-fade-leave-to .custom-alert-card {
      transform: translate3d(0, 8px, 0) scale(0.98);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-fade-enter-active,
    .modal-fade-leave-active,
    .modal-fade-enter-active::before,
    .modal-fade-leave-active::before,
    .modal-fade-enter-active .meal-modal-card,
    .modal-fade-leave-active .meal-modal-card,
    .modal-fade-enter-active .custom-alert-card,
    .modal-fade-leave-active .custom-alert-card {
      transition-duration: 0.01ms;
    }

    .modal-fade-enter-from .meal-modal-card,
    .modal-fade-leave-to .meal-modal-card,
    .modal-fade-enter-from .custom-alert-card,
    .modal-fade-leave-to .custom-alert-card {
      transform: none;
    }
  }

  @media (max-width: 1100px) {
    .scanner-workspace {
      grid-template-columns: 1fr;
    }

    .scanner-sidebar {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 700px) {
    .history-list {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.4rem;
    }

    .history-item img {
      height: 60px;
    }

    .history-empty {
      grid-template-columns: 1fr;
      text-align: center;
      justify-items: center;
      padding: 1.25rem;
    }

    .history-slots {
      display: none;
    }

    .meal-modal-card {
      max-width: 94vw;
      max-height: 82vh;
      padding: 1.15rem;
      gap: 0.9rem;
    }

    .custom-alert-card {
      max-width: 90vw;
      padding: 1.25rem;
    }

    .custom-toast {
      max-width: 90vw;
      text-align: center;
      padding: 0.75rem 1rem;
      font-size: 0.62rem;
    }

    .scanner-window {
      height: clamp(340px, 60vh, 480px);
    }

    .section-head {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.6rem;
    }

    .history-controls {
      width: 100%;
      justify-content: space-between;
    }

    .search-box {
      flex: 1;
    }

    .search-box input {
      width: 100%;
    }
  }
</style>

<template>
  <ion-page class="auth-page">
    <main class="auth-panel" :class="{ 'is-register': mode === 'register' }">
      <section class="auth-brand-panel">
        <div class="brand-top">
          <button class="back-link" type="button" @click="router.push('/landing')">
            Back to home
          </button>
          <span class="brand-step">Account</span>
        </div>

        <div class="brand-lockup">
          <img class="brand-mark" :src="nfIconMark" alt="NutriFit logo" />
          <span class="brand-lockup-copy">
            <strong>NutriFit</strong>
            <small>Fitness &amp; nutrition</small>
          </span>
        </div>

        <div class="brand-message">
          <p class="eyebrow">Welcome to NutriFit</p>
          <h2>Build a <br /><em>stronger</em> <br />you, every day.</h2>
          <p class="brand-body">Better habits, a healthier you. One simple place to track food, workouts and progress.</p>
        </div>

        <div class="brand-benefits">
          <span>
            <ion-icon :icon="barbellOutline" />
            <small>Track<br />progress</small>
          </span>
          <span>
            <ion-icon :icon="trendingUpOutline" />
            <small>Reach<br />goals</small>
          </span>
          <span>
            <ion-icon :icon="heartOutline" />
            <small>Feel<br />better</small>
          </span>
        </div>

        <div class="brand-foot">
          <span class="foot-line"></span>
          <span>Your data stays private · Made for daily use</span>
        </div>

        <div class="brand-rings" aria-hidden="true" />
        <img class="brand-glyph" :src="nfIconMark" alt="" aria-hidden="true" />
      </section>

      <section class="auth-form-panel">
        <img class="form-glyph" :src="nfIconMark" alt="" aria-hidden="true" />
        <div class="form-inner">
          <div class="form-topline">
            <span>Safe and secure</span>
            <span>NutriFit · 2026</span>
          </div>

          <div class="heading-slot">
            <Transition name="copy-swap">
              <div :key="isPasswordRecovery ? 'recovery' : mode" class="auth-heading">
                <span>{{ headingKicker }}</span>
                <h1>{{ headingTitle }}</h1>
                <p>{{ headingBody }}</p>
              </div>
            </Transition>
          </div>

          <div class="auth-feedback" v-if="errorMessage || successMessage || !isAuthConfigured || pendingConfirmationEmail" role="status">
            <p v-if="!isAuthConfigured" class="auth-message error">
              Authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.
            </p>
            <p v-if="errorMessage" class="auth-message error">{{ errorMessage }}</p>
            <p v-if="successMessage" class="auth-message success">{{ successMessage }}</p>
            <button
              v-if="pendingConfirmationEmail"
              type="button"
              class="resend-button"
              :disabled="isSubmitting || resendCooldownLeft > 0"
              @click="handleResendConfirmation"
            >
              {{ resendCooldownLeft > 0 ? `Resend in ${resendCooldownLeft}s` : 'Resend confirmation email' }}
            </button>
          </div>

          <div v-if="isPasswordRecovery" class="form-stack recovery-stack">
            <form class="auth-form active" @submit.prevent="submitNewPassword">
              <label>
                New password
                <div class="field-control password-field">
                  <input
                    v-model="recoveryForm.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="At least 6 characters"
                    autocomplete="new-password"
                    minlength="6"
                    required
                  />
                  <button type="button" @click="showPassword = !showPassword" aria-label="Toggle password visibility">
                    <ion-icon :icon="showPassword ? eyeOffOutline : eyeOutline" />
                  </button>
                </div>
              </label>
              <label>
                Confirm password
                <div class="field-control password-field">
                  <input
                    v-model="recoveryForm.confirm"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Repeat new password"
                    autocomplete="new-password"
                    minlength="6"
                    required
                  />
                </div>
              </label>
              <button type="submit" class="submit-button" :disabled="isSubmitting || cooldownLeft > 0">
                <span v-if="isSubmitting" class="spinner" />
                {{ submitLabel('Update password', 'Updating') }}
              </button>
            </form>
          </div>

          <template v-else>
          <div class="mode-switch" role="tablist">
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'login'"
              :class="{ active: mode === 'login' }"
              @click="switchMode('login')"
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'register'"
              :class="{ active: mode === 'register' }"
              @click="switchMode('register')"
            >
              Register
            </button>
          </div>

          <div class="form-stack">
            <form
              class="auth-form"
              :class="{ active: mode === 'login' }"
              :inert="mode !== 'login'"
              :aria-hidden="mode !== 'login'"
              @submit.prevent="submitLogin"
            >
              <label>
                Email
                <div class="field-control">
                  <input
                    v-model="loginForm.email"
                    type="email"
                    placeholder="name@example.com"
                    autocomplete="email"
                    required
                  />
                  <ion-icon :icon="mailOutline" aria-hidden="true" />
                </div>
              </label>
              <label>
                Password
                <div class="field-control password-field">
                  <input
                    v-model="loginForm.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    autocomplete="current-password"
                    required
                  />
                  <button type="button" @click="showPassword = !showPassword" aria-label="Toggle password visibility">
                    <ion-icon :icon="showPassword ? eyeOffOutline : eyeOutline" />
                  </button>
                </div>
              </label>
              <div class="form-options">
                <label class="remember"><input type="checkbox" /> <span>Remember me</span></label>
                <button
                  type="button"
                  :disabled="isSubmitting || cooldownLeft > 0"
                  @click="handleForgotPassword"
                >
                  Forgot password?
                </button>
              </div>
              <button type="submit" class="submit-button" :disabled="isSubmitting || cooldownLeft > 0">
                <span v-if="isSubmitting" class="spinner" />
                {{ submitLabel('Sign in', 'Signing in') }}
              </button>
            </form>

            <form
              class="auth-form"
              :class="{ active: mode === 'register' }"
              :inert="mode !== 'register'"
              :aria-hidden="mode !== 'register'"
              @submit.prevent="submitRegister"
            >
              <label>
                Full name
                <div class="field-control">
                  <input
                    v-model="registerForm.name"
                    type="text"
                    placeholder="Your name"
                    autocomplete="name"
                    required
                  />
                  <ion-icon :icon="personOutline" aria-hidden="true" />
                </div>
              </label>
              <label>
                Email
                <div class="field-control">
                  <input
                    v-model="registerForm.email"
                    type="email"
                    placeholder="name@example.com"
                    autocomplete="email"
                    required
                  />
                  <ion-icon :icon="mailOutline" aria-hidden="true" />
                </div>
              </label>
              <label>
                Password
                <div class="field-control password-field">
                  <input
                    v-model="registerForm.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Create password"
                    autocomplete="new-password"
                    minlength="6"
                    required
                  />
                  <button type="button" @click="showPassword = !showPassword" aria-label="Toggle password visibility">
                    <ion-icon :icon="showPassword ? eyeOffOutline : eyeOutline" />
                  </button>
                </div>
              </label>
              <button type="submit" class="submit-button" :disabled="isSubmitting || cooldownLeft > 0">
                <span v-if="isSubmitting" class="spinner" />
                {{ submitLabel('Create account', 'Creating account') }}
              </button>
            </form>
          </div>

          <div class="divider"><span>or continue with</span></div>

          <div class="social-row">
            <button
              type="button"
              class="social-button"
              :disabled="isGoogleLoading || isSubmitting"
              @click="signInWithGoogleHandler"
            >
              <span v-if="isGoogleLoading" class="spinner spinner-dark" />
              <strong v-else>G</strong> {{ isGoogleLoading ? 'Connecting' : 'Google' }}
            </button>
          </div>

          <p class="terms">
            By continuing, you agree to our <button type="button">Terms of Service</button>
            and <button type="button">Privacy Policy</button>.
          </p>
          </template>
        </div>
      </section>
    </main>
  </ion-page>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import nfIconMark from '../assets/nf-icon-mark.png';
import {
  barbellOutline,
  eyeOffOutline,
  eyeOutline,
  heartOutline,
  mailOutline,
  personOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import {
  friendlyAuthError,
  isAuthConfigured,
  isRateLimitError,
  resendConfirmation,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  updatePassword,
} from '../services/auth';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const route = useRoute();
const { authError, clearAuthError, endPasswordRecovery, isAuthenticated, isPasswordRecovery } = useAuth();

const mode = ref('login');
const isSubmitting = ref(false);
const isGoogleLoading = ref(false);
const showPassword = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const loginForm = ref({ email: '', password: '' });
const registerForm = ref({ name: '', email: '', password: '' });
const recoveryForm = ref({ password: '', confirm: '' });
const pendingConfirmationEmail = ref('');
const cooldownLeft = ref(0);
const resendCooldownLeft = ref(0);
let cooldownTimer = null;
let resendTimer = null;

const startCooldown = (seconds = 60) => {
  cooldownLeft.value = seconds;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    cooldownLeft.value = Math.max(0, cooldownLeft.value - 1);
    if (cooldownLeft.value === 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
};

const startResendCooldown = (seconds = 60) => {
  resendCooldownLeft.value = seconds;
  if (resendTimer) clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    resendCooldownLeft.value = Math.max(0, resendCooldownLeft.value - 1);
    if (resendCooldownLeft.value === 0) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
  }, 1000);
};

const handleAuthError = (error) => {
  if (isRateLimitError(error)) startCooldown(60);
  errorMessage.value = friendlyAuthError(error);
};

const submitLabel = (idle, busy) => {
  if (isSubmitting.value) return busy;
  if (cooldownLeft.value > 0) return `Try again in ${cooldownLeft.value}s`;
  return idle;
};

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
  if (resendTimer) clearInterval(resendTimer);
});

const redirectTarget = computed(() => {
  const target = route.query.redirect;
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) return target;
  return '/dashboard';
});

const headingKicker = computed(() => {
  if (isPasswordRecovery.value) return 'Password reset';
  return mode.value === 'login' ? 'Sign in' : 'Get started';
});

const headingTitle = computed(() => {
  if (isPasswordRecovery.value) return 'Set a new password.';
  return mode.value === 'login' ? 'Welcome back.' : 'Create your account.';
});

const headingBody = computed(() => {
  if (isPasswordRecovery.value) return 'Choose a new password to get back into your account.';
  return mode.value === 'login' ? 'Pick up where you left off.' : 'A few details and you are ready to go.';
});

const clearMessages = () => {
  errorMessage.value = '';
  successMessage.value = '';
  clearAuthError();
};

const goAfterAuth = () => router.replace(redirectTarget.value);

const switchMode = (nextMode) => {
  if (isSubmitting.value) return;
  mode.value = nextMode;
  showPassword.value = false;
  pendingConfirmationEmail.value = '';
  clearMessages();
};

const submitLogin = async () => {
  if (isSubmitting.value || cooldownLeft.value > 0) return;
  clearMessages();

  if (!isAuthConfigured) {
    errorMessage.value = 'Authentication is not configured. Add your Supabase keys to .env.';
    return;
  }

  isSubmitting.value = true;
  try {
    await signInWithEmail(loginForm.value);
    pendingConfirmationEmail.value = '';
    await goAfterAuth();
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('email not confirmed')) {
      pendingConfirmationEmail.value = loginForm.value.email.trim();
    }
    handleAuthError(error);
  } finally {
    isSubmitting.value = false;
  }
};

const submitRegister = async () => {
  if (isSubmitting.value || cooldownLeft.value > 0) return;
  clearMessages();

  if (!isAuthConfigured) {
    errorMessage.value = 'Authentication is not configured. Add your Supabase keys to .env.';
    return;
  }

  isSubmitting.value = true;
  try {
    const data = await signUpWithEmail(registerForm.value);
    if (data?.session) {
      await goAfterAuth();
      return;
    }

    successMessage.value = `We sent a confirmation link to ${registerForm.value.email}. Open it to activate your account, then sign in.`;
    pendingConfirmationEmail.value = registerForm.value.email.trim();
    loginForm.value.email = registerForm.value.email;
    registerForm.value.password = '';
    mode.value = 'login';
  } catch (error) {
    handleAuthError(error);
  } finally {
    isSubmitting.value = false;
  }
};

const handleResendConfirmation = async () => {
  if (isSubmitting.value || resendCooldownLeft.value > 0) return;

  const email = pendingConfirmationEmail.value.trim();
  if (!email) return;

  clearMessages();
  isSubmitting.value = true;
  try {
    await resendConfirmation(email);
    successMessage.value = `Confirmation email sent again to ${email}. Check your inbox and spam folder.`;
    startResendCooldown(60);
  } catch (error) {
    if (isRateLimitError(error)) startResendCooldown(60);
    errorMessage.value = friendlyAuthError(error);
  } finally {
    isSubmitting.value = false;
  }
};

const signInWithGoogleHandler = async () => {
  if (isGoogleLoading.value || isSubmitting.value) return;
  clearMessages();

  if (!isAuthConfigured) {
    errorMessage.value = 'Authentication is not configured. Add your Supabase keys to .env.';
    return;
  }

  isGoogleLoading.value = true;
  try {
    await signInWithGoogle({ redirectTo: '/auth' });
    // Supabase redirects the browser to Google here.
  } catch (error) {
    handleAuthError(error);
    isGoogleLoading.value = false;
  }
};

const handleForgotPassword = async () => {
  if (isSubmitting.value || cooldownLeft.value > 0) return;
  clearMessages();

  const email = loginForm.value.email.trim();
  if (!email) {
    errorMessage.value = 'Enter your email address first, then tap "Forgot password?".';
    return;
  }

  if (!isAuthConfigured) {
    errorMessage.value = 'Authentication is not configured. Add your Supabase keys to .env.';
    return;
  }

  isSubmitting.value = true;
  try {
    await sendPasswordReset(email);
    // Supabase intentionally does not reveal whether an email is registered,
    // so the copy stays neutral instead of claiming a link was definitely sent.
    successMessage.value = `If ${email} is registered, a reset link is on its way. Check your inbox.`;
  } catch (error) {
    handleAuthError(error);
  } finally {
    isSubmitting.value = false;
  }
};

const submitNewPassword = async () => {
  if (isSubmitting.value || cooldownLeft.value > 0) return;
  clearMessages();

  if (recoveryForm.value.password.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters.';
    return;
  }
  if (recoveryForm.value.password !== recoveryForm.value.confirm) {
    errorMessage.value = 'Passwords do not match.';
    return;
  }

  isSubmitting.value = true;
  try {
    await updatePassword(recoveryForm.value.password);
    successMessage.value = 'Password updated. Taking you to your dashboard...';
    window.setTimeout(() => {
      endPasswordRecovery();
      goAfterAuth();
    }, 900);
  } catch (error) {
    handleAuthError(error);
  } finally {
    isSubmitting.value = false;
  }
};

watch(
  authError,
  (message) => {
    if (message) errorMessage.value = message;
  },
  { immediate: true }
);

// Returning from Google or an already-valid session should skip this page.
watch(
  [isAuthenticated, isPasswordRecovery],
  ([authenticated, recovery]) => {
    if (authenticated && !recovery) goAfterAuth();
  },
  { immediate: true }
);
</script>

<style scoped>
  .auth-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    place-items: center;
    width: 100%;
    min-width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    padding: clamp(1.25rem, 4vh, 2.75rem) var(--page-x);
    overflow-x: hidden;
    overflow-y: auto;
    background: transparent;
  }

  .auth-page::before {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 8%, rgba(255, 255, 255, 0.045), transparent 58%);
    content: '';
    pointer-events: none;
  }

  .auth-panel {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.02fr) minmax(320px, 0.98fr);
    width: min(880px, 100%);
    margin: auto;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--line-strong);
    border-radius: 20px;
    background: #0a0a0a;
    box-shadow: 0 32px 90px rgba(0, 0, 0, 0.34);
    animation: authCardIn 0.75s var(--ease-out) both;
  }

  .auth-brand-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
    padding: clamp(1.15rem, 2.1vw, 1.8rem);
    border-right: 1px solid var(--line-strong);
    background: #0a0a0a;
    color: var(--text);
  }

  .auth-brand-panel::before {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    content: '';
    pointer-events: none;
  }

  .brand-top,
  .brand-lockup,
  .brand-message,
  .brand-benefits,
  .brand-foot {
    position: relative;
    z-index: 2;
  }

  .brand-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 1rem;
    animation: authRise 0.65s var(--ease-out) 0.05s both;
  }

  .back-link {
    padding: 0.42rem 0.6rem;
    border: 1px solid transparent;
    border-radius: 7px;
    background: transparent;
    color: var(--muted);
    font-size: 0.52rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: color 0.3s var(--ease), border-color 0.3s var(--ease);
  }

  .back-link:hover {
    border-color: var(--line);
    color: var(--white);
  }

  .brand-step {
    color: var(--dim);
    font-family: var(--font-display);
    font-size: 0.6rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .brand-lockup {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: clamp(1rem, 2.2vh, 1.5rem);
    animation: authRise 0.65s var(--ease-out) 0.14s both;
  }

  .brand-mark {
    display: block;
    width: 2.35rem;
    height: 2.35rem;
    flex-shrink: 0;
    padding: 0;
    border-radius: 0.6rem;
    background: transparent;
    filter: invert(1);
    object-fit: contain;
  }

  .brand-lockup-copy {
    display: grid;
    gap: 0.02rem;
  }

  .brand-lockup-copy strong {
    font-family: var(--font-display);
    font-size: 1.18rem;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .brand-lockup-copy small {
    color: var(--dim);
    font-size: 0.42rem;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .brand-message {
    display: grid;
    gap: 0.65rem;
    margin: auto 0;
    padding: clamp(0.9rem, 2.2vh, 1.35rem) 0;
    animation: authRise 0.7s var(--ease-out) 0.22s both;
  }

  .brand-message h2 {
    font-size: clamp(1.95rem, 3.1vw, 2.75rem);
    font-weight: 500;
    line-height: 1.05;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }

  .brand-message h2 em {
    display: inline-block;
    margin: 0.06em 0;
    padding: 0 0.08em;
    background: var(--white);
    color: var(--black);
    font-style: normal;
  }

  .brand-body {
    max-width: 38ch;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.75;
  }

  .brand-benefits {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--line);
    animation: authRise 0.7s var(--ease-out) 0.3s both;
  }

  .brand-benefits > span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .brand-benefits ion-icon {
    color: var(--text-soft);
    font-size: 1rem;
  }

  .brand-benefits small {
    color: var(--muted);
    font-size: 0.48rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    line-height: 1.45;
    text-transform: uppercase;
  }

  .brand-foot {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    margin-top: 0.8rem;
    color: var(--dim);
    font-size: 0.46rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    animation: authRise 0.7s var(--ease-out) 0.38s both;
  }

  .foot-line {
    width: 1.4rem;
    height: 1px;
    background: var(--dim);
  }

  .brand-rings {
    position: absolute;
    right: -8rem;
    bottom: -9rem;
    width: 24rem;
    height: 24rem;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 50%;
    pointer-events: none;
  }

  .brand-glyph {
    position: absolute;
    z-index: 1;
    top: 20%;
    right: -8rem;
    display: block;
    width: 26rem;
    height: 26rem;
    opacity: 0.055;
    filter: invert(1);
    transform: rotate(-18deg);
    object-fit: contain;
    pointer-events: none;
  }

  .brand-rings::before,
  .brand-rings::after {
    position: absolute;
    border: 1px solid rgba(255, 255, 255, 0.055);
    border-radius: 50%;
    content: '';
  }

  .brand-rings::before {
    inset: 2.4rem;
  }

  .brand-rings::after {
    inset: 5rem;
  }

  .auth-form-panel {
    position: relative;
    display: grid;
    place-items: center;
    padding: clamp(1.1rem, 2vw, 1.75rem);
    overflow: hidden;
    background: #f3f3f3;
    color: #101010;
  }

  .form-glyph {
    position: absolute;
    z-index: 1;
    right: -6.5rem;
    bottom: -7rem;
    display: block;
    width: 24rem;
    height: 24rem;
    opacity: 0.045;
    transform: rotate(14deg);
    object-fit: contain;
    pointer-events: none;
  }

  .form-inner {
    position: relative;
    z-index: 2;
    width: min(100%, 350px);
    padding: 0.25rem 0;
    animation: authRise 0.75s var(--ease-out) 0.22s both;
  }

  .auth-feedback {
    display: grid;
    gap: 0.4rem;
    margin-top: 0.85rem;
  }

  .auth-message {
    margin: 0;
    padding: 0.6rem 0.7rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    font-size: 0.66rem;
    line-height: 1.5;
  }

  .auth-message.error {
    border-color: #e7bcbc;
    background: #fbecec;
    color: #8f2020;
  }

  .auth-message.success {
    border-color: #b9dcc4;
    background: #ebf7ef;
    color: #1f6b34;
  }

  .resend-button {
    justify-self: start;
    padding: 0.15rem 0;
    border: 0;
    background: transparent;
    color: #1f1f1f;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }

  .resend-button:hover:not(:disabled) {
    color: #000000;
  }

  .resend-button:disabled {
    color: #a2a2a2;
    text-decoration: none;
    cursor: not-allowed;
  }

  .recovery-stack {
    margin-top: 1rem;
  }

  .form-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: clamp(0.9rem, 2.2vh, 1.3rem);
    padding-bottom: 0.55rem;
    border-bottom: 1px solid #d6d6d6;
    color: #8a8a8a;
    font-size: 0.46rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .heading-slot {
    position: relative;
    min-height: 5.15rem;
  }

  .heading-slot .auth-heading {
    position: absolute;
    inset: 0;
  }

  .auth-heading > span {
    color: #6b6b6b;
    font-size: 0.54rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .auth-heading h1 {
    margin: 0.4rem 0 0.3rem;
    color: #0b0b0b;
    font-size: clamp(1.65rem, 2.2vw, 2.15rem);
    font-weight: 500;
    line-height: 1.06;
    letter-spacing: 0.005em;
    text-transform: uppercase;
  }

  .auth-heading p {
    color: #6e6e6e;
    font-size: 0.68rem;
    line-height: 1.55;
  }

  .mode-switch {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem;
    margin: 1rem 0 1.15rem;
    padding: 0.22rem;
    overflow: hidden;
    border: 1px solid #dcdcdc;
    border-radius: 0.6rem;
    background: #e9e9e9;
  }

  .mode-switch::before {
    position: absolute;
    top: 0.22rem;
    bottom: 0.22rem;
    left: 0.22rem;
    width: calc(50% - 0.33rem);
    border-radius: 0.45rem;
    background: #0b0b0b;
    content: '';
    transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .is-register .mode-switch::before {
    transform: translateX(calc(100% + 0.22rem));
  }

  .mode-switch button {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.56rem;
    border: 0;
    border-radius: 0.45rem;
    background: transparent;
    color: #757575;
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: color 0.35s var(--ease);
  }

  .mode-switch button:hover:not(.active) {
    color: #2a2a2a;
  }

  .mode-switch button.active {
    background: transparent;
    color: #ffffff;
  }

  .auth-form {
    display: grid;
    gap: 0.58rem;
  }

  .form-stack {
    display: grid;
    align-items: start;
  }

  .form-stack .auth-form {
    grid-area: 1 / 1;
    align-content: start;
    transition: opacity 0.36s var(--ease), transform 0.5s var(--ease-out), filter 0.4s var(--ease);
  }

  .form-stack .auth-form:not(.active) {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
    filter: blur(3px);
    pointer-events: none;
  }

  .auth-form > label {
    position: relative;
    display: grid;
    gap: 0.28rem;
    color: #5f5f5f;
    font-size: 0.48rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .field-control {
    position: relative;
    display: block;
  }

  .field-control input {
    display: block;
    padding-right: 2.65rem;
  }

  .field-control > ion-icon,
  .field-control > button {
    position: absolute;
    top: 50%;
    right: 0.78rem;
    transform: translateY(-50%);
    color: #8f8f8f;
    font-size: 0.92rem;
    pointer-events: none;
    transition: color 0.25s var(--ease);
  }

  .field-control:focus-within > ion-icon {
    color: #111111;
  }

  .field-control > button {
    right: 0.36rem;
    display: grid;
    place-items: center;
    width: 1.8rem;
    height: 1.8rem;
    padding: 0;
    border: 0;
    border-radius: 0.45rem;
    background: transparent;
    pointer-events: auto;
    transition: background-color 0.25s var(--ease), color 0.25s var(--ease);
  }

  .field-control > button:hover {
    background: #ececec;
    color: #111111;
  }

  .field-control > button:focus-visible {
    outline: 2px solid #0b0b0b;
    outline-offset: 1px;
  }

  .auth-form input {
    width: 100%;
    padding: 0.72rem 2.2rem 0.72rem 0.78rem;
    border: 1px solid #d6d6d6;
    border-radius: 0.5rem;
    outline: 0;
    background: #ffffff;
    color: #111111;
    font-family: inherit;
    font-size: 0.72rem;
    transition: border-color 0.3s var(--ease), box-shadow 0.3s var(--ease);
  }

  .auth-form input::placeholder {
    color: #a2a2a2;
  }

  .auth-form input:focus {
    border-color: #0b0b0b;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
  }

  .password-field input {
    padding-right: 2.75rem;
  }

  .form-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin: 0.05rem 0 0.2rem;
  }

  .remember {
    display: flex !important;
    align-items: center;
    gap: 0.42rem;
    color: #616161;
    font-size: 0.6rem;
    letter-spacing: 0;
    text-transform: none;
  }

  .remember input {
    width: 0.82rem;
    height: 0.82rem;
    padding: 0;
    accent-color: #0b0b0b;
  }

  .form-options > button {
    padding: 0;
    border: 0;
    background: transparent;
    color: #4f4f4f;
    font-size: 0.6rem;
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .form-options > button:disabled {
    color: #a2a2a2;
    text-decoration: none;
    cursor: not-allowed;
  }

  .submit-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    margin-top: 0.15rem;
    padding: 0.76rem 1rem;
    border: 1px solid #0b0b0b;
    border-radius: 0.5rem;
    background: #0b0b0b;
    color: #ffffff;
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: background-color 0.3s var(--ease), transform 0.3s var(--ease), box-shadow 0.3s var(--ease);
  }

  .submit-button:hover:not(:disabled) {
    transform: translateY(-1px);
    background: #262626;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
  }

  .submit-button:active:not(:disabled) {
    transform: scale(0.99);
  }

  .submit-button:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .spinner {
    width: 0.9rem;
    height: 0.9rem;
    border: 1.5px solid rgba(255, 255, 255, 0.35);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .spinner-dark {
    border-color: rgba(11, 11, 11, 0.2);
    border-top-color: #0b0b0b;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin: 0.8rem 0;
    color: #909090;
    font-size: 0.46rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .divider::before,
  .divider::after {
    flex: 1;
    height: 1px;
    background: #d8d8d8;
    content: '';
  }

  .social-row {
    display: grid;
  }

  .social-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.66rem;
    border: 1px solid #d2d2d2;
    border-radius: 0.5rem;
    background: #ffffff;
    color: #1a1a1a;
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: border-color 0.3s var(--ease), background-color 0.3s var(--ease), transform 0.3s var(--ease);
  }

  .social-button strong {
    font-size: 0.92rem;
  }

  .social-button:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: #0b0b0b;
    background: #fafafa;
  }

  .social-button:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .terms {
    margin-top: 0.65rem;
    color: #8a8a8a;
    font-size: 0.5rem;
    line-height: 1.6;
    text-align: center;
  }

  .terms button {
    padding: 0;
    border: 0;
    background: transparent;
    color: #4a4a4a;
    font-size: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .copy-swap-enter-active,
  .copy-swap-leave-active {
    transition: opacity 0.28s var(--ease), transform 0.34s var(--ease), filter 0.3s var(--ease);
  }

  .copy-swap-enter-from {
    opacity: 0;
    transform: translateY(7px);
    filter: blur(2px);
  }

  .copy-swap-leave-to {
    opacity: 0;
    transform: translateY(-5px);
    filter: blur(2px);
  }

  @keyframes authCardIn {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.99);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes authRise {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 740px) {
    .auth-page {
      align-items: start;
      padding: 0.7rem var(--page-x) 1rem;
    }

    .auth-panel {
      grid-template-columns: 1fr;
      width: min(520px, 100%);
      border-radius: 17px;
    }

    .auth-brand-panel {
      padding: 0.8rem 1rem 0.85rem;
      border-right: 0;
      border-bottom: 1px solid var(--line-strong);
    }

    .brand-top {
      padding-bottom: 0.55rem;
    }

    .brand-lockup {
      gap: 0.5rem;
      margin-top: 0.6rem;
    }

    .brand-mark {
      width: 1.9rem;
      height: 1.9rem;
    }

    .brand-lockup-copy strong {
      font-size: 1rem;
    }

    .brand-lockup-copy small {
      font-size: 0.38rem;
      letter-spacing: 0.14em;
    }

    .brand-message {
      gap: 0;
      margin: 0.55rem 0 0;
      padding: 0;
    }

    .brand-message .eyebrow {
      display: none;
    }

    .brand-message h2 {
      font-size: 1rem;
      line-height: 1.25;
      letter-spacing: 0.06em;
    }

    .brand-message h2 br {
      display: none;
    }

    .brand-message h2 em {
      margin: 0;
      padding: 0 0.14em;
    }

    .brand-body,
    .brand-benefits,
    .brand-foot {
      display: none;
    }

    .brand-rings {
      right: -10rem;
      bottom: -14rem;
    }

    .brand-glyph {
      top: 4%;
      right: -5rem;
      width: 15rem;
      height: 15rem;
      opacity: 0.06;
    }

    .form-glyph {
      right: -5rem;
      bottom: -5.5rem;
      width: 16rem;
      height: 16rem;
    }

    .auth-form-panel {
      padding: 1.05rem 1rem 1.2rem;
    }

    .form-topline {
      margin-bottom: 0.85rem;
    }
  }

  @media (max-width: 560px) {
    .auth-page {
      align-items: start;
      padding: 0.5rem 0.6rem 0.6rem;
    }

    .auth-panel {
      width: 100%;
      border-radius: 14px;
    }

    .auth-brand-panel {
      padding: 0.7rem 0.85rem 0.75rem;
    }

    .back-link {
      padding: 0.18rem 0;
      font-size: 0.46rem;
    }

    .brand-step {
      font-size: 0.5rem;
    }

    .brand-lockup {
      gap: 0.42rem;
      margin-top: 0.5rem;
    }

    .brand-mark {
      width: 1.65rem;
      height: 1.65rem;
      border-radius: 0.4rem;
    }

    .brand-lockup-copy strong {
      font-size: 0.9rem;
    }

    .brand-lockup-copy small {
      font-size: 0.34rem;
      letter-spacing: 0.12em;
    }

    .brand-message {
      margin-top: 0.45rem;
    }

    .brand-message h2 {
      font-size: 0.88rem;
      letter-spacing: 0.05em;
    }

    .brand-rings {
      right: -7rem;
      bottom: -9rem;
      width: 17rem;
      height: 17rem;
    }

    .brand-glyph {
      top: -3.5rem;
      right: -4rem;
      width: 11.5rem;
      height: 11.5rem;
    }

    .form-glyph {
      right: -4rem;
      bottom: -5rem;
      width: 13rem;
      height: 13rem;
    }

    .auth-form-panel {
      padding: 0.85rem 0.8rem 0.95rem;
    }

    .form-topline {
      display: none;
    }

    .heading-slot {
      min-height: 4.2rem;
    }

    .auth-heading > span {
      font-size: 0.46rem;
    }

    .auth-heading h1 {
      margin: 0.3rem 0 0.25rem;
      font-size: 1.5rem;
      line-height: 1.08;
    }

    .auth-heading p {
      font-size: 0.64rem;
      line-height: 1.55;
    }

    .mode-switch {
      margin: 0.8rem 0 1.05rem;
      padding: 0.2rem;
    }

    .mode-switch button {
      padding: 0.5rem;
      font-size: 0.64rem;
    }

    .auth-form {
      gap: 0.5rem;
    }

    .auth-form > label {
      gap: 0.22rem;
      font-size: 0.44rem;
    }

    .auth-form input {
      padding: 0.64rem 2.3rem 0.64rem 0.7rem;
      font-size: 0.7rem;
    }

    .field-control input {
      padding-right: 2.45rem;
    }

    .field-control > ion-icon {
      right: 0.7rem;
      font-size: 0.86rem;
    }

    .field-control > button {
      right: 0.28rem;
      width: 1.65rem;
      height: 1.65rem;
      font-size: 0.86rem;
    }

    .submit-button {
      padding: 0.68rem 1rem;
      font-size: 0.7rem;
    }

    .divider {
      margin: 0.65rem 0;
    }

    .social-button {
      padding: 0.58rem;
    }

    .terms {
      margin-top: 0.5rem;
      font-size: 0.46rem;
      line-height: 1.55;
    }

    .form-options {
      align-items: center;
      flex-wrap: nowrap;
      gap: 0.5rem;
    }

    .form-options > button {
      white-space: nowrap;
    }
  }
</style>

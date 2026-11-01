<template>
  <ion-page class="landing-page">
    <ion-content
      ref="contentRef"
      :fullscreen="true"
      :scroll-events="true"
      class="landing-content"
      @ionScroll="onScroll"
    >
      <main class="landing-shell">
      <section id="home" class="hero landing-section">
        <div class="hero-main">
          <div class="hero-meta">
            <span>NutriFit ·  2026</span>
            <span>Fitness made simple</span>
          </div>

          <h1>
            <span class="line">Train well.</span>
            <span class="line">Live <em>better.</em></span>
          </h1>

          <div class="hero-bottom">
            <p class="hero-text">
              One simple app for meals, workouts and daily guidance.
              Everything you need to stay on track, without the clutter.
            </p>
            <div class="hero-actions">
              <button class="primary-button" type="button" @click="goTo('/auth')">
                Start free
              </button>
              <button class="outline-button" type="button" @click="scrollTo('how-it-works')">
                See how it works
              </button>
            </div>
          </div>
        </div>   
      </section>

      <div class="marquee-band" aria-hidden="true">
        <div class="marquee-track">
          <div v-for="group in 2" :key="group" class="marquee-group">
            <span v-for="item in marqueeItems" :key="`${group}-${item}`">
              {{ item }}<i></i>
            </span>
          </div>
        </div>
      </div>

      <section id="stats" class="stat-band reveal-section" :class="{ visible: visibleSections.has('stats') }" aria-label="NutriFit system stats">
        <div><strong>06</strong><span>Tools in one app</span></div>
        <div><strong>800+</strong><span>Exercises to choose from</span></div>
        <div><strong>24/7</strong><span>Helpful daily guidance</span></div>
      </section>

      <section id="features" class="landing-section feature-section reveal-section" :class="{ visible: visibleSections.has('features') }">
        <div class="section-top">
          <div>
            <p class="eyebrow">Why NutriFit</p>
            <h2>Everything you need.<br /><span>Nothing you don't.</span></h2>
          </div>
          <p class="section-copy">
            Six simple tools for food, workouts and daily guidance, all in one
            place so you can focus on what matters.
          </p>
        </div>

        <div class="feature-grid">
          <article v-for="(item, index) in features" :key="item.title" class="feature-card">
            <span class="feature-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="feature-icon"><ion-icon :icon="item.icon" /></span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </article>
        </div>
      </section>

      <section id="how-it-works" class="landing-section how-section reveal-section" :class="{ visible: visibleSections.has('how-it-works') }">
        <div class="section-top">
          <div>
            <p class="eyebrow">How it works</p>
            <h2>Three steps.<br /><span>One clear plan.</span></h2>
          </div>
          <p class="section-copy">
            NutriFit turns your daily habits into a clear picture of your progress.
            No spreadsheets, no guesswork, no clutter.
          </p>
        </div>

        <div class="steps-grid">
          <article v-for="(step, index) in workSteps" :key="step" class="step-card">
            <span class="step-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <p>{{ step }}</p>
          </article>
        </div>
      </section>

      <section id="results" class="results-band reveal-section" :class="{ visible: visibleSections.has('results') }">
        <div class="results-inner">
          <div class="results-copy">
            <p class="eyebrow">Real progress</p>
            <h2>Train well.<br />Eat well.</h2>
            <p>Simple tools that help you build lasting habits and reach your goals with less noise and more clarity.</p>
            <button class="primary-button inverted" type="button" @click="goTo('/auth')">
              Get Started
            </button>
          </div>

          <div class="stats-grid">
            <div><strong>Scan</strong><span>Meal tracking</span></div>
            <div><strong>Plan</strong><span>Workouts for you</span></div>
            <div><strong>Guide</strong><span>Daily tips</span></div>
          </div>
        </div>
      </section>

      <footer>
        <div class="footer-brand">
          <img class="brand-mark" src="/nf-icon.png" alt="" />
          <span>NutriFit</span>
        </div>
        <nav aria-label="Footer navigation">
          <button type="button" @click="scrollTo('home')">Home</button>
          <button type="button" @click="scrollTo('features')">Features</button>
          <button type="button" @click="scrollTo('how-it-works')">How it works</button>
          <button type="button" @click="scrollTo('results')">Results</button>
        </nav>
        <span class="footer-copy">© 2026 NutriFit · All rights reserved</span>
      </footer>
    </main>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage } from '@ionic/vue';
import {
  barbellOutline,
  checkmarkCircleOutline,
  personOutline,
  restaurantOutline,
  statsChartOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import { useAuth } from '../composables/useAuth';
import { useUserData } from '../composables/useUserData';

const router = useRouter();
const { isAuthenticated } = useAuth();
const {
  todayScore,
  todayCalories,
  todayProtein,
  todayWater,
  workoutsThisWeek,
  calorieTarget,
  proteinTarget,
  waterTarget,
  trainingTarget,
  caloriePercent,
  proteinPercent,
  waterPercent,
  trainingPercent,
  weeklyDelta,
  dailyTip,
  formatCalories,
} = useUserData();

const deltaLabel = computed(() => {
  if (weeklyDelta.value === null) return 'No prior week data';
  return `${weeklyDelta.value > 0 ? '+' : ''}${weeklyDelta.value}% this week`;
});
const contentRef = ref(null);
const scrollProgress = ref(0);
const activeSection = ref('home');
const visibleSections = ref(new Set(['home']));
const navItems = [];
const features = [
  { title: 'Meal Scanner', description: 'Take a photo of your meal to see calories, nutrients and portion sizes.', icon: restaurantOutline },
  { title: 'Workout Library', description: 'Find workouts that match your goals, with clear steps and video guides.', icon: barbellOutline },
  { title: 'Weekly Planner', description: 'Plan your meals and workouts for the week around your goals.', icon: personOutline },
  { title: 'Daily Coach', description: 'Get simple tips and feedback to help you stay on track.', icon: checkmarkCircleOutline },
  { title: 'Progress Tracking', description: 'See your trends, habits and improvements in one clear view.', icon: statsChartOutline },
  { title: 'Personal Goals', description: 'Set realistic targets and update them as your needs change.', icon: trendingUpOutline },
];
const marqueeItems = [
  'Meal scanning',
  'Workout plans',
  'Weekly planning',
  'Progress tracking',
  'Daily guidance',
  'Personal goals',
];
const workSteps = [
  'Create your profile and choose your goals',
  'Log your meals, water and workouts in seconds',
  'Check your progress and see what to do next',
];
const goTo = (path) => router.push(path);
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
const updateSections = () => {
  const current = navItems.slice().reverse().find((item) => {
    const el = document.getElementById(item.id);
    return el && el.getBoundingClientRect().top <= 170;
  });
  if (current) activeSection.value = current.id;
};
const onScroll = async (event) => {
  const top = event.detail.scrollTop || 0;
  const scroller = await event.target.getScrollElement();
  const max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
  scrollProgress.value = Math.min(1, Math.max(0, top / max));
  updateSections();
};
let observer;
let sectionTimer;
onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    const next = new Set(visibleSections.value);
    entries.forEach((entry) => entry.isIntersecting && next.add(entry.target.id));
    visibleSections.value = next;
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal-section').forEach((section) => observer.observe(section));
  sectionTimer = window.setTimeout(updateSections, 120);
});
onUnmounted(() => {
  window.clearTimeout(sectionTimer);
  observer?.disconnect();
});

const todayDateStr = computed(() => {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
});
</script>

<style scoped>
  .landing-page {
    height: 100%;
    color: var(--text);
    background: transparent;
  }

  .landing-content {
    --background: transparent;
    --padding-top: 0;
    --padding-bottom: 0;
  }

  .landing-content::part(scroll) {
    overflow-x: hidden;
  }

  .landing-nav {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    min-height: 5rem;
    padding: 0 var(--page-x);
    border-bottom: 1px solid var(--line);
    background: rgba(5, 5, 5, 0.86);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .landing-nav::after {
    position: absolute;
    right: 0;
    bottom: -1px;
    left: 0;
    height: 1px;
    background: var(--white);
    content: '';
    opacity: 0.9;
    transform: scaleX(var(--scroll-progress, 0));
    transform-origin: left;
    transition: transform 0.1s linear;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
  }

  .brand-mark {
    display: block;
    width: 2.4rem;
    height: 2.4rem;
    flex-shrink: 0;
    padding: 0;
    border-radius: 0.6rem;
    background: transparent;
    object-fit: contain;
    transition: transform 0.4s var(--ease);
  }

  .brand:hover .brand-mark {
    transform: rotate(-6deg);
    background: transparent;
  }

  .brand-copy {
    display: grid;
    gap: 0.05rem;
  }

  .brand-name {
    font-family: var(--font-display);
    font-size: 1.22rem;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--white);
  }

  .brand-sub {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .landing-nav nav {
    display: flex;
    gap: 0.2rem;
  }

  .landing-nav nav button {
    padding: 0.6rem 0.9rem;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: color 0.3s var(--ease), background-color 0.3s var(--ease), border-color 0.3s var(--ease);
  }

  .landing-nav nav button:hover {
    color: var(--white);
    border-color: var(--line);
    background: rgba(255, 255, 255, 0.03);
  }

  .landing-nav nav button.active {
    color: var(--black);
    background: var(--white);
    border-color: var(--white);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .login-link {
    padding: 0.72rem 0.95rem;
    border: 1px solid transparent;
    border-radius: 9px;
    background: transparent;
    color: var(--text-soft);
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: color 0.3s var(--ease), border-color 0.3s var(--ease);
  }

  .login-link:hover {
    border-color: var(--line-strong);
    color: var(--white);
  }

  .nav-cta {
    padding: 0.72rem 1.1rem;
    font-size: 0.72rem;
  }

  .landing-page .primary-button,
  .landing-page .outline-button {
    border-radius: 10px;
    padding: 0.92rem 1.35rem;
  }

  .landing-page .primary-button:hover,
  .landing-page .outline-button:hover {
    transform: translateY(-2px);
  }

  .landing-shell {
    width: 100%;
    padding: calc(5rem + env(safe-area-inset-top, 0)) 0 0;
  }

  .landing-section {
    scroll-margin-top: 5rem;
  }

  .hero {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(340px, 0.65fr);
    gap: clamp(2.5rem, 4vw, 4.5rem);
    align-items: stretch;
    min-height: min(calc(100svh - 9rem), 720px);
    padding: clamp(5rem, 9vh, 6rem) var(--page-x) clamp(2.5rem, 4.5vh, 4rem);
    border-bottom: 1px solid var(--line);
    overflow: hidden;
  }

  .hero::before {
    position: absolute;
    top: 5%;
    left: var(--page-x);
    color: transparent;
    content: 'NUTRIFIT';
    font-family: var(--font-display);
    font-size: clamp(5rem, 20vw, 18rem);
    font-weight: 500;
    line-height: 0.8;
    letter-spacing: -0.03em;
    white-space: nowrap;
    -webkit-text-stroke: 1px rgba(255, 255, 255, 0.055);
    pointer-events: none;
    transform: translateX(-0.04em);
  }

  .hero-main {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
  }

  .hero-meta {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    color: var(--dim);
    font-size: 0.55rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    animation: landingRise 0.8s var(--ease-out) both;
  }

  .hero h1 {
    display: grid;
    gap: 0.12em;
    margin: auto 0;
    padding: clamp(1.8rem, 3.5vh, 3rem) 0;
    font-size: clamp(3.4rem, 7.8vw, 7.6rem);
    font-weight: 500;
    line-height: 1.04;
    letter-spacing: -0.01em;
    text-transform: uppercase;
  }

  .hero h1 .line {
    display: block;
    animation: landingRise 0.95s var(--ease-out) both;
  }

  .hero h1 .line:nth-child(2) {
    animation-delay: 0.12s;
  }

  .hero h1 em {
    display: inline-block;
    padding: 0 0.08em 0.06em;
    background: var(--white);
    color: var(--black);
    font-style: normal;
  }

  .hero-bottom {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--line);
    animation: landingRise 0.9s var(--ease-out) 0.22s both;
  }

  .hero-text {
    max-width: 52ch;
    color: var(--muted);
    font-size: 0.94rem;
    line-height: 1.9;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    justify-content: flex-end;
  }

  .hero-board {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: clamp(1rem, 1.6vw, 1.2rem);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background: linear-gradient(170deg, #111111, #090909);
    animation: landingRise 1s var(--ease-out) 0.18s both;
  }

  .board-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid var(--line);
  }

  .board-date {
    color: var(--dim);
    font-size: 0.5rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .board-score {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
  }

  .board-score strong {
    font-family: var(--font-display);
    font-size: clamp(3.6rem, 5.8vw, 5rem);
    font-weight: 400;
    line-height: 0.9;
    letter-spacing: -0.01em;
  }

  .board-score strong span {
    color: var(--dim);
    font-size: 0.38em;
  }

  .board-delta {
    padding: 0.32rem 0.55rem;
    border: 1px solid var(--line);
    border-radius: 6px;
    color: var(--muted);
    font-size: 0.48rem;
    white-space: nowrap;
  }

  .board-note {
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.8;
  }

  .board-rows {
    display: grid;
    gap: 0;
    padding-top: 0.2rem;
    border-top: 1px solid var(--line);
  }

  .board-rows > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 0.4rem 1rem;
    padding: 0.62rem 0;
    border-bottom: 1px solid var(--line);
  }

  .board-rows span {
    color: var(--muted);
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .board-rows b {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 400;
    color: var(--white);
  }

  .board-rows b small {
    color: var(--dim);
    font-family: var(--font-body);
    font-size: 0.45rem;
    font-weight: 400;
  }

  .meter {
    display: block;
    grid-column: 1 / -1;
    height: 2px;
    border-radius: 99px;
    background: var(--line);
    overflow: hidden;
  }

  .meter i {
    display: block;
    height: 100%;
    background: var(--white);
  }

  .board-tip {
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    margin-top: auto;
    padding: 0.78rem;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.025);
  }

  .tip-mark {
    display: grid;
    place-items: center;
    width: 1.7rem;
    height: 1.7rem;
    flex-shrink: 0;
    border-radius: 6px;
    background: var(--white);
    color: var(--black);
    font-family: var(--font-display);
    font-size: 0.6rem;
    font-weight: 600;
  }

  .board-tip p {
    color: var(--text-soft);
    font-size: 0.64rem;
    line-height: 1.75;
  }

  .marquee-band {
    overflow: hidden;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }

  .marquee-track {
    display: flex;
    width: max-content;
    animation: marquee 30s linear infinite;
  }

  .marquee-band:hover .marquee-track {
    animation-play-state: paused;
  }

  .marquee-group {
    display: flex;
    flex: none;
  }

  .marquee-group span {
    display: inline-flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.8rem 1.35rem;
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .marquee-group i {
    display: block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--white);
  }

  .stat-band {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-bottom: 1px solid var(--line);
  }

  .stat-band > div {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    padding: 1.4rem var(--page-x);
    border-right: 1px solid var(--line);
    transition: background-color 0.35s var(--ease);
  }

  .stat-band > div:hover {
    background: rgba(255, 255, 255, 0.025);
  }

  .stat-band > div:last-child {
    border-right: 0;
  }

  .stat-band strong {
    font-family: var(--font-display);
    font-size: clamp(2rem, 3.2vw, 2.9rem);
    font-weight: 400;
    line-height: 1;
  }

  .stat-band span {
    color: var(--muted);
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    line-height: 1.6;
    text-transform: uppercase;
  }

  .section-top {
    display: grid;
    grid-template-columns: 1fr minmax(280px, 0.62fr);
    align-items: end;
    gap: clamp(2rem, 4vw, 4rem);
    padding-bottom: 1.4rem;
    border-bottom: 1px solid var(--line);
  }

  .section-top h2,
  .results-copy h2 {
    margin-top: 0.7rem;
    font-size: clamp(2.2rem, 4vw, 3.6rem);
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: 0.005em;
    text-transform: uppercase;
  }

  .section-top h2 span {
    color: var(--dim);
  }

  .section-copy {
    max-width: 48ch;
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.9;
  }

  .landing-page .eyebrow {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .landing-page .eyebrow::before {
    width: 1.5rem;
    height: 1px;
    background: currentColor;
    content: '';
  }

  .feature-section,
  .how-section {
    padding: clamp(2.4rem, 4.5vh, 3.6rem) var(--page-x);
    border-bottom: 1px solid var(--line);
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem;
    margin-top: 1.4rem;
  }

  .feature-card {
    position: relative;
    display: grid;
    grid-template-columns: 2.1rem minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-content: start;
    gap: 0.15rem 0.85rem;
    min-height: 0;
    padding: 1.15rem 1.2rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    transition: transform 0.4s var(--ease), border-color 0.4s var(--ease), background-color 0.4s var(--ease);
  }

  .feature-index {
    position: absolute;
    top: 1.05rem;
    right: 1.15rem;
    color: var(--dim);
    font-family: var(--font-display);
    font-size: 0.68rem;
    letter-spacing: 0.1em;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    border-color: var(--line-strong);
    background: var(--surface-2);
  }

  .feature-icon {
    display: grid;
    grid-row: 1 / 3;
    place-items: center;
    width: 2.1rem;
    height: 2.1rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    color: var(--white);
    font-size: 0.9rem;
  }

  .feature-card h3 {
    align-self: center;
    font-size: clamp(1.05rem, 1.4vw, 1.22rem);
    font-weight: 500;
    line-height: 1.25;
    text-transform: uppercase;
  }

  .feature-card p {
    color: var(--muted);
    font-size: 0.75rem;
    line-height: 1.85;
  }

  .steps-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem;
    margin-top: 1.4rem;
  }

  .step-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1.3rem;
    min-height: 170px;
    overflow: hidden;
    padding: clamp(1.25rem, 2vw, 1.65rem);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    transition: transform 0.4s var(--ease), border-color 0.4s var(--ease);
  }

  .step-card::after {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 1px;
    background: var(--white);
    content: '';
    transition: width 0.5s var(--ease-out);
  }

  .step-card:hover {
    transform: translateY(-4px);
    border-color: var(--line-strong);
  }

  .step-card:hover::after {
    width: 100%;
  }

  .step-number {
    color: var(--dim);
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 3.4vw, 3rem);
    font-weight: 400;
    line-height: 1;
  }

  .step-card p {
    max-width: 26ch;
    margin-top: auto;
    color: var(--text-soft);
    font-size: 0.8rem;
    line-height: 1.85;
  }

  .results-band {
    position: relative;
    overflow: hidden;
    background: var(--white);
    color: #0a0a0a;
  }

  .results-band::before {
    position: absolute;
    right: -0.08em;
    bottom: -0.18em;
    color: transparent;
    content: 'RESULTS';
    font-family: var(--font-display);
    font-size: clamp(6rem, 18vw, 16rem);
    font-weight: 500;
    line-height: 0.8;
    letter-spacing: -0.02em;
    white-space: nowrap;
    -webkit-text-stroke: 1px rgba(0, 0, 0, 0.07);
    pointer-events: none;
  }

  .results-inner {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(2.5rem, 5vw, 6rem);
    align-items: center;
    padding: clamp(2.5rem, 5vh, 4.2rem) var(--page-x);
  }

  .results-copy .eyebrow {
    color: #4f4f4f;
  }

  .results-copy h2 {
    color: #0a0a0a;
  }

  .results-copy > p:not(.eyebrow) {
    max-width: 46ch;
    margin-top: 1rem;
    color: #555;
    font-size: 0.86rem;
    line-height: 1.9;
  }

  .results-copy .primary-button.inverted {
    margin-top: 1.4rem;
    border-color: #0a0a0a;
    background: #0a0a0a;
    color: var(--white);
  }

  .results-copy .primary-button.inverted:hover {
    background: #2a2a2a;
    border-color: #2a2a2a;
  }

  .stats-grid {
    display: grid;
    border-top: 1px solid rgba(0, 0, 0, 0.16);
  }

  .stats-grid > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.2rem 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.16);
  }

  .stats-grid strong {
    font-family: var(--font-display);
    font-size: clamp(2rem, 3.4vw, 2.9rem);
    font-weight: 400;
    line-height: 1;
    color: #0a0a0a;
  }

  .stats-grid span {
    color: #555;
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-align: right;
    text-transform: uppercase;
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1.4rem var(--page-x) 2rem;
    color: var(--dim);
    font-size: 0.52rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .footer-brand {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.9rem;
    letter-spacing: 0.06em;
  }

  .footer-brand .brand-mark {
    width: 1.8rem;
    height: 1.8rem;
    padding: 0.22rem;
  }

  footer nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.15rem;
  }

  footer nav button {
    padding: 0.45rem 0.65rem;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--muted);
    font-size: 0.5rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: color 0.3s var(--ease), background-color 0.3s var(--ease);
  }

  footer nav button:hover {
    color: var(--white);
    background: rgba(255, 255, 255, 0.05);
  }

  .reveal-section > * {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.8s var(--ease-out), transform 0.8s var(--ease-out);
  }

  .reveal-section.visible > * {
    opacity: 1;
    transform: none;
  }

  .reveal-section.visible > *:nth-child(2) {
    transition-delay: 0.1s;
  }

  .reveal-section.visible > *:nth-child(3) {
    transition-delay: 0.18s;
  }

  .reveal-section.visible > *:nth-child(4) {
    transition-delay: 0.24s;
  }

  @keyframes landingRise {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes marquee {
    to {
      transform: translateX(-50%);
    }
  }

  @media (max-width: 1180px) {
    .hero {
      grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
      gap: clamp(2.5rem, 4vw, 4rem);
    }

    .hero h1 {
      font-size: clamp(3.4rem, 7.6vw, 7rem);
    }

    .hero-bottom {
      grid-template-columns: 1fr;
      gap: 1.4rem;
    }

    .hero-actions {
      justify-content: flex-start;
    }

    .feature-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 960px) {
    .landing-nav nav {
      display: none;
    }

    .hero {
      grid-template-columns: 1fr;
      min-height: auto;
    }

    .hero h1 {
      padding: 2rem 0;
    }

    .hero-board {
      max-width: 640px;
    }

    .section-top,
    .results-inner {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      display: none;
    }
  }

  @media (max-width: 700px) {
    .landing-nav {
      min-height: 4.4rem;
    }

    .brand-sub,
    .login-link {
      display: none;
    }

    .hero {
      padding-top: 1.2rem;
      padding-bottom: 1.6rem;
      gap: 1.5rem;
    }

    .hero h1 {
      padding: 1.3rem 0;
      font-size: clamp(2.7rem, 12vw, 4rem);
    }

    .hero-meta {
      font-size: 0.48rem;
    }

    .hero-text {
      display: none;
    }

    .hero-bottom {
      gap: 0;
      padding-top: 1rem;
    }

    .hero-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .hero-actions .primary-button,
    .hero-actions .outline-button {
      width: 100%;
    }

    .hero-board {
      gap: 0.8rem;
      padding: 1rem;
    }

    .board-note,
    .board-tip {
      display: none;
    }

    .board-score strong {
      font-size: 3rem;
    }

    .board-rows > div {
      padding: 0.5rem 0;
    }

    .marquee-band {
      display: none;
    }

    .stat-band {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .stat-band > div {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.85rem 1rem;
      border-right: 1px solid var(--line);
      border-bottom: 0;
    }

    .stat-band > div:last-child {
      border-right: 0;
    }

    .stat-band strong {
      font-size: 1.65rem;
    }

    .stat-band span {
      font-size: 0.48rem;
      letter-spacing: 0.06em;
      line-height: 1.5;
    }

    .section-top {
      padding-bottom: 1rem;
    }

    .section-top h2,
    .results-copy h2 {
      margin-top: 0.5rem;
      font-size: clamp(1.9rem, 8vw, 2.4rem);
      line-height: 1.12;
    }

    .section-copy {
      display: none;
    }

    .feature-section,
    .how-section {
      padding: 1.8rem var(--page-x);
    }

    .feature-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
      margin-top: 1rem;
    }

    .feature-card {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.8rem 0.85rem;
    }

    .feature-icon {
      width: 1.85rem;
      height: 1.85rem;
      grid-row: auto;
      font-size: 0.8rem;
    }

    .feature-card h3 {
      font-size: 0.86rem;
      line-height: 1.35;
    }

    .feature-card p,
    .feature-index {
      display: none;
    }

    .steps-grid {
      grid-template-columns: 1fr;
      margin-top: 1rem;
    }

    .step-card {
      display: grid;
      grid-template-columns: 2.2rem minmax(0, 1fr);
      align-items: center;
      gap: 0.9rem;
      min-height: 0;
      padding: 0.8rem 1rem;
    }

    .step-number {
      font-size: 2rem;
    }

    .step-card p {
      margin-top: 0;
      font-size: 0.78rem;
    }

    .results-inner {
      gap: 0;
      padding: 2rem var(--page-x);
    }

    .results-copy > p:not(.eyebrow) {
      margin-top: 0.75rem;
      font-size: 0.82rem;
    }

    .results-copy .primary-button.inverted {
      margin-top: 1rem;
    }

    footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem var(--page-x) 1.2rem;
    }

    footer nav {
      flex-wrap: wrap;
      justify-content: flex-start;
      gap: 0.7rem 1rem;
    }
  }
</style>

<template>
  <ion-page class="goals-page">
    
    <ion-content :fullscreen="true" class="goals-content">
      <main class="goals-shell">
        <section class="goals-hero">
          <div class="hero-copy">
            <p class="eyebrow">Your goals</p>
            <h1>Track your<br /><span>progress.</span></h1>
            <p class="page-subtitle">A clear view of the numbers that matter to you.</p>
          </div>
          <div class="hero-side">
            <span class="page-tag">{{ todayLabel }}</span>
            <div class="hero-stat">
              <strong>
                {{ weeklyDelta === null ? '—' : `${weeklyDelta > 0 ? '+' : ''}${weeklyDelta}` }}<small v-if="weeklyDelta !== null">%</small>
              </strong>
              <span>{{ weeklyDelta === null ? 'No prior week data' : 'vs last week' }}<br />overall progress</span>
            </div>
          </div>
        </section>

        <section class="goals-grid">
          <article class="metric-card">
            <div class="metric-top">
              <span class="metric-icon"><ion-icon :icon="flameOutline" /></span>
              <span class="metric-label">Calories</span>
              <span class="metric-trend">{{ calorieTrend === null ? '—' : `${calorieTrend > 0 ? '+' : ''}${calorieTrend}%` }}</span>
            </div>
            <p class="metric">{{ caloriePercent }}<span>%</span></p>
            <div class="metric-foot">
              <span>{{ formatCalories(todayCalories) }} of {{ calorieTarget ? formatCalories(calorieTarget) : 'no target' }} calories</span>
              <span>Daily target</span>
            </div>
            <div class="metric-bar"><span :style="{ width: `${caloriePercent}%` }"></span></div>
          </article>

          <article class="metric-card">
            <div class="metric-top">
              <span class="metric-icon"><ion-icon :icon="barbellOutline" /></span>
              <span class="metric-label">Training</span>
              <span class="metric-trend">{{ trainingTrend === null ? '—' : `${trainingTrend > 0 ? '+' : ''}${trainingTrend}` }}</span>
            </div>
            <p class="metric">{{ workoutsThisWeek }}<span>/{{ trainingTarget }}</span></p>
            <div class="metric-foot">
              <span>{{ workoutsThisWeek }} of {{ trainingTarget }} sessions</span>
              <span>Weekly plan</span>
            </div>
            <div class="metric-bar"><span :style="{ width: `${trainingPercent}%` }"></span></div>
          </article>

          <article class="metric-card">
            <div class="metric-top">
              <span class="metric-icon"><ion-icon :icon="waterOutline" /></span>
              <span class="metric-label">Hydration</span>
              <span class="metric-trend">{{ hydrationTrend === null ? '—' : `${hydrationTrend > 0 ? '+' : ''}${hydrationTrend}` }}</span>
            </div>
            <p class="metric">{{ todayWater }}<span>/{{ waterTarget }}</span></p>
            <div class="metric-foot">
              <span>{{ todayWater }} of {{ waterTarget }} glasses</span>
              <span>Daily target</span>
            </div>
            <div class="metric-bar"><span :style="{ width: `${waterPercent}%` }"></span></div>
          </article>
        </section>

        <section class="progress-grid">
          <article class="chart-card">
            <div class="chart-head">
              <div>
                <span class="card-kicker">Progress</span>
                <h2>Weekly progress</h2>
              </div>
              <span class="chart-tag">
                <ion-icon :icon="trendingUpOutline" />
                {{ weeklyDelta === null ? 'This week' : `${weeklyDelta > 0 ? '+' : ''}${weeklyDelta}% vs last week` }}
              </span>
            </div>

            <div class="chart-area">
              <div class="chart-axis" aria-hidden="true">
                <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
              </div>
              <div class="bars" aria-hidden="true">
                <span
                  v-for="day in weeklyBars"
                  :key="day.key"
                  :class="{ today: day.key === todayKeyValue }"
                  :style="{ height: `${day.height}%` }"
                ></span>
              </div>
            </div>

            <div class="bar-labels">
              <span v-for="day in weeklyBars" :key="`label-${day.key}`">{{ day.label }}</span>
            </div>

            <div class="chart-foot">
              <span><small>Weekly average</small><strong>{{ weeklyAverage }}%</strong></span>
              <span>
                <small>Best day</small>
                <strong>{{ bestDay ? `${bestDay.longLabel} · ${bestDay.score}%` : 'No data yet' }}</strong>
              </span>
              <span><small>Days on target</small><strong>{{ daysOnTarget }} of {{ elapsedDays.length }}</strong></span>
            </div>
          </article>

          <aside class="goals-side">
            <article class="focus-card">
              <div class="side-head">
                <div>
                  <span class="card-kicker">Goal focus</span>
                  <h2>Active goals</h2>
                </div>
                <span class="pill">{{ activeGoalCount }} active</span>
              </div>

              <ul class="goal-list">
                <li>
                  <span class="goal-name">Calorie intake<small>Daily target</small></span>
                  <span class="goal-meter"><i :style="{ width: `${caloriePercent}%` }"></i></span>
                  <b>{{ calorieTarget ? `${caloriePercent}%` : 'Not set' }}</b>
                </li>
                <li>
                  <span class="goal-name">Training<small>Weekly sessions</small></span>
                  <span class="goal-meter"><i :style="{ width: `${trainingPercent}%` }"></i></span>
                  <b>{{ trainingPercent }}%</b>
                </li>
                <li>
                  <span class="goal-name">Hydration<small>Today</small></span>
                  <span class="goal-meter"><i :style="{ width: `${waterPercent}%` }"></i></span>
                  <b>{{ waterPercent }}%</b>
                </li>
                <li>
                  <span class="goal-name">
                    Weight
                    <small>{{ profile.targetWeightKg ? `Target ${profile.targetWeightKg} kg` : 'No target set' }}</small>
                  </span>
                  <span class="goal-meter"><i :style="{ width: `${weightProgress}%` }"></i></span>
                  <b>{{ profile.weightKg ? `${profile.weightKg} kg` : 'Not set' }}</b>
                </li>
              </ul>
            </article>

            <article class="insight-card">
              <span class="insight-tag">Daily insight</span>
              <p>{{ dailyTip }}</p>
              <div class="insight-foot">
                <span>Daily Coach</span>
                <span class="insight-line"></span>
              </div>
            </article>
          </aside>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import { barbellOutline, flameOutline, trendingUpOutline, waterOutline } from 'ionicons/icons';
import { useUserData } from '../composables/useUserData';
import { todayKey } from '../services/userData';

const {
  profile,
  todayLabel,
  todayCalories,
  todayWater,
  calorieTarget,
  caloriePercent,
  waterTarget,
  waterPercent,
  trainingTarget,
  trainingPercent,
  workoutsThisWeek,
  weeklyBars,
  weeklyAverage,
  weeklyDelta,
  daysOnTarget,
  elapsedDays,
  bestDay,
  calorieTrend,
  trainingTrend,
  hydrationTrend,
  activeGoalCount,
  dailyTip,
  formatCalories,
} = useUserData();

const todayKeyValue = todayKey();

const weightProgress = computed(() => {
  const current = Number(profile.value.weightKg) || 0;
  const target = Number(profile.value.targetWeightKg) || 0;
  if (!current || !target) return 0;
  return Math.abs(current - target) <= 0.5 ? 100 : 0;
});
</script>

<style scoped>
  .goals-content {
    --background: var(--bg);
  }

  .goals-shell {
    width: 100%;
    max-width: none;
    margin: 0;
    padding-top: clamp(0.6rem, 1.2vw, 0.9rem);
  }

  .goals-hero {
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
    display: grid;
    justify-items: end;
    gap: 0.8rem;
    padding-bottom: 0.15rem;
  }

  .page-tag,
  .pill {
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

  .hero-stat {
    display: flex;
    align-items: flex-end;
    gap: 0.6rem;
    padding-left: 0.9rem;
    border-left: 1px solid var(--line);
  }

  .hero-stat strong {
    font-family: var(--font-display);
    font-size: clamp(2rem, 3.4vw, 3rem);
    font-weight: 500;
    line-height: 0.8;
    letter-spacing: 0.005em;
  }

  .hero-stat strong small {
    font-size: 0.4em;
    color: var(--dim);
  }

  .hero-stat span {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    line-height: 1.5;
    text-transform: uppercase;
  }

  .goals-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-bottom: 1px solid var(--line);
  }

  .metric-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 155px;
    padding: clamp(0.85rem, 1.5vw, 1.2rem);
    border-right: 1px solid var(--line);
  }

  .metric-card:first-child {
    padding-left: 0;
  }

  .metric-card:last-child {
    padding-right: 0;
    border-right: 0;
  }

  .metric-top {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .metric-icon {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    color: var(--text-soft);
    font-size: 0.8rem;
  }

  .metric-label {
    color: var(--muted);
    font-size: 0.48rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .metric-trend {
    margin-left: auto;
    padding: 0.18rem 0.4rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--dim);
    font-size: 0.42rem;
    font-weight: 500;
  }

  .metric {
    margin: 0.9rem 0 0;
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 3.8vw, 3rem);
    font-weight: 500;
    line-height: 0.82;
    letter-spacing: 0.005em;
  }

  .metric span {
    color: var(--dim);
    font-size: 0.38em;
  }

  .metric-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-top: auto;
    padding-top: 0.7rem;
    color: var(--dim);
    font-size: 0.5rem;
  }

  .metric-foot span:last-child {
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .metric-bar {
    height: 3px;
    margin-top: 0.55rem;
    border-radius: 99px;
    background: var(--line);
    overflow: hidden;
  }

  .metric-bar span {
    display: block;
    height: 100%;
    background: var(--white);
  }

  .progress-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
    align-items: start;
    gap: clamp(0.8rem, 1.5vw, 1.2rem);
    margin-top: clamp(0.9rem, 1.6vw, 1.3rem);
  }

  .chart-card {
    min-width: 0;
    padding: clamp(0.9rem, 1.6vw, 1.3rem);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  .chart-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.8rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--line);
  }

  .chart-head h2 {
    margin-top: 0.25rem;
    font-size: clamp(1.25rem, 2vw, 1.65rem);
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
  }

  .chart-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.26rem 0.5rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--muted);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .chart-area {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.75rem;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--line);
    background-image: repeating-linear-gradient(to top, transparent 0, transparent calc(25% - 1px), rgba(255, 255, 255, 0.05) 25%);
  }

  .chart-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 10rem;
    padding-bottom: 0.05rem;
    color: var(--dim);
    font-size: 0.4rem;
    letter-spacing: 0.06em;
    text-align: right;
  }

  .bars {
    display: flex;
    align-items: flex-end;
    gap: clamp(0.3rem, 0.9vw, 0.6rem);
    height: 10rem;
  }

  .bars span {
    flex: 1;
    min-width: 0;
    border-radius: 0.3rem 0.3rem 0 0;
    background: #3a3a3a;
    transition: background-color 0.35s var(--ease);
  }

  .bars span.today {
    background: var(--white);
  }

  .bars:hover span {
    background: #555555;
  }

  .bars:hover span.today {
    background: var(--white);
  }

  .bar-labels {
    display: flex;
    gap: clamp(0.3rem, 0.9vw, 0.6rem);
    margin-top: 0.5rem;
    padding-left: calc(0.75rem + 1.1rem);
  }

  .bar-labels span {
    flex: 1;
    color: var(--dim);
    font-size: 0.42rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-align: center;
    text-transform: uppercase;
  }

  .chart-foot {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 1rem;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  .chart-foot > span {
    display: grid;
    gap: 0.15rem;
    padding: 0.6rem 0.6rem 0.6rem 0;
    border-right: 1px solid var(--line);
  }

  .chart-foot > span:not(:first-child) {
    padding-left: 0.7rem;
  }

  .chart-foot > span:last-child {
    border-right: 0;
  }

  .chart-foot small {
    color: var(--dim);
    font-size: 0.4rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .chart-foot strong {
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 400;
    letter-spacing: 0.03em;
  }

  .goals-side {
    display: grid;
    gap: clamp(0.7rem, 1.2vw, 1rem);
    min-width: 0;
  }

  .focus-card {
    padding: clamp(0.85rem, 1.5vw, 1.15rem);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  .side-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--line);
  }

  .side-head h2 {
    margin-top: 0.25rem;
    font-size: clamp(1.15rem, 1.8vw, 1.5rem);
    font-weight: 500;
    line-height: 0.95;
    text-transform: uppercase;
  }

  .goal-list {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .goal-list li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 44px auto;
    align-items: center;
    gap: 0.55rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--line);
  }

  .goal-list li:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .goal-name {
    display: grid;
    gap: 0.02rem;
    min-width: 0;
    color: var(--text-soft);
    font-size: 0.58rem;
    font-weight: 500;
  }

  .goal-name small {
    color: var(--dim);
    font-size: 0.46rem;
    font-weight: 400;
  }

  .goal-meter {
    height: 2px;
    border-radius: 99px;
    background: var(--line);
    overflow: hidden;
  }

  .goal-meter i {
    display: block;
    height: 100%;
    background: var(--white);
  }

  .goal-list b {
    color: var(--muted);
    font-family: var(--font-display);
    font-size: 0.58rem;
    font-weight: 400;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .insight-card {
    padding: clamp(0.9rem, 1.5vw, 1.15rem);
    border: 1px solid var(--white);
    border-radius: var(--radius-lg);
    background: var(--white);
    color: var(--black);
  }

  .insight-tag {
    color: #767676;
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .insight-card > p {
    margin: 0.6rem 0 1rem;
    color: #161616;
    font-family: var(--font-display);
    font-size: clamp(0.95rem, 1.4vw, 1.2rem);
    font-weight: 400;
    line-height: 1.25;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }

  .insight-foot {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6a6a6a;
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .insight-line {
    flex: 1;
    height: 1px;
    background: rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 1100px) {
    .progress-grid {
      grid-template-columns: 1fr;
    }

    .goals-side {
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
      align-items: stretch;
    }
  }

  @media (max-width: 900px) {
    .goals-hero {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.9rem;
    }

    .hero-side {
      justify-items: start;
    }

    .hero-stat {
      padding-left: 0;
      border-left: 0;
    }

    .goals-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .metric-card:nth-child(2) {
      padding-right: 0;
      border-right: 0;
    }

    .metric-card:nth-child(3) {
      grid-column: span 2;
      padding: 0.9rem 0;
      border-top: 1px solid var(--line);
    }
  }

  @media (max-width: 700px) {
    .hero-copy h1 {
      font-size: clamp(1.9rem, 9vw, 2.7rem);
    }

    .goals-grid {
      grid-template-columns: 1fr;
    }

    .metric-card,
    .metric-card:nth-child(2),
    .metric-card:nth-child(3) {
      grid-column: auto;
      min-height: 0;
      padding: 0.9rem 0;
      border-right: 0;
      border-top: 1px solid var(--line);
    }

    .metric-card:first-child {
      border-top: 0;
    }

    .goals-side {
      grid-template-columns: 1fr;
    }

    .chart-head {
      flex-direction: column;
    }

    .chart-axis,
    .bars {
      height: 8rem;
    }

    .bar-labels {
      padding-left: 0;
    }

    .chart-foot {
      grid-template-columns: 1fr;
    }

    .chart-foot > span,
    .chart-foot > span:not(:first-child) {
      padding: 0.5rem 0;
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }

    .chart-foot > span:last-child {
      border-bottom: 0;
    }
  }
</style>

import { createRouter, createWebHistory } from '@ionic/vue-router';
import { initAuth, useAuth } from '../composables/useAuth';
import { isAuthConfigured } from '../services/auth';
import LandingPage from '../views/LandingPage.vue';
import AuthPage from '../views/AuthPage.vue';
import AuthCallbackPage from '../views/AuthCallbackPage.vue';
import EmbedPage from '../views/EmbedPage.vue';
import DashboardPage from '../views/DashboardPage.vue';
import WorkoutsPage from '../views/WorkoutsPage.vue';
import ScannerPage from '../views/ScannerPage.vue';
import PlannerPage from '../views/PlannerPage.vue';
import GoalsPage from '../views/GoalsPage.vue';
import ProfilePage from '../views/ProfilePage.vue';

const routes = [
  { path: '/', redirect: '/landing' },
  { path: '/landing', name: 'landing', component: LandingPage },
  { path: '/auth', name: 'auth', component: AuthPage },
  { path: '/auth/callback', name: 'auth-callback', component: AuthCallbackPage },
  { path: '/embed/:videoId', name: 'embed', component: EmbedPage },
  { path: '/dashboard', name: 'dashboard', component: DashboardPage },
  { path: '/workouts', name: 'workouts', component: WorkoutsPage },
  { path: '/scanner', name: 'scanner', component: ScannerPage },
  { path: '/planner', name: 'planner', component: PlannerPage },
  { path: '/goals', name: 'goals', component: GoalsPage },
  { path: '/profile', name: 'profile', component: ProfilePage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, left: 0, behavior: 'smooth' };
  },
});

const PUBLIC_ROUTES = new Set(['landing', 'auth', 'auth-callback', 'embed']);

router.beforeEach(async (to) => {
  // The embed page is loaded inside an iframe by the native video player. It
  // must render instantly, without auth checks or session restoration.
  if (to.name === 'embed') return true;

  // Without Supabase credentials the app stays usable in demo mode.
  if (!isAuthConfigured) return true;

  const { isAuthenticated, isPasswordRecovery } = useAuth();
  await initAuth();

  if (to.name === 'auth') {
    // Let a password-recovery landing stay on the auth page so the user can
    // choose a new password instead of being bounced to the dashboard.
    if (isAuthenticated.value && !isPasswordRecovery.value) {
      return { name: 'dashboard' };
    }
    return true;
  }

  if (!PUBLIC_ROUTES.has(to.name) && !isAuthenticated.value) {
    return {
      name: 'auth',
      query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
    };
  }

  return true;
});

export default router;

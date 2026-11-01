import { createApp } from 'vue';
import {
  IonicVue,
  IonApp,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonToolbar,
} from '@ionic/vue';
import App from './App.vue';
import router from './router';
import { initAuth } from './composables/useAuth';
import { bootPreferences } from './services/preferences';
import './theme/global.css';

// Apply the saved theme/language before the first paint, then restore the
// Supabase session while the router resolves so the first guard is not waiting
// on a cold network request.
bootPreferences();
initAuth();

const app = createApp(App);
app.use(IonicVue);
app.use(router);

[
  IonApp,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonToolbar,
].forEach((component) => {
  app.component(component.name, component);
});

router.isReady().then(() => app.mount('#app'));

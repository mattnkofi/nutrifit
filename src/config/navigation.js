import {
  homeOutline,
  barbellOutline,
  cameraOutline,
  calendarOutline,
  personOutline,
} from 'ionicons/icons';

// Single source of truth for the primary navigation. The mobile bottom bar and
// the desktop header nav both render from this list, so they can never drift
// apart when a route is added or renamed.
export const primaryNavItems = [
  { name: 'dashboard', label: 'Home', icon: homeOutline, path: '/dashboard' },
  { name: 'workouts', label: 'Workouts', icon: barbellOutline, path: '/workouts' },
  { name: 'scanner', label: 'Scan', icon: cameraOutline, path: '/scanner' },
  { name: 'planner', label: 'Planner', icon: calendarOutline, path: '/planner' },
  { name: 'profile', label: 'Profile', icon: personOutline, path: '/profile', aliases: ['goals'] },
];

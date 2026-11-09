import { registerRootComponent } from 'expo';
// Background task must be defined at module scope, before the app renders.
import './src/lib/background';
import App from './App';
import { registerAndroidWidgets } from './src/widgets/android';
import { registerPrayedAction } from './src/lib/salahActions';

registerRootComponent(App);
// Android home-screen widgets are drawn by a background task that must be registered here.
registerAndroidWidgets();
// "Prayed ✓" on prayer notifications ticks the prayer tracker, even with the app in the background.
registerPrayedAction();

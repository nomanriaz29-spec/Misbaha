import { registerRootComponent } from 'expo';
// Background task must be defined at module scope, before the app renders.
import './src/lib/background';
import App from './App';
import { registerAndroidWidgets } from './src/widgets/android';

registerRootComponent(App);
// Android home-screen widgets are drawn by a background task that must be registered here.
registerAndroidWidgets();

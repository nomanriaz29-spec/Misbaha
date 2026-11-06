import { registerRootComponent } from 'expo';
// Background task must be defined at module scope, before the app renders.
import './src/lib/background';
import App from './App';

registerRootComponent(App);

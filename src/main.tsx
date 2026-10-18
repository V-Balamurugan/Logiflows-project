import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './services/serviceWorkerRegistration';
import { offlineSyncService } from './services/offlineSyncService';

// Register service worker with background sync trigger
registerServiceWorker(() => {
  offlineSyncService.triggerAutoSync();
});

createRoot(document.getElementById('root')!).render(<App />);

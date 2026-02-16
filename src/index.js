import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './theme/ThemeContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { storage } from './utils/storage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// Register service worker for caching media and static assets
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('Service worker registered successfully');
  },
  onUpdate: (registration) => {
    console.log('New service worker content available');
    if (window.confirm('New version available! Reload to update?')) {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    }
  }
});

// Migrate data from localStorage to IndexedDB on first load
const MIGRATION_FLAG = 'plex_storage_migrated';
if (!localStorage.getItem(MIGRATION_FLAG)) {
  console.log('First time with new storage system, migrating data...');
  storage.migrateFromLocalStorage().then(() => {
    localStorage.setItem(MIGRATION_FLAG, 'true');
    console.log('Migration completed successfully');
  }).catch((error) => {
    console.error('Migration failed:', error);
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

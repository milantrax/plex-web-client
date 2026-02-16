import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ThemeProvider } from './theme/ThemeContext';
// import { storage } from './utils/storage'; // Disabled during debugging

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// TEMPORARILY DISABLED - Service Worker causing reload loops
// TODO: Re-enable after debugging
console.log('[Service Worker] Disabled to prevent reload loops');

// Unregister any existing Service Workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('[Service Worker] Unregistered existing worker');
    });
  });
}

// serviceWorkerRegistration.register({
//   onSuccess: () => {
//     console.log('[Service Worker] Registered successfully');
//   },
//   onUpdate: (registration) => {
//     console.log('[Service Worker] New content available');
//   }
// });

// TEMPORARILY DISABLED - Migration causing issues
// TODO: Re-enable after debugging
console.log('[Migration] Disabled to prevent reload loops');

// Mark as migrated to skip migration attempts
localStorage.setItem('plex_storage_migrated', 'true');

// // Migrate data from localStorage to IndexedDB on first load
// const MIGRATION_FLAG = 'plex_storage_migrated';
// if (!localStorage.getItem(MIGRATION_FLAG)) {
//   console.log('First time with new storage system, migrating data...');
//   storage.migrateFromLocalStorage().then(() => {
//     localStorage.setItem(MIGRATION_FLAG, 'true');
//     console.log('Migration completed successfully');
//   }).catch((error) => {
//     console.error('Migration failed:', error);
//   });
// }

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

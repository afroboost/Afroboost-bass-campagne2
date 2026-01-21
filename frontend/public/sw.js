// Service Worker pour les notifications push Afroboost
// Ce fichier doit être à la racine du domaine (public/)

const CACHE_NAME = 'afroboost-v1';

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installé');
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activé');
  event.waitUntil(clients.claim());
});

// Réception des notifications push
self.addEventListener('push', (event) => {
  console.log('[SW] Notification push reçue');
  
  let data = {
    title: 'Afroboost',
    body: 'Vous avez un nouveau message',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {}
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[SW] Erreur parsing push data:', e);
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200], // Vibration pattern pour mobile
    tag: 'afroboost-notification', // Groupe les notifications
    renotify: true, // Notifie même si déjà une notification du même tag
    requireInteraction: false, // Se ferme automatiquement
    actions: [
      {
        action: 'open',
        title: 'Ouvrir'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ],
    data: data.data
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic sur notification');
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Ouvrir l'application ou focus sur la fenêtre existante
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, la focus
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Fermeture de la notification
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification fermée');
});

// Message du client (pour future use)
self.addEventListener('message', (event) => {
  console.log('[SW] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

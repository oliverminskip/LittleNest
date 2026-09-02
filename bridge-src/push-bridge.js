// Bundled into app/capacitor-bridge.js via `npm run build:bridge`.
// No-ops entirely on the web PWA - only does anything inside the Capacitor
// Android shell, where the FCM device token has to come through the native
// Push Notifications plugin rather than the browser Notification API.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

async function init() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const current = await PushNotifications.checkPermissions();
    let status = current.receive;
    if (status === 'prompt' || status === 'prompt-with-rationale') {
      const requested = await PushNotifications.requestPermissions();
      status = requested.receive;
    }
    if (status !== 'granted') return;

    PushNotifications.addListener('registration', token => {
      window.dispatchEvent(new CustomEvent('littlenest:push-token', { detail: token.value }));
    });
    PushNotifications.addListener('registrationError', err => {
      console.warn('LittleNest push registration error', err);
    });
    PushNotifications.addListener('pushNotificationReceived', notification => {
      window.dispatchEvent(new CustomEvent('littlenest:push-received', { detail: notification }));
    });
    PushNotifications.addListener('pushNotificationActionPerformed', action => {
      window.dispatchEvent(new CustomEvent('littlenest:push-tapped', { detail: action.notification }));
    });

    await PushNotifications.register();
  } catch (e) {
    console.warn('LittleNest push init failed', e);
  }
}

window.LittleNestPush = { init };

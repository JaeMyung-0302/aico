import { useState, useCallback } from 'react';
import api from '@/lib/api';

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const usePushSubscription = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.get('/briefings/vapid-key');
      if (!data.vapidPublicKey) {
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey) as unknown as ArrayBuffer,
      });

      await api.post('/users/me/push-subscription', { subscription });
      setIsSubscribed(true);
    } catch (error) {
      console.error('Push subscription failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      await api.delete('/users/me/push-subscription');
      setIsSubscribed(false);
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSubscribed, isLoading, subscribe, unsubscribe };
};

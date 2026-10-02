"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { supabase } from "@/lib/supabase";

type OneSignalSdk = {
  init: (options: { appId: string; allowLocalhostAsSecureOrigin?: boolean; notifyButton?: { enable: boolean } }) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  Notifications: { requestPermission: () => Promise<boolean> };
  User: { PushSubscription: { optIn: () => Promise<void> } };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(sdk: OneSignalSdk) => void>;
  }
}

export function requestOneSignalPermission(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!window.OneSignalDeferred) {
      reject(new Error("OneSignal SDK is not ready"));
      return;
    }
    window.OneSignalDeferred.push(async (sdk) => {
      try {
        const granted = await sdk.Notifications.requestPermission();
        if (granted) await sdk.User.PushSubscription.optIn();
        resolve(granted);
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function OneSignalProvider() {
  const userId = useRef<string | null>(null);
  const sdkRef = useRef<OneSignalSdk | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;
    let alive = true;

    const syncUser = async (id: string | null) => {
      userId.current = id;
      const sdk = sdkRef.current;
      if (!sdk || !alive) return;
      if (id) await sdk.login(id);
      else await sdk.logout();
    };

    supabase.auth.getSession().then(({ data }) => {
      void syncUser(data.session?.user.id ?? null);
    });
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user.id ?? null);
    });

    return () => {
      alive = false;
      auth.subscription.unsubscribe();
    };
  }, []);

  function initializeOneSignal() {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return;
    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push(async (sdk) => {
      await sdk.init({
        appId,
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV !== "production",
        notifyButton: { enable: false },
      });
      sdkRef.current = sdk;
      if (userId.current) await sdk.login(userId.current);
    });
  }

  if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return null;
  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
      onLoad={initializeOneSignal}
    />
  );
}

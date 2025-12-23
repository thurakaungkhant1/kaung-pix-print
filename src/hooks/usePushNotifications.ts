import { useCallback, useEffect, useRef } from "react";

const NOTIFICATIONS_ENABLED_KEY = "push_notifications_enabled";

export const usePushNotifications = () => {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");
      return true;
    }

    if (Notification.permission === "denied") {
      permissionRef.current = "denied";
      return false;
    }

    const permission = await Notification.requestPermission();
    permissionRef.current = permission;
    
    if (permission === "granted") {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");
      return true;
    }
    
    return false;
  }, []);

  const isEnabled = useCallback((): boolean => {
    const stored = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return stored === "true" && permissionRef.current === "granted";
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!("Notification" in window)) return;
    if (!isEnabled()) return;

    try {
      new Notification(title, {
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        ...options,
      });
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }, [isEnabled]);

  const notifyFriendRequest = useCallback((senderName: string) => {
    showNotification("New Friend Request", {
      body: `${senderName} wants to be your friend`,
      tag: "friend-request",
    });
  }, [showNotification]);

  const notifyNewMessage = useCallback((senderName: string, messagePreview?: string) => {
    showNotification(`Message from ${senderName}`, {
      body: messagePreview || "You have a new message",
      tag: "new-message",
    });
  }, [showNotification]);

  return {
    requestPermission,
    isEnabled,
    setEnabled,
    showNotification,
    notifyFriendRequest,
    notifyNewMessage,
    permission: permissionRef.current,
  };
};

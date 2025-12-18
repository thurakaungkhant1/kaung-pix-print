import { useCallback, useRef } from "react";

const NOTIFICATION_SOUNDS = {
  friendRequest: "/sounds/friend-request.mp3",
  message: "/sounds/message.mp3",
};

const SOUND_ENABLED_KEY = "chat_sound_notifications_enabled";

const isSoundEnabled = (): boolean => {
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? true : stored === "true";
};

export const useSoundNotification = () => {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  const playSound = useCallback((type: "friendRequest" | "message") => {
    // Check if sounds are enabled
    if (!isSoundEnabled()) {
      return;
    }

    try {
      // Create audio element if not exists
      if (!audioRefs.current[type]) {
        const audio = new Audio(NOTIFICATION_SOUNDS[type]);
        audio.volume = 0.5;
        audioRefs.current[type] = audio;
      }

      const audio = audioRefs.current[type];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Silently fail if autoplay is blocked
          console.log("Audio playback blocked by browser");
        });
      }
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  const playFriendRequestSound = useCallback(() => {
    playSound("friendRequest");
  }, [playSound]);

  const playMessageSound = useCallback(() => {
    playSound("message");
  }, [playSound]);

  return {
    playFriendRequestSound,
    playMessageSound,
  };
};

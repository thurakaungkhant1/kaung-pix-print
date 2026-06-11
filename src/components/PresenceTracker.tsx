import { useGlobalPresence } from "@/hooks/usePresence";

const PresenceTracker = () => {
  useGlobalPresence();
  return null;
};

export default PresenceTracker;

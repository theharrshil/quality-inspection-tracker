import { useEffect, useState } from "react";
import {
  pendingCount,
  pendingCreates,
  pendingResolveIds,
  subscribe,
} from "./offline";

// Subscribes the UI to online/offline transitions and the offline queue so
// components can overlay pending state.
export function useOffline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [, forceRender] = useState(0);

  useEffect(() => subscribe(() => forceRender((n) => n + 1)), []);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return {
    online,
    pendingCreates: pendingCreates(),
    pendingResolveIds: pendingResolveIds(),
    pendingCount: pendingCount(),
  };
}

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { flush, initOffline, setOnFlushed } from "../lib/offline";

// Mounted inside the authenticated shell. Loads the persisted queue, flushes it on
// startup and on every reconnect, and refreshes server queries after a flush.
export function OfflineSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    setOnFlushed(() => {
      void queryClient.invalidateQueries({ queryKey: ["inspections"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
    });

    void initOffline().then(() => {
      if (navigator.onLine) void flush();
    });

    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [queryClient]);

  return null;
}

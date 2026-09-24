import { useEffect } from "react";
import { toast } from "sonner";

export function useAutoRefreshPrompt<T>(
  currentItemsCount: number,
  fetchItems: () => Promise<T[]>,
  objectName: string,
  intervalMinutes: number = 15
) {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newData = await fetchItems();
        // Check if new data has more items than our currently loaded state
        if (newData.length > currentItemsCount) {
          toast(`New ${objectName} available!`, {
            description: `We detected new ${objectName}. Refresh the page to see them.`,
            action: {
              label: "Refresh Page",
              onClick: () => window.location.reload()
            },
            duration: 999999, // Prompt stays until dismissed or refreshed
          });
        }
      } catch (e) {
        // Silently fail if the ping fails so as not to bother the user
      }
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentItemsCount, fetchItems, objectName, intervalMinutes]);
}

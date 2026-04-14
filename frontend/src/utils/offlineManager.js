import toast from 'react-hot-toast';

const QUEUE_KEY = 'SADHANA_SYNC_QUEUE';

/**
 * Manages the offline queue for Sadhana reports
 */
export const offlineManager = {
    /**
     * Saves a report locally to the queue
     */
    savePendingLog: (dateStr, data) => {
        try {
            const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '{}');
            // Overwrite if entry for this date already exists locally
            queue[dateStr] = {
                data,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
            console.log(`[OfflineManager] Saved report for ${dateStr} locally.`);
        } catch (err) {
            console.error('[OfflineManager] Failed to save locally:', err);
        }
    },

    /**
     * Gets all pending logs from the queue
     */
    getPendingLogs: () => {
        try {
            return JSON.parse(localStorage.getItem(QUEUE_KEY) || '{}');
        } catch (err) {
            return {};
        }
    },

    /**
     * Clears a specific record from the queue
     */
    clearPendingLog: (dateStr) => {
        try {
            const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '{}');
            delete queue[dateStr];
            localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        } catch (err) {}
    },

    /**
     * Synchronizes all pending logs to the server
     * @param {Object} api Axios instance
     * @returns {Promise<number>} Number of successfully synced reports
     */
    syncPendingLogs: async (api) => {
        const queue = offlineManager.getPendingLogs();
        const dates = Object.keys(queue);
        
        if (dates.length === 0) return 0;

        console.log(`[OfflineManager] Attempting to sync ${dates.length} reports...`);
        let syncedCount = 0;

        for (const dateStr of dates) {
            try {
                const { data } = queue[dateStr];
                // Attempt to send to server
                await api.post('/sadhana', { ...data, date: dateStr });
                
                // Clear from local queue on success
                offlineManager.clearPendingLog(dateStr);
                syncedCount++;
                console.log(`[OfflineManager] Successfully synced ${dateStr}`);
            } catch (err) {
                // If it's a server error (400, 500), we probably shouldn't retry forever, 
                // but if it's a network error, we keep it in the queue.
                if (err.response) {
                    console.error(`[OfflineManager] Server rejected ${dateStr}:`, err.response.data);
                    // For now, keep it in queue so the user doesn't lose data, but inform them
                    toast.error(`Sync conflict for ${dateStr}: ${err.response.data.message || 'Error'}`);
                } else {
                    console.warn(`[OfflineManager] Network fail during sync for ${dateStr}. Stopping batch.`);
                    break; // Stop syncing for now, likely offline again
                }
            }
        }

        if (syncedCount > 0) {
            toast.success(`Synced ${syncedCount} offline reports! 🎉`);
        }

        return syncedCount;
    }
};

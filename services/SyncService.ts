import { db, getFromDB, setInDB } from '../utils/db';
import { SyncStatus } from '../types';

const TABLES_TO_SYNC = [
    'products',
    'categories',
    'sales',
    'customers',
    'purchaseOrders',
    'suppliers',
    'users',
    'shifts',
    'heldOrders',
    'inventoryAdjustments',
    'notifications'
];

interface SyncResponse {
    changes: Record<string, any[]>;
    deleted: Array<{ id: string; table: string }>;
    timestamp: string;
}

/**
 * SyncService
 * Handles synchronization between local Dexie DB and remote REST API.
 */
export class SyncService {
    private static instance: SyncService;
    private isSyncing: boolean = false;
    private workspaceId: string | null = null;
    private apiUrl: string | null = null;
    private apiKey: string | null = null;

    private constructor() {}

    public static getInstance(): SyncService {
        if (!SyncService.instance) {
            SyncService.instance = new SyncService();
        }
        return SyncService.instance;
    }

    public configure(workspaceId: string, apiUrl: string, apiKey: string) {
        this.workspaceId = workspaceId;
        this.apiUrl = apiUrl.replace(/\/$/, ""); // Remove trailing slash
        this.apiKey = apiKey;
    }

    private async getHeaders(): Promise<Headers> {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        if (this.apiKey) {
            headers.append('Authorization', `Bearer ${this.apiKey}`);
        }
        if (this.workspaceId) {
            headers.append('X-Workspace-ID', this.workspaceId);
        }
        return headers;
    }

    /**
     * Checks for local changes (sync_status === 'pending') and pushes them to the backend.
     */
    public async pushChanges(): Promise<{ success: boolean; message?: string }> {
        if (!navigator.onLine) return { success: false, message: 'Offline' };
        if (!this.apiUrl) return { success: false, message: 'API URL not configured' };
        if (this.isSyncing) return { success: false, message: 'Sync already in progress' };
        
        this.isSyncing = true;
        console.log('SyncService: pushing changes...');

        try {
            const payload: Record<string, any[]> = {};
            let hasChanges = false;

            // 1. Gather Created/Updated Records
            for (const table of TABLES_TO_SYNC) {
                // @ts-ignore
                const pendingRecords = await db[table].where('sync_status').equals('pending').toArray();
                if (pendingRecords.length > 0) {
                    payload[table] = pendingRecords;
                    hasChanges = true;
                }
            }

            // 2. Gather Deleted Records
            const pendingDeletions = await db.deletedRecords.where('sync_status').equals('pending').toArray();
            if (pendingDeletions.length > 0) {
                payload['deletedRecords'] = pendingDeletions;
                hasChanges = true;
            }

            if (!hasChanges) {
                this.isSyncing = false;
                return { success: true, message: 'No changes to push' };
            }

            // 3. Send to Backend
            const response = await fetch(`${this.apiUrl}/sync/push`, {
                method: 'POST',
                headers: await this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Sync failed: ${response.statusText}`);
            }

            // 4. Mark local records as synced on success
            await (db as any).transaction('rw', [...TABLES_TO_SYNC.map(t => (db as any)[t]), db.deletedRecords], async () => {
                for (const table of Object.keys(payload)) {
                    if (table === 'deletedRecords') {
                        // For deletions, we can remove them from the tombstone table once synced
                        // OR mark them synced if we want to keep history. Removing is cleaner for local storage.
                        const ids = payload[table].map((r: any) => r.id);
                        await db.deletedRecords.bulkDelete(ids);
                    } else {
                        const items = payload[table];
                        for (const item of items) {
                            // Update sync_status to 'synced'
                            // We use update to avoid overwriting newer changes if they happened during sync (race condition mitigation)
                            // Ideally, check if updated_at hasn't changed. For simplicity:
                            await (db as any)[table].update(item.id, { sync_status: 'synced' });
                        }
                    }
                }
            });

            return { success: true, message: 'Push successful' };

        } catch (error) {
            console.error('SyncService: Push failed', error);
            return { success: false, message: error instanceof Error ? error.message : 'Push failed' };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Pulls latest data from Backend.
     */
    public async pullChanges(): Promise<{ success: boolean; message?: string }> {
        if (!navigator.onLine) return { success: false, message: 'Offline' };
        if (!this.apiUrl) return { success: false, message: 'API URL not configured' };
        if (this.isSyncing) return { success: false, message: 'Sync already in progress' };

        this.isSyncing = true;
        console.log('SyncService: pulling changes...');

        try {
            const lastSyncKey = `ims-${this.workspaceId}-lastSync`;
            const lastSync = await getFromDB<string>(lastSyncKey) || new Date(0).toISOString();

            const response = await fetch(`${this.apiUrl}/sync/pull?last_sync=${lastSync}`, {
                method: 'GET',
                headers: await this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Pull failed: ${response.statusText}`);
            }

            const data: SyncResponse = await response.json();

            await (db as any).transaction('rw', [...TABLES_TO_SYNC.map(t => (db as any)[t])], async () => {
                // 1. Apply Changes/Inserts
                if (data.changes) {
                    for (const [table, records] of Object.entries(data.changes)) {
                        if (TABLES_TO_SYNC.includes(table) && Array.isArray(records)) {
                            // We use bulkPut to overwrite local data with server authority
                            // Ensure we mark them as synced so we don't push them back
                            const syncedRecords = records.map(r => ({ ...r, sync_status: 'synced' }));
                            await (db as any)[table].bulkPut(syncedRecords);
                        }
                    }
                }

                // 2. Apply Deletions
                if (data.deleted && Array.isArray(data.deleted)) {
                    for (const del of data.deleted) {
                        if (TABLES_TO_SYNC.includes(del.table)) {
                            await (db as any)[del.table].delete(del.id);
                        }
                    }
                }
            });

            // 3. Update Last Sync Timestamp
            if (data.timestamp) {
                await setInDB(lastSyncKey, data.timestamp);
            }

            return { success: true, message: 'Pull successful' };

        } catch (error) {
            console.error('SyncService: Pull failed', error);
            return { success: false, message: error instanceof Error ? error.message : 'Pull failed' };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Run full sync cycle (Push then Pull)
     */
    public async sync(): Promise<{ success: boolean; message?: string }> {
        const pushResult = await this.pushChanges();
        if (!pushResult.success && pushResult.message !== 'No changes to push') return pushResult;

        const pullResult = await this.pullChanges();
        return pullResult;
    }
}

export const syncService = SyncService.getInstance();
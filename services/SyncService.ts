
import { db } from '../utils/db';
import { SyncStatus } from '../types';

/**
 * SyncService
 * Handles synchronization between local Dexie DB and remote Supabase DB.
 */
export class SyncService {
    private static instance: SyncService;
    private isSyncing: boolean = false;

    private constructor() {}

    public static getInstance(): SyncService {
        if (!SyncService.instance) {
            SyncService.instance = new SyncService();
        }
        return SyncService.instance;
    }

    /**
     * Checks for local changes (sync_status === 'pending') and pushes them to Supabase.
     */
    public async pushChanges(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;

        console.log('SyncService: Checking for local changes to push...');

        try {
            // Example: Push pending sales
            const pendingSales = await db.sales.where('sync_status').equals('pending').toArray();
            if (pendingSales.length > 0) {
                console.log(`SyncService: Found ${pendingSales.length} pending sales.`);
                // TODO: Call Supabase insert/upsert
                // await supabase.from('sales').upsert(pendingSales);
                
                // On success, update local status
                // await db.sales.bulkPut(pendingSales.map(s => ({ ...s, sync_status: 'synced' })));
            }

            // Similar logic for products, customers, etc.

        } catch (error) {
            console.error('SyncService: Push failed', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Pulls latest data from Supabase based on `updated_at` timestamp.
     */
    public async pullChanges(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;

        console.log('SyncService: Checking for remote updates...');

        try {
            // TODO: Get last sync timestamp from local settings
            // const lastSync = ...

            // TODO: Call Supabase select
            // const { data } = await supabase.from('products').select('*').gt('updated_at', lastSync);
            
            // TODO: Update local DB
            // if (data) await db.products.bulkPut(data);

        } catch (error) {
            console.error('SyncService: Pull failed', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Initial full sync to bootstrap the device.
     */
    public async initialSync(): Promise<void> {
        await this.pullChanges();
        await this.pushChanges();
    }
}

export const syncService = SyncService.getInstance();

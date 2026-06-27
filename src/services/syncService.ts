import { getSupabaseClient } from './supabaseClient';
import storage from '../utils/storage';

const TABLE_MAP: Record<string, string> = {
    '@mathnote_sales': 'sales',
    '@mathnote_expenses': 'expenses',
    '@mathnote_credits': 'credits',
    '@mathnote_contacts': 'contacts',
    '@mathnote_products': 'products',
    '@mathnote_returns': 'returns',
    '@mathnote_purchases': 'purchases',
    '@mathnote_quotations': 'quotations',
    '@mathnote_purchase_orders': 'purchase_orders',
    '@mathnote_attendance': 'attendance',
    '@mathnote_users': 'users',
    '@mathnote_auth': 'business_profile',
};

const formatPayload = (obj: any): any => {
    if (!obj) return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => formatPayload(item));
    }
    const formatted = { ...obj };
    if ('createdAt' in formatted) {
        formatted.created_at = formatted.createdAt;
        delete formatted.createdAt;
    }
    if ('_synced' in formatted) {
        delete formatted._synced;
    }
    return formatted;
};

const parsePayload = (obj: any): any => {
    if (!obj) return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => parsePayload(item));
    }
    const parsed = { ...obj };
    if ('created_at' in parsed) {
        parsed.createdAt = parsed.created_at;
        delete parsed.created_at;
    }
    parsed._synced = true;
    return parsed;
};

export const syncService = {
    isPulling: false,
    pullNeeded: false,
    deletedIds: {} as Record<string, Set<string>>,

    async push(key: string, data: any) {
        if (this.isPulling) return;
        const client = getSupabaseClient();
        if (!client) return;
        const tableName = TABLE_MAP[key];
        if (!tableName) return;

        const payload = formatPayload(data);

        try {
            // Upsert based on ID (most models have an ID)
            if (Array.isArray(payload)) {
                const { error } = await client
                    .from(tableName)
                    .upsert(payload, { onConflict: 'id' });
                if (error) console.error(`[Sync] Error pushing ${tableName}:`, error);
            } else {
                // Settings or single object
                const { error } = await client
                    .from(tableName)
                    .upsert({ ...payload, id: 'global_' + tableName }, { onConflict: 'id' });
                if (error) console.error(`[Sync] Error pushing ${tableName}:`, error);
            }
        } catch (err) {
            console.error('[Sync] Push failed:', err);
        }
    },

    async delete(key: string, id: string) {
        const tableName = TABLE_MAP[key];
        if (!tableName) return;

        if (!this.deletedIds[tableName]) {
            this.deletedIds[tableName] = new Set();
        }
        this.deletedIds[tableName].add(id);

        const client = getSupabaseClient();
        if (!client) return;

        try {
            console.log(`[Sync] Deleting remote row from ${tableName} with id ${id}`);
            const { error } = await client
                .from(tableName)
                .delete()
                .eq('id', id);
            if (error) console.error(`[Sync] Error deleting remote row from ${tableName}:`, error);
        } catch (err) {
            console.error('[Sync] Delete failed:', err);
        }
    },

    async pullAll() {
        if (this.isPulling) {
            this.pullNeeded = true;
            console.log('[Sync] Pull already in progress, queuing next pull.');
            return;
        }
        const client = getSupabaseClient();
        if (!client) return;
        console.log('[Sync] Pulling all data...');
        this.isPulling = true;
        this.pullNeeded = false;

        try {
            for (const [storageKey, tableName] of Object.entries(TABLE_MAP)) {
                const { data: remoteData, error } = await client.from(tableName).select('*');
                if (!error && remoteData) {
                    const parsedRemoteData = parsePayload(remoteData);
                    
                    if (storageKey === '@mathnote_auth') {
                        const localAuth = await storage.get<any>(storageKey);
                        const remoteAuth = parsedRemoteData[0] || null;
                        
                        if (remoteAuth) {
                            await storage.set(storageKey, remoteAuth);
                        } else if (localAuth) {
                            console.log(`[Sync] Remote ${tableName} is empty, pushing local profile`);
                            await client
                                .from(tableName)
                                .upsert(formatPayload({ ...localAuth, id: 'global_' + tableName }), { onConflict: 'id' });
                        }
                    } else if (storageKey === '@mathnote_users') {
                        const localUsers = (await storage.get<any[]>(storageKey)) || [];
                        const remoteUsers = parsedRemoteData || [];
                        
                        const deletedSet = this.deletedIds[tableName] || new Set();
                        const filteredRemote = remoteUsers.filter((u: any) => !deletedSet.has(u.id));
                        const filteredLocal = localUsers.filter((u: any) => !deletedSet.has(u.id));

                        const mergedUsers = [...filteredRemote];
                        const usersToPush: any[] = [];
                        
                        for (const localU of filteredLocal) {
                            if (!filteredRemote.some((u: any) => u.id === localU.id)) {
                                if (localU._synced === true) {
                                    console.log(`[Sync] Discarding locally deleted user with id ${localU.id}`);
                                } else {
                                    mergedUsers.push(localU);
                                    usersToPush.push(localU);
                                }
                            }
                        }
                        
                        await storage.set(storageKey, mergedUsers);
                        if (usersToPush.length > 0) {
                            console.log(`[Sync] Pushing ${usersToPush.length} local users to remote`);
                            const { error } = await client.from(tableName).upsert(formatPayload(usersToPush), { onConflict: 'id' });
                            if (!error) {
                                const currentLocal = (await storage.get<any[]>(storageKey)) || [];
                                const updatedLocal = currentLocal.map(u => {
                                    if (usersToPush.some(p => p.id === u.id)) {
                                        return { ...u, _synced: true };
                                    }
                                    return u;
                                });
                                await storage.set(storageKey, updatedLocal);
                            }
                        }
                    } else {
                        const localArray = (await storage.get<any[]>(storageKey)) || [];
                        const remoteArray = parsedRemoteData || [];
                        
                        const deletedSet = this.deletedIds[tableName] || new Set();
                        const filteredRemote = remoteArray.filter((item: any) => !deletedSet.has(item.id));
                        const filteredLocal = localArray.filter((item: any) => !deletedSet.has(item.id));

                        const mergedArray = [...filteredRemote];
                        const itemsToPush: any[] = [];
                        
                        for (const localItem of filteredLocal) {
                            if (!filteredRemote.some((item: any) => item.id === localItem.id)) {
                                if (localItem._synced === true) {
                                    console.log(`[Sync] Discarding locally deleted item from ${tableName} with id ${localItem.id}`);
                                } else {
                                    mergedArray.push(localItem);
                                    itemsToPush.push(localItem);
                                }
                            }
                        }
                        
                        await storage.set(storageKey, mergedArray);
                        if (itemsToPush.length > 0) {
                            console.log(`[Sync] Pushing ${itemsToPush.length} local items to remote table ${tableName}`);
                            const { error } = await client.from(tableName).upsert(formatPayload(itemsToPush), { onConflict: 'id' });
                            if (!error) {
                                const currentLocal = (await storage.get<any[]>(storageKey)) || [];
                                const updatedLocal = currentLocal.map(item => {
                                    if (itemsToPush.some(p => p.id === item.id)) {
                                        return { ...item, _synced: true };
                                    }
                                    return item;
                                });
                                await storage.set(storageKey, updatedLocal);
                            }
                        }
                    }

                    if (storageKey === '@mathnote_users' || storageKey === '@mathnote_auth') {
                        window.dispatchEvent(new Event('mathnote_auth_updated'));
                    }
                }
            }
        } catch (err) {
            console.error('[Sync] PullAll failed:', err);
        } finally {
            this.isPulling = false;
            if (this.pullNeeded) {
                console.log('[Sync] Running queued pull...');
                this.pullAll();
            }
        }
    },

    subscribe(onUpdate: () => void) {
        const client = getSupabaseClient();
        if (!client) return () => { };

        const channels = Object.values(TABLE_MAP).map(table => {
            return client
                .channel(`public:${table}`)
                .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
                    console.log(`[Sync] Change detected in ${table}`);
                    this.pullAll().then(onUpdate);
                })
                .subscribe();
        });

        return () => {
            channels.forEach(channel => client.removeChannel(channel));
        };
    }
};



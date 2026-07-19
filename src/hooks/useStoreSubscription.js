import { useEffect } from 'react';
import { useStore } from '../lib/store';

export function useStoreSubscription(keys) {
    useEffect(() => {
        if (!keys || keys.length === 0) return;
        const store = useStore.getState();
        const unsubs = keys.map(key => {
            const methodName = `subscribeTo${key.charAt(0).toUpperCase()}${key.slice(1)}`;
            const subscribeFn = store[methodName];
            if (typeof subscribeFn === 'function') {
                return subscribeFn();
            } else {
                console.warn(`[useStoreSubscription] No subscription function found for key: "${key}" (expected "${methodName}")`);
                return null;
            }
        });

        return () => {
            unsubs.forEach(unsub => {
                if (typeof unsub === 'function') {
                    unsub();
                }
            });
        };
    }, [JSON.stringify(keys)]);
}

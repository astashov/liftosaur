import { useEffect, useState } from 'preact/hooks';
import { getOneRM, subscribeOneRM } from './oneRMStore';

export function useOneRM(exerciseKey: string) {
    const [state, setState] = useState(() => getOneRM(exerciseKey));
    useEffect(() => subscribeOneRM(exerciseKey, setState), [exerciseKey]);
    return state; // { max1RM, max1RMHistoryRecord, max1RMSet } | undefined
}
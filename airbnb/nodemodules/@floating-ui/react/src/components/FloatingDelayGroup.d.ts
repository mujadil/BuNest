import * as React from 'react';
import type { FloatingContext } from '../types';
type Delay = number | Partial<{
    open: number;
    close: number;
}>;
interface GroupState {
    delay: Delay;
    initialDelay: Delay;
    currentId: any;
    timeoutMs: number;
    isInstantPhase: boolean;
}
interface GroupContext extends GroupState {
    setCurrentId: React.Dispatch<React.SetStateAction<any>>;
    setState: React.Dispatch<Partial<GroupState>>;
}
export declare const useDelayGroupContext: () => GroupContext;
interface FloatingDelayGroupProps {
    children?: React.ReactNode;
    delay: Delay;
    timeoutMs?: number;
}
/**
 * Provides context for a group of floating elements that should share a
 * `delay`.
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 */
export declare const FloatingDelayGroup: ({ children, delay, timeoutMs, }: FloatingDelayGroupProps) => JSX.Element;
interface UseGroupOptions {
    id: any;
}
export declare const useDelayGroup: ({ open, onOpenChange }: FloatingContext, { id }: UseGroupOptions) => void;
export {};

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (type: ToastType, message: string) => void;
    hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timeoutsRef = useRef<Map<string, number>>(new Map());

    const hideToast = useCallback((id: string) => {
        const timeout = timeoutsRef.current.get(id);
        if (timeout) {
            window.clearTimeout(timeout);
            timeoutsRef.current.delete(id);
        }
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, message: string) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast: Toast = { id, type, message };

        setToasts((prev) => [...prev, newToast]);

        const duration = type === 'success' || type === 'info' ? 1000 : 2000;
        const timeout = window.setTimeout(() => {
            hideToast(id);
        }, duration);

        timeoutsRef.current.set(id, timeout);
    }, [hideToast]);

    const value: ToastContextType = {
        toasts,
        showToast,
        hideToast,
    };

    return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
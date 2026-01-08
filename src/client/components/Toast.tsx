import React from 'react';
import { useToast, Toast as ToastType } from '../contexts/ToastContext';

const ToastIcon: React.FC<{ type: ToastType['type'] }> = ({ type }) => {
    if (type === 'success') {
        return (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        );
    }

    if (type === 'error') {
        return (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        );
    }

    return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
};

const ToastItem: React.FC<{ toast: ToastType }> = ({ toast }) => {
    const { hideToast } = useToast();

    const handleClick = () => {
        hideToast(toast.id);
    };

    const getToastStyles = () => {
        const baseStyles = 'glass-blue-modal rounded-lg shadow-lg p-4 flex items-start gap-3 min-w-[320px] max-w-[500px] transition-all duration-300 cursor-pointer hover:scale-105';

        if (toast.type === 'success') {
            return `${baseStyles} border-l-4 border-green-400 text-blue-900 font-semibold`;
        }

        if (toast.type === 'error') {
            return `${baseStyles} border-l-4 border-red-400 text-blue-900 font-semibold`;
        }

        return `${baseStyles} border-l-4 border-blue-400 text-blue-900 font-semibold`;
    };

    const getIconColor = () => {
        if (toast.type === 'success') return 'text-green-400';
        if (toast.type === 'error') return 'text-red-400';
        return 'text-blue-400';
    };

    return (
        <div
            className={getToastStyles()}
            onClick={handleClick}
            role="button"
            tabIndex={0}
        >
            <div className={`flex-shrink-0 ${getIconColor()}`}>
                <ToastIcon type={toast.type} />
            </div>
            <div className="flex-1 whitespace-pre-line text-sm leading-relaxed text-center">
                {toast.message}
            </div>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts } = useToast();

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 p-4">
            <div className="flex flex-col gap-3 pointer-events-auto">
                {toasts.map((toast: ToastType) => (
                    <ToastItem key={toast.id} toast={toast} />
                ))}
            </div>
        </div>
    );
};

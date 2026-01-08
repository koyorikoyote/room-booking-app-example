import React from 'react';
import { Header } from './Header';

interface LayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showHeader = true }) => {
    return (
        <div className="min-h-screen flex flex-col">
            {showHeader && <Header />}
            <main className="flex-1 mobile-container py-4 sm:py-6 lg:py-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

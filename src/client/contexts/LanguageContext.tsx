import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { i18n } = useTranslation();
    const [language, setLanguageState] = useState<string>(() => {
        if (typeof window === 'undefined') return 'ja';
        return localStorage.getItem('language') || i18n.language || 'ja';
    });

    useEffect(() => {
        const savedLanguage = localStorage.getItem('language') || 'ja';
        if (i18n.language !== savedLanguage) {
            i18n.changeLanguage(savedLanguage);
        }
    }, [i18n]);

    useEffect(() => {
        const handleLanguageChange = (lng: string) => {
            setLanguageState(lng);
        };

        i18n.on('languageChanged', handleLanguageChange);

        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    const setLanguage = async (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('language', lang);
        setLanguageState(lang);

        const token = localStorage.getItem('token');
        if (token) {
            try {
                await fetch('/api/auth/language', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ language: lang }),
                });
            } catch (error) {
                console.error('Failed to update language preference:', error);
            }
        }
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormData {
    username: string;
    password: string;
}

interface LoginError {
    username?: string;
    password?: string;
    general?: string;
}

export const Login: React.FC = () => {
    const { t } = useTranslation();
    const { language, setLanguage } = useLanguage();
    const { login, isAuthenticated, isLoading: authLoading } = useAuth();

    // Remove /login from URL
    useEffect(() => {
        if (window.location.pathname === '/login') {
            window.history.replaceState({}, document.title, '/');
        }
    }, []);

    const [formData, setFormData] = useState<LoginFormData>({
        username: '',
        password: '',
    });

    const [errors, setErrors] = useState<LoginError>({});
    const [isLoading, setIsLoading] = useState(false);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    const validateForm = (): boolean => {
        const newErrors: LoginError = {};

        if (!formData.username.trim()) {
            newErrors.username = t('errors.required');
        }

        if (!formData.password) {
            newErrors.password = t('errors.required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success && data.data) {
                login(data.data.token, data.data.user);
            } else {
                setErrors({
                    general: data.error || t('auth.loginError'),
                });
            }
        } catch {
            setErrors({
                general: t('errors.networkError'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name as keyof LoginError]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined,
            }));
        }
    };

    const toggleLanguage = () => {
        const newLang = language === 'ja' ? 'en' : 'ja';
        setLanguage(newLang);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <button
                    onClick={toggleLanguage}
                    className="glass-blue-button text-white px-4 py-2 rounded-lg text-sm font-medium"
                    type="button"
                >
                    {language === 'ja' ? 'English' : '日本語'}
                </button>
            </div>

            <div className="glass-blue-card rounded-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-purple-900 mb-2">
                        {t('app.title')}
                    </h1>
                    <p className="text-purple-600 text-sm">
                        {t('auth.login')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-purple-900 text-sm font-medium mb-2">
                            {t('auth.username')}
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-lg bg-white border border-purple-300 text-black placeholder-purple-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                            placeholder={t('auth.username')}
                            disabled={isLoading}
                        />
                        {errors.username && (
                            <p className="mt-1 text-red-600 text-sm">{errors.username}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-purple-900 text-sm font-medium mb-2">
                            {t('auth.password')}
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-lg bg-white border border-purple-300 text-black placeholder-purple-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                            placeholder={t('auth.password')}
                            disabled={isLoading}
                        />
                        {errors.password && (
                            <p className="mt-1 text-red-600 text-sm">{errors.password}</p>
                        )}
                    </div>

                    {errors.general && (
                        <div className="bg-red-50 border border-red-400 p-3 rounded-lg">
                            <p className="text-red-700 text-sm text-center font-medium">{errors.general}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="glass-blue-button w-full py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? '...' : t('auth.loginButton')}
                    </button>
                </form>
            </div>
        </div>
    );
};

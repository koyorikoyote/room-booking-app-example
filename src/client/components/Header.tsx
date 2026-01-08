import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, Settings, LogOut, Globe, Users, Building2, DoorOpen, Calendar, Tablet } from 'lucide-react';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { language, setLanguage } = useLanguage();
    const { logout, user } = useAuth();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dropdownRef = useRef<any>(null);

    const isTabletMode = location.pathname === '/tablet-mode';
    const showBackButton = location.pathname !== '/' && location.pathname !== '/login' && !isTabletMode;

    const handleBack = () => {
        navigate('/');
    };

    const handleLanguageToggle = () => {
        const newLanguage = language === 'en' ? 'ja' : 'en';
        setLanguage(newLanguage);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
        setIsSettingsOpen(false);
    };

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleClickOutside = (event: any) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };

        if (isSettingsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSettingsOpen]);

    return (
        <header className="glass-blue-nav sticky top-0 z-50 safe-area-inset">
            <div className="mobile-container">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Back button */}
                    <div className="flex items-center w-24">
                        {showBackButton && (
                            <button
                                onClick={handleBack}
                                className="touch-target flex items-center justify-center text-purple-600 hover:text-purple-800 transition-colors rounded-lg hover:bg-purple-100 px-3 py-2"
                                aria-label={t('navigation.back')}
                            >
                                <ChevronLeft className="w-6 h-6" />
                                <span className="ml-1 text-sm font-medium hidden sm:inline">
                                    {t('navigation.back')}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Center: Application title */}
                    <div className="flex-1 flex justify-center">
                        <h1 className="text-purple-800 text-lg sm:text-xl font-bold text-center">
                            {t('app.title')}
                        </h1>
                    </div>

                    {/* Right: Settings dropdown */}
                    <div className="flex items-center justify-end w-24 relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="touch-target flex items-center justify-center text-purple-600 hover:text-purple-800 transition-colors rounded-lg hover:bg-purple-100 p-2"
                            aria-label={t('settings.menu')}
                        >
                            <Settings className="w-6 h-6" />
                        </button>

                        {isSettingsOpen && (
                            <div className="absolute right-0 top-full mt-2 w-52 settings-dropdown rounded-lg shadow-xl overflow-hidden">
                                <div className="py-1">
                                    {/* Language toggle */}
                                    <button
                                        onClick={handleLanguageToggle}
                                        className="w-full text-left px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 transition-colors flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-purple-600" />
                                            <span className="font-medium">{t('settings.language')}</span>
                                        </div>
                                        <span className="text-purple-600 font-semibold">
                                            {language === 'en' ? 'English' : '日本語'}
                                        </span>
                                    </button>

                                    {/* Tablet Mode Toggle */}
                                    <div className="border-t border-purple-200"></div>
                                    <button
                                        onClick={() => {
                                            setIsSettingsOpen(false);
                                            if (isTabletMode) {
                                                navigate('/');
                                            } else {
                                                navigate('/tablet-mode');
                                            }
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 transition-colors flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Tablet className="w-4 h-4 text-purple-600" />
                                            <span className="font-medium">{t('settings.tabletMode')}</span>
                                        </div>
                                        <div className={`w-10 h-5 rounded-full transition-colors ${isTabletMode ? 'bg-purple-600' : 'bg-gray-300'} relative`}>
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isTabletMode ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                                        </div>
                                    </button>

                                    {/* Admin Management Options - Only show for admin users (level 3) */}
                                    {user && user.role?.level === 3 && (
                                        <>
                                            <div className="border-t border-purple-200"></div>
                                            <button
                                                onClick={() => {
                                                    setIsSettingsOpen(false);
                                                    navigate('/user-management');
                                                }}
                                                className="w-full text-left px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-2"
                                            >
                                                <Users className="w-4 h-4 text-purple-600" />
                                                <span className="font-medium">{t('userManagement.title')}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsSettingsOpen(false);
                                                    navigate('/department-management');
                                                }}
                                                className="w-full text-left px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-2"
                                            >
                                                <Building2 className="w-4 h-4 text-purple-600" />
                                                <span className="font-medium">{t('departmentManagement.title')}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsSettingsOpen(false);
                                                    navigate('/room-management');
                                                }}
                                                className="w-full text-left px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-2"
                                            >
                                                <DoorOpen className="w-4 h-4 text-purple-600" />
                                                <span className="font-medium">{t('roomManagement.title')}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsSettingsOpen(false);
                                                    navigate('/booking-management');
                                                }}
                                                className="w-full text-left px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-2"
                                            >
                                                <Calendar className="w-4 h-4 text-purple-600" />
                                                <span className="font-medium">{t('bookingManagement.title')}</span>
                                            </button>
                                        </>
                                    )}

                                    {/* Logout button */}
                                    <div className="border-t border-purple-200">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="font-medium">{t('settings.logout')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

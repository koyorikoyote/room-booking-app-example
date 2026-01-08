import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { FloorPlan } from './components/FloorPlan';
import { RoomCalendar } from './components/RoomCalendar';
import { TabletMode } from './pages/TabletMode';
import { UserManagement } from './pages/UserManagement';
import { DepartmentManagement } from './pages/DepartmentManagement';
import { RoomManagement } from './pages/RoomManagement';
import { BookingManagement } from './pages/BookingManagement';
import { ToastContainer } from './components/Toast';
import './styles/index.css';

const FloorPlanPage: React.FC = () => {
    return (
        <Layout>
            <FloorPlan />
        </Layout>
    );
};

const RoomCalendarPage: React.FC = () => {
    return (
        <Layout>
            <RoomCalendar />
        </Layout>
    );
};

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <AuthProvider>
                <ToastProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <FloorPlanPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/room/:roomId"
                            element={
                                <ProtectedRoute>
                                    <RoomCalendarPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/tablet-mode"
                            element={
                                <ProtectedRoute>
                                    <TabletMode />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/user-management"
                            element={
                                <ProtectedRoute>
                                    <UserManagement />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/department-management"
                            element={
                                <ProtectedRoute>
                                    <DepartmentManagement />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/room-management"
                            element={
                                <ProtectedRoute>
                                    <RoomManagement />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/booking-management"
                            element={
                                <ProtectedRoute>
                                    <BookingManagement />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <ToastContainer />
                </ToastProvider>
            </AuthProvider>
        </LanguageProvider>
    );
};

export default App;

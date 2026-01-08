import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Header } from '../components/Header';

interface Room {
    id: number;
    code: string;
    name: string;
}

interface RoomStatus {
    id: number;
    code: string;
    name: string;
    isInUse: boolean;
    currentBooking: {
        startTime: string;
        endTime: string;
        department: string;
    } | null;
}

export const TabletMode: React.FC = () => {
    const { t } = useTranslation();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
    const [isFooterOpen, setIsFooterOpen] = useState(false);

    const fetchRooms = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/rooms', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const sortedRooms = data.data.sort((a: Room, b: Room) => a.code.localeCompare(b.code));
                    setRooms(sortedRooms);
                    if (sortedRooms.length > 0 && !selectedRoomId) {
                        setSelectedRoomId(sortedRooms[0].id);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
        }
    }, [selectedRoomId]);

    const fetchRoomStatus = useCallback(async () => {
        if (!selectedRoomId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/rooms/status', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const status = data.data.find((s: RoomStatus) => s.id === selectedRoomId);
                    setRoomStatus(status || null);
                }
            }
        } catch (error) {
            console.error('Error fetching room status:', error);
        }
    }, [selectedRoomId]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    useEffect(() => {
        if (selectedRoomId) {
            fetchRoomStatus();
            const interval = window.setInterval(fetchRoomStatus, 60000);
            return () => window.clearInterval(interval);
        }
    }, [selectedRoomId, fetchRoomStatus]);

    const selectedRoom = rooms.find(r => r.id === selectedRoomId);
    const isInUse = roomStatus?.isInUse || false;

    return (
        <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col overflow-hidden">
            <Header />
            <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden pointer-events-none">
                {selectedRoom ? (
                    <div className="w-full h-full max-w-4xl max-h-full flex items-center justify-center">
                        <svg
                            viewBox="0 0 500 320"
                            className="w-full h-full max-h-[calc(100vh-12rem)] select-none pointer-events-none"
                            xmlns="http://www.w3.org/2000/svg"
                            preserveAspectRatio="xMidYMid meet"
                        >
                            <g className="pointer-events-none">
                                <rect
                                    x="40"
                                    y="30"
                                    width="420"
                                    height="260"
                                    fill={isInUse ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)"}
                                    stroke={isInUse ? "rgba(239, 68, 68, 0.6)" : "rgba(59, 130, 246, 0.6)"}
                                    strokeWidth="4"
                                    rx="8"
                                    className="transition-all duration-300"
                                />

                                <text
                                    x="250"
                                    y="90"
                                    textAnchor="middle"
                                    fill="rgba(30, 58, 138, 0.9)"
                                    fontSize="36"
                                    fontWeight="700"
                                    className="pointer-events-none select-none"
                                >
                                    {t(`rooms.conferenceRoom${selectedRoom.code}`)}
                                </text>

                                {isInUse && roomStatus?.currentBooking && (
                                    <>
                                        <text
                                            x="250"
                                            y="130"
                                            textAnchor="middle"
                                            fill="rgba(30, 58, 138, 0.85)"
                                            fontSize="28"
                                            fontWeight="600"
                                            className="pointer-events-none select-none"
                                        >
                                            {roomStatus.currentBooking.department}
                                        </text>

                                        <text
                                            x="250"
                                            y="170"
                                            textAnchor="middle"
                                            fill="rgba(30, 58, 138, 0.8)"
                                            fontSize="26"
                                            fontWeight="500"
                                            className="pointer-events-none select-none"
                                        >
                                            {roomStatus.currentBooking.startTime}
                                        </text>

                                        <text
                                            x="241"
                                            y="201"
                                            textAnchor="middle"
                                            fill="rgba(30, 58, 138, 0.7)"
                                            fontSize="28"
                                            fontWeight="400"
                                            className="pointer-events-none select-none"
                                            transform="rotate(90 250 195)"
                                        >
                                            ~
                                        </text>

                                        <text
                                            x="250"
                                            y="220"
                                            textAnchor="middle"
                                            fill="rgba(30, 58, 138, 0.8)"
                                            fontSize="26"
                                            fontWeight="500"
                                            className="pointer-events-none select-none"
                                        >
                                            {roomStatus.currentBooking.endTime}
                                        </text>
                                    </>
                                )}

                                <text
                                    x="250"
                                    y="260"
                                    textAnchor="middle"
                                    fill={isInUse ? "rgba(185, 28, 28, 0.9)" : "rgba(21, 128, 61, 0.9)"}
                                    fontSize="32"
                                    fontWeight="700"
                                    className="pointer-events-none select-none"
                                >
                                    {isInUse ? t('rooms.inUse') : t('rooms.available')}
                                </text>
                            </g>
                        </svg>
                    </div>
                ) : (
                    <div className="flex items-center justify-center">
                        <p className="text-purple-600 text-2xl">{t('calendar.loading')}</p>
                    </div>
                )}
            </div>

            <div
                className={`glass-blue-card transition-all duration-300 flex-shrink-0 ${isFooterOpen ? 'h-28' : 'h-10'
                    }`}
            >
                <div className="flex flex-col h-full pointer-events-auto">
                    <button
                        onClick={() => setIsFooterOpen(!isFooterOpen)}
                        className="flex items-center justify-center py-1.5 text-purple-600 hover:text-purple-800 transition-colors touch-target"
                    >
                        {isFooterOpen ? (
                            <ChevronDown className="w-5 h-5" />
                        ) : (
                            <ChevronUp className="w-5 h-5" />
                        )}
                    </button>

                    {isFooterOpen && (
                        <div className="flex-1 px-4 pb-3">
                            <label className="block text-purple-900 text-xs font-semibold mb-1.5">
                                {t('tablet.selectRoom')}
                            </label>
                            <select
                                value={selectedRoomId || ''}
                                onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                                className="w-full bg-white border-2 border-purple-300 text-purple-900 rounded-lg px-3 py-2 text-base font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                            >
                                {rooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                        {t(`rooms.conferenceRoom${room.code}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

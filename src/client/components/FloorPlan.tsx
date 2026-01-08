import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Room {
    id: string;
    code: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
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

const roomLayout: Record<string, { x: number; y: number; width: number; height: number }> = {
    'A': { x: 50, y: 50, width: 180, height: 120 },
    'B': { x: 270, y: 50, width: 180, height: 120 },
    'C': { x: 460, y: 128, width: 180, height: 120 },
    'D': { x: 306, y: 234, width: 180, height: 120 },
};

export const FloorPlan: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [roomStatuses, setRoomStatuses] = useState<Record<string, RoomStatus>>({});
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const fetchRooms = async () => {
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
                        const roomsWithLayout = data.data.map((room: { id: number; code: string; name: string }) => ({
                            id: room.id.toString(),
                            code: room.code,
                            name: room.name,
                            ...roomLayout[room.code]
                        }));
                        setRooms(roomsWithLayout);
                    }
                }
            } catch (error) {
                console.error('Error fetching rooms:', error);
            }
        };

        const fetchRoomStatuses = async () => {
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
                        const statusMap: Record<string, RoomStatus> = {};
                        data.data.forEach((status: RoomStatus) => {
                            statusMap[status.code] = status;
                        });
                        setRoomStatuses(statusMap);
                    }
                }
            } catch (error) {
                console.error('Error fetching room statuses:', error);
            }
        };

        fetchRooms();
        fetchRoomStatuses();
        const interval = window.setInterval(fetchRoomStatuses, 60000);

        return () => window.clearInterval(interval);
    }, []);

    const handleRoomClick = (roomId: string) => {
        navigate(`/room/${roomId}`);
    };

    const renderMobileLayout = () => {
        const mobileRoomOrder = ['A', 'B', 'C', 'D'];
        const sortedRooms = [...rooms].sort((a, b) =>
            mobileRoomOrder.indexOf(a.code) - mobileRoomOrder.indexOf(b.code)
        );

        return (
            <div className="flex flex-col gap-3 w-full">
                {sortedRooms.map((room) => {
                    const status = roomStatuses[room.code];
                    const isInUse = status?.isInUse || false;

                    return (
                        <div
                            key={room.id}
                            className="w-full cursor-pointer"
                            onClick={() => handleRoomClick(room.id)}
                        >
                            <svg
                                viewBox="0 0 200 110"
                                className="w-full h-auto select-none"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ touchAction: 'manipulation' }}
                            >
                                <g className="glass-blue-glow transition-all duration-300">
                                    <rect
                                        x="10"
                                        y="10"
                                        width="180"
                                        height="90"
                                        fill={isInUse ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)"}
                                        stroke={isInUse ? "rgba(239, 68, 68, 0.6)" : "rgba(59, 130, 246, 0.6)"}
                                        strokeWidth="2"
                                        rx="4"
                                        className="transition-all duration-300"
                                    />
                                    <text
                                        x="100"
                                        y="48"
                                        textAnchor="middle"
                                        fill="rgba(30, 58, 138, 0.9)"
                                        fontSize="16"
                                        fontWeight="600"
                                        className="pointer-events-none select-none"
                                    >
                                        {t(`rooms.conferenceRoom${room.code}`)}
                                    </text>
                                    <text
                                        x="100"
                                        y="70"
                                        textAnchor="middle"
                                        fill={isInUse ? "rgba(185, 28, 28, 0.9)" : "rgba(21, 128, 61, 0.9)"}
                                        fontSize="13"
                                        fontWeight="600"
                                        className="pointer-events-none select-none"
                                    >
                                        {isInUse ? t('rooms.inUse') : t('rooms.available')}
                                    </text>
                                    <rect
                                        x="85"
                                        y="98"
                                        width="30"
                                        height="3"
                                        fill="rgba(255, 255, 255, 0.4)"
                                        rx="1.5"
                                    />
                                </g>
                            </svg>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDesktopLayout = () => (
        <div className="w-full max-w-4xl mx-auto touch-target relative pb-12">
            <svg
                viewBox="0 25 640 450"
                className="w-full h-auto select-none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ touchAction: 'manipulation' }}
            >
                <rect
                    x="20"
                    y="20"
                    width="580"
                    height="340"
                    fill="rgba(255, 255, 255, 0.05)"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="2"
                    rx="8"
                />
                <rect
                    x="20"
                    y="180"
                    width="580"
                    height="40"
                    fill="rgba(255, 255, 255, 0.1)"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1"
                />
                <rect
                    x="240"
                    y="20"
                    width="40"
                    height="340"
                    fill="rgba(255, 255, 255, 0.1)"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1"
                />
                {rooms.map((room) => {
                    const status = roomStatuses[room.code];
                    const isInUse = status?.isInUse || false;
                    const isRotated = room.code === 'C' || room.code === 'D';

                    return (
                        <g
                            key={room.id}
                            className="cursor-pointer glass-blue-glow transition-all duration-300"
                            onClick={() => handleRoomClick(room.id)}
                        >
                            <rect
                                x={room.x}
                                y={room.y}
                                width={room.width}
                                height={room.height}
                                fill={isInUse ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)"}
                                stroke={isInUse ? "rgba(239, 68, 68, 0.6)" : "rgba(59, 130, 246, 0.6)"}
                                strokeWidth="2"
                                rx="4"
                                className="transition-all duration-300 hover:fill-[rgba(59,130,246,0.3)] hover:stroke-[rgba(59,130,246,0.8)]"
                                transform={isRotated ? `rotate(-90 ${room.x + room.width / 2} ${room.y + room.height / 2})` : undefined}
                            />
                            <text
                                x={room.x + room.width / 2}
                                y={room.y + room.height / 2 - 5}
                                textAnchor="middle"
                                fill="rgba(30, 58, 138, 0.9)"
                                fontSize="16"
                                fontWeight="600"
                                className="pointer-events-none select-none"
                            >
                                {t(`rooms.conferenceRoom${room.code}`)}
                            </text>
                            <text
                                x={room.x + room.width / 2}
                                y={room.y + room.height / 2 + 15}
                                textAnchor="middle"
                                fill={isInUse ? "rgba(185, 28, 28, 0.9)" : "rgba(21, 128, 61, 0.9)"}
                                fontSize="12"
                                fontWeight="600"
                                className="pointer-events-none select-none"
                            >
                                {isInUse ? t('rooms.inUse') : t('rooms.available')}
                            </text>
                            <rect
                                x={room.x + room.width / 2 - 15}
                                y={isRotated ? room.y - 2 : room.y + room.height - 2}
                                width={30}
                                height={4}
                                fill="rgba(255, 255, 255, 0.4)"
                                rx="2"
                                transform={isRotated ? `rotate(-90 ${room.x + room.width / 2} ${room.y + room.height / 2})` : undefined}
                            />
                        </g>
                    );
                })}
            </svg>
            <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2" style={{ top: '80%' }}>
                <p className="text-purple-700 text-xs font-medium mb-0.5">{t('rooms.entrance')}</p>
                <div className="w-12 h-1 bg-blue-500 rounded"></div>
            </div>
            <div className="flex flex-col items-center absolute" style={{ top: '32%', left: '1%', transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
                <p className="text-purple-700 text-xs font-medium mb-0.5">{t('rooms.entrance')}</p>
                <div className="w-12 h-1 bg-blue-500 rounded"></div>
            </div>
            <p className="text-purple-600 text-sm text-center absolute left-1/2 -translate-x-1/2" style={{ top: '90%' }}>
                {t('rooms.selectRoom')}
            </p>
        </div>
    );

    return (
        <div className="flex flex-col items-center p-1 sm:p-2">
            <div className="glass-blue-card rounded-2xl p-3 sm:p-4 w-full max-w-5xl">
                {rooms.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-purple-600">{t('calendar.loading')}</p>
                    </div>
                ) : (
                    isMobile ? renderMobileLayout() : renderDesktopLayout()
                )}
            </div>
        </div>
    );
};

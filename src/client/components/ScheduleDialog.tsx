import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface Booking {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    userId: number;
    isRecurring?: boolean;
    is_recurring?: boolean;
    recurringDays?: string[] | null;
    recurring_days?: string[] | null;
    parentId?: number | null;
    parent_id?: number | null;
    department: {
        name: string;
    };
    room?: {
        code: string;
        name: string;
    };
}

interface TimeSlot {
    hour: number;
    minute: number;
    label: string;
}

interface ScheduleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    viewingDate: Date;
    viewingDateBookings: Booking[];
    roomName: string;
    currentUserId: number | null;
    monthNames: string[];
    timeSlots: TimeSlot[];
    isPastDate: (date: Date) => boolean;
    getBookingPosition: (startTime: string, endTime: string) => { top: string; height: string };
    getColorForBooking: (booking: Booking) => string;
    handleScheduleBookingClick: (booking: Booking, date: Date) => void;
    handleScheduleEmptySlotClick: (clickedTime?: string) => void;
}

export const ScheduleDialog: React.FC<ScheduleDialogProps> = ({
    isOpen,
    onClose,
    viewingDate,
    viewingDateBookings,
    roomName,
    currentUserId,
    monthNames,
    timeSlots,
    isPastDate,
    getBookingPosition,
    getColorForBooking,
    handleScheduleBookingClick,
    handleScheduleEmptySlotClick,
}) => {
    const { t, i18n } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-blue-modal rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-purple-900 text-lg font-bold">
                                {t('calendar.daySchedule')}
                            </h3>
                            {viewingDateBookings.length === 0 && (
                                <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                                    {t('calendar.empty')}
                                </span>
                            )}
                        </div>
                        <p className="text-purple-700 text-sm">
                            {i18n.language === 'ja'
                                ? `${viewingDate.getFullYear()}年${viewingDate.getMonth() + 1}月${viewingDate.getDate()}日`
                                : `${monthNames[viewingDate.getMonth()]} ${viewingDate.getDate()}, ${viewingDate.getFullYear()}`
                            }
                        </p>
                        {roomName && (
                            <p className="text-purple-600 text-sm mt-1">
                                {roomName.includes('Conference Room A') ? t('rooms.conferenceRoomA') :
                                    roomName.includes('Conference Room B') ? t('rooms.conferenceRoomB') :
                                        roomName.includes('Conference Room C') ? t('rooms.conferenceRoomC') :
                                            roomName.includes('Conference Room D') ? t('rooms.conferenceRoomD') :
                                                roomName}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-purple-600 hover:text-purple-900 hover:bg-purple-100 rounded-lg p-1 transition-colors flex-shrink-0"
                        aria-label="Close schedule"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative">
                    <div className="space-y-0 border-l-2 border-purple-200 pl-14">
                        {timeSlots.map((slot, idx) => (
                            <div
                                key={idx}
                                className={`relative h-16 border-b border-purple-100 transition-colors ${idx % 2 === 0 ? 'bg-purple-50/30' : 'bg-white/50'} ${!isPastDate(viewingDate) ? 'hover:bg-purple-200/70 cursor-pointer' : ''}`}
                                onClick={() => !isPastDate(viewingDate) && handleScheduleEmptySlotClick(slot.label)}
                            >
                                <div className="absolute -left-14 top-0 text-xs text-purple-600 w-12 text-right pr-2">
                                    {slot.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {viewingDateBookings.length > 0 && (
                        <div className="absolute inset-0 left-14 pointer-events-none">
                            {viewingDateBookings.map((booking) => {
                                const position = getBookingPosition(
                                    booking.startTime,
                                    booking.endTime
                                );
                                const colorClass = getColorForBooking(booking);
                                const isOwnBooking = currentUserId === booking.userId;

                                return (
                                    <div
                                        key={booking.id}
                                        className={`absolute left-2 right-2 rounded-lg border-2 px-2 py-0.5 pointer-events-auto flex items-center justify-between gap-2 overflow-hidden transition-all ${colorClass} ${isOwnBooking && !isPastDate(viewingDate)
                                            ? 'cursor-pointer hover:shadow-lg'
                                            : ''
                                            }`}
                                        style={{
                                            top: position.top,
                                            height: position.height,
                                        }}
                                        onClick={() => {
                                            if (isOwnBooking && !isPastDate(viewingDate)) {
                                                handleScheduleBookingClick(booking, viewingDate);
                                            }
                                        }}
                                    >
                                        <span className="text-xs font-semibold text-purple-900 whitespace-nowrap">
                                            {booking.startTime} - {booking.endTime}
                                        </span>
                                        <span className="text-xs text-purple-700 truncate">
                                            {booking.department.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

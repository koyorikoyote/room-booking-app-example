import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BookingFormDialog } from './BookingFormDialog';
import { ScheduleDialog } from './ScheduleDialog';

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

interface CalendarDate {
    date: Date;
    bookings: Booking[];
    isCurrentMonth: boolean;
}

interface TimeSlot {
    hour: number;
    minute: number;
    label: string;
}

export const RoomCalendar: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const { t, i18n } = useTranslation();
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedBookingId, setSelectedBookingId] = useState<number | undefined>(undefined);
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [selectedStartTime, setSelectedStartTime] = useState<string | undefined>(undefined);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [viewingDate, setViewingDate] = useState<Date | null>(null);
    const [roomName, setRoomName] = useState<string>('');
    const [isMobile, setIsMobile] = useState(false);

    const monthNames = [
        t('months.january'),
        t('months.february'),
        t('months.march'),
        t('months.april'),
        t('months.may'),
        t('months.june'),
        t('months.july'),
        t('months.august'),
        t('months.september'),
        t('months.october'),
        t('months.november'),
        t('months.december'),
    ];

    const fetchBookings = useCallback(async () => {
        if (!roomId) return;

        setLoading(true);
        try {
            const startDate = new Date(currentYear, currentMonth, 1);
            const endDate = new Date(currentYear, currentMonth + 1, 0);

            const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

            const token = localStorage.getItem('token');
            const response = await fetch(
                `/api/bookings?roomId=${roomId}&startDate=${startDateStr}&endDate=${endDateStr}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                const fetchedBookings = data.data || [];
                const expandedBookings = expandRecurringBookings(fetchedBookings, startDate, endDate);
                setBookings(expandedBookings);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    }, [roomId, currentYear, currentMonth]);

    const expandRecurringBookings = (bookings: Booking[], startDate: Date, endDate: Date): Booking[] => {
        const expanded: Booking[] = [];
        const dayMap: { [key: string]: number } = {
            'sunday': 0, 'sun': 0,
            'monday': 1, 'mon': 1,
            'tuesday': 2, 'tue': 2,
            'wednesday': 3, 'wed': 3,
            'thursday': 4, 'thu': 4,
            'friday': 5, 'fri': 5,
            'saturday': 6, 'sat': 6
        };

        const existingBookingDates = new Map<number, Set<string>>();
        bookings.forEach((booking) => {
            const dateStr = typeof booking.date === 'string' ? booking.date.split('T')[0] : booking.date;
            const parentBookingId = booking.parentId || booking.parent_id || booking.id;

            if (!existingBookingDates.has(parentBookingId)) {
                existingBookingDates.set(parentBookingId, new Set());
            }
            existingBookingDates.get(parentBookingId)!.add(dateStr);
        });

        bookings.forEach((booking) => {
            expanded.push(booking);

            const hasParent = booking.parentId || booking.parent_id;
            if (hasParent) {
                return;
            }

            const isRecurring = booking.isRecurring || booking.is_recurring || false;
            const recurringDays = booking.recurringDays || booking.recurring_days || null;

            if (isRecurring && recurringDays && recurringDays.length > 0) {
                const bookingDate = new Date(booking.date);
                const recurringDayNumbers = recurringDays.map(day => dayMap[day.toLowerCase()]).filter(d => d !== undefined);

                const searchStart = bookingDate > startDate ? bookingDate : startDate;
                let currentDate = new Date(searchStart);
                currentDate.setDate(currentDate.getDate() + 1);

                const existingDatesForThisBooking = existingBookingDates.get(booking.id) || new Set();

                while (currentDate <= endDate) {
                    const dayOfWeek = currentDate.getDay();

                    if (recurringDayNumbers.includes(dayOfWeek)) {
                        const dateStr = currentDate.toISOString().split('T')[0];

                        if (!existingDatesForThisBooking.has(dateStr)) {
                            const newBooking = {
                                ...booking,
                                id: booking.id * 10000 + currentDate.getDate() * 100 + (currentDate.getMonth() + 1),
                                date: dateStr,
                                parentId: booking.id,
                            };
                            expanded.push(newBooking);
                        }
                    }

                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
        });

        return expanded;
    };

    const fetchCurrentUser = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/auth/me', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentUserId(data.data.id);
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    }, []);

    const fetchRoomName = useCallback(async () => {
        if (!roomId) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/rooms/${roomId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setRoomName(data.data.name);
            }
        } catch (error) {
            console.error('Error fetching room:', error);
        }
    }, [roomId]);

    useEffect(() => {
        fetchCurrentUser();
        fetchRoomName();
        fetchBookings();
    }, [fetchCurrentUser, fetchRoomName, fetchBookings]);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const getBookingsForDate = (date: Date): Booking[] => {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const filtered = bookings.filter((booking) => {
            const bookingDateStr = typeof booking.date === 'string'
                ? booking.date.split('T')[0]
                : booking.date;
            return bookingDateStr === dateStr;
        });
        return filtered;
    };

    const getDaysInMonth = (year: number, month: number): CalendarDate[] => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: CalendarDate[] = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            const prevMonthDate = new Date(year, month, -startingDayOfWeek + i + 1);
            days.push({
                date: prevMonthDate,
                bookings: [],
                isCurrentMonth: false,
            });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            days.push({
                date,
                bookings: getBookingsForDate(date),
                isCurrentMonth: true,
            });
        }

        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const nextMonthDate = new Date(year, month + 1, i);
            days.push({
                date: nextMonthDate,
                bookings: [],
                isCurrentMonth: false,
            });
        }

        return days;
    };

    const isPastDate = (date: Date): boolean => {
        const todayJST = new Date();
        todayJST.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return compareDate < todayJST;
    };

    const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
        if (!isCurrentMonth) return;
        setViewingDate(date);
    };

    const handleScheduleBookingClick = (booking: Booking, date: Date) => {
        if (currentUserId !== booking.userId) {
            return;
        }

        setSelectedDate(date);
        setSelectedBookingId(booking.id);
        setShowBookingForm(true);
    };

    const handleScheduleEmptySlotClick = (clickedTime?: string) => {
        if (!viewingDate || isPastDate(viewingDate)) return;

        setSelectedDate(viewingDate);
        setSelectedBookingId(undefined);
        setSelectedStartTime(clickedTime);
        setShowBookingForm(true);
    };

    const handleCloseBookingForm = () => {
        setShowBookingForm(false);
        setSelectedDate(null);
        setSelectedBookingId(undefined);
        setSelectedStartTime(undefined);
    };

    const handlePreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((prev) => prev - 1);
        } else {
            setCurrentMonth((prev) => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((prev) => prev + 1);
        } else {
            setCurrentMonth((prev) => prev + 1);
        }
    };

    const formatDate = (date: Date): string => {
        if (i18n.language === 'ja') {
            return `${date.getDate()}`;
        }
        return `${date.getDate()}`;
    };

    const generateTimeSlots = (): TimeSlot[] => {
        const slots: TimeSlot[] = [];
        for (let hour = 8; hour <= 20; hour++) {
            slots.push({
                hour,
                minute: 0,
                label: `${String(hour).padStart(2, '0')}:00`,
            });
        }
        return slots;
    };

    const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const getBookingPosition = (startTime: string, endTime: string) => {
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        const workDayStart = 8 * 60;
        const slotHeightPx = 64;
        const minutesPerSlot = 60;

        const minutesFromStart = startMinutes - workDayStart;
        const durationMinutes = endMinutes - startMinutes;

        const topPx = (minutesFromStart / minutesPerSlot) * slotHeightPx;
        const heightPx = (durationMinutes / minutesPerSlot) * slotHeightPx;

        return { top: `${topPx}px`, height: `${heightPx}px` };
    };

    const bookingColors = [
        { border: 'border-blue-500', bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-700' },
        { border: 'border-green-500', bg: 'bg-green-50', hover: 'hover:bg-green-100', text: 'text-green-700' },
        { border: 'border-purple-500', bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-700' },
        { border: 'border-orange-500', bg: 'bg-orange-50', hover: 'hover:bg-orange-100', text: 'text-orange-700' },
        { border: 'border-pink-500', bg: 'bg-pink-50', hover: 'hover:bg-pink-100', text: 'text-pink-700' },
        { border: 'border-indigo-500', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', text: 'text-indigo-700' },
        { border: 'border-teal-500', bg: 'bg-teal-50', hover: 'hover:bg-teal-100', text: 'text-teal-700' },
        { border: 'border-cyan-500', bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100', text: 'text-cyan-700' },
    ];

    const getColorForBooking = (booking: Booking): string => {
        const bookingId = booking.parentId || booking.parent_id || booking.id;
        const colorSet = bookingColors[bookingId % bookingColors.length];
        return `${colorSet.border} ${colorSet.bg} ${colorSet.hover}`;
    };

    const getTextColorForBooking = (booking: Booking): string => {
        const bookingId = booking.parentId || booking.parent_id || booking.id;
        const colorSet = bookingColors[bookingId % bookingColors.length];
        return colorSet.text;
    };

    const days = getDaysInMonth(currentYear, currentMonth);
    const weekDays = i18n.language === 'ja'
        ? ['日', '月', '火', '水', '木', '金', '土']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const timeSlots = generateTimeSlots();
    const viewingDateBookings = viewingDate ? getBookingsForDate(viewingDate) : [];

    return (
        <div className="min-h-[calc(100vh-8rem)] p-2 sm:p-4">
            <div className="flex justify-center gap-4">
                <div className="glass-blue-card rounded-2xl p-4 sm:p-6 w-[1200px] max-w-[90vw] flex-shrink-0">
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={handlePreviousMonth}
                            className="glass-blue-button rounded-lg p-2 touch-target"
                            aria-label={t('calendar.previousMonth')}
                        >
                            <ChevronLeft className="w-5 h-5 text-white" />
                        </button>

                        <h2 className="text-purple-900 text-xl sm:text-2xl font-bold">
                            {i18n.language === 'ja'
                                ? `${currentYear}年 ${monthNames[currentMonth]}`
                                : `${monthNames[currentMonth]} ${currentYear}`
                            }
                        </h2>

                        <button
                            onClick={handleNextMonth}
                            className="glass-blue-button rounded-lg p-2 touch-target flex items-center justify-center"
                            aria-label={t('calendar.nextMonth')}
                        >
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-purple-600">{t('calendar.loading')}</p>
                        </div>
                    ) : (
                        <div className="glass-blue-card rounded-lg p-3 sm:p-6">
                            <div className="grid grid-cols-7 gap-2">
                                {weekDays.map((day, idx) => (
                                    <div
                                        key={idx}
                                        className="text-purple-600 text-sm sm:text-base font-semibold text-center py-2"
                                    >
                                        {day}
                                    </div>
                                ))}

                                {Array.from({ length: days.length / 7 }, (_, rowIdx) => {
                                    const rowDays = days.slice(rowIdx * 7, (rowIdx + 1) * 7);

                                    return (
                                        <React.Fragment key={`row-${rowIdx}`}>
                                            {rowDays.map((calendarDate, colIdx) => {
                                                const hasBookings = calendarDate.bookings.length > 0;
                                                const isToday =
                                                    calendarDate.date.toDateString() ===
                                                    new Date().toDateString();
                                                const isPast = isPastDate(calendarDate.date);
                                                const isViewing = viewingDate && viewingDate.toDateString() === calendarDate.date.toDateString();
                                                const dayOfWeek = calendarDate.date.getDay();
                                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                                return (
                                                    <div
                                                        key={`${rowIdx}-${colIdx}`}
                                                        onClick={() =>
                                                            handleDateClick(
                                                                calendarDate.date,
                                                                calendarDate.isCurrentMonth
                                                            )
                                                        }
                                                        className={`
                                                    relative h-[80px] sm:h-[120px] p-2 rounded-lg overflow-hidden
                                                    transition-all duration-200 touch-target
                                                    ${!calendarDate.isCurrentMonth
                                                                ? 'text-purple-200 bg-purple-50/30 pointer-events-none'
                                                                : 'text-purple-900 cursor-pointer'
                                                            }
                                                    ${hasBookings && calendarDate.isCurrentMonth
                                                                ? 'bg-purple-100'
                                                                : calendarDate.isCurrentMonth
                                                                    ? 'hover:bg-purple-50 border border-purple-200'
                                                                    : 'border border-transparent'
                                                            }
                                                    ${isToday && calendarDate.isCurrentMonth
                                                                ? 'ring-2 ring-purple-400'
                                                                : ''
                                                            }
                                                    ${isViewing && calendarDate.isCurrentMonth
                                                                ? 'ring-4 ring-blue-500'
                                                                : ''
                                                            }
                                                `}
                                                    >
                                                        {calendarDate.isCurrentMonth && isPast && (
                                                            <div className="absolute inset-0 bg-gray-500/20 rounded-lg pointer-events-none" />
                                                        )}
                                                        <div className={`relative text-sm sm:text-base font-semibold text-center mb-1 ${isWeekend && calendarDate.isCurrentMonth ? 'text-amber-700' : ''}`}>
                                                            {formatDate(calendarDate.date)}
                                                        </div>

                                                        {/* More indicator - mobile: >2 bookings at top-right (smaller), desktop: >3 bookings at top-right */}
                                                        {isMobile && calendarDate.bookings.length > 2 && calendarDate.isCurrentMonth && (
                                                            <div className="absolute top-0.5 right-0.5 text-[8px] leading-none text-white bg-purple-600 rounded-full px-1 py-0.5 font-semibold pointer-events-none">
                                                                <span className="relative -top-[1px]">
                                                                    +{calendarDate.bookings.length - 2}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {!isMobile && calendarDate.bookings.length > 3 && calendarDate.isCurrentMonth && (
                                                            <div className="absolute top-1 right-1 text-xs text-white bg-purple-600 rounded-full px-1.5 py-0.5 font-semibold pointer-events-none">
                                                                +{calendarDate.bookings.length - 3}
                                                            </div>
                                                        )}

                                                        {hasBookings && calendarDate.isCurrentMonth && (
                                                            <div className="relative mt-1 space-y-1">
                                                                {calendarDate.bookings
                                                                    .slice(0, isMobile ? 2 : 3)
                                                                    .map((booking) => {
                                                                        const textColor = getTextColorForBooking(booking);
                                                                        return (
                                                                            <div
                                                                                key={booking.id}
                                                                                className={`text-[10px] sm:text-xs leading-tight p-1 rounded bg-white/50 pointer-events-none ${textColor} truncate flex items-center gap-1`}
                                                                            >
                                                                                <span className="font-medium">{booking.startTime} - {booking.endTime}</span>
                                                                                {' • '}
                                                                                <span>{booking.department.name}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Desktop: Side panel */}
                {viewingDate && !isMobile && (
                    <div className="glass-blue-card rounded-2xl p-4 sm:p-6 w-[400px] max-w-[400px] min-w-[300px] flex-shrink sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto">
                        <div className="mb-4">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-purple-900 text-lg font-bold">
                                        {t('calendar.daySchedule')}
                                    </h3>
                                    {viewingDateBookings.length === 0 && (
                                        <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                                            {t('calendar.empty')}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setViewingDate(null)}
                                    className="text-purple-600 hover:text-purple-900 hover:bg-purple-100 rounded-lg p-1 transition-colors"
                                    aria-label="Close schedule"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
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
                )}
            </div>

            {/* Mobile: Dialog overlay */}
            {viewingDate && isMobile && (
                <ScheduleDialog
                    isOpen={true}
                    onClose={() => setViewingDate(null)}
                    viewingDate={viewingDate}
                    viewingDateBookings={viewingDateBookings}
                    roomName={roomName}
                    currentUserId={currentUserId}
                    monthNames={monthNames}
                    timeSlots={timeSlots}
                    isPastDate={isPastDate}
                    getBookingPosition={getBookingPosition}
                    getColorForBooking={getColorForBooking}
                    handleScheduleBookingClick={handleScheduleBookingClick}
                    handleScheduleEmptySlotClick={handleScheduleEmptySlotClick}
                />
            )}

            {showBookingForm && selectedDate && roomId && (
                <BookingFormDialog
                    isOpen={showBookingForm}
                    onClose={handleCloseBookingForm}
                    selectedDate={selectedDate}
                    roomId={roomId}
                    bookingId={selectedBookingId}
                    onBookingCreated={fetchBookings}
                    initialStartTime={selectedStartTime}
                />
            )}
        </div>
    );
};

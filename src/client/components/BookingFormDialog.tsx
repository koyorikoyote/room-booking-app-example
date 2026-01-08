import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Department {
    id: number;
    name: string;
}

interface BookingFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    roomId: string;
    bookingId?: number;
    onBookingCreated?: () => void;
    initialStartTime?: string;
}

interface FormData {
    departmentId: string;
    startTime: string;
    endTime: string;
    repetition: string[];
    remarks: string;
}

interface FormErrors {
    departmentId?: string;
    startTime?: string;
    endTime?: string;
}

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const generateTimeSlots = (includeEndTime = false): string[] => {
    const slots: string[] = [];
    const maxHour = includeEndTime ? 20 : 20;
    for (let hour = 8; hour <= maxHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            if (hour === 20 && minute > 0 && !includeEndTime) break;
            if (hour === 20 && minute > 30) break;
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push(timeStr);
        }
    }
    return slots;
};

export const BookingFormDialog: React.FC<BookingFormDialogProps> = ({
    isOpen,
    onClose,
    selectedDate,
    roomId,
    bookingId,
    onBookingCreated,
    initialStartTime,
}) => {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isEditMode, setIsEditMode] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        departmentId: '',
        startTime: '09:00',
        endTime: '10:00',
        repetition: [],
        remarks: '',
    });

    const startTimeSlots = generateTimeSlots(false);
    const endTimeSlots = generateTimeSlots(true);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/departments', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const sortedDepartments = (data.data || []).sort((a: Department, b: Department) => {
                    const idA = typeof a.id === 'string' ? parseInt(a.id, 10) : a.id;
                    const idB = typeof b.id === 'string' ? parseInt(b.id, 10) : b.id;
                    return idA - idB;
                });
                setDepartments(sortedDepartments);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookingDetails = useCallback(async () => {
        if (!bookingId) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/bookings/${bookingId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const booking = data.data;

                setFormData({
                    departmentId: booking.departmentId.toString(),
                    startTime: booking.startTime,
                    endTime: booking.endTime,
                    repetition: booking.recurringDays || [],
                    remarks: booking.remarks || '',
                });
            }
        } catch (error) {
            console.error('Error fetching booking details:', error);
        } finally {
            setLoading(false);
        }
    }, [bookingId]);

    useEffect(() => {
        if (isOpen) {
            fetchDepartments();
            if (bookingId) {
                setIsEditMode(true);
                fetchBookingDetails();
            } else {
                setIsEditMode(false);
                if (initialStartTime) {
                    const slots = generateTimeSlots(true);
                    const startIndex = slots.findIndex(t => t === initialStartTime);
                    const endTimeSlotIndex = startIndex + 2;
                    const calculatedEndTime = endTimeSlotIndex < slots.length
                        ? slots[endTimeSlotIndex]
                        : slots[slots.length - 1];

                    setFormData(prev => ({
                        ...prev,
                        startTime: initialStartTime,
                        endTime: calculatedEndTime,
                    }));
                }
            }
        }
    }, [isOpen, bookingId, fetchBookingDetails, initialStartTime]);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.departmentId) {
            newErrors.departmentId = t('errors.required');
        }

        if (!formData.startTime) {
            newErrors.startTime = t('errors.required');
        }

        if (!formData.endTime) {
            newErrors.startTime = t('errors.required');
        }

        if (formData.startTime && formData.endTime) {
            const startMinutes = timeToMinutes(formData.startTime);
            const endMinutes = timeToMinutes(formData.endTime);

            if (endMinutes <= startMinutes) {
                newErrors.endTime = t('errors.invalidTime');
            }

            if (startMinutes < 480 || startMinutes > 1200) {
                newErrors.startTime = t('errors.outsideWorkingHours');
            }

            if (endMinutes < 510 || endMinutes > 1230) {
                newErrors.endTime = t('errors.outsideWorkingHours');
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);
        setErrors({});

        try {
            const token = localStorage.getItem('token');
            const url = isEditMode ? `/api/bookings/${bookingId}` : '/api/bookings';
            const method = isEditMode ? 'PUT' : 'POST';

            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    roomId: parseInt(roomId),
                    departmentId: parseInt(formData.departmentId),
                    date: dateStr,
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    repetition: formData.repetition,
                    remarks: formData.remarks || undefined,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('success', isEditMode ? t('booking.updateSuccess') : t('booking.success'));
                if (onBookingCreated) {
                    onBookingCreated();
                }
                handleClose();
            } else if (response.status === 409 && data.conflicts) {
                const conflict = data.conflicts[0];
                const conflictDate = new Date(conflict.date);
                const formattedDate = conflictDate.toLocaleDateString(
                    i18n.language === 'ja' ? 'ja-JP' : 'en-US',
                    {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }
                );

                const errorMessage = i18n.language === 'ja'
                    ? `予約が重複しています\n\n会議室: ${conflict.room}\n日付: ${formattedDate}\n時間: ${conflict.startTime} - ${conflict.endTime}\n部署: ${conflict.department}\n\n別の時間帯を選択してください。`
                    : `Booking Conflict Detected\n\nRoom: ${conflict.room}\nDate: ${formattedDate}\nTime: ${conflict.startTime} - ${conflict.endTime}\nDepartment: ${conflict.department}\n\nPlease select a different time slot.`;

                showToast('error', errorMessage);
            } else if (response.status === 403) {
                showToast('error', t('booking.unauthorized'));
            } else {
                showToast('error', data.error || t('booking.error'));
            }
        } catch (error) {
            console.error('Error saving booking:', error);
            showToast('error', t('errors.networkError'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!bookingId) return;

        if (!window.confirm(t('booking.confirmDelete'))) {
            return;
        }

        setDeleting(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showToast('success', t('booking.deleteSuccess'));
                if (onBookingCreated) {
                    onBookingCreated();
                }
                handleClose();
            } else if (response.status === 403) {
                showToast('error', t('booking.unauthorized'));
            } else {
                showToast('error', data.error || t('booking.deleteError'));
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            showToast('error', t('errors.networkError'));
        } finally {
            setDeleting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            departmentId: '',
            startTime: '09:00',
            endTime: '10:00',
            repetition: [],
            remarks: '',
        });
        setErrors({});
        setIsEditMode(false);
        onClose();
    };

    const handleWeekdayToggle = (weekday: string) => {
        setFormData((prev) => ({
            ...prev,
            repetition: prev.repetition.includes(weekday)
                ? prev.repetition.filter((d) => d !== weekday)
                : [...prev.repetition, weekday],
        }));
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleClose}
        >
            <div
                className="glass-blue-modal rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-black text-xl font-bold">
                        {isEditMode ? t('booking.editTitle') : t('booking.title')}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-purple-600 hover:text-purple-800 transition-colors"
                        aria-label={t('booking.cancel')}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <p className="text-black mb-6">
                    {selectedDate.toLocaleDateString(
                        i18n.language === 'ja' ? 'ja-JP' : 'en-US',
                        {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        }
                    )}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-black text-sm font-medium mb-2">
                            {t('booking.department')} *
                        </label>
                        <select
                            value={formData.departmentId}
                            onChange={(e) =>
                                setFormData({ ...formData, departmentId: e.target.value })
                            }
                            className={`w-full bg-white border border-purple-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 ${formData.departmentId === '' ? 'text-gray-400' : 'text-black'
                                }`}
                            disabled={loading}
                        >
                            <option value="" className="text-gray-400">
                                {loading ? t('booking.loading') : t('booking.selectDepartment')}
                            </option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id} className="text-black">
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                        {errors.departmentId && (
                            <p className="text-red-400 text-xs mt-1">{errors.departmentId}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-black text-sm font-medium mb-2">
                                {t('booking.startTime')} *
                            </label>
                            <select
                                value={formData.startTime}
                                onChange={(e) => {
                                    const newStartTime = e.target.value;
                                    const newStartMinutes = timeToMinutes(newStartTime);
                                    const currentEndMinutes = timeToMinutes(formData.endTime);

                                    if (currentEndMinutes <= newStartMinutes) {
                                        const nextSlotIndex = endTimeSlots.findIndex(t => t === newStartTime) + 1;
                                        const newEndTime = nextSlotIndex < endTimeSlots.length
                                            ? endTimeSlots[nextSlotIndex]
                                            : endTimeSlots[endTimeSlots.length - 1];
                                        setFormData({ ...formData, startTime: newStartTime, endTime: newEndTime });
                                    } else {
                                        setFormData({ ...formData, startTime: newStartTime });
                                    }
                                }}
                                className="w-full bg-white border border-purple-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                            >
                                {startTimeSlots.map((time) => (
                                    <option key={time} value={time} className="text-gray-800">
                                        {time}
                                    </option>
                                ))}
                            </select>
                            {errors.startTime && (
                                <p className="text-red-400 text-xs mt-1">{errors.startTime}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-black text-sm font-medium mb-2">
                                {t('booking.endTime')} *
                            </label>
                            <select
                                value={formData.endTime}
                                onChange={(e) =>
                                    setFormData({ ...formData, endTime: e.target.value })
                                }
                                className="w-full bg-white border border-purple-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                            >
                                {endTimeSlots.map((time) => {
                                    const isDisabled = timeToMinutes(time) <= timeToMinutes(formData.startTime);
                                    return (
                                        <option
                                            key={time}
                                            value={time}
                                            disabled={isDisabled}
                                            className={isDisabled ? 'text-gray-400' : 'text-gray-800'}
                                        >
                                            {time}
                                        </option>
                                    );
                                })}
                            </select>
                            {errors.endTime && (
                                <p className="text-red-400 text-xs mt-1">{errors.endTime}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-black text-sm font-medium mb-2">
                            {t('booking.repetition')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {WEEKDAYS.map((weekday) => (
                                <label
                                    key={weekday}
                                    className="flex items-center space-x-2 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.repetition.includes(weekday)}
                                        onChange={() => handleWeekdayToggle(weekday)}
                                        className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                                    />
                                    <span className="text-black text-sm">
                                        {t(`weekdays.${weekday}`)}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-black text-sm font-medium mb-2">
                            {t('booking.remarks')}
                        </label>
                        <textarea
                            value={formData.remarks}
                            onChange={(e) =>
                                setFormData({ ...formData, remarks: e.target.value })
                            }
                            rows={3}
                            className="w-full bg-white border border-purple-300 text-black rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none placeholder-gray-400"
                            placeholder={t('booking.remarks')}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg px-4 py-2 transition-colors font-medium"
                        >
                            {t('booking.cancel')}
                        </button>
                        {isEditMode && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting || submitting}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deleting ? t('booking.deleting') : t('booking.delete')}
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={submitting || deleting}
                            className="flex-1 glass-blue-button rounded-lg px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {submitting ? t('booking.submitting') : isEditMode ? t('booking.update') : t('booking.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "../components/Layout";
import {
    ChevronLeft,
    Calendar,
    Search,
    Trash2,
} from "lucide-react";

interface Booking {
    id: number;
    date: Date;
    startTime: string;
    endTime: string;
    remarks: string | null;
    room: {
        id: number;
        code: string;
        name: string;
    };
    department: {
        id: number;
        name: string;
    };
    user: {
        id: number;
        name: string;
        username: string;
    };
}

interface Room {
    id: number;
    code: string;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

export const BookingManagement: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { token, user: currentUser } = useAuth();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRoomId, setSelectedRoomId] = useState<string>("");
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
    const [selectedBookings, setSelectedBookings] = useState<Set<number>>(new Set());
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        if (currentUser && currentUser.role && currentUser.role.level < 3) {
            navigate("/");
        }
    }, [currentUser, navigate]);

    const fetchBookings = useCallback(async () => {
        try {
            const params: string[] = [];
            if (selectedRoomId) params.push(`roomId=${selectedRoomId}`);
            if (selectedDepartmentId) params.push(`departmentId=${selectedDepartmentId}`);
            const queryString = params.length > 0 ? `?${params.join("&")}` : "";

            const response = await fetch(`/api/bookings/admin/all${queryString}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setBookings(data.data);
                    setFilteredBookings(data.data);
                }
            }
        } catch {
            console.error("Network error");
        }
    }, [token, selectedRoomId, selectedDepartmentId]);

    const fetchRooms = useCallback(async () => {
        try {
            const response = await fetch("/api/rooms", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setRooms(data.data);
                }
            }
        } catch {
            console.error("Failed to fetch rooms");
        }
    }, [token]);

    const fetchDepartments = useCallback(async () => {
        try {
            const response = await fetch("/api/departments", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setDepartments(data.data);
                }
            }
        } catch {
            console.error("Failed to fetch departments");
        }
    }, [token]);

    useEffect(() => {
        const init = async () => {
            if (token) {
                await Promise.all([fetchBookings(), fetchRooms(), fetchDepartments()]);
                setLoading(false);
            }
        };
        init();
    }, [token, fetchBookings, fetchRooms, fetchDepartments]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredBookings(bookings);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = bookings.filter(
            (booking) =>
                booking.room.name.toLowerCase().includes(term) ||
                booking.room.code.toLowerCase().includes(term) ||
                booking.department.name.toLowerCase().includes(term) ||
                booking.user.name.toLowerCase().includes(term) ||
                booking.user.username.toLowerCase().includes(term)
        );
        setFilteredBookings(filtered);
    }, [searchTerm, bookings]);

    const handleDelete = async (bookingId: number) => {
        setDeleteBookingId(bookingId);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteBookingId) return;
        try {
            const response = await fetch(`/api/bookings/admin/${deleteBookingId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                await fetchBookings();
                setIsDeleteDialogOpen(false);
                setDeleteBookingId(null);
            }
        } catch {
            window.alert("Failed to delete booking");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedBookings.size === 0) return;
        if (
            !window.confirm(
                t("bookingManagement.confirmations.bulkDeleteBookings", {
                    count: selectedBookings.size,
                })
            )
        )
            return;
        try {
            const response = await fetch("/api/bookings/admin/bulk-delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: Array.from(selectedBookings) }),
            });
            if (response.ok) {
                await fetchBookings();
                setSelectedBookings(new Set());
            }
        } catch {
            window.alert("Failed to delete bookings");
        }
    };

    const toggleBookingSelection = (bookingId: number) => {
        const newSelection = new Set(selectedBookings);
        if (newSelection.has(bookingId)) {
            newSelection.delete(bookingId);
        } else {
            newSelection.add(bookingId);
        }
        setSelectedBookings(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedBookings.size === filteredBookings.length) {
            setSelectedBookings(new Set());
        } else {
            setSelectedBookings(new Set(filteredBookings.map((b) => b.id)));
        }
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleDateString();
    };

    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredBookings.length);
    const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedRoomId, selectedDepartmentId]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        setSelectedBookings(new Set());
    };

    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
        setSelectedBookings(new Set());
    };

    if (loading) {
        return (
            <Layout>
                <div className="mobile-container py-6">
                    <div className="text-center text-purple-600">
                        {t("calendar.loading")}
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="mobile-container py-6 space-y-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/")}
                        className="touch-target flex items-center justify-center text-purple-600 hover:text-purple-800 transition-colors rounded-lg hover:bg-purple-100 p-2"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-purple-800">
                        {t("bookingManagement.title")}
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 glass-blue-card p-3 rounded-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                            <input
                                type="text"
                                placeholder={t("bookingManagement.searchPlaceholder")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900 placeholder-purple-400"
                            />
                        </div>
                    </div>
                    <select
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="glass-blue-card px-4 py-2 rounded-xl text-purple-700 border-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">{t("bookingManagement.allRooms")}</option>
                        {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                                {room.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        className="glass-blue-card px-4 py-2 rounded-xl text-purple-700 border-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">{t("bookingManagement.allDepartments")}</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                    {selectedBookings.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="glass-blue-card px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span className="hidden sm:inline">
                                {t("common.actions.bulkDelete")} ({selectedBookings.size})
                            </span>
                        </button>
                    )}
                </div>

                <div className="glass-blue-card p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-purple-600" />
                        <p className="text-sm text-purple-600 font-medium">
                            Showing {startIndex + 1}-{endIndex} of {filteredBookings.length}{" "}
                            bookings
                            {searchTerm && ` (filtered from ${bookings.length} total)`}
                        </p>
                    </div>
                </div>

                <div className="hidden md:block glass-blue-card rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-purple-100/50">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedBookings.size === filteredBookings.length &&
                                                filteredBookings.length > 0
                                            }
                                            onChange={toggleSelectAll}
                                            className="rounded border-purple-300"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("booking.date")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("booking.time")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("bookingManagement.room")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("booking.department")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("bookingManagement.user")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("common.actions.delete")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white/30 divide-y divide-purple-100">
                                {paginatedBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-purple-50/50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedBookings.has(booking.id)}
                                                onChange={() => toggleBookingSelection(booking.id)}
                                                className="rounded border-purple-300"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-purple-900">
                                                {formatDate(booking.date)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-purple-600">
                                                {booking.startTime} - {booking.endTime}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-purple-900">
                                                {booking.room.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-purple-600">
                                                {booking.department.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-purple-600">
                                                {booking.user.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleDelete(booking.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="md:hidden space-y-3">
                    {paginatedBookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="glass-blue-card p-4 rounded-xl hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedBookings.has(booking.id)}
                                    onChange={() => toggleBookingSelection(booking.id)}
                                    className="mt-1 rounded border-purple-300"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-purple-900 text-lg">
                                        {booking.room.name}
                                    </h3>
                                    <p className="text-sm text-purple-600 mt-1">
                                        {formatDate(booking.date)} • {booking.startTime} -{" "}
                                        {booking.endTime}
                                    </p>
                                    <p className="text-sm text-purple-600">
                                        {booking.department.name}
                                    </p>
                                    <p className="text-sm text-purple-600">
                                        {booking.user.name}
                                    </p>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => handleDelete(booking.id)}
                                            className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            {t("common.actions.delete")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredBookings.length === 0 && (
                    <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                        <p className="text-purple-600">
                            {searchTerm
                                ? t("bookingManagement.emptyStates.noSearchResults")
                                : t("bookingManagement.emptyStates.noBookings")}
                        </p>
                    </div>
                )}

                {filteredBookings.length > 0 && (
                    <div className="glass-blue-card p-4 rounded-xl">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-purple-700">Rows per page:</label>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) =>
                                        handleItemsPerPageChange(Number(e.target.value))
                                    }
                                    className="px-3 py-1 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-purple-700 px-3">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => handlePageChange(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isDeleteDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-purple-900 mb-4">
                            {t("bookingManagement.deleteBooking")}
                        </h2>
                        <p className="text-purple-700 mb-6">
                            {t("bookingManagement.confirmations.deleteBooking")}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsDeleteDialogOpen(false)}
                                className="flex-1 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
                            >
                                {t("common.actions.cancel")}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                {t("common.actions.delete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "../components/Layout";
import {
    ChevronLeft,
    DoorOpen,
    Search,
    Plus,
    Edit,
    Trash2,
    X,
} from "lucide-react";

interface Room {
    id: number;
    code: string;
    name: string;
    capacity: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface FormData {
    code: string;
    name: string;
    capacity: number;
    isActive: boolean;
}

export const RoomManagement: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { token, user: currentUser } = useAuth();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRooms, setSelectedRooms] = useState<Set<number>>(new Set());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [deleteRoomId, setDeleteRoomId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [formData, setFormData] = useState<FormData>({
        code: "",
        name: "",
        capacity: 10,
        isActive: true,
    });

    useEffect(() => {
        if (currentUser && currentUser.role && currentUser.role.level < 3) {
            navigate("/");
        }
    }, [currentUser, navigate]);

    const fetchRooms = useCallback(async () => {
        try {
            const response = await fetch("/api/rooms", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setRooms(data.data);
                    setFilteredRooms(data.data);
                }
            }
        } catch {
            console.error("Network error");
        }
    }, [token]);

    useEffect(() => {
        const init = async () => {
            if (token) {
                await fetchRooms();
                setLoading(false);
            }
        };
        init();
    }, [token, fetchRooms]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredRooms(rooms);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = rooms.filter(
            (room) =>
                room.code.toLowerCase().includes(term) ||
                room.name.toLowerCase().includes(term)
        );
        setFilteredRooms(filtered);
    }, [searchTerm, rooms]);

    const handleOpenForm = (room?: Room) => {
        if (room) {
            setEditingRoom(room);
            setFormData({
                code: room.code,
                name: room.name,
                capacity: room.capacity,
                isActive: room.isActive,
            });
        } else {
            setEditingRoom(null);
            setFormData({
                code: "",
                name: "",
                capacity: 10,
                isActive: true,
            });
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingRoom(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingRoom ? `/api/rooms/${editingRoom.id}` : "/api/rooms";
            const method = editingRoom ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                await fetchRooms();
                handleCloseForm();
            } else {
                const data = await response.json();
                window.alert(data.error || "Failed to save room");
            }
        } catch {
            window.alert("Network error");
        }
    };

    const handleDelete = async (roomId: number) => {
        setDeleteRoomId(roomId);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteRoomId) return;
        try {
            const response = await fetch(`/api/rooms/${deleteRoomId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                await fetchRooms();
                setIsDeleteDialogOpen(false);
                setDeleteRoomId(null);
            }
        } catch {
            window.alert("Failed to delete room");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRooms.size === 0) return;
        if (
            !window.confirm(
                t("roomManagement.confirmations.bulkDeleteRooms", {
                    count: selectedRooms.size,
                })
            )
        )
            return;
        try {
            const response = await fetch("/api/rooms/bulk-delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: Array.from(selectedRooms) }),
            });
            if (response.ok) {
                await fetchRooms();
                setSelectedRooms(new Set());
            }
        } catch {
            window.alert("Failed to delete rooms");
        }
    };

    const toggleRoomSelection = (roomId: number) => {
        const newSelection = new Set(selectedRooms);
        if (newSelection.has(roomId)) {
            newSelection.delete(roomId);
        } else {
            newSelection.add(roomId);
        }
        setSelectedRooms(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedRooms.size === filteredRooms.length) {
            setSelectedRooms(new Set());
        } else {
            setSelectedRooms(new Set(filteredRooms.map((r) => r.id)));
        }
    };

    const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredRooms.length);
    const paginatedRooms = filteredRooms.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        setSelectedRooms(new Set());
    };

    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
        setSelectedRooms(new Set());
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
                        {t("roomManagement.title")}
                    </h1>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1 glass-blue-card p-3 rounded-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                            <input
                                type="text"
                                placeholder={t("roomManagement.searchPlaceholder")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-900 placeholder-purple-400"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenForm()}
                        className="glass-blue-card px-4 py-2 rounded-xl text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">{t("roomManagement.newRoom")}</span>
                    </button>
                    {selectedRooms.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="glass-blue-card px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span className="hidden sm:inline">
                                {t("common.actions.bulkDelete")} ({selectedRooms.size})
                            </span>
                        </button>
                    )}
                </div>

                <div className="glass-blue-card p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <DoorOpen className="w-6 h-6 text-purple-600" />
                        <p className="text-sm text-purple-600 font-medium">
                            Showing {startIndex + 1}-{endIndex} of {filteredRooms.length} rooms
                            {searchTerm && ` (filtered from ${rooms.length} total)`}
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
                                                selectedRooms.size === filteredRooms.length &&
                                                filteredRooms.length > 0
                                            }
                                            onChange={toggleSelectAll}
                                            className="rounded border-purple-300"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("roomManagement.code")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("userManagement.name")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("roomManagement.capacity")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("userManagement.status")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("common.actions.edit")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white/30 divide-y divide-purple-100">
                                {paginatedRooms.map((room) => (
                                    <tr key={room.id} className="hover:bg-purple-50/50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedRooms.has(room.id)}
                                                onChange={() => toggleRoomSelection(room.id)}
                                                className="rounded border-purple-300"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-purple-900">
                                                {room.code}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-purple-600">{room.name}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-purple-600">
                                                {room.capacity}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${room.isActive
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-gray-100 text-gray-800"
                                                    }`}
                                            >
                                                {room.isActive
                                                    ? t("userManagement.active")
                                                    : t("userManagement.inactive")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleOpenForm(room)}
                                                    className="text-purple-600 hover:text-purple-800"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(room.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="md:hidden space-y-3">
                    {paginatedRooms.map((room) => (
                        <div
                            key={room.id}
                            className="glass-blue-card p-4 rounded-xl hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedRooms.has(room.id)}
                                    onChange={() => toggleRoomSelection(room.id)}
                                    className="mt-1 rounded border-purple-300"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-purple-900 text-lg">
                                        {room.name}
                                    </h3>
                                    <p className="text-sm text-purple-600 mt-1">
                                        {t("roomManagement.code")}: {room.code}
                                    </p>
                                    <p className="text-sm text-purple-600">
                                        {t("roomManagement.capacity")}: {room.capacity}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${room.isActive
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {room.isActive
                                                ? t("userManagement.active")
                                                : t("userManagement.inactive")}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => handleOpenForm(room)}
                                            className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            {t("common.actions.edit")}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(room.id)}
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

                {filteredRooms.length === 0 && (
                    <div className="text-center py-12">
                        <DoorOpen className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                        <p className="text-purple-600">
                            {searchTerm
                                ? t("roomManagement.emptyStates.noSearchResults")
                                : t("roomManagement.emptyStates.noRooms")}
                        </p>
                    </div>
                )}

                {filteredRooms.length > 0 && (
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

            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-purple-900">
                                    {editingRoom
                                        ? t("roomManagement.editRoom")
                                        : t("roomManagement.newRoom")}
                                </h2>
                                <button
                                    onClick={handleCloseForm}
                                    className="text-purple-600 hover:text-purple-800"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                        {t("roomManagement.code")}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={(e) =>
                                            setFormData({ ...formData, code: e.target.value })
                                        }
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                        {t("userManagement.name")}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                        {t("roomManagement.capacity")}
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={formData.capacity}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                capacity: parseInt(e.target.value),
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) =>
                                            setFormData({ ...formData, isActive: e.target.checked })
                                        }
                                        className="rounded border-purple-300"
                                    />
                                    <label className="text-sm font-medium text-purple-700">
                                        {t("userManagement.active")}
                                    </label>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="flex-1 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
                                    >
                                        {t("common.actions.cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        {t("common.actions.save")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-purple-900 mb-4">
                            {t("roomManagement.deleteRoom")}
                        </h2>
                        <p className="text-purple-700 mb-6">
                            {t("roomManagement.confirmations.deleteRoom")}
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

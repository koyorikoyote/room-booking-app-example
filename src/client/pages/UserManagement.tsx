import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "../components/Layout";
import {
    ChevronLeft,
    Users as UsersIcon,
    Search,
    Plus,
    Edit,
    Trash2,
    X,
} from "lucide-react";

interface UserRole {
    id: number;
    name: string;
    level: number;
}

interface User {
    id: number;
    username: string;
    email: string;
    name: string;
    isActive: boolean;
    languagePreference: string;
    roleId: number;
    createdAt: string;
    updatedAt: string;
    role: UserRole;
}

interface FormData {
    username: string;
    email: string;
    name: string;
    password: string;
    roleId: string;
    isActive: boolean;
    languagePreference: string;
}

export const UserManagement: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { token, user: currentUser } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [formData, setFormData] = useState<FormData>({
        username: "",
        email: "",
        name: "",
        password: "",
        roleId: "",
        isActive: true,
        languagePreference: "JA",
    });

    useEffect(() => {
        if (currentUser && currentUser.role && currentUser.role.level < 3) {
            navigate("/");
        }
    }, [currentUser, navigate]);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch("/api/users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUsers(data.data);
                    setFilteredUsers(data.data);
                }
            }
        } catch {
            console.error("Network error");
        }
    }, [token]);

    const fetchRoles = useCallback(async () => {
        try {
            const response = await fetch("/api/users/roles/list", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setRoles(data.data);
                }
            }
        } catch {
            console.error("Failed to fetch roles");
        }
    }, [token]);

    useEffect(() => {
        const init = async () => {
            if (token) {
                await Promise.all([fetchUsers(), fetchRoles()]);
                setLoading(false);
            }
        };
        init();
    }, [token, fetchUsers, fetchRoles]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredUsers(users);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = users.filter(
            (user) =>
                user.name.toLowerCase().includes(term) ||
                user.username.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term) ||
                user.role.name.toLowerCase().includes(term)
        );
        setFilteredUsers(filtered);
    }, [searchTerm, users]);

    const handleOpenForm = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                email: user.email,
                name: user.name,
                password: "",
                roleId: user.roleId.toString(),
                isActive: user.isActive,
                languagePreference: user.languagePreference,
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: "",
                email: "",
                name: "",
                password: "",
                roleId: roles[0]?.id.toString() || "",
                isActive: true,
                languagePreference: "JA",
            });
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingUser(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
            const method = editingUser ? "PUT" : "POST";
            const body: Record<string, unknown> = {
                username: formData.username,
                email: formData.email,
                name: formData.name,
                roleId: parseInt(formData.roleId),
                isActive: formData.isActive,
                languagePreference: formData.languagePreference,
            };
            if (formData.password) {
                body.password = formData.password;
            }
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });
            if (response.ok) {
                await fetchUsers();
                handleCloseForm();
            } else {
                const data = await response.json();
                window.alert(data.error || "Failed to save user");
            }
        } catch {
            window.alert("Network error");
        }
    };

    const handleDelete = async (userId: number) => {
        if (currentUser?.id === userId) {
            window.alert(t("userManagement.confirmations.cannotDeleteSelfMessage"));
            return;
        }
        setDeleteUserId(userId);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteUserId) return;
        try {
            const response = await fetch(`/api/users/${deleteUserId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                await fetchUsers();
                setIsDeleteDialogOpen(false);
                setDeleteUserId(null);
            }
        } catch {
            window.alert("Failed to delete user");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUsers.size === 0) return;
        if (currentUser?.id && selectedUsers.has(currentUser.id)) {
            window.alert(t("userManagement.confirmations.cannotDeleteSelfMessage"));
            return;
        }
        if (
            !window.confirm(
                t("userManagement.confirmations.bulkDeleteUsers", {
                    count: selectedUsers.size,
                })
            )
        )
            return;
        try {
            const response = await fetch("/api/users/bulk-delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: Array.from(selectedUsers) }),
            });
            if (response.ok) {
                await fetchUsers();
                setSelectedUsers(new Set());
            }
        } catch {
            window.alert("Failed to delete users");
        }
    };

    const toggleUserSelection = (userId: number) => {
        const newSelection = new Set(selectedUsers);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedUsers(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
        }
    };

    const getRoleLabel = (roleName: string) => {
        return t(`userManagement.roles.${roleName}`);
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        setSelectedUsers(new Set()); // Clear selection when changing pages
    };

    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
        setSelectedUsers(new Set());
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
                        {t("userManagement.title")}
                    </h1>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1 glass-blue-card p-3 rounded-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                            <input
                                type="text"
                                placeholder={t("userManagement.searchPlaceholder")}
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
                        <span className="hidden sm:inline">{t("userManagement.newUser")}</span>
                    </button>
                    {selectedUsers.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="glass-blue-card px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span className="hidden sm:inline">
                                {t("userManagement.bulkDelete")} ({selectedUsers.size})
                            </span>
                        </button>
                    )}
                </div>

                <div className="glass-blue-card p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <UsersIcon className="w-6 h-6 text-purple-600" />
                        <p className="text-sm text-purple-600 font-medium">
                            Showing {startIndex + 1}-{endIndex} of {filteredUsers.length} users
                            {searchTerm && ` (filtered from ${users.length} total)`}
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
                                                selectedUsers.size === filteredUsers.length &&
                                                filteredUsers.length > 0
                                            }
                                            onChange={toggleSelectAll}
                                            className="rounded border-purple-300"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("userManagement.name")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("userManagement.username")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("userManagement.email")}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("userManagement.role")}
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
                                {paginatedUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-purple-50/50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.has(user.id)}
                                                onChange={() => toggleUserSelection(user.id)}
                                                className="rounded border-purple-300"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-purple-900">
                                                {user.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-purple-600">
                                                @{user.username}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-purple-600">{user.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                {getRoleLabel(user.role.name)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                    }`}
                                            >
                                                {user.isActive
                                                    ? t("userManagement.active")
                                                    : t("userManagement.inactive")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleOpenForm(user)}
                                                    className="text-purple-600 hover:text-purple-800"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
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
                    {paginatedUsers.map((user) => (
                        <div
                            key={user.id}
                            className="glass-blue-card p-4 rounded-xl hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.has(user.id)}
                                    onChange={() => toggleUserSelection(user.id)}
                                    className="mt-1 rounded border-purple-300"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-purple-900 text-lg">
                                        {user.name}
                                    </h3>
                                    <p className="text-sm text-purple-600 mt-1">@{user.username}</p>
                                    <p className="text-sm text-purple-600">{user.email}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            {getRoleLabel(user.role.name)}
                                        </span>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                                                ? "bg-green-100 text-green-800"
                                                : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {user.isActive
                                                ? t("userManagement.active")
                                                : t("userManagement.inactive")}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => handleOpenForm(user)}
                                            className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            {t("common.actions.edit")}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
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

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                        <UsersIcon className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                        <p className="text-purple-600">
                            {searchTerm
                                ? t("userManagement.emptyStates.noSearchResults")
                                : t("userManagement.emptyStates.noUsers")}
                        </p>
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredUsers.length > 0 && (
                    <div className="glass-blue-card p-4 rounded-xl">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Items per page selector */}
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

                            {/* Page navigation */}
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
                                    {editingUser
                                        ? t("userManagement.editUser")
                                        : t("userManagement.newUser")}
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
                                        {t("userManagement.email")}
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        autoComplete="email"
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                        {t("userManagement.username")}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={(e) =>
                                            setFormData({ ...formData, username: e.target.value })
                                        }
                                        autoComplete="username"
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                        {t("userManagement.password")}{" "}
                                        {editingUser && t("userManagement.leaveBlank")}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                        autoComplete={editingUser ? "new-password" : "new-password"}
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                        {t("userManagement.role")}
                                    </label>
                                    <select
                                        required
                                        value={formData.roleId}
                                        onChange={(e) =>
                                            setFormData({ ...formData, roleId: e.target.value })
                                        }
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {getRoleLabel(role.name)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-purple-700 mb-1">
                                        {t("userManagement.languagePreference")}
                                    </label>
                                    <select
                                        value={formData.languagePreference}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                languagePreference: e.target.value,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="EN">English</option>
                                        <option value="JA">日本語</option>
                                    </select>
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
                            {t("userManagement.deleteUser")}
                        </h2>
                        <p className="text-purple-700 mb-6">
                            {t("userManagement.confirmations.deleteUser")}
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

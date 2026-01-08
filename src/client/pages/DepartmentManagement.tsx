import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "../components/Layout";
import {
    ChevronLeft,
    Building2,
    Search,
    Plus,
    Edit,
    Trash2,
    X,
} from "lucide-react";

interface Department {
    id: number;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface FormData {
    name: string;
    isActive: boolean;
}

export const DepartmentManagement: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { token, user: currentUser } = useAuth();

    const [departments, setDepartments] = useState<Department[]>([]);
    const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDepartments, setSelectedDepartments] = useState<Set<number>>(new Set());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [deleteDepartmentId, setDeleteDepartmentId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        isActive: true,
    });

    useEffect(() => {
        if (currentUser && currentUser.role && currentUser.role.level < 3) {
            navigate("/");
        }
    }, [currentUser, navigate]);

    const fetchDepartments = useCallback(async () => {
        try {
            const response = await fetch("/api/departments", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setDepartments(data.data);
                    setFilteredDepartments(data.data);
                }
            }
        } catch {
            console.error("Network error");
        }
    }, [token]);

    useEffect(() => {
        const init = async () => {
            if (token) {
                await fetchDepartments();
                setLoading(false);
            }
        };
        init();
    }, [token, fetchDepartments]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredDepartments(departments);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = departments.filter((dept) =>
            dept.name.toLowerCase().includes(term)
        );
        setFilteredDepartments(filtered);
    }, [searchTerm, departments]);

    const handleOpenForm = (department?: Department) => {
        if (department) {
            setEditingDepartment(department);
            setFormData({
                name: department.name,
                isActive: department.isActive,
            });
        } else {
            setEditingDepartment(null);
            setFormData({
                name: "",
                isActive: true,
            });
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingDepartment(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingDepartment
                ? `/api/departments/${editingDepartment.id}`
                : "/api/departments";
            const method = editingDepartment ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                await fetchDepartments();
                handleCloseForm();
            } else {
                const data = await response.json();
                window.alert(data.error || "Failed to save department");
            }
        } catch {
            window.alert("Network error");
        }
    };

    const handleDelete = async (departmentId: number) => {
        setDeleteDepartmentId(departmentId);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteDepartmentId) return;
        try {
            const response = await fetch(`/api/departments/${deleteDepartmentId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                await fetchDepartments();
                setIsDeleteDialogOpen(false);
                setDeleteDepartmentId(null);
            }
        } catch {
            window.alert("Failed to delete department");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedDepartments.size === 0) return;
        if (
            !window.confirm(
                t("departmentManagement.confirmations.bulkDeleteDepartments", {
                    count: selectedDepartments.size,
                })
            )
        )
            return;
        try {
            const response = await fetch("/api/departments/bulk-delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ids: Array.from(selectedDepartments) }),
            });
            if (response.ok) {
                await fetchDepartments();
                setSelectedDepartments(new Set());
            }
        } catch {
            window.alert("Failed to delete departments");
        }
    };

    const toggleDepartmentSelection = (departmentId: number) => {
        const newSelection = new Set(selectedDepartments);
        if (newSelection.has(departmentId)) {
            newSelection.delete(departmentId);
        } else {
            newSelection.add(departmentId);
        }
        setSelectedDepartments(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedDepartments.size === filteredDepartments.length) {
            setSelectedDepartments(new Set());
        } else {
            setSelectedDepartments(new Set(filteredDepartments.map((d) => d.id)));
        }
    };

    const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredDepartments.length);
    const paginatedDepartments = filteredDepartments.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        setSelectedDepartments(new Set());
    };

    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
        setSelectedDepartments(new Set());
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
                        {t("departmentManagement.title")}
                    </h1>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1 glass-blue-card p-3 rounded-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                            <input
                                type="text"
                                placeholder={t("departmentManagement.searchPlaceholder")}
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
                        <span className="hidden sm:inline">
                            {t("departmentManagement.newDepartment")}
                        </span>
                    </button>
                    {selectedDepartments.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="glass-blue-card px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span className="hidden sm:inline">
                                {t("common.actions.bulkDelete")} ({selectedDepartments.size})
                            </span>
                        </button>
                    )}
                </div>

                <div className="glass-blue-card p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-6 h-6 text-purple-600" />
                        <p className="text-sm text-purple-600 font-medium">
                            Showing {startIndex + 1}-{endIndex} of {filteredDepartments.length}{" "}
                            departments
                            {searchTerm && ` (filtered from ${departments.length} total)`}
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
                                                selectedDepartments.size ===
                                                filteredDepartments.length &&
                                                filteredDepartments.length > 0
                                            }
                                            onChange={toggleSelectAll}
                                            className="rounded border-purple-300"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">
                                        {t("departmentManagement.name")}
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
                                {paginatedDepartments.map((department) => (
                                    <tr key={department.id} className="hover:bg-purple-50/50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedDepartments.has(department.id)}
                                                onChange={() =>
                                                    toggleDepartmentSelection(department.id)
                                                }
                                                className="rounded border-purple-300"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-purple-900">
                                                {department.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${department.isActive
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-gray-100 text-gray-800"
                                                    }`}
                                            >
                                                {department.isActive
                                                    ? t("userManagement.active")
                                                    : t("userManagement.inactive")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleOpenForm(department)}
                                                    className="text-purple-600 hover:text-purple-800"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(department.id)}
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
                    {paginatedDepartments.map((department) => (
                        <div
                            key={department.id}
                            className="glass-blue-card p-4 rounded-xl hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedDepartments.has(department.id)}
                                    onChange={() => toggleDepartmentSelection(department.id)}
                                    className="mt-1 rounded border-purple-300"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-purple-900 text-lg">
                                        {department.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${department.isActive
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {department.isActive
                                                ? t("userManagement.active")
                                                : t("userManagement.inactive")}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => handleOpenForm(department)}
                                            className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            {t("common.actions.edit")}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(department.id)}
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

                {filteredDepartments.length === 0 && (
                    <div className="text-center py-12">
                        <Building2 className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                        <p className="text-purple-600">
                            {searchTerm
                                ? t("departmentManagement.emptyStates.noSearchResults")
                                : t("departmentManagement.emptyStates.noDepartments")}
                        </p>
                    </div>
                )}

                {filteredDepartments.length > 0 && (
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
                                    {editingDepartment
                                        ? t("departmentManagement.editDepartment")
                                        : t("departmentManagement.newDepartment")}
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
                                        {t("departmentManagement.name")}
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
                            {t("departmentManagement.deleteDepartment")}
                        </h2>
                        <p className="text-purple-700 mb-6">
                            {t("departmentManagement.confirmations.deleteDepartment")}
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

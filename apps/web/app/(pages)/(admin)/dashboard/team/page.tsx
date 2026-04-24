"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Edit3,
    Loader2,
    MapPin,
    Phone,
    Plus,
    RefreshCcw,
    Search,
    Shield,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import Header from "@/components/admin/Header";
import DataTable, { type DataTableColumn } from "@/components/admin/DataTable";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PhoneNumberInput } from "@/components/auth/PhoneNumberInput";
import { createAdmin, deleteAdmin, getAdmins, updateAdmin } from "@/actions/authActions";
import type {
    CreateAdminInput,
    SerializedAdmin,
    TeamManagedRole,
    UpdateAdminInput,
} from "@/types";

const DEFAULT_PAGE_SIZE = 10;
const ADMINS_FETCH_LIMIT = 500;

type TeamRole = TeamManagedRole;

type AdminFormValues = {
    name: string;
    email: string;
    password: string;
    role: TeamRole;
    phoneNumber: string;
    countryCode: string;
    address: string;
};

type AdminFormPayload = {
    name: string;
    email: string;
    password?: string;
    role: TeamRole;
    phoneNumber?: string;
    address?: string;
};

const INITIAL_FORM_VALUES: AdminFormValues = {
    name: "",
    email: "",
    password: "",
    role: "ADMIN",
    phoneNumber: "",
    countryCode: "+216",
    address: "",
};

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "A";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

function splitPhoneNumber(rawValue: string | null): {
    countryCode: string;
    phoneNumber: string;
} {
    const value = rawValue?.trim() ?? "";

    if (!value) {
        return { countryCode: "+216", phoneNumber: "" };
    }

    const match = value.match(/^(\+\d+)\s*(.*)$/);
    if (!match) {
        return { countryCode: "+216", phoneNumber: value };
    }

    const parsedCode = match[1];
    const parsedPhone = match[2]?.trim() ?? "";

    if (parsedCode !== "+216" && parsedCode !== "+1") {
        return { countryCode: "+216", phoneNumber: value };
    }

    return { countryCode: parsedCode, phoneNumber: parsedPhone };
}

function AdminFormModal({
    open,
    admin,
    isPending,
    onClose,
    onSubmit,
}: {
    open: boolean;
    admin: SerializedAdmin | null;
    isPending: boolean;
    onClose: () => void;
    onSubmit: (payload: AdminFormPayload) => void;
}) {
    const [form, setForm] = useState<AdminFormValues>(INITIAL_FORM_VALUES);

    const isEditing = Boolean(admin);

    useEffect(() => {
        if (!open) return;

        if (admin) {
            const parsedPhone = splitPhoneNumber(admin.phoneNumber);

            setForm({
                name: admin.name,
                email: admin.email,
                password: "",
                role: admin.role,
                phoneNumber: parsedPhone.phoneNumber,
                countryCode: parsedPhone.countryCode,
                address: admin.address || "",
            });
            return;
        }

        setForm(INITIAL_FORM_VALUES);
    }, [open, admin]);

    const canSubmit =
        form.name.trim().length >= 2 &&
        form.email.trim().length >= 5 &&
        (isEditing || form.password.trim().length >= 8);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;

        const payload: AdminFormPayload = {
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            phoneNumber: form.phoneNumber.trim()
                ? (form.countryCode + " " + form.phoneNumber).trim()
                : undefined,
            address: form.address.trim() || undefined,
        };

        if (form.password.trim().length > 0) {
            payload.password = form.password.trim();
        }

        onSubmit(payload);
    };

    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    key="admin-form-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        onClick={(event) => event.stopPropagation()}
                        className="w-full max-w-2xl rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-form-title"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                            <div>
                                <h2 id="admin-form-title" className="text-lg font-bold text-[var(--text-primary)]">
                                    {isEditing ? "Update User" : "Add User"}
                                </h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                                    {isEditing
                                        ? "Edit profile, role, phone and password in one place."
                                        : "Create a new team user. Role defaults to Admin."}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label
                                        htmlFor="admin-name"
                                        className="block text-sm font-medium text-[var(--text-primary)] mb-1"
                                    >
                                        Full Name
                                    </label>
                                    <input
                                        id="admin-name"
                                        type="text"
                                        autoComplete="name"
                                        value={form.name}
                                        onChange={(event) => {
                                            const value = event.currentTarget.value;
                                            setForm((prev) => ({ ...prev, name: value }));
                                        }}
                                        placeholder="User full name"
                                        required
                                        minLength={2}
                                        className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="admin-email"
                                        className="block text-sm font-medium text-[var(--text-primary)] mb-1"
                                    >
                                        Email Address
                                    </label>
                                    <input
                                        id="admin-email"
                                        type="email"
                                        autoComplete="email"
                                        value={form.email}
                                        onChange={(event) => {
                                            const value = event.currentTarget.value;
                                            setForm((prev) => ({ ...prev, email: value }));
                                        }}
                                        placeholder="user@seefood.com"
                                        required
                                        className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="admin-role"
                                        className="block text-sm font-medium text-[var(--text-primary)] mb-1"
                                    >
                                        Role
                                    </label>
                                    <select
                                        id="admin-role"
                                        value={form.role}
                                        onChange={(event) => {
                                            const value = event.currentTarget.value as TeamRole;
                                            setForm((prev) => ({ ...prev, role: value }));
                                        }}
                                        className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    >
                                        <option value="ADMIN">Admin</option>
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <PasswordInput
                                        id="admin-password"
                                        autoComplete={isEditing ? "new-password" : "current-password"}
                                        required={!isEditing}
                                        label={isEditing ? "New Password (Optional)" : "Password"}
                                        placeholder={
                                            isEditing
                                                ? "Leave empty to keep current password"
                                                : "Minimum 8 characters"
                                        }
                                        hint={
                                            isEditing
                                                ? "Only fill this if you want to reset the password."
                                                : "Use a strong password."
                                        }
                                        value={form.password}
                                        onChange={(event) => {
                                            const value = event.currentTarget.value;
                                            setForm((prev) => ({ ...prev, password: value }));
                                        }}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <PhoneNumberInput
                                        formData={form}
                                        setFormData={setForm}
                                        inputId="team-user-phone"
                                        label="Phone Number"
                                        optionalText="Optional"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label
                                        htmlFor="admin-address"
                                        className="block text-sm font-medium text-[var(--text-primary)] mb-1"
                                    >
                                        Address
                                    </label>
                                    <input
                                        id="admin-address"
                                        type="text"
                                        autoComplete="street-address"
                                        value={form.address}
                                        onChange={(event) => {
                                            const value = event.currentTarget.value;
                                            setForm((prev) => ({ ...prev, address: value }));
                                        }}
                                        placeholder="Optional address"
                                        className="w-full px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-3">
                                <button type="button" onClick={onClose} className="btn btn-ghost">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isPending || !canSubmit} className="btn btn-primary">
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : isEditing ? (
                                        <>
                                            <Edit3 className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Create User
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

function DeleteAdminModal({
    open,
    admin,
    isPending,
    onCancel,
    onConfirm,
}: {
    open: boolean;
    admin: SerializedAdmin | null;
    isPending: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <AnimatePresence>
            {open && admin ? (
                <motion.div
                    key="delete-admin-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        onClick={(event) => event.stopPropagation()}
                        className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-admin-title"
                    >
                        <div className="px-6 py-5 border-b border-[var(--border)]">
                            <h2 id="delete-admin-title" className="text-lg font-bold text-[var(--text-primary)]">
                                Delete User
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                This will permanently remove {admin.name} ({admin.role}).
                            </p>
                        </div>

                        <div className="px-6 py-5 text-sm text-[var(--text-secondary)]">
                            This action cannot be undone from the UI. Continue?
                        </div>

                        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg)] flex justify-end gap-3">
                            <button onClick={onCancel} className="btn btn-ghost" disabled={isPending}>
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isPending}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--danger)] text-white font-semibold hover:opacity-90 disabled:opacity-60"
                            >
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

export default function TeamPage() {
    const [admins, setAdmins] = useState<SerializedAdmin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const [showFormModal, setShowFormModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<SerializedAdmin | null>(null);
    const [adminToDelete, setAdminToDelete] = useState<SerializedAdmin | null>(null);

    const [isPending, startTransition] = useTransition();

    const fetchAdmins = useCallback(async (showLoader = false) => {
        if (showLoader) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            const result = await getAdmins({ limit: ADMINS_FETCH_LIMIT });

            if (result.success && result.data) {
                setAdmins(result.data);
            } else {
                toast.error(result.error || "Failed to load users");
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
            toast.error("Failed to load users");
        } finally {
            if (showLoader) {
                setIsLoading(false);
            } else {
                setIsRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchAdmins(true);
    }, [fetchAdmins]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const filteredAdmins = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return admins;

        return admins.filter((admin) => {
            return (
                admin.name.toLowerCase().includes(term) ||
                admin.email.toLowerCase().includes(term) ||
                admin.role.toLowerCase().includes(term) ||
                (admin.phoneNumber || "").toLowerCase().includes(term) ||
                (admin.address || "").toLowerCase().includes(term)
            );
        });
    }, [admins, search]);

    const stats = useMemo(() => {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

        return {
            total: admins.length,
            superAdmins: admins.filter((admin) => admin.role === "SUPER_ADMIN").length,
            withPhone: admins.filter((admin) => Boolean(admin.phoneNumber)).length,
            joinedThisMonth: admins.filter(
                (admin) => new Date(admin.createdAt).getTime() >= thirtyDaysAgo,
            ).length,
        };
    }, [admins]);

    const openCreateModal = () => {
        setEditingAdmin(null);
        setShowFormModal(true);
    };

    const openEditModal = (admin: SerializedAdmin) => {
        setEditingAdmin(admin);
        setShowFormModal(true);
    };

    const closeFormModal = () => {
        setShowFormModal(false);
        setEditingAdmin(null);
    };

    const handleSubmitAdmin = (payload: AdminFormPayload) => {
        startTransition(async () => {
            const result = editingAdmin
                ? await updateAdmin({
                    id: editingAdmin.id,
                    name: payload.name,
                    email: payload.email,
                    role: payload.role,
                    phoneNumber: payload.phoneNumber,
                    address: payload.address,
                    password: payload.password,
                } satisfies UpdateAdminInput)
                : await createAdmin({
                    name: payload.name,
                    email: payload.email,
                    role: payload.role,
                    password: payload.password || "",
                    phoneNumber: payload.phoneNumber,
                    address: payload.address,
                } satisfies CreateAdminInput);

            if (!result.success) {
                toast.error(result.error || "Unable to save user");
                return;
            }

            toast.success(editingAdmin ? "User updated successfully" : "User created successfully");
            closeFormModal();
            await fetchAdmins(false);
        });
    };

    const handleDeleteConfirm = () => {
        if (!adminToDelete) return;

        startTransition(async () => {
            const result = await deleteAdmin(adminToDelete.id);

            if (!result.success) {
                toast.error(result.error || "Unable to delete user");
                return;
            }

            toast.success("User deleted successfully");
            setAdminToDelete(null);
            await fetchAdmins(false);
        });
    };

    const columns: DataTableColumn<SerializedAdmin>[] = useMemo(
        () => [
            {
                id: "admin",
                header: "User",
                headerClassName: "min-w-[240px]",
                render: (admin) => (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-sm font-bold">
                            {getInitials(admin.name)}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-[var(--text-primary)] truncate">{admin.name}</p>
                            <p className="text-sm text-[var(--text-secondary)] truncate">{admin.email}</p>
                        </div>
                    </div>
                ),
            },
            {
                id: "role",
                header: "Role",
                headerClassName: "min-w-[130px]",
                render: (admin) => (
                    <span
                        className={
                            "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold " +
                            (admin.role === "SUPER_ADMIN"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-sky-100 text-sky-800")
                        }
                    >
                        {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                    </span>
                ),
            },
            {
                id: "contact",
                header: "Contact",
                headerClassName: "min-w-[260px]",
                render: (admin) => (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <Phone className="w-4 h-4" />
                            <span>{admin.phoneNumber || "No phone number"}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                            <MapPin className="w-4 h-4 mt-0.5" />
                            <span className="line-clamp-2">{admin.address || "No address"}</span>
                        </div>
                    </div>
                ),
            },
            {
                id: "joined",
                header: "Joined",
                headerClassName: "min-w-[130px]",
                render: (admin) => (
                    <span className="text-sm text-[var(--text-secondary)]">{formatDate(admin.createdAt)}</span>
                ),
            },
            {
                id: "actions",
                header: "Actions",
                headerClassName: "min-w-[140px]",
                render: (admin) => (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => openEditModal(admin)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] disabled:opacity-60"
                            aria-label={"Edit " + admin.name}
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                        </button>
                        <button
                            onClick={() => setAdminToDelete(admin)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-light)] disabled:opacity-60"
                            aria-label={"Delete " + admin.name}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                        </button>
                    </div>
                ),
            },
        ],
        [isPending],
    );

    return (
        <div className="overflow-hidden p-6">
            <Header
                title="Team Management"
                description="Create, update, and remove admins and super admins with minimal clicks."
                rightContent={
                    <button onClick={openCreateModal} className="btn btn-primary">
                        <Plus className="w-4 h-4" />
                        Add User
                    </button>
                }
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                            <Users className="w-4 h-4" />
                            Total Users
                        </div>
                        <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.total}</p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                            <Shield className="w-4 h-4" />
                            Super Admins
                        </div>
                        <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                            {stats.superAdmins}
                        </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                            <Phone className="w-4 h-4" />
                            With Phone Number
                        </div>
                        <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.withPhone}</p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                            <Plus className="w-4 h-4" />
                            Joined (30 days)
                        </div>
                        <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                            {stats.joinedThisMonth}
                        </p>
                    </div>
                </div>
            </Header>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => {
                                const value = event.currentTarget.value;
                                setSearch(value);
                            }}
                            placeholder="Search by name, email, role, phone, or address..."
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            aria-label="Search users"
                        />
                    </div>

                    <button
                        onClick={() => {
                            void fetchAdmins(false);
                        }}
                        disabled={isRefreshing || isPending}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] disabled:opacity-60"
                    >
                        {isRefreshing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCcw className="w-4 h-4" />
                        )}
                        Refresh
                    </button>
                </div>
            </div>

            <DataTable
                data={filteredAdmins}
                columns={columns}
                rowKey={(admin) => admin.id}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                loading={isLoading}
                maxBodyHeightClass="max-h-[calc(100vh-370px)]"
                emptyState={
                    <div className="py-8 text-center">
                        <Users className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                        <p className="text-sm text-[var(--text-secondary)] font-medium">No users found</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Add your first team user to start managing access.
                        </p>
                    </div>
                }
            />

            <AdminFormModal
                open={showFormModal}
                admin={editingAdmin}
                isPending={isPending}
                onClose={closeFormModal}
                onSubmit={handleSubmitAdmin}
            />

            <DeleteAdminModal
                open={Boolean(adminToDelete)}
                admin={adminToDelete}
                isPending={isPending}
                onCancel={() => setAdminToDelete(null)}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    );
}

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getContactSubmissions,
  markContactAsRead,
  markContactAsUnread,
  deleteContactSubmission,
} from "@/actions/contactActions";
import type {
  ContactFilterType,
  ContactSortType,
  ContactSubmission,
} from "@/types";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Header from "@/components/admin/Header";
import { toast } from "react-hot-toast";


const CONTACTS_PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
const DEFAULT_CONTACTS_PAGE_SIZE = 20;

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ContactFilterType>("all");
  const [sort, setSort] = useState<ContactSortType>("newest");
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] =
    useState<ContactSubmission | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );

  const [contactsPage, setContactsPage] = useState(1);
  const [contactsPageSize, setContactsPageSize] = useState(
    DEFAULT_CONTACTS_PAGE_SIZE,
  );

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const result = await getContactSubmissions();

    if (result.success && result.data) {
      setContacts(result.data);
    } else {
      toast.error(result.error || "Failed to load contacts");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = useMemo(() => {
    let list = [...contacts];

    if (filter === "unread") list = list.filter((c) => !c.isRead);
    if (filter === "read") list = list.filter((c) => c.isRead);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.subject && c.subject.toLowerCase().includes(q)) ||
          c.message.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sort === "newest" ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [contacts, filter, sort, search]);

  const stats = useMemo(
    () => ({
      total: contacts.length,
      unread: contacts.filter((c) => !c.isRead).length,
      read: contacts.filter((c) => c.isRead).length,
    }),
    [contacts],
  );

  useEffect(() => {
    setContactsPage(1);
  }, [filter, sort, search]);

  const totalContactPages = useMemo(
    () => Math.max(1, Math.ceil(filteredContacts.length / contactsPageSize)),
    [filteredContacts.length, contactsPageSize],
  );

  useEffect(() => {
    if (contactsPage > totalContactPages) {
      setContactsPage(totalContactPages);
    }
  }, [contactsPage, totalContactPages]);

  const paginatedContacts = useMemo(() => {
    const start = (contactsPage - 1) * contactsPageSize;
    return filteredContacts.slice(start, start + contactsPageSize);
  }, [filteredContacts, contactsPage, contactsPageSize]);

  const canGoPrev = contactsPage > 1;
  const canGoNext = contactsPage < totalContactPages;

  const showingFrom =
    filteredContacts.length === 0
      ? 0
      : (contactsPage - 1) * contactsPageSize + 1;

  const showingTo =
    filteredContacts.length === 0
      ? 0
      : Math.min(contactsPage * contactsPageSize, filteredContacts.length);

  useEffect(() => {
    if (!selectedContact) return;

    const refreshedSelectedContact = contacts.find(
      (contact) => contact.id === selectedContact.id,
    );

    if (!refreshedSelectedContact) {
      setSelectedContact(null);
      return;
    }

    if (refreshedSelectedContact !== selectedContact) {
      setSelectedContact(refreshedSelectedContact);
    }
  }, [contacts, selectedContact]);

  const handleToggleRead = async (contact: ContactSubmission) => {
    const action = contact.isRead ? markContactAsUnread : markContactAsRead;
    const result = await action(contact.id);

    if (result.success) {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contact.id ? { ...c, isRead: !c.isRead } : c,
        ),
      );

      if (selectedContact?.id === contact.id) {
        setSelectedContact({ ...contact, isRead: !contact.isRead });
      }

      toast.success(contact.isRead ? "Marked as unread" : "Marked as read");
    } else {
      toast.error(result.error || "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteContactSubmission(id);

    if (result.success) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (selectedContact?.id === id) setSelectedContact(null);
      toast.success("Contact deleted");
    } else {
      toast.error(result.error || "Failed to delete");
    }

    setDeletingId(null);
    setShowDeleteConfirm(null);
  };

  const handleSelectContact = async (contact: ContactSubmission) => {
    setSelectedContact(contact);

    if (!contact.isRead) {
      const result = await markContactAsRead(contact.id);
      if (result.success) {
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, isRead: true } : c)),
        );
        setSelectedContact({ ...contact, isRead: true });
      }
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const formatFullDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSubjectColor = (subject: string | null) => {
    if (!subject) {
      return {
        bg: "var(--color-neutral-100)",
        text: "var(--color-neutral-600)",
      };
    }

    const s = subject.toLowerCase();

    if (s.includes("wholesale") || s.includes("export")) {
      return { bg: "#fffbeb", text: "#92400e" };
    }

    if (s.includes("order") && s.includes("issue")) {
      return { bg: "#fef2f2", text: "#dc2626" };
    }

    if (s.includes("restaurant")) {
      return { bg: "#f0fdf4", text: "#16a34a" };
    }

    if (s.includes("product")) {
      return { bg: "#eff6ff", text: "var(--color-primary-600)" };
    }

    if (s.includes("technical")) {
      return { bg: "#fdf4ff", text: "#9333ea" };
    }

    return { bg: "var(--color-primary-50)", text: "var(--color-primary-700)" };
  };

  const getUserTypeBadge = (userType: string | null) => {
    switch (userType) {
      case "INDIVIDUAL":
        return {
          label: "🧑 Individual",
          bg: "#eff6ff",
          text: "var(--color-primary-600)",
        };
      case "RESTAURANT":
        return { label: "🍽️ Restaurant", bg: "#f0fdf4", text: "#16a34a" };
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="overflow-hidden p-6" >
      {/* Header */}
      <Header
        title="Contact Submissions"
        description="Manage customer inquiries and wholesale requests"
        descriptionClassName="text-sm text-[var(--color-neutral-500)] mt-0.5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Unread", value: stats.unread },
            { label: "Read", value: stats.read },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3 shadow-sm"
            >
              <p className="text-2xl font-bold text-[var(--color-neutral-800)] leading-none">
                {stat.value}
              </p>
              <p className="text-xs text-[var(--color-neutral-500)] mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </Header>

      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center my-4 gap-3 p-4 rounded-2xl border"
        style={{
          background: "white",
          borderColor: "var(--color-neutral-200)",
        }}
      >
        <div className="relative flex-1 min-w-[240px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-neutral-400)" }}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, subject, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
            style={{
              border: "2px solid var(--color-neutral-200)",
              color: "var(--color-neutral-800)",
              background: "var(--color-neutral-50)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--color-primary-400)";
              e.target.style.boxShadow = "0 0 0 4px rgba(3, 105, 161, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--color-neutral-200)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <div
          className="flex items-center rounded-xl overflow-hidden border"
          style={{ borderColor: "var(--color-neutral-200)" }}
        >
          {(["all", "unread", "read"] as ContactFilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2.5 text-sm font-medium transition-all duration-200 capitalize"
              style={{
                background: filter === f ? "#0ea5e9" : "white",
                color: filter === f ? "white" : "var(--color-neutral-600)",
              }}
            >
              {f}
              {f === "unread" && stats.unread > 0 && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background:
                      filter === f ? "rgba(255,255,255,0.25)" : "#f0f9ff",
                    color: filter === f ? "white" : "#0ea5e9",
                  }}
                >
                  {stats.unread}
                </span>
              )}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as ContactSortType)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer transition-all duration-200"
          style={{
            border: "2px solid var(--color-neutral-200)",
            color: "var(--color-neutral-700)",
            background: "white",
          }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>

        <button
          onClick={fetchContacts}
          className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105"
          style={{
            border: "2px solid var(--color-neutral-200)",
            color: "var(--color-neutral-600)",
            background: "white",
          }}
          title="Refresh"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "white",
              borderColor: "var(--color-neutral-200)",
            }}
          >
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 border-b"
                  style={{ borderColor: "var(--color-neutral-100)" }}
                >
                  <div className="flex items-start gap-3 animate-pulse">
                    <div
                      className="w-10 h-10 rounded-full"
                      style={{ background: "var(--color-neutral-200)" }}
                    />
                    <div className="flex-1 space-y-2">
                      <div
                        className="h-4 rounded w-1/2"
                        style={{ background: "var(--color-neutral-200)" }}
                      />
                      <div
                        className="h-3 rounded w-1/3"
                        style={{ background: "var(--color-neutral-100)" }}
                      />
                      <div
                        className="h-3 rounded w-11/12"
                        style={{ background: "var(--color-neutral-100)" }}
                      />
                      <div
                        className="h-3 rounded w-2/3"
                        style={{ background: "var(--color-neutral-100)" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl border overflow-hidden min-h-[500px] p-6"
            style={{
              background: "white",
              borderColor: "var(--color-neutral-200)",
            }}
          >
            <div className="animate-pulse space-y-4">
              <div
                className="h-6 rounded w-1/3"
                style={{ background: "var(--color-neutral-200)" }}
              />
              <div
                className="h-4 rounded w-2/3"
                style={{ background: "var(--color-neutral-100)" }}
              />
              <div
                className="h-48 rounded-xl"
                style={{ background: "var(--color-neutral-100)" }}
              />
              <div
                className="h-4 rounded w-full"
                style={{ background: "var(--color-neutral-100)" }}
              />
              <div
                className="h-4 rounded w-5/6"
                style={{ background: "var(--color-neutral-100)" }}
              />
            </div>
          </div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border"
          style={{
            background: "white",
            borderColor: "var(--color-neutral-200)",
          }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: "#f0f9ff" }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#0ea5e9" }}
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h3
            className="text-lg font-semibold mb-1"
            style={{ color: "var(--color-neutral-800)" }}
          >
            {search ? "No matching contacts" : "No contacts yet"}
          </h3>
          <p
            className="text-sm"
            style={{ color: "var(--color-neutral-500)" }}
          >
            {search
              ? "Try adjusting your search or filters"
              : "Contact submissions will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
          {/* Contact List */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "white",
              borderColor: "var(--color-neutral-200)",
            }}
          >
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
              {paginatedContacts.map((contact) => {
                const subjectStyle = getSubjectColor(contact.subject);
                const isSelected = selectedContact?.id === contact.id;

                return (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="w-full text-left p-4 border-b transition-all duration-200 hover:bg-opacity-50"
                    style={{
                      borderColor: "var(--color-neutral-100)",
                      background: isSelected
                        ? "#f0f9ff"
                        : contact.isRead
                          ? "white"
                          : "#fffbeb",
                      borderLeft: isSelected
                        ? "3px solid #0ea5e9"
                        : "3px solid transparent",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                        style={{
                          background: contact.isRead
                            ? "var(--color-neutral-100)"
                            : "#e0f2fe",
                          color: contact.isRead
                            ? "var(--color-neutral-600)"
                            : "#0ea5e9",
                        }}
                      >
                        {contact.user?.profileImage ? (
                          <img
                            src={contact.user.profileImage}
                            alt={contact.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(contact.name)
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p
                            className={`text-sm truncate ${!contact.isRead ? "font-bold" : "font-medium"}`}
                            style={{ color: "var(--color-neutral-900)" }}
                          >
                            {contact.name}
                          </p>
                          <span
                            className="text-xs flex-shrink-0"
                            style={{ color: "var(--color-neutral-400)" }}
                          >
                            {formatDate(contact.createdAt)}
                          </span>
                        </div>

                        {contact.subject && (
                          <span
                            className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1"
                            style={{
                              background: subjectStyle.bg,
                              color: subjectStyle.text,
                            }}
                          >
                            {contact.subject}
                          </span>
                        )}

                        <p
                          className="text-xs line-clamp-2"
                          style={{ color: "var(--color-neutral-500)" }}
                        >
                          {contact.message}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-neutral-400)" }}
                          >
                            {contact.email}
                          </span>
                          {!contact.isRead && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: "#0ea5e9" }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              className="border-t px-4 py-3 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: "var(--color-neutral-200)" }}
            >
              <p
                className="text-xs sm:text-sm"
                style={{ color: "var(--color-neutral-500)" }}
              >
                Showing {showingFrom} - {showingTo} of {filteredContacts.length}
              </p>

              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-2 text-xs sm:text-sm"
                  style={{ color: "var(--color-neutral-600)" }}
                >
                  Rows
                  <select
                    value={contactsPageSize}
                    onChange={(e) => {
                      setContactsPageSize(Number(e.target.value));
                      setContactsPage(1);
                    }}
                    className="px-2 py-1 rounded-lg border bg-white outline-none"
                    style={{ borderColor: "var(--color-neutral-300)" }}
                  >
                    {CONTACTS_PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setContactsPage((prev) => Math.max(1, prev - 1))}
                    disabled={!canGoPrev}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--color-neutral-300)" }}
                    aria-label="Previous page"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  <span
                    className="text-xs sm:text-sm font-medium min-w-16 text-center"
                    style={{ color: "var(--color-neutral-700)" }}
                  >
                    {contactsPage} / {totalContactPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setContactsPage((prev) =>
                        Math.min(totalContactPages, prev + 1),
                      )
                    }
                    disabled={!canGoNext}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--color-neutral-300)" }}
                    aria-label="Next page"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "white",
              borderColor: "var(--color-neutral-200)",
            }}
          >
            {selectedContact ? (
              <div className="h-full flex flex-col">
                <div
                  className="px-6 py-5 border-b"
                  style={{ borderColor: "var(--color-neutral-100)" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
                        style={{
                          background: "#e0f2fe",
                          color: "#0ea5e9",
                        }}
                      >
                        {selectedContact.user?.profileImage ? (
                          <img
                            src={selectedContact.user.profileImage}
                            alt={selectedContact.name}
                            className="w-full h-full rounded-2xl object-cover"
                          />
                        ) : (
                          getInitials(selectedContact.name)
                        )}
                      </div>
                      <div>
                        <h3
                          className="text-lg font-bold"
                          style={{ color: "var(--color-neutral-900)" }}
                        >
                          {selectedContact.name}
                        </h3>
                        <a
                          href={`mailto:${selectedContact.email}`}
                          className="text-sm hover:underline transition-colors"
                          style={{ color: "#0ea5e9" }}
                        >
                          {selectedContact.email}
                        </a>
                        <div className="flex items-center gap-2 mt-1">
                          {selectedContact.user &&
                            (() => {
                              const badge = getUserTypeBadge(
                                selectedContact.user.userType,
                              );
                              if (!badge) return null;
                              return (
                                <span
                                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{
                                    background: badge.bg,
                                    color: badge.text,
                                  }}
                                >
                                  {badge.label}
                                </span>
                              );
                            })()}
                          {selectedContact.user && (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                background: "var(--color-neutral-100)",
                                color: "var(--color-neutral-600)",
                              }}
                            >
                              {selectedContact.user.role.replace("_", " ")}
                            </span>
                          )}
                          {!selectedContact.user && (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                background: "var(--color-neutral-100)",
                                color: "var(--color-neutral-500)",
                              }}
                            >
                              Guest
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleRead(selectedContact)}
                        className="p-2 rounded-xl transition-all duration-200 hover:scale-105"
                        style={{
                          border: "1.5px solid var(--color-neutral-200)",
                          color: selectedContact.isRead
                            ? "var(--color-neutral-500)"
                            : "#0ea5e9",
                          background: "white",
                        }}
                        title={
                          selectedContact.isRead
                            ? "Mark as unread"
                            : "Mark as read"
                        }
                      >
                        {selectedContact.isRead ? (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>

                      <a
                        href={`mailto:${selectedContact.email}?subject=Re: ${selectedContact.subject || "Your inquiry"}`}
                        className="p-2 rounded-xl transition-all duration-200 hover:scale-105"
                        style={{
                          border: "1.5px solid #bae6fd",
                          color: "#0ea5e9",
                          background: "#f0f9ff",
                        }}
                        title="Reply via email"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 17 4 12 9 7" />
                          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                        </svg>
                      </a>

                      {showDeleteConfirm === selectedContact.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(selectedContact.id)}
                            disabled={deletingId === selectedContact.id}
                            className="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50"
                            style={{ background: "#dc2626" }}
                          >
                            {deletingId === selectedContact.id
                              ? "..."
                              : "Confirm"}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="p-2 rounded-xl transition-all duration-200"
                            style={{
                              border: "1.5px solid var(--color-neutral-200)",
                              color: "var(--color-neutral-500)",
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setShowDeleteConfirm(selectedContact.id)
                          }
                          className="p-2 rounded-xl transition-all duration-200 hover:scale-105"
                          style={{
                            border: "1.5px solid #fecaca",
                            color: "#dc2626",
                            background: "#fef2f2",
                          }}
                          title="Delete"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    {selectedContact.subject &&
                      (() => {
                        const style = getSubjectColor(
                          selectedContact.subject,
                        );
                        return (
                          <span
                            className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full"
                            style={{
                              background: style.bg,
                              color: style.text,
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                              <line x1="7" y1="7" x2="7.01" y2="7" />
                            </svg>
                            {selectedContact.subject}
                          </span>
                        );
                      })()}

                    <span
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
                      style={{
                        background: "var(--color-neutral-100)",
                        color: "var(--color-neutral-600)",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {formatFullDate(selectedContact.createdAt)}
                    </span>

                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
                      style={{
                        background: selectedContact.isRead
                          ? "#f0fdf4"
                          : "#fffbeb",
                        color: selectedContact.isRead ? "#16a34a" : "#92400e",
                      }}
                    >
                      {selectedContact.isRead ? (
                        <>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Read
                        </>
                      ) : (
                        <>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: "#d4a853" }}
                          />
                          Unread
                        </>
                      )}
                    </span>
                  </div>

                  <div
                    className="rounded-2xl p-6 border"
                    style={{
                      background: "var(--color-neutral-50)",
                      borderColor: "var(--color-neutral-200)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: "var(--color-neutral-400)" }}
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-neutral-400)" }}
                      >
                        Message
                      </span>
                    </div>
                    <p
                      className="text-[0.95rem] leading-relaxed whitespace-pre-wrap"
                      style={{ color: "var(--color-neutral-800)" }}
                    >
                      {selectedContact.message}
                    </p>
                  </div>

                  <div className="mt-6">
                    <PrimaryButton
                      as="a"
                      href={`mailto:${selectedContact.email}?subject=Re: ${selectedContact.subject || "Your inquiry to Seefood"}&body=%0A%0A──────────────────%0AOriginal message from ${selectedContact.name}:%0A${encodeURIComponent(selectedContact.message)}`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Reply to {selectedContact.name.split(" ")[0]}
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "#f0f9ff" }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "#7dd3fc" }}
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h3
                  className="text-lg font-semibold mb-1"
                  style={{ color: "var(--color-neutral-700)" }}
                >
                  Select a message
                </h3>
                <p
                  className="text-sm max-w-xs text-center"
                  style={{ color: "var(--color-neutral-400)" }}
                >
                  Choose a contact submission from the list to view its
                  details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
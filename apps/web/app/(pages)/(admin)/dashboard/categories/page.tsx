"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "@/actions/categoriesAction";
import { SerializedCategory, CreateCategoryInput } from "@/types";
import Uploader from "@/components/admin/Uploader";
import Header from "@/components/admin/Header";
import PrimaryButton from "@/components/ui/PrimaryButton";

// ── Category Form Modal ───────────────────────────────────────────────────────

type CategoryFormData = {
  name: string;
  slug: string;
  description: string;
  image: string;
  order: number;
  isActive: boolean;
};

function CategoryFormModal({
  category,
  onClose,
  onSuccess,
}: {
  category?: SerializedCategory;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: category?.name || "",
    slug: category?.slug || "",
    description: category?.description || "",
    image: category?.image || "",
    order: category?.order || 0,
    isActive: category?.isActive ?? true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!category;

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditing && formData.name) {
      const slug = formData.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.name, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const input: CreateCategoryInput = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        image: formData.image || undefined,
        order: formData.order,
        isActive: formData.isActive,
      };

      const result = isEditing
        ? await updateCategory({ id: category.id, ...input })
        : await createCategory(input);

      if (!result.success) {
        throw new Error(result.error);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Edit Category" : "Add New Category"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              URL-friendly version of the name
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Image
            </label>

            {formData.image ? (
              <div className="space-y-3">
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-300">
                  <Image
                    src={formData.image}
                    alt="Category preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Uploader
                    handleUploadComplete={(res) => {
                      if (res && res.length > 0) {
                        setFormData({ ...formData, image: res[0].url });
                      }
                    }}
                    value={null}
                    buttonText="Change Image"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: "" })}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-3">
                  Upload a category image
                </p>
                <Uploader
                  handleUploadComplete={(res) => {
                    if (res && res.length > 0) {
                      setFormData({ ...formData, image: res[0].url });
                    }
                  }}
                  value={formData.image}
                  buttonText="Upload Image"
                />
              </div>
            )}
          </div>

          {/* Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) =>
                setFormData({ ...formData, order: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Is Active */}
          <div className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="isActive"
              className="text-sm font-medium text-gray-700"
            >
              Active
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <PrimaryButton
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="flex-1 items-center gap-2 px-4 py-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? "Update" : "Create"}
            </PrimaryButton>

          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<SerializedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    SerializedCategory | undefined
  >();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch ALL categories once on mount
  const fetchCategories = async () => {
    setIsLoading(true);
    const result = await getCategories({
      sortBy: "order",
      sortOrder: "asc",
    });
    setCategories(result.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Client-side filtering (same pattern as products page)
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const term = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.slug.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term),
    );
  }, [categories, searchQuery]);

  const handleEdit = (category: SerializedCategory) => {
    setEditingCategory(category);
    setShowFormModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    setDeletingId(id);
    const result = await deleteCategory(id);
    setDeletingId(null);

    if (result.success) {
      fetchCategories();
    } else {
      alert(result.error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    await toggleCategoryStatus(id);
    fetchCategories();
  };

  const handleFormSuccess = () => {
    fetchCategories();
    setEditingCategory(undefined);
  };

  const handleCloseModal = () => {
    setShowFormModal(false);
    setEditingCategory(undefined);
  };

  return (
    <div className="p-6 mx-auto">
      {/* Header */}
      <Header
        className="mb-8"
        title="Categories"
        description="Manage your product categories"
      />

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Add Button */}
        <PrimaryButton
          as="button"
          onClick={() => setShowFormModal(true)}
          variant="primary"
          className="flex items-center gap-2 px-4 py-2"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </PrimaryButton>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse flex flex-col"
            >
              <div className="aspect-video bg-gray-200 rounded-lg mb-3" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-9 bg-gray-200 rounded mt-auto" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No categories found</p>
          <PrimaryButton
            onClick={() => setShowFormModal(true)}
            variant="primary"
            className="flex-1 items-center gap-2 px-4 py-2"
          >
            Add Your First Category
          </PrimaryButton>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No categories match your search</p>
          <p className="text-sm text-gray-500">
            Try adjusting your search terms
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCategories.map((category) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow flex flex-col"
            >
              {/* Image */}
              <div className="relative aspect-video bg-gray-100">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                {!category.isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full">
                      Inactive
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {category.name}
                </h3>
                <p className="text-xs text-gray-500 mb-2">/{category.slug}</p>
                {category.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {category.description}
                  </p>
                )}

                {/* Actions - mt-auto pushes to bottom */}
                <div className="flex items-center gap-2 mt-auto pt-3">
                  <button
                    onClick={() => handleToggleStatus(category.id)}
                    className={`flex-1 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${category.isActive
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    {category.isActive ? (
                      <Eye className="w-4 h-4 inline mr-1" />
                    ) : (
                      <EyeOff className="w-4 h-4 inline mr-1" />
                    )}
                    {category.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit category"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    disabled={deletingId === category.id}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete category"
                  >
                    {deletingId === category.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <CategoryFormModal
            category={editingCategory}
            onClose={handleCloseModal}
            onSuccess={handleFormSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

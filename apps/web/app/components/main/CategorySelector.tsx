"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Check, Layers } from "lucide-react";
import { getCategories } from "@/actions/categoriesAction";
import { SerializedCategory } from "@/types";

type CategorySelectorProps = {
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
};

export default function CategorySelector({
  selectedCategoryId,
  onCategoryChange,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<SerializedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const result = await getCategories({
        isActive: true,
        sortBy: "order",
        sortOrder: "asc",
      });
      setCategories(result.data || []);
      setIsLoading(false);
    };

    fetchCategories();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-5 bg-[var(--bg-muted)] rounded w-32 animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 bg-[var(--bg-muted)] rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Categories
      </h3>

      {/* All Categories Option */}
      <button
        onClick={() => onCategoryChange(null)}
        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedCategoryId === null
          ? "border-[var(--primary)] bg-[var(--primary-light)]"
          : "border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--bg-card)]"
          }`}
      >
        <div className="flex-1 text-left">
          <div
            className={`font-medium ${selectedCategoryId === null
              ? "text-[var(--primary)]"
              : "text-[var(--text-primary)]"
              }`}
          >
            All Products
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            View all available products
          </div>
        </div>
        {selectedCategoryId === null && (
          <Check className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />
        )}
      </button>

      {/* Category List */}
      <div className="space-y-2">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedCategoryId === category.id
              ? "border-[var(--primary)] bg-[var(--primary-light)]"
              : "border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--bg-card)]"
              }`}
          >
            {/* Category Image */}
            {category.image && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--bg-muted)]">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Category Info */}
            <div className="flex-1 text-left">
              <div
                className={`font-medium ${selectedCategoryId === category.id
                  ? "text-[var(--primary)]"
                  : "text-[var(--text-primary)]"
                  }`}
              >
                {category.name}
              </div>
              {category.description && (
                <div className="text-xs text-[var(--text-muted)] line-clamp-1">
                  {category.description}
                </div>
              )}
            </div>

            {/* Check Icon */}
            {selectedCategoryId === category.id && (
              <Check className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

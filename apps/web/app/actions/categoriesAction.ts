"use server";

import { db, Prisma } from "@monkeyprint/db";
import { revalidatePath } from "next/cache";
import type {
  CreateCategoryInput,
  GetCategoriesOptions,
  SerializedCategory,
  UpdateCategoryInput,
} from "@/types";


const CATEGORY_REVALIDATION_PATHS = [
  "/products",
  "/dashboard/products",
  "/dashboard/categories",
] as const;

type CategoryRecord = Prisma.CategoryGetPayload<{}>;

function revalidateCategoryPaths() {
  for (const path of CATEGORY_REVALIDATION_PATHS) {
    revalidatePath(path);
  }
}

function serializeCategory(category: CategoryRecord): SerializedCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    order: category.order,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function generateSlug(rawValue: string): string {
  return rawValue
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeLimit(value: number | undefined, fallback = 50, max = 200): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), max);
}

function sanitizeOffset(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(Math.trunc(value), 0);
}

// ──────────────────────────────────────────────
// GET Categories
// ──────────────────────────────────────────────

export async function getCategories(options: GetCategoriesOptions = {}) {
  try {
    const limit = sanitizeLimit(options.limit, 50, 500);
    const offset = sanitizeOffset(options.offset);
    const searchTerm = options.search?.trim();

    const sortBy = options.sortBy ?? "order";
    const sortOrder = options.sortOrder ?? "asc";

    const where: Prisma.CategoryWhereInput = {};

    if (typeof options.isActive === "boolean") {
      where.isActive = options.isActive;
    }

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const [categories, total] = await Promise.all([
      db.category.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      db.category.count({ where }),
    ]);

    return { success: true, data: categories.map(serializeCategory), total };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {
      success: false,
      error: "Failed to fetch categories",
      data: [] as SerializedCategory[],
      total: 0,
    };
  }
}

export async function getCategoryBySlug(slug: string) {
  try {
    const normalizedSlug = generateSlug(slug);
    if (!normalizedSlug) {
      return { success: false, error: "Category slug is invalid" };
    }

    const category = await db.category.findUnique({
      where: { slug: normalizedSlug },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    return { success: true, data: serializeCategory(category) };
  } catch (error) {
    console.error("Error fetching category by slug:", error);
    return { success: false, error: "Failed to fetch category" };
  }
}

export async function getCategoryById(id: string) {
  try {
    const category = await db.category.findUnique({
      where: { id },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    return { success: true, data: serializeCategory(category) };
  } catch (error) {
    console.error("Error fetching category by id:", error);
    return { success: false, error: "Failed to fetch category" };
  }
}

// ──────────────────────────────────────────────
// CREATE Category
// ──────────────────────────────────────────────

export async function createCategory(input: CreateCategoryInput) {
  try {
    const normalizedName = input.name.trim();
    if (!normalizedName) {
      return { success: false, error: "Category name is required" };
    }

    const slug = generateSlug(input.slug ?? normalizedName);
    if (!slug) {
      return { success: false, error: "Category slug is invalid" };
    }

    const existingCategory = await db.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingCategory) {
      return {
        success: false,
        error: "A category with this slug already exists",
      };
    }

    const category = await db.category.create({
      data: {
        name: normalizedName,
        slug,
        description: input.description?.trim() || null,
        image: input.image?.trim() || null,
        order:
          typeof input.order === "number" && Number.isFinite(input.order)
            ? Math.max(0, Math.trunc(input.order))
            : 0,
        isActive: input.isActive ?? true,
      },
    });

    revalidateCategoryPaths();

    return { success: true, data: serializeCategory(category) };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: "Failed to create category" };
  }
}

// ──────────────────────────────────────────────
// UPDATE Category
// ──────────────────────────────────────────────

export async function updateCategory(input: UpdateCategoryInput) {
  try {
    const { id, ...data } = input;

    const updateData: Prisma.CategoryUpdateInput = {};

    if (data.name !== undefined) {
      const normalizedName = data.name.trim();
      if (!normalizedName) {
        return { success: false, error: "Category name cannot be empty" };
      }
      updateData.name = normalizedName;
    }

    const slugSource =
      data.slug !== undefined
        ? data.slug
        : data.name !== undefined
          ? data.name
          : undefined;

    if (slugSource !== undefined) {
      const nextSlug = generateSlug(slugSource);
      if (!nextSlug) {
        return { success: false, error: "Category slug is invalid" };
      }

      const existingCategory = await db.category.findFirst({
        where: {
          slug: nextSlug,
          NOT: { id },
        },
        select: { id: true },
      });

      if (existingCategory) {
        return {
          success: false,
          error: "A category with this slug already exists",
        };
      }

      updateData.slug = nextSlug;
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.image !== undefined) {
      updateData.image = data.image?.trim() || null;
    }

    if (data.order !== undefined) {
      updateData.order = Number.isFinite(data.order)
        ? Math.max(0, Math.trunc(data.order))
        : 0;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const category = await db.category.update({
      where: { id },
      data: updateData,
    });

    revalidateCategoryPaths();

    return { success: true, data: serializeCategory(category) };
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false, error: "Failed to update category" };
  }
}

// ──────────────────────────────────────────────
// DELETE Category
// ──────────────────────────────────────────────

export async function deleteCategory(id: string) {
  try {
    const productCount = await db.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return {
        success: false,
        error: `Cannot delete category with ${productCount} product(s). Please reassign or delete the products first.`,
      };
    }

    await db.category.delete({
      where: { id },
    });

    revalidateCategoryPaths();

    return { success: true, message: "Category deleted successfully" };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: "Failed to delete category" };
  }
}

export async function deleteCategories(ids: string[]) {
  try {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

    if (uniqueIds.length === 0) {
      return {
        success: true,
        message: "No categories selected",
        deleted: 0,
        deactivated: 0,
      };
    }

    const categoriesWithProducts = await db.product.groupBy({
      by: ["categoryId"],
      where: { categoryId: { in: uniqueIds } },
    });

    const categoryIdsWithProducts = new Set(
      categoriesWithProducts.map((category) => category.categoryId),
    );

    const categoriesToDelete = uniqueIds.filter(
      (id) => !categoryIdsWithProducts.has(id),
    );
    const categoriesToDeactivate = uniqueIds.filter((id) =>
      categoryIdsWithProducts.has(id),
    );

    if (categoriesToDelete.length > 0) {
      await db.category.deleteMany({
        where: { id: { in: categoriesToDelete } },
      });
    }

    if (categoriesToDeactivate.length > 0) {
      await db.category.updateMany({
        where: { id: { in: categoriesToDeactivate } },
        data: { isActive: false },
      });
    }

    revalidateCategoryPaths();

    return {
      success: true,
      message: `${categoriesToDelete.length} categor${categoriesToDelete.length === 1 ? "y" : "ies"} deleted, ${categoriesToDeactivate.length} categor${categoriesToDeactivate.length === 1 ? "y" : "ies"} deactivated`,
      deleted: categoriesToDelete.length,
      deactivated: categoriesToDeactivate.length,
    };
  } catch (error) {
    console.error("Error deleting categories:", error);
    return { success: false, error: "Failed to delete categories" };
  }
}

// ──────────────────────────────────────────────
// TOGGLE Category Status
// ──────────────────────────────────────────────

export async function toggleCategoryStatus(id: string) {
  try {
    const category = await db.category.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    const updated = await db.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });

    revalidateCategoryPaths();

    return { success: true, data: serializeCategory(updated) };
  } catch (error) {
    console.error("Error toggling category status:", error);
    return { success: false, error: "Failed to toggle category status" };
  }
}
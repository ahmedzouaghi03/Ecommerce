"use server";

import { db, Prisma } from "@monkeyprint/db";
import { revalidatePath } from "next/cache";
import {
  createCategory as createCategoryAction,
  getCategories as getCategoriesAction,
} from "@/actions/categoriesAction";
import type {
  CreateCategoryInput,
  CreateProductInput,
  GetProductsOptions,
  ProductWithCategory,
  SerializedCategory,
  SerializedProductWithCategory,
  UpdateProductInput,
} from "@/types";


const PRODUCT_REVALIDATION_PATHS = ["/", "/products", "/dashboard/products"] as const;
const DEFAULT_CATEGORY_SLUG = "general";

type LegacyCategoryForProductAction = Omit<
  SerializedCategory,
  "createdAt" | "updatedAt"
> & {
  createdAt: Date;
  updatedAt: Date;
};

function revalidateProductPaths(extraPaths: string[] = []) {
  const allPaths = new Set<string>([...PRODUCT_REVALIDATION_PATHS, ...extraPaths]);
  for (const path of allPaths) {
    revalidatePath(path);
  }
}

function isPrismaNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

function normalizeSlug(rawValue: string): string {
  return rawValue
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
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

function serializeProduct(
  product: ProductWithCategory,
): SerializedProductWithCategory {
  return {
    ...product,
    priceIndividual: Number(product.priceIndividual),
    priceRestaurant: Number(product.priceRestaurant),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: {
      ...product.category,
      createdAt: product.category.createdAt.toISOString(),
      updatedAt: product.category.updatedAt.toISOString(),
    },
  };
}

function hydrateLegacyCategory(
  category: SerializedCategory,
): LegacyCategoryForProductAction {
  return {
    ...category,
    createdAt: new Date(category.createdAt),
    updatedAt: new Date(category.updatedAt),
  };
}

async function getOrCreateDefaultCategoryId(): Promise<string> {
  const defaultCategory = await db.category.upsert({
    where: { slug: DEFAULT_CATEGORY_SLUG },
    update: {},
    create: {
      name: "General",
      slug: DEFAULT_CATEGORY_SLUG,
      description: "Default category for products",
      isActive: true,
    },
    select: { id: true },
  });

  return defaultCategory.id;
}

async function getProductByUnique(where: Prisma.ProductWhereUniqueInput) {
  try {
    const product = await db.product.findUnique({
      where,
      include: { category: true },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    return { success: true, data: serializeProduct(product) };
  } catch (error) {
    console.error("Error fetching product:", error);
    return { success: false, error: "Failed to fetch product" };
  }
}

// ──────────────────────────────────────────────
// GET Products
// ──────────────────────────────────────────────

export async function getProducts(options: GetProductsOptions = {}) {
  try {
    const limit = sanitizeLimit(options.limit, 50, 200);
    const offset = sanitizeOffset(options.offset);

    const sortBy = options.sortBy ?? "order";
    const sortOrder = options.sortOrder ?? "asc";
    const searchTerm = options.search?.trim();

    const where: Prisma.ProductWhereInput = {};

    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options.excludeId?.trim()) {
      where.NOT = { id: options.excludeId.trim() };
    }

    if (typeof options.isFeatured === "boolean") {
      where.isFeatured = options.isFeatured;
    }

    if (typeof options.isActive === "boolean") {
      where.isActive = options.isActive;
    }

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: { category: true },
        orderBy: {
          [sortBy]: sortOrder,
        } as Prisma.ProductOrderByWithRelationInput,
        take: limit,
        skip: offset,
      }),
      db.product.count({ where }),
    ]);

    return {
      success: true,
      data: products.map(serializeProduct),
      total,
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      success: false,
      error: "Failed to fetch products",
      data: [] as SerializedProductWithCategory[],
      total: 0,
    };
  }
}

export async function getProductBySlug(slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return { success: false, error: "Product slug is invalid" };
  }

  return getProductByUnique({ slug: normalizedSlug });
}

export async function getProductById(id: string) {
  return getProductByUnique({ id });
}

export async function getFeaturedProducts(limit = 8) {
  try {
    const safeLimit = sanitizeLimit(limit, 8, 50);

    const products = await db.product.findMany({
      where: { isFeatured: true, isActive: true },
      include: { category: true },
      orderBy: { order: "asc" },
      take: safeLimit,
    });

    return { success: true, data: products.map(serializeProduct) };
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return {
      success: false,
      error: "Failed to fetch featured products",
      data: [] as SerializedProductWithCategory[],
    };
  }
}

// ──────────────────────────────────────────────
// CREATE Product
// ──────────────────────────────────────────────

export async function createProduct(input: CreateProductInput) {
  try {
    const normalizedName = input.name.trim();
    if (!normalizedName) {
      return { success: false, error: "Product name is required" };
    }

    const slug = normalizeSlug(input.slug || normalizedName);
    if (!slug) {
      return { success: false, error: "Product slug is invalid" };
    }

    if (
      !Number.isFinite(input.priceIndividual) ||
      !Number.isFinite(input.priceRestaurant) ||
      input.priceIndividual < 0 ||
      input.priceRestaurant < 0
    ) {
      return { success: false, error: "Product price values are invalid" };
    }

    const existingProduct = await db.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingProduct) {
      return {
        success: false,
        error: "A product with this slug already exists",
      };
    }

    const categoryId =
      input.categoryId && input.categoryId.trim()
        ? input.categoryId
        : await getOrCreateDefaultCategoryId();

    const product = await db.product.create({
      data: {
        name: normalizedName,
        slug,
        description: input.description?.trim() || null,
        priceIndividual: new Prisma.Decimal(input.priceIndividual),
        priceRestaurant: new Prisma.Decimal(input.priceRestaurant),
        unit: input.unit?.trim() || "piece",
        stock:
          typeof input.stock === "number" && Number.isFinite(input.stock)
            ? Math.max(0, Math.trunc(input.stock))
            : 0,
        images: (input.images ?? []).filter((image) => image.trim().length > 0),
        isFeatured: input.isFeatured ?? false,
        isActive: input.isActive ?? true,
        order:
          typeof input.order === "number" && Number.isFinite(input.order)
            ? Math.max(0, Math.trunc(input.order))
            : 0,
        categoryId,
      },
      include: { category: true },
    });

    revalidateProductPaths([`/products/${product.slug}`]);

    return { success: true, data: serializeProduct(product) };
  } catch (error) {
    console.error("Error creating product:", error);
    return { success: false, error: "Failed to create product" };
  }
}

// ──────────────────────────────────────────────
// UPDATE Product
// ──────────────────────────────────────────────

export async function updateProduct(input: UpdateProductInput) {
  try {
    const { id, ...data } = input;

    const existingProduct = await db.product.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!existingProduct) {
      return { success: false, error: "Product not found" };
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (data.name !== undefined) {
      const normalizedName = data.name.trim();
      if (!normalizedName) {
        return { success: false, error: "Product name cannot be empty" };
      }
      updateData.name = normalizedName;
    }

    if (data.slug !== undefined) {
      const nextSlug = normalizeSlug(data.slug);
      if (!nextSlug) {
        return { success: false, error: "Product slug is invalid" };
      }

      const slugConflict = await db.product.findFirst({
        where: {
          slug: nextSlug,
          NOT: { id },
        },
        select: { id: true },
      });

      if (slugConflict) {
        return {
          success: false,
          error: "A product with this slug already exists",
        };
      }

      updateData.slug = nextSlug;
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.priceIndividual !== undefined) {
      if (!Number.isFinite(data.priceIndividual) || data.priceIndividual < 0) {
        return { success: false, error: "Individual price is invalid" };
      }
      updateData.priceIndividual = new Prisma.Decimal(data.priceIndividual);
    }

    if (data.priceRestaurant !== undefined) {
      if (!Number.isFinite(data.priceRestaurant) || data.priceRestaurant < 0) {
        return { success: false, error: "Restaurant price is invalid" };
      }
      updateData.priceRestaurant = new Prisma.Decimal(data.priceRestaurant);
    }

    if (data.unit !== undefined) {
      updateData.unit = data.unit.trim() || "piece";
    }

    if (data.stock !== undefined) {
      if (!Number.isFinite(data.stock) || data.stock < 0) {
        return { success: false, error: "Stock value is invalid" };
      }
      updateData.stock = Math.trunc(data.stock);
    }

    if (data.images !== undefined) {
      updateData.images = data.images.filter((image) => image.trim().length > 0);
    }

    if (data.isFeatured !== undefined) {
      updateData.isFeatured = data.isFeatured;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.order !== undefined) {
      if (!Number.isFinite(data.order)) {
        return { success: false, error: "Order value is invalid" };
      }
      updateData.order = Math.max(0, Math.trunc(data.order));
    }

    if (data.categoryId !== undefined) {
      const nextCategoryId =
        data.categoryId && data.categoryId.trim()
          ? data.categoryId
          : await getOrCreateDefaultCategoryId();

      updateData.category = { connect: { id: nextCategoryId } };
    }

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    revalidateProductPaths([
      `/products/${existingProduct.slug}`,
      `/products/${product.slug}`,
    ]);

    return { success: true, data: serializeProduct(product) };
  } catch (error) {
    console.error("Error updating product:", error);

    if (isPrismaNotFoundError(error)) {
      return { success: false, error: "Product not found" };
    }

    return { success: false, error: "Failed to update product" };
  }
}

// ──────────────────────────────────────────────
// DELETE Product
// ──────────────────────────────────────────────

export async function deleteProduct(id: string) {
  try {
    const existingProduct = await db.product.findUnique({
      where: { id },
      select: { slug: true },
    });

    if (!existingProduct) {
      return { success: false, error: "Product not found" };
    }

    const orderItemCount = await db.orderItem.count({
      where: { productId: id },
    });

    if (orderItemCount > 0) {
      await db.product.update({
        where: { id },
        data: { isActive: false },
      });

      revalidateProductPaths([`/products/${existingProduct.slug}`]);

      return {
        success: true,
        message:
          "Product has existing orders. It has been deactivated instead of deleted.",
      };
    }

    await db.product.delete({
      where: { id },
    });

    revalidateProductPaths([`/products/${existingProduct.slug}`]);

    return { success: true, message: "Product deleted successfully" };
  } catch (error) {
    console.error("Error deleting product:", error);

    if (isPrismaNotFoundError(error)) {
      return { success: false, error: "Product not found" };
    }

    return { success: false, error: "Failed to delete product" };
  }
}

export async function deleteProducts(ids: string[]) {
  try {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

    if (uniqueIds.length === 0) {
      return {
        success: true,
        message: "No products selected",
        deleted: 0,
        deactivated: 0,
      };
    }

    const productMeta = await db.product.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, slug: true },
    });

    const productsWithOrders = await db.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { in: uniqueIds } },
    });

    const productIdsWithOrders = new Set(
      productsWithOrders.map((product) => product.productId),
    );

    const productsToDelete = uniqueIds.filter((id) => !productIdsWithOrders.has(id));
    const productsToDeactivate = uniqueIds.filter((id) =>
      productIdsWithOrders.has(id),
    );

    if (productsToDelete.length > 0) {
      await db.product.deleteMany({
        where: { id: { in: productsToDelete } },
      });
    }

    if (productsToDeactivate.length > 0) {
      await db.product.updateMany({
        where: { id: { in: productsToDeactivate } },
        data: { isActive: false },
      });
    }

    revalidateProductPaths(productMeta.map((product) => `/products/${product.slug}`));

    return {
      success: true,
      message: `${productsToDelete.length} product(s) deleted, ${productsToDeactivate.length} product(s) deactivated`,
      deleted: productsToDelete.length,
      deactivated: productsToDeactivate.length,
    };
  } catch (error) {
    console.error("Error deleting products:", error);
    return { success: false, error: "Failed to delete products" };
  }
}

// ──────────────────────────────────────────────
// TOGGLE Product Status
// ──────────────────────────────────────────────

export async function toggleProductStatus(id: string) {
  try {
    const product = await db.product.findUnique({
      where: { id },
      select: { isActive: true, slug: true },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const updated = await db.product.update({
      where: { id },
      data: { isActive: !product.isActive },
      include: { category: true },
    });

    revalidateProductPaths([`/products/${product.slug}`]);

    return { success: true, data: serializeProduct(updated) };
  } catch (error) {
    console.error("Error toggling product status:", error);
    return { success: false, error: "Failed to toggle product status" };
  }
}

export async function toggleProductFeatured(id: string) {
  try {
    const product = await db.product.findUnique({
      where: { id },
      select: { isFeatured: true, slug: true },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const updated = await db.product.update({
      where: { id },
      data: { isFeatured: !product.isFeatured },
      include: { category: true },
    });

    revalidateProductPaths([`/products/${product.slug}`]);

    return { success: true, data: serializeProduct(updated) };
  } catch (error) {
    console.error("Error toggling product featured:", error);
    return {
      success: false,
      error: "Failed to toggle product featured status",
    };
  }
}

// ──────────────────────────────────────────────
// Category Compatibility Wrappers
// ──────────────────────────────────────────────

export async function getCategories() {
  const result = await getCategoriesAction({
    isActive: true,
    sortBy: "order",
    sortOrder: "asc",
    limit: 500,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Failed to fetch categories",
      data: [] as LegacyCategoryForProductAction[],
    };
  }

  return {
    success: true,
    data: (result.data ?? []).map(hydrateLegacyCategory),
  };
}

export async function createCategory(input: CreateCategoryInput) {
  const result = await createCategoryAction(input);

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Failed to create category",
    };
  }

  if (!result.data) {
    return {
      success: false,
      error: "Failed to create category",
    };
  }

  return {
    success: true,
    data: hydrateLegacyCategory(result.data),
  };
}
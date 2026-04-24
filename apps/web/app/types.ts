import type { Prisma, OrderStatus, PaymentMethod, Role, UserType } from "@monkeyprint/db";
import type { LucideIcon } from "lucide-react";

// ──────────────────────────────────────────────
// Global Types
// ──────────────────────────────────────────────

export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export type PaginatedActionResult<T> = ActionResult<T> & {
  total: number;
};

export type SortOrder = "asc" | "desc";

export interface UploadResponse {
  ufsUrl: string;
  url: string;
}

export interface ImageCarouselProps {
  images: string[];
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
}

export interface CarouselState {
  images: string[];
  startIndex: number;
  title: string;
}

export interface ImageGalleryProps {
  images: string[];
  title: string;
  onImageClick: (index: number) => void;
}

// ──────────────────────────────────────────────
// Products and Cart Types
// ──────────────────────────────────────────────

export type BoxConfig = {
  pieces: number;
  maxTypes: number;
};

export type CartSelection = {
  productId: string;
  productName: string;
  count: number;
};

export type CartItem = {
  productId: string;
  productName: string;
  boxSize: number;
  quantity: number;
  selections: CartSelection[];
  unitPrice: number;
  totalPrice: number;
};

export type CustomerType = "individual" | "restaurant";

export type ProductSortBy = "name" | "priceIndividual" | "createdAt" | "order";

export type GetProductsOptions = {
  categoryId?: string;
  excludeId?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: ProductSortBy;
  sortOrder?: SortOrder;
};

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

export type SerializedProductWithCategory = Omit<
  ProductWithCategory,
  "priceIndividual" | "priceRestaurant" | "createdAt" | "updatedAt" | "category"
> & {
  priceIndividual: number;
  priceRestaurant: number;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    order: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
};

export type CreateProductInput = {
  name: string;
  slug: string;
  description?: string;
  priceIndividual: number;
  priceRestaurant: number;
  unit?: string;
  stock?: number;
  images?: string[];
  isFeatured?: boolean;
  isActive?: boolean;
  order?: number;
  categoryId?: string;
};

export type UpdateProductInput = Partial<CreateProductInput> & {
  id: string;
};

// ──────────────────────────────────────────────
// Categories Types
// ──────────────────────────────────────────────

export type CategorySortBy = "name" | "order" | "createdAt";

export type GetCategoriesOptions = {
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: CategorySortBy;
  sortOrder?: SortOrder;
};

export type SerializedCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCategoryInput = {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  order?: number;
  isActive?: boolean;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput> & {
  id: string;
};

// ──────────────────────────────────────────────
// Contact Types
// ──────────────────────────────────────────────

export type ContactFilterType = "all" | "unread" | "read";
export type ContactSortType = "newest" | "oldest";

export type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export type ContactSubmissionUser = {
  name: string | null;
  email: string;
  profileImage: string | null;
  userType: string | null;
  role: string;
};

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId: string | null;
  user: ContactSubmissionUser | null;
};

// ──────────────────────────────────────────────
// Dashboard Types
// ──────────────────────────────────────────────

export type DashboardStats = {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  totalCategories: number;
  pendingOrders: number;
  unreadContacts: number;
  activeProducts: number;
};

export type DashboardRecentOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  total: number;
  createdAt: string;
};

export type DashboardOrderStatusCount = {
  status: OrderStatus;
  count: number;
};

export type DashboardLowStockProduct = {
  id: string;
  name: string;
  stock: number;
  category: string;
};

export type DashboardRecentContact = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  isRead: boolean;
  createdAt: string;
};

export type DashboardDailyRevenue = {
  date: string;
  revenue: number;
};

// ──────────────────────────────────────────────
// Orders Types
// ──────────────────────────────────────────────

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
      };
    };
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export type SerializedOrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  productImage: string | null;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
  };
};

export type SerializedOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  items: SerializedOrderItem[];
};

export type CreateOrderInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
  userId?: string;
};

export type UpdateOrderInput = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string;
  notes: string | null;
  shippingCost: number;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
  }[];
};

export type UpdateOrderStatusInput = {
  id: string;
  status: OrderStatus;
};

export type OrderSortBy = "createdAt" | "total" | "orderNumber";

export type GetOrdersOptions = {
  status?: OrderStatus;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: OrderSortBy;
  sortOrder?: SortOrder;
};

export type OrderStatistics = {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  todayOrders: number;
};

// Shared UI typing for Orders pages
export type OrderStatusUiConfig = {
  labelKey: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
};

export type OrderStatusUiMap = Record<OrderStatus, OrderStatusUiConfig>;

export type ActiveOrderTimelineStatus = Extract<
  OrderStatus,
  "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED"
>;

// Shared form typing for Checkout page
export type CheckoutFormData = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  notes: string;
  paymentMethod: PaymentMethod;
};

// ──────────────────────────────────────────────
// Auth / Team Types
// ──────────────────────────────────────────────

export type TeamManagedRole = "ADMIN" | "SUPER_ADMIN";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  userType: UserType | null;
  phoneNumber?: string | null;
  address?: string | null;
};

export type SerializedAdmin = {
  id: string;
  name: string;
  email: string;
  role: TeamManagedRole;
  phoneNumber: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GetAdminsOptions = {
  search?: string;
  limit?: number;
  offset?: number;
};

export type CreateAdminInput = {
  name: string;
  email: string;
  password: string;
  role?: TeamManagedRole;
  phoneNumber?: string;
  address?: string;
};

export type UpdateAdminInput = {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  role?: TeamManagedRole;
  phoneNumber?: string;
  address?: string;
};

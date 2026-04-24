"use server";

import { db, Prisma, OrderStatus } from "@monkeyprint/db";
import { revalidatePath } from "next/cache";
import type {
  ActionResult,
  CreateOrderInput,
  GetOrdersOptions,
  OrderStatistics,
  OrderWithItems,
  PaginatedActionResult,
  SerializedOrder,
  SerializedOrderItem,
  UpdateOrderInput,
  UpdateOrderStatusInput,
} from "@/types";



const FREE_SHIPPING_THRESHOLD = 100;
const DEFAULT_SHIPPING_COST = 7;

const ORDER_REVALIDATE_PATHS = ["/orders", "/dashboard/orders", "/dashboard"] as const;
const ORDER_ID_REVALIDATE_BASE_PATHS = ["/orders", "/dashboard/orders"] as const;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function revalidateOrderPaths(orderId?: string): void {
  for (const path of ORDER_REVALIDATE_PATHS) {
    revalidatePath(path);
  }

  if (!orderId) {
    return;
  }

  for (const basePath of ORDER_ID_REVALIDATE_BASE_PATHS) {
    revalidatePath(`${basePath}/${orderId}`);
  }
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SF-${timestamp}-${random}`;
}

async function generateUniqueOrderNumber(maxAttempts = 5): Promise<string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const candidate = generateOrderNumber();

    const existing = await db.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    attempts += 1;
  }

  return generateOrderNumber();
}

function serializeOrder(order: OrderWithItems): SerializedOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    address: order.address,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    total: Number(order.total),
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    userId: order.userId,
    user: order.user
      ? {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
      }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      productName: item.productName,
      productImage: item.productImage,
      productId: item.productId,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        images: item.product.images,
      },
    })),
  };
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<ActionResult<SerializedOrder>> {
  try {
    if (input.items.length === 0) {
      return { success: false, error: "Order must include at least one item" };
    }

    let subtotal = 0;

    const itemsData = input.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;

      return {
        productId: item.productId,
        productName: item.productName,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
        totalPrice: new Prisma.Decimal(lineTotal),
      };
    });

    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST;
    const total = subtotal + shippingCost;

    const productIds = input.items.map((item) => item.productId);

    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, images: true },
    });

    const productImageMap = new Map(
      products.map((product) => [product.id, product.images[0] ?? null]),
    );

    const orderNumber = await generateUniqueOrderNumber();

    const order = await db.order.create({
      data: {
        orderNumber,
        status: OrderStatus.PENDING,
        paymentMethod: input.paymentMethod,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        address: input.address,
        notes: input.notes ?? null,
        subtotal: new Prisma.Decimal(subtotal),
        shippingCost: new Prisma.Decimal(shippingCost),
        total: new Prisma.Decimal(total),
        userId: input.userId ?? null,
        items: {
          create: itemsData.map((item) => ({
            ...item,
            productImage: productImageMap.get(item.productId) ?? null,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidateOrderPaths(order.id);

    return { success: true, data: serializeOrder(order) };
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create order"),
    };
  }
}

export async function getOrders(
  options: GetOrdersOptions = {},
): Promise<PaginatedActionResult<SerializedOrder[]>> {
  try {
    const {
      status,
      search,
      limit = 50,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    const trimmedSearch = search?.trim();

    const where: Prisma.OrderWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (trimmedSearch) {
      where.OR = [
        { orderNumber: { contains: trimmedSearch, mode: "insensitive" } },
        { customerName: { contains: trimmedSearch, mode: "insensitive" } },
        { customerPhone: { contains: trimmedSearch, mode: "insensitive" } },
        { customerEmail: { contains: trimmedSearch, mode: "insensitive" } },
      ];
    }

    const orderBy = {
      [sortBy]: sortOrder,
    } as Prisma.OrderOrderByWithRelationInput;

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
        take: safeLimit,
        skip: safeOffset,
      }),
      db.order.count({ where }),
    ]);

    return {
      success: true,
      data: orders.map((order) => serializeOrder(order)),
      total,
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      success: false,
      data: [],
      total: 0,
      error: getErrorMessage(error, "Failed to fetch orders"),
    };
  }
}

export async function getOrdersByUser(
  userId: string,
): Promise<ActionResult<SerializedOrder[]>> {
  try {
    if (!userId) {
      return { success: false, data: [], error: "User id is required" };
    }

    const orders = await db.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: orders.map((order) => serializeOrder(order)),
    };
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return {
      success: false,
      data: [],
      error: getErrorMessage(error, "Failed to fetch orders"),
    };
  }
}

export async function getOrderById(id: string): Promise<ActionResult<SerializedOrder>> {
  try {
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    return { success: true, data: serializeOrder(order) };
  } catch (error) {
    console.error("Error fetching order:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch order"),
    };
  }
}

export async function updateOrder(
  input: UpdateOrderInput,
): Promise<ActionResult<SerializedOrder>> {
  try {
    if (input.items.length === 0) {
      return { success: false, error: "Order must include at least one item" };
    }

    const incomingIds = input.items.map((item) => item.id);
    const uniqueIds = new Set(incomingIds);

    if (uniqueIds.size !== incomingIds.length) {
      return { success: false, error: "Duplicate order items are not allowed" };
    }

    const shippingCost = Math.max(0, input.shippingCost);
    const subtotal = input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const total = subtotal + shippingCost;

    const updatedOrder = await db.$transaction(async (tx) => {
      const existingItems = await tx.orderItem.findMany({
        where: { orderId: input.id },
        select: { id: true },
      });

      const existingIdSet = new Set(existingItems.map((item) => item.id));
      const invalidItem = input.items.find((item) => !existingIdSet.has(item.id));

      if (invalidItem) {
        throw new Error("Invalid order item payload");
      }

      await tx.orderItem.deleteMany({
        where: {
          orderId: input.id,
          id: { notIn: incomingIds },
        },
      });

      for (const item of input.items) {
        const lineTotal = item.quantity * item.unitPrice;

        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(lineTotal),
          },
        });
      }

      return tx.order.update({
        where: { id: input.id },
        data: {
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail ?? null,
          address: input.address,
          notes: input.notes ?? null,
          subtotal: new Prisma.Decimal(subtotal),
          shippingCost: new Prisma.Decimal(shippingCost),
          total: new Prisma.Decimal(total),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    revalidateOrderPaths(input.id);

    return {
      success: true,
      data: serializeOrder(updatedOrder),
    };
  } catch (error) {
    console.error("Error updating order:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update order"),
    };
  }
}

export async function updateOrderStatus(
  input: UpdateOrderStatusInput,
): Promise<ActionResult<SerializedOrder>> {
  try {
    const updatedOrder = await db.order.update({
      where: { id: input.id },
      data: { status: input.status },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidateOrderPaths(input.id);

    return {
      success: true,
      data: serializeOrder(updatedOrder),
    };
  } catch (error) {
    console.error("Error updating order status:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update order status"),
    };
  }
}

export async function deleteOrder(id: string): Promise<ActionResult> {
  try {
    await db.order.delete({
      where: { id },
    });

    revalidateOrderPaths(id);

    return { success: true };
  } catch (error) {
    console.error("Error deleting order:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete order"),
    };
  }
}

export async function getOrderStatistics(): Promise<ActionResult<OrderStatistics>> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueAggregate,
      todayOrders,
    ] = await Promise.all([
      db.order.count(),
      db.order.count({ where: { status: OrderStatus.PENDING } }),
      db.order.count({ where: { status: OrderStatus.CONFIRMED } }),
      db.order.count({ where: { status: OrderStatus.PROCESSING } }),
      db.order.count({ where: { status: OrderStatus.SHIPPED } }),
      db.order.count({ where: { status: OrderStatus.DELIVERED } }),
      db.order.count({ where: { status: OrderStatus.CANCELLED } }),
      db.order.aggregate({
        _sum: { total: true },
        where: { status: { not: OrderStatus.CANCELLED } },
      }),
      db.order.count({
        where: {
          createdAt: { gte: todayStart },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: Number(revenueAggregate._sum.total ?? 0),
        todayOrders,
      },
    };
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch statistics"),
    };
  }
}
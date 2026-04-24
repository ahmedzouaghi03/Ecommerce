"use server";

import { db, OrderStatus } from "@monkeyprint/db";
import type {
    DashboardDailyRevenue,
    DashboardLowStockProduct,
    DashboardOrderStatusCount,
    DashboardRecentContact,
    DashboardRecentOrder,
    DashboardStats,
} from "@/types";



const EMPTY_DASHBOARD_STATS: DashboardStats = {
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalUsers: 0,
    totalCategories: 0,
    pendingOrders: 0,
    unreadContacts: 0,
    activeProducts: 0,
};

function toIsoDateKey(date: Date): string {
    return date.toISOString().split("T")[0] ?? "";
}

export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        const [
            totalOrders,
            revenueAggregate,
            totalProducts,
            totalUsers,
            totalCategories,
            pendingOrders,
            unreadContacts,
            activeProducts,
        ] = await Promise.all([
            db.order.count(),
            db.order.aggregate({
                _sum: { total: true },
                where: { status: { not: OrderStatus.CANCELLED } },
            }),
            db.product.count(),
            db.user.count(),
            db.category.count(),
            db.order.count({ where: { status: OrderStatus.PENDING } }),
            db.contactSubmission.count({ where: { isRead: false } }),
            db.product.count({ where: { isActive: true } }),
        ]);

        return {
            totalOrders,
            totalRevenue: Number(revenueAggregate._sum.total ?? 0),
            totalProducts,
            totalUsers,
            totalCategories,
            pendingOrders,
            unreadContacts,
            activeProducts,
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return EMPTY_DASHBOARD_STATS;
    }
}

export async function getRecentOrders(limit = 5): Promise<DashboardRecentOrder[]> {
    try {
        const safeLimit = Math.max(1, limit);

        const orders = await db.order.findMany({
            orderBy: { createdAt: "desc" },
            take: safeLimit,
            select: {
                id: true,
                orderNumber: true,
                status: true,
                customerName: true,
                total: true,
                createdAt: true,
            },
        });

        return orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            customerName: order.customerName,
            total: Number(order.total),
            createdAt: order.createdAt.toISOString(),
        }));
    } catch (error) {
        console.error("Error fetching recent orders:", error);
        return [];
    }
}

export async function getOrderStatusBreakdown(): Promise<DashboardOrderStatusCount[]> {
    try {
        const statusCounts = await db.order.groupBy({
            by: ["status"],
            _count: {
                status: true,
            },
        });

        return statusCounts.map((item) => ({
            status: item.status,
            count: item._count.status,
        }));
    } catch (error) {
        console.error("Error fetching order status breakdown:", error);
        return [];
    }
}

export async function getLowStockProducts(
    threshold = 10,
): Promise<DashboardLowStockProduct[]> {
    try {
        const products = await db.product.findMany({
            where: {
                stock: { lte: threshold },
                isActive: true,
            },
            orderBy: { stock: "asc" },
            take: 5,
            select: {
                id: true,
                name: true,
                stock: true,
                category: { select: { name: true } },
            },
        });

        return products.map((product) => ({
            id: product.id,
            name: product.name,
            stock: product.stock,
            category: product.category.name,
        }));
    } catch (error) {
        console.error("Error fetching low stock products:", error);
        return [];
    }
}

export async function getRecentContacts(limit = 5): Promise<DashboardRecentContact[]> {
    try {
        const safeLimit = Math.max(1, limit);

        const contacts = await db.contactSubmission.findMany({
            orderBy: { createdAt: "desc" },
            take: safeLimit,
            select: {
                id: true,
                name: true,
                email: true,
                subject: true,
                isRead: true,
                createdAt: true,
            },
        });

        return contacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            email: contact.email,
            subject: contact.subject,
            isRead: contact.isRead,
            createdAt: contact.createdAt.toISOString(),
        }));
    } catch (error) {
        console.error("Error fetching recent contacts:", error);
        return [];
    }
}

export async function getRevenueByDay(days = 7): Promise<DashboardDailyRevenue[]> {
    try {
        const safeDays = Math.max(1, days);

        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - (safeDays - 1));

        const orders = await db.order.findMany({
            where: {
                createdAt: { gte: startDate },
                status: { not: OrderStatus.CANCELLED },
            },
            select: {
                total: true,
                createdAt: true,
            },
        });

        const revenueByDate = new Map<string, number>();

        for (const order of orders) {
            const key = toIsoDateKey(order.createdAt);
            const current = revenueByDate.get(key) ?? 0;
            revenueByDate.set(key, current + Number(order.total));
        }

        const result: DashboardDailyRevenue[] = [];

        for (let i = 0; i < safeDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const key = toIsoDateKey(date);

            result.push({
                date: key,
                revenue: revenueByDate.get(key) ?? 0,
            });
        }

        return result;
    } catch (error) {
        console.error("Error fetching revenue by day:", error);
        return [];
    }
}
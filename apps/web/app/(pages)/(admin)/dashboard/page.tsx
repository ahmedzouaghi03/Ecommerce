import { Suspense } from "react";
import {
    getDashboardStats,
    getRecentOrders,
    getOrderStatusBreakdown,
    getLowStockProducts,
    getRecentContacts,
    getRevenueByDay,
} from "@/actions/dashboardActions";
import {
    Package,
    ShoppingCart,
    Users,
    DollarSign,
    Clock,
    Mail,
    Layers,
    TrendingUp,
    AlertTriangle,
    FileText,
} from "lucide-react";
import AdminStatCard from "@/components/admin/AdminStatCard";
import Header from "@/components/admin/Header";
import Link from "next/link";
import type { DashboardRecentOrder } from "@/types";

function formatCurrency(value: number): string {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function OrderStatusBadge({
    status,
}: {
    status: DashboardRecentOrder["status"];
}) {
    const styles = {
        PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
        CONFIRMED: "bg-blue-50 text-blue-700 border border-blue-200",
        PROCESSING: "bg-purple-50 text-purple-700 border border-purple-200",
        SHIPPED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
        DELIVERED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        CANCELLED: "bg-rose-50 text-rose-700 border border-rose-200",
    };

    return (
        <span
            className={
                "px-3 py-1 text-xs font-semibold rounded-full " +
                (styles[status] || styles.PENDING)
            }
        >
            {status}
        </span>
    );
}

function DashboardContentSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm"
                    >
                        <div className="h-6 w-20 bg-[#e2e8f0] rounded mb-3" />
                        <div className="h-8 w-24 bg-[#e2e8f0] rounded mb-2" />
                        <div className="h-3 w-28 bg-[#e2e8f0] rounded" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
                    <div className="h-5 w-48 bg-[#e2e8f0] rounded mb-6" />
                    <div className="space-y-3">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="h-8 bg-[#f1f5f9] rounded-lg" />
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6">
                    <div className="h-5 w-48 bg-[#e2e8f0] rounded mb-6" />
                    <div className="space-y-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-6 bg-[#f1f5f9] rounded" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

async function DashboardDataSection() {
    const [
        stats,
        recentOrders,
        orderStatusBreakdown,
        lowStockProducts,
        recentContacts,
        revenueByDay,
    ] = await Promise.all([
        getDashboardStats(),
        getRecentOrders(5),
        getOrderStatusBreakdown(),
        getLowStockProducts(10),
        getRecentContacts(5),
        getRevenueByDay(7),
    ]);

    const revenueChange = "+12.5%";
    const ordersChange = "+8.3%";

    const totalOrderStatuses = orderStatusBreakdown.reduce(
        (sum, item) => sum + item.count,
        0,
    );

    const maxDailyRevenue = revenueByDay.reduce(
        (max, day) => Math.max(max, day.revenue),
        0,
    );

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#06b6d4] text-white">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-[#64748b] font-medium">Total Revenue</p>
                            <p className="text-2xl font-bold text-[#0f172a] mt-1">
                                {formatCurrency(stats.totalRevenue)} TND
                            </p>
                            <p className="text-xs text-emerald-600 font-semibold mt-1">
                                {revenueChange} from last month
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-[#64748b] font-medium">Total Orders</p>
                            <p className="text-2xl font-bold text-[#0f172a] mt-1">
                                {stats.totalOrders}
                            </p>
                            <p className="text-xs text-emerald-600 font-semibold mt-1">
                                {ordersChange} from last month
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-[#64748b] font-medium">Pending Orders</p>
                            <p className="text-2xl font-bold text-[#0f172a] mt-1">
                                {stats.pendingOrders}
                            </p>
                            <p className="text-xs text-[#64748b] mt-1">Needs attention</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] text-white">
                            <Mail className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-[#64748b] font-medium">Unread Messages</p>
                            <p className="text-2xl font-bold text-[#0f172a] mt-1">
                                {stats.unreadContacts}
                            </p>
                            <p className="text-xs text-[#64748b] mt-1">Contact submissions</p>
                        </div>
                    </div>
                </div>

                <AdminStatCard
                    label="Total Products"
                    value={stats.totalProducts}
                    icon={Package}
                    color="bg-gradient-to-br from-[#10b981] to-[#059669] text-white"
                />

                <AdminStatCard
                    label="Active Products"
                    value={stats.activeProducts}
                    icon={TrendingUp}
                    color="bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white"
                />

                <AdminStatCard
                    label="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    color="bg-gradient-to-br from-[#ec4899] to-[#db2777] text-white"
                />

                <AdminStatCard
                    label="Total Categories"
                    value={stats.totalCategories}
                    icon={Layers}
                    color="bg-gradient-to-br from-[#14b8a6] to-[#0d9488] text-white"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp className="w-5 h-5 text-[#0ea5e9]" />
                        <h2 className="text-lg font-bold text-[#0f172a]">
                            Revenue (Last 7 Days)
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {revenueByDay.map((day) => {
                            const percentage =
                                maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0;

                            const date = new Date(day.date);
                            const dayName = date.toLocaleDateString("en-US", {
                                weekday: "short",
                            });

                            return (
                                <div key={day.date} className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-[#64748b] w-12">
                                        {dayName}
                                    </span>
                                    <div className="flex-1 h-8 bg-[#f1f5f9] rounded-lg overflow-hidden relative">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] rounded-lg transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold text-[#0f172a] w-20 text-right">
                                        {day.revenue.toFixed(2)} TND
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <ShoppingCart className="w-5 h-5 text-[#0ea5e9]" />
                        <h2 className="text-lg font-bold text-[#0f172a]">
                            Order Status Breakdown
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {orderStatusBreakdown.map((item) => {
                            const percentage =
                                totalOrderStatuses > 0
                                    ? (item.count / totalOrderStatuses) * 100
                                    : 0;

                            const colors: Record<string, string> = {
                                PENDING: "from-amber-400 to-amber-600",
                                CONFIRMED: "from-blue-400 to-blue-600",
                                PROCESSING: "from-purple-400 to-purple-600",
                                SHIPPED: "from-indigo-400 to-indigo-600",
                                DELIVERED: "from-emerald-400 to-emerald-600",
                                CANCELLED: "from-rose-400 to-rose-600",
                            };

                            return (
                                <div key={item.status}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-[#0f172a]">
                                            {item.status}
                                        </span>
                                        <span className="text-sm font-semibold text-[#64748b]">
                                            {item.count} ({percentage.toFixed(1)}%)
                                        </span>
                                    </div>

                                    <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                                        <div
                                            className={
                                                "h-full bg-gradient-to-r " +
                                                (colors[item.status] || colors.PENDING) +
                                                " transition-all duration-500"
                                            }
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[#0ea5e9]" />
                            <h2 className="text-lg font-bold text-[#0f172a]">Recent Orders</h2>
                        </div>
                        <Link
                            href="/dashboard/orders"
                            className="text-sm font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
                        >
                            View All →
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {recentOrders.length === 0 ? (
                            <p className="text-center text-[#94a3b8] py-8">No orders yet</p>
                        ) : (
                            recentOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-semibold text-[#0f172a] text-sm">
                                            {order.orderNumber}
                                        </p>
                                        <p className="text-xs text-[#64748b] mt-1">
                                            {order.customerName}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <OrderStatusBadge status={order.status} />
                                        <p className="font-bold text-[#0f172a] text-sm">
                                            {order.total.toFixed(2)} TND
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
                            <h2 className="text-lg font-bold text-[#0f172a]">Low Stock Alert</h2>
                        </div>
                        <Link
                            href="/dashboard/products"
                            className="text-sm font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
                        >
                            View All →
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {lowStockProducts.length === 0 ? (
                            <p className="text-center text-[#94a3b8] py-8">
                                All products have sufficient stock
                            </p>
                        ) : (
                            lowStockProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-[#fef3c7] border border-[#fde68a] hover:bg-[#fde68a] transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-semibold text-[#0f172a] text-sm">
                                            {product.name}
                                        </p>
                                        <p className="text-xs text-[#64748b] mt-1">
                                            {product.category}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-[#f59e0b]">
                                            {product.stock} units
                                        </p>
                                        <p className="text-xs text-[#92600a]">Low stock</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-[#0ea5e9]" />
                        <h2 className="text-lg font-bold text-[#0f172a]">
                            Recent Contact Submissions
                        </h2>
                    </div>
                    <Link
                        href="/dashboard/contacts"
                        className="text-sm font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
                    >
                        View All →
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#e2e8f0]">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                                    Subject
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-[#94a3b8]">
                                        No contact submissions yet
                                    </td>
                                </tr>
                            ) : (
                                recentContacts.map((contact) => (
                                    <tr
                                        key={contact.id}
                                        className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors"
                                    >
                                        <td className="py-4 px-4 text-sm font-medium text-[#0f172a]">
                                            {contact.name}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-[#64748b]">
                                            {contact.email}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-[#64748b]">
                                            {contact.subject || "No subject"}
                                        </td>
                                        <td className="py-4 px-4">
                                            {contact.isRead ? (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#f1f5f9] text-[#64748b]">
                                                    Read
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#0ea5e9] text-white">
                                                    New
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-[#64748b]">
                                            {new Date(contact.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <div className="min-h-full p-6 space-y-6">
            <Header
                title="Dashboard"
                description="Welcome back! Here's what's happening with Seefood today."
                descriptionClassName="text-sm text-[#64748b] mt-1"
                rightContent={
                    <div className="text-right">
                        <p className="text-sm text-[#64748b]">
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                }
            />

            <Suspense fallback={<DashboardContentSkeleton />}>
                <DashboardDataSection />
            </Suspense>
        </div>
    );
}
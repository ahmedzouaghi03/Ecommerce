"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChevronRight,
  ShoppingBag,
  LogIn,
  X,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  ClipboardList,
} from "lucide-react";
import { getCurrentUser } from "@/actions/authActions";
import { getOrdersByUser } from "@/actions/ordersActions";
import type {
  ActiveOrderTimelineStatus,
  AuthUser,
  OrderStatusUiMap,
  SerializedOrder,
} from "@/types";
import PageHero from "@/components/main/PageHero";

const STATUS_CONFIG: OrderStatusUiMap = {
  PENDING: {
    labelKey: "Pending",
    color: "var(--warning)",
    bgColor: "var(--warning-light)",
    icon: Clock,
  },
  CONFIRMED: {
    labelKey: "Confirmed",
    color: "var(--primary)",
    bgColor: "var(--primary-light)",
    icon: CheckCircle,
  },
  PROCESSING: {
    labelKey: "Processing",
    color: "var(--accent)",
    bgColor: "rgba(6, 182, 212, 0.1)",
    icon: Package,
  },
  SHIPPED: {
    labelKey: "Shipped",
    color: "var(--secondary)",
    bgColor: "rgba(100, 116, 139, 0.1)",
    icon: Truck,
  },
  DELIVERED: {
    labelKey: "Delivered",
    color: "var(--success)",
    bgColor: "var(--success-light)",
    icon: CheckCircle,
  },
  CANCELLED: {
    labelKey: "Cancelled",
    color: "var(--danger)",
    bgColor: "var(--danger-light)",
    icon: XCircle,
  },
};

const ACTIVE_ORDER_STEPS: ActiveOrderTimelineStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

function OrdersListSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 bg-[var(--bg-muted)] rounded-xl" />
      ))}
    </div>
  );
}

function LoginPrompt() {
  const t = useTranslations("OrdersPage");
  const locale = useLocale();
  const isRTL = locale === "ar";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center max-w-md mx-auto py-12 sm:py-16"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="w-24 h-24 bg-[var(--primary-light)] rounded-full flex items-center justify-center mx-auto mb-6">
        <LogIn className="w-12 h-12 text-[var(--primary)]" />
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        {t("LoginRequired.Title")}
      </h2>
      <p className="text-[var(--text-secondary)] mb-6">
        {t("LoginRequired.Description")}
      </p>
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
        style={{
          background:
            "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
        }}
      >
        <LogIn className="w-5 h-5" />
        {t("LoginRequired.LoginButton")}
      </Link>
      <p className="mt-4 text-sm text-[var(--text-muted)]">
        {t("LoginRequired.NoAccount")}{" "}
        <Link href="/auth/signup" className="text-[var(--primary)] hover:underline">
          {t("LoginRequired.SignUp")}
        </Link>
      </p>
    </motion.div>
  );
}

function OrderDetailModal({
  order,
  onClose,
}: {
  order: SerializedOrder;
  onClose: () => void;
}) {
  const t = useTranslations("OrdersPage");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const statusConfig = STATUS_CONFIG[order.status];
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-card)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {t("OrderDetail.Title")} #{order.orderNumber}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {new Date(order.createdAt).toLocaleString(locale)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-muted)] rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          <div
            className={`flex items-center gap-3 p-4 rounded-xl ${isRTL ? "flex-row-reverse" : ""}`}
            style={{ backgroundColor: statusConfig.bgColor }}
          >
            <StatusIcon className="w-6 h-6" style={{ color: statusConfig.color }} />
            <div className={isRTL ? "text-right" : ""}>
              <p className="text-sm text-[var(--text-muted)]">
                {t("OrderDetail.Status")}
              </p>
              <p className="font-semibold" style={{ color: statusConfig.color }}>
                {t(`Status.${order.status}`)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-[var(--text-primary)]">
              {t("OrderDetail.DeliveryInfo")}
            </h3>
            <div
              className={`flex items-start gap-3 text-sm ${isRTL ? "flex-row-reverse text-right" : ""}`}
            >
              <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
              <span className="text-[var(--text-primary)]">{order.address}</span>
            </div>
            <div
              className={`flex items-center gap-3 text-sm ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <Phone className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-primary)]">{order.customerPhone}</span>
            </div>
            {order.customerEmail && (
              <div
                className={`flex items-center gap-3 text-sm ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-[var(--text-primary)]">{order.customerEmail}</span>
              </div>
            )}
          </div>

          <div
            className={`flex items-center gap-3 text-sm ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <CreditCard className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-[var(--text-primary)]">
              {order.paymentMethod === "CASH_ON_DELIVERY"
                ? t("OrderDetail.CashOnDelivery")
                : t("OrderDetail.BankTransfer")}
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-[var(--text-primary)]">
              {t("OrderDetail.Items")}
            </h3>
            {order.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 bg-[var(--bg-muted)] rounded-xl ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--bg)] flex-shrink-0">
                  {item.productImage ? (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-[var(--text-muted)]" />
                    </div>
                  )}
                </div>
                <div className={`flex-1 ${isRTL ? "text-right" : ""}`}>
                  <p className="font-medium text-[var(--text-primary)]">
                    {item.productName}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {item.quantity} × {item.unitPrice.toFixed(3)} TND
                  </p>
                </div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {item.totalPrice.toFixed(3)} TND
                </p>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="bg-[var(--warning-light)] rounded-xl p-4">
              <h3 className="font-semibold text-[var(--warning)] mb-2">
                {t("OrderDetail.Notes")}
              </h3>
              <p className="text-sm text-[var(--text-primary)]">{order.notes}</p>
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">
                {t("OrderDetail.Subtotal")}
              </span>
              <span className="text-[var(--text-primary)]">
                {order.subtotal.toFixed(3)} TND
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">
                {t("OrderDetail.Shipping")}
              </span>
              <span
                className={
                  order.shippingCost === 0
                    ? "text-[var(--success)]"
                    : "text-[var(--text-primary)]"
                }
              >
                {order.shippingCost === 0
                  ? t("OrderDetail.Free")
                  : `${order.shippingCost.toFixed(3)} TND`}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-[var(--border)]">
              <span className="text-[var(--text-primary)]">
                {t("OrderDetail.Total")}
              </span>
              <span className="text-[var(--primary)]">
                {order.total.toFixed(3)} TND
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function OrdersPage() {
  const t = useTranslations("OrdersPage");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<SerializedOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SerializedOrder | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (isCancelled) {
          return;
        }

        setUser(currentUser);

        if (currentUser) {
          const result = await getOrdersByUser(currentUser.id);
          if (!isCancelled) {
            setOrders(result.data || []);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isCancelled = true;
    };
  }, []);

  const activeOrdersCount = useMemo(
    () =>
      orders.filter(
        (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED",
      ).length,
    [orders],
  );

  const heroStats = useMemo(() => {
    if (isLoading || !user) {
      return undefined;
    }

    return [
      { value: t("TotalOrders", { count: orders.length }) },
      { value: t("ActiveOrders", { count: activeOrdersCount }) },
    ];
  }, [activeOrdersCount, isLoading, orders.length, t, user]);

  return (
    <div className="min-h-screen bg-[var(--bg)]" dir={isRTL ? "rtl" : "ltr"}>
      <PageHero
        badge={t("Badge")}
        badgeIcon={<ClipboardList className="w-4 h-4 text-[#d4a853]" />}
        title={t("Title")}
        description={t("Subtitle")}
        stats={heroStats}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <OrdersListSkeleton />
        ) : !user ? (
          <LoginPrompt />
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-[var(--bg-muted)] rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-[var(--text-muted)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {t("NoOrders.Title")}
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              {t("NoOrders.Description")}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
              }}
            >
              <Package className="w-5 h-5" />
              {t("NoOrders.BrowseProducts")}
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => {
              const statusConfig = STATUS_CONFIG[order.status];
              const StatusIcon = statusConfig.icon;
              const activeStepIndex = ACTIVE_ORDER_STEPS.findIndex(
                (step) => step === order.status,
              );

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden hover:border-[var(--primary)]/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="p-4 sm:p-6">
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRTL ? "sm:flex-row-reverse" : ""}`}
                    >
                      <div className={isRTL ? "text-right" : ""}>
                        <div
                          className={`flex items-center gap-2 mb-1 ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                        >
                          <h3 className="font-semibold text-[var(--text-primary)]">
                            #{order.orderNumber}
                          </h3>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{
                              backgroundColor: statusConfig.bgColor,
                              color: statusConfig.color,
                            }}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {t(`Status.${order.status}`)}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-4 text-sm text-[var(--text-muted)] ${isRTL ? "flex-row-reverse justify-end" : ""}`}
                        >
                          <span
                            className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}
                          >
                            <Calendar className="w-4 h-4" />
                            {new Date(order.createdAt).toLocaleDateString(locale)}
                          </span>
                          <span
                            className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}
                          >
                            <Package className="w-4 h-4" />
                            {order.items.length} {t("Items")}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}
                      >
                        <div className={isRTL ? "text-left" : "text-right"}>
                          <p className="text-sm text-[var(--text-muted)]">
                            {t("TotalAmount")}
                          </p>
                          <p className="text-lg font-bold text-[var(--primary)]">
                            {order.total.toFixed(3)} TND
                          </p>
                        </div>
                        <div
                          className={`p-2 rounded-full bg-[var(--bg-muted)] text-[var(--text-muted)] ${isRTL ? "rotate-180" : ""}`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div
                      className={`mt-4 pt-4 border-t border-[var(--border)] flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                    >
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div
                            key={item.id}
                            className="w-10 h-10 rounded-lg border-2 border-[var(--bg-card)] overflow-hidden bg-[var(--bg-muted)]"
                            style={{ zIndex: 3 - idx }}
                          >
                            {item.productImage ? (
                              <Image
                                src={item.productImage}
                                alt={item.productName}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-4 h-4 text-[var(--text-muted)]" />
                              </div>
                            )}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-10 h-10 rounded-lg border-2 border-[var(--bg-card)] bg-[var(--bg-muted)] flex items-center justify-center">
                            <span className="text-xs font-medium text-[var(--text-muted)]">
                              +{order.items.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-muted)] flex-1 truncate">
                        {order.items.map((i) => i.productName).join(", ")}
                      </p>
                    </div>
                  </div>

                  {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                    <div className="px-4 sm:px-6 pb-4">
                      <div className="flex items-center gap-1">
                        {ACTIVE_ORDER_STEPS.map((step, idx) => {
                          const isActive = activeStepIndex >= idx;
                          const isCurrent = order.status === step;

                          return (
                            <div key={step} className="flex-1">
                              <div
                                className={`h-1.5 rounded-full transition-colors ${isActive
                                    ? isCurrent
                                      ? "bg-[var(--primary)]"
                                      : "bg-[var(--success)]"
                                    : "bg-[var(--border)]"
                                  }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
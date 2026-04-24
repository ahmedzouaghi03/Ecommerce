"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  PartyPopper,
  Home,
  ShoppingBag,
} from "lucide-react";
import { getOrderById } from "@/actions/ordersActions";
import type {
  ActiveOrderTimelineStatus,
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

function OrderDetailContentSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-14 bg-[var(--bg-muted)] rounded-xl" />
      <div className="h-40 bg-[var(--bg-muted)] rounded-xl" />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-64 bg-[var(--bg-muted)] rounded-xl" />
        <div className="h-64 bg-[var(--bg-muted)] rounded-xl" />
      </div>
      <div className="h-80 bg-[var(--bg-muted)] rounded-xl" />
    </div>
  );
}

function OrderNotFound() {
  const t = useTranslations("OrderDetailPage");
  const locale = useLocale();
  const isRTL = locale === "ar";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center max-w-md mx-auto py-12"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="w-24 h-24 bg-[var(--bg-muted)] rounded-full flex items-center justify-center mx-auto mb-6">
        <Package className="w-12 h-12 text-[var(--text-muted)]" />
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        {t("NotFound.Title")}
      </h2>
      <p className="text-[var(--text-secondary)] mb-6">
        {t("NotFound.Description")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/orders"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
        >
          <ShoppingBag className="w-5 h-5" />
          {t("NotFound.ViewOrders")}
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
          }}
        >
          <Home className="w-5 h-5" />
          {t("NotFound.GoHome")}
        </Link>
      </div>
    </motion.div>
  );
}

function SuccessBanner({ orderNumber }: { orderNumber: string }) {
  const t = useTranslations("OrderDetailPage");
  const locale = useLocale();
  const isRTL = locale === "ar";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--success-light)] border border-[var(--success)]/30 rounded-2xl p-6 mb-6"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse text-right" : ""}`}
      >
        <div className="w-12 h-12 bg-[var(--success)] rounded-full flex items-center justify-center flex-shrink-0">
          <PartyPopper className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--success)]">
            {t("Success.Title")}
          </h2>
          <p className="text-[var(--text-primary)] mt-1">
            {t("Success.Description", { orderNumber })}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {t("Success.NextSteps")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const t = useTranslations("OrderDetailPage");
  const locale = useLocale();
  const isRTL = locale === "ar";

  const rawOrderId = params.id;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId || "";
  const isSuccess = searchParams.get("success") === "true";

  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<SerializedOrder | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchOrder = async () => {
      try {
        if (!orderId) {
          if (!isCancelled) {
            setIsLoading(false);
          }
          return;
        }

        const result = await getOrderById(orderId);
        if (!isCancelled && result.success && result.data) {
          setOrder(result.data);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchOrder();

    return () => {
      isCancelled = true;
    };
  }, [orderId]);

  const heroHighlight = order
    ? `#${order.orderNumber}`
    : orderId
      ? `#${orderId.slice(0, 8)}`
      : undefined;

  const heroDescription = order
    ? t("OrderedOn", {
      date: new Date(order.createdAt).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    })
    : t("TrackOrder");

  const heroStats = useMemo(() => {
    if (!isLoading && order) {
      return [
        { value: t(`Status.${order.status}`) },
        { value: `${order.total.toFixed(3)} TND`, label: t("Total") },
      ];
    }
    return [{ value: t("TrackOrder") }];
  }, [isLoading, order, t]);

  const currentStepIndex = useMemo(() => {
    if (!order) {
      return -1;
    }

    return ACTIVE_ORDER_STEPS.findIndex((status) => status === order.status);
  }, [order]);

  const progressWidth = useMemo(() => {
    if (currentStepIndex < 0) {
      return "0%";
    }

    return `${(currentStepIndex / (ACTIVE_ORDER_STEPS.length - 1)) * 100}%`;
  }, [currentStepIndex]);

  const statusConfig = order ? STATUS_CONFIG[order.status] : null;

  return (
    <div className="min-h-screen bg-[var(--bg)]" dir={isRTL ? "rtl" : "ltr"}>
      <PageHero
        badge={t("TrackOrder")}
        badgeIcon={<Package className="w-4 h-4 text-[#d4a853]" />}
        title={t("Title")}
        highlight={heroHighlight}
        description={heroDescription}
        stats={heroStats}
      />

      <section className="bg-[var(--bg-card)]/80 border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Link
            href="/orders"
            className={`inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <ChevronLeft className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
            {t("BackToOrders")}
          </Link>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <OrderDetailContentSkeleton />
        ) : !order || !statusConfig ? (
          <OrderNotFound />
        ) : (
          <>
            {isSuccess && <SuccessBanner orderNumber={order.orderNumber} />}

            <div className={`mb-6 flex ${isRTL ? "justify-end" : "justify-start"}`}>
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isRTL ? "flex-row-reverse" : ""}`}
                style={{ backgroundColor: statusConfig.bgColor }}
              >
                <statusConfig.icon className="w-5 h-5" style={{ color: statusConfig.color }} />
                <span className="font-semibold" style={{ color: statusConfig.color }}>
                  {t(`Status.${order.status}`)}
                </span>
              </div>
            </div>

            {order.status !== "CANCELLED" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 mb-6"
              >
                <h2
                  className={`text-lg font-bold text-[var(--text-primary)] mb-6 ${isRTL ? "text-right" : ""}`}
                >
                  {t("TrackOrder")}
                </h2>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    {ACTIVE_ORDER_STEPS.map((status, index) => {
                      const stepConfig = STATUS_CONFIG[status];
                      const StepIcon = stepConfig.icon;
                      const isCompleted = index <= currentStepIndex;
                      const isCurrent = index === currentStepIndex;

                      return (
                        <div key={status} className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted
                                ? isCurrent
                                  ? "bg-[var(--primary)] text-white ring-4 ring-[var(--primary)]/20"
                                  : "bg-[var(--success)] text-white"
                                : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                              }`}
                          >
                            {isCompleted && !isCurrent ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <StepIcon className="w-5 h-5" />
                            )}
                          </div>
                          <p
                            className={`mt-2 text-xs font-medium text-center ${isCompleted
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--text-muted)]"
                              }`}
                          >
                            {t(`Status.${status}`)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-[var(--border)] -z-0">
                    <div
                      className="h-full bg-[var(--success)] transition-all duration-500"
                      style={{ width: progressWidth }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6"
              >
                <h2
                  className={`text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <Truck className="w-5 h-5 text-[var(--primary)]" />
                  {t("DeliveryInfo")}
                </h2>
                <div className="space-y-3">
                  <div
                    className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}
                  >
                    <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-1" />
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">{t("Address")}</p>
                      <p className="text-[var(--text-primary)]">{order.address}</p>
                    </div>
                  </div>
                  <div
                    className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}
                  >
                    <Phone className="w-4 h-4 text-[var(--text-muted)] mt-1" />
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">{t("Phone")}</p>
                      <p className="text-[var(--text-primary)]">{order.customerPhone}</p>
                    </div>
                  </div>
                  {order.customerEmail && (
                    <div
                      className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}
                    >
                      <Mail className="w-4 h-4 text-[var(--text-muted)] mt-1" />
                      <div>
                        <p className="text-sm text-[var(--text-muted)]">{t("Email")}</p>
                        <p className="text-[var(--text-primary)]">{order.customerEmail}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6"
              >
                <h2
                  className={`text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <CreditCard className="w-5 h-5 text-[var(--primary)]" />
                  {t("PaymentInfo")}
                </h2>
                <div className="space-y-3">
                  <div
                    className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}
                  >
                    <CreditCard className="w-4 h-4 text-[var(--text-muted)] mt-1" />
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">
                        {t("PaymentMethod")}
                      </p>
                      <p className="text-[var(--text-primary)]">
                        {order.paymentMethod === "CASH_ON_DELIVERY"
                          ? t("CashOnDelivery")
                          : t("BankTransfer")}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}
                  >
                    <Calendar className="w-4 h-4 text-[var(--text-muted)] mt-1" />
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">{t("OrderDate")}</p>
                      <p className="text-[var(--text-primary)]">
                        {new Date(order.createdAt).toLocaleString(locale)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {order.notes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-[var(--warning-light)] rounded-2xl border border-[var(--warning)]/20 p-6 mb-6"
              >
                <h2
                  className={`text-lg font-bold text-[var(--warning)] mb-2 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <Package className="w-5 h-5" />
                  {t("OrderNotes")}
                </h2>
                <p className={`text-[var(--text-primary)] ${isRTL ? "text-right" : ""}`}>
                  {order.notes}
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden mb-6"
            >
              <div className="p-6 border-b border-[var(--border)]">
                <h2
                  className={`text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <Package className="w-5 h-5 text-[var(--primary)]" />
                  {t("OrderItems")}
                </h2>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--bg-muted)] flex-shrink-0">
                      {item.productImage ? (
                        <Image
                          src={item.productImage}
                          alt={item.productName}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    <div className={`flex-1 ${isRTL ? "text-right" : ""}`}>
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {item.productName}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        {item.quantity} × {item.unitPrice.toFixed(3)} TND
                      </p>
                    </div>
                    <p className="font-bold text-[var(--primary)]">
                      {item.totalPrice.toFixed(3)} TND
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-[var(--bg-muted)] space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{t("Subtotal")}</span>
                  <span className="text-[var(--text-primary)]">
                    {order.subtotal.toFixed(3)} TND
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{t("Shipping")}</span>
                  <span
                    className={
                      order.shippingCost === 0
                        ? "text-[var(--success)]"
                        : "text-[var(--text-primary)]"
                    }
                  >
                    {order.shippingCost === 0
                      ? t("Free")
                      : `${order.shippingCost.toFixed(3)} TND`}
                  </span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-3 border-t border-[var(--border)]">
                  <span className="text-[var(--text-primary)]">{t("Total")}</span>
                  <span className="text-[var(--primary)]">
                    {order.total.toFixed(3)} TND
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`flex flex-col sm:flex-row gap-4 ${isRTL ? "sm:flex-row-reverse" : ""}`}
            >
              <Link
                href="/orders"
                className="flex-1 py-3 rounded-xl font-semibold border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors text-center"
              >
                {t("ViewAllOrders")}
              </Link>
              <Link
                href="/products"
                className="flex-1 py-3 rounded-xl font-semibold text-white text-center transition-all hover:scale-[1.02]"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                }}
              >
                {t("ContinueShopping")}
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
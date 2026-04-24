"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import CategorySelector from "@/components/main/CategorySelector";
import PageHero from "@/components/main/PageHero";
import CartPreview from "@/components/main/CartPreview";
import BoxSizeSelector from "@/components/main/BoxSizeSelector";
import ImageSlider from "@/components/main/ImageSlider";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronRight,
  ExternalLink,
  Package,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { getProducts } from "@/actions/productActions";
import { getCurrentUser } from "@/actions/authActions";
import { AuthUser } from "@/types";
import { getCategoryBySlug } from "@/actions/categoriesAction";
import { usePersistentCart } from "@/lib/usePersistentCart";
import {
  MAX_FLAVOURS,
  buildMixedSelectionCartItem,
  getBoxesForCustomerType,
  splitBoxCountEvenly,
} from "@/lib/cart";
import type { CustomerType, SerializedProductWithCategory } from "@/types";

// ── Products Grid Skeleton (section-level) ─────────────────────────────────────
function ProductsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--bg-card)] rounded-xl overflow-hidden border border-[var(--border)] animate-pulse"
        >
          <div className="relative aspect-square bg-[var(--bg-muted)]" />
          <div className="p-4">
            <div className="h-5 bg-[var(--bg-muted)] rounded w-2/3 mb-2" />
            <div className="h-4 bg-[var(--bg-muted)] rounded w-full mb-3" />
            <div className="h-5 bg-[var(--bg-muted)] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Login Modal ───────────────────────────────────────────────────────────────
function LoginModal({
  onClose,
  onLoginSuccess,
}: {
  onClose: () => void;
  onLoginSuccess: () => void;
}) {
  const t = useTranslations("ProductsPage.LoginModal");

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
        className="bg-[var(--bg-card)] rounded-2xl p-8 max-w-md w-full shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {t("Title")}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("Subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-muted)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        <LoginForm
          onSuccess={onLoginSuccess}
          showSignupLink={true}
          signupLinkHref="/auth/signup?type=restaurant"
          translationKey="ProductsPage.LoginModal"
          showRestaurantNote={true}
          restaurantNoteText={t("RestaurantNote")}
        />
      </motion.div>
    </motion.div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({
  product,
  isSelected,
  assignedCount,
  showAssignedCount,
  onToggle,
  selectionDisabled,
  customerType,
}: {
  product: SerializedProductWithCategory;
  isSelected: boolean;
  assignedCount: number;
  showAssignedCount: boolean;
  onToggle: () => void;
  selectionDisabled: boolean;
  customerType: CustomerType;
}) {
  const price =
    customerType === "restaurant"
      ? product.priceRestaurant
      : product.priceIndividual;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => {
        if (selectionDisabled) return;
        onToggle();
      }}
      title={
        selectionDisabled
          ? "You already selected the maximum number of flavours"
          : "Click to select / unselect"
      }
      className={`bg-[var(--bg-card)] rounded-xl overflow-hidden border transition-all cursor-pointer ${isSelected
          ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20"
          : "border-[var(--border)]"
        } ${selectionDisabled ? "opacity-60" : ""}`}
    >
      <div className="relative aspect-square bg-[var(--bg-muted)]">
        <ImageSlider
          images={product.images || []}
          altBase={product.name}
          className="w-full h-full"
          imageClassName="object-cover"
          stopPropagation={true}
          emptyState={
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-[var(--text-muted)]" />
            </div>
          }
        />

        <div className="absolute top-3 left-3 z-20">
          <Link
            href={`/products/${product.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full bg-black/45 hover:bg-black/60 text-white backdrop-blur transition-colors"
            aria-label="View details"
            title="View details"
          >
            <ExternalLink className="w-4 h-4" />
            Details
          </Link>
        </div>

        {isSelected && (
          <div className="absolute top-3 right-3 bg-[var(--primary)] text-white min-w-8 h-8 px-2 rounded-full flex items-center justify-center font-bold text-sm z-20 gap-1">
            <Check className="w-4 h-4" />
            {showAssignedCount && assignedCount > 0 && <span>{assignedCount}</span>}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="text-[var(--primary)] font-bold">
          {price.toFixed(3)} TND / piece
        </div>

        <div className="mt-3">
          <div
            className={`text-xs font-medium ${isSelected ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
              }`}
          >
            {isSelected
              ? showAssignedCount && assignedCount > 0
                ? `Selected • ${assignedCount} pieces`
                : "Selected"
              : selectionDisabled
                ? "Max flavours selected"
                : "Click to select"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const t = useTranslations("ProductsPage");
  const tCart = useTranslations("ProductsPage.CartPreview");
  const tOrderReview = useTranslations("CheckoutPage.OrderReview");

  const router = useRouter();
  const searchParams = useSearchParams();

  const categorySlug = searchParams.get("category");
  const typeParam = searchParams.get("type");

  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [products, setProducts] = useState<SerializedProductWithCategory[]>([]);

  const [userLoading, setUserLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const [customerType, setCustomerType] = useState<CustomerType>("individual");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { cart, setCart, cartLoaded } = usePersistentCart();

  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [selectedFlavours, setSelectedFlavours] = useState<string[]>([]);
  const canAddToCart = selectedFlavours.length > 0 && selectedBox !== null;

  const [urlCategoryResolved, setUrlCategoryResolved] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      try {
        setUserLoading(true);
        const currentUser = await getCurrentUser();
        if (cancelled) return;
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching current user:", error);
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    };

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const isRestaurantUser = user?.userType === "RESTAURANT";

  useEffect(() => {
    let cancelled = false;

    const applyCategoryFromUrl = async () => {
      if (!categorySlug) {
        setUrlCategoryResolved(true);
        return;
      }

      try {
        setUrlCategoryResolved(false);
        const result = await getCategoryBySlug(categorySlug);
        if (cancelled) return;

        if (result.success && result.data?.id) {
          setSelectedCategoryId(result.data.id);
        } else {
          setSelectedCategoryId(null);
        }
      } catch (error) {
        console.error("Error applying category from URL:", error);
        if (!cancelled) setSelectedCategoryId(null);
      } finally {
        if (!cancelled) setUrlCategoryResolved(true);
      }
    };

    applyCategoryFromUrl();
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  useEffect(() => {
    if (userLoading) return;

    if (typeParam === "restaurant") {
      if (isRestaurantUser) {
        setCustomerType("restaurant");
      } else {
        setCustomerType("individual");
        setShowLoginModal(true);
      }
      return;
    }

    if (typeParam === "individual") {
      setCustomerType("individual");
      return;
    }

    if (isRestaurantUser) setCustomerType("restaurant");
  }, [typeParam, userLoading, isRestaurantUser]);

  useEffect(() => {
    if (!urlCategoryResolved) return;

    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        setProductsError(null);

        const result = await getProducts({
          isActive: true,
          categoryId: selectedCategoryId || undefined,
        });

        if (cancelled) return;

        if (!result.success) {
          setProductsError(result.error || "Failed to load products");
          setProducts([]);
          return;
        }

        setProducts(result.data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
        if (!cancelled) {
          setProductsError("Failed to load products");
          setProducts([]);
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, urlCategoryResolved]);

  useEffect(() => {
    if (selectedFlavours.length === 0) setSelectedBox(null);
  }, [selectedFlavours.length]);

  const boxes = useMemo(
    () => getBoxesForCustomerType(isRestaurantUser, customerType),
    [customerType, isRestaurantUser],
  );

  const currentBoxConfig = useMemo(() => {
    if (selectedBox === null) return null;
    return boxes.find((box) => box.pieces === selectedBox) ?? null;
  }, [selectedBox, boxes]);

  const selectedTypesCount = selectedFlavours.length;

  const autoCounts = useMemo(
    () => splitBoxCountEvenly(selectedBox, selectedFlavours),
    [selectedBox, selectedFlavours],
  );

  const selectedFlavourSet = useMemo(
    () => new Set(selectedFlavours),
    [selectedFlavours],
  );

  const productNameLookup = useMemo(() => {
    const lookup: Record<string, { id: string; name: string }> = {};
    for (const product of products) {
      lookup[product.id] = { id: product.id, name: product.name };
    }
    return lookup;
  }, [products]);

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedFlavours([]);
    setSelectedBox(null);
  };

  const handleLoginSuccess = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);

    setShowLoginModal(false);

    if (currentUser?.userType === "RESTAURANT") {
      setCustomerType("restaurant");
    }

    setSelectedBox(null);
    setSelectedFlavours([]);

    router.refresh();
  };

  const toggleFlavour = (productId: string) => {
    setSelectedFlavours((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId);
      if (prev.length >= MAX_FLAVOURS) return prev;
      return [...prev, productId];
    });
  };

  const handleCustomerTypeChange = (type: CustomerType) => {
    if (type === "restaurant" && !isRestaurantUser) {
      setShowLoginModal(true);
      return;
    }

    setCustomerType(type);
    setSelectedBox(null);
    setSelectedFlavours([]);
  };

  const handleAddToCart = () => {
    if (!currentBoxConfig) return;
    if (selectedFlavours.length === 0) return;

    const baseProduct = products.find((product) => product.id === selectedFlavours[0]);

    const unitPrice = baseProduct
      ? customerType === "restaurant"
        ? baseProduct.priceRestaurant
        : baseProduct.priceIndividual
      : 0;

    const newItem = buildMixedSelectionCartItem({
      selectedProductIds: selectedFlavours,
      productsById: productNameLookup,
      boxSize: currentBoxConfig.pieces,
      unitPrice,
      assignedCounts: autoCounts,
    });

    setCart((prev) => [...prev, newItem]);
    setSelectedBox(null);
    setSelectedFlavours([]);
  };

  const selectedFlavourNames = useMemo(() => {
    return selectedFlavours
      .map((id) => productNameLookup[id]?.name)
      .filter((name): name is string => Boolean(name));
  }, [selectedFlavours, productNameLookup]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <PageHero
        badge={t("Hero.Badge")}
        title={t("Hero.Title")}
        description={t("Hero.Subtitle")}
      />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Customer Type Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 mb-8"
        >
          <h2 className="text-lg font-medium text-[var(--text-secondary)]">
            {t("CustomerType.Title")}
          </h2>

          <div className="flex gap-4">
            <button
              onClick={() => handleCustomerTypeChange("individual")}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all ${customerType === "individual"
                  ? "border-[var(--primary)] bg-[var(--primary-light)]"
                  : "border-[var(--border)] hover:border-[var(--primary)]/50"
                }`}
            >
              <User
                className={`w-5 h-5 ${customerType === "individual"
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-muted)]"
                  }`}
              />
              <span
                className={`font-medium ${customerType === "individual"
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-primary)]"
                  }`}
              >
                {t("CustomerType.Individual")}
              </span>
              {customerType === "individual" && (
                <Check className="w-5 h-5 text-[var(--primary)]" />
              )}
            </button>

            <button
              onClick={() => handleCustomerTypeChange("restaurant")}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all ${customerType === "restaurant"
                  ? "border-[var(--primary)] bg-[var(--primary-light)]"
                  : "border-[var(--border)] hover:border-[var(--primary)]/50"
                }`}
            >
              <Building2
                className={`w-5 h-5 ${customerType === "restaurant"
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-muted)]"
                  }`}
              />
              <span
                className={`font-medium ${customerType === "restaurant"
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-primary)]"
                  }`}
              >
                {t("CustomerType.Restaurant")}
              </span>
              {customerType === "restaurant" && (
                <Check className="w-5 h-5 text-[var(--primary)]" />
              )}
            </button>
          </div>

          {customerType === "restaurant" && isRestaurantUser && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-[var(--success)] flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {t("CustomerType.LoggedInAs")} {user?.name}
            </motion.p>
          )}
        </motion.div>

        {/* Step 1: Flavours */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {selectedTypesCount >= MAX_FLAVOURS && (
            <div className="bg-[var(--warning-light)] border border-[var(--warning)] rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--warning)]" />
              <p className="text-sm text-[var(--warning)]">
                {t("Progress.MaxTypesReached", { count: MAX_FLAVOURS })}
              </p>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-64 flex-shrink-0">
              <div className="sticky top-4">
                <CategorySelector
                  selectedCategoryId={selectedCategoryId}
                  onCategoryChange={handleCategoryChange}
                />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {t("Flavours.Title")}
              </h3>

              {selectedFlavourNames.length > 0 && (
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Selected:{" "}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedFlavourNames.join(" + ")}
                  </span>
                </p>
              )}

              {productsError && (
                <div className="bg-[var(--danger-light)] border border-[var(--danger)] rounded-xl p-4 mb-6 text-[var(--danger)]">
                  {productsError}
                </div>
              )}

              {productsLoading ? (
                <ProductsGridSkeleton />
              ) : products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => {
                    const isSelected = selectedFlavourSet.has(product.id);
                    const assignedCount = autoCounts[product.id] || 0;
                    const selectionDisabled =
                      !isSelected && selectedFlavours.length >= MAX_FLAVOURS;

                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isSelected={isSelected}
                        assignedCount={assignedCount}
                        showAssignedCount={selectedBox !== null}
                        onToggle={() => toggleFlavour(product.id)}
                        selectionDisabled={selectionDisabled}
                        customerType={customerType}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
                  <Package className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)]">
                    {t("Flavours.NoProducts")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Step 2: Box size (after selecting flavours) */}
        {selectedFlavours.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 text-center">
              {t("BoxSelection.Title")}
            </h3>

            <BoxSizeSelector
              boxes={boxes}
              selectedBox={selectedBox}
              onSelect={setSelectedBox}
              piecesLabel={t("BoxSelection.Pieces")}
              maxTypesLabel={(count) => t("BoxSelection.MaxTypes", { count })}
            />
          </motion.div>
        )}

        {/* Step 3: Add to cart */}
        {selectedFlavours.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-center"
          >
            <button
              onClick={canAddToCart ? handleAddToCart : undefined}
              disabled={!canAddToCart}
              className={`inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all
                ${canAddToCart
                  ? "hover:scale-105 cursor-pointer opacity-100"
                  : "opacity-60 cursor-not-allowed hover:scale-100 pointer-events-none"
                }
              `}
              style={{
                background:
                  "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
              }}
              title={!canAddToCart ? "Choose a box size first" : undefined}
            >
              <ShoppingCart className="w-5 h-5" />
              {t("AddToCart")}
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Wholesale CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-[var(--secondary)] to-[var(--secondary-hover)] rounded-2xl p-8 text-center text-white mt-12"
        >
          <h3 className="text-2xl font-bold mb-3" style={{ color: "white" }}>
            {t("Wholesale.Title")}
          </h3>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">
            {t("Wholesale.Description")}
          </p>
          <Link
            href="/contact"
            className="inline-block px-6 py-3 bg-white text-[var(--secondary)] font-semibold rounded-xl hover:bg-[var(--bg-muted)] transition-colors"
          >
            {t("Wholesale.ContactUs")}
          </Link>
        </motion.div>
      </section>

      <AnimatePresence>
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
      </AnimatePresence>

      {cartLoaded && cart.length > 0 && (
        <CartPreview
          cart={cart}
          onRemove={(index) =>
            setCart((prev) => prev.filter((_, i) => i !== index))
          }
          title={tCart("Title")}
          totalLabel={tCart("Total")}
          checkoutLabel={tCart("Checkout")}
          boxLabel={(count) => tOrderReview("BoxOf", { count })}
        />
      )}
    </div>
  );
}
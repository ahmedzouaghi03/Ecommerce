"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Package, ShoppingCart, Tag } from "lucide-react";

import PageHero from "@/components/main/PageHero";
import ImageGallery from "@/components/main/ImageGallery";
import ImageCarousel from "@/components/main/ImageCarousel";
import CartPreview from "@/components/main/CartPreview";
import BoxSizeSelector from "@/components/main/BoxSizeSelector";

import { getProductBySlug, getProducts } from "@/actions/productActions";
import { getCurrentUser } from "@/actions/authActions";
import { AuthUser } from "@/types";
import { usePersistentCart } from "@/lib/usePersistentCart";
import { buildSingleProductCartItem, getBoxesForCustomerType } from "@/lib/cart";
import type { CustomerType, SerializedProductWithCategory } from "@/types";

export default function ProductDetailsPage() {
    const locale = useLocale();
    const isRtl = locale === "ar";

    const routeParams = useParams<{ slug?: string | string[] }>();
    const slug =
        typeof routeParams?.slug === "string"
            ? routeParams.slug
            : Array.isArray(routeParams?.slug)
                ? routeParams.slug[0]
                : undefined;

    const t = useTranslations("ProductDetailPage");
    const tProducts = useTranslations("ProductsPage");
    const tCart = useTranslations("ProductsPage.CartPreview");
    const tOrderReview = useTranslations("CheckoutPage.OrderReview");

    const [productLoading, setProductLoading] = useState(true);
    const [productError, setProductError] = useState<string | null>(null);
    const [product, setProduct] = useState<SerializedProductWithCategory | null>(null);

    const [user, setUser] = useState<AuthUser | null>(null);
    const isRestaurantUser = user?.userType === "RESTAURANT";

    const [similarLoading, setSimilarLoading] = useState(false);
    const [similar, setSimilar] = useState<SerializedProductWithCategory[]>([]);

    const [carouselOpen, setCarouselOpen] = useState(false);
    const [carouselIndex, setCarouselIndex] = useState(0);

    const { cart, setCart, cartLoaded } = usePersistentCart();

    const [customerType, setCustomerType] = useState<CustomerType>("individual");
    const [selectedBox, setSelectedBox] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setProductLoading(true);
            setProductError(null);
            setProduct(null);
            setSimilar([]);
            setSimilarLoading(false);
            setSelectedBox(null);
            setCarouselOpen(false);

            if (!slug) {
                setProductError("NOT_FOUND");
                setProductLoading(false);
                return;
            }

            const [productResult, userResult] = await Promise.allSettled([
                getProductBySlug(slug),
                getCurrentUser(),
            ]);

            if (cancelled) return;

            if (userResult.status === "fulfilled") {
                setUser(userResult.value);
                setCustomerType(
                    userResult.value?.userType === "RESTAURANT" ? "restaurant" : "individual",
                );
            } else {
                setUser(null);
                setCustomerType("individual");
            }

            if (
                productResult.status !== "fulfilled" ||
                !productResult.value.success ||
                !productResult.value.data
            ) {
                setProduct(null);
                setProductError("NOT_FOUND");
                setProductLoading(false);
                return;
            }

            setProduct(productResult.value.data);
            setProductLoading(false);
        };

        load().catch(() => {
            if (cancelled) return;
            setProduct(null);
            setProductError("FAILED");
            setProductLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [slug]);

    useEffect(() => {
        let cancelled = false;

        const loadSimilar = async () => {
            if (!product?.category?.id || !product.id) {
                setSimilar([]);
                return;
            }

            setSimilarLoading(true);

            try {
                const result = await getProducts({
                    categoryId: product.category.id,
                    excludeId: product.id,
                    isActive: true,
                    limit: 4,
                    sortBy: "order",
                    sortOrder: "asc",
                });

                if (cancelled) return;

                if (!result.success || !result.data) {
                    setSimilar([]);
                    setSimilarLoading(false);
                    return;
                }

                setSimilar(result.data);
                setSimilarLoading(false);
            } catch {
                if (cancelled) return;
                setSimilar([]);
                setSimilarLoading(false);
            }
        };

        loadSimilar();

        return () => {
            cancelled = true;
        };
    }, [product?.id, product?.category?.id]);

    const boxes = useMemo(
        () => getBoxesForCustomerType(isRestaurantUser, customerType),
        [customerType, isRestaurantUser],
    );

    const canAddToCart = !!product && selectedBox !== null;

    const unitPrice = useMemo(() => {
        if (!product) return 0;
        if (isRestaurantUser && customerType === "restaurant") {
            return product.priceRestaurant;
        }
        return product.priceIndividual;
    }, [product, isRestaurantUser, customerType]);

    const handleAddToCart = () => {
        if (!product || selectedBox === null) return;

        const newItem = buildSingleProductCartItem({
            product: { id: product.id, name: product.name },
            boxSize: selectedBox,
            unitPrice,
        });

        setCart((prev) => [...prev, newItem]);
    };

    const isInitialProductLoading = productLoading && !product && !productError;
    const showErrorState = Boolean(productError) || (!productLoading && !product);

    const heroBadge = product?.category?.name ?? t("CategoryFallback");
    const heroTitle = product?.name ?? t("CategoryFallback");
    const heroDescription = product?.description ?? t("NoDescription");
    const images = product?.images ?? [];

    return (
        <div className="min-h-screen bg-[var(--bg)]" dir={isRtl ? "rtl" : "ltr"}>
            <PageHero badge={heroBadge} title={heroTitle} description={heroDescription} />

            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-6">
                    <Link
                        href="/products"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-muted)] transition-colors text-[var(--text-primary)] font-semibold"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {t("BackToProducts")}
                    </Link>
                </div>

                {showErrorState ? (
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 text-center">
                            <Package className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
                            <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">
                                {t("CategoryFallback")}
                            </h1>
                            <p className="mt-2 text-[var(--text-secondary)]">{t("NoDescription")}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid lg:grid-cols-2 gap-8 items-start">
                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm p-4">
                                {isInitialProductLoading ? (
                                    <div className="animate-pulse">
                                        <div className="aspect-square bg-[var(--bg-muted)] rounded-2xl" />
                                    </div>
                                ) : (
                                    product && (
                                        <ImageGallery
                                            images={images}
                                            title={product.name}
                                            onImageClick={(idx) => {
                                                setCarouselIndex(idx);
                                                setCarouselOpen(true);
                                            }}
                                        />
                                    )
                                )}
                            </div>

                            <div className="space-y-6">
                                {isInitialProductLoading ? (
                                    <div className="animate-pulse space-y-6">
                                        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
                                            <div className="h-6 w-40 bg-[var(--bg-muted)] rounded-full" />
                                            <div className="h-4 w-full bg-[var(--bg-muted)] rounded" />
                                            <div className="h-4 w-5/6 bg-[var(--bg-muted)] rounded" />
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
                                                <div className="h-4 w-24 bg-[var(--bg-muted)] rounded" />
                                                <div className="h-8 w-40 bg-[var(--bg-muted)] rounded" />
                                                <div className="h-4 w-28 bg-[var(--bg-muted)] rounded" />
                                            </div>
                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
                                                <div className="h-4 w-24 bg-[var(--bg-muted)] rounded" />
                                                <div className="h-8 w-40 bg-[var(--bg-muted)] rounded" />
                                                <div className="h-4 w-28 bg-[var(--bg-muted)] rounded" />
                                            </div>
                                        </div>

                                        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6">
                                            <div className="h-40 bg-[var(--bg-muted)] rounded-2xl" />
                                        </div>
                                    </div>
                                ) : (
                                    product && (
                                        <>
                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6">
                                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                                    <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
                                                        <Tag className="w-4 h-4" />
                                                        {product.category?.name ?? t("CategoryFallback")}
                                                    </span>

                                                    {product.category?.slug && (
                                                        <Link
                                                            href={`/products?category=${encodeURIComponent(product.category.slug)}`}
                                                            className="text-xs font-semibold px-3 py-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-muted)] transition-colors text-[var(--text-primary)]"
                                                        >
                                                            {t("ExploreCategory")}
                                                        </Link>
                                                    )}
                                                </div>

                                                {product.description ? (
                                                    <p className="text-[var(--text-secondary)] leading-relaxed">
                                                        {product.description}
                                                    </p>
                                                ) : (
                                                    <p className="text-[var(--text-muted)]">{t("NoDescription")}</p>
                                                )}
                                            </div>

                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6">
                                                    <div className="text-sm text-[var(--text-muted)] mb-2">
                                                        {t("IndividualPrice")}
                                                    </div>
                                                    <div className="text-2xl font-bold text-[var(--primary)]">
                                                        {product.priceIndividual.toFixed(3)} TND
                                                    </div>
                                                    <div className="text-sm text-[var(--text-secondary)] mt-1">
                                                        {t("PerUnit", { unit: product.unit ?? t("UnitFallback") })}
                                                    </div>
                                                </div>

                                                {isRestaurantUser && (
                                                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6">
                                                        <div className="text-sm text-[var(--text-muted)] mb-2">
                                                            {t("RestaurantPrice")}
                                                        </div>
                                                        <div className="text-2xl font-bold text-[var(--primary)]">
                                                            {product.priceRestaurant.toFixed(3)} TND
                                                        </div>
                                                        <div className="text-sm text-[var(--text-secondary)] mt-1">
                                                            {t("PerUnit", { unit: product.unit ?? t("UnitFallback") })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {!isRestaurantUser && (
                                                <div className="bg-[var(--warning-light)] border border-[var(--warning)] rounded-2xl p-5">
                                                    <p className="text-sm text-[var(--text-primary)]">
                                                        {t("RestaurantNote")}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6">
                                                {isRestaurantUser && (
                                                    <div className="flex items-center justify-center gap-2 mb-5">
                                                        <button
                                                            onClick={() => setCustomerType("individual")}
                                                            className={`px-4 py-2 rounded-xl border transition-all font-semibold ${customerType === "individual"
                                                                ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
                                                                : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                                                                }`}
                                                        >
                                                            Individual
                                                        </button>
                                                        <button
                                                            onClick={() => setCustomerType("restaurant")}
                                                            className={`px-4 py-2 rounded-xl border transition-all font-semibold ${customerType === "restaurant"
                                                                ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
                                                                : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                                                                }`}
                                                        >
                                                            Restaurant
                                                        </button>
                                                    </div>
                                                )}

                                                <BoxSizeSelector
                                                    boxes={boxes}
                                                    selectedBox={selectedBox}
                                                    onSelect={setSelectedBox}
                                                    piecesLabel={tProducts("BoxSelection.Pieces")}
                                                    maxTypesLabel={(count) =>
                                                        tProducts("BoxSelection.MaxTypes", { count })
                                                    }
                                                />

                                                <div className="mt-6 text-center">
                                                    <button
                                                        onClick={canAddToCart ? handleAddToCart : undefined}
                                                        disabled={!canAddToCart}
                                                        className={`inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all ${canAddToCart
                                                            ? "hover:scale-105 cursor-pointer opacity-100"
                                                            : "opacity-60 cursor-not-allowed hover:scale-100 pointer-events-none"
                                                            }`}
                                                        style={{
                                                            background:
                                                                "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                                                        }}
                                                    >
                                                        <ShoppingCart className="w-5 h-5" />
                                                        {tProducts("AddToCart")}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )
                                )}
                            </div>
                        </div>

                        <div className="mt-12">
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
                                {t("SimilarProducts")}
                            </h2>

                            {isInitialProductLoading || similarLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="animate-pulse bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden"
                                        >
                                            <div className="aspect-square bg-[var(--bg-muted)]" />
                                            <div className="p-4 space-y-2">
                                                <div className="h-4 bg-[var(--bg-muted)] rounded" />
                                                <div className="h-4 w-24 bg-[var(--bg-muted)] rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : similar.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                    {similar.map((relatedProduct) => (
                                        <Link
                                            key={relatedProduct.id}
                                            href={`/products/${relatedProduct.slug}`}
                                            className="block bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition"
                                        >
                                            <div className="relative aspect-square bg-[var(--bg-muted)]">
                                                {relatedProduct.images?.[0] ? (
                                                    <Image
                                                        src={relatedProduct.images[0]}
                                                        alt={relatedProduct.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Package className="w-10 h-10 text-[var(--text-muted)]" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <div className="font-semibold text-lg text-[var(--text-primary)]">
                                                    {relatedProduct.name}
                                                </div>
                                                <div className="text-[var(--text-secondary)] text-sm">
                                                    {relatedProduct.priceIndividual.toFixed(3)} TND
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[var(--text-muted)] text-sm">
                                    {tProducts("Flavours.NoProducts")}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>

            <AnimatePresence>
                {product && carouselOpen && images.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <ImageCarousel
                            images={images}
                            initialIndex={carouselIndex}
                            alt={product.name}
                            onClose={() => setCarouselOpen(false)}
                        />
                    </motion.div>
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
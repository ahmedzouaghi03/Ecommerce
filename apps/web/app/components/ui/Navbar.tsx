"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Locale, useTranslations } from "next-intl";
import { LoginButton } from "@/components/ui/LoginButton";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { LanguageSelector } from "@/components/ui/LanguageSelector";

type User = {
  name?: string | null;
  email?: string | null;
  profileImage?: string | null;
  role?: string | null;
} | null;

const NAV_ITEMS = [
  { href: "/", key: "Home" },
  { href: "/products", key: "Products" },
  { href: "/about", key: "About" },
  { href: "/contact", key: "Contact" },
];

export function AppHeader({
  user,
  changeLocaleAction,
}: {
  user: User;
  changeLocaleAction?: (locale: Locale) => Promise<void>;
}) {
  const pathname = usePathname();
  const t = useTranslations("Navbar");

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isAuth = pathname.startsWith("/auth");
  if (isAuth) return null;

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("pointerdown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const avatarInitial = (user?.name || user?.email || t("MemberFallback"))
    .charAt(0)
    .toUpperCase();

  const handleLocaleChange = useCallback(
    async (nextLocale: Locale) => {
      if (changeLocaleAction) {
        await changeLocaleAction(nextLocale);
      } else {
        document.cookie = `NEXT_LOCALE=${nextLocale}; path=/;`;
        window.location.reload();
      }
    },
    [changeLocaleAction],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/">
          <img
            src="/images/logo.png"
            alt="Seefood logo"
            className="size-18 mix-blend-multiply dark:mix-blend-screen"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "rounded-full px-3 py-2 text-sm font-medium transition",
                "hover:bg-sky-50 hover:text-sky-700",
                isActive(item.href)
                  ? "border border-sky-100 bg-sky-50 text-sky-700 shadow-xs"
                  : "text-slate-700",
              ].join(" ")}
            >
              {t(`NavItems.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSelector changeLocaleAction={handleLocaleChange} />

          <button
            type="button"
            aria-label={mobileOpen ? t("CloseMenu") : t("OpenMenu")}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
          >
            ☰
          </button>

          {user ? (
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm ring-2 ring-transparent transition hover:ring-sky-100"
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name || user.email || t("MemberFallback")}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-sky-700">
                    {avatarInitial}
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-sky-100/40 ring-1 ring-slate-100/60">
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-3">
                    <div className="flex size-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                      {/* {user.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt={user.name || user.email || t("MemberFallback")}
                          className="size-full object-cover"
                        />
                      ) : ( */}
                      <span className="text-base font-semibold text-sky-700">
                        {avatarInitial}
                      </span>
                      {/* )} */}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {user.name || t("MemberFallback")}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 px-2 py-2">
                    {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                      <Link
                        href="/dashboard"
                        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-sky-50 hover:text-sky-700"
                        onClick={() => setMenuOpen(false)}
                      >
                        {t("Dashboard")}
                      </Link>
                    )}
                    <Link
                      href="/orders"
                      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-sky-50 hover:text-sky-700"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("Orders")}
                    </Link>
                    <LogoutButton className="rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <LoginButton className="hidden rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 md:inline-flex" />
          )}
        </div>
      </div>

      {mobileOpen && (
        <div
          ref={mobileMenuRef}
          className="border-t border-slate-200 bg-white md:hidden"
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-medium transition",
                  isActive(item.href)
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-700 hover:bg-sky-50 hover:text-sky-700",
                ].join(" ")}
              >
                {t(`NavItems.${item.key}`)}
              </Link>
            ))}

            {!user ? (
              <LoginButton className="mt-2 inline-flex justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700" />
            ) : (
              <div className="mt-2 flex flex-col gap-1">
                {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                  <Link
                    href="/dashboard"
                    className="rounded-xl px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-sky-50 hover:text-sky-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("Dashboard")}
                  </Link>
                )}
                <Link
                  href="/orders"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-sky-50 hover:text-sky-700"
                >
                  {t("Orders")}
                </Link>
                <LogoutButton className="rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50" />
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

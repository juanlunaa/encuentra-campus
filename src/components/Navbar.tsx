"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionUserDTO } from "@/types/user";

interface NavbarProps {
  initialUser: SessionUserDTO | null;
}

const NAV_LINKS = [
  { href: "/", label: "Explorar" },
  { href: "/items/new", label: "Publicar" },
  { href: "/reports", label: "Reportes" },
] as const;

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<SessionUserDTO | null>(initialUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  function isActive(href: string): boolean {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      setUser(null);
      setMobileMenuOpen(false);
      router.refresh();
      if (pathname === "/items/new" || pathname.endsWith("/edit")) {
        router.push("/");
      }
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-bone/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-ink transition hover:opacity-90"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-cobalt font-serif text-base font-semibold text-bone">
              EC
            </span>
            <div className="leading-tight">
              <span className="block font-serif text-lg font-semibold tracking-tight">
                Encuentra Campus
              </span>
              <span className="hidden font-mono text-[10px] tracking-[0.12em] text-sepia uppercase sm:block">
                Sede B · Cedesarrollo
              </span>
            </div>
          </Link>

          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-1 md:flex"
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`border-b-2 px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-cobalt text-cobalt"
                      : "border-transparent text-sepia hover:border-rule-strong hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <div className="flex items-center gap-2.5 rounded-sm border border-rule bg-paper py-1 pr-3 pl-1.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cobalt text-xs font-semibold text-bone">
                  {getInitials(user.fullName)}
                </span>
                <span className="max-w-[180px] truncate text-sm font-medium text-ink">
                  {user.fullName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="cursor-pointer rounded-sm border border-rule-strong bg-bone px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:bg-shade disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded-sm px-3.5 py-2 text-sm font-medium transition ${
                  isActive("/login")
                    ? "bg-shade text-ink"
                    : "text-ink-soft hover:bg-shade"
                }`}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="rounded-sm bg-cobalt px-3.5 py-2 text-sm font-semibold text-bone transition hover:bg-cobalt-deep"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-rule p-2 text-sepia hover:bg-shade md:hidden"
        >
          {mobileMenuOpen ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-rule bg-bone px-4 py-4 md:hidden">
          <nav
            aria-label="Navegación móvil"
            className="flex flex-col gap-1"
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`border-l-2 px-3 py-2 text-sm font-medium ${
                    active
                      ? "border-cobalt bg-cobalt-wash text-cobalt"
                      : "border-transparent text-ink-soft hover:bg-shade"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-rule pt-4">
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cobalt text-xs font-semibold text-bone">
                    {getInitials(user.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {user.fullName}
                    </p>
                    <p className="truncate font-mono text-[11px] text-sepia">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full cursor-pointer rounded-sm border border-rule-strong bg-bone px-3.5 py-2 text-sm font-medium text-ink-soft hover:bg-shade disabled:opacity-60"
                >
                  {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  className="rounded-sm border border-rule-strong px-3.5 py-2 text-center text-sm font-medium text-ink-soft hover:bg-shade"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="rounded-sm bg-cobalt px-3.5 py-2 text-center text-sm font-semibold text-bone hover:bg-cobalt-deep"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

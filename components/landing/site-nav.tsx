"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { RoalWordmark } from "@/components/landing/roal-wordmark";
import { SITE_NAV_LINKS, SITE_NAV_SIGN_IN, SITE_NAV_TRY } from "@/lib/landing/site-nav";

function isActive(pathname: string, href: string) {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Floating white pill nav. Used by every public page and the auth routes. */
export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-nav" data-scrolled={scrolled ? "true" : "false"} data-open={open ? "true" : "false"}>
      <div className="site-nav__pill">
        <Link href="/" className="site-nav__brand" aria-label="ROAL home">
          <RoalWordmark />
        </Link>
        <nav className="site-nav__links" aria-label="Primary">
          {SITE_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="site-nav__link"
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-nav__actions">
          <Link
            href={SITE_NAV_SIGN_IN.href}
            className="site-nav__signin"
            aria-current={isActive(pathname, SITE_NAV_SIGN_IN.href) ? "page" : undefined}
          >
            {SITE_NAV_SIGN_IN.label}
          </Link>
          <Link href={SITE_NAV_TRY.href} className="site-nav__cta">
            {SITE_NAV_TRY.label}
          </Link>
          <button
            type="button"
            className="site-nav__toggle"
            aria-expanded={open}
            aria-controls="site-nav-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      <nav id="site-nav-menu" className="site-nav__menu" aria-label="Mobile" hidden={!open}>
        {SITE_NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
        <div className="site-nav__menu-actions">
          <Link href={SITE_NAV_SIGN_IN.href} className="btn-ghost btn-lg" onClick={() => setOpen(false)}>
            {SITE_NAV_SIGN_IN.label}
          </Link>
          <Link href={SITE_NAV_TRY.href} className="btn-primary btn-lg" onClick={() => setOpen(false)}>
            {SITE_NAV_TRY.label}
          </Link>
        </div>
      </nav>
    </header>
  );
}

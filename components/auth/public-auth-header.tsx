"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { PublicNavDrawerPanel } from "@/components/landing/public/public-nav-drawer-panel";
import { PublicNavMenuIcon } from "@/components/landing/public/public-nav-menu-icon";
import { usePublicNavMenu } from "@/lib/landing/use-public-nav-menu";
import { isPublicNavActive } from "@/lib/landing/nav-active";
import {
  PUBLIC_NAV_LINKS,
  PUBLIC_NAV_LOGIN,
  PUBLIC_NAV_SIGNUP,
} from "@/lib/landing/public-nav";
import { RoalMark } from "@/components/landing/roal-mark";

/** Login/signup header — same IA as marketing nav (lighter chrome). */
export function PublicAuthHeader() {
  const pathname = usePathname();
  const onLogin = pathname === PUBLIC_NAV_LOGIN.href;
  const onSignup = pathname === PUBLIC_NAV_SIGNUP.href;
  const {
    menuOpen,
    menuId,
    menuButtonRef,
    drawerRef,
    closeMenu,
    toggleMenu,
    onBackdropClose,
  } = usePublicNavMenu();

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  return (
    <header className={cn("public-auth-header", menuOpen && "public-nav--open")}>
      <div className="public-auth-header__inner">
        <Link href="/" className="public-auth-header__brand" aria-label="ROAL home">
          <span className="public-auth-header__mark">
            <RoalMark />
          </span>
          <span className="public-auth-header__name">ROAL</span>
        </Link>

        <nav className="public-auth-header__links" aria-label="Marketing">
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`public-auth-header__nav-link${isPublicNavActive(link.href, pathname) ? " font-semibold" : ""}`}
              aria-current={isPublicNavActive(link.href, pathname) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="public-auth-header__actions">
          {!onLogin ? (
            <Link href={PUBLIC_NAV_LOGIN.href} className="public-auth-header__login">
              {PUBLIC_NAV_LOGIN.label}
            </Link>
          ) : null}
          {!onSignup ? (
            <Link href={PUBLIC_NAV_SIGNUP.href} className="public-auth-header__cta">
              {PUBLIC_NAV_SIGNUP.label}
            </Link>
          ) : null}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="public-auth-header__menu-btn"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-controls={menuId}
          onClick={toggleMenu}
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <PublicNavMenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen ? (
        <PublicNavDrawerPanel
          menuId={menuId}
          drawerRef={drawerRef}
          links={PUBLIC_NAV_LINKS}
          pathname={pathname}
          closeMenu={closeMenu}
          onBackdropClose={onBackdropClose}
          showLogin={!onLogin}
          showSignup={!onSignup}
        />
      ) : null}
    </header>
  );
}

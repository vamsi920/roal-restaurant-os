"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { usePublicNavMenu } from "@/lib/landing/use-public-nav-menu";
import { isPublicNavActive } from "@/lib/landing/nav-active";
import {
  PUBLIC_NAV_LINKS,
  PUBLIC_NAV_LOGIN,
  PUBLIC_NAV_SIGNUP,
} from "@/lib/landing/public-nav";
import { RoalMark } from "@/components/landing/roal-mark";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      ) : (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

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
    <header className="public-auth-header">
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
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="public-nav-backdrop public-auth-nav-backdrop"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={onBackdropClose}
          />
          <div
            ref={drawerRef}
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="public-nav-drawer public-auth-nav-drawer"
          >
            <nav aria-label="Mobile">
              <ul className="public-nav-drawer__links">
                {PUBLIC_NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`public-nav-drawer__link${isPublicNavActive(link.href, pathname) ? " is-active" : ""}`}
                      aria-current={isPublicNavActive(link.href, pathname) ? "page" : undefined}
                      onClick={closeMenu}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="public-nav-drawer__actions">
              {!onLogin ? (
                <Link
                  href={PUBLIC_NAV_LOGIN.href}
                  className="public-nav-drawer__ghost"
                  onClick={closeMenu}
                >
                  {PUBLIC_NAV_LOGIN.label}
                </Link>
              ) : null}
              {!onSignup ? (
                <Link
                  href={PUBLIC_NAV_SIGNUP.href}
                  className="public-nav-drawer__cta"
                  onClick={closeMenu}
                >
                  {PUBLIC_NAV_SIGNUP.label}
                </Link>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { usePublicNavMenu } from "@/lib/landing/use-public-nav-menu";
import { isPublicNavActive } from "@/lib/landing/nav-active";
import type { PublicNavLink } from "@/lib/landing/public-nav";
import { PUBLIC_NAV_LOGIN, PUBLIC_NAV_SIGNUP } from "@/lib/landing/public-nav";
import { RoalMark } from "../roal-mark";

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

type Props = {
  links: readonly PublicNavLink[];
  shellClassName: "home-nav" | "marketing-nav";
};

export function PublicMarketingNav({ links, shellClassName }: Props) {
  const pathname = usePathname();
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

  const chromeClass =
    shellClassName === "home-nav" ? "home-nav__chrome" : "marketing-nav__chrome";

  return (
    <header className={shellClassName}>
      <div className={chromeClass}>
        <Link href="/" className="public-nav-logo" aria-label="ROAL home">
          <RoalMark className="h-8 w-8 shrink-0" />
          <span className="public-nav-logo__word">ROAL</span>
        </Link>

        <nav className="public-nav-links" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`public-nav-link${isPublicNavActive(link.href, pathname) ? " is-active" : ""}`}
              aria-current={isPublicNavActive(link.href, pathname) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="public-nav-actions">
          <Link href={PUBLIC_NAV_LOGIN.href} className="public-nav-login">
            {PUBLIC_NAV_LOGIN.label}
          </Link>
          <Link href={PUBLIC_NAV_SIGNUP.href} className="public-nav-cta">
            {PUBLIC_NAV_SIGNUP.label}
          </Link>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="public-nav-menu-btn"
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
            className="public-nav-backdrop"
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
            className="public-nav-drawer"
          >
            <nav aria-label="Mobile">
              <ul className="public-nav-drawer__links">
                {links.map((link) => (
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
              <Link
                href={PUBLIC_NAV_LOGIN.href}
                className="public-nav-drawer__ghost"
                onClick={closeMenu}
              >
                {PUBLIC_NAV_LOGIN.label}
              </Link>
              <Link
                href={PUBLIC_NAV_SIGNUP.href}
                className="public-nav-drawer__cta"
                onClick={closeMenu}
              >
                {PUBLIC_NAV_SIGNUP.label}
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}

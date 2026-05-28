"use client";

import type { RefObject } from "react";
import Link from "next/link";
import { isPublicNavActive } from "@/lib/landing/nav-active";
import type { PublicNavLink } from "@/lib/landing/public-nav";
import { PUBLIC_NAV_LOGIN, PUBLIC_NAV_SIGNUP } from "@/lib/landing/public-nav";

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  menuId: string;
  drawerRef: RefObject<HTMLDivElement | null>;
  links: readonly PublicNavLink[];
  pathname: string;
  closeMenu: () => void;
  onBackdropClose: () => void;
  showLogin?: boolean;
  showSignup?: boolean;
};

export function PublicNavDrawerPanel({
  menuId,
  drawerRef,
  links,
  pathname,
  closeMenu,
  onBackdropClose,
  showLogin = true,
  showSignup = true,
}: Props) {
  return (
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
        <div className="public-nav-drawer__head">
          <p className="public-nav-drawer__title" id={`${menuId}-title`}>
            Menu
          </p>
          <button
            type="button"
            className="public-nav-drawer__close"
            aria-label="Close menu"
            onClick={onBackdropClose}
          >
            <CloseIcon />
          </button>
        </div>

        <nav
          className="public-nav-drawer__nav"
          aria-labelledby={`${menuId}-title`}
        >
          <ul className="public-nav-drawer__links">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`public-nav-drawer__link${isPublicNavActive(link.href, pathname) ? " is-active" : ""}`}
                  aria-current={
                    isPublicNavActive(link.href, pathname) ? "page" : undefined
                  }
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="public-nav-drawer__actions" role="group" aria-label="Account">
          {showLogin ? (
            <Link
              href={PUBLIC_NAV_LOGIN.href}
              className="public-nav-drawer__ghost"
              onClick={closeMenu}
            >
              {PUBLIC_NAV_LOGIN.label}
            </Link>
          ) : null}
          {showSignup ? (
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
  );
}

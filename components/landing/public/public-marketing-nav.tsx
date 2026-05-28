"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { usePublicNavMenu } from "@/lib/landing/use-public-nav-menu";
import { isPublicNavActive } from "@/lib/landing/nav-active";
import type { PublicNavLink } from "@/lib/landing/public-nav";
import { PUBLIC_NAV_LOGIN, PUBLIC_NAV_SIGNUP } from "@/lib/landing/public-nav";
import { RoalMark } from "../roal-mark";
import { PublicNavDrawerPanel } from "./public-nav-drawer-panel";
import { PublicNavMenuIcon } from "./public-nav-menu-icon";

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
    <header
      className={cn(shellClassName, menuOpen && "public-nav--open")}
    >
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
          <PublicNavMenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen ? (
        <PublicNavDrawerPanel
          menuId={menuId}
          drawerRef={drawerRef}
          links={links}
          pathname={pathname}
          closeMenu={closeMenu}
          onBackdropClose={onBackdropClose}
        />
      ) : null}
    </header>
  );
}

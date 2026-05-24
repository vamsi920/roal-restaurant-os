/** Active state for public nav links (hash routes + nested paths). */

export function isPublicNavActive(href: string, pathname: string): boolean {
  if (href.startsWith("/#")) return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

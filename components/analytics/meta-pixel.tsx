"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID, isPixelPath, trackMeta } from "@/lib/meta-pixel";

/**
 * Loads the Meta Pixel on public pages and sends a PageView on every
 * client-side navigation. Renders nothing when no pixel ID is configured.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const allowed = Boolean(META_PIXEL_ID) && isPixelPath(pathname);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!allowed || !pathname) return;
    // The inline snippet fires the first PageView; track later route changes only.
    // Meta's own history tracking is off (disablePushState), so client-side moves
    // into /dashboard never send a PageView.
    if (lastPath.current !== null && lastPath.current !== pathname) trackMeta("PageView");
    lastPath.current = pathname;
  }, [allowed, pathname]);

  if (!allowed) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq.disablePushState=true;
fbq('init', ${JSON.stringify(META_PIXEL_ID)});
fbq('track', 'PageView');`}
    </Script>
  );
}

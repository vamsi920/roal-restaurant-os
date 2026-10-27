import Link from "next/link";
import { RoalMark } from "@/components/brand/roal-mark";

/** Auth-page logo lockup, links home. */
export function RoalWordmark() {
  return (
    <Link href="/" className="auth-wordmark" aria-label="ROAL home">
      <RoalMark size={30} />
      <span className="auth-wordmark__text font-display">ROAL</span>
    </Link>
  );
}

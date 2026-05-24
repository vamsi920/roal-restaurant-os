/** Tell KDS live menu (and other listeners) to resync after editor/scanner commits. */
export function notifyMenuChanged(restaurantId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("roal:menu-changed", {
      detail: { restaurantId },
    })
  );
}

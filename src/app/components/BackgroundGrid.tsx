/**
 * @description Fixed site-wide background grid that stays in place while page content scrolls.
 * @returns Non-interactive overlay element rendered behind all page content.
 * @example
 * ```tsx
 * <div className="min-h-screen bg-black">
 *   <BackgroundGrid />
 *   <main>...</main>
 * </div>
 * ```
 */
export function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="site-background-grid pointer-events-none fixed inset-0 z-0 opacity-[0.05]"
    />
  );
}

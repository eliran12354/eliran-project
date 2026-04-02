/**
 * קישור "דלג לתוכן" — מופיע ב־Tab הראשון, נחשף בפוקוס (מקלדת).
 * מקפיץ את המיקוד ל־<main id="main-content">.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="fixed right-4 top-0 z-[100] -translate-y-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-md transition-transform focus:top-4 focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      onClick={(e) => {
        e.preventDefault();
        const el = document.getElementById("main-content");
        if (el) {
          el.focus({ preventScroll: true });
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }}
    >
      דלג לתוכן העיקרי
    </a>
  );
}

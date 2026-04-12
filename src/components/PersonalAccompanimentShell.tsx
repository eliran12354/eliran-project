import { Link } from "react-router-dom";
import type { ReactNode } from "react";

const SUBTLE_NOISE_BG = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V4h4V2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V4h4V2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

type Props = {
  children: ReactNode;
  /** כש־false — רק "דף הבית > ליווי אישי"; כש־true — אחרי "ליווי אישי" מוצג tail */
  breadcrumbTail?: string;
};

export function PersonalAccompanimentShell({ children, breadcrumbTail }: Props) {
  return (
    <div
      className="relative w-full min-h-screen bg-[#F5F7FA] overflow-hidden"
      dir="rtl"
    >
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: SUBTLE_NOISE_BG }}
        aria-hidden
      />
      <div className="relative z-10 max-w-[720px] mx-auto px-6 py-8 pb-16">
        <nav className="flex flex-wrap items-center gap-2 mb-8" aria-label="מיקום בעמוד">
          <Link
            className="text-[#617589] text-sm font-medium hover:text-primary transition-colors"
            to="/"
          >
            דף הבית
          </Link>
          <span className="material-symbols-outlined text-sm text-[#617589]">chevron_left</span>
          {breadcrumbTail ? (
            <>
              <Link
                className="text-[#617589] text-sm font-medium hover:text-primary transition-colors"
                to="/personal-accompaniment"
              >
                ליווי אישי
              </Link>
              <span className="material-symbols-outlined text-sm text-[#617589]">chevron_left</span>
              <span className="text-[#111418] text-sm font-semibold">{breadcrumbTail}</span>
            </>
          ) : (
            <span className="text-[#111418] text-sm font-semibold">ליווי אישי</span>
          )}
        </nav>
        {children}
      </div>
    </div>
  );
}

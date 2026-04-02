import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AccessibilityPanel } from "./AccessibilityPanel";
import { SkipToContent } from "./SkipToContent";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const isFullBleedMain = pathname === "/business";
  const isGovMap = pathname === "/govmap";

  return (
    <div className="min-h-screen min-w-0 bg-background" dir="rtl">
      <SkipToContent />
      <main
        id="main-content"
        tabIndex={-1}
        className={`min-h-screen min-w-0 overflow-x-hidden pl-4 pr-4 sm:pl-6 sm:pr-6 ml-72 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          isHome
            ? "pt-0 pb-0"
            : isFullBleedMain
              ? "p-0"
              : isGovMap
                ? "pt-4 sm:pt-6 pb-0"
                : "py-4 sm:py-6"
        }`}
      >
        {children}
      </main>
      <AccessibilityPanel />
      <Sidebar />
    </div>
  );
}
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
        className={`min-h-screen min-w-0 overflow-x-hidden pl-4 pr-4 sm:pl-6 sm:pr-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          isHome ? "ml-0" : "ml-0 lg:ml-72"
        } ${
          isHome
            ? "pt-14 pb-0"
            : isFullBleedMain
              ? "px-0 pt-14 pb-0 lg:p-0"
              : isGovMap
                ? "pt-[calc(3.5rem+1rem)] pb-0 sm:pt-[calc(3.5rem+1.5rem)] lg:pt-6"
                : "pt-[calc(3.5rem+1rem)] pb-4 sm:pt-[calc(3.5rem+1.5rem)] sm:pb-6 lg:py-6"
        }`}
      >
        {children}
      </main>
      <AccessibilityPanel />
      <Sidebar />
    </div>
  );
}
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen bg-background flex w-full" dir="rtl">
      <main className={`flex-1 ${isHome ? "pt-0 px-6 pb-6" : "p-6"}`}>
        {children}
      </main>
      <Sidebar />
    </div>
  );
}
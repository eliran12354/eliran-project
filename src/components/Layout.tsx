import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex w-full" dir="rtl">
      <main className="flex-1 p-6">
        {children}
      </main>
      <Sidebar />
    </div>
  );
}
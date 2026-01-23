import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If admin required but user is not admin
  if (requireAdmin && (!user || !isAdmin)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">
            גישה נדחתה
          </h2>
          <p className="text-muted-foreground">
            רק משתמשים עם הרשאות אדמין יכולים לגשת לעמוד זה
          </p>
          {!user && (
            <p className="text-sm text-muted-foreground mt-4">
              אנא התחבר עם חשבון אדמין
            </p>
          )}
        </Card>
      </div>
    );
  }

  // Allow access even if not logged in (as per requirements)
  return <>{children}</>;
}

import { Card } from "@/components/ui/card";
import { LayoutDashboard, Users, Building2, TrendingUp, AlertCircle, FileText, Brain, FileCheck } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">דשבורד ניהול</h2>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            סקירה כללית וכלי ניהול למערכת
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">סה״כ משתמשים</p>
              <p className="text-2xl font-bold mt-1">0</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">סה״כ נכסים</p>
              <p className="text-2xl font-bold mt-1">0</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">שימושים ב-AI (חודש אחרון)</p>
              <p className="text-2xl font-bold mt-1">0</p>
              <p className="text-xs text-muted-foreground mt-1">סה״כ: 0</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">נסחי טאבו שנוצרו</p>
              <p className="text-2xl font-bold mt-1">0</p>
              <p className="text-xs text-muted-foreground mt-1">חודש אחרון: 0</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Usage Statistics */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">שימושים ב-AI</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                <p className="text-sm text-muted-foreground">היום</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">0</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                <p className="text-sm text-muted-foreground">השבוע</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">0</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">שימושים אחרונים</p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center py-4">
                  אין שימושים להצגה
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabu Reports Statistics */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">נסחי טאבו שנוצרו</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                <p className="text-sm text-muted-foreground">היום</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">0</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                <p className="text-sm text-muted-foreground">השבוע</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">0</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">דוחות אחרונים</p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center py-4">
                  אין דוחות להצגה
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Usage Details */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">פרטי שימוש ב-AI</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">בדיקות קרקע עם AI</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">דוחות נותחו ב-AI</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">ממוצע שימושים ביום</span>
                <span className="font-semibold">0</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabu Reports Details */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">פרטי נסחי טאבו</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">נסחים שהופקו בהצלחה</span>
                <span className="font-semibold text-green-600 dark:text-green-400">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">נסחים שנכשלו</span>
                <span className="font-semibold text-red-600 dark:text-red-400">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">ממוצע הפקות ביום</span>
                <span className="font-semibold">0</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      </div>
    </ProtectedRoute>
  );
}


import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "לפני רגע";
  if (diff < 3600_000) return `לפני ${Math.floor(diff / 60_000)} דקות`;
  if (diff < 86400_000) return `לפני ${Math.floor(diff / 3600_000)} שעות`;
  return d.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function NotificationBell() {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllRead,
    refresh,
  } = useNotifications(!!user);

  if (!user) return null;

  return (
    <Popover onOpenChange={(open) => open && refresh()}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 shrink-0"
          aria-label="התראות"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="start">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">התראות</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllRead}
            >
              סמן הכל כנקרא
            </Button>
          )}
        </div>
        <ScrollArea className="h-[min(320px,60vh)]">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              טוען...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              אין התראות חדשות
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer text-start",
                    !n.read_at && "bg-blue-500/5"
                  )}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.link) {
                      // Navigation handled by Link or programmatic
                    }
                  }}
                >
                  {n.link ? (
                    <Link
                      to={n.link}
                      className="block"
                      onClick={() => markAsRead(n.id)}
                    >
                      <p className="font-medium text-sm">{n.title}</p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDate(n.created_at)}
                      </p>
                    </Link>
                  ) : (
                    <>
                      <p className="font-medium text-sm">{n.title}</p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDate(n.created_at)}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

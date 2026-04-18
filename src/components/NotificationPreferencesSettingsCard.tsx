import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/api/notificationPreferencesApi";
import { useToast } from "@/hooks/use-toast";

const URBAN_RENEWAL_SWITCH_ID = "notify-urban-renewal-new";
const DANGEROUS_BUILDINGS_SWITCH_ID = "notify-dangerous-buildings-new";
const HOT_INVESTOR_BOARDS_SWITCH_ID = "notify-hot-investor-boards-new";

export function NotificationPreferencesSettingsCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [urbanRenewal, setUrbanRenewal] = useState(false);
  const [dangerousBuildings, setDangerousBuildings] = useState(false);
  const [hotInvestorBoards, setHotInvestorBoards] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const prefs = await fetchNotificationPreferences();
        if (!cancelled) {
          setUrbanRenewal(prefs.notify_urban_renewal_new);
          setDangerousBuildings(prefs.notify_dangerous_buildings_new);
          setHotInvestorBoards(prefs.notify_hot_investor_boards_new);
        }
      } catch {
        if (!cancelled) {
          toast({
            title: "שגיאה",
            description: "לא ניתן לטעון העדפות התראות",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (next: {
    notify_urban_renewal_new: boolean;
    notify_dangerous_buildings_new: boolean;
    notify_hot_investor_boards_new: boolean;
  }) => {
    const prevUrban = urbanRenewal;
    const prevDangerous = dangerousBuildings;
    const prevHot = hotInvestorBoards;
    setUrbanRenewal(next.notify_urban_renewal_new);
    setDangerousBuildings(next.notify_dangerous_buildings_new);
    setHotInvestorBoards(next.notify_hot_investor_boards_new);
    setSaving(true);
    try {
      const prefs = await updateNotificationPreferences(next);
      setUrbanRenewal(prefs.notify_urban_renewal_new);
      setDangerousBuildings(prefs.notify_dangerous_buildings_new);
      setHotInvestorBoards(prefs.notify_hot_investor_boards_new);
    } catch {
      setUrbanRenewal(prevUrban);
      setDangerousBuildings(prevDangerous);
      setHotInvestorBoards(prevHot);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור העדפה",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onUrbanRenewalChange = (checked: boolean) => {
    void persist({
      notify_urban_renewal_new: checked,
      notify_dangerous_buildings_new: dangerousBuildings,
      notify_hot_investor_boards_new: hotInvestorBoards,
    });
  };

  const onDangerousBuildingsChange = (checked: boolean) => {
    void persist({
      notify_urban_renewal_new: urbanRenewal,
      notify_dangerous_buildings_new: checked,
      notify_hot_investor_boards_new: hotInvestorBoards,
    });
  };

  const onHotInvestorBoardsChange = (checked: boolean) => {
    void persist({
      notify_urban_renewal_new: urbanRenewal,
      notify_dangerous_buildings_new: dangerousBuildings,
      notify_hot_investor_boards_new: checked,
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">התראות</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        בחר אילו עדכונים לקבל באפליקציה (בפעמון התראות).
      </p>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <Label
              htmlFor={URBAN_RENEWAL_SWITCH_ID}
              className="text-sm font-medium"
            >
              מתחמי התחדשות עירונית
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              התראה כשיתפרסם מידע חדש בנושא (כאשר המערכת תזהה עדכונים במקור
              הנתונים).
            </p>
          </div>
          <Switch
            id={URBAN_RENEWAL_SWITCH_ID}
            checked={urbanRenewal}
            onCheckedChange={onUrbanRenewalChange}
            disabled={loading || saving}
            aria-busy={loading || saving}
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <Label
              htmlFor={DANGEROUS_BUILDINGS_SWITCH_ID}
              className="text-sm font-medium"
            >
              איתור מבנים מסוכנים
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              התראה כשנוספו מבנים מסוכנים למאגר (עמוד איתור מבנים מסוכנים).
            </p>
          </div>
          <Switch
            id={DANGEROUS_BUILDINGS_SWITCH_ID}
            checked={dangerousBuildings}
            onCheckedChange={onDangerousBuildingsChange}
            disabled={loading || saving}
            aria-busy={loading || saving}
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <Label
              htmlFor={HOT_INVESTOR_BOARDS_SWITCH_ID}
              className="text-sm font-medium"
            >
              לוחות נדל״ן חמים למשקיעים
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              התראה כשפורסמה מודעה חדשה בלוחות (פינוי־בינוי, עד מיליון ש״ח, קרקעות בהפשרה).
            </p>
          </div>
          <Switch
            id={HOT_INVESTOR_BOARDS_SWITCH_ID}
            checked={hotInvestorBoards}
            onCheckedChange={onHotInvestorBoardsChange}
            disabled={loading || saving}
            aria-busy={loading || saving}
          />
        </div>
      </div>
    </Card>
  );
}

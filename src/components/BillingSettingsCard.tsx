import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CreditCard, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fetchBillingStatus,
  createCheckoutSession,
  createBillingPortalSession,
  type BillingStatus,
} from "@/lib/api/billingApi";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = {
  active: "פעיל",
  trialing: "בתקופת ניסיון",
  past_due: "תשלום נכשל – נדרש עדכון אמצעי תשלום",
  canceled: "בוטל",
};

export function BillingSettingsCard() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  useEffect(() => {
    const result = searchParams.get("billing");
    if (!result) return;
    if (result === "success") {
      toast({
        title: "התשלום התקבל",
        description: "המנוי יופעל בדקות הקרובות. אישור נשלח למייל.",
      });
    } else if (result === "cancelled") {
      toast({ title: "התשלום בוטל", description: "לא בוצע חיוב." });
    }
    searchParams.delete("billing");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchBillingStatus();
        if (!cancelled) setBilling(status);
      } catch {
        if (!cancelled) {
          toast({
            title: "שגיאה",
            description: "לא ניתן לטעון את מצב המנוי",
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
  }, [toast]);

  const redirectTo = async (createSession: () => Promise<string>) => {
    setRedirecting(true);
    try {
      window.location.href = await createSession();
    } catch {
      toast({
        title: "שגיאה",
        description: "לא ניתן לפתוח את עמוד התשלום, נסה שוב",
        variant: "destructive",
      });
      setRedirecting(false);
    }
  };

  const hasSubscription = billing?.status != null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">מנוי וחיוב</h3>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">טוען...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">סטטוס מנוי</p>
            <p className="font-medium">
              {hasSubscription ? STATUS_LABELS[billing!.status!] ?? billing!.status : "ללא מנוי"}
            </p>
            {billing?.isActive && billing.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                חיוב הבא: {new Date(billing.currentPeriodEnd).toLocaleDateString("he-IL")}
              </p>
            )}
          </div>

          {billing?.isActive || billing?.status === "past_due" ? (
            <Button
              variant="outline"
              className="gap-2"
              disabled={redirecting}
              onClick={() => redirectTo(createBillingPortalSession)}
            >
              <ExternalLink className="w-4 h-4" />
              ניהול מנוי ואמצעי תשלום
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                מנוי חודשי – ₪50 לחודש, גישה מלאה למערכת. ניתן לבטל בכל עת.
              </p>
              <Button
                className="gap-2"
                disabled={redirecting}
                onClick={() => redirectTo(createCheckoutSession)}
              >
                <CreditCard className="w-4 h-4" />
                {redirecting ? "מעביר לתשלום..." : "הצטרף למנוי"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

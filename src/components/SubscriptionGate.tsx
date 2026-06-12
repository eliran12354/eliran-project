import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/LoginDialog";
import { useAuth } from "@/hooks/useAuth";
import { fetchBillingStatus } from "@/lib/api/billingApi";
import { cn } from "@/lib/utils";

type GateState = "checking" | "allowed" | "blocked";

const INCLUDED_FEATURES = [
  "ניתוח מכרזים חכם ללא הגבלה",
  "גישה מלאה לכל הכלים המקצועיים",
  "התראות ועדכונים לפני כולם",
];

/** Same subtle plus-pattern used on the business page — keeps the brand texture. */
const SUBTLE_NOISE_BG = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V4h4V2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V4h4V2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

/**
 * Restricts content to admins and users with an active subscription.
 * Everyone else sees the content blurred behind a branded paywall panel.
 */
export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [gate, setGate] = useState<GateState>("checking");
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) {
      setGate("allowed");
      return;
    }
    if (!user) {
      setGate("blocked");
      return;
    }
    let cancelled = false;
    setGate("checking");
    (async () => {
      try {
        const billing = await fetchBillingStatus();
        if (!cancelled) setGate(billing.isActive ? "allowed" : "blocked");
      } catch {
        if (!cancelled) setGate("blocked");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, authLoading]);

  if (gate === "allowed") return <>{children}</>;

  if (gate === "checking" || authLoading) {
    return (
      <div className="flex items-center justify-center py-24" role="status" aria-label="בודק הרשאות">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className="relative min-h-[640px]">
      {/* Censored preview, fading out toward the paywall so the cut feels deliberate */}
      <div
        className="blur-[2.5px] select-none pointer-events-none"
        style={{
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0.35) 60%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0.35) 60%, transparent 95%)",
        }}
        aria-hidden
      >
        {children}
      </div>

      <div className="absolute inset-0 flex items-start justify-center pt-10 sm:pt-16 px-4">
        <section
          aria-labelledby="subscription-gate-heading"
          className={cn(
            "max-w-lg w-full rounded-[20px] overflow-hidden animate-scale-in",
            "bg-gradient-to-br from-[#0a1a3a] via-[#0d2447] to-[#0a1a3a]",
            "shadow-[0_24px_60px_-12px_rgba(10,26,58,0.45)]",
            "ring-1 ring-white/10",
          )}
        >
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: SUBTLE_NOISE_BG }}
            aria-hidden
          />

          <div className="relative p-8 sm:p-10">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="size-4 text-primary-glow" aria-hidden />
              <p className="text-[11px] font-bold tracking-[0.2em] text-slate-300 uppercase">
                מנוי מקצועי
              </p>
            </div>

            <h2
              id="subscription-gate-heading"
              className="text-2xl sm:text-[28px] leading-snug font-black text-white font-display mb-3"
            >
              הכלי הזה שמור למנויים
            </h2>
            <p className="text-sm text-slate-300/90 leading-relaxed mb-7">
              הצטרפו למשקיעים ואנשי המקצוע שכבר חוסכים שעות של קריאת מסמכים — וקבלו
              תמונה מלאה על כל מכרז בתוך דקה.
            </p>

            <ul className="space-y-3 mb-8">
              {INCLUDED_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="rounded-full bg-primary/20 p-1 shrink-0">
                    <Check className="size-3.5 text-primary-glow" strokeWidth={3} aria-hidden />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-6 mb-6">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-white font-display">₪50</span>
                  <span className="text-sm text-slate-400">/ לחודש</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">ללא התחייבות, ניתן לבטל בכל עת</p>
              </div>
            </div>

            <Button
              size="lg"
              onClick={() => navigate("/business")}
              className={cn(
                "w-full h-14 text-base font-bold rounded-xl",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "shadow-[0_8px_24px_rgba(17,82,212,0.35)]",
                "transition-transform hover:-translate-y-0.5",
              )}
            >
              הצטרפו למנוי
            </Button>

            {!user && (
              <button
                type="button"
                onClick={() => setLoginDialogOpen(true)}
                className="block mx-auto mt-4 text-sm text-slate-300 hover:text-white underline underline-offset-4 decoration-slate-500 hover:decoration-white transition-colors"
              >
                כבר יש לכם מנוי? התחברו
              </button>
            )}
          </div>
        </section>
      </div>

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </div>
  );
}

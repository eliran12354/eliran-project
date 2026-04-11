import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { forgotPassword } from "@/lib/api/authApi";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { TermsDialog } from "@/components/TermsDialog";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function mapAuthError(msg: string | undefined): string | undefined {
  if (!msg) return undefined;
  const m = msg.toLowerCase();
  if (m.includes("email") && m.includes("password") && m.includes("required"))
    return "נדרשים אימייל וסיסמה";
  if (m.includes("password") && m.includes("at least") && m.includes("8"))
    return "הסיסמה חייבת להכיל לפחות 8 תווים";
  if (m.includes("invalid") && (m.includes("email") || m.includes("password")))
    return "אימייל או סיסמה שגויים";
  return msg;
}

type AuthMode = "login" | "signup" | "forgot";

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { login, signup } = useAuth();

  const isLogin = authMode === "login";
  const isForgot = authMode === "forgot";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);

    try {
      if (isForgot) {
        const result = await forgotPassword(email);
        if (result.success) {
          setForgotSent(true);
          setFormError(null);
        } else {
          setFormError(result.error || "שגיאה בשליחת הבקשה");
        }
      } else if (isLogin) {
        const result = await login({ email, password });
        if (result.data && !result.error) {
          onOpenChange(false);
          resetForm();
        } else if (result.error) {
          setFormError(mapAuthError(result.error.message) || "שגיאה בהתחברות");
        }
      } else {
        const signupResult = await signup({ email, password });
        if (signupResult.data && !signupResult.error) {
          onOpenChange(false);
          resetForm();
        } else if (
          signupResult.error?.message?.includes("כבר רשומה") ||
          signupResult.error?.message?.includes("already") ||
          signupResult.error?.message?.includes("registered")
        ) {
          setAuthMode("login");
          setFormError(null);
        } else if (signupResult.error) {
          setFormError(mapAuthError(signupResult.error.message) || "שגיאה בהרשמה");
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      setFormError("אירעה שגיאה. נסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFormError(null);
    setAcceptedTerms(false);
    setAuthMode("login");
    setForgotSent(false);
  };

  const toggleMode = () => {
    setAuthMode((m) => (m === "login" ? "signup" : "login"));
    setFormError(null);
    setForgotSent(false);
    setPassword("");
    setAcceptedTerms(false);
  };

  const clearErrorOnInput = () => {
    if (formError) setFormError(null);
  };

  useEffect(() => {
    if (open) {
      setFormError(null);
      setAuthMode("login");
      setForgotSent(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent
        className="w-[min(100vw-1.5rem,32rem)] sm:max-w-none sm:w-[min(100vw-2rem,36rem)] p-0 gap-0 overflow-hidden border-0 bg-transparent text-right shadow-none [&>button]:left-3 [&>button]:right-auto [&>button]:top-3 sm:[&>button]:left-4 sm:[&>button]:top-4 [&>button]:z-20 [&>button]:h-9 [&>button]:w-9 [&>button]:rounded-full [&>button]:border [&>button]:border-border/50 [&>button]:bg-background/55 [&>button]:shadow-md [&>button]:backdrop-blur-md"
        dir="rtl"
      >
        <div className="relative overflow-hidden rounded-[1.35rem] border border-primary/25 bg-background/55 shadow-[0_28px_80px_-16px_rgba(17,82,212,0.22)] ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150 dark:bg-background/50 dark:ring-white/10">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-primary/22 via-primary/10 to-transparent sm:h-48"
            aria-hidden
          />
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.14] blur-3xl sm:-right-12 sm:h-64 sm:w-64" aria-hidden />
          <div className="relative px-7 pb-5 pt-10 sm:px-10 sm:pb-6 sm:pt-12">
            <div className="flex items-start gap-5 sm:gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-2 text-right">
                <DialogHeader className="space-y-3 text-right sm:space-y-3.5">
                  <DialogTitle className="text-right text-[1.65rem] font-bold leading-snug tracking-tight text-foreground sm:text-3xl sm:leading-tight">
                    {isForgot
                      ? "איפוס סיסמה"
                      : isLogin
                        ? "התחברות למערכת"
                        : "יצירת חשבון"}
                  </DialogTitle>
                  <DialogDescription className="text-right text-base leading-relaxed text-muted-foreground sm:text-[1.05rem] sm:leading-7">
                    {isForgot
                      ? "הזינו את כתובת האימייל — נשלח קישור לאיפוס (תקף שעה)."
                      : isLogin
                        ? "גישה מאובטחת לכלים, דוחות ונתונים שמעודכנים בזמן אמת."
                        : "הצטרפו וקבלו גישה מלאה לכל יכולות הפלטפורמה."}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-background/75 to-muted/30 shadow-lg ring-2 ring-primary/25 backdrop-blur-md sm:h-[4.25rem] sm:w-[4.25rem]">
                {isForgot ? (
                  <LogIn className="h-9 w-9 text-primary sm:h-10 sm:w-10" strokeWidth={2} />
                ) : isLogin ? (
                  <LogIn className="h-9 w-9 text-primary sm:h-10 sm:w-10" strokeWidth={2} />
                ) : (
                  <UserPlus className="h-9 w-9 text-primary sm:h-10 sm:w-10" strokeWidth={2} />
                )}
              </div>
            </div>
          </div>
          <div
            className="mx-7 h-px bg-gradient-to-l from-transparent via-primary/25 to-transparent sm:mx-10"
            aria-hidden
          />
          <form
            onSubmit={handleSubmit}
            className="space-y-5 px-7 pb-9 pt-8 sm:space-y-5 sm:px-10 sm:pb-10"
          >
          {forgotSent && isForgot ? (
            <div className="space-y-5 text-center">
              <p className="text-base leading-relaxed text-muted-foreground">
                אם האימייל רשום במערכת, נשלח אליך קישור לאיפוס. בדוק גם בתיקיית הספאם.
              </p>
              <Button
                type="button"
                className="h-14 w-full rounded-xl text-base font-semibold"
                onClick={() => {
                  setForgotSent(false);
                  setAuthMode("login");
                  setEmail("");
                }}
              >
                חזרה להתחברות
              </Button>
            </div>
          ) : (
            <>
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-sm font-medium">
              אימייל
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearErrorOnInput();
              }}
              placeholder="אימייל"
              required
              disabled={isLoading}
              autoComplete="email"
              className="h-12 rounded-xl border-border/60 bg-background/40 px-4 text-base backdrop-blur-sm transition-colors focus-visible:bg-background/75 focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </div>
          {!isForgot && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password" className="text-sm font-medium">
                סיסמה {!isLogin && <span className="text-muted-foreground font-normal">(לפחות 8 תווים)</span>}
              </Label>
              {isLogin && (
                <button
                  type="button"
                  className="text-sm text-primary underline-offset-4 hover:underline shrink-0"
                  onClick={() => {
                    setAuthMode("forgot");
                    setFormError(null);
                    setPassword("");
                  }}
                  disabled={isLoading}
                >
                  שכחתי סיסמה
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearErrorOnInput();
              }}
              placeholder={isLogin ? "סיסמה" : "לפחות 8 תווים"}
              required
              minLength={isLogin ? undefined : 8}
              disabled={isLoading}
              autoComplete="current-password"
              className="h-12 rounded-xl border-border/60 bg-background/40 px-4 text-base backdrop-blur-sm transition-colors focus-visible:bg-background/75 focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </div>
          )}
          {!isLogin && !isForgot && (
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <label
                htmlFor="terms"
                className="text-sm leading-tight cursor-pointer select-none"
              >
                קראתי ואני מסכים ל
                <button
                  type="button"
                  className="underline text-primary hover:no-underline font-medium inline"
                  onClick={(e) => {
                    e.preventDefault();
                    setTermsDialogOpen(true);
                  }}
                >
                  תקנון השימוש
                </button>
              </label>
            </div>
          )}
          {formError && (
            <p
              className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive font-medium"
              role="alert"
            >
              {formError}
            </p>
          )}
          <div className="flex flex-col gap-3 pt-1">
            <Button
              type="submit"
              disabled={isLoading || (!isLogin && !isForgot && !acceptedTerms)}
              className="h-14 w-full rounded-xl text-base font-semibold shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30 sm:text-[1.05rem]"
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  {isForgot ? "שולח..." : isLogin ? "מתחבר..." : "נרשם..."}
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                </span>
              ) : isForgot ? (
                "שלח קישור לאיפוס"
              ) : isLogin ? (
                "התחבר"
              ) : (
                "הירשם"
              )}
            </Button>
            {isForgot ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAuthMode("login");
                  setFormError(null);
                  setForgotSent(false);
                }}
                disabled={isLoading}
                className="text-center w-full text-muted-foreground hover:text-foreground"
              >
                חזרה להתחברות
              </Button>
            ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={toggleMode}
              disabled={isLoading}
              className="text-center w-full text-muted-foreground hover:text-foreground"
            >
              {isLogin ? "אין לך חשבון? הירשם" : "יש לך חשבון? התחבר"}
            </Button>
            )}
          </div>
            </>
          )}
        </form>
        </div>
      </DialogContent>
      <TermsDialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen} />
    </Dialog>
  );
}

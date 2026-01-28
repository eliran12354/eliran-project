import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Loader2 } from "lucide-react";

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

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
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
          setIsLogin(true);
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
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  const clearErrorOnInput = () => {
    if (formError) setFormError(null);
  };

  useEffect(() => {
    if (open) setFormError(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="sm:max-w-[425px] text-right [&>button]:left-4 [&>button]:right-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">{isLogin ? "התחברות" : "הרשמה"}</DialogTitle>
          <DialogDescription className="text-right">
            {isLogin ? "הזן את פרטי ההתחברות שלך" : "צור חשבון חדש"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">אימייל</Label>
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              סיסמה {!isLogin && <span className="text-muted-foreground font-normal">(לפחות 8 תווים)</span>}
            </Label>
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
            />
          </div>
          {formError && (
            <p className="text-sm text-destructive font-medium" role="alert">
              {formError}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {isLogin ? "מתחבר..." : "נרשם..."}
                </>
              ) : (
                isLogin ? "התחבר" : "הירשם"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={toggleMode}
              disabled={isLoading}
              className="text-right"
            >
              {isLogin ? "אין לך חשבון? הירשם" : "יש לך חשבון? התחבר"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

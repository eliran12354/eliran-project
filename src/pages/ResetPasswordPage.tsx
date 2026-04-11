import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { resetPasswordWithToken } from "@/lib/api/authApi";
import { useToast } from "@/hooks/use-toast";

const MIN_LEN = 8;

function mapResetError(msg: string | undefined): string {
  if (!msg) return "לא ניתן לאפס את הסיסמה";
  const m = msg.toLowerCase();
  if (m.includes("at least") && m.includes("8")) return "הסיסמה חייבת להכיל לפחות 8 תווים";
  if (m.includes("invalid") || m.includes("expired")) return "הקישור פג תוקף או לא תקין. בקש איפוס מחדש.";
  return msg;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LEN) {
      setError(`הסיסמה חייבת להכיל לפחות ${MIN_LEN} תווים`);
      return;
    }
    if (password !== confirm) {
      setError("הסיסמאות אינן תואמות");
      return;
    }
    if (!token) {
      setError("חסר טוקן בקישור. השתמש בקישור מהמייל.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPasswordWithToken(token, password);
      if (result.success) {
        toast({
          title: "הסיסמה עודכנה",
          description: "אפשר להתחבר עם הסיסמה החדשה.",
        });
        setPassword("");
        setConfirm("");
      } else {
        setError(mapResetError(result.error));
      }
    } catch {
      setError("אירעה שגיאה. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md animate-fade-in pt-4 sm:pt-6">
        <Card className="p-6 sm:p-8 text-center space-y-4">
          <p className="text-muted-foreground">קישור האיפוס חסר או לא תקין.</p>
          <Button asChild variant="outline">
            <Link to="/">חזרה לדף הבית</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md animate-fade-in pt-4 sm:pt-6">
      <Card className="p-6 sm:p-8 space-y-6 border-primary/15 shadow-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="h-7 w-7" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">איפוס סיסמה</h1>
            <p className="text-sm text-muted-foreground">בחרו סיסמה חדשה לחשבון.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">סיסמה חדשה</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              minLength={MIN_LEN}
              required
              disabled={loading}
              autoComplete="new-password"
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">אימות סיסמה</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (error) setError(null);
              }}
              minLength={MIN_LEN}
              required
              disabled={loading}
              autoComplete="new-password"
              className="h-12 rounded-xl"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold" disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                שומר...
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              </span>
            ) : (
              "עדכן סיסמה"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/" className="text-primary underline-offset-4 hover:underline">
            חזרה לדף הבית
          </Link>
        </p>
      </Card>
    </div>
  );
}

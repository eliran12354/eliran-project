import { useState, FormEvent } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login({ emailOrUsername, password });
        if (result.data && !result.error) {
          onOpenChange(false);
          resetForm();
        }
      } else {
        const signupResult = await signup({ 
          email: emailOrUsername, 
          password, 
          username: username || undefined 
        });
        
        if (signupResult.data && !signupResult.error) {
          // Auto login after successful signup
          const loginResult = await login({ emailOrUsername, password });
          if (loginResult.data && !loginResult.error) {
            onOpenChange(false);
            resetForm();
          }
        } else if (
          signupResult.error?.message?.includes('כבר רשומה') ||
          signupResult.error?.message?.includes('already exists') ||
          signupResult.error?.message?.includes('user_already_exists')
        ) {
          // If user already exists, switch to login mode
          setIsLogin(true);
          toast({
            title: 'המשתמש כבר קיים',
            description: 'עברנו למצב התחברות. אנא התחבר עם האימייל והסיסמה שלך',
          });
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmailOrUsername("");
    setPassword("");
    setUsername("");
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir="rtl">
      <DialogContent className="sm:max-w-[425px] text-right [&>button]:left-4 [&>button]:right-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">{isLogin ? "התחברות" : "הרשמה"}</DialogTitle>
          <DialogDescription className="text-right">
            {isLogin
              ? "הזן את פרטי ההתחברות שלך"
              : "צור חשבון חדש"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="username">שם משתמש</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="שם משתמש"
                required={!isLogin}
                disabled={isLoading}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="emailOrUsername">
              {isLogin ? "אימייל או שם משתמש" : "אימייל"}
            </Label>
            <Input
              id="emailOrUsername"
              type={isLogin ? "text" : "email"}
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder={isLogin ? "אימייל או שם משתמש" : "אימייל"}
              required
              disabled={isLoading}
              autoComplete={isLogin ? "username" : "email"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="סיסמה"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
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
              {isLogin
                ? "אין לך חשבון? הירשם"
                : "יש לך חשבון? התחבר"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

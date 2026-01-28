import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getToken,
  setToken,
  clearToken,
  signup as apiSignup,
  login as apiLogin,
  getMe,
  type AuthUser,
} from '@/lib/api/authApi';

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  is_admin: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials {
  email: string;
  password: string;
}

function userToProfile(user: AuthUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    username: null,
    is_admin: user.role === 'admin',
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
  });
  const { toast } = useToast();

  const setUser = useCallback((user: AuthUser | null) => {
    setState({
      user,
      profile: user ? userToProfile(user) : null,
      loading: false,
      isAdmin: user?.role === 'admin' || false,
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const token = getToken();
      if (!token) {
        if (mounted) setState((s) => ({ ...s, loading: false }));
        return;
      }
      const result = await getMe(token);
      if (!mounted) return;
      if (result.success) {
        setUser(result.user);
      } else {
        clearToken();
        setUser(null);
      }
    };

    init();
  }, [setUser]);

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      const res = await apiLogin(email, password);
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        toast({ title: 'התחברת בהצלחה', description: `ברוך הבא ${res.user.email}` });
        return { data: { user: res.user }, error: null };
      }
      const errMsg =
        res.error?.toLowerCase().includes('invalid') || res.error?.toLowerCase().includes('password')
          ? 'אימייל או סיסמה שגויים'
          : res.error || 'שגיאה בהתחברות';
      toast({ title: 'שגיאה בהתחברות', description: errMsg, variant: 'destructive' });
      return { data: null, error: new Error(errMsg) };
    },
    [toast, setUser]
  );

  const signup = useCallback(
    async ({ email, password }: SignupCredentials) => {
      const res = await apiSignup(email, password);
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        toast({ title: 'נרשמת בהצלחה', description: 'החשבון נוצר בהצלחה' });
        return { data: { user: res.user }, error: null };
      }
      let msg = 'לא ניתן ליצור חשבון';
      if (res.error?.toLowerCase().includes('already') || res.error?.toLowerCase().includes('registered')) {
        msg = 'כתובת האימייל כבר רשומה במערכת. אנא התחבר במקום';
      } else if (res.error) {
        msg = res.error;
      }
      toast({ title: 'שגיאה בהרשמה', description: msg, variant: 'destructive' });
      return { data: null, error: new Error(msg) };
    },
    [toast, setUser]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    toast({ title: 'התנתקת בהצלחה' });
  }, [toast, setUser]);

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    isAdmin: state.isAdmin,
    login,
    signup,
    logout,
  };
}

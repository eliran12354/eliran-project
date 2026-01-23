import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  is_admin: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

interface SignupCredentials {
  email: string;
  password: string;
  username?: string;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
  });
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState((prev) => ({
      ...prev,
      ...updates,
      isAdmin: updates.profile?.is_admin ?? updates.isAdmin ?? prev.isAdmin,
    }));
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            updateState({ loading: false });
          }
          return;
        }

        if (mounted) {
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            updateState({
              user: session.user,
              profile,
              loading: false,
              isAdmin: profile?.is_admin ?? false,
            });
          } else {
            updateState({ loading: false });
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          updateState({ loading: false });
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        updateState({
          user: session.user,
          profile,
          loading: false,
          isAdmin: profile?.is_admin ?? false,
        });
      } else {
        updateState({
          user: null,
          profile: null,
          loading: false,
          isAdmin: false,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, updateState]);

  const login = useCallback(async ({ emailOrUsername, password }: LoginCredentials) => {
    try {
      let email = emailOrUsername;

      // If it doesn't look like an email, try to find by username
      if (!emailOrUsername.includes('@')) {
        const { data: userData, error: lookupError } = await supabase
          .from('users')
          .select('email')
          .eq('username', emailOrUsername)
          .single();

        if (lookupError || !userData) {
          throw new Error('שם משתמש או סיסמה שגויים');
        }

        email = userData.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle email not confirmed error
        if (error.message?.includes('email_not_confirmed') || error.message?.includes('Email not confirmed')) {
          throw new Error('יש לאמת את האימייל לפני ההתחברות. בדוק את תיבת הדואר הנכנס');
        }
        throw error;
      }

      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        const displayName = profile?.username || data.user.email || 'משתמש';
        
        toast({
          title: 'התחברת בהצלחה',
          description: `ברוך הבא ${displayName}`,
        });
      }

      return { data, error: null };
    } catch (error: any) {
      let errorMessage = 'שם משתמש או סיסמה שגויים';
      
      if (error.message?.includes('email_not_confirmed') || error.message?.includes('Email not confirmed')) {
        errorMessage = 'יש לאמת את האימייל לפני ההתחברות. בדוק את תיבת הדואר הנכנס';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'שגיאה בהתחברות',
        description: errorMessage,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  }, [fetchUserProfile, toast]);

  const signup = useCallback(async ({ email, password, username }: SignupCredentials) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
          },
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        // Handle user already exists
        if (
          error.message?.includes('already registered') || 
          error.message?.includes('already exists') ||
          error.message?.includes('user_already_exists') ||
          error.status === 422
        ) {
          // User already exists - show helpful message
          throw new Error('כתובת האימייל כבר רשומה במערכת. אנא התחבר במקום');
        }
        
        // Handle specific error cases
        if (error.status === 429 || error.message?.includes('429')) {
          throw new Error('יותר מדי בקשות. אנא נסה שוב בעוד כמה דקות');
        }
        if (error.message?.includes('password')) {
          throw new Error('הסיסמה חייבת להכיל לפחות 6 תווים');
        }
        throw error;
      }

      if (data.user) {
        toast({
          title: 'נרשמת בהצלחה',
          description: 'החשבון נוצר בהצלחה',
        });
      }

      return { data, error: null };
    } catch (error: any) {
      let errorMessage = 'לא ניתן ליצור חשבון';
      
      if (error.status === 429 || error.message?.includes('429')) {
        errorMessage = 'יותר מדי בקשות. אנא נסה שוב בעוד כמה דקות';
      } else if (error.message?.includes('כתובת האימייל כבר רשומה')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'שגיאה בהרשמה',
        description: errorMessage,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  }, [toast, login]);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      updateState({
        user: null,
        profile: null,
        isAdmin: false,
      });

      toast({
        title: 'התנתקת בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה בהתנתקות',
        description: error.message || 'אירעה שגיאה',
        variant: 'destructive',
      });
    }
  }, [toast, updateState]);

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

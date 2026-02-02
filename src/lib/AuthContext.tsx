import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as AuthUser, Session } from '@supabase/supabase-js';
import { auth, supabase } from './supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  authUser: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        setAuthUser(data.session.user);
        // Fetch user profile from database
        fetchUserProfile(data.session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const unsubscribe = auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        setAuthUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setAuthUser(null);
        setUser(null);
      }
    });

    return () => {
      unsubscribe?.subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // ユーザープロファイルが存在しない場合は作成
        const authUser = await auth.getSession();
        if (authUser.data?.session?.user) {
          const user = authUser.data.session.user;
          const { error: insertError } = await supabase.from('users').insert({
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            level: 1,
            xp: 0,
            streak: 0,
            role: 'user',
          });

          if (!insertError) {
            // 新規作成後に再度取得
            const { data: newData } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();
            if (newData) {
              setUser(newData);
            }
          }
        }
      } else if (!error && data) {
        setUser(data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleSignUp = async (email: string, password: string, name: string) => {
    const result = await auth.signUp(email, password, name);
    if (result.error) {
      return result;
    }

    // Create user profile
    if (result.data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: result.data.user.id,
        email,
        name,
        level: 1,
        xp: 0,
        streak: 0,
        role: 'user',
      });

      if (profileError) {
        return { data: null, error: profileError };
      }
    }

    return result;
  };

  const handleSignIn = async (email: string, password: string) => {
    return auth.signIn(email, password);
  };

  const handleSignInWithGoogle = async () => {
    return auth.signInWithGoogle();
  };

  const handleSignOut = async () => {
    return auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        session,
        loading,
        isAdmin: user?.role === 'admin',
        signUp: handleSignUp,
        signIn: handleSignIn,
        signInWithGoogle: handleSignInWithGoogle,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

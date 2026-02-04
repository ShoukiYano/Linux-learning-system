import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as AuthUser, Session } from '@supabase/supabase-js';
import { auth, supabase, db } from './supabase';
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
        .maybeSingle();

      if (!data && !error) {
        // ユーザープロファイルが存在しない場合は作成を試みる（またはトリガーによる作成を少し待つ）
        console.log('Profile not found, attempting to create or wait...');
        const authUserResponse = await auth.getSession();
        const authUser = authUserResponse.data?.session?.user;
        
        if (authUser) {
          // すでにある場合は何もしない upsert 的な挙動
          const { error: insertError } = await supabase.from('users').upsert({
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
            level: 1,
            xp: 0,
            streak: 0,
            role: 'user',
          }, { onConflict: 'id' });

          if (!insertError) {
            const { data: newData } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            if (newData) setUser(newData);
          }
        }
      } else if (data) {
        setUser(data);
        // 背景でストリークを更新し、最新状態を取得して再セット
        db.updateStreak(userId).then((result: any) => {
          if (result.data) setUser(result.data);
        });
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

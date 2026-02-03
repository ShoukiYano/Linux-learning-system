import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/supabase';
import { Terminal } from 'lucide-react';

export const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthCallback mounted. Current URL:', window.location.href);
    console.log('Search params:', window.location.search);
    // console.log('Hash params:', window.location.hash);

    // onAuthStateChange を使って、セッションが確立された瞬間をキャッチする
    const { subscription } = auth.onAuthStateChange((event, session) => {
      console.log('AuthCallback Event:', event, session ? 'Session found' : 'No session');
      
      if (session) {
        // セッションが確立されたらダッシュボードへ
        navigate('/dashboard', { replace: true });
      }
    });

    // 初期チェック（マウント時にすでにセッションがある場合用）
    auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate('/dashboard', { replace: true });
      } else {
        // 5秒待ってもセッションが来ない場合は、タイムアウトとしてログイン画面へ
        const timeout = setTimeout(() => {
          console.log('AuthCallback: Timeout reached, returning to login');
          navigate('/login', { replace: true });
        }, 5000);
        return () => clearTimeout(timeout);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-primary-500 rounded flex items-center justify-center text-black font-bold font-mono mx-auto mb-6 animate-pulse">
          &gt;_
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">ログインを処理中...</h1>
        <p className="text-slate-400 text-sm">数秒お待ちください</p>
      </div>
    </div>
  );
};

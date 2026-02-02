import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Terminal } from 'lucide-react';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading, session } = useAuth();

  useEffect(() => {
    // Wait for auth state to be processed
    if (!loading) {
      if (session && user) {
        // OAuthログイン成功時にユーザーがまだDBに存在しない場合は作成
        navigate('/dashboard');
      } else if (session) {
        // セッションはあるがユーザープロファイルがない場合は作成待ち
        const timer = setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        // ログイン失敗
        navigate('/login', { replace: true });
      }
    }
  }, [loading, session, user, navigate]);

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

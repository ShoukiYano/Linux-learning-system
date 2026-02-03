import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Terminal, Mail, Lock, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState(false);
  const [error, setError] = useState('');

  const isRegister = location.pathname === '/register';

  React.useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name) {
          setError('名前を入力してください');
          setLoading(false);
          return;
        }
        const result = await signUp(email, password, name);
        if (result.error) {
          setError(result.error.message);
        } else {
          navigate('/dashboard');
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error.message);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async () => {
    setError('');
    setOAuthLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      setError('ログインに失敗しました');
    } finally {
      setOAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col">
      <header className="p-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center text-black font-bold font-mono">&gt;_</div>
          <span className="font-bold text-xl">Linux Master</span>
        </Link>
        <div className="flex gap-4">
          <Link to="/contact" className="text-sm text-slate-300 hover:text-white py-2">お問い合わせ</Link>
          <Link to="/register" className="text-sm bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded transition-colors">新規登録</Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary-500">
              <Terminal size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{isRegister ? 'アカウント作成' : 'おかえりなさい'}</h1>
            <p className="text-slate-400 text-sm">
              {isRegister ? 'Linuxマスターになるための第一歩' : '学習を続けるにはログインしてください'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">ニックネーム</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="Yuki Tanaka"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">メールアドレス</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300">パスワード</label>
                {!isRegister && (
                  <a href="#" className="text-xs text-primary-400 hover:underline">パスワードをお忘れですか？</a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-10 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-primary-500/20"
            >
              {loading ? '処理中...' : (isRegister ? '新規登録' : 'ログイン')} &rarr;
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-slate-800 text-slate-500">または</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              type="button"
              onClick={handleOAuthLogin}
              disabled={oauthLoading}
              className="flex items-center justify-center gap-2 py-2.5 border border-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors text-sm text-white"
            >
              {oauthLoading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <span className="font-bold text-blue-500">G</span>
              )}
              Google で{isRegister ? '新規登録' : 'ログイン'}
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-slate-400">
            {isRegister ? (
              <>
                アカウントをお持ちの方はこちら <Link to="/login" className="text-primary-400 hover:underline font-bold">ログイン</Link>
              </>
            ) : (
              <>
                アカウントをお持ちでない方はこちら <Link to="/register" className="text-primary-400 hover:underline font-bold">新規登録</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

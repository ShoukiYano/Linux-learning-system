import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  Trash2, 
  ChevronLeft,
  Search,
  AlertCircle,
  Shield,
  ShieldAlert
} from 'lucide-react';
import { clsx } from 'clsx';
import { User } from '../types';

export const AdminUserManagement = () => {
  const { isAdmin, loading: authLoading, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [isAdmin, authLoading]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await db.getUsers();
    if (error) {
      setError('ユーザーの取得に失敗しました');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('このユーザーを完全に削除してもよろしいですか？この操作は取り消せません。')) {
      return;
    }

    setDeletingId(userId);
    const { error } = await db.deleteUser(userId);
    
    if (error) {
      setError('ユーザーの削除に失敗しました');
      setDeletingId(null);
    } else {
      // Refresh list
      setUsers(users.filter(u => u.id !== userId));
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || authLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Users className="text-primary-600 dark:text-primary-400" /> ユーザー管理
              </h1>
              <p className="text-slate-500 dark:text-slate-400">利用ユーザーの確認と管理が行えます</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-500 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-xs font-bold hover:underline">閉じる</button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input
                type="text"
                placeholder="名前やメールアドレスで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors shadow-sm dark:shadow-none"
              />
            </div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              全 {filteredUsers.length} ユーザー
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">ユーザー</th>
                  <th className="px-6 py-4">ステータス/ロール</th>
                  <th className="px-6 py-4">レベル/XP</th>
                  <th className="px-6 py-4">登録日</th>
                  <th className="px-6 py-4 text-right">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-400 dark:text-slate-500">
                          {user.name?.[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.role === 'admin' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                            <Shield size={10} /> ADMIN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-bold">
                            USER
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                          ACTIVE
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Lv.{user.level}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{user.xp} XP</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '---'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deletingId === user.id}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          title="ユーザーを削除"
                        >
                          {deletingId === user.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="p-20 text-center">
              <Users className="mx-auto text-slate-700 mb-4" size={48} />
              <p className="text-slate-500">ユーザーが見つかりませんでした</p>
            </div>
          )}
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-6 rounded-2xl flex gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-500/10 rounded-xl h-fit">
            <ShieldAlert className="text-amber-600 dark:text-amber-500" size={24} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-amber-700 dark:text-amber-500 mb-2">管理上の注意</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              ユーザーを削除すると、そのユーザーに関連する全ての進行状況（ミッション、経験値、アクティビティ）が読み取り不可となります。
              認証情報（Auth）の削除は Supabase 管理画面から行う必要があります。
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

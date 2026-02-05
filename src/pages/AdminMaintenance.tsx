import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Trash2, Shield, Users, Zap, Target } from 'lucide-react';

export const AdminMaintenance = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchStats();
    fetchUsers();
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      const { userCount, missionCount, topUsers } = await db.getAdminStats();
      setStats({ userCount, missionCount, topUsers });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await db.supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const toggleAdminRole = async (userId: string, currentRole: string) => {
    if (confirm(`このユーザーを${currentRole === 'admin' ? 'ユーザーに降格' : '管理者に昇格'}しますか？`)) {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await db.updateUser(userId, { role: newRole });
      await fetchUsers();
    }
  };

  if (!isAdmin) return <div className="p-8">アクセス権限がありません</div>;

  const activityData = [
    { day: 'Mon', users: 120 },
    { day: 'Tue', users: 150 },
    { day: 'Wed', users: 130 },
    { day: 'Thu', users: 200 },
    { day: 'Fri', users: 180 },
    { day: 'Sat', users: 90 },
    { day: 'Sun', users: 110 },
  ];

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">メンテナンス・管理画面</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-600 dark:text-slate-200">ユーザー数</h4>
              <Users size={24} className="text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">{stats?.userCount || 0}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-600 dark:text-slate-200">ミッション数</h4>
              <Target size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats?.missionCount || 0}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-600 dark:text-slate-200">アクティブユーザー</h4>
              <Zap size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{Math.floor((stats?.userCount || 0) * 0.65)}</p>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-8 shadow-sm dark:shadow-none">
          <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">ユーザー登録推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityData}>
              <XAxis dataKey="day" stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: 'none', borderRadius: '8px', color: 'var(--tooltip-text)' }} />
              <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:shadow-none">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">ユーザー管理（{users.length}名）</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">ユーザー</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">メール</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">レベル</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">XP</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">ロール</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">登録日</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800/50' : 'bg-slate-50/30 dark:bg-slate-800/20'}>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{user.name}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{user.email}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">Level {user.level}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{user.xp} XP</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-sm font-bold ${
                        user.role === 'admin' 
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {user.role === 'admin' ? '👨‍💼 管理者' : 'ユーザー'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(user.created_at).toLocaleDateString('ja-JP')}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleAdminRole(user.id, user.role)}
                        className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-slate-700 rounded transition-colors"
                        title={user.role === 'admin' ? '管理者権限を削除' : '管理者権限を付与'}
                      >
                        <Shield size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Users */}
        {stats?.topUsers && stats.topUsers.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mt-8 overflow-hidden shadow-sm dark:shadow-none">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">トップユーザー</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.topUsers.map((user: any, idx: number) => (
                  <div key={user.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-transparent">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Level {user.level}</div>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{user.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

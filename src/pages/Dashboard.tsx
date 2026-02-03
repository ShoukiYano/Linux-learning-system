import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Terminal, ArrowRight, Flame, Target, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { MISSIONS } from '../constants';

export const Dashboard = () => {
  const { user } = useAuth();
  const [completedMissionsCount, setCompletedMissionsCount] = useState(0);
  const [activityData, setActivityData] = useState<{ name: string; cmd: number }[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchUserMissions();
      fetchActivity();
    }
  }, [user]);

  const fetchUserMissions = async () => {
    if (!user?.id) return;
    const { data } = await db.getUserMissions(user.id);
    if (data) {
      setCompletedMissionsCount(data.filter(m => m.is_completed).length);
    }
  };

  const fetchActivity = async () => {
    if (!user?.id) return;
    const { data } = await db.getWeeklyActivity(user.id);
    if (data) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const counts: { [key: string]: number } = {
        'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0
      };

      data.forEach(activity => {
        if (activity.type === 'command_execution') {
          const date = new Date(activity.created_at);
          const dayName = days[date.getDay()];
          counts[dayName]++;
        }
      });

      const formattedData = days.map(day => ({
        name: day,
        cmd: counts[day]
      }));

      // 週の並びを今日を最後にするように調整することもできるが、
      // 一般的には月〜日で固定か、日〜土で固定
      setActivityData(formattedData);
    }
  };

  const progressPercentage = Math.round((completedMissionsCount / MISSIONS.length) * 100);

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">お帰りなさい、{user?.name?.split(' ')[0] || 'ユーザー'}さん</h1>
            <p className="text-slate-400">Linux マスター への道を進みましょう</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase tracking-wider">連続学習</div>
              <div className="text-xl font-bold text-yellow-400 flex items-center justify-end gap-1">
                <Flame size={18}/> {user?.streak || 0} 日
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Hero Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold mb-4">
                推奨
              </span>
              <h2 className="text-2xl font-bold mb-2">次のミッションに挑戦しよう</h2>
              <p className="text-slate-400 mb-6 max-w-lg">
                Linux の基本コマンドから管理スキルまで、段階的に学習できます。
              </p>
              
              <div className="flex items-center gap-4 mb-6 text-sm text-slate-400">
                <span className="flex items-center gap-1"><Terminal size={16}/> 初級から上級</span>
                <span className="flex items-center gap-1"><Zap size={16}/> XP 獲得</span>
              </div>

              <Link to="/missions" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-lg font-bold transition-colors">
                ミッション一覧を見る <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col justify-between">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Target size={20} className="text-primary-400"/> 学習進捗
            </h3>
            <div className="h-32 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ value: progressPercentage }, { value: 100 - progressPercentage }]}
                    innerRadius={45}
                    outerRadius={65}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#334155" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{progressPercentage}%</span>
                <span className="text-xs text-slate-400">完了</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-xs text-slate-400">完了</div>
                <div className="font-bold text-lg text-primary-400">{completedMissionsCount}/{MISSIONS.length}</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-xs text-slate-400">XP</div>
                <div className="font-bold text-lg text-yellow-400">{user?.xp || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-200">レベル</h4>
              <Target size={20} className="text-primary-400"/>
            </div>
            <p className="text-3xl font-bold text-primary-400">{user?.level || 1}</p>
            <p className="text-xs text-slate-400 mt-2">次のレベルまであと {500 - (user?.xp ? user.xp % 500 : 0)} XP</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-200">総 XP</h4>
              <Zap size={20} className="text-yellow-400"/>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{user?.xp || 0}</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-200">連続日数</h4>
              <Flame size={20} className="text-orange-400"/>
            </div>
            <p className="text-3xl font-bold text-orange-400">{user?.streak || 0} 日</p>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-8">
          <h3 className="font-bold text-lg mb-4">今週のアクティビティ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData.length > 0 ? activityData : [
              { name: 'Mon', cmd: 0 }, { name: 'Tue', cmd: 0 }, { name: 'Wed', cmd: 0 },
              { name: 'Thu', cmd: 0 }, { name: 'Fri', cmd: 0 }, { name: 'Sat', cmd: 0 }, { name: 'Sun', cmd: 0 }
            ]}>
              <XAxis dataKey="name" stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
              <Bar dataKey="cmd" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Start */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/missions" className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-primary-500 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-primary-500/20 rounded-lg group-hover:bg-primary-500/30 transition-colors">
                <Terminal size={24} className="text-primary-400" />
              </div>
              <h4 className="font-bold">ミッション</h4>
            </div>
            <p className="text-slate-400 text-sm">新しいミッションに挑戦して XP を獲得しましょう</p>
          </Link>

          <Link to="/dictionary" className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-primary-500 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                <Terminal size={24} className="text-blue-400" />
              </div>
              <h4 className="font-bold">コマンド辞書</h4>
            </div>
            <p className="text-slate-400 text-sm">Linux コマンドの使い方をすぐに調べられます</p>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

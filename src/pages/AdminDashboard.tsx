import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  Activity, 
  Clock, 
  TrendingUp, 
  UserPlus, 
  ChevronRight,
  LayoutDashboard,
  FileText,
  Settings,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { clsx } from 'clsx';

export const AdminDashboard = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchStats();
  }, [isAdmin, authLoading]);

  const fetchStats = async () => {
    setLoading(true);
    const result = await db.getAdminStats();
    
    // Format weekly data for chart
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const counts: { [key: string]: number } = {};
    days.forEach(d => counts[d] = 0);

    result.weeklyData.forEach((a: any) => {
      const day = days[new Date(a.created_at).getDay()];
      counts[day]++;
    });

    const chartData = days.map(d => ({ name: d, count: counts[d] }));

    setStats({
      ...result,
      chartData
    });
    setLoading(false);
  };

  if (loading || authLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    { title: '本日のアクティブ', value: stats.activeToday, label: 'レッスン完了者', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: '本日の新規登録者', value: stats.newSignupsToday, label: '本日登録', icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { title: '総学習者数', value: stats.userCount, label: '登録ユーザー', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { title: '1週間以上未学習者', value: stats.inactiveCount, label: '要フォローアップ', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">管理者ダッシュボード</h1>
            <p className="text-slate-400">学習プラットフォームの稼働状況を確認できます</p>
          </div>
          <div className="flex gap-3">
            <Link to="/admin/maintenance" className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700">
              <Settings size={20} />
            </Link>
          </div>
        </div>

        {/* Quick Menu */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'ミッション', icon: BookOpen, path: '/admin/missions' },
            { label: 'ユーザー', icon: Users, path: '/admin/users' },
            { label: 'コマンド', icon: FileText, path: '/admin/commands' },
            { label: '学習パス', icon: TrendingUp, path: '/admin/learning-paths' },
            { label: 'ヘルプ', icon: HelpCircle, path: '/admin/help' },
            { label: 'Q&A', icon: MessageSquare, path: '/admin/qa' },
            { label: 'メンテナンス', icon: Settings, path: '/admin/maintenance' },
          ].map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary-500 rounded-xl p-4 text-center transition-all group"
            >
              <item.icon className="mx-auto mb-2 text-slate-400 group-hover:text-primary-400 transition-colors" size={24} />
              <h3 className="font-bold text-xs text-slate-200">{item.label}</h3>
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, i) => (
            <div key={i} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 transition-transform hover:scale-[1.02]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">{card.title}</p>
                  <h3 className="text-3xl font-bold text-white">{card.value}</h3>
                </div>
                <div className={clsx("p-2 rounded-lg", card.bg)}>
                  <card.icon className={card.color} size={20} />
                </div>
              </div>
              <p className="text-xs text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-white">週間アクティビティ</h3>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1 text-slate-400 uppercase tracking-wider font-bold">
                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                コマンド実行回数
              </span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ color: '#8b5cf6' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Tables / Top Users */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">トップ学習者</h3>
              <Link to="/leaderboard" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-bold uppercase tracking-wider">
                全て見る <ChevronRight size={14} />
              </Link>
            </div>
            <div className="space-y-4">
              {stats.topUsers.map((u: any, i: number) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.xp} XP • Lv.{u.level}</p>
                    </div>
                  </div>
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500" style={{ width: `${Math.min(100, (u.xp % 500) / 5)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6">ミッション状況</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <BookOpen size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">作成済み</p>
                    <p className="text-xs text-slate-500">{stats.missionCount} 課題</p>
                  </div>
                </div>
                <Link to="/admin/missions" className="text-primary-400 hover:bg-primary-500/10 p-1.5 rounded-lg transition-colors">
                  <ChevronRight size={18} />
                </Link>
              </div>
              
              <div className="pt-4 border-t border-slate-700">
                <p className="text-sm font-bold text-white mb-4">主要カテゴリ分布</p>
                <div className="space-y-3">
                  {[
                    { label: 'File Ops', percent: 65, color: 'bg-blue-500' },
                    { label: 'Permissions', percent: 45, color: 'bg-purple-500' },
                    { label: 'Network', percent: 30, color: 'bg-cyan-500' },
                  ].map(cat => (
                    <div key={cat.label} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                        <span>{cat.label}</span>
                        <span>{cat.percent}%</span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className={clsx("h-full rounded-full", cat.color)} style={{ width: `${cat.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Data Analysis Tables */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} className="text-secondary-400" />
            <h3 className="text-xl font-bold text-white">データ分析</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Signups */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex justify-between items-center">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus size={16} className="text-cyan-400" /> 新規登録者の推移
                </h4>
                <span className="text-[10px] text-slate-500 font-bold uppercase">直近10件</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-3 font-bold">登録日</th>
                      <th className="px-6 py-3 font-bold">ユーザー名</th>
                      <th className="px-6 py-3 font-bold text-right">ステータス</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {stats.recentUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-200">{u.name}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex justify-between items-center">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity size={16} className="text-primary-400" /> アクティビティログ
                </h4>
                <span className="text-[10px] text-slate-500 font-bold uppercase">最新の動き</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-3 font-bold">時間</th>
                      <th className="px-6 py-3 font-bold">ユーザー</th>
                      <th className="px-6 py-3 font-bold">アクション</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {stats.recentActivities.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                          {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-200">{a.users?.name || 'Unknown'}</td>
                        <td className="px-6 py-4">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold",
                            a.type === 'command_execution' ? "bg-primary-500/10 text-primary-400" : "bg-blue-500/10 text-blue-400"
                          )}>
                            {a.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Terminal, ArrowRight, Flame, Target, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { db } from '../lib/supabase';
import { MISSIONS } from '../constants';
import { clsx } from 'clsx';

export const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [completedMissionsCount, setCompletedMissionsCount] = useState(0);
  const [activityData, setActivityData] = useState<{ name: string; cmd: number }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userMissions, setUserMissions] = useState<any[]>([]);
  const [totalMissionsCount, setTotalMissionsCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchUserMissions();
      fetchActivity();
      fetchLearningPaths();
      fetchAllMissions();
    }
  }, [user]);

  const fetchAllMissions = async () => {
    const { data } = await db.getMissions();
    if (data) {
      setTotalMissionsCount(data.length);
    }
  };

  const fetchUserMissions = async () => {
    if (!user?.id) return;
    const { data } = await db.getUserMissions(user.id);
    if (data) {
      setUserMissions(data);
      setCompletedMissionsCount(data.filter(m => m.is_completed).length);
    }
  };

  const fetchLearningPaths = async () => {
    const { data } = await db.getLearningPaths();
    if (data) {
      setLearningPaths(data);
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.forEach((activity: any) => {
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

      setActivityData(formattedData);
    }
  };

  const progressPercentage = totalMissionsCount > 0 ? Math.round((completedMissionsCount / totalMissionsCount) * 100) : 0;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">{t('dashboard.welcome')}、{user?.name?.split(' ')[0] || 'User'}さん</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('dashboard.streak')}</div>
              <div className="text-xl font-bold text-yellow-500 dark:text-yellow-400 flex items-center justify-end gap-1">
                <Flame size={18}/> {user?.streak || 0} 日
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Hero Card - Now emphasizing Learning Tracks */}
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/40 dark:to-slate-900 rounded-2xl p-8 border border-indigo-100 dark:border-primary-500/20 relative overflow-hidden shadow-sm dark:shadow-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 text-xs font-bold mb-4">
                {t('dashboard.startPath')}
              </span>
              <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">{t('dashboard.pathTitle')}</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-lg">
                {t('dashboard.pathDesc')}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {learningPaths.slice(0, 2).map(path => {
                  const pathMissionsCount = path.missions?.length || 0;
                  const completedInPath = path.missions?.filter((mission: any) => 
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    userMissions.find((um: any) => um.mission_id === (mission.id || mission) && um.is_completed)
                  ).length || 0;
                  const progress = pathMissionsCount > 0 ? (completedInPath / pathMissionsCount) * 100 : 0;

                  return (
                    <div key={path.id} className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-indigo-50 dark:border-slate-700 shadow-sm dark:shadow-none">
                      <div className="text-sm font-bold mb-1 text-slate-800 dark:text-white">{path.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-500 mb-3">{pathMissionsCount} {t('nav.missions')}</div>
                      <div className="w-full h-1.5 bg-indigo-50 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 dark:bg-primary-500 transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-primary-600 dark:text-primary-400 mt-1 font-bold">
                        {completedInPath}/{pathMissionsCount} {t('dashboard.completed')}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Link to="/curriculum" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-primary-500/20">
                {t('dashboard.viewAllPaths')} <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-sm dark:shadow-none">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <Target size={20} className="text-primary-500 dark:text-primary-400"/> {t('dashboard.progress')}
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
                    <Cell fill="#334155" className="stroke-slate-200 dark:stroke-slate-700 fill-slate-100 dark:fill-slate-700" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{progressPercentage}%</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.completed')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('dashboard.completed')}</div>
                <div className="font-bold text-lg text-primary-600 dark:text-primary-400">{completedMissionsCount}/{totalMissionsCount}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400">XP</div>
                <div className="font-bold text-lg text-yellow-600 dark:text-yellow-400">{user?.xp || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-700 dark:text-slate-200">{t('profile.level')}</h4>
              <Target size={20} className="text-primary-600 dark:text-primary-400"/>
            </div>
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{user?.level || 1}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t('profile.nextLevel')} {500 - (user?.xp ? user.xp % 500 : 0)} XP</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-700 dark:text-slate-200">{t('profile.totalXp')}</h4>
              <Zap size={20} className="text-yellow-500 dark:text-yellow-400"/>
            </div>
            <p className="text-3xl font-bold text-yellow-500 dark:text-yellow-400">{user?.xp || 0}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-700 dark:text-slate-200">{t('profile.streak')}</h4>
              <Flame size={20} className="text-orange-500 dark:text-orange-400"/>
            </div>
            <p className="text-3xl font-bold text-orange-500 dark:text-orange-400">{user?.streak || 0} 日</p>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-8 shadow-sm dark:shadow-none">
          <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">{t('dashboard.weeklyActivity')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData.length > 0 ? activityData : [
              { name: 'Mon', cmd: 0 }, { name: 'Tue', cmd: 0 }, { name: 'Wed', cmd: 0 },
              { name: 'Thu', cmd: 0 }, { name: 'Fri', cmd: 0 }, { name: 'Sat', cmd: 0 }, { name: 'Sun', cmd: 0 }
            ]}>
              <XAxis dataKey="name" stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--tooltip-bg, #1e293b)', 
                  border: 'none', 
                  borderRadius: '8px', 
                  color: 'var(--tooltip-text, #f1f5f9)' 
                }} 
                cursor={{fill: 'transparent'}}
              />
              <Bar dataKey="cmd" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Start */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/missions" className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-primary-500 transition-colors group shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-primary-500/10 dark:bg-primary-500/20 rounded-lg group-hover:bg-primary-500/20 dark:group-hover:bg-primary-500/30 transition-colors">
                <Terminal size={24} className="text-primary-600 dark:text-primary-400" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">{t('nav.missions')}</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{t('dashboard.newMissionDesc')}</p>
          </Link>

          <Link to="/dictionary" className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-primary-500 transition-colors group shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30 transition-colors">
                <Terminal size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">{t('nav.dictionary')}</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{t('dashboard.dictDesc')}</p>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

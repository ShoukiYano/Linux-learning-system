import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { db } from '../lib/supabase';
import { LogOut, Edit2, Trophy, Target, Flame, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

export const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [leaderboardRank, setLeaderboardRank] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');

  useEffect(() => {
    if (!user?.id) {
      navigate('/login');
      return;
    }

    fetchUserStats();
  }, [user]);

  const fetchUserStats = async () => {
    if (!user?.id) return;

    // Get leaderboard rank
    const { data: leaderboard } = await db.getLeaderboard();
    if (leaderboard) {
      const rank = leaderboard.findIndex(u => u.id === user.id) + 1;
      setLeaderboardRank(rank);
    }

    // Get user activity
    const { data: activity } = await db.getUserActivity(user.id);
    if (activity) {
      setUserActivity(activity);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const updateProfile = async () => {
    if (!user?.id) return;
    await db.updateUser(user.id, { name: newName });
    setEditMode(false);
  };

  if (!user) {
    return (
      <Layout>
        <div className="p-8 text-center text-slate-400">
          {t('common.loading')}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 mb-8 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {editMode ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                      />
                      <button
                        onClick={updateProfile}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-bold"
                      >
                        {t('common.save')}
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg text-sm"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
                      <button
                        onClick={() => setEditMode(true)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-transparent"
            >
              <LogOut size={18} /> {t('nav.logout')}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary-500/10 dark:bg-primary-500/20 rounded-lg">
                <Target size={20} className="text-primary-600 dark:text-primary-400" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('profile.level')}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{user.level}</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-lg">
                <Flame size={20} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('profile.streak')}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{user.streak}</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                <Trophy size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('profile.rank')}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">#{leaderboardRank}</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-green-500/10 dark:bg-green-500/20 rounded-lg">
                <Flame size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('profile.totalXp')}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{user.xp}</div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 mb-8 shadow-sm dark:shadow-none">
          <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">{t('profile.nextLevel')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mb-2">
              <span>{t('profile.level')} {user.level}</span>
              <span>{user.xp % 500} / 500 XP</span>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
                style={{ width: `${(user.xp % 500) / 5}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
          <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">{t('profile.recentActivity')}</h3>
          {userActivity.length > 0 ? (
            <div className="space-y-4">
              {userActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                    <Trophy size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 dark:text-white font-medium">{activity.description}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(activity.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">{t('profile.noActivity')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { db } from '../lib/supabase';
import { Trophy, Flame, TrendingUp, Search } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { clsx } from 'clsx';

interface LeaderboardUser {
  id: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  streak: number;
}

export const Leaderboard = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [sortBy, setSortBy] = useState<'xp' | 'streak' | 'level'>('xp');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const { data } = sortBy === 'streak' 
      ? await db.getLeaderboardByStreak()
      : await db.getLeaderboard();
    
    if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-slate-900 dark:text-white">🏆 {t('leaderboard.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t('leaderboard.subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('xp')}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium transition-colors border",
                sortBy === 'xp'
                  ? "bg-primary-600 dark:bg-primary-600 text-white border-primary-600"
                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              <TrendingUp className="inline mr-2" size={16} /> {t('leaderboard.tab.xp')}
            </button>
            <button
              onClick={() => setSortBy('streak')}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium transition-colors border",
                sortBy === 'streak'
                  ? "bg-primary-600 dark:bg-primary-600 text-white border-primary-600"
                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              <Flame className="inline mr-2" size={16} /> {t('leaderboard.tab.streak')}
            </button>
            <button
              onClick={() => setSortBy('level')}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium transition-colors border",
                sortBy === 'level'
                  ? "bg-primary-600 dark:bg-primary-600 text-white border-primary-600"
                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              <Trophy className="inline mr-2" size={16} /> {t('leaderboard.tab.level')}
            </button>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t('leaderboard.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 shadow-sm"
            />
          </div>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">{t('leaderboard.loading')}</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300">{t('leaderboard.rank')}</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300">{t('leaderboard.user')}</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-600 dark:text-slate-300">{t('leaderboard.level')}</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-600 dark:text-slate-300">{t('leaderboard.xp')}</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-600 dark:text-slate-300">{t('leaderboard.streak')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => (
                  <tr 
                    key={user.id} 
                    className={clsx(
                      "border-b border-slate-100 dark:border-slate-700/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30",
                      idx < 3 ? 'bg-primary-50/50 dark:bg-slate-800/50' : ''
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="text-lg font-bold">
                        {getMedalEmoji(idx + 1)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-sm">
                        Lv {user.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-primary-600 dark:text-primary-400">{user.xp}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold flex items-center justify-end gap-1 text-yellow-500 dark:text-yellow-400">
                        🔥 {user.streak}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 mb-2">{t('leaderboard.noResults')}</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 text-sm"
            >
              {t('leaderboard.clearSearch')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

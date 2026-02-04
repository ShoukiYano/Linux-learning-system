import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { MISSIONS } from '../constants';
import { Link } from 'react-router-dom';
import { Lock, CheckCircle, Play, Search, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import { db } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { Mission } from '../types';

export const MissionList = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [missions, setMissions] = useState<Mission[]>(MISSIONS);
  const [filteredMissions, setFilteredMissions] = useState<Mission[]>(MISSIONS);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userMissions, setUserMissions] = useState<any[]>([]);

  useEffect(() => {
    // Fetch missions from Supabase
    const fetchMissions = async () => {
      const { data } = await db.getMissions();
      if (data && data.length > 0) {
        setMissions(data);
      }
    };
    fetchMissions();

    // Fetch user missions from Supabase if user is logged in
    if (user?.id) {
      fetchUserMissions();
    }
  }, [user]);

  const fetchUserMissions = async () => {
    if (!user?.id) return;
    const { data } = await db.getUserMissions(user.id);
    if (data) {
      setUserMissions(data);
    }
  };

  useEffect(() => {
    // Filter missions based on category and search
    let filtered = missions;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredMissions(filtered);
  }, [selectedCategory, searchQuery, missions]);

  const categories = ['all', 'File Ops', 'Permissions', 'Network', 'Text Processing'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryLabels: { [key: string]: string } = {
    all: t('missionList.categories.all'),
    'File Ops': t('missionList.categories.File Ops'),
    'Permissions': t('missionList.categories.Permissions'),
    'Network': t('missionList.categories.Network'),
    'Text Processing': t('missionList.categories.Text Processing'),
  };

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">{t('missionList.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t('missionList.subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                  selectedCategory === cat
                    ? "bg-primary-600 dark:bg-primary-500 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                )}
              >
                {categoryLabels[cat] || cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('missionList.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 w-full md:w-64"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMissions.map((mission) => {
            const userMission = userMissions.find(um => um.mission_id === mission.id);
            const isCompleted = userMission?.is_completed || mission.isCompleted;
            // DBのis_lockedか、モックのisLockedを使用（管理者の場合は無視）
            const isLocked = (mission.is_locked || mission.isLocked) && !isAdmin;

            return (
              <div key={mission.id} className={clsx(
                "rounded-xl border p-6 flex flex-col h-full transition-all duration-300 shadow-sm dark:shadow-none",
                isLocked 
                  ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75" 
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10"
              )}>
                <div className="flex justify-between items-start mb-4">
                  <span className={clsx(
                    "px-2 py-1 rounded text-xs font-bold",
                    mission.isLocked ? "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400" : "bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400"
                  )}>
                    {mission.difficulty}
                  </span>
                  {isCompleted ? (
                    <div className="flex items-center gap-1 text-primary-600 dark:text-primary-500 text-xs font-bold">
                      <CheckCircle size={14} /> {t('missionList.status.completed')}
                    </div>
                  ) : isLocked ? (
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-500 text-xs font-bold">
                      <Lock size={14} /> {t('missionList.status.locked')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-yellow-500 dark:text-yellow-400 text-xs font-bold">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 dark:bg-yellow-400 animate-pulse"></div> {t('missionList.status.inProgress')}
                    </div>
                  )}
                </div>

                <div className="mb-auto">
                  <div className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1">{mission.category}</div>
                  <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{mission.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{mission.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">+{mission.xp} XP</span>
                    </div>
                    {isLocked ? (
                      <span className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1"><Lock size={12}/> Lv.3 Required</span>
                    ) : (
                      <Link 
                        to={`/missions/${mission.id}`}
                        className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white hover:bg-primary-500 transition-colors"
                      >
                        <Play size={14} fill="currentColor" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMissions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-500 dark:text-slate-400 mb-2">{t('missionList.noResults')}</div>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 text-sm"
            >
              {t('missionList.resetFilter')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

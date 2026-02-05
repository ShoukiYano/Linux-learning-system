import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { MISSIONS } from '../constants';
import { Link } from 'react-router-dom';
import { Lock, CheckCircle, Play, Search, GraduationCap } from 'lucide-react';
import { clsx } from 'clsx';
import { db } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { Mission } from '../types';

export const MissionList = () => {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMissions, setUserMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: missionsData }, { data: pathsData }] = await Promise.all([
        db.getMissions(),
        db.getLearningPaths()
      ]);

      if (missionsData) setMissions(missionsData);
      if (pathsData) setLearningPaths(pathsData);

      if (user?.id) {
        const { data: umData } = await db.getUserMissions(user.id);
        if (umData) setUserMissions(umData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Identify independent missions (not in any path)
  const pathMissionIds = new Set(
    learningPaths.flatMap(path => path.missions?.map((m: any) => m.id) || [])
  );
  
  const independentMissions = missions.filter(m => !pathMissionIds.has(m.id));

  const filterMissions = (missionList: Mission[]) => {
    if (!searchQuery) return missionList;
    return missionList.filter(m =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const MissionCard = ({ mission, isLocked, isCompleted }: { mission: Mission, isLocked: boolean, isCompleted: boolean }) => (
    <div className={clsx(
      "rounded-xl border p-6 flex flex-col h-full transition-all duration-300 shadow-sm dark:shadow-none",
      isLocked 
        ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75" 
        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10"
    )}>
      <div className="flex justify-between items-start mb-4">
        <span className={clsx(
          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
          isLocked ? "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400" : "bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400"
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
        <div className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest font-bold mb-1">{mission.category}</div>
        <h3 className={clsx("text-lg font-bold mb-2", isLocked ? "text-slate-500" : "text-slate-900 dark:text-white")}>
          {mission.title}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{mission.description}</p>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">+{mission.xp} XP</span>
        </div>
        {isLocked ? (
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 cursor-not-allowed">
            <Lock size={14} />
          </div>
        ) : (
          <Link 
            to={`/missions/${mission.id}`}
            className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white hover:bg-primary-500 transition-all hover:scale-110 shadow-lg shadow-primary-500/20"
          >
            <Play size={14} fill="currentColor" />
          </Link>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <Layout><div className="p-8 flex items-center justify-center min-h-[60vh] text-slate-500">読み込み中...</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">{t('missionList.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 tracking-wide">{t('missionList.subtitle')}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('missionList.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 w-full md:w-80 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Learning Paths Grouping */}
        <div className="space-y-16">
          {learningPaths.map(path => {
            const filteredPathMissions = filterMissions(path.missions || []);
            if (filteredPathMissions.length === 0 && searchQuery) return null;

            return (
              <section key={path.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-primary-500/10 rounded-xl">
                    <GraduationCap className="text-primary-500" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{path.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{path.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {path.missions?.map((mission: Mission, index: number) => {
                    if (searchQuery && !filterMissions([mission]).length) return null;

                    const userMission = userMissions.find(um => um.mission_id === mission.id);
                    const isCompleted = !!userMission?.is_completed;
                    
                    // Locking logic: previous mission in this specific path must be completed
                    const isLocked = index > 0 && 
                      !userMissions.find(um => um.mission_id === path.missions[index-1].id && um.is_completed) && 
                      !isAdmin;

                    return (
                      <MissionCard 
                        key={`${path.id}-${mission.id}`} 
                        mission={mission} 
                        isLocked={isLocked || !!mission.is_locked && !isAdmin} 
                        isCompleted={isCompleted} 
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Independent Missions */}
          {independentMissions.length > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-slate-500/10 rounded-xl">
                  <Play className="text-slate-500" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">独立ミッション</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">どのコースにも属さない単発の課題です</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterMissions(independentMissions).map((mission: Mission) => {
                  const userMission = userMissions.find(um => um.mission_id === mission.id);
                  const isCompleted = !!userMission?.is_completed;
                  return (
                    <MissionCard 
                      key={mission.id} 
                      mission={mission} 
                      isLocked={!!mission.is_locked && !isAdmin} 
                      isCompleted={isCompleted} 
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Empty State */}
          {missions.length === 0 && !loading && (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400">{t('missionList.noResults')}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { db } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Play, ChevronLeft, ArrowRight, Lock } from 'lucide-react';

export const LearningPathDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const [path, setPath] = useState<any>(null);
  const [userMissions, setUserMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchData();
  }, [id, user]);

  const fetchData = async () => {
    try {
      if (!id) return;
      const { data: pathData } = await db.getLearningPath(id);
      if (pathData) setPath(pathData);

      if (user?.id) {
        const { data: umData } = await db.getUserMissions(user.id);
        if (umData) setUserMissions(umData);
      }
    } catch (error) {
      console.error('Error fetching path detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Layout><div className="p-8">読み込み中...</div></Layout>;
  }

  if (!path) {
    return (
      <Layout>
        <div className="p-8 text-center text-slate-400">
          学習パスが見つかりませんでした。
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <Link to="/curriculum" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ChevronLeft size={18} /> カリキュラムに戻る
        </Link>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="relative z-10">
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-4 inline-block ${
              path.difficulty === 'beginner' ? 'bg-green-500/10 text-green-400' :
              path.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-400' :
              'bg-red-500/10 text-red-400'
            }`}>
              {path.difficulty === 'beginner' ? '初級' :
               path.difficulty === 'intermediate' ? '中級' : '上級'}
            </span>
            <h1 className="text-4xl font-bold mb-4">{path.name}</h1>
            <p className="text-slate-300 text-lg mb-6 max-w-2xl leading-relaxed">{path.description}</p>
            
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-1"><BookOpen size={16}/> {path.missions?.length || 0} ミッション</span>
              <span className="flex items-center gap-1"><CheckCircle size={16}/> 体系的な学習</span>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          攻略順序
          <span className="text-sm font-normal text-slate-500">(上から順に進めることを推奨します)</span>
        </h2>

        <div className="space-y-4">
          {path.missions?.map((mission: any, index: number) => {
            const userMission = userMissions.find(um => um.mission_id === mission.id);
            const isCompleted = userMission?.is_completed;
            const isLocked = index > 0 && !userMissions.find(um => um.mission_id === path.missions[index-1].id && um.is_completed) && !isAdmin;

            return (
              <div key={mission.id} className={`flex items-stretch gap-6 group ${isLocked ? 'opacity-60' : ''}`}>
                {/* Step Connector */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10 ${
                    isCompleted ? 'bg-primary-500 text-black' : 
                    isLocked ? 'bg-slate-800 text-slate-500 border border-slate-700' :
                    'bg-slate-700 text-white'
                  }`}>
                    {isCompleted ? <CheckCircle size={18} /> : index + 1}
                  </div>
                  {index < path.missions.length - 1 && (
                    <div className="w-0.5 flex-1 bg-slate-700 my-1 group-hover:bg-primary-500/30 transition-colors"></div>
                  )}
                </div>

                {/* Mission Card */}
                <div className={`flex-1 p-5 rounded-2xl border transition-all mb-4 ${
                  isLocked ? 'bg-slate-900/50 border-slate-800' :
                  'bg-slate-800 border-slate-700 hover:border-primary-500/50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{mission.category}</span>
                        {isLocked && <Lock size={12} className="text-slate-600" />}
                      </div>
                      <h3 className={`font-bold text-lg mb-2 ${isLocked ? 'text-slate-500' : 'text-white'}`}>
                        {mission.title}
                      </h3>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-4">{mission.description}</p>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-yellow-500">+{mission.xp} XP</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{mission.difficulty}</span>
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col justify-center">
                      {isLocked ? (
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 cursor-not-allowed">
                          <Lock size={16} />
                        </div>
                      ) : (
                        <Link 
                          to={`/missions/${mission.id}`}
                          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
                            isCompleted 
                              ? 'bg-slate-700 text-primary-400 hover:bg-slate-600' 
                              : 'bg-primary-600 text-white hover:bg-primary-500 hover:scale-110 shadow-primary-500/20'
                          }`}
                        >
                          <Play size={18} fill={isCompleted ? "none" : "currentColor"} className={isCompleted ? '' : 'ml-1'} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

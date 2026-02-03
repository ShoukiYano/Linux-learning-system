import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { db } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BookOpen, GraduationCap, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Curriculum = () => {
  const { user } = useAuth();
  const [paths, setPaths] = useState<any[]>([]);
  const [userMissions, setUserMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: pathsData } = await db.getLearningPaths();
      if (pathsData) setPaths(pathsData);

      if (user?.id) {
        const { data: umData } = await db.getUserMissions(user.id);
        if (umData) setUserMissions(umData);
      }
    } catch (error) {
      console.error('Error fetching curriculum:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Layout><div className="p-8">読み込み中...</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap size={32} className="text-primary-400" />
            <h1 className="text-3xl font-bold">カリキュラム</h1>
          </div>
          <p className="text-slate-400">ミッションを目標別にまとめた「学習パス」で、体系的にスキルを習得しましょう。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paths.map(path => {
            const pathMissionsCount = path.missions?.length || 0;
            const completedInPath = path.missions?.filter((mId: string) => 
               userMissions.find(um => um.mission_id === mId && um.is_completed)
            ).length || 0;
            const progress = pathMissionsCount > 0 ? (completedInPath / pathMissionsCount) * 100 : 0;
            const isCompleted = pathMissionsCount > 0 && completedInPath === pathMissionsCount;

            return (
              <div key={path.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-primary-500/50 transition-all group flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      path.difficulty === 'beginner' ? 'bg-green-500/10 text-green-400' :
                      path.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {path.difficulty === 'beginner' ? '初級' :
                       path.difficulty === 'intermediate' ? '中級' : '上級'}
                    </span>
                    {isCompleted && (
                      <span className="flex items-center gap-1 text-primary-400 text-xs font-bold">
                        <CheckCircle size={14} /> 修了
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary-400 transition-colors">{path.name}</h3>
                  <p className="text-slate-400 text-sm mb-6 line-clamp-2">{path.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                    <span className="flex items-center gap-1"><BookOpen size={14}/> {pathMissionsCount} ミッション</span>
                    <span className="flex items-center gap-1"><Clock size={14}/> {path.estimated_hours}時間</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">進捗状況</span>
                      <span className="text-primary-400 font-bold">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700">
                  <Link 
                    to={`/curriculum/${path.id}`}
                    className="flex items-center justify-between text-sm font-bold text-white hover:text-primary-400 transition-colors"
                  >
                    <span>コースを開始する</span>
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {paths.length === 0 && (
          <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
            <BookOpen size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-500">現在、公開されている学習パスはありません。</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Trash2, Check, AlertCircle } from 'lucide-react';

export const AdminQAManager = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'solved'>('all');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchPosts();
  }, [isAdmin]);

  const fetchPosts = async () => {
    try {
      const { data } = await db.getQAPosts();
      if (data) setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSolved = async (postId: string) => {
    try {
      // Posts don't have a direct update, so we update through the DB
      const post = posts.find(p => p.id === postId);
      await db.supabase
        .from('qa_posts')
        .update({ is_solved: !post?.is_solved })
        .eq('id', postId);
      fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm('この質問を削除しますか？')) {
      try {
        await db.supabase
          .from('qa_posts')
          .delete()
          .eq('id', postId);
        fetchPosts();
        setSelectedPost(null);
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleDeleteAnswer = async (answerId: string) => {
    if (confirm('この回答を削除しますか？')) {
      try {
        await db.supabase
          .from('qa_answers')
          .delete()
          .eq('id', answerId);
        fetchPosts();
      } catch (error) {
        console.error('Error deleting answer:', error);
      }
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'pending') return !post.is_solved;
    if (filter === 'solved') return post.is_solved;
    return true;
  });

  if (!isAdmin) return <div className="p-8">アクセス権限がありません</div>;
  if (loading) return <Layout><div className="p-8">読み込み中...</div></Layout>;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <AlertCircle size={32} className="text-primary-400" />
          <h1 className="text-3xl font-bold">Q&A管理</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Posts List */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-700 flex gap-3">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                    filter === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  すべて ({posts.length})
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                    filter === 'pending'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  未解決 ({posts.filter(p => !p.is_solved).length})
                </button>
                <button
                  onClick={() => setFilter('solved')}
                  className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                    filter === 'solved'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  解決済み ({posts.filter(p => p.is_solved).length})
                </button>
              </div>

              <div className="space-y-3 p-6 max-h-[600px] overflow-y-auto">
                {filteredPosts.map(post => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${
                      selectedPost?.id === post.id
                        ? 'border-primary-500 bg-slate-700'
                        : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-white hover:text-primary-400 transition-colors">{post.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">投稿者: {post.created_by}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ml-2 ${
                        post.is_solved
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {post.is_solved ? '✓ 解決' : '未解決'}
                      </span>
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.tags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
                            #{tag}
                          </span>
                        ))}
                        {post.tags.length > 2 && (
                          <span className="text-xs px-2 py-0.5 text-slate-400">+{post.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Post Details */}
          {selectedPost && (
            <div className="lg:col-span-1">
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 sticky top-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">詳細</h3>
                  <button
                    onClick={() => handleDeletePost(selectedPost.id)}
                    className="p-2 text-red-400 hover:bg-slate-700 rounded transition-colors"
                    title="削除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-4 mb-6 pb-6 border-b border-slate-700">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase">タイトル</h4>
                    <p className="text-white mt-1">{selectedPost.title}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase">投稿者</h4>
                    <p className="text-white mt-1">{selectedPost.created_by}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase">ステータス</h4>
                    <button
                      onClick={() => handleMarkSolved(selectedPost.id)}
                      className={`mt-1 px-3 py-2 rounded-lg text-sm font-bold transition-colors w-full ${
                        selectedPost.is_solved
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                      }`}
                    >
                      <Check size={16} className="inline mr-2" />
                      {selectedPost.is_solved ? '解決済み' : '未解決'}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase">質問内容</h4>
                    <p className="text-slate-300 mt-2 text-sm whitespace-pre-wrap">{selectedPost.content}</p>
                  </div>

                  {selectedPost.tags && selectedPost.tags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase">タグ</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedPost.tags.map((tag: string) => (
                          <span key={tag} className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Answers */}
                {selectedPost.answers && selectedPost.answers.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-4">回答 ({selectedPost.answers.length}件)</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedPost.answers.map((answer: any) => (
                        <div key={answer.id} className="bg-slate-900/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-primary-400">{answer.created_by}</span>
                            <button
                              onClick={() => handleDeleteAnswer(answer.id)}
                              className="p-1 text-red-400 hover:bg-slate-700 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-slate-300 whitespace-pre-wrap">{answer.content}</p>
                          {answer.is_accepted && (
                            <div className="mt-2 text-xs text-green-400">✓ ベストアンサー</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { MessageCircle, ThumbsUp, Send, Plus } from 'lucide-react';

export const Community = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState('');
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [answerText, setAnswerText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchPosts();
  }, [sortBy]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await db.getQAPosts();
      if (data) {
        const sorted = data.sort((a: any, b: any) => {
          if (sortBy === 'newest') {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return (b.upvotes || 0) - (a.upvotes || 0);
        });
        setPosts(sorted);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert('タイトルと内容を入力してください');
      return;
    }

    try {
      if (!user?.id) {
        alert('ログインしてください');
        return;
      }

      await db.createQAPost({
        title: newPostTitle,
        content: newPostContent,
        tags: newPostTags.split(',').map(t => t.trim()).filter(t => t),
        user_id: user.id,
      });
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostTags('');
      setShowNewPost(false);
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('投稿に失敗しました');
    }
  };

  const handleCreateAnswer = async (postId: string) => {
    if (!answerText.trim()) return;

    try {
      if (!user?.id) {
        alert('ログインしてください');
        return;
      }

      await db.createQAAnswer({
        post_id: postId,
        content: answerText,
        user_id: user.id,
      });
      setAnswerText('');
      fetchPosts();
      setSelectedPost(null);
    } catch (error) {
      console.error('Error creating answer:', error);
      alert('回答の投稿に失敗しました');
    }
  };

  const handleToggleVote = async (postId: string) => {
    if (!user?.id) {
      alert('ログインしてください');
      return;
    }
    try {
      await db.toggleQAPostVote(postId, user.id);
      fetchPosts();
    } catch (error) {
      console.error('Error toggling vote:', error);
    }
  };

  const handleToggleAnswerVote = async (answerId: string) => {
    if (!user?.id) {
      alert('ログインしてください');
      return;
    }
    try {
      await db.toggleQAAnswerVote(answerId, user.id);
      fetchPosts();
    } catch (error) {
      console.error('Error toggling answer vote:', error);
    }
  };

  if (loading) {
    return <Layout><div className="p-8">読み込み中...</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <MessageCircle size={32} className="text-primary-400" />
            <h1 className="text-3xl font-bold">コミュニティQ&A</h1>
          </div>
          <button
            onClick={() => setShowNewPost(!showNewPost)}
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            質問を投稿
          </button>
        </div>

        {/* New Post Form */}
        {showNewPost && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-8">
            <h3 className="text-lg font-bold mb-4">新しい質問を投稿</h3>
            <input
              type="text"
              placeholder="タイトルを入力..."
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 mb-4"
            />
            <textarea
              placeholder="詳細を入力..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 mb-4 h-32"
            />
            <input
              type="text"
              placeholder="タグをカンマで区切って入力（例: Linux, bash, scripting）"
              value={newPostTags}
              onChange={(e) => setNewPostTags(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCreatePost}
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg font-bold transition-colors"
              >
                投稿する
              </button>
              <button
                onClick={() => setShowNewPost(false)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-2 rounded-lg font-bold transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* Sort Options */}
        <div className="mb-6">
          <div className="flex gap-3">
            <button
              onClick={() => setSortBy('newest')}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                sortBy === 'newest'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              最新
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                sortBy === 'popular'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              人気
            </button>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold mb-1">{post.title}</h3>
                  <p className="text-sm text-slate-400">
                    投稿者: {post.created_by} • {new Date(post.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  post.is_solved 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {post.is_solved ? '✓ 解決済み' : '未解決'}
                </span>
              </div>

              <p className="text-slate-300 mb-4">{post.content}</p>

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-slate-700 text-xs font-bold rounded text-slate-300">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleToggleVote(post.id)}
                    className={`flex items-center gap-1 transition-colors group relative ${
                      post.voters?.includes(user?.name) ? 'text-primary-400' : 'text-slate-400 hover:text-primary-400'
                    }`}
                  >
                    <ThumbsUp size={18} fill={post.voters?.includes(user?.name) ? "currentColor" : "none"} />
                    <span className="text-sm">{post.upvotes || 0}</span>
                    
                    {/* Tooltip */}
                    {post.voters && post.voters.length > 0 && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-[10px] py-1 px-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {post.voters.join(', ')}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                    className="flex items-center gap-1 text-slate-400 hover:text-primary-400 transition-colors"
                  >
                    <MessageCircle size={18} />
                    <span className="text-sm">{post.answers_count || 0} 回答</span>
                  </button>
                </div>
              </div>

              {/* Answers Section */}
              {selectedPost?.id === post.id && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <h4 className="font-bold mb-4">回答</h4>
                  <div className="space-y-4 mb-6">
                    {post.answers && post.answers.length > 0 ? (
                      post.answers.map((answer: any) => (
                        <div key={answer.id} className="bg-slate-900/50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="text-sm font-bold text-primary-400">{answer.created_by}</span>
                              {answer.is_accepted && <span className="ml-2 text-xs font-bold text-green-400">✓ ベストアンサー</span>}
                            </div>
                            <button 
                              onClick={() => handleToggleAnswerVote(answer.id)}
                              className={`flex items-center gap-1 transition-colors group relative ${
                                answer.voters?.includes(user?.name) ? 'text-primary-400' : 'text-slate-500 hover:text-primary-400'
                              }`}
                            >
                              <ThumbsUp size={14} fill={answer.voters?.includes(user?.name) ? "currentColor" : "none"} />
                              <span className="text-xs">{answer.upvotes || 0}</span>

                              {/* Tooltip */}
                              {answer.voters && answer.voters.length > 0 && (
                                <div className="absolute bottom-full mb-2 right-0 bg-slate-900 border border-slate-700 text-[10px] py-1 px-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  {answer.voters.join(', ')}
                                </div>
                              )}
                            </button>
                          </div>
                          <p className="text-slate-300">{answer.content}</p>
                          <p className="text-xs text-slate-500 mt-2">
                            {new Date(answer.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400">回答がまだありません</p>
                    )}
                  </div>

                  {user && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="回答を入力..."
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateAnswer(post.id)}
                      />
                      <button
                        onClick={() => handleCreateAnswer(post.id)}
                        className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">質問がまだありません。最初の質問を投稿してみてください！</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

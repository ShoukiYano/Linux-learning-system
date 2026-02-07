/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
// 環境変数からSupabaseのURLと匿名キーを取得
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'your-anon-key';

// Supabaseクライアントの初期化
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 認証関連関数 (Auth functions)
// ==========================================
export const auth = {
  /**
   * 新規ユーザー登録
   * @param email メールアドレス
   * @param password パスワード
   * @param name ユーザー名（メタデータとして保存）
   */
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    return { data, error };
  },

  /**
   * メールアドレスとパスワードでログイン
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  /**
   * Google OAuthログイン
   * 認証後のリダイレクト先を指定してOAuthフローを開始
   */
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  /**
   * ログアウト
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * 現在のセッション情報を取得
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  /**
   * 認証状態の変更を監視するリスナー設定
   * @param callback 状態変更時に呼ばれる関数
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data;
  },
};

// ==========================================
// データベース操作 (Database operations)
// ==========================================
export const db = {
  // ------------------------------------------
  // ユーザー (Users)
  // ------------------------------------------

  /**
   * ユーザーIDからプロフィール情報を取得
   */
  async getUser(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  /**
   * ユーザー情報の更新
   * @param userId 対象ユーザーID
   * @param updates 更新データオブジェクト
   */
  async updateUser(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  /**
   * ストリーク（連続ログイン日数）の更新ロジック
   * 最終アクティブ日時と比較してストリークを加算またはリセットします
   */
  async updateStreak(userId: string) {
    const { data: user, error: fetchError } = await this.getUser(userId);
    if (fetchError || !user) return { error: fetchError };

    const now = new Date();
    const lastActive = user.last_active_at ? new Date(user.last_active_at) : null;
    
    // 日付比較のためにUTC深夜0時に正規化
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    if (!lastActive) {
      // 初回のアクティビティ
      return await this.updateUser(userId, { 
        streak: 1, 
        last_active_at: now.toISOString() 
      });
    }

    const lastActiveDay = new Date(Date.UTC(lastActive.getUTCFullYear(), lastActive.getUTCMonth(), lastActive.getUTCDate()));
    
    const diffTime = today.getTime() - lastActiveDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // 連続した日付：ストリーク加算
      return await this.updateUser(userId, { 
        streak: (user.streak || 0) + 1, 
        last_active_at: now.toISOString() 
      });
    } else if (diffDays > 1) {
      // 1日以上空いた：ストリークリセット
      return await this.updateUser(userId, { 
        streak: 1, 
        last_active_at: now.toISOString() 
      });
    } else if (diffDays === 0) {
      // 同日中の活動：最終アクティブ時刻のみ更新
      return await this.updateUser(userId, { 
        last_active_at: now.toISOString() 
      });
    }

    return { data: user, error: null };
  },

  /**
   * 全ユーザーリストの取得（作成日順）
   */
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  /**
   * ユーザーの完全削除
   * 関連する全てのデータ（活動履歴、投稿、投票など）をカスケード削除します
   */
  async deleteUser(userId: string) {
    try {
      console.log(`Starting comprehensive delete for user: ${userId}`);
      
      // 1. 活動履歴と進行状況の削除
      await supabase.from('activities').delete().eq('user_id', userId);
      await supabase.from('user_missions').delete().eq('user_id', userId);
      
      // 2. 個人の投票データの削除
      await supabase.from('qa_post_votes').delete().eq('user_id', userId);
      await supabase.from('qa_answer_votes').delete().eq('user_id', userId);
      await supabase.from('help_article_votes').delete().eq('user_id', userId);
      
      // 3. ユーザーの回答の削除（関連する投票も先に削除）
      const { data: userAnswers } = await supabase.from('qa_answers').select('id').eq('user_id', userId);
      if (userAnswers && userAnswers.length > 0) {
        const answerIds = userAnswers.map(a => a.id);
        await supabase.from('qa_answer_votes').delete().in('answer_id', answerIds);
        await supabase.from('qa_answers').delete().in('id', answerIds);
        console.log(`Deleted ${userAnswers.length} user answers and their votes`);
      }
      
      // 4. ユーザーの投稿の削除（関連する回答と投票も削除）
      const { data: userPosts } = await supabase.from('qa_posts').select('id').eq('user_id', userId);
      if (userPosts && userPosts.length > 0) {
        const postIds = userPosts.map(p => p.id);
        
        // 投稿に対する回答とその投票を削除
        const { data: relatedAnswers } = await supabase.from('qa_answers').select('id').in('post_id', postIds);
        if (relatedAnswers && relatedAnswers.length > 0) {
          const relAnswerIds = relatedAnswers.map(a => a.id);
          await supabase.from('qa_answer_votes').delete().in('answer_id', relAnswerIds);
          await supabase.from('qa_answers').delete().in('id', relAnswerIds);
        }
        
        await supabase.from('qa_post_votes').delete().in('post_id', postIds);
        await supabase.from('qa_posts').delete().in('id', postIds);
        console.log(`Deleted ${userPosts.length} user posts and their related content`);
      }

      // 5. コンテンツテーブルの参照をNULLに設定（作成者情報の削除）
      try {
        await supabase.from('learning_paths').update({ created_by: null } as any).eq('created_by', userId);
        await supabase.from('help_articles').update({ created_by: null } as any).eq('created_by', userId);
      } catch (e) {
        console.warn('Could not nullify created_by references, possibly non-nullable or missing column', e);
      }

      // 6. 最後にpublic.usersテーブルからユーザーを削除
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) {
        console.error('Final delete of user record failed:', error);
      } else {
        console.log('User record successfully deleted from public.users');
      }
      
      return { error };
    } catch (err: any) {
      console.error('Critical failure in deleteUser cascading logic:', err);
      return { error: err };
    }
  },

  // ------------------------------------------
  // ミッション (Missions)
  // ------------------------------------------

  /**
   * 全ミッションデータを取得（表示順・作成日順）
   */
  async getMissions() {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });
    return { data, error };
  },

  /**
   * 特定のミッションを取得
   */
  async getMission(missionId: string) {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();
    return { data, error };
  },

  // ------------------------------------------
  // ミッションステップ (Mission Steps)
  // ------------------------------------------

  /**
   * ミッションに紐づくステップ一覧を取得
   */
  async getMissionSteps(missionId: string) {
    const { data, error } = await supabase
      .from('mission_steps')
      .select('*')
      .eq('mission_id', missionId)
      .order('order_index');
    return { data, error };
  },

  /**
   * ミッションステップの一括保存（既存ステップを削除して再挿入）
   */
  async saveMissionSteps(missionId: string, steps: any[]) {
    // 既存のステップを削除
    await supabase
      .from('mission_steps')
      .delete()
      .eq('mission_id', missionId);

    // 新しいステップを挿入
    if (steps.length > 0) {
      const stepsWithMissionId = steps.map((step, index) => ({
        mission_id: missionId,
        order_index: index,
        title: step.title,
        instruction: step.instruction,
        hint: step.hint || null,
        validation_type: step.validationType,
        validation_params: step.validationParams || {},
      }));

      const { data, error } = await supabase
        .from('mission_steps')
        .insert(stepsWithMissionId)
        .select();
      return { data, error };
    }
    return { data: [], error: null };
  },

  /**
   * ミッション詳細とステップ一覧を同時に取得する複合関数
   */
  async getMissionWithSteps(missionId: string) {
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();
    
    if (missionError) return { data: null, error: missionError };

    const { data: steps, error: stepsError } = await supabase
      .from('mission_steps')
      .select('*')
      .eq('mission_id', missionId)
      .order('order_index');

    if (stepsError) return { data: null, error: stepsError };

    return {
      data: {
        ...mission,
        steps: steps || [],
      },
      error: null,
    };
  },

  /**
   * ユーザーごとのミッション進捗を取得
   */
  async getUserMissions(userId: string) {
    const { data, error } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId);
    return { data, error };
  },

  /**
   * ミッション完了処理
   * 1. user_missionsテーブルに完了記録を追加・更新
   * 2. ユーザーのXPとレベルを加算・更新
   * @param xp 獲得経験値
   */
  async completeMission(userId: string, missionId: string, xp: number) {
    const { data, error } = await supabase
      .from('user_missions')
      .upsert({
        user_id: userId,
        mission_id: missionId,
        completed_at: new Date().toISOString(),
        is_completed: true,
      })
      .select()
      .single();

    if (!error) {
      // Update user XP and level
      const user = await this.getUser(userId);
      if (user.data) {
        const newXp = (user.data.xp || 0) + xp;
        // 例: 500XPごとにレベルアップ
        const newLevel = Math.floor(newXp / 500) + 1;
        await this.updateUser(userId, { xp: newXp, level: newLevel });
      }
    }

    return { data, error };
  },

  // ------------------------------------------
  // リーダーボード (Leaderboard)
  // ------------------------------------------

  /**
   * 経験値(XP)順のリーダーボードを取得
   */
  async getLeaderboard(limit: number = 50) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, level, xp, streak')
      .order('xp', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  /**
   * ストリーク順のリーダーボードを取得
   */
  async getLeaderboardByStreak(limit: number = 50) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, level, xp, streak')
      .order('streak', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  // ------------------------------------------
  // アクティビティログ (Activity Log)
  // ------------------------------------------

  /**
   * ユーザーの活動を記録
   */
  async logActivity(userId: string, activity: {
    type: string;
    missionId?: string;
    command?: string;
    description?: string;
    metadata?: any;
    level?: 'INFO' | 'WARN' | 'ERROR';
  }) {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        user_id: userId,
        type: activity.type,
        mission_id: activity.missionId,
        command: activity.command,
        description: activity.description,
        metadata: activity.metadata || {},
        level: activity.level || 'INFO',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    return { data, error };
  },

  /**
   * ユーザーの最近の活動を取得
   */
  async getUserActivity(userId: string, limit: number = 20) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  /**
   * 過去7日間の活動データを取得（グラフ表示用など）
   */
  async getWeeklyActivity(userId: string) {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const { data, error } = await supabase
      .from('activities')
      .select('created_at, type')
      .eq('user_id', userId)
      .gte('created_at', lastWeek.toISOString())
      .order('created_at', { ascending: true });
    
    return { data, error };
  },

  /**
   * 全アクティビティログを取得（管理者用・ダウンロード用）
   */
  async getAllActivities() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000); // 一旦1000件制限。必要に応じてページネーションや制限解除を検討
    return { data, error };
  },

  // ------------------------------------------
  // コマンド辞典 (Commands Dictionary)
  // ------------------------------------------

  /**
   * 全コマンド一覧を取得
   */
  async getCommands() {
    const { data, error } = await supabase
      .from('commands')
      .select('*')
      .order('name');
    return { data, error };
  },

  /**
   * コマンドの新規作成
   */
  async createCommand(command: any) {
    const { data, error } = await supabase
      .from('commands')
      .insert([command])
      .select()
      .single();
    return { data, error };
  },

  /**
   * コマンド情報の更新
   */
  async updateCommand(id: string, updates: any) {
    const { data, error } = await supabase
      .from('commands')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  /**
   * コマンドの削除
   */
  async deleteCommand(id: string) {
    const { error } = await supabase
      .from('commands')
      .delete()
      .eq('id', id);
    return { error };
  },

  // ------------------------------------------
  // 学習パス (Learning Paths)
  // ------------------------------------------

  /**
   * 学習パス一覧と、それに含まれるミッションを取得
   */
  async getLearningPaths() {
    const { data, error } = await supabase
      .from('learning_paths')
      .select(`
        *,
        path_missions (
          order_index,
          missions (*)
        )
      `)
      .order('order_index', { ascending: true });
    
    const formattedData = data?.map(path => ({
      ...path,
      name: path.title,
      difficulty: path.level?.toLowerCase() || 'intermediate',
      missions: path.path_missions
        ?.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        ?.map((pm: any) => pm.missions) || []
    }));

    return { data: formattedData, error };
  },

  /**
   * 学習パスの作成
   */
  async createLearningPath(path: any) {
    const rawLevel = path.level || path.difficulty || 'Intermediate';
    const capitalizedLevel = rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1).toLowerCase();

    const { data: pathData, error: pathError } = await supabase
      .from('learning_paths')
      .insert([{
        title: path.title || path.name, // Support both
        description: path.description,
        level: capitalizedLevel,
        estimated_hours: path.estimated_hours,
        created_by: path.user_id,
        is_published: true,
        order_index: path.order_index || 0, // Add order_index
      }])
      .select()
      .single();
    
    if (pathError) return { data: null, error: pathError };

    // Link missions if provided
    if (path.missions && path.missions.length > 0) {
      const pathMissions = path.missions.map((missionId: string, index: number) => ({
        path_id: pathData.id,
        mission_id: missionId,
        order_index: index,
      }));

      await supabase.from('path_missions').insert(pathMissions);
    }

    return { data: pathData, error: null };
  },

  /**
   * 学習パスの更新（ミッションの関連付け替え含む）
   */
  async updateLearningPath(id: string, updates: any) {
    const rawLevel = updates.level || updates.difficulty;
    const capitalizedLevel = rawLevel ? rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1).toLowerCase() : undefined;

    const { data, error } = await supabase
      .from('learning_paths')
      .update({
        title: updates.title || updates.name,
        description: updates.description,
        level: capitalizedLevel,
        estimated_hours: updates.estimated_hours,
        is_published: updates.is_published,
        order_index: updates.order_index, // Add order_index
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) return { data, error };

    // Update missions if provided
    if (updates.missions) {
      // Simplest: delete and re-insert
      await supabase.from('path_missions').delete().eq('path_id', id);
      
      if (updates.missions.length > 0) {
        const pathMissions = updates.missions.map((missionId: string, index: number) => ({
          path_id: id,
          mission_id: missionId,
          order_index: index,
        }));
        await supabase.from('path_missions').insert(pathMissions);
      }
    }

    return { data, error };
  },

  /**
   * 学習パスの削除
   */
  async deleteLearningPath(id: string) {
    const { error } = await supabase
      .from('learning_paths')
      .delete()
      .eq('id', id);
    return { error };
  },

  /**
   * 学習パスの詳細取得
   */
  async getLearningPath(id: string) {
    const { data, error } = await supabase
      .from('learning_paths')
      .select(`
        *,
        path_missions (
          order_index,
          missions (*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) return { data: null, error };

    const formattedData = {
      ...data,
      name: data.title,
      difficulty: data.level?.toLowerCase() || 'intermediate',
      missions: data.path_missions
        ?.sort((a: any, b: any) => a.order_index - b.order_index)
        ?.map((pm: any) => pm.missions) || []
    };

    return { data: formattedData, error: null };
  },

  // ------------------------------------------
  // ヘルプ記事 (Help Articles)
  // ------------------------------------------

  /**
   * ヘルプ記事一覧を取得
   */
  async getHelpArticles() {
    const { data, error } = await supabase
      .from('help_articles')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  /**
   * ヘルプ記事の作成
   */
  async createHelpArticle(article: any) {
    const { data, error } = await supabase
      .from('help_articles')
      .insert([{
        title: article.title,
        content: article.content,
        category: article.category,
        is_published: article.is_published,
        created_by: article.user_id,
      }])
      .select()
      .single();
    return { data, error };
  },

  /**
   * ヘルプ記事の更新
   */
  async updateHelpArticle(id: string, updates: any) {
    const { data, error } = await supabase
      .from('help_articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  /**
   * IDによるヘルプ記事取得
   */
  async getHelpArticleById(id: string) {
    const { data, error } = await supabase
      .from('help_articles')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  /**
   * ユーザーの投票済み記事一覧を取得
   */
  async getHelpArticleVotes(userId: string) {
    const { data, error } = await supabase
      .from('help_article_votes')
      .select('article_id')
      .eq('user_id', userId);
    return { data, error };
  },

  /**
   * 記事への「役に立った」投票のトグル処理
   */
  async toggleHelpfulVote(articleId: string, userId: string) {
    // Check if vote already exists
    const { data: existingVote } = await supabase
      .from('help_article_votes')
      .select('id')
      .eq('article_id', articleId)
      .eq('user_id', userId)
      .maybeSingle();

    const { data: article } = await supabase
      .from('help_articles')
      .select('helpful_count')
      .eq('id', articleId)
      .single();

    let newCount = article?.helpful_count || 0;

    if (existingVote) {
      // Remove vote
      await supabase
        .from('help_article_votes')
        .delete()
        .eq('id', existingVote.id);
      
      newCount = Math.max(0, newCount - 1);
    } else {
      // Add vote
      await supabase
        .from('help_article_votes')
        .insert([{ article_id: articleId, user_id: userId }]);
      
      newCount = newCount + 1;
    }

    // Update article count
    const { data, error } = await supabase
      .from('help_articles')
      .update({ helpful_count: newCount })
      .eq('id', articleId)
      .select()
      .single();

    return { data, error, voted: !existingVote };
  },

  // ------------------------------------------
  // Q&A掲示板 (Community Q&A)
  // ------------------------------------------

  /**
   * 投稿一覧を取得（関連するユーザー、投票、回答を含む）
   */
  async getQAPosts() {
    const { data, error } = await supabase
      .from('qa_posts')
      .select(`
        *,
        users (id, name, avatar_url),
        qa_post_votes (
          users (id, name)
        ),
        qa_answers (
          *,
          users (id, name, avatar_url),
          qa_answer_votes (
            users (id, name)
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    // データ整形：配列やオブジェクトの入れ子構造をフラットにして扱いやすくする
    const formattedData = data?.map(post => {
      // Handle the case where 'users' might be an array or an object
      const postUser = Array.isArray(post.users) ? post.users[0] : post.users;
      const authorName = postUser?.name || 'Anonymous';

      return {
        ...post,
        upvotes: post.qa_post_votes?.length || 0,
        voters: post.qa_post_votes?.map((v: any) => v.users?.name) || [],
        answers: post.qa_answers?.map((a: any) => {
          const answerUser = Array.isArray(a.users) ? a.users[0] : a.users;
          return {
            ...a,
            upvotes: a.qa_answer_votes?.length || 0,
            voters: a.qa_answer_votes?.map((v: any) => v.users?.name) || [],
            created_by: answerUser?.name || 'Anonymous'
          };
        }) || [],
        answers_count: post.qa_answers?.length || 0,
        created_by: authorName
      };
    });

    return { data: formattedData, error };
  },

  /**
   * 投稿への投票トグル
   */
  async toggleQAPostVote(postId: string, userId: string) {
    // Check if vote exists
    const { data: existingVote, error: checkError } = await supabase
      .from('qa_post_votes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking vote:', checkError);
      return { error: checkError };
    }

    if (existingVote) {
      // Remove vote
      return await supabase
        .from('qa_post_votes')
        .delete()
        .eq('id', existingVote.id);
    } else {
      // Add vote
      return await supabase
        .from('qa_post_votes')
        .insert([{ post_id: postId, user_id: userId }]);
    }
  },

  /**
   * 回答への投票トグル
   */
  async toggleQAAnswerVote(answerId: string, userId: string) {
    const { data: existingVote, error: checkError } = await supabase
      .from('qa_answer_votes')
      .select('id')
      .eq('answer_id', answerId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking answer vote:', checkError);
      return { error: checkError };
    }

    if (existingVote) {
      return await supabase
        .from('qa_answer_votes')
        .delete()
        .eq('id', existingVote.id);
    } else {
      return await supabase
        .from('qa_answer_votes')
        .insert([{ answer_id: answerId, user_id: userId }]);
    }
  },

  /**
   * 投稿の削除
   */
  async deleteQAPost(postId: string) {
    const { error } = await supabase
      .from('qa_posts')
      .delete()
      .eq('id', postId);
    return { error };
  },

  /**
   * 回答の削除
   */
  async deleteQAAnswer(answerId: string) {
    const { error } = await supabase
      .from('qa_answers')
      .delete()
      .eq('id', answerId);
    return { error };
  },

  /**
   * 投稿の作成
   */
  async createQAPost(post: any) {
    const { data, error } = await supabase
      .from('qa_posts')
      .insert([{
        user_id: post.user_id,
        title: post.title,
        content: post.content,
        tags: post.tags || [],
      }])
      .select()
      .single();
    return { data, error };
  },

  /**
   * 回答の作成
   */
  async createQAAnswer(answer: any) {
    const { data, error } = await supabase
      .from('qa_answers')
      .insert([{
        post_id: answer.post_id,
        user_id: answer.user_id,
        content: answer.content,
      }])
      .select()
      .single();
    return { data, error };
  },

  // ------------------------------------------
  // 管理画面用統計データ (Admin Stats)
  // ------------------------------------------

  /**
   * 管理ダッシュボード向けの統計情報を集計して返す
   */
  async getAdminStats() {
    // 各テーブルの総数取得
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: missionCount } = await supabase
      .from('missions')
      .select('*', { count: 'exact', head: true });

    // 本日のアクティビティ（JST境界を考慮）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000; // JST is UTC+9
    const todayJST = new Date(now.getTime() + jstOffset);
    todayJST.setUTCHours(0, 0, 0, 0);
    // DBはUTCなので、クエリ用にUTCに戻す
    const todayStartUTC = new Date(todayJST.getTime() - jstOffset).toISOString();

    const { data: todayActivities } = await supabase
      .from('activities')
      .select('user_id')
      .gte('created_at', todayStartUTC)
      .eq('type', 'command_execution');
    
    // ユニークユーザー数
    const activeToday = new Set(todayActivities?.map(a => a.user_id)).size;

    // 本日の新規登録者数
    const { count: newSignupsToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStartUTC);

    // 7日以上活動がないユーザー（簡易的な算出）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // 最近7日間に活動があったユーザーIDを取得
    const { data: recentActiveUsers } = await supabase
      .from('activities')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    const activeIds = new Set(recentActiveUsers?.map(a => a.user_id));
    const inactiveCount = (userCount || 0) - activeIds.size;

    // トップユーザー5名
    const { data: topUsers } = await supabase
      .from('users')
      .select('id, name, xp, level')
      .order('xp', { ascending: false })
      .limit(5);

    // 全ユーザーの週間活動データ（グラフ用）
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const { data: weeklyData } = await supabase
      .from('activities')
      .select('created_at')
      .gte('created_at', lastWeek.toISOString())
      .eq('type', 'command_execution');

    // 直近のアクティビティ（テーブル表示用）
    const { data: recentActivities } = await supabase
      .from('activities')
      .select('*, users(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    // 直近の新規登録ユーザー
    const { data: recentUsers } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      userCount: userCount || 0,
      missionCount: missionCount || 0,
      activeToday,
      newSignupsToday: newSignupsToday || 0,
      inactiveCount: Math.max(0, inactiveCount),
      topUsers,
      weeklyData: weeklyData || [],
      recentActivities: recentActivities || [],
      recentUsers: recentUsers || [],
    };
  },

  // 互換性やデバッグ用にSupabaseクライアント自体も公開
  supabase,
};

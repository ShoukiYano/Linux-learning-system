/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth functions
export const auth = {
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

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data;
  },
};

// Database operations
export const db = {
  // Users
  async getUser(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  async updateUser(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Missions
  async getMissions() {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .order('category');
    return { data, error };
  },

  async getMission(missionId: string) {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();
    return { data, error };
  },

  // Mission Steps
  async getMissionSteps(missionId: string) {
    const { data, error } = await supabase
      .from('mission_steps')
      .select('*')
      .eq('mission_id', missionId)
      .order('order_index');
    return { data, error };
  },

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

  async getUserMissions(userId: string) {
    const { data, error } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId);
    return { data, error };
  },

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
        const newLevel = Math.floor(newXp / 500) + 1;
        await this.updateUser(userId, { xp: newXp, level: newLevel });
      }
    }

    return { data, error };
  },

  // Leaderboard
  async getLeaderboard(limit: number = 50) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, level, xp, streak')
      .order('xp', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  async getLeaderboardByStreak(limit: number = 50) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, level, xp, streak')
      .order('streak', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  // Activity
  async logActivity(userId: string, activity: {
    type: string;
    missionId?: string;
    command?: string;
    description?: string;
  }) {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        user_id: userId,
        type: activity.type,
        mission_id: activity.missionId,
        command: activity.command,
        description: activity.description,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    return { data, error };
  },

  async getUserActivity(userId: string, limit: number = 20) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data, error };
  },

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

  // Commands (辞典)
  async getCommands() {
    const { data, error } = await supabase
      .from('commands')
      .select('*')
      .order('name');
    return { data, error };
  },

  async createCommand(command: any) {
    const { data, error } = await supabase
      .from('commands')
      .insert([command])
      .select()
      .single();
    return { data, error };
  },

  async updateCommand(id: string, updates: any) {
    const { data, error } = await supabase
      .from('commands')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteCommand(id: string) {
    const { error } = await supabase
      .from('commands')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Learning Paths (学習パス)
  async getLearningPaths() {
    const { data, error } = await supabase
      .from('learning_paths')
      .select(`
        *,
        path_missions (mission_id)
      `)
      .order('created_at', { ascending: false });
    
    const formattedData = data?.map(path => ({
      ...path,
      name: path.title, // Align with UI expectation
      missions: path.path_missions?.map((pm: any) => pm.mission_id) || []
    }));

    return { data: formattedData, error };
  },

  async createLearningPath(path: any) {
    const { data: pathData, error: pathError } = await supabase
      .from('learning_paths')
      .insert([{
        title: path.title || path.name, // Support both
        description: path.description,
        level: path.level || path.difficulty || 'Intermediate',
        estimated_hours: path.estimated_hours,
        created_by: path.user_id,
        is_published: true,
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

  async updateLearningPath(id: string, updates: any) {
    const { data, error } = await supabase
      .from('learning_paths')
      .update({
        title: updates.title || updates.name,
        description: updates.description,
        level: updates.level || updates.difficulty,
        estimated_hours: updates.estimated_hours,
        is_published: updates.is_published,
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

  async deleteLearningPath(id: string) {
    const { error } = await supabase
      .from('learning_paths')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Help Articles (ヘルプセンター)
  async getHelpArticles() {
    const { data, error } = await supabase
      .from('help_articles')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

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

  async updateHelpArticle(id: string, updates: any) {
    const { data, error } = await supabase
      .from('help_articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Q&A
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
    
    const formattedData = data?.map(post => ({
      ...post,
      upvotes: post.qa_post_votes?.length || 0,
      voters: post.qa_post_votes?.map((v: any) => v.users?.name) || [],
      answers: post.qa_answers?.map((a: any) => ({
        ...a,
        upvotes: a.qa_answer_votes?.length || 0,
        voters: a.qa_answer_votes?.map((v: any) => v.users?.name) || [],
        created_by: a.users?.name || 'Anonymous'
      })) || [],
      answers_count: post.qa_answers?.length || 0,
      created_by: post.users?.name || 'Anonymous'
    }));

    return { data: formattedData, error };
  },

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

  async deleteQAPost(postId: string) {
    const { error } = await supabase
      .from('qa_posts')
      .delete()
      .eq('id', postId);
    return { error };
  },

  async deleteQAAnswer(answerId: string) {
    const { error } = await supabase
      .from('qa_answers')
      .delete()
      .eq('id', answerId);
    return { error };
  },

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

  // Admin Stats
  async getAdminStats() {
    // Basic counts
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: missionCount } = await supabase
      .from('missions')
      .select('*', { count: 'exact', head: true });

    // Activities today (unique users who ran commands)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayActivities } = await supabase
      .from('activities')
      .select('user_id')
      .gte('created_at', today.toISOString())
      .eq('type', 'command_execution');
    
    const activeToday = new Set(todayActivities?.map(a => a.user_id)).size;

    // New signups today
    const { count: newSignupsToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Users not active for more than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // This is a bit complex in Supabase without a join or last_active field. 
    // For now, let's use the created_at of users or assume a simple metric.
    // Ideally we'd select users WHERE NOT EXISTS (activity in last 7 days)
    const { data: recentActiveUsers } = await supabase
      .from('activities')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    const activeIds = new Set(recentActiveUsers?.map(a => a.user_id));
    const inactiveCount = (userCount || 0) - activeIds.size;

    const { data: topUsers } = await supabase
      .from('users')
      .select('id, name, xp, level')
      .order('xp', { ascending: false })
      .limit(5);

    // Weekly activity for all users
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const { data: weeklyData } = await supabase
      .from('activities')
      .select('created_at')
      .gte('created_at', lastWeek.toISOString())
      .eq('type', 'command_execution');

    // Recent activities for the table
    const { data: recentActivities } = await supabase
      .from('activities')
      .select('*, users(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    // Recent signups for the table
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

  // Admin methods
  supabase,
};

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
        redirectTo: `${window.location.origin}/#/auth/callback`,
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
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async createLearningPath(path: any) {
    const { data, error } = await supabase
      .from('learning_paths')
      .insert([path])
      .select()
      .single();
    return { data, error };
  },

  async updateLearningPath(id: string, updates: any) {
    const { data, error } = await supabase
      .from('learning_paths')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
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
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async createHelpArticle(article: any) {
    const { data, error } = await supabase
      .from('help_articles')
      .insert([article])
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
      .select('*, user:users(id,name,avatar_url), answers:qa_answers(count)')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async createQAPost(post: any) {
    const { data, error } = await supabase
      .from('qa_posts')
      .insert([post])
      .select()
      .single();
    return { data, error };
  },

  async createQAAnswer(answer: any) {
    const { data, error } = await supabase
      .from('qa_answers')
      .insert([answer])
      .select()
      .single();
    return { data, error };
  },

  // Admin Stats
  async getAdminStats() {
    const { data: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    
    const { data: missionCount } = await supabase
      .from('missions')
      .select('id', { count: 'exact', head: true });
    
    const { data: topUsers } = await supabase
      .from('users')
      .select('id, name, xp, level')
      .order('xp', { ascending: false })
      .limit(5);

    return {
      userCount: userCount?.length || 0,
      missionCount: missionCount?.length || 0,
      topUsers,
    };
  },

  // Admin methods
  supabase,
};

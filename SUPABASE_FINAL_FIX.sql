-- =============================================
-- Q&A 最終修正スクリプト (削除・投票エラー対策)
-- =============================================

-- 1. 投稿への投票テーブルの再作成（カスケード削除を確実にするため）
DROP TABLE IF EXISTS public.qa_post_votes;
CREATE TABLE public.qa_post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.qa_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- 2. 回答への投票テーブルの再作成
DROP TABLE IF EXISTS public.qa_answer_votes;
CREATE TABLE public.qa_answer_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES public.qa_answers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(answer_id, user_id)
);

-- RLS の有効化
ALTER TABLE public.qa_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_answer_votes ENABLE ROW LEVEL SECURITY;

-- 3. ポリシーの再設定 (Q&A 投稿)
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.qa_posts;
CREATE POLICY "Public posts are viewable by everyone" ON public.qa_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create posts" ON public.qa_posts;
CREATE POLICY "Users can create posts" ON public.qa_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own posts" ON public.qa_posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.qa_posts;
CREATE POLICY "Management: Owner or Admin" ON public.qa_posts FOR ALL 
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 4. ポリシーの再設定 (Q&A 回答)
DROP POLICY IF EXISTS "Public answers are viewable by everyone" ON public.qa_answers;
CREATE POLICY "Public answers are viewable by everyone" ON public.qa_answers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create answers" ON public.qa_answers;
CREATE POLICY "Users can create answers" ON public.qa_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Management: Answer owner or Admin" ON public.qa_answers;
CREATE POLICY "Management: Answer owner or Admin" ON public.qa_answers FOR ALL 
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 5. 投票テーブルのポリシー
DROP POLICY IF EXISTS "Everyone can view post votes" ON public.qa_post_votes;
CREATE POLICY "Everyone can view post votes" ON public.qa_post_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own post votes" ON public.qa_post_votes;
CREATE POLICY "Users can manage their own post votes" ON public.qa_post_votes FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view answer votes" ON public.qa_answer_votes;
CREATE POLICY "Everyone can view answer votes" ON public.qa_answer_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own answer votes" ON public.qa_answer_votes;
CREATE POLICY "Users can manage their own answer votes" ON public.qa_answer_votes FOR ALL USING (auth.uid() = user_id);

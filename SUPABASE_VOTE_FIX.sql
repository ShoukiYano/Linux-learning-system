-- =============================================
-- Q&A 投票機能強化スクリプト
-- =============================================

-- 1. 投稿への投票 (qa_post_votes)
CREATE TABLE IF NOT EXISTS public.qa_post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.qa_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.qa_post_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Voters are viewable by everyone" ON public.qa_post_votes;
CREATE POLICY "Voters are viewable by everyone" ON public.qa_post_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can toggle their own votes" ON public.qa_post_votes;
CREATE POLICY "Users can toggle their own votes" ON public.qa_post_votes FOR ALL USING (auth.uid() = user_id);

-- 2. 回答への投票 (qa_answer_votes)
CREATE TABLE IF NOT EXISTS public.qa_answer_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES public.qa_answers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(answer_id, user_id)
);

ALTER TABLE public.qa_answer_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Answer voters are viewable by everyone" ON public.qa_answer_votes;
CREATE POLICY "Answer voters are viewable by everyone" ON public.qa_answer_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can toggle their own answer votes" ON public.qa_answer_votes;
CREATE POLICY "Users can toggle their own answer votes" ON public.qa_answer_votes FOR ALL USING (auth.uid() = user_id);

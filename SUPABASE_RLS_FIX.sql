-- =============================================
-- RLS ポリシー修復・追加スクリプト
-- Supabase SQL Editor で実行してください
-- =============================================

-- 1. Q&A 投稿 (qa_posts)
ALTER TABLE public.qa_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.qa_posts;
CREATE POLICY "Public posts are viewable by everyone" ON public.qa_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.qa_posts;
CREATE POLICY "Authenticated users can create posts" ON public.qa_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.qa_posts;
CREATE POLICY "Users can update own posts" ON public.qa_posts FOR UPDATE USING (auth.uid() = user_id);

-- 2. Q&A 回答 (qa_answers)
ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public answers are viewable by everyone" ON public.qa_answers;
CREATE POLICY "Public answers are viewable by everyone" ON public.qa_answers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create answers" ON public.qa_answers;
CREATE POLICY "Authenticated users can create answers" ON public.qa_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own answers" ON public.qa_answers;
CREATE POLICY "Users can update own answers" ON public.qa_answers FOR UPDATE USING (auth.uid() = user_id);

-- 3. ヘルプ記事 (help_articles)
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published articles are readable by everyone" ON public.help_articles;
CREATE POLICY "Published articles are readable by everyone" ON public.help_articles 
FOR SELECT USING (
  is_published = true OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can manage articles" ON public.help_articles;
CREATE POLICY "Admins can manage articles" ON public.help_articles 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 4. 学習パス (learning_paths)
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Paths are readable by everyone" ON public.learning_paths;
CREATE POLICY "Paths are readable by everyone" ON public.learning_paths 
FOR SELECT USING (
  is_published = true OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can manage paths" ON public.learning_paths;
CREATE POLICY "Admins can manage paths" ON public.learning_paths 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 5. 学習パス・ミッション紐付け (path_missions)
ALTER TABLE public.path_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Path missions are readable by everyone" ON public.path_missions;
CREATE POLICY "Path missions are readable by everyone" ON public.path_missions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage path missions" ON public.path_missions;
CREATE POLICY "Admins can manage path missions" ON public.path_missions 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 6. コマンド (commands)
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Commands are readable by everyone" ON public.commands;
CREATE POLICY "Commands are readable by everyone" ON public.commands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage commands" ON public.commands;
CREATE POLICY "Admins can manage commands" ON public.commands 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

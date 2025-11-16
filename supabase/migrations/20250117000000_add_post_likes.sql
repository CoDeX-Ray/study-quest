-- Create post_likes table for tracking individual likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can view all likes" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can insert own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can delete own likes" ON public.post_likes;

-- Users can view all likes (including unauthenticated for public viewing)
CREATE POLICY "Users can view all likes"
ON public.post_likes FOR SELECT
USING (true);

-- Authenticated users can insert their own likes (for any post, including their own)
CREATE POLICY "Authenticated users can insert own likes"
ON public.post_likes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Authenticated users can delete their own likes
CREATE POLICY "Authenticated users can delete own likes"
ON public.post_likes FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);


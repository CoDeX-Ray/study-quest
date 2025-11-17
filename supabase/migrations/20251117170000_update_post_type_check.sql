-- Allow announcement posts alongside other community post types
ALTER TABLE public.posts
DROP CONSTRAINT IF EXISTS posts_post_type_check;

ALTER TABLE public.posts
ADD CONSTRAINT posts_post_type_check
CHECK (post_type IN ('material', 'strategy', 'idea', 'announcement'));


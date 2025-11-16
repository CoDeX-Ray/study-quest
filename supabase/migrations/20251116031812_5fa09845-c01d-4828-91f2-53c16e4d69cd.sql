-- Create storage bucket for post files
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-files', 'post-files', true);

-- Storage policies for post files
CREATE POLICY "Anyone can view post files"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-files');

CREATE POLICY "Authenticated users can upload post files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own post files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own post files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add is_announcement field to posts
ALTER TABLE public.posts
ADD COLUMN is_announcement boolean NOT NULL DEFAULT false;

-- Update posts RLS policies to allow admins to delete any post
CREATE POLICY "Admins can delete any post"
ON public.posts FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view and insert posts
CREATE POLICY "Admins can view all posts"
ON public.posts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert posts"
ON public.posts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));
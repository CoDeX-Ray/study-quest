-- Allow everyone to view basic profile information (name, avatar, level) for displaying post authors
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);
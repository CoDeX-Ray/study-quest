-- Add category and department columns to posts table
ALTER TABLE public.posts
ADD COLUMN category text NOT NULL DEFAULT 'College',
ADD COLUMN department text;

-- Add a check constraint for valid departments
ALTER TABLE public.posts
ADD CONSTRAINT valid_department CHECK (
  department IS NULL OR 
  department IN (
    'College of Engineering',
    'College of Education',
    'College of Arts and Science',
    'College of Industrial Technology'
  )
);
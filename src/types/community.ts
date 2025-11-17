export interface ProfileSummary {
  id: string;
  full_name: string | null;
}

export interface PostLike {
  post_id: string;
  user_id: string;
}

export interface CommentAuthor {
  full_name: string | null;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: CommentAuthor | null;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  subject: string;
  category: string;
  department: string | null;
  post_type?: string | null;
  file_url: string | null;
  created_at: string;
  is_announcement: boolean;
  user_id: string;
  profiles: ProfileSummary | null;
  post_likes: PostLike[];
  post_comments: PostComment[];
}


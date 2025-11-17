import { supabase } from "@/integrations/supabase/client";
import { Post, ProfileSummary } from "@/types/community";

interface LoadPostsOptions {
  announcementsOnly?: boolean;
  from?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 10;

export const loadPostsWithRelations = async (
  options: LoadPostsOptions = {}
): Promise<Post[]> => {
  const {
    announcementsOnly,
    from = 0,
    limit = DEFAULT_LIMIT,
  } = options;

  const to = from + Math.max(limit, 1) - 1;

  let query = supabase
    .from("posts")
    .select(
      "id, title, content, subject, category, department, post_type, file_url, created_at, is_announcement, user_id"
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (announcementsOnly) {
    query = query.eq("is_announcement", true);
  }

  const { data: postsData, error: postsError } = await query;

  if (postsError) throw postsError;
  if (!postsData || postsData.length === 0) {
    return [];
  }

  const postIds = postsData.map((post) => post.id);

  const [likesResult, commentsResult] = await Promise.all([
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase
      .from("post_comments")
      .select("id, post_id, user_id, content, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
  ]);

  if (likesResult.error) throw likesResult.error;
  if (commentsResult.error) throw commentsResult.error;

  const commentAuthorIds = (commentsResult.data || []).map((comment) => comment.user_id);
  const authorIds = Array.from(
    new Set([
      ...postsData.map((post) => post.user_id),
      ...commentAuthorIds,
    ])
  );

  let profilesData: ProfileSummary[] = [];
  if (authorIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);

    if (profilesError) throw profilesError;
    profilesData = profiles || [];
  }

  const profileMap = new Map<string, ProfileSummary>(
    profilesData.map((profile) => [profile.id, profile])
  );

  return postsData.map((post) => ({
    ...post,
    profiles: profileMap.get(post.user_id) || null,
    post_likes: (likesResult.data || []).filter((like) => like.post_id === post.id),
    post_comments: (commentsResult.data || [])
      .filter((comment) => comment.post_id === post.id)
      .map((comment) => ({
        ...comment,
        author: profileMap.get(comment.user_id) || null,
      })),
  }));
};


import { create } from 'zustand';
import type { Post, ScheduledPost } from '../types/post';

interface PostsStore {
  posts: Post[];
  scheduled: ScheduledPost[];
  setPosts: (posts: Post[]) => void;
  setScheduled: (scheduled: ScheduledPost[]) => void;
}

export const usePostsStore = create<PostsStore>((set) => ({
  posts: [],
  scheduled: [],
  setPosts: (posts) => set({ posts }),
  setScheduled: (scheduled) => set({ scheduled }),
}));

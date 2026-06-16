import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToastStore } from '../../store/toastStore';
import { PostCard } from '../../components/Post/PostCard';
import { DashboardConnectSection } from '../../components/OAuth/DashboardConnectSection';
import { usePostsStore } from '../../store/postsStore';
import { usePosts } from '../../hooks/usePosts';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconPen, IconPlus } from '../../components/ui/Icons';
import type { Post } from '../../types/post';


export function DashboardPage() {
  const { posts, setPosts } = usePostsStore();
  const { fetchPosts } = usePosts();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);
  const [params, setParams] = useSearchParams();
  const toast = useToastStore((s) => s.show);
  const [connectedCount, setConnectedCount] = useState(0);
  const [connectRefresh, setConnectRefresh] = useState(0);

  useEffect(() => {
    if (!user) fetchMe().catch(() => {});
  }, [user, fetchMe]);

  useEffect(() => {
    fetchPosts().then((data: Post[]) => setPosts(data)).catch(console.error);
  }, [fetchPosts, setPosts]);

  useEffect(() => {
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) {
      toast(`${connected} connected successfully`, 'success');
      setConnectRefresh((n) => n + 1);
      setParams({});
    } else if (error) {
      toast(`Failed to connect ${error}`, 'error');
      setConnectRefresh((n) => n + 1);
      setParams({});
    }
  }, [params, setParams, toast]);

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const pendingApprovalCount = posts.filter((p) => p.status === 'pending_approval').length;

  return (
    <div className="space-y-10">
      <PageHeader
        badge="Workspace"
        title="Dashboard"
        subtitle="Connect accounts and manage your social content"
        action={
          connectedCount > 0 ? (
            <Link to="/posts/new" className="btn-primary !py-2.5 !text-sm">
              <span className="flex items-center gap-2">
                <IconPlus className="h-4 w-4" />
                New Post
              </span>
            </Link>
          ) : undefined
        }
      />

      <DashboardConnectSection
        onAccountsChange={setConnectedCount}
        refreshToken={connectRefresh}
      />

      <div className="stagger-children grid gap-4 sm:grid-cols-4">
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-400">Connected accounts</p>
          <p className="mt-2 font-display text-4xl font-bold text-violet-300">{connectedCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-400">Published posts</p>
          <p className="mt-2 font-display text-4xl font-bold text-emerald-400">{publishedCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-400">Drafts</p>
          <p className="mt-2 font-display text-4xl font-bold text-violet-300">{draftCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-400">Pending approval</p>
          <p className="mt-2 font-display text-4xl font-bold text-amber-300">{pendingApprovalCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-slate-400">Total posts</p>
          <p className="mt-2 font-display text-4xl font-bold text-white">{posts.length}</p>
        </div>
      </div>


      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">Recent Posts</h2>
        </div>

        {posts.length === 0 ? (
          <div className="glass-card">
            <EmptyState
              icon={<IconPen className="h-7 w-7" />}
              title="No posts yet"
              description={
                connectedCount === 0
                  ? 'Connect a social account in the section above, then create your first post.'
                  : 'Create your first AI-powered post and publish to your connected accounts.'
              }
              action={
                connectedCount > 0 ? (
                  <Link to="/posts/new" className="btn-primary !text-sm">
                    Create your first post
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { useState } from 'react';
import { usePosts } from '../../hooks/usePosts';
import { useToastStore } from '../../store/toastStore';
import type { Post } from '../../types/post';

interface PostCardProps {
  post: Post;
}

const statusStyles = {
  draft: 'badge border-slate-500/30 bg-slate-500/10 text-slate-300',
  pending_approval: 'badge border-amber-500/30 bg-amber-500/10 text-amber-300',
  scheduled: 'badge border-sky-500/30 bg-sky-500/10 text-sky-300',
  published: 'badge-emerald',
  failed: 'badge border-red-500/30 bg-red-500/10 text-red-300',
};

export function PostCard({ post }: PostCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const { approvePost } = usePosts();
  const toast = useToastStore((s) => s.show);

  const handleApprove = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await approvePost(post.id, []);
      toast('Post approved and published', 'success');
      window.location.reload();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Approval failed';
      toast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="glass-card-interactive group">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`${statusStyles[post.status]} capitalize`}>{post.status.replace('_', ' ')}</span>
        <time className="text-xs text-slate-500">
          {new Date(post.created_at).toLocaleDateString()}
        </time>
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-slate-300 transition-colors group-hover:text-slate-200">
        {post.content || '(empty draft)'}
      </p>
      {post.status === 'pending_approval' && (
        <button
          onClick={handleApprove}
          disabled={submitting}
          className="mt-4 btn-primary !text-sm"
        >
          {submitting ? 'Approving…' : 'Approve Post'}
        </button>
      )}
      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </article>
  );
}

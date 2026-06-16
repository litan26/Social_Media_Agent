import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '../../hooks/usePosts';
import { usePostsStore } from '../../store/postsStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconCalendar } from '../../components/ui/Icons';

const statusBadge = {
  pending: 'badge-amber',
  published: 'badge-emerald',
  failed: 'badge border-red-500/30 bg-red-500/10 text-red-300',
};

export function ScheduledPostsPage() {
  const { scheduled, setScheduled } = usePostsStore();
  const { fetchScheduled } = usePosts();

  useEffect(() => {
    fetchScheduled().then(setScheduled).catch(console.error);
  }, [fetchScheduled, setScheduled]);

  return (
    <div>
      <PageHeader
        badge="Calendar"
        title="Scheduled Posts"
        subtitle="Upcoming publishes across your connected platforms"
      />

      {scheduled.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={<IconCalendar className="h-7 w-7" />}
            title="Nothing scheduled yet"
            description="Create a post and pick a date to queue it for automatic publishing."
            action={
              <Link to="/posts/new" className="btn-primary !text-sm">
                Schedule a post
              </Link>
            }
          />
        </div>
      ) : (
        <div className="stagger-children space-y-4">
          {scheduled.map((s) => (
            <div key={s.id} className="glass-card-interactive !p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-display font-semibold capitalize text-violet-300">
                  {s.platform}
                </span>
                <span className={`${statusBadge[s.status]} capitalize`}>{s.status}</span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-400">
                {s.content}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <IconCalendar className="h-3.5 w-3.5" />
                {new Date(s.scheduled_at).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

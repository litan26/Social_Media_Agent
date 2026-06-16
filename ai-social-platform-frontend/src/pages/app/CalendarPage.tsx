import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { usePosts } from '../../hooks/usePosts';
import { PostCalendar } from '../../components/Calendar/PostCalendar';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconCalendar } from '../../components/ui/Icons';
import { useToastStore } from '../../store/toastStore';
import type { CalendarPost } from '../../types/calendar';

export function CalendarPage() {
  const { fetchCalendar, reschedulePost } = usePosts();
  const toast = useToastStore((s) => s.show);
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCalendar();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!axios.isAxiosError(err) || !err.response) {
        toast('Cannot reach the server. Is the backend running on port 3000?', 'error');
      } else if (err.response.status === 401) {
        toast('Please sign in again', 'error');
      } else {
        const msg = (err.response.data as { error?: string })?.error || 'Could not load calendar';
        toast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchCalendar, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReschedule = async (scheduledPostId: number, newDate: Date) => {
    try {
      await reschedulePost(scheduledPostId, newDate);
      toast('Post rescheduled', 'success');
      await load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Reschedule failed', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        badge="Calendar"
        title="Content calendar"
        subtitle="Monthly and weekly view — drag scheduled posts to reschedule"
      />

      {loading ? (
        <div className="glass-card skeleton-shimmer h-64 rounded-xl" />
      ) : posts.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={<IconCalendar className="h-7 w-7" />}
            title="No scheduled or published posts"
            description="Create a post and schedule it to see it on the calendar."
            action={
              <Link to="/posts/new" className="btn-primary !text-sm">
                Create post
              </Link>
            }
          />
        </div>
      ) : (
        <div className="glass-card">
          <PostCalendar posts={posts} onReschedule={handleReschedule} />
        </div>
      )}
    </div>
  );
}

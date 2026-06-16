import { useMemo, useState } from 'react';
import type { CalendarPost } from '../../types/calendar';

interface PostCalendarProps {
  posts: CalendarPost[];
  onReschedule: (scheduledPostId: number, newDate: Date) => Promise<void>;
}

type ViewMode = 'month' | 'week';

function startOfWeek(d: Date): Date {
  const day = new Date(d);
  const diff = day.getDay();
  day.setDate(day.getDate() - diff);
  day.setHours(0, 0, 0, 0);
  return day;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventDate(post: CalendarPost): Date | null {
  if (post.scheduled_at) return new Date(post.scheduled_at);
  if (post.published_at) return new Date(post.published_at);
  return null;
}

export function PostCalendar({ posts, onReschedule }: PostCalendarProps) {
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [dragId, setDragId] = useState<number | null>(null);

  const events = useMemo(
    () =>
      posts
        .filter((p) => eventDate(p))
        .map((p) => ({ post: p, at: eventDate(p)! })),
    [posts]
  );

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const shift = (dir: -1 | 1) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCursor(d);
  };

  const handleDropOnDay = async (day: Date) => {
    if (dragId == null) return;
    const item = posts.find((p) => p.scheduled_post_id === dragId);
    if (!item?.scheduled_post_id || item.status !== 'scheduled') return;

    const existing = item.scheduled_at ? new Date(item.scheduled_at) : new Date();
    const next = new Date(day);
    next.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
    await onReschedule(item.scheduled_post_id, next);
    setDragId(null);
  };

  const renderEvent = (post: CalendarPost, at: Date) => {
    const draggable = post.status === 'scheduled' && post.scheduled_post_id;
    return (
      <div
        key={`${post.id}-${post.scheduled_post_id ?? 'pub'}`}
        draggable={!!draggable}
        onDragStart={() => draggable && setDragId(post.scheduled_post_id!)}
        onDragEnd={() => setDragId(null)}
        className={`mb-1 rounded-lg border px-2 py-1 text-xs ${
          post.status === 'published'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            : 'border-violet-500/30 bg-violet-500/10 text-violet-200 cursor-grab active:cursor-grabbing'
        }`}
        title={post.content}
      >
        <span className="font-medium capitalize">{post.schedule_platform || post.platform}</span>
        <span className="ml-1 text-slate-400">
          {at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </span>
        <p className="line-clamp-1 text-slate-400">{post.content}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shift(-1)} className="btn-ghost !px-2">
            ‹
          </button>
          <h2 className="font-display text-lg font-semibold text-white">
            {view === 'month'
              ? cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
              : `Week of ${weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
          </h2>
          <button type="button" onClick={() => shift(1)} className="btn-ghost !px-2">
            ›
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('month')}
            className={view === 'month' ? 'btn-primary !py-1.5 !text-xs' : 'btn-secondary !py-1.5 !text-xs'}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={view === 'week' ? 'btn-primary !py-1.5 !text-xs' : 'btn-secondary !py-1.5 !text-xs'}
          >
            Week
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-slate-500">
              {d}
            </div>
          ))}
          {monthDays.map((day) => {
            const dayEvents = events.filter((e) => sameDay(e.at, day));
            const inMonth = day.getMonth() === cursor.getMonth();
            return (
              <div
                key={day.toISOString()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void handleDropOnDay(day)}
                className={`min-h-[88px] rounded-xl border p-2 ${
                  inMonth
                    ? 'border-white/[0.06] bg-white/[0.02]'
                    : 'border-transparent bg-white/[0.01] opacity-50'
                }`}
              >
                <p className="mb-1 text-xs text-slate-500">{day.getDate()}</p>
                {dayEvents.map((e) => renderEvent(e.post, e.at))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayEvents = events.filter((e) => sameDay(e.at, day));
            return (
              <div
                key={day.toISOString()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void handleDropOnDay(day)}
                className="min-h-[120px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <p className="mb-2 text-sm font-medium text-slate-400">
                  {day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                </p>
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-slate-600">No posts</p>
                ) : (
                  dayEvents.map((e) => renderEvent(e.post, e.at))
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-600">
        Drag scheduled posts to another day to reschedule. Requires Redis for job updates.
      </p>
    </div>
  );
}

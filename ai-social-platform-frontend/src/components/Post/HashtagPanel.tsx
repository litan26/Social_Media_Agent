interface HashtagPanelProps {
  tags: string[];
  onInsert: (tag: string) => void;
}

function normalizeTag(tag: string): string {
  const t = tag.trim().replace(/^#/, '');
  return t ? `#${t}` : '';
}

export function HashtagPanel({ tags, onInsert }: HashtagPanelProps) {
  const unique = [...new Set(tags.map(normalizeTag).filter(Boolean))];

  if (unique.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-sm font-medium text-slate-400">Hashtag suggestions</p>
        <p className="mt-1 text-xs text-slate-600">
          Publish posts to build analytics — top hashtags will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-sm font-medium text-slate-400">Hashtag suggestions</p>
      <p className="mt-1 mb-3 text-xs text-slate-600">Click to append to your post</p>
      <div className="flex flex-wrap gap-2">
        {unique.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onInsert(tag)}
            className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

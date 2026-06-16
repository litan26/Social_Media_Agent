import { useRef, useState } from 'react';
import { CharCounter, clampToCharLimit, isOverCharLimit } from './CharCounter';
import { HashtagPanel } from './HashtagPanel';
import { MediaService } from '../../services/media';

interface PostEditorProps {
  content: string;
  onChange: (value: string) => void;
  platforms: string[];
  postId: number | null;
  hashtagSuggestions: string[];
  mediaUrls?: string[];
  onMediaUploaded?: (urls: string[]) => void;
}

export function PostEditor({
  content,
  onChange,
  platforms,
  postId,
  hashtagSuggestions,
  mediaUrls = [],
  onMediaUploaded,
}: PostEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const handleChange = (value: string) => {
    onChange(clampToCharLimit(value, platforms));
  };

  const insertHashtag = (tag: string) => {
    const spacer = content.length && !content.endsWith(' ') ? ' ' : '';
    handleChange(`${content}${spacer}${tag}`);
  };

  const handleFile = async (file: File) => {
    if (!postId) {
      setUploadError('Save a draft first by generating variants');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const urls = await MediaService.uploadToPost(postId, file);
      onMediaUploaded?.(urls);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card space-y-3">
        <label className="block text-sm font-medium text-slate-400">Edit content</label>
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          rows={8}
          className={`input-premium resize-none ${
            isOverCharLimit(content, platforms) ? 'border-red-500/50' : ''
          }`}
        />
        <CharCounter value={content} platforms={platforms} />
      </div>

      <HashtagPanel tags={hashtagSuggestions} onInsert={insertHashtag} />

      <div className="glass-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-400">Media</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={!postId || uploading}
            onClick={() => fileRef.current?.click()}
            className="btn-secondary !py-2 !text-sm"
          >
            {uploading ? 'Uploading...' : 'Upload image / video'}
          </button>
        </div>
        {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
        {mediaUrls.length > 0 && (
          <ul className="space-y-1 text-xs text-slate-500">
            {mediaUrls.map((url) => (
              <li key={url} className="truncate">
                {url}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

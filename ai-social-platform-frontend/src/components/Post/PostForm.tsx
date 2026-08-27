import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformSelector } from '../Social/PlatformSelector';
import { usePosts } from '../../hooks/usePosts';
import { useGenerateStream } from '../../hooks/useGenerateStream';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { attachMediaUrl, uploadBrandLogo, uploadPostMedia } from '../../services/mediaApi';
import { fetchTrends } from '../../services/trendsApi';
import { generateCreativeImage } from '../../services/creativeApi';
import { ensureNotifyPermission, notify } from '../../utils/browserNotify';

const CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  instagram: 2200,
  linkedin: 3000,
  facebook: 63206,
  tiktok: 2200,
  pinterest: 500,
  youtube: 5000,
};

function CharBadge({ content, platforms }: { content: string; platforms: string[] }) {
  const len = content.length;
  const limits = platforms.map((p) => ({ p, limit: CHAR_LIMITS[p] ?? 280 }));
  const tightest = limits.reduce((a, b) => (a.limit < b.limit ? a : b), limits[0]);
  if (!tightest) return null;
  const pct = len / tightest.limit;
  const over = len > tightest.limit;
  return (
    <span className={`text-xs font-medium ${over ? 'text-red-400' : pct > 0.8 ? 'text-amber-400' : 'text-slate-500'}`}>
      {len} / {tightest.limit} ({tightest.p})
    </span>
  );
}

interface GeneratedImage {
  id: number;
  url: string;
  dataUrl: string;
  quote: string;
  createdAt: string;
  /** True once the image has been uploaded onto the post as media. */
  attached: boolean;
}

export interface ForcedSuggestion {
  topic: string;
  tone: string;
  id: number; // use Date.now() on each click so effect always fires
}

export function PostForm({
  initialTopic = '',
  suggestion,
}: {
  initialTopic?: string;
  suggestion?: ForcedSuggestion;
}) {
  const navigate = useNavigate();
  const { createDraft, updatePost, publishPost, submitForApproval, schedulePost, isLoading } = usePosts();
  const { generate, streaming } = useGenerateStream();
  const toast = useToastStore((s) => s.show);
  const { user, fetchMe } = useAuthStore();

  // Core post state
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['twitter']);
  const [postId, setPostId] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);

  // Media
  const [mediaUrls, setMediaUrls] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // Image generation runs in the background: the form stays fully usable while
  // it works, and finished images land in the "Generated" section below.
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [attachingImageId, setAttachingImageId] = useState<number | null>(null);
  const generatedSectionRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const aiPanelRef = useRef<HTMLDivElement>(null);

  // AI panel
  const [showAI, setShowAI] = useState(!!initialTopic);
  const [topic, setTopic] = useState(initialTopic);
  const [tone, setTone] = useState('professional');
  const [aiVariants, setAiVariants] = useState<{ A: string; B: string; C: string } | null>(null);
  const [activeVariant, setActiveVariant] = useState<'A' | 'B' | 'C' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [topicAutoFilled, setTopicAutoFilled] = useState(false);
  const [fetchingTrend, setFetchingTrend] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // When the parent passes a new suggestion (from the industry panel), load it
  // into the AI panel *and* the main composer, so the click visibly changes the
  // main panel rather than only a collapsed sidebar field.
  useEffect(() => {
    if (!suggestion) return;
    setTopic(suggestion.topic);
    setTone(suggestion.tone);
    setShowAI(true);
    setAiVariants(null);
    setActiveVariant(null);
    setTopicAutoFilled(false);
    // Only seed the composer when the user hasn't written anything yet —
    // never clobber text they typed.
    setContent((prev) => (prev.trim() ? prev : suggestion.topic));
    aiPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [suggestion?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening the AI panel with no topic yet — auto-fill from the latest trending topic
  useEffect(() => {
    if (!showAI || topic.trim() || suggestion) return;
    let cancelled = false;
    setFetchingTrend(true);
    fetchTrends()
      .then((res) => {
        if (cancelled) return;
        const top = res.trends?.[0];
        if (top) {
          setTopic(top.tag.replace(/^#/, ''));
          setTopicAutoFilled(true);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setFetchingTrend(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAI]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setAiVariants(null);

    try {
      const data = await generate(topic, platforms, tone);
      if (!data) return;
      setAiVariants({ A: data.variants.variantA, B: data.variants.variantB, C: data.variants.variantC });
      setPostId(data.postId);
      toast('Captions ready — pick one to continue', 'success');
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const ensureSaved = async (contentOverride?: string) => {
    const finalContent = contentOverride ?? content;
    if (postId) {
      await updatePost(postId, finalContent, activeVariant || undefined, activeVariant ? finalContent : undefined);
      return postId;
    }
    const data = await createDraft(finalContent, platforms);
    setPostId(data.postId);
    return data.postId;
  };

  const pickVariant = (key: 'A' | 'B' | 'C') => {
    if (!aiVariants) return;
    setContent(aiVariants[key]);
    setActiveVariant(key);
    setShowAI(false);
  };

  const handleMediaFile = async (file: File, kind: 'image' | 'video') => {
    setUploadingMedia(true);
    try {
      const id = postId ?? (await ensureSaved());
      const url = await uploadPostMedia(id, file);
      setMediaUrls((prev) => [...prev, { url, type: kind }]);
      toast(`${kind === 'image' ? 'Image' : 'Video'} uploaded`, 'success');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast(msg || `Failed to upload ${kind}`, 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleLogoFile = async (file: File) => {
    setUploadingLogo(true);
    try {
      await uploadBrandLogo(file);
      await fetchMe();
      toast('Brand logo saved — it will be reused on future posts', 'success');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast(msg || 'Failed to upload logo', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleGenerateImage = async () => {
    const quoteText = content.trim() || topic.trim();
    if (!quoteText) {
      toast('Add content or a topic before generating an image', 'error');
      return;
    }

    // Ask up front, while the click is still a user gesture — browsers reject
    // permission prompts that come back after an await chain.
    void ensureNotifyPermission();

    setGeneratingImage(true);
    toast('Generating your image — keep working, we’ll notify you when it’s ready', 'success');

    try {
      const result = await generateCreativeImage(quoteText, tone);

      setGeneratedImages((prev) => [
        { ...result, attached: false },
        ...prev,
      ]);

      notify('Your AI image is ready', {
        body: result.quote ? `“${result.quote}”` : 'Tap to view it in your post composer.',
        image: result.url,
        icon: result.url,
        tag: `creative-image-${result.id}`,
        onClick: () =>
          generatedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      });

      toast('AI image ready — see the Generated section below', 'success');
      generatedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      const text = msg || (e instanceof Error ? e.message : 'Image generation failed');
      toast(text, 'error');
      notify('Image generation failed', { body: text, tag: 'creative-image-error' });
    } finally {
      setGeneratingImage(false);
    }
  };

  /** Attach a generated image to the post as media. */
  const handleAttachGenerated = async (image: GeneratedImage) => {
    setAttachingImageId(image.id);
    try {
      const id = postId ?? (await ensureSaved(image.quote || content.trim() || topic.trim()));
      // The creative endpoint already persisted this image server-side, so we
      // just point the post at that stored URL — re-uploading it through the
      // presign flow would need R2 and would duplicate the same bytes.
      await attachMediaUrl(id, image.url);
      setMediaUrls((prev) => [...prev, { url: image.dataUrl || image.url, type: 'image' }]);
      setGeneratedImages((prev) =>
        prev.map((g) => (g.id === image.id ? { ...g, attached: true } : g)),
      );
      toast('Image attached to your post', 'success');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast(msg || 'Failed to attach image', 'error');
    } finally {
      setAttachingImageId(null);
    }
  };

  const discardGenerated = (id: number) => {
    setGeneratedImages((prev) => prev.filter((g) => g.id !== id));
  };

  const removeMedia = (idx: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      await ensureSaved();
      toast('Draft saved', 'success');
    } catch { toast('Save failed', 'error'); }
  };

  const handlePublish = async () => {
    try {
      const id = await ensureSaved();
      await publishPost(id, platforms);
      toast('Published!', 'success');
      navigate('/dashboard');
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Publish failed', 'error');
    }
  };

  const handleApprove = async () => {
    try {
      const id = await ensureSaved();
      await submitForApproval(id);
      toast('Submitted for approval', 'success');
    } catch { toast('Submit failed', 'error'); }
  };

  const handleSchedule = async () => {
    if (!scheduledAt) { toast('Pick a date/time first', 'error'); return; }
    try {
      const id = await ensureSaved();
      await schedulePost(id, platforms, new Date(scheduledAt));
      toast('Post scheduled!', 'success');
      navigate('/dashboard');
    } catch { toast('Schedule failed', 'error'); }
  };

  // Image generation is deliberately excluded: it runs in the background and
  // must not lock the composer or the publish/schedule actions.
  const busy = generating || streaming || isLoading;
  const variantLabels = { A: 'Professional', B: 'Casual', C: 'Punchy' };
  const variantColors = {
    A: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
    B: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200',
    C: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
  };

  return (
    <>
    <form
      onSubmit={(e) => e.preventDefault()}
      className="glass-card mx-auto max-w-3xl divide-y divide-white/[0.06] overflow-hidden !p-0"
    >

      {/* Platform selector */}
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Post to</p>
          <span className="ml-auto text-[11px] text-slate-600">{platforms.length} selected</span>
        </div>
        <PlatformSelector selected={platforms} onChange={setPlatforms} />
      </div>

      {/* Content editor */}
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">✍️</span>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Content</p>
          </div>
          <div className="flex items-center gap-3">
            <CharBadge content={content} platforms={platforms} />
            <button
              type="button"
              onClick={() => setShowAI((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                showAI
                  ? 'border-violet-500/40 bg-violet-500/20 text-violet-300'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-violet-500/30 hover:text-violet-300'
              }`}
            >
              <span>✦</span> Generate with AI
            </button>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your post here… or use ✦ Generate with AI to let Claude write it for you."
          rows={6}
          className="w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-slate-200 placeholder-slate-600 outline-none transition focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20"
        />
      </div>

      {/* Media: images, video, brand logo */}
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎨</span>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Media</p>
        </div>

        {/* Dropzone-style upload area */}
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              Array.from(e.target.files || []).forEach((f) => handleMediaFile(f, 'image'));
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingMedia}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-slate-400 transition-all hover:border-violet-500/40 hover:bg-violet-500/[0.06] hover:text-violet-300 disabled:opacity-40"
          >
            <span className="text-lg">🖼</span> Add Image
          </button>

          <button
            type="button"
            onClick={handleGenerateImage}
            disabled={generatingImage || (!content.trim() && !topic.trim())}
            className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] px-4 py-3.5 text-sm font-semibold text-cyan-200 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/[0.12] disabled:opacity-40"
          >
            ✦ Generate AI Image
          </button>

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleMediaFile(f, 'video');
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploadingMedia}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-slate-400 transition-all hover:border-violet-500/40 hover:bg-violet-500/[0.06] hover:text-violet-300 disabled:opacity-40"
          >
            <span className="text-lg">🎬</span> Add Video
          </button>
        </div>

        {uploadingMedia && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent" />
            Uploading...
          </span>
        )}

        {/* Previews */}
        {mediaUrls.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {mediaUrls.map((m, idx) => (
              <div key={m.url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-white/10 bg-black/30 shadow-md transition-transform hover:scale-105">
                {m.type === 'image' ? (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video src={m.url} className="h-full w-full object-cover" muted />
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-[9px] font-medium uppercase text-slate-300">
                  {m.type}
                </span>
                <button
                  type="button"
                  onClick={() => removeMedia(idx)}
                  className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white group-hover:flex"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Generated — AI images land here as soon as they finish */}
        {generatedImages.length > 0 && (
          <div
            ref={generatedSectionRef}
            className="space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">✦</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/80">
                Generated
              </p>
              <span className="text-xs text-slate-500">
                {generatedImages.length} image{generatedImages.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {generatedImages.map((img) => (
                <div
                  key={img.id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-black/30"
                >
                  {/* Prefer the inline data URL: the stored `url` is built from
                      the backend's public API_URL, which isn't reachable in
                      every environment (e.g. a local run with no tunnel up). */}
                  <button
                    type="button"
                    onClick={() => setViewingImage(img.dataUrl || img.url)}
                    className="block w-full"
                  >
                    <img
                      src={img.dataUrl || img.url}
                      alt={img.quote || 'Generated image'}
                      className="h-40 w-full object-cover transition-transform hover:scale-[1.02]"
                    />
                  </button>

                  <div className="space-y-2 p-3">
                    {img.quote && (
                      <p className="line-clamp-2 text-xs italic leading-relaxed text-slate-400">
                        “{img.quote}”
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAttachGenerated(img)}
                        disabled={img.attached || attachingImageId === img.id}
                        className="flex-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-40"
                      >
                        {img.attached
                          ? '✓ Attached'
                          : attachingImageId === img.id
                            ? 'Attaching…'
                            : 'Attach to post'}
                      </button>
                      <a
                        href={img.dataUrl || img.url}
                        download={`ai-image-${img.id}.png`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-200"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => discardGenerated(img.id)}
                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-500 transition hover:text-red-300"
                        aria-label="Discard generated image"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Brand logo */}
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleLogoFile(f);
              e.target.value = '';
            }}
          />
          {user?.logo_url ? (
            <img src={user.logo_url} alt="Brand logo" className="h-10 w-10 rounded-lg border border-white/10 object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/15 text-slate-600">
              🏷
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-300">Brand logo</p>
            <p className="text-[11px] text-slate-500">
              {user?.logo_url ? '✓ Saved — reused automatically on every post' : 'Set once, applies to all future posts'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-violet-500/30 hover:text-violet-300 disabled:opacity-40"
          >
            {uploadingLogo ? 'Uploading…' : user?.logo_url ? 'Change' : 'Upload'}
          </button>
        </div>
      </div>

      {/* AI generation panel */}
      {showAI && (
        <div ref={aiPanelRef} className="animate-fade-in-up space-y-5 bg-violet-500/[0.03] p-5">
          <div className="flex items-center gap-2">
            <span className="text-sm">✦</span>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">AI Generation</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-400">Topic or idea</label>
                {fetchingTrend && (
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="h-2.5 w-2.5 animate-spin rounded-full border border-violet-400 border-t-transparent" />
                    Finding a trending topic…
                  </span>
                )}
                {!fetchingTrend && topicAutoFilled && (
                  <span className="text-[11px] font-medium text-violet-400"># Auto-filled from trending</span>
                )}
              </div>
              <input
                value={topic}
                onChange={(e) => { setTopic(e.target.value); setTopicAutoFilled(false); }}
                placeholder="e.g. Product launch, industry insight, customer story…"
                className="input-premium"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-400">Tone</label>
              <select className="select-premium" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="bold">Bold &amp; punchy</option>
              </select>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-3">
              <span className="text-sm">✦</span>
              <p className="text-[11px] leading-relaxed text-violet-300/80">
                The AI automatically expands your topic into a unique angle for each variant — no keywords needed.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!topic.trim() || busy}
            className="btn-primary flex items-center gap-2 !py-2.5"
          >
            {generating || streaming ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating captions…
              </>
            ) : (
              <>✦ Generate captions</>
            )}
          </button>

          {/* Variant picker */}
          {aiVariants && (
            <div className="grid gap-3 sm:grid-cols-3">
              {(['A', 'B', 'C'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => pickVariant(key)}
                  className={`rounded-xl border p-4 text-left transition-all hover:scale-[1.02] ${variantColors[key]} ${
                    activeVariant === key ? 'ring-2 ring-violet-400/50 ring-offset-1 ring-offset-transparent' : ''
                  }`}
                >
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider opacity-70">
                    {variantLabels[key]}
                  </p>
                  <p className="line-clamp-5 text-xs leading-relaxed opacity-90">
                    {aiVariants[key] || '…'}
                  </p>
                  <p className="mt-3 text-xs font-semibold opacity-60">
                    {activeVariant === key ? '✓ In editor' : 'Click to use →'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!content.trim() || busy}
            className="btn-ghost flex items-center gap-1.5 !py-2 !text-sm"
          >
            💾 Save Draft
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={!content.trim() || busy}
            className="btn-secondary flex items-center gap-1.5 !py-2 !text-sm"
          >
            📨 Submit for Approval
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowScheduler((v) => !v)}
              disabled={!content.trim() || busy}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-40 ${
                showScheduler
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-200'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              🗓 Schedule ▾
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!content.trim() || busy}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] hover:shadow-emerald-500/30 disabled:opacity-40 disabled:hover:scale-100"
            >
              🚀 Publish Now
            </button>
          </div>
        </div>

        {showScheduler && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="input-premium !w-auto min-w-[200px] flex-1"
            />
            <button
              type="button"
              onClick={handleSchedule}
              disabled={!scheduledAt || !content.trim() || busy}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] disabled:opacity-40"
            >
              ✓ Confirm Schedule
            </button>
          </div>
        )}
      </div>
    </form>

    {/* Full-size image lightbox */}
    {viewingImage && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
        onClick={() => setViewingImage(null)}
      >
        <div className="relative max-h-full max-w-lg" onClick={(e) => e.stopPropagation()}>
          <img src={viewingImage} alt="Media preview" className="max-h-[80vh] w-full rounded-2xl border border-white/10 object-contain shadow-2xl" />
          <button
            type="button"
            onClick={() => setViewingImage(null)}
            className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg"
          >
            ✕
          </button>
        </div>
      </div>
    )}
    </>
  );
}

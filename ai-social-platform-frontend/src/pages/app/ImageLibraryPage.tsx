import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchImageHistory,
  generateCreativeImage,
  deleteImageFromHistory,
  type CreativeImageResult,
} from '../../services/creativeApi';
import { useToastStore } from '../../store/toastStore';

export function ImageLibraryPage() {
  const navigate = useNavigate();
  const toast = useToastStore((s) => s.show);

  const [images, setImages] = useState<CreativeImageResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingImage, setViewingImage] = useState<CreativeImageResult | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetchImageHistory();
      setImages(res.images);
    } catch {
      toast('Failed to load image library', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast('Please provide a valid image prompt', 'error');
      return;
    }

    setGenerating(true);
    toast('Generating image... please wait a few seconds', 'success');

    try {
      const newImage = await generateCreativeImage(prompt.trim(), tone);
      setImages((prev) => [newImage, ...prev]);
      setPrompt('');
      toast('AI Image generated successfully!', 'success');
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast(msg || (e instanceof Error ? e.message : 'Unable to generate the image. Please try again.'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    setDeletingId(id);
    try {
      await deleteImageFromHistory(id);
      setImages((prev) => prev.filter((img) => img.id !== id));
      if (viewingImage?.id === id) setViewingImage(null);
      toast('Image deleted from library', 'success');
    } catch {
      toast('Failed to delete image', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUseInPost = (img: CreativeImageResult) => {
    navigate('/posts/new', { state: { attachImage: img } });
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Prompt copied to clipboard', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">AI Image Library</h1>
          <p className="text-sm text-slate-400">
            Generate, manage, and reuse persistent AI-generated media for your posts.
          </p>
        </div>
      </div>

      {/* Generator Section */}
      <div className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">✦</span>
          <h2 className="font-display text-base font-semibold text-white">
            Generate AI Image
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Image Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create (e.g. A cinematic underwater city of the future, with glowing glass skyscrapers beneath the ocean, schools of bioluminescent fish...)"
              rows={3}
              className="w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-400">Visual Tone:</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="select-premium !py-1.5 !text-xs"
              >
                <option value="professional">Professional / Photorealistic</option>
                <option value="casual">Casual / Warm Lifestyle</option>
                <option value="bold">Bold &amp; Cinematic</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="btn-primary flex items-center gap-2 !bg-gradient-to-r !from-cyan-600 !to-blue-600 !py-2.5 !text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-40"
            >
              {generating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating image...
                </>
              ) : (
                <>✦ Generate AI Image</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">Your Generated Images</h2>
          <span className="text-xs text-slate-400">
            {images.length} item{images.length === 1 ? '' : 's'} stored
          </span>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-64 rounded-2xl" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-12 text-center">
            <span className="mx-auto block text-4xl">🎨</span>
            <h3 className="mt-3 font-display text-base font-semibold text-white">No images generated yet</h3>
            <p className="mt-1 text-sm text-slate-400">
              Enter an image prompt above to generate your first AI visual asset.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-all hover:border-cyan-500/30 hover:bg-white/[0.04]"
              >
                <div>
                  <div
                    className="relative aspect-square cursor-pointer overflow-hidden bg-black/40"
                    onClick={() => setViewingImage(img)}
                  >
                    <img
                      src={img.dataUrl || img.url}
                      alt={img.prompt || img.quote}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 flex items-end p-3">
                      <span className="text-xs font-semibold text-white">Click to view full image</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="line-clamp-3 text-xs leading-relaxed text-slate-300">
                      {img.prompt || img.quote}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {new Date(img.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] p-3">
                  <button
                    type="button"
                    onClick={() => handleUseInPost(img)}
                    className="flex-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                  >
                    Use in Post
                  </button>
                  <button
                    type="button"
                    onClick={() => copyPrompt(img.prompt || img.quote)}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 transition hover:text-slate-200"
                    title="Copy Prompt"
                  >
                    Copy Prompt
                  </button>
                  <a
                    href={img.dataUrl || img.url}
                    download={`ai-image-${img.id}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 transition hover:text-slate-200"
                    title="Download Image"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(img.id)}
                    disabled={deletingId === img.id}
                    className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-slate-500 transition hover:text-red-400 disabled:opacity-40"
                    title="Delete Image"
                  >
                    {deletingId === img.id ? '…' : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-md"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewingImage.dataUrl || viewingImage.url}
              alt={viewingImage.prompt || viewingImage.quote}
              className="max-h-[65vh] w-full rounded-xl object-contain"
            />
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Prompt:</p>
              <p className="max-h-24 overflow-y-auto text-sm text-slate-200 leading-relaxed">
                {viewingImage.prompt || viewingImage.quote}
              </p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Generated {new Date(viewingImage.createdAt).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleUseInPost(viewingImage);
                      setViewingImage(null);
                    }}
                    className="btn-primary !py-1.5 !text-xs"
                  >
                    Use in Post
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingImage(null)}
                    className="btn-ghost !py-1.5 !text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

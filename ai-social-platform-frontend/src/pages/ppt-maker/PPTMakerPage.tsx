import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PptService } from '../../services/ppt.service';
import type { Presentation } from '../../types/presentationTypes';

export const PPTMakerPage: React.FC = () => {
  const navigate = useNavigate();
  const [topicPrompt, setTopicPrompt] = useState('');
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPresentations();
  }, []);

  const loadPresentations = async () => {
    setIsLoading(true);
    try {
      const list = await PptService.listPresentations();
      setPresentations(list || []);
    } catch (err) {
      console.error('Failed to load presentation history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicPrompt.trim()) return;
    navigate(`/ppt-maker/create?topic=${encodeURIComponent(topicPrompt)}`);
  };

  const handleConverterClick = (type: string) => {
    navigate(`/ppt-maker/create?type=${type}`);
  };

  const handleOpen = (id: number) => {
    navigate(`/ppt-maker/editor/${id}`);
  };

  const handleDuplicate = async (id: number) => {
    try {
      await PptService.duplicatePresentation(id);
      loadPresentations();
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await PptService.deletePresentation(id);
      setPresentations(presentations.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 space-y-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-900/30 via-slate-900 to-fuchsia-900/20 p-8 lg:p-12 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="inline-flex items-center space-x-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-300">
            <span>✨ AI PPT Maker</span>
          </span>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Create presentations in minutes with AI.
          </h1>
          <p className="text-base lg:text-lg text-slate-300 leading-relaxed">
            Turn ideas, documents, spreadsheets and images into beautiful, editable presentations with AI.
          </p>
        </div>
      </div>

      {/* Main Creation Card Section: "Create anything into a presentation" */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white">Create anything into a presentation</h2>
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 lg:p-8 shadow-xl backdrop-blur-xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-violet-300">AI Presentation Maker</h3>
            <p className="text-xs text-slate-400">What do you want to create?</p>
          </div>

          <form onSubmit={handleCreatePromptSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={topicPrompt}
              onChange={(e) => setTopicPrompt(e.target.value)}
              placeholder="e.g. Create a presentation about the future of AI in healthcare."
              className="flex-1 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-5 py-4 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            <button
              type="submit"
              className="w-full sm:w-auto shrink-0 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-fuchsia-500 transition-all"
            >
              Generate Presentation →
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Supported inputs:</span>
            <span className="rounded-lg bg-white/5 px-2.5 py-1">PDF</span>
            <span className="rounded-lg bg-white/5 px-2.5 py-1">DOCX</span>
            <span className="rounded-lg bg-white/5 px-2.5 py-1">XLSX</span>
            <span className="rounded-lg bg-white/5 px-2.5 py-1">TXT</span>
            <span className="rounded-lg bg-white/5 px-2.5 py-1">PNG/JPG</span>
          </div>
        </div>
      </section>

      {/* Convert Hub: "Convert anything into a presentation" */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white">Convert anything into a presentation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { id: 'pdf', title: 'PDF → PPT', desc: 'Turn documents into presentations with AI.', icon: '📄' },
            { id: 'word', title: 'Word → PPT', desc: 'Convert Word documents into structured slides.', icon: '📝' },
            { id: 'excel', title: 'Excel → PPT', desc: 'Turn spreadsheets and data into visual presentations.', icon: '📊' },
            { id: 'text', title: 'Text → PPT', desc: 'Turn ideas and text into presentation slides.', icon: '✍️' },
            { id: 'image', title: 'Image → PPT', desc: 'Extract content from images and create editable slides.', icon: '🖼️' },
            { id: 'png', title: 'PNG → PPT', desc: 'Convert image content into presentation slides.', icon: '🎨' },
          ].map((card) => (
            <div
              key={card.id}
              onClick={() => handleConverterClick(card.id)}
              className="group cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-violet-500/50 hover:bg-violet-600/10 hover:shadow-xl hover:shadow-violet-500/10"
            >
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{card.icon}</span>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors">{card.title}</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Presentations Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">My Presentations</h2>
          <button
            type="button"
            onClick={() => navigate('/ppt-maker/history')}
            className="text-xs font-semibold text-violet-400 hover:text-violet-300"
          >
            View All →
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          </div>
        ) : presentations.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-sm font-semibold text-slate-400">No presentations generated yet.</p>
            <button
              type="button"
              onClick={() => navigate('/ppt-maker/create')}
              className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              Create First Presentation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {presentations.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900 p-5 transition-all hover:border-violet-500/40 hover:bg-slate-800/80 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 uppercase">{p.industry}</span>
                    <span>{p.slide_count || 0} Slides</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-white group-hover:text-violet-300 line-clamp-2">{p.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString()}</p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={() => handleOpen(p.id)}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-500"
                  >
                    Open Studio
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      title="Duplicate"
                      onClick={() => handleDuplicate(p.id)}
                      className="rounded p-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => handleDelete(p.id)}
                      className="rounded p-1.5 text-xs text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

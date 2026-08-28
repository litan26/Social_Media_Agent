import React from 'react';
import type { ColorTheme, SlideItem } from '../../types/presentationTypes';
import { usePPTStore } from '../../store/pptStore';

interface SlideCanvasProps {
  slide: SlideItem;
  theme: ColorTheme;
  ratio?: string;
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({ slide, theme, ratio = '16:9' }) => {
  const { updateSlideContent, activeSlideIndex, generateImageForSlide } = usePPTStore();
  const [imagePrompt, setImagePrompt] = React.useState('');
  const [isPromptOpen, setIsPromptOpen] = React.useState(false);

  const primaryColor = theme.primary || '#0F766E';
  const secondaryColor = theme.secondary || '#14B8A6';
  const accentColor = theme.accent || '#F59E0B';
  const bgColor = theme.bg || '#F8FAFC';
  const textColor = theme.text || '#0F172A';

  const handleTitleChange = (val: string) => {
    updateSlideContent(activeSlideIndex, { title: val });
  };

  const handleSubtitleChange = (val: string) => {
    updateSlideContent(activeSlideIndex, { subtitle: val });
  };

  const handleBulletChange = (bulletIdx: number, val: string) => {
    const bullets = [...(slide.content?.bulletPoints || [])];
    bullets[bulletIdx] = val;
    updateSlideContent(activeSlideIndex, {
      content: { ...slide.content, bulletPoints: bullets },
    });
  };

  const handleGenerateImageSubmit = async () => {
    if (!imagePrompt.trim()) return;
    await generateImageForSlide(activeSlideIndex, imagePrompt);
    setIsPromptOpen(false);
    setImagePrompt('');
  };

  return (
    <div className="relative mx-auto flex w-full max-w-5xl items-center justify-center p-4">
      <div
        id={`slide-canvas-${slide.position}`}
        className="relative flex w-full flex-col justify-between overflow-hidden rounded-2xl p-10 shadow-2xl transition-all duration-300"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          aspectRatio: ratio === '4:3' ? '4/3' : ratio === '1:1' ? '1/1' : '16/9',
          minHeight: '480px',
        }}
      >
        {/* Top Decorative Color Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: primaryColor }} />

        {/* LAYOUT: Title Slide */}
        {slide.layout === 'title' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <input
              type="text"
              value={slide.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Presentation Title"
              className="w-full bg-transparent text-center font-extrabold tracking-tight text-4xl sm:text-5xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded-lg p-2"
              style={{ color: primaryColor }}
            />
            <textarea
              rows={2}
              value={slide.subtitle || ''}
              onChange={(e) => handleSubtitleChange(e.target.value)}
              placeholder="Subtitle or Presenter Name"
              className="mt-4 w-full resize-none bg-transparent text-center font-medium text-xl sm:text-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded-lg p-2"
              style={{ color: secondaryColor }}
            />
          </div>
        )}

        {/* LAYOUT: Thank You Slide */}
        {slide.layout === 'thank_you' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <input
              type="text"
              value={slide.title || 'Thank You!'}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-transparent text-center font-black tracking-tight text-5xl focus:outline-none"
              style={{ color: primaryColor }}
            />
            <input
              type="text"
              value={slide.subtitle || 'Q & A / Contact Information'}
              onChange={(e) => handleSubtitleChange(e.target.value)}
              className="mt-4 w-full bg-transparent text-center font-medium text-xl focus:outline-none"
              style={{ color: secondaryColor }}
            />
          </div>
        )}

        {/* STANDARD LAYOUTS */}
        {slide.layout !== 'title' && slide.layout !== 'thank_you' && (
          <div className="flex flex-1 flex-col">
            {/* Header Title & Subtitle */}
            <div className="mb-6">
              <input
                type="text"
                value={slide.title || ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Slide Title"
                className="w-full bg-transparent text-2xl font-bold tracking-tight sm:text-3xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded-lg p-1"
                style={{ color: primaryColor }}
              />
              {slide.subtitle && (
                <input
                  type="text"
                  value={slide.subtitle || ''}
                  onChange={(e) => handleSubtitleChange(e.target.value)}
                  className="mt-1 w-full bg-transparent text-sm font-medium focus:outline-none"
                  style={{ color: secondaryColor }}
                />
              )}
            </div>

            {/* Main Content Area */}
            <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-12">
              {/* Left Column Text / Bullets */}
              <div className={`${slide.visuals?.image?.url ? 'md:col-span-7' : 'md:col-span-12'} space-y-4`}>
                {slide.content?.bulletPoints && slide.content.bulletPoints.length > 0 && (
                  <ul className="space-y-3">
                    {slide.content.bulletPoints.map((pt, idx) => (
                      <li key={idx} className="flex items-start space-x-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
                        <textarea
                          rows={2}
                          value={pt}
                          onChange={(e) => handleBulletChange(idx, e.target.value)}
                          className="w-full resize-none bg-transparent text-sm font-medium leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500/40 rounded p-1"
                          style={{ color: textColor }}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {/* Key Metrics Cards if layout is stats */}
                {slide.content?.keyMetrics && slide.content.keyMetrics.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {slide.content.keyMetrics.map((m, i) => (
                      <div key={i} className="rounded-xl border p-4 shadow-sm" style={{ borderColor: primaryColor + '40', backgroundColor: '#FFFFFF' }}>
                        <p className="text-2xl font-black" style={{ color: primaryColor }}>
                          {m.value}
                        </p>
                        <p className="mt-1 text-xs font-semibold" style={{ color: textColor }}>
                          {m.label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Table if present */}
                {slide.visuals?.table && (
                  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#CBD5E1' }}>
                    <table className="w-full text-left text-xs">
                      <thead style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}>
                        <tr>
                          {slide.visuals.table.headers.map((h, i) => (
                            <th key={i} className="p-2.5 font-bold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {slide.visuals.table.rows?.map((row, rIdx) => (
                          <tr key={rIdx} className="border-t border-slate-200">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2.5">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right Column Visual / Image */}
              {slide.visuals?.image?.url && (
                <div className="relative flex md:col-span-5 items-center justify-center rounded-xl overflow-hidden shadow-md">
                  <img src={slide.visuals.image.url} alt={slide.visuals.image.alt || 'Slide Visual'} className="h-full w-full object-cover rounded-xl" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Slide Number */}
        <div className="mt-4 flex items-center justify-between border-t pt-3 text-[11px] font-semibold text-slate-400" style={{ borderColor: '#E2E8F0' }}>
          <span>AI PPT Studio</span>
          <span>Slide {slide.position}</span>
        </div>
      </div>

      {/* Floating Prompt button for AI image generation */}
      <div className="absolute top-6 right-6">
        <button
          type="button"
          onClick={() => setIsPromptOpen(!isPromptOpen)}
          className="rounded-full border border-violet-500/30 bg-violet-600/80 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md hover:bg-violet-500"
        >
          ✨ AI Image
        </button>

        {isPromptOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/20 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl z-20">
            <p className="text-xs font-semibold text-violet-300">Generate AI Image for Slide</p>
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe image visual..."
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-800 p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <div className="mt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsPromptOpen(false)}
                className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateImageSubmit}
                className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Generate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePPTStore } from '../../store/pptStore';
import { ColorSelector } from '../../components/ppt-maker/ColorSelector';
import { StyleSelector } from '../../components/ppt-maker/StyleSelector';
import { IndustrySelector } from '../../components/ppt-maker/IndustrySelector';
import { RatioSelector } from '../../components/ppt-maker/RatioSelector';
import { GenerationProgress } from '../../components/ppt-maker/GenerationProgress';

export const PPTCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    creationParams,
    setCreationParams,
    generatePresentation,
    isGenerating,
    generationStep,
    generationProgressText,
    error,
  } = usePPTStore();

  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const topicFromUrl = searchParams.get('topic');
    if (topicFromUrl) {
      setCreationParams({ topic: topicFromUrl });
    }
  }, [searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setCreationParams({ file: f });
    }
  };

  const handleGenerate = async () => {
    const presId = await generatePresentation();
    if (presId) {
      navigate(`/ppt-maker/editor/${presId}`);
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <GenerationProgress currentStep={generationStep} progressText={generationProgressText} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 space-y-8">
      {/* Top Wizard Steps Header */}
      <div className="mx-auto max-w-4xl border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Create Presentation Wizard</h1>
          <p className="text-xs text-slate-400">Step {step} of 3</p>
        </div>

        <div className="flex items-center space-x-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                step === s ? 'bg-violet-600 text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'
              }`}
            >
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* STEP 1: THINK OF YOUR TOPIC */}
      {step === 1 && (
        <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur-xl">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400">STEP 1</span>
            <h2 className="text-2xl font-bold text-white">Think of your topic</h2>
            <p className="text-xs text-slate-400">Type a detailed prompt or upload source content files.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">What do you want to create?</label>
            <textarea
              rows={4}
              value={creationParams.topic}
              onChange={(e) => setCreationParams({ topic: e.target.value })}
              placeholder="e.g. Create a presentation about the future of AI in healthcare, focusing on clinical diagnostics, patient outcomes, and ethical safeguards."
              className="w-full rounded-2xl border border-white/10 bg-slate-800/80 p-4 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          {/* File Upload Zone */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Or Upload Source Document / Data / Image</label>
            <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-6 transition-all hover:border-violet-500/50">
              <span className="text-3xl">📁</span>
              <p className="mt-2 text-xs font-semibold text-slate-300">
                {selectedFile ? selectedFile.name : 'Drag & drop file here or click to browse'}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Supported: PDF, DOC, DOCX, TXT, XLS, XLSX, PNG, JPG</p>
              <input type="file" onChange={handleFileChange} className="absolute inset-0 cursor-pointer opacity-0" />
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between rounded-xl bg-violet-500/10 p-3 text-xs text-violet-300">
                <span>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setCreationParams({ file: undefined });
                  }}
                  className="text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!creationParams.topic && !selectedFile}
              className="rounded-2xl bg-violet-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-500 disabled:opacity-50"
            >
              Continue to Personalize →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PERSONALIZE */}
      {step === 2 && (
        <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur-xl">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400">STEP 2</span>
            <h2 className="text-2xl font-bold text-white">Personalize</h2>
            <p className="text-xs text-slate-400">Configure presentation length, audience, tone, and language.</p>
          </div>

          {/* Presentation Length selector */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">Presentation Length</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'Short', label: 'Short', range: '7–8 Slides' },
                { id: 'Informative', label: 'Informative', range: '9–12 Slides' },
                { id: 'Detailed', label: 'Detailed', range: '12–16 Slides' },
              ].map((opt) => {
                const isSelected = creationParams.lengthCategory === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCreationParams({ lengthCategory: opt.id as any })}
                    className={`rounded-2xl border p-4 text-center transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-600/20 text-white ring-2 ring-violet-500/50'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <p className="text-sm font-bold">{opt.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{opt.range}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audience & Tone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Audience</label>
              <select
                value={creationParams.audience}
                onChange={(e) => setCreationParams({ audience: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-xs text-white focus:outline-none"
              >
                {['General Audience', 'Students', 'Customers', 'Employees', 'Investors', 'Teachers', 'Executives'].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Tone</label>
              <select
                value={creationParams.tone}
                onChange={(e) => setCreationParams({ tone: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-xs text-white focus:outline-none"
              >
                {['Professional', 'Educational', 'Creative', 'Simple', 'Persuasive', 'Formal', 'Friendly', 'Technical'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Language & Lesson Plan Preset */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Language</label>
              <select
                value={creationParams.language}
                onChange={(e) => setCreationParams({ language: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-800 p-3 text-xs text-white focus:outline-none"
              >
                {['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese'].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <input
                type="checkbox"
                id="lessonPlan"
                checked={creationParams.isLessonPlan}
                onChange={(e) => setCreationParams({ isLessonPlan: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-slate-800 text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="lessonPlan" className="cursor-pointer text-xs font-semibold text-slate-300">
                🎓 AI Lesson Plan Generator Preset
              </label>
            </div>
          </div>

          {/* Additional Instructions */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Additional Instructions (Optional)</label>
            <input
              type="text"
              value={creationParams.additionalInstructions}
              onChange={(e) => setCreationParams({ additionalInstructions: e.target.value })}
              placeholder="e.g. Keep language beginner friendly, use statistics where appropriate."
              className="w-full rounded-xl border border-white/10 bg-slate-800/80 p-3 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold text-slate-400 hover:text-white"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-2xl bg-violet-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-500"
            >
              Continue to Pick a Style →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PICK A STYLE */}
      {step === 3 && (
        <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur-xl">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400">STEP 3</span>
            <h2 className="text-2xl font-bold text-white">Pick a style</h2>
            <p className="text-xs text-slate-400">Select industry, visual category, color theme, and aspect ratio.</p>
          </div>

          <IndustrySelector
            selectedIndustry={creationParams.industry}
            onSelect={(ind) => setCreationParams({ industry: ind })}
          />

          <StyleSelector
            selectedStyle={creationParams.style}
            onSelect={(s) => setCreationParams({ style: s })}
          />

          <ColorSelector
            selectedTheme={creationParams.colorTheme}
            onSelect={(theme) => setCreationParams({ colorTheme: theme })}
          />

          <RatioSelector
            selectedRatio={creationParams.ratio}
            onSelect={(r) => setCreationParams({ ratio: r })}
          />

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold text-slate-400 hover:text-white"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 hover:from-violet-500 hover:to-fuchsia-500"
            >
              🚀 Generate Presentation Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

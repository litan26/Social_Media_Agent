import React from 'react';

interface GenerationProgressProps {
  currentStep: number;
  progressText: string;
}

const STEPS = [
  'Understanding topic & Analyzing content',
  'Creating presentation outline',
  'Writing slide content & bullet points',
  'Designing slide layouts & themes',
  'Generating visual assets & images',
  'Finalizing presentation studio',
];

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ currentStep, progressText }) => {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-violet-500/20" />
        <div className="absolute inset-2 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        <span className="text-3xl">✨</span>
      </div>

      <h3 className="mt-8 text-2xl font-bold text-white">Generating AI Presentation</h3>
      <p className="mt-2 text-sm text-violet-300 animate-pulse">{progressText}</p>

      <div className="mt-8 w-full max-w-md space-y-3">
        {STEPS.map((stepLabel, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <div
              key={stepLabel}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs transition-all ${
                isDone
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : isCurrent
                  ? 'border-violet-500/50 bg-violet-500/20 font-semibold text-white shadow-lg shadow-violet-500/10'
                  : 'border-white/5 bg-white/[0.02] text-slate-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="font-mono text-[10px]">0{idx + 1}</span>
                <span>{stepLabel}</span>
              </div>
              <div>
                {isDone ? (
                  <span className="text-emerald-400 font-bold">✓</span>
                ) : isCurrent ? (
                  <span className="inline-block h-2 w-2 animate-ping rounded-full bg-violet-400" />
                ) : (
                  <span className="text-slate-600">○</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

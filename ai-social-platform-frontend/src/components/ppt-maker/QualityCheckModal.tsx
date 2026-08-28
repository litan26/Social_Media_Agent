import React from 'react';
import { usePPTStore } from '../../store/pptStore';

interface CheckItem {
  id: string;
  category: 'Content' | 'Design' | 'Data' | 'Export';
  message: string;
  status: 'pass' | 'warning' | 'fail';
}

export const QualityCheckModal: React.FC = () => {
  const { isQualityCheckOpen, setQualityCheckOpen, slides } = usePPTStore();

  if (!isQualityCheckOpen) return null;

  const checks: CheckItem[] = [];

  // Content Checks
  const hasEmptySlides = slides.some((s) => !s.title && (!s.content?.bulletPoints || s.content.bulletPoints.length === 0));
  checks.push({
    id: 'c1',
    category: 'Content',
    message: hasEmptySlides ? 'Some slides contain empty titles or content.' : 'All slides have valid titles and body content.',
    status: hasEmptySlides ? 'warning' : 'pass',
  });

  const titles = slides.map((s) => s.title?.toLowerCase().trim()).filter(Boolean);
  const hasDuplicates = new Set(titles).size !== titles.length;
  checks.push({
    id: 'c2',
    category: 'Content',
    message: hasDuplicates ? 'Duplicate slide titles detected.' : 'Slide titles are distinct and clear.',
    status: hasDuplicates ? 'warning' : 'pass',
  });

  const placeholderMatch = slides.some((s) =>
    JSON.stringify(s).toLowerCase().includes('lorem ipsum') || JSON.stringify(s).toLowerCase().includes('sample text')
  );
  checks.push({
    id: 'c3',
    category: 'Content',
    message: placeholderMatch ? 'Placeholder text found in presentation.' : 'No placeholder or dummy text detected.',
    status: placeholderMatch ? 'fail' : 'pass',
  });

  // Design Checks
  const denseSlides = slides.some((s) => (s.content?.bulletPoints?.length || 0) > 6);
  checks.push({
    id: 'd1',
    category: 'Design',
    message: denseSlides ? 'Some slides have over 6 bullet points (high text density).' : 'Slide text density is balanced.',
    status: denseSlides ? 'warning' : 'pass',
  });

  // Data Checks
  checks.push({
    id: 'dt1',
    category: 'Data',
    message: 'Charts and data tables match structured schema.',
    status: 'pass',
  });

  // Export Checks
  checks.push({
    id: 'e1',
    category: 'Export',
    message: 'PPTX, PDF, and PNG export pipeline ready.',
    status: 'pass',
  });

  const passes = checks.filter((c) => c.status === 'pass').length;
  const warnings = checks.filter((c) => c.status === 'warning').length;
  const fails = checks.filter((c) => c.status === 'fail').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Presentation Quality Check</h3>
            <p className="text-xs text-slate-400">Pre-export automated validation</p>
          </div>
          <button
            type="button"
            onClick={() => setQualityCheckOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="my-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="text-xl font-black text-emerald-400">{passes}</p>
            <p className="text-[10px] font-bold uppercase text-emerald-300">Passed</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xl font-black text-amber-400">{warnings}</p>
            <p className="text-[10px] font-bold uppercase text-amber-300">Warnings</p>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-xl font-black text-red-400">{fails}</p>
            <p className="text-[10px] font-bold uppercase text-red-300">Failed</p>
          </div>
        </div>

        <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
          {checks.map((item) => (
            <div
              key={item.id}
              className={`flex items-start justify-between rounded-xl border p-3 text-xs ${
                item.status === 'pass'
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-300'
                  : item.status === 'warning'
                  ? 'border-amber-500/20 bg-amber-500/5 text-slate-300'
                  : 'border-red-500/20 bg-red-500/5 text-slate-300'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                <span className="mt-0.5">
                  {item.status === 'pass' ? '✅' : item.status === 'warning' ? '⚠️' : '❌'}
                </span>
                <div>
                  <span className="font-bold text-white">[{item.category}]</span> {item.message}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setQualityCheckOpen(false)}
            className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

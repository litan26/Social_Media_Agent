import React from 'react';
import { usePPTStore } from '../../store/pptStore';
import { PptService } from '../../services/ppt.service';
import { PptExportClient } from '../../utils/pptExportClient';

export const ExportModal: React.FC = () => {
  const { isExportModalOpen, setExportModalOpen, activePresentation, slides, activeSlideIndex } = usePPTStore();
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportStatus, setExportStatus] = React.useState('');

  if (!isExportModalOpen || !activePresentation) return null;

  const handlePptxDownload = () => {
    const url = PptService.getPptxExportUrl(activePresentation.id);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activePresentation.title.replace(/[^a-z0-9]/gi, '_')}.pptx`;
    link.click();
    setExportModalOpen(false);
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    setExportStatus('Rendering PDF presentation pages...');
    try {
      const slideElements: HTMLElement[] = [];
      const canvasEl = document.getElementById(`slide-canvas-${slides[activeSlideIndex]?.position}`);
      if (canvasEl) slideElements.push(canvasEl);

      await PptExportClient.exportDeckToPdf(slideElements, activePresentation.title);
      setExportModalOpen(false);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  };

  const handleSinglePngExport = async () => {
    setIsExporting(true);
    setExportStatus('Exporting current slide as PNG...');
    try {
      const current = slides[activeSlideIndex];
      const canvasEl = document.getElementById(`slide-canvas-${current?.position}`);
      if (canvasEl) {
        await PptExportClient.exportSlideToPng(canvasEl, `${activePresentation.title}_slide_${current.position}`);
      }
      setExportModalOpen(false);
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  };

  const handleAllPngZipExport = async () => {
    setIsExporting(true);
    setExportStatus('Bundling all slides into ZIP archive...');
    try {
      const slideElements: HTMLElement[] = [];
      const canvasEl = document.getElementById(`slide-canvas-${slides[activeSlideIndex]?.position}`);
      if (canvasEl) slideElements.push(canvasEl);

      await PptExportClient.exportAllSlidesToZip(slideElements, activePresentation.title);
      setExportModalOpen(false);
    } catch (err) {
      console.error('ZIP export failed:', err);
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Export Presentation</h3>
            <p className="text-xs text-slate-400">Select format to download your slides</p>
          </div>
          <button
            type="button"
            onClick={() => setExportModalOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {isExporting && (
          <div className="my-6 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            <p className="mt-2 text-xs font-semibold text-violet-300">{exportStatus}</p>
          </div>
        )}

        <div className="my-6 space-y-3">
          {/* PPTX Option */}
          <button
            type="button"
            onClick={handlePptxDownload}
            disabled={isExporting}
            className="flex w-full items-center justify-between rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 p-4 text-left transition-all hover:border-violet-500 hover:bg-violet-600/30"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="text-sm font-bold text-white">PowerPoint (.PPTX)</p>
                <p className="text-xs text-slate-400">Native editable presentation format</p>
              </div>
            </div>
            <span className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">Download</span>
          </button>

          {/* PDF Option */}
          <button
            type="button"
            onClick={handlePdfExport}
            disabled={isExporting}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="text-sm font-bold text-white">PDF Document (.PDF)</p>
                <p className="text-xs text-slate-400">High-resolution print & sharing format</p>
              </div>
            </div>
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300">Export</span>
          </button>

          {/* Single PNG Option */}
          <button
            type="button"
            onClick={handleSinglePngExport}
            disabled={isExporting}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🖼️</span>
              <div>
                <p className="text-sm font-bold text-white">Current Slide as PNG</p>
                <p className="text-xs text-slate-400">Export active slide #{slides[activeSlideIndex]?.position} as image</p>
              </div>
            </div>
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300">Export</span>
          </button>

          {/* All PNG ZIP Option */}
          <button
            type="button"
            onClick={handleAllPngZipExport}
            disabled={isExporting}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📦</span>
              <div>
                <p className="text-sm font-bold text-white">All Slides as PNG (ZIP Bundle)</p>
                <p className="text-xs text-slate-400">Download all {slides.length} slides as individual images</p>
              </div>
            </div>
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300">Download ZIP</span>
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setExportModalOpen(false)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PptService } from '../../services/ppt.service';
import type { Presentation } from '../../types/presentationTypes';

export const PPTHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const list = await PptService.listPresentations();
      setPresentations(list || []);
    } catch (err) {
      console.error('Failed to fetch presentations history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = presentations.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleOpen = (id: number) => {
    navigate(`/ppt-maker/editor/${id}`);
  };

  const handleDuplicate = async (id: number) => {
    try {
      await PptService.duplicatePresentation(id);
      fetchHistory();
    } catch (err) {
      console.error('Failed to duplicate presentation:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await PptService.deletePresentation(id);
      setPresentations(presentations.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete presentation:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Presentation Library</h1>
          <p className="text-sm text-slate-400">View, edit, duplicate, and export all saved presentations.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/ppt-maker/create')}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-500"
        >
          + New Presentation
        </button>
      </div>

      {/* Search Input */}
      <div className="w-full max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search presentations..."
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
        />
      </div>

      {/* Presentations Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-sm font-semibold text-slate-400">
          No presentations found in your history library.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/5 text-slate-400">
              <tr>
                <th className="p-4 font-bold">Presentation Title</th>
                <th className="p-4 font-bold">Industry</th>
                <th className="p-4 font-bold">Style</th>
                <th className="p-4 font-bold">Slides</th>
                <th className="p-4 font-bold">Created Date</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="p-4 font-bold text-white">{p.title}</td>
                  <td className="p-4 text-slate-300">{p.industry}</td>
                  <td className="p-4 text-slate-300">{p.style}</td>
                  <td className="p-4 font-mono font-semibold text-violet-300">{p.slide_count || 0}</td>
                  <td className="p-4 text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpen(p.id)}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 font-bold text-white hover:bg-violet-500"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(p.id)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-300 hover:bg-white/10"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-red-300 hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

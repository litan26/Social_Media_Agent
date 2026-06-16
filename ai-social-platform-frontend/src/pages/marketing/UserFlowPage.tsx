import { PageBackground } from '../../components/ui/PageBackground';

export function UserFlowPage() {
  return (
    <div className="relative min-h-screen">
      <PageBackground variant="subtle" />
      <div className="relative border-b border-white/10 bg-[#050508]/80 px-4 py-4 backdrop-blur-xl">
        <h1 className="font-display text-xl font-bold text-white">Full user flow</h1>
        <p className="text-sm text-slate-500">Interactive diagram — hover nodes for details</p>
      </div>
      <iframe
        title="AI Social Platform User Flow"
        src="/user-flow.html"
        className="relative h-[calc(100vh-80px)] w-full border-0"
      />
    </div>
  );
}

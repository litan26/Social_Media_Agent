export function PageBackground({ variant = 'default' }: { variant?: 'default' | 'subtle' }) {
  const opacity = variant === 'subtle' ? 'opacity-60' : 'opacity-100';

  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${opacity}`}>
      <div className="absolute inset-0 bg-[#050508]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="animate-float absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="animate-float-delayed absolute -right-32 top-1/3 h-[450px] w-[450px] rounded-full bg-fuchsia-600/15 blur-[120px]" />
      <div className="animate-pulse-glow absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-600/10 blur-[100px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050508]/80" />
    </div>
  );
}

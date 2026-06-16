import { PageHeader } from '../../components/ui/PageHeader';
import { ConnectAccountsPanel } from '../../components/OAuth/ConnectAccountsPanel';
import { IconGlobe } from '../../components/ui/Icons';

export function ConnectedAccountsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        badge="Integrations"
        title="Connected accounts"
        subtitle="Connect your social accounts — each user authorizes their own profiles"
      />

      <section className="glass-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="feature-card-icon !mb-0 !h-10 !w-10">
            <IconGlobe className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Social platforms</h2>
            <p className="text-sm text-slate-500">Connect each platform with live OAuth</p>
          </div>
        </div>
        <ConnectAccountsPanel showHeader={false} />
      </section>
    </div>
  );
}

import { TrendingWidget } from '../../components/Dashboard/TrendingWidget';
import { PageHeader } from '../../components/ui/PageHeader';

export function TrendingTopicsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Discover"
        title="Trending Topics"
        subtitle="Live hashtags and topics trending in your industry — click any to create a post"
      />
      <TrendingWidget />
    </div>
  );
}

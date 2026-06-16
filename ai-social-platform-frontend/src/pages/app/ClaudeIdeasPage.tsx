import { AISuggestionsWidget } from '../../components/Dashboard/AISuggestionsWidget';
import { PageHeader } from '../../components/ui/PageHeader';

export function ClaudeIdeasPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="AI"
        title="Claude Post Ideas"
        subtitle="AI-generated content ideas personalised to your industry — click any to create a post"
      />
      <AISuggestionsWidget />
    </div>
  );
}

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PostForm, type ForcedSuggestion } from '../../components/Post/PostForm';
import { IndustrySuggestionsPanel } from '../../components/Post/IndustrySuggestionsPanel';
import { PageHeader } from '../../components/ui/PageHeader';

export function NewPostPage() {
  const [params] = useSearchParams();
  const initialTopic = params.get('topic') || '';
  const initialTone  = params.get('tone')  || '';

  const [suggestion, setSuggestion] = useState<ForcedSuggestion | undefined>(
    initialTopic ? { topic: initialTopic, tone: initialTone || 'professional', id: Date.now() } : undefined
  );

  const handleSuggestionSelect = (topic: string, tone: string) => {
    setSuggestion({ topic, tone, id: Date.now() });
  };

  return (
    <div>
      <PageHeader
        badge="Create"
        title="New Post"
        subtitle="Write directly or pick an industry idea — Claude generates variants you can refine and publish"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main composer */}
        <PostForm suggestion={suggestion} />

        {/* Industry ideas sidebar */}
        <div className="lg:sticky lg:top-6">
          <IndustrySuggestionsPanel onSelect={handleSuggestionSelect} />
        </div>
      </div>
    </div>
  );
}

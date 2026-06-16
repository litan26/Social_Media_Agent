export interface CalendarPost {
  id: number;
  platform: string | null;
  content: string;
  status: 'scheduled' | 'published' | 'draft' | 'failed';
  published_at: string | null;
  scheduled_post_id: number | null;
  schedule_platform: string | null;
  scheduled_at: string | null;
  job_id: string | null;
  schedule_status: string | null;
}

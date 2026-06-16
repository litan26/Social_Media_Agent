import dotenv from 'dotenv';
import { ScheduleService } from '../src/services/schedule.service.js';

dotenv.config();

ScheduleService.getCalendarPosts(1)
  .then((rows) => {
    console.log('OK', rows.length, 'rows');
    process.exit(0);
  })
  .catch((e) => {
    console.error('FAIL', e);
    process.exit(1);
  });

export const QUEUES = {
  apsAiNotes: 'aps-ai-notes',
  apsAiExams: 'aps-ai-exams',
  samsPdfReports: 'sams-pdf-reports',
  notifications: 'notifications'
} as const;

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5_000
  },
  removeOnComplete: {
    age: 86_400,
    count: 1_000
  },
  removeOnFail: {
    age: 604_800
  }
};

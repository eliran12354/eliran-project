export type JobStatus = "queued" | "running" | "done" | "error";

export type JobRecord = {
  id: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  result?: any;
  error?: string;
};

const jobs = new Map<string, JobRecord>();

export function createJob(): JobRecord {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const job: JobRecord = { id, status: "queued", createdAt: Date.now(), updatedAt: Date.now() };
  jobs.set(id, job);
  return job;
}

export function updateJob(id: string, patch: Partial<JobRecord>) {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch, { updatedAt: Date.now() });
}

export function getJob(id: string) {
  return jobs.get(id);
}

// ניקוי ג'ובים ישנים (למשל אחרי שעה)
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.updatedAt < cutoff) jobs.delete(id);
  }
}, 10 * 60 * 1000);


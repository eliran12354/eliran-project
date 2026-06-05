import { query, queryOne } from '../config/database.js';

export type ContactSubmissionRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string;
};

export async function insertContactSubmission(input: {
  name: string;
  email: string;
  message: string;
}): Promise<{ id: string }> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO contact_submissions (name, email, message)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [input.name, input.email, input.message]
  );
  if (!row) {
    throw new Error('Insert failed');
  }
  return { id: row.id };
}

export async function listContactSubmissions(limit = 200): Promise<ContactSubmissionRow[]> {
  return query<ContactSubmissionRow>(
    `SELECT id, created_at, name, email, message
     FROM contact_submissions
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
}

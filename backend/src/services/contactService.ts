import { supabase } from '../config/database.js';

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
  const { data, error } = await supabase
    .from('contact_submissions')
    .insert({
      name: input.name,
      email: input.email,
      message: input.message,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Insert failed');
  }
  return { id: data.id as string };
}

export async function listContactSubmissions(limit = 200): Promise<ContactSubmissionRow[]> {
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('id, created_at, name, email, message')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as ContactSubmissionRow[];
}

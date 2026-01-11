// pages/api/register.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { event_id, email } = req.body;

  const { data, error } = await supabase
    .from('registrations')
    .insert({ event_id, email })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error });
  }

  res.status(200).json({ data });
}

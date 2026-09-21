'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Joke {
  id: number;
  title: string;
  description: string;
  created_at: string;
}

export default function JokesPage() {
  const [jokes, setJokes] = useState<Joke[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJokes() {
      const { data, error } = await supabase
          .from('jokes')
          .select('*');

      if (error) {
        console.error('Error fetching jokes:', error);
      } else {
        setJokes(data || []);
      }
      setLoading(false);
    }

    fetchJokes();
  }, []);

  if
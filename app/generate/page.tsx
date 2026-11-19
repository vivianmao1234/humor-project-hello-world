import { redirect } from 'next/navigation';

// The generator now lives on the home page; keep old links working.
export default function GeneratePage() {
  redirect('/');
}

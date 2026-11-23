import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from './profile-form';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single();

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-12">
      <h1 className="mb-8 font-display text-5xl text-ink">Your <span className="italic text-navy">profile</span></h1>
      <ProfileForm
        userId={user.id}
        email={user.email ?? ''}
        initialFirstName={profile?.first_name ?? ''}
        initialLastName={profile?.last_name ?? ''}
        initialAvatarUrl={profile?.avatar_url ?? ''}
      />
    </main>
  );
}

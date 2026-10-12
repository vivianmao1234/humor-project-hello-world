'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ProfileFormProps {
  userId: string;
  email: string;
  initialFirstName: string;
  initialLastName: string;
  initialAvatarUrl: string;
}

export default function ProfileForm({
  userId,
  email,
  initialFirstName,
  initialLastName,
  initialAvatarUrl,
}: ProfileFormProps) {
  const supabase = createClient();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    let newAvatarUrl = avatarUrl;

    if (file) {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setMessage(`Upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      newAvatarUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        avatar_url: newAvatarUrl,
      })
      .eq('id', userId);

    setSaving(false);

    if (error) {
      setMessage(`Save failed: ${error.message}`);
      return;
    }

    setAvatarUrl(newAvatarUrl);
    setMessage('Saved!');
  }

  return (
    <form onSubmit={handleSave} className="flex w-full max-w-sm flex-col gap-4">
      <p className="text-sm text-zinc-500">{email}</p>

      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt="Profile photo"
          className="h-24 w-24 rounded-full object-cover"
        />
      )}

      <label className="flex flex-col gap-1">
        First name
        <input
          className="rounded border px-3 py-2"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        Last name
        <input
          className="rounded border px-3 py-2"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        Photo
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-black px-5 py-2 text-white disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>

      {message && <p className="text-sm">{message}</p>}
    </form>
  );
}

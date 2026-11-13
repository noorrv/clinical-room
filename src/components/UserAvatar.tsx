import { useEffect, useState } from 'react';
import type { Profile } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { AvatarArt } from './art/Avatars';

/*
  The student's picture wherever it appears: their uploaded photo, their chosen illustrated
  avatar, or the default figure. Photos live in a private bucket, so they are shown through a
  short-lived signed link, fetched once per photo and shared by every place that shows it.
*/

const links = new Map<string, Promise<string | null>>();

/** A signed link to a photo in the avatars bucket (cached for this visit). */
export function signedAvatar(path: string): Promise<string | null> {
  let p = links.get(path);
  if (!p) {
    p = supabase.storage
      .from('avatars')
      .createSignedUrl(path, 60 * 60 * 6)
      .then(({ data }) => data?.signedUrl ?? null)
      .catch(() => null);
    links.set(path, p);
  }
  return p;
}

export function usePhoto(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setUrl(null);
    if (path) signedAvatar(path).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [path]);
  return url;
}

type Pic = Pick<Profile, 'avatar_kind' | 'avatar_preset' | 'avatar_path'> | null | undefined;

export function UserAvatar({ profile, size = 40, label }: { profile: Pic; size?: number; label?: string }) {
  const photo = usePhoto(profile?.avatar_kind === 'upload' ? profile.avatar_path : null);
  if (profile?.avatar_kind === 'upload' && photo) {
    return <img className="user-photo" src={photo} width={size} height={size} alt={label ?? ''} aria-hidden={label ? undefined : true} />;
  }
  return <AvatarArt id={profile?.avatar_kind === 'preset' ? profile.avatar_preset : null} size={size} title={label} />;
}

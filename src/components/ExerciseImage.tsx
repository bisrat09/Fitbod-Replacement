import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { ExerciseInitial } from './ExerciseInitial';
import { fetchExerciseGif, cacheExerciseGif, proxyUrl, isGifBlocked } from '@/lib/exerciseImages';
import { getExerciseInstructions, exercisePhotoUrls } from '@/lib/exerciseInstructions';

type ExerciseImageProps = {
  name: string;
  /** Pre-loaded image URL (from SQLite video_url). Skips lookup if provided. */
  imageUrl?: string | null;
  size?: number;
  /** Callback when a new image URL is resolved (so caller can persist to DB). */
  onImageFetched?: (url: string) => void;
  /** 'circle' (default) for lists; 'square' for the full-width demo. */
  shape?: 'circle' | 'square';
};

/**
 * Circle thumbnails prefer the sharp, strictly matched free-exercise-db photo;
 * otherwise the ExerciseDB GIF (unless audited as wrong); otherwise the initial.
 * The square demo shape always means the GIF (the demo cycles photos itself).
 */
export function ExerciseImage(props: ExerciseImageProps) {
  const photo = props.shape === 'square' ? null : exercisePhotoUrls(getExerciseInstructions(props.name))[0] ?? null;
  if (photo) return <ExercisePhoto name={props.name} uri={photo} size={props.size ?? 40} />;
  if (isGifBlocked(props.name)) return props.shape === 'square' ? null : <ExerciseInitial name={props.name} size={props.size ?? 40} />;
  return <ExerciseGif {...props} />;
}

function ExercisePhoto({ name, uri, size }: { name: string; uri: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <ExerciseInitial name={name} size={size} />;
  return (
    <Image
      source={{ uri }}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      onError={() => setFailed(true)}
      resizeMode="cover"
    />
  );
}

function ExerciseGif({ name, imageUrl, size = 40, onImageFetched, shape = 'circle' }: ExerciseImageProps) {
  const [url, setUrl] = useState<string | null>(imageUrl ? proxyUrl(imageUrl) : null);
  const [failed, setFailed] = useState(false);

  // Seed cache if we have a pre-loaded URL
  useEffect(() => {
    if (imageUrl) {
      const proxied = proxyUrl(imageUrl);
      console.log(`[IMG] ${name}: SQLite → ${proxied.substring(0, 60)}...`);
      cacheExerciseGif(name, imageUrl);
      setUrl(proxied);
      setFailed(false);
    }
  }, [imageUrl, name]);

  // Look up from static map if no URL
  useEffect(() => {
    if (url || imageUrl) return;
    let cancelled = false;

    fetchExerciseGif(name).then((gifUrl) => {
      if (cancelled) return;
      if (gifUrl) {
        console.log(`[IMG] ${name}: map → ${gifUrl.substring(0, 60)}...`);
        setUrl(gifUrl);
        onImageFetched?.(gifUrl);
      } else {
        console.log(`[IMG] ${name}: NO MATCH in map`);
      }
    });

    return () => { cancelled = true; };
  }, [name, url, imageUrl]);

  if (url && !failed) {
    return (
      <Image
        source={{ uri: url }}
        style={[
          shape === 'square' ? styles.square : styles.image,
          { width: size, height: size, borderRadius: shape === 'square' ? 0 : size / 2 },
        ]}
        onError={(e) => {
          console.log(`[IMG] ${name}: FAILED — ${(e.nativeEvent as any)?.error || 'unknown'}`);
          setFailed(true);
        }}
        onLoad={() => console.log(`[IMG] ${name}: OK`)}
        resizeMode={shape === 'square' ? 'contain' : 'cover'}
      />
    );
  }

  if (shape === 'square') return null;
  return <ExerciseInitial name={name} size={size} />;
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#1a1a2e',
  },
  // ExerciseDB GIFs are drawn on white
  square: {
    backgroundColor: '#FFFFFF',
  },
});

import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { ExerciseInitial } from './ExerciseInitial';
import { fetchExerciseGif, cacheExerciseGif, proxyUrl } from '@/lib/exerciseImages';

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
 * Shows an exercise GIF if available, falls back to colored-initial circle.
 */
export function ExerciseImage({ name, imageUrl, size = 40, onImageFetched, shape = 'circle' }: ExerciseImageProps) {
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

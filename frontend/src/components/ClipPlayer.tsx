import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { theme } from '@/src/theme';

const FRAME_MS = 200;

type ClipPlayerProps = {
  frames: string[];
  playing: boolean;
  onFrameChange?: (index: number) => void;
};

export function ClipPlayer({ frames, playing, onFrameChange }: ClipPlayerProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setFrameIndex(0);
  }, [frames]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!playing || frames.length === 0) return;

    timerRef.current = setInterval(() => {
      setFrameIndex((prev) => {
        const next = (prev + 1) % frames.length;
        onFrameChange?.(next);
        return next;
      });
    }, FRAME_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, frames, onFrameChange]);

  if (frames.length === 0) {
    return <View style={styles.placeholder} />;
  }

  const uri = `data:image/jpeg;base64,${frames[frameIndex]}`;

  return (
    <View style={styles.wrap}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
  },
});

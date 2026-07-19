import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/theme';

type CameraFeedProps = {
  uri: string | null;
  connected: boolean;
  ageSeconds: number | null;
  expanded: boolean;
  onToggle: () => void;
};

export function CameraFeed({
  uri,
  connected,
  ageSeconds,
  expanded,
  onToggle,
}: CameraFeedProps) {
  if (!uri && !connected) {
    return null;
  }

  const ageLabel =
    ageSeconds != null && ageSeconds < 60
      ? `${Math.round(ageSeconds)}s ago`
      : connected
        ? 'Waiting…'
        : 'Offline';

  return (
    <Pressable
      onPress={uri ? onToggle : undefined}
      style={[styles.wrap, expanded && styles.wrapExpanded]}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Camera</Text>
        </View>
      )}
      <View style={styles.label}>
        <View style={[styles.liveDot, { opacity: connected && uri ? 1 : 0.4 }]} />
        <Text style={styles.labelText}>{uri ? ageLabel : 'Connecting'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 108,
    height: 81,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  wrapExpanded: {
    width: 240,
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.inkFaint,
  },
  label: {
    position: 'absolute',
    left: 6,
    bottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.redBright,
  },
  labelText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: 0.3,
  },
});

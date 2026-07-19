import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { clipReasonLabel } from '@/src/api/clips';
import { ClipPlayer } from '@/src/components/ClipPlayer';
import { useTelemetry } from '@/src/context/TelemetryContext';
import { theme } from '@/src/theme';
import type { ClipMeta } from '@/src/types/clip';

function formatClipDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function clipSummary(clip: ClipMeta) {
  return `${clip.duration_s}s · ${clip.frame_count} frames`;
}

function reasonColor(reason: ClipMeta['reason']) {
  if (reason === 'crash') return theme.colors.redBright;
  if (reason === 'crash-sim') return theme.colors.warning;
  return theme.colors.inkMuted;
}

function ClipRow({
  clip,
  expanded,
  onPress,
}: {
  clip: ClipMeta;
  expanded: boolean;
  onPress: () => void;
}) {
  const { loadClipFrames } = useTelemetry();
  const [frames, setFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!expanded) {
      setPlaying(false);
      return;
    }
    setLoading(true);
    loadClipFrames(clip.id)
      .then((data) => {
        setFrames(data);
        setPlaying(true);
      })
      .catch((e) => console.error('Failed to load clip:', e))
      .finally(() => setLoading(false));
  }, [expanded, clip.id, loadClipFrames]);

  return (
    <Pressable onPress={onPress} style={[styles.row, expanded && styles.rowExpanded]}>
      {expanded ? <View style={styles.activeMark} /> : null}
      <View style={styles.rowBody}>
        <View style={styles.topLine}>
          <Text style={[styles.reason, { color: reasonColor(clip.reason) }]}>
            {clipReasonLabel(clip.reason)}
          </Text>
          <Text style={styles.date}>{formatClipDate(clip.created_at)}</Text>
        </View>
        <Text style={styles.summary}>{clipSummary(clip)}</Text>
        {expanded ? (
          loading ? (
            <ActivityIndicator color={theme.colors.red} style={styles.loader} />
          ) : (
            <>
              <ClipPlayer frames={frames} playing={playing} />
              <Pressable onPress={() => setPlaying((p) => !p)} hitSlop={8}>
                <Text style={styles.playToggle}>{playing ? 'Pause' : 'Play'}</Text>
              </Pressable>
            </>
          )
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ClipsScreen() {
  const { clips, recording, toggleRecording, selectedClipId, setSelectedClipId } = useTelemetry();
  const [expandedId, setExpandedId] = useState<string | null>(selectedClipId);

  useEffect(() => {
    if (selectedClipId) {
      setExpandedId(selectedClipId);
      setSelectedClipId(null);
    }
  }, [selectedClipId, setSelectedClipId]);

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={toggleRecording}
          style={[styles.recordButton, recording && styles.recordButtonActive]}>
          <View style={[styles.recordDot, recording && styles.recordDotActive]} />
          <Text style={[styles.recordLabel, recording && styles.recordLabelActive]}>
            {recording ? 'Stop recording' : 'Record'}
          </Text>
        </Pressable>
        <Text style={styles.toolbarHint}>
          {recording ? 'Saving camera frames…' : 'Includes a few seconds before you tap Record'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {clips.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No clips yet</Text>
            <Text style={styles.emptyBody}>
              Crash footage saves automatically. Use Record on the live feed or here to capture
              manual clips.
            </Text>
          </View>
        ) : (
          clips.map((clip) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              expanded={expandedId === clip.id}
              onPress={() => setExpandedId(expandedId === clip.id ? null : clip.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  toolbar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  recordButtonActive: {
    borderColor: theme.colors.red,
    backgroundColor: theme.colors.emergencyBg,
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.redBright,
  },
  recordDotActive: {
    borderRadius: 2,
  },
  recordLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  recordLabelActive: {
    color: theme.colors.redBright,
  },
  toolbarHint: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.inkMuted,
  },
  content: {
    paddingBottom: 24,
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
  },
  rowExpanded: {
    backgroundColor: theme.colors.surface,
  },
  activeMark: {
    width: 2,
    backgroundColor: theme.colors.red,
    marginRight: 12,
    marginLeft: -18,
    alignSelf: 'stretch',
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  reason: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  date: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.inkFaint,
  },
  summary: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.inkMuted,
  },
  playToggle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.redBright,
  },
  loader: {
    marginVertical: 24,
  },
  empty: {
    paddingHorizontal: 18,
    paddingTop: 48,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.inkMuted,
    maxWidth: 320,
  },
});

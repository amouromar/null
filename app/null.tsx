/**
 * null.tsx — The Void
 *
 * Timer architecture:
 *   - End-timestamp sourced: remaining = endTime - Date.now()
 *   - Drift-proof: accurate even after screen lock / foreground return
 *   - Crash-proof: session persisted in AsyncStorage via sessionManager
 *   - Cancel button: pure Reanimated withTiming → no JS poll loop
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  Easing,
  SharedValue,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Circle, Svg } from "react-native-svg";
import {
  ActiveSession,
  addReclaimedMinutes,
  addSessionNote,
  clearSession,
  getRemainingSeconds,
  startSession,
} from "../lib/sessionManager";

// ─── SVG Arc Ring setup ───────────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Constants ────────────────────────────────────────────────────────────────
const RING_R = 40;
const RING_STROKE = 2.5;
const RING_SVG_SIZE = (RING_R + RING_STROKE) * 2 + 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

const STORAGE_KEYS = {
  holdDuration: "null_hold_duration",
  hapticPulse: "null_haptic_pulse",
  visualHint: "null_visual_hint",
  whitelist: "null_whitelist_v2",
};

const VOID_GREY = "#666666";
const SUCCESS_BG = "#0A1A0A";
const ACCENT = "#FFB300";
const WHITE = "#FFFFFFE6";

const mono = (w: "Regular" | "Medium" | "Bold" = "Regular") => ({
  fontFamily: `RobotoMono-${w}`,
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface WhitelistContact {
  id: string;
  name: string;
  phoneNumber?: string;
}

type Phase = "active" | "complete";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtSeconds(secs: number) {
  const s = Math.max(0, Math.round(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function fmtReclaimed(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}M`;
  if (m === 0) return `${h}H`;
  return `${h}H ${m}M`;
}

// ─── Notification Row ─────────────────────────────────────────────────────────
function NotifRow({ contacts }: { contacts: WhitelistContact[] }) {
  if (contacts.length === 0) return null;
  return (
    <View style={styles.notifContainer}>
      {contacts.slice(0, 4).map((c) => (
        <View key={c.id} style={styles.notifCard}>
          <Text style={[mono("Bold"), styles.notifName]} numberOfLines={1}>
            {c.name.toUpperCase()}
          </Text>
          {c.phoneNumber ? (
            <View style={styles.notifActions}>
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${c.phoneNumber}`)}
                activeOpacity={0.7}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Ionicons name="call-outline" size={24} color={VOID_GREY} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL(`sms:${c.phoneNumber}`)}
                activeOpacity={0.7}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={24}
                  color={VOID_GREY}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ─── SVG Arc Ring ─────────────────────────────────────────────────────────────
interface ArcRingProps {
  progress: SharedValue<number>;
  opacity: SharedValue<number>;
}

function ArcRing({ progress, opacity }: ArcRingProps) {
  const cx = RING_SVG_SIZE / 2;
  const cy = RING_SVG_SIZE / 2;

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <Animated.View
      style={[containerStyle, { width: RING_SVG_SIZE, height: RING_SVG_SIZE }]}
    >
      <Svg
        width={RING_SVG_SIZE}
        height={RING_SVG_SIZE}
        viewBox={`0 0 ${RING_SVG_SIZE} ${RING_SVG_SIZE}`}
      >
        {/* Ghost track */}
        <Circle
          cx={cx}
          cy={cy}
          r={RING_R}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1.5}
          fill="none"
        />
        {/* Animated progress arc — 12 o'clock start */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={RING_R}
          stroke="#FFFFFF"
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={arcProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${cx}, ${cy}`}
        />
        {/* Center dot */}
        <Circle cx={cx} cy={cy} r={4} fill="rgba(255,255,255,0.25)" />
      </Svg>
    </Animated.View>
  );
}

// ─── Session Note Modal ────────────────────────────────────────────────────────
interface NoteModalProps {
  visible: boolean;
  durationLabel: string;
  onSave: (note: string) => void;
  onSkip: () => void;
}
function NoteModal({ visible, durationLabel, onSave, onSkip }: NoteModalProps) {
  const [text, setText] = useState("");
  const submit = () => {
    if (text.trim()) {
      onSave(text.trim());
      setText("");
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <TouchableWithoutFeedback onPress={onSkip}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={styles.modalBox}>
                <Text style={[mono("Bold"), styles.modalTitle]}>
                  LOG_SESSION_NOTE_
                </Text>
                <Text style={[mono(), styles.modalSub]}>
                  One sentence. What did you accomplish?
                </Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  style={[mono("Medium"), styles.modalInput]}
                  placeholder="FINISHED THE BRIEF."
                  placeholderTextColor="#333333"
                  selectionColor={ACCENT}
                  multiline
                  maxLength={140}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={onSkip} activeOpacity={0.7}>
                    <Text
                      style={[mono("Bold"), { color: "#444444", fontSize: 10 }]}
                    >
                      SKIP
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={submit} activeOpacity={0.7}>
                    <Text
                      style={[mono("Bold"), { color: ACCENT, fontSize: 11 }]}
                    >
                      SAVE_NOTE →
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Stat Row ─────────────────────────────────────────────────────────────────
function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={[mono(), styles.statLabel]}>{label}:</Text>
      <Text
        style={[mono("Bold"), styles.statValue, accent && { color: ACCENT }]}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NullScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ── Resolve endTime ─────────────────────────────────────────────
  // Two entry points:
  //   1. Normal start: params.duration (minutes)
  //   2. Crash recovery: params.endTime (Unix ms, set by _layout)
  const sessionRef = useRef<ActiveSession | null>(null);

  // ── Settings ────────────────────────────────────────────────────
  const [holdDuration, setHoldDuration] = useState(3.0);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [visualHintEnabled, setVisualHintEnabled] = useState(true);
  const [whitelistedContacts, setWhitelistedContacts] = useState<
    WhitelistContact[]
  >([]);

  // ── Timer ────────────────────────────────────────────────────────
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("active");
  const completedDurationLabelRef = useRef("00:00");

  // ── Stats ────────────────────────────────────────────────────────
  const [totalReclaimed, setTotalReclaimed] = useState(0);

  // ── Note Modal ───────────────────────────────────────────────────
  const [showNoteModal, setShowNoteModal] = useState(false);

  // ── Animation Values ─────────────────────────────────────────────
  const breathOpacity = useSharedValue(1);
  // Ring: progress 0→1 as user holds; withSpring back to 0 on release
  const ringProgress = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  // Completed state
  const completedBgOpacity = useSharedValue(0);
  const completedContentOpacity = useSharedValue(0);

  // Haptic interval ref for the hold gesture
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Block hardware back ──────────────────────────────────────────
  useEffect(() => {
    const handler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => handler.remove();
  }, []);

  // ── Load settings + contacts ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [h, hp, vh, wl] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.holdDuration),
        AsyncStorage.getItem(STORAGE_KEYS.hapticPulse),
        AsyncStorage.getItem(STORAGE_KEYS.visualHint),
        AsyncStorage.getItem(STORAGE_KEYS.whitelist),
      ]);
      if (h) setHoldDuration(parseFloat(h));
      if (hp !== null) setHapticEnabled(hp === "true");
      if (vh !== null) setVisualHintEnabled(vh === "true");

      if (wl) {
        const parsed = JSON.parse(wl) as {
          id: string;
          name: string;
          active: boolean;
        }[];
        const active = parsed.filter((c) => c.active);
        let resolved: WhitelistContact[] = active.map((c) => ({
          id: c.id,
          name: c.name,
        }));
        try {
          const { status } = await Contacts.getPermissionsAsync();
          if (status === "granted") {
            resolved = await Promise.all(
              active.map(async (c) => {
                try {
                  const contact = await Contacts.getContactByIdAsync(c.id, [
                    Contacts.Fields.PhoneNumbers,
                  ]);
                  return {
                    id: c.id,
                    name: c.name,
                    phoneNumber:
                      contact?.phoneNumbers?.[0]?.number ?? undefined,
                  };
                } catch {
                  return { id: c.id, name: c.name };
                }
              }),
            );
          }
        } catch {}
        setWhitelistedContacts(resolved);
      }
    })();
  }, []);

  // ── Initialize / recover session ─────────────────────────────────
  useEffect(() => {
    (async () => {
      let session: ActiveSession;

      if (params.endTime) {
        // Crash recovery path — _layout detected an active session and passed
        // its endTime. Re-load the full record from AsyncStorage so we have
        // the original durationMs for the "DURATION" stat.
        const { loadActiveSession: load } =
          await import("../lib/sessionManager");
        const stored = await load();
        if (stored) {
          session = stored;
        } else {
          // Session expired between _layout check and now — go home.
          router.replace("/");
          return;
        }
      } else {
        // Normal start from home screen
        const durationMins = parseInt((params.duration as string) || "45", 10);
        session = await startSession(durationMins * 60 * 1000);
      }

      sessionRef.current = session;
      // Label shows original planned duration (not remaining)
      completedDurationLabelRef.current = fmtSeconds(session.durationMs / 1000);
      setSecondsRemaining(getRemainingSeconds(session));

      // Start breathing animation
      breathOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, {
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1.0, {
            duration: 5000,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        false,
      );
    })();

    return () => {
      cancelAnimation(breathOpacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Session complete handler ─────────────────────────────────────
  const handleSessionComplete = useCallback(async () => {
    cancelAnimation(breathOpacity);
    await clearSession();

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      200,
    );

    const sessionMins = Math.ceil(
      (sessionRef.current?.durationMs ?? 0) / 60000,
    );
    const newTotal = await addReclaimedMinutes(sessionMins);
    setTotalReclaimed(newTotal);
    setPhase("complete");

    completedBgOpacity.value = withTiming(1, { duration: 2000 });
    completedContentOpacity.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [breathOpacity, completedBgOpacity, completedContentOpacity]);

  // ── Drift-proof countdown ────────────────────────────────────────
  // Sources remaining from endTime every tick — accurate after lock/resume.
  useEffect(() => {
    if (phase !== "active") return;

    const tick = setInterval(() => {
      if (!sessionRef.current) return;
      const remaining = getRemainingSeconds(sessionRef.current);
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        handleSessionComplete();
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [phase, handleSessionComplete]);

  // ── AppState: re-sync on foreground return ───────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          nextState === "active" &&
          phase === "active" &&
          sessionRef.current
        ) {
          // Re-calculate from the authoritative endTime
          const remaining = getRemainingSeconds(sessionRef.current);
          setSecondsRemaining(remaining);
          if (remaining <= 0) {
            handleSessionComplete();
          }
        }
      },
    );
    return () => sub.remove();
  }, [phase, handleSessionComplete]);

  // ── Exit session (cancel hold completed) ─────────────────────────
  const exitSession = useCallback(async () => {
    // Stop haptic interval immediately (in case called from Reanimated finished cb)
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
    cancelAnimation(breathOpacity);
    await clearSession();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/");
  }, [breathOpacity, router]);

  // ── Cancel button: pure Reanimated (blueprint pattern) ───────────
  const startHold = useCallback(() => {
    if (phase !== "active") return;
    const totalMs = holdDuration * 1000;

    ringOpacity.value = withTiming(1, { duration: 120 });

    // The ring fills over holdDuration; when completely filled, exit.
    ringProgress.value = withTiming(
      1,
      { duration: totalMs, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(exitSession)();
        }
      },
    );

    // Haptics: driven by a JS interval that reads ringProgress
    if (hapticEnabled) {
      let elapsed = 0;
      let lastHapticAt = 0;
      hapticIntervalRef.current = setInterval(() => {
        // Guard: bail if the interval was already cleared by releaseHold/exitSession
        if (!hapticIntervalRef.current) return;
        elapsed += 50;
        const pct = Math.min(elapsed / totalMs, 1);
        const interval = Math.max(80, 300 - pct * 220);
        if (elapsed - lastHapticAt >= interval) {
          lastHapticAt = elapsed;
          Haptics.impactAsync(
            pct < 0.5
              ? Haptics.ImpactFeedbackStyle.Light
              : pct < 0.8
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Heavy,
          );
        }
      }, 50);
    }
  }, [
    phase,
    holdDuration,
    hapticEnabled,
    ringOpacity,
    ringProgress,
    exitSession,
  ]);

  const releaseHold = useCallback(() => {
    clearInterval(hapticIntervalRef.current!);
    hapticIntervalRef.current = null;

    // Snap ring back to zero
    cancelAnimation(ringProgress);
    ringProgress.value = withSpring(0, { damping: 20, stiffness: 200 });
    ringOpacity.value = withTiming(0, { duration: 300 });
  }, [ringProgress, ringOpacity]);

  // ── Save note and return home ────────────────────────────────────
  const saveNote = useCallback(
    async (note: string) => {
      await addSessionNote(note, completedDurationLabelRef.current);
      setShowNoteModal(false);
      router.replace("/");
    },
    [router],
  );

  // ── Animated styles ──────────────────────────────────────────────
  const timerStyle = useAnimatedStyle(() => ({
    opacity: breathOpacity.value,
  }));

  const completedBgStyle = useAnimatedStyle(() => ({
    opacity: completedBgOpacity.value,
  }));

  const completedContentStyle = useAnimatedStyle(() => ({
    opacity: completedContentOpacity.value,
    transform: [{ translateY: (1 - completedContentOpacity.value) * 24 }],
  }));

  const reclaimedStr = fmtReclaimed(totalReclaimed);
  const timerDisplay =
    secondsRemaining !== null ? fmtSeconds(secondsRemaining) : "--:--";

  // ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar hidden={phase === "active"} style="light" />

      {/* ═══ ACTIVE STATE (The Void) ══════════════════════════════════ */}
      {phase === "active" && (
        <View style={styles.voidContainer}>
          {/* Whitelisted contacts */}
          <View style={styles.topBar}>
            <NotifRow contacts={whitelistedContacts} />
          </View>

          {/* Breathing Timer */}
          <View style={styles.voidCenter}>
            <Animated.Text style={[mono("Bold"), styles.voidTimer, timerStyle]}>
              {timerDisplay}
            </Animated.Text>
            <Text style={[mono("Bold"), styles.voidStatus]}>
              FOCUS_MODE_ACTIVE
            </Text>
          </View>

          {/* Ghost Cancel Zone */}
          <View style={styles.voidBottom}>
            {visualHintEnabled && (
              <View style={styles.ghostHint} pointerEvents="none" />
            )}
            <TouchableWithoutFeedback
              onPressIn={startHold}
              onPressOut={releaseHold}
            >
              <View style={styles.cancelHitbox}>
                <ArcRing progress={ringProgress} opacity={ringOpacity} />
              </View>
            </TouchableWithoutFeedback>
            <Text style={[mono("Bold"), styles.holdHint]}>hold to abort</Text>
          </View>
        </View>
      )}

      {/* ═══ COMPLETED STATE (The Wake Up) ═══════════════════════════ */}
      {phase === "complete" && (
        <View style={styles.completeContainer}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.completeBg,
              completedBgStyle,
            ]}
          />
          <Animated.View
            style={[styles.completeContent, completedContentStyle]}
          >
            <Text style={[mono("Bold"), styles.completeStatus]}>
              ✓ SESSION_COMPLETE
            </Text>

            <View style={styles.divider} />

            <View style={styles.statsBlock}>
              <StatRow
                label="DURATION"
                value={completedDurationLabelRef.current}
              />
              <StatRow label="TOTAL_RECLAIMED" value={reclaimedStr} accent />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace("/")}
              activeOpacity={0.8}
            >
              <Text style={[mono("Bold"), styles.primaryBtnText]}>
                [ RETURN_TO_TERMINAL ]
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowNoteModal(true)}
              activeOpacity={0.7}
            >
              <Text style={[mono("Bold"), styles.secondaryBtnText]}>
                [ ADD_SESSION_NOTE ]
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <NoteModal
        visible={showNoteModal}
        durationLabel={completedDurationLabelRef.current}
        onSave={saveNote}
        onSkip={() => {
          setShowNoteModal(false);
          router.replace("/");
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },

  // Active (Void)
  voidContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 52,
  },
  topBar: { width: "100%", paddingHorizontal: 20 },
  notifContainer: { gap: 6, width: "100%" },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  notifName: { fontSize: 16, color: VOID_GREY, letterSpacing: 2, flex: 1 },
  notifActions: { flexDirection: "row", gap: 14, marginLeft: 12 },
  voidCenter: { alignItems: "center", gap: 14 },
  voidTimer: {
    fontSize: 88,
    color: VOID_GREY,
    letterSpacing: -4,
    lineHeight: 96,
  },
  voidStatus: { fontSize: 9, color: "#2A2A2A", letterSpacing: 3 },
  voidBottom: {
    alignItems: "center",
    gap: 14,
    height: 150,
    justifyContent: "center",
  },
  ghostHint: {
    width: RING_SVG_SIZE + 6,
    height: RING_SVG_SIZE + 6,
    borderRadius: (RING_SVG_SIZE + 6) / 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    position: "absolute",
  },
  cancelHitbox: {
    width: RING_SVG_SIZE + 28,
    height: RING_SVG_SIZE + 28,
    alignItems: "center",
    justifyContent: "center",
  },
  holdHint: { fontSize: 8, color: "#1E1E1E", letterSpacing: 2 },

  // Completed
  completeContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  completeBg: { backgroundColor: SUCCESS_BG },
  completeContent: { width: "100%", alignItems: "flex-start", gap: 20 },
  completeStatus: { fontSize: 13, color: "#4CAF50", letterSpacing: 2 },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  statsBlock: { gap: 12, width: "100%" },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    width: "100%",
  },
  statLabel: { fontSize: 9, color: "#555555", letterSpacing: 2 },
  statValue: { fontSize: 22, color: WHITE, letterSpacing: -1 },
  primaryBtn: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { fontSize: 11, color: WHITE, letterSpacing: 2 },
  secondaryBtn: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { fontSize: 10, color: "#4CAF50", letterSpacing: 2 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#080808",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 28,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 9,
    color: "#555555",
    letterSpacing: 1,
    marginBottom: 16,
  },
  modalInput: {
    fontSize: 13,
    color: WHITE,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 10,
    minHeight: 60,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
});

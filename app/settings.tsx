import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Theme, THEMES, useTheme } from "../components/ThemeContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  white: "#FFFFFFE6",
  grey: "#666666",
  dimGrey: "#333333",
  accent: "#FFB300",
  divider: "rgba(255,255,255,0.12)",
};
const mono = (w: "Regular" | "Medium" | "Bold" = "Regular") => ({
  fontFamily: `RobotoMono-${w}`,
});

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Preset {
  id: string;
  name: string;
  duration: number;
}
interface WhitelistContact {
  id: string;
  name: string;
  active: boolean;
}

// ─── Tiny atoms ───────────────────────────────────────────────────────────────
const Divider = () => (
  <View style={{ height: 0.5, backgroundColor: C.divider }} />
);

const Section = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View style={ss.section}>
    <Text style={[mono("Bold"), ss.sectionLabel]}>{label}</Text>
    <Divider />
    {children}
  </View>
);

const Row = ({
  title,
  subtitle,
  right,
  onPress,
  accent,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  accent?: boolean;
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={ss.row}>
    <View style={{ flex: 1 }}>
      <Text
        style={[
          mono("Medium"),
          { fontSize: 12, color: accent ? C.accent : C.white },
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[mono(), { fontSize: 10, color: C.grey, marginTop: 2 }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    {right ? <View style={{ marginLeft: 12 }}>{right}</View> : null}
  </TouchableOpacity>
);

const Toggle = ({
  value,
  onChange,
}: {
  value: boolean;
  onChange: () => void;
}) => (
  <TouchableOpacity
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange();
    }}
    activeOpacity={0.8}
    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
  >
    <Text
      style={[mono("Bold"), { fontSize: 10, color: value ? C.white : C.grey }]}
    >
      {value ? "[ ACTIVE ]" : "[  OFF   ]"}
    </Text>
  </TouchableOpacity>
);

// ─── Duration Selector ────────────────────────────────────────────────────────
const DurationSelector = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const step = 0.5;
  const min = 1.5;
  const max = 5.0;

  const handleAdjust = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (next !== value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(Math.round(next * 10) / 10);
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingHorizontal: 20,
        paddingBottom: 16,
      }}
    >
      <TouchableOpacity
        onPress={() => handleAdjust(-step)}
        activeOpacity={0.7}
        style={ss.stepBtn}
      >
        <Text style={[mono("Bold"), { color: C.white, fontSize: 16 }]}>-</Text>
      </TouchableOpacity>

      <View style={{ width: 60, alignItems: "center" }}>
        <Text style={[mono("Bold"), { color: C.white, fontSize: 14 }]}>
          {value.toFixed(1)}s
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => handleAdjust(step)}
        activeOpacity={0.7}
        style={ss.stepBtn}
      >
        <Text style={[mono("Bold"), { color: C.white, fontSize: 16 }]}>+</Text>
      </TouchableOpacity>

      <Text
        style={[
          mono(),
          { color: C.grey, fontSize: 10, flex: 1, marginLeft: 10 },
        ]}
      >
        STEP: 0.5s (RANGE: 1.5s - 5.0s)
      </Text>
    </View>
  );
};

// ─── Preset Editor Modal ──────────────────────────────────────────────────────
const PresetModal = ({
  visible,
  initial,
  onSave,
  onCancel,
}: {
  visible: boolean;
  initial?: Preset | null;
  onSave: (p: Preset) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [duration, setDuration] = useState(String(initial?.duration ?? "25"));

  useEffect(() => {
    setName(initial?.name ?? "");
    setDuration(String(initial?.duration ?? "25"));
  }, [initial]);

  const handleSave = () => {
    const d = parseInt(duration, 10);
    if (!name.trim() || isNaN(d) || d < 1 || d > 360) {
      Alert.alert(
        "INVALID_INPUT",
        "Name required. Duration must be 1–360 min.",
      );
      return;
    }
    onSave({
      id: initial?.id ?? Date.now().toString(),
      name: name.trim().toUpperCase(),
      duration: d,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={ss.modalOverlay}>
        <View style={ss.modalBox}>
          <Text
            style={[
              mono("Bold"),
              { color: C.accent, fontSize: 10, marginBottom: 16 },
            ]}
          >
            {initial ? "EDIT_PRESET" : "ADD_PRESET"}
          </Text>

          <Text
            style={[mono(), { color: C.grey, fontSize: 10, marginBottom: 4 }]}
          >
            PRESET_NAME_
          </Text>
          <TextInput
            value={name}
            onChangeText={(t) => setName(t.toUpperCase())}
            style={[mono("Medium"), ss.modalInput]}
            placeholderTextColor={C.dimGrey}
            placeholder="DEEP_WORK"
            selectionColor={C.accent}
            autoCapitalize="characters"
          />

          <Text
            style={[
              mono(),
              { color: C.grey, fontSize: 10, marginTop: 12, marginBottom: 4 },
            ]}
          >
            DURATION_MINUTES_
          </Text>
          <TextInput
            value={duration}
            onChangeText={setDuration}
            style={[mono("Medium"), ss.modalInput]}
            keyboardType="numeric"
            placeholderTextColor={C.dimGrey}
            placeholder="25"
            selectionColor={C.accent}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 24,
            }}
          >
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
              <Text style={[mono("Bold"), { color: C.grey, fontSize: 11 }]}>
                CANCEL
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
              <Text style={[mono("Bold"), { color: C.accent, fontSize: 11 }]}>
                SAVE_PRESET →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Feedback Dropdown ────────────────────────────────────────────────────────
const FeedbackDropdown = ({ onClose }: { onClose: () => void }) => {
  const tags = [
    {
      key: "#bug",
      label: "#BUG_REPORT",
      subject: "[#bug] Bug Report - NULL App",
    },
    {
      key: "#featreq",
      label: "#FEATURE_REQUEST",
      subject: "[#featreq] Feature Request - NULL App",
    },
    {
      key: "#PR",
      label: "#PARTNERSHIP",
      subject: "[#PR] Partnership Inquiry - NULL App",
    },
  ];

  const sendEmail = (subject: string) => {
    const body = `\n\n---\nDevice: ${Platform.OS} ${Platform.Version}`;
    Linking.openURL(
      `mailto:amourhamisiomar@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
    onClose();
  };

  return (
    <View style={ss.dropdown}>
      {tags.map((t, i) => (
        <View key={t.key}>
          {i > 0 && <Divider />}
          <TouchableOpacity
            style={ss.dropdownRow}
            onPress={() => sendEmail(t.subject)}
            activeOpacity={0.7}
          >
            <Text style={[mono("Bold"), { color: C.white, fontSize: 11 }]}>
              {t.label}
            </Text>
            <Ionicons name="arrow-forward-outline" size={12} color={C.grey} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  presets: "null_presets",
  whitelist: "null_whitelist_v2",
  holdDuration: "null_hold_duration",
  hapticPulse: "null_haptic_pulse",
  visualHint: "null_visual_hint",
};

export default function Settings() {
  const router = useRouter();
  const { theme, setTheme, colors } = useTheme();

  // Presets
  const defaultPresets: Preset[] = [
    { id: "1", name: "DEEP_WORK", duration: 90 },
    { id: "2", name: "SPRINT", duration: 25 },
    { id: "3", name: "QUICK_TASK", duration: 10 },
  ];
  const [presets, setPresets] = useState<Preset[]>(defaultPresets);
  const [editingPreset, setEditingPreset] = useState<Preset | null | "new">(
    null,
  );

  // Whitelist
  const [contactSearch, setContactSearch] = useState("");
  const [whitelist, setWhitelist] = useState<WhitelistContact[]>([]);

  // Exit mechanism
  const [holdDuration, setHoldDuration] = useState(3.0);
  const [hapticPulse, setHapticPulse] = useState(true);
  const [visualHint, setVisualHint] = useState(true);

  // Feedback
  const [showFeedback, setShowFeedback] = useState(false);

  // UI State
  const [isListExpanded, setIsListExpanded] = useState(false);

  // ── Persistence ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [p, w, h, hp, vh] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.presets),
        AsyncStorage.getItem(STORAGE_KEYS.whitelist),
        AsyncStorage.getItem(STORAGE_KEYS.holdDuration),
        AsyncStorage.getItem(STORAGE_KEYS.hapticPulse),
        AsyncStorage.getItem(STORAGE_KEYS.visualHint),
      ]);
      if (p) setPresets(JSON.parse(p));
      if (w) setWhitelist(JSON.parse(w));
      if (h) setHoldDuration(parseFloat(h));
      if (hp !== null) setHapticPulse(hp === "true");
      if (vh !== null) setVisualHint(vh === "true");
    })();
  }, []);

  const savePresets = async (p: Preset[]) => {
    setPresets(p);
    await AsyncStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(p));
  };

  const saveWhitelist = async (w: WhitelistContact[]) => {
    setWhitelist(w);
    await AsyncStorage.setItem(STORAGE_KEYS.whitelist, JSON.stringify(w));
  };

  const saveHold = async (v: number) => {
    setHoldDuration(v);
    await AsyncStorage.setItem(STORAGE_KEYS.holdDuration, String(v));
  };

  const saveHaptic = async () => {
    const next = !hapticPulse;
    setHapticPulse(next);
    await AsyncStorage.setItem(STORAGE_KEYS.hapticPulse, String(next));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveVisualHint = async () => {
    const next = !visualHint;
    setVisualHint(next);
    await AsyncStorage.setItem(STORAGE_KEYS.visualHint, String(next));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Contacts picker ───────────────────────────────────────────
  const openContactPicker = useCallback(async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "PERMISSION_DENIED",
        "Cannot access contacts. Enable in device settings.",
      );
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name],
      sort: Contacts.SortTypes.FirstName,
    });
    const picked = data.filter((c) => c.name);
    // Merge: keep existing whitelist flags, add new contacts as blocked
    const merged: WhitelistContact[] = picked.map((c) => {
      const existing = whitelist.find((w) => w.id === c.id);
      return { id: c.id!, name: c.name!, active: existing?.active ?? false };
    });
    await saveWhitelist(merged);
  }, [whitelist]);

  const toggleContact = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = whitelist.map((c) =>
        c.id === id ? { ...c, active: !c.active } : c,
      );
      saveWhitelist(updated);
    },
    [whitelist],
  );

  const filteredContacts = whitelist.filter((c) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()),
  );

  // ── Preset handlers ────────────────────────────────────────────
  const handleSavePreset = (p: Preset) => {
    if (editingPreset === "new") {
      savePresets([...presets, p]);
    } else {
      savePresets(presets.map((x) => (x.id === p.id ? p : x)));
    }
    setEditingPreset(null);
  };

  const deletePreset = (id: string) => {
    Alert.alert("DELETE_PRESET?", "This cannot be undone.", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DELETE",
        style: "destructive",
        onPress: () => savePresets(presets.filter((p) => p.id !== id)),
      },
    ]);
  };

  const activeContacts = whitelist.filter((c) => c.active);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[ss.container, { backgroundColor: colors.bg }]}>
      <StatusBar style="light" />

      {/* Preset Editor Modal */}
      <PresetModal
        visible={editingPreset !== null}
        initial={editingPreset === "new" ? null : editingPreset}
        onSave={handleSavePreset}
        onCancel={() => setEditingPreset(null)}
      />

      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          activeOpacity={0.7}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Ionicons name="arrow-back" size={16} color={C.accent} />
          <Text style={[mono("Bold"), { fontSize: 10, color: C.accent }]}>
            EXIT
          </Text>
        </TouchableOpacity>
        <Text style={[mono("Bold"), { fontSize: 12, color: C.white }]}>
          SETTINGS
        </Text>
      </View>
      <Divider />

      <ScrollView showsVerticalScrollIndicator={false} decelerationRate="fast">
        {/* ── 01 FOCUS_PRESETS ───────────────────────────── */}
        <Section label="01  FOCUS_PRESETS">
          {presets.map((p, i) => (
            <View key={p.id}>
              <Row
                title={`${p.name}_`}
                subtitle={`${p.duration}m`}
                right={
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setEditingPreset(p)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    >
                      <Text style={[mono(), { fontSize: 10, color: C.grey }]}>
                        EDIT
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deletePreset(p.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    >
                      <Text
                        style={[mono(), { fontSize: 10, color: "#FF4444" }]}
                      >
                        DEL
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
              />
              {i < presets.length - 1 && <Divider />}
            </View>
          ))}
          <Divider />
          <Row
            title="+ ADD_NEW_PRESET"
            onPress={() => setEditingPreset("new")}
            accent
          />
        </Section>

        {/* ── 02 COMM_WHITELIST ──────────────────────────── */}
        <Section label="02  COMM_WHITELIST">
          {whitelist.length === 0 ? (
            <Row
              title="SYNC_CONTACTS_"
              subtitle="Tap to import from your phonebook"
              accent
              onPress={openContactPicker}
            />
          ) : (
            <>
              {activeContacts.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text
                    style={[
                      mono("Bold"),
                      {
                        color: C.accent,
                        fontSize: 9,
                        paddingHorizontal: 20,
                        paddingVertical: 8,
                      },
                    ]}
                  >
                    WHITELISTED_SESSION_KEYS ({activeContacts.length})
                  </Text>
                  {activeContacts.map((c, i) => (
                    <View key={c.id}>
                      <Row
                        title={c.name.toUpperCase()}
                        right={
                          <Toggle
                            value={c.active}
                            onChange={() => toggleContact(c.id)}
                          />
                        }
                      />
                      <Divider />
                    </View>
                  ))}
                </View>
              )}

              <Row
                title={
                  isListExpanded
                    ? "HIDE_CONTACT_DATABASE_"
                    : "MANAGE_ALL_CONTACTS_"
                }
                subtitle={
                  isListExpanded
                    ? "Close searchable registry"
                    : "Expand to manage full registry"
                }
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsListExpanded(!isListExpanded);
                }}
                accent={!isListExpanded}
                right={
                  <Ionicons
                    name={isListExpanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={isListExpanded ? C.grey : C.accent}
                  />
                }
              />

              {isListExpanded && (
                <View style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <Divider />
                  <View style={ss.searchRow}>
                    <Text style={[mono(), { color: C.grey, fontSize: 10 }]}>
                      {">"}
                    </Text>
                    <TextInput
                      value={contactSearch}
                      onChangeText={setContactSearch}
                      placeholder="FIND_CONTACT_"
                      placeholderTextColor={C.dimGrey}
                      style={[mono(), ss.searchInput]}
                      selectionColor={C.accent}
                    />
                    <TouchableOpacity
                      onPress={openContactPicker}
                      activeOpacity={0.7}
                      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    >
                      <Text style={[mono(), { fontSize: 9, color: C.grey }]}>
                        REFRESH
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Divider />
                  {filteredContacts.map((c, i) => (
                    <View key={c.id}>
                      <Row
                        title={c.name.toUpperCase()}
                        right={
                          <Toggle
                            value={c.active}
                            onChange={() => toggleContact(c.id)}
                          />
                        }
                      />
                      {i < filteredContacts.length - 1 && <Divider />}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </Section>

        {/* ── 03 EXIT_MECHANISM ──────────────────────────── */}
        <Section label="03  EXIT_MECHANISM">
          <View style={ss.row}>
            <Text
              style={[
                mono("Medium"),
                { fontSize: 12, color: C.white, flex: 1 },
              ]}
            >
              CANCEL_HOLD_DURATION
            </Text>
          </View>
          <DurationSelector value={holdDuration} onChange={saveHold} />
          <Divider />
          <Row
            title="VIBRATION_FEEDBACK"
            subtitle="Haptic ticks while holding to cancel"
            right={<Toggle value={hapticPulse} onChange={saveHaptic} />}
          />
          <Divider />
          <Row
            title="VISUAL_HINT"
            subtitle="5% opacity cancel zone indicator"
            right={<Toggle value={visualHint} onChange={saveVisualHint} />}
          />
        </Section>

        {/* ── 04 APPEARANCE ──────────────────────────────── */}
        <Section label="04  APPEARANCE">
          {(Object.keys(THEMES) as Theme[]).map((t, i, arr) => (
            <View key={t}>
              <Row
                title={t}
                onPress={() => {
                  setTheme(t);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                right={
                  <Text
                    style={[
                      mono("Bold"),
                      { fontSize: 10, color: theme === t ? C.accent : C.grey },
                    ]}
                  >
                    {theme === t ? "[ACTIVE]" : "[  ]"}
                  </Text>
                }
              />
              {i < arr.length - 1 && <Divider />}
            </View>
          ))}
        </Section>

        {/* ── 05 DEVELOPER ───────────────────────────────── */}
        <Section label="05  DEVELOPER">
          <Row
            title="SEND_FEEDBACK_"
            subtitle="Opens email client with tag selector"
            onPress={() => {
              setShowFeedback(!showFeedback);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            right={
              <Ionicons
                name={showFeedback ? "chevron-up" : "chevron-down"}
                size={14}
                color={C.grey}
              />
            }
          />
          {showFeedback && (
            <>
              <Divider />
              <FeedbackDropdown onClose={() => setShowFeedback(false)} />
            </>
          )}
          <Divider />
          <View style={ss.row}>
            <Text style={[mono(), { fontSize: 10, color: C.dimGrey }]}>
              NULL_v1.0.4 | LICENSE_PRO_ACTIVE
            </Text>
          </View>
        </Section>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  section: { marginTop: 24 },
  sectionLabel: {
    fontSize: 9,
    color: "#666666",
    letterSpacing: 2,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 12, color: "#FFFFFFE6", padding: 0 },
  dropdown: { paddingHorizontal: 20, paddingVertical: 4 },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#0A0A0A",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.15)",
    padding: 28,
    paddingBottom: 40,
  },
  modalInput: {
    fontSize: 14,
    color: "#FFFFFFE6",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.2)",
    paddingVertical: 8,
  },
  stepBtn: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
});

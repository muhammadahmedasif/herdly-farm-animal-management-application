import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { Colors, Shadows, Radius } from '../constants/Colors';

// ─── Premium gradient header (dependency-free, layered sheen) ────────────────
export function GradientHeader({
  title,
  subtitle,
  right,
  large = false,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  large?: boolean;
}) {
  return (
    <View style={styles.header}>
      {/* Top sheen to suggest a vertical gradient without a native module */}
      <View style={styles.headerSheen} pointerEvents="none" />
      <View style={[styles.headerInner, large && styles.headerInnerLarge]}>
        <View style={{ flexShrink: 1 }}>
          <Text style={[styles.headerTitle, large && styles.headerTitleLarge]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.headerRight}>{right}</View> : null}
      </View>
    </View>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────
export function Card({
  children,
  style,
  accent,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
}) {
  return (
    <View style={[styles.card, accent && { borderTopColor: accent, borderTopWidth: 3 }, style]}>
      {children}
    </View>
  );
}

// ─── Section header (title) ──────────────────────────────────────────────────────
export function SectionHeader({
  title,
  style,
  textStyle,
}: {
  title: string;
  style?: StyleProp<TextStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.sectionTitle, style, textStyle]}>{title}</Text>;
}

// ─── Status pill (semantic colors) ──────────────────────────────────────────────
export function StatusPill({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  text,
}: {
  icon?: React.ReactNode;
  text: string;
}) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ─── Beautiful app background (dependency-free soft gradient glow) ──────────────
export function AppBackground({ children }: { children?: React.ReactNode }) {
  return (
    <View style={styles.bgRoot}>
      <View style={styles.bgTint} pointerEvents="none" />
      <View style={[styles.bgBlob, styles.bgBlob1]} pointerEvents="none" />
      <View style={[styles.bgBlob, styles.bgBlob2]} pointerEvents="none" />
      <View style={[styles.bgBlob, styles.bgBlob3]} pointerEvents="none" />
      <View style={[styles.bgBlob, styles.bgBlob4]} pointerEvents="none" />
      {children}
    </View>
  );
}

// ─── Floating action button ─────────────────────────────────────────────────────
export function FAB({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bgRoot: {
    flex: 1,
    backgroundColor: '#E7EFFB',
  },
  bgBlob: {
    position: 'absolute',
    borderRadius: 999,
  },
  bgBlob1: {
    width: 380, height: 380, top: -150, right: -120,
    backgroundColor: 'rgba(30, 58, 95, 0.20)',
  },
  bgBlob2: {
    width: 360, height: 360, top: 220, left: -160,
    backgroundColor: 'rgba(0, 102, 102, 0.16)',
  },
  bgBlob3: {
    width: 440, height: 440, bottom: -200, right: -140,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  bgBlob4: {
    width: 240, height: 240, top: 520, right: 30,
    backgroundColor: 'rgba(234, 88, 12, 0.10)',
  },
  bgTint: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 260,
    backgroundColor: 'rgba(30, 58, 95, 0.07)',
  },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 22,
  },
  headerSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: Colors.primaryLight,
    opacity: 0.5,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInnerLarge: { paddingTop: 6 },
  headerRight: { marginLeft: 12 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textWhite,
    letterSpacing: 0.3,
  },
  headerTitleLarge: { fontSize: 30 },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '700',
    marginTop: 3,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 20,
    ...Shadows.lg,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 6,
  },
  pillText: { fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },

  empty: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.background,
    ...Shadows.brand,
  },
});

// ─── Reliable cross-platform Select (replaces native Picker) ─────────────────
// Native Android Pickers render the selected value with the device theme, which
// on some OEM/Android versions shows white-on-light (invisible) text. This
// control always shows the selected value as dark navy text on a light field,
// and lists options in a bottom sheet with guaranteed contrast.
export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select',
  style,
  textStyle,
  disabled,
  testID,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value && o.value !== '');

  return (
    <>
      <TouchableOpacity
        style={[selectStyles.trigger, disabled && selectStyles.triggerDisabled, style]}
        activeOpacity={0.8}
        onPress={() => !disabled && setOpen(true)}
        testID={testID}
      >
        <Text style={[selectStyles.value, !selected && selectStyles.placeholder, textStyle]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown color={Colors.textSecondary} size={18} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={selectStyles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={selectStyles.sheet}>
            <View style={selectStyles.sheetHandle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <TouchableOpacity
                    key={o.value}
                    style={[selectStyles.item, active && selectStyles.itemActive]}
                    onPress={() => { onValueChange(o.value); setOpen(false); }}
                  >
                    <Text style={[selectStyles.itemText, active && selectStyles.itemTextActive]} numberOfLines={1}>
                      {o.label}
                    </Text>
                    {active && <Check color={Colors.primary} size={18} strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const selectStyles = StyleSheet.create({
  trigger: {
    height: 56,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerDisabled: { opacity: 0.6, backgroundColor: '#EEF2FF' },
  value: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  placeholder: { color: Colors.textMuted, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 39, 66, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 12,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginVertical: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  itemActive: { backgroundColor: '#EAF1FB' },
  itemText: { fontSize: 16, color: '#1F2937', fontWeight: '700', flex: 1, marginRight: 8 },
  itemTextActive: { color: Colors.primary, fontWeight: '900' },
});

export { Radius, Shadows };

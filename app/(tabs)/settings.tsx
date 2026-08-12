import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors, Shadows, Radius } from '../../constants/Colors';
import { GradientHeader, AppBackground } from '../../components/ui';

const SETTINGS_ITEMS = [
  { emoji: '🔔', title: 'Notification Alerts', subtitle: 'Set reminder timings', color: '#2563EB', bg: '#DBEAFE' },
  { emoji: '📅', title: 'Health Schedules', subtitle: 'Vaccine & deworming intervals', color: '#16A34A', bg: '#DCFCE7' },
  { emoji: '🌐', title: 'Language', subtitle: 'English (Default)', color: '#7C3AED', bg: '#EDE9FE' },
  { emoji: '🛡️', title: 'Data & Privacy', subtitle: 'Manage your farm data', color: '#EA580C', bg: '#FFEDD5' },
  { emoji: 'ℹ️', title: 'About Herdly', subtitle: 'Version 1.0.0', color: '#374151', bg: '#F3F4F6' },
];

export default function SettingsScreen() {
  return (
    <AppBackground>
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <GradientHeader title="Settings" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Card */}
        <View style={styles.brandCard}>
          <Text style={styles.brandEmoji}>🐄</Text>
          <Text style={styles.brandName}>Herdly</Text>
          <Text style={styles.brandTagline}>Livestock Management</Text>
          <View style={styles.brandVersionBadge}>
            <Text style={styles.brandVersionText}>Version 1.0.0</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>App Settings</Text>

        {SETTINGS_ITEMS.map((item) => (
          <TouchableOpacity key={item.title} style={styles.settingCard} activeOpacity={0.75}>
            <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
              <Text style={styles.settingEmoji}>{item.emoji}</Text>
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Colors.textWhite },
  scroll: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: { padding: 16 },
  brandCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  brandEmoji: { fontSize: 52, marginBottom: 8 },
  brandName: { fontSize: 30, fontWeight: '900', color: Colors.textWhite },
  brandTagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 4 },
  brandVersionBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  brandVersionText: { color: Colors.textWhite, fontSize: 12, fontWeight: '700' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  settingCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingEmoji: { fontSize: 24 },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  settingSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
  arrow: { fontSize: 26, color: Colors.textMuted, fontWeight: '300' },
});

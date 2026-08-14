import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius } from '../../constants/Colors';
import { GradientHeader, AppBackground, Select } from '../../components/ui';
import { useSettings, AppHeaderStyle } from '../../store/SettingsContext';


export default function SettingsScreen() {
  const { headerStyle, setHeaderStyle, appName, setAppName } = useSettings();

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
          <Text style={styles.brandName}>{appName}</Text>
          <Text style={styles.brandTagline}>Livestock Management</Text>
          <View style={styles.brandVersionBadge}>
            <Text style={styles.brandVersionText}>Version 1.0.0</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>App Customizations</Text>

        <View style={styles.settingCard}>
          <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
            <Text style={styles.settingEmoji}>🎨</Text>
          </View>
          <View style={[styles.settingInfo, { paddingRight: 10 }]}>
            <Text style={styles.settingTitle}>Top Header Style</Text>
            <Text style={styles.settingSubtitle}>Choose how the app header looks</Text>
            <View style={{ marginTop: 12 }}>
              <Select
                value={headerStyle}
                onValueChange={(val) => setHeaderStyle(val as AppHeaderStyle)}
                options={[
                  { label: 'Gradient Header', value: 'gradient' },
                  { label: 'Solid Color Header', value: 'solid' },
                  { label: 'Minimal / Clean Header', value: 'minimal' },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.settingCard}>
          <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
            <Text style={styles.settingEmoji}>🏷️</Text>
          </View>
          <View style={[styles.settingInfo, { paddingRight: 10 }]}>
            <Text style={styles.settingTitle}>App Name</Text>
            <Text style={styles.settingSubtitle}>Set your farm or app name</Text>
            <View style={{ marginTop: 12 }}>
              <TextInput
                style={{
                  height: 48,
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  fontSize: 15,
                  color: '#1F2937',
                  fontWeight: '600'
                }}
                value={appName}
                onChangeText={setAppName}
                placeholder="e.g. My Farm"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
        </View>

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

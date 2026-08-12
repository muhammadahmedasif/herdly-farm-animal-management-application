import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Dna,
  Baby,
  Syringe,
  Pill,
  PlusCircle,
  TrendingUp,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';
import { Colors, Shadows, Radius } from '../../constants/Colors';
import { useStore } from '../../store/StoreContext';
import { GradientHeader, AppBackground } from '../../components/ui';
import { getDueDateStatus } from '../../utils/dateCalculations';

const { width } = Dimensions.get('window');



// ─── Quick action buttons ─────────────────────────────────────────────────────
// Photos are bundled local assets in assets/images.
const ACTIONS = [
  {
    label: 'Insemination',
    icon: Dna,
    route: '/health/insemination',
    color: '#2563EB',
    bg: '#DBEAFE',
    image: require('../../assets/images/insemination.jpg') as ImageSourcePropType,
  },
  {
    label: 'Calving',
    icon: Baby,
    route: '/health/calving',
    color: '#16A34A',
    bg: '#DCFCE7',
    image: require('../../assets/images/calving.jpg') as ImageSourcePropType,
  },
  {
    label: 'Vaccination',
    icon: Syringe,
    route: '/health/vaccination',
    color: '#EA580C',
    bg: '#FFEDD5',
    image: require('../../assets/images/vaccination.jpg') as ImageSourcePropType,
  },
  {
    label: 'Deworming',
    icon: Pill,
    route: '/health/deworming',
    color: '#DC2626',
    bg: '#FEE2E2',
    image: require('../../assets/images/deworming.jpg') as ImageSourcePropType,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { animals, vaccinations, dewormings, inseminations } = useStore();

  const totalAnimals = animals.length;
  const pregnantCount = animals.filter(a => a.repro_status === 'Pregnant').length;

  // A health task is "due" when its next due date is today, within the soon window, or overdue.
  const isDue = (dateStr?: string) => !!dateStr && getDueDateStatus(dateStr) !== 'upcoming';

  const vaccDue = vaccinations.filter(v => isDue(v.next_due_date)).length;
  const dewormDue = dewormings.filter(d => isDue(d.next_due_date)).length;
  const insemDue = inseminations.filter(
    i => (i.pregnancy_status === 'Pending' || i.pregnancy_status === 'Inseminated') && isDue(i.pregnancy_check_date)
  ).length;
  const alertsCount = vaccDue + dewormDue + insemDue;

  const STATS = [
    { label: 'Total Animals', value: totalAnimals, icon: TrendingUp, color: Colors.primary, bg: '#E0EAFA', route: '/animals' },
    { label: 'Pregnant',      value: pregnantCount, icon: Baby,       color: Colors.success,  bg: Colors.successLight, route: '/animals?filter=Pregnant' },
    { label: 'Alerts Due',   value: alertsCount,  icon: AlertCircle, color: Colors.danger,   bg: Colors.dangerLight, route: '/animals' },
  ];

  const [imgFailed, setImgFailed] = React.useState<Record<string, boolean>>({});

  const ALERTS = [
    { id: '1', title: 'Vaccinations', count: vaccDue, color: Colors.warning, icon: Syringe, route: '/health/vaccination' },
    { id: '2', title: 'Deworming', count: dewormDue, color: Colors.danger, icon: Pill, route: '/health/deworming' },
    { id: '3', title: 'Insemination', count: insemDue, color: Colors.info, icon: Dna, route: '/health/insemination' },
  ];

  return (
    <AppBackground>
    <SafeAreaView style={s.safe}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      {/* ── Header ── */}
      <GradientHeader
        title="Herdly"
        subtitle="Livestock Management"
      />

      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats Row ── */}
        <View style={s.statsRow}>
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <TouchableOpacity 
                key={stat.label} 
                style={[s.statCard, { borderTopColor: stat.color }]}
                activeOpacity={0.8}
                onPress={() => router.push(stat.route as any)}
              >
                <View style={[s.statIconBox, { backgroundColor: stat.bg }]}>
                  <Icon color={stat.color} size={18} strokeWidth={2.5} />
                </View>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Register Animal button ── */}
        <TouchableOpacity
          style={s.registerBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/animals/register' as any)}
        >
          <View style={s.registerBtnIcon}>
            <PlusCircle color="#fff" size={26} strokeWidth={2.5} />
          </View>
          <View style={s.registerBtnTextWrap}>
            <Text style={s.registerBtnTitle}>Register New Animal</Text>
            <Text style={s.registerBtnSub}>Add to your herd in seconds</Text>
          </View>
          <ChevronRight color="#fff" size={22} strokeWidth={2.5} style={s.registerBtnArrow} />
        </TouchableOpacity>

        {/* ── Quick Actions ── */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <TouchableOpacity
                key={action.label}
                style={[s.actionCard, { backgroundColor: action.bg, borderColor: action.color + '55' }]}
                activeOpacity={0.85}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[s.actionImageBox, { backgroundColor: action.color }]}>
                  {action.image && !imgFailed[action.label] ? (
                    <Image
                      source={action.image}
                      style={s.actionImage}
                      resizeMode="cover"
                      onError={() => setImgFailed((f) => ({ ...f, [action.label]: true }))}
                    />
                  ) : (
                    <Icon color="#fff" size={26} strokeWidth={2} />
                  )}
                </View>
                <Text style={[s.actionLabel, { color: action.color }]}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Alerts (single-row grid) ── */}
        <Text style={s.sectionTitle}>Alerts &amp; Records</Text>
        <View style={s.alertsGrid}>
          {ALERTS.map((alert) => {
            const Icon = alert.icon;
            return (
              <TouchableOpacity
                key={alert.id}
                style={[s.alertCard, { borderTopColor: alert.color }]}
                activeOpacity={0.8}
                onPress={() => router.push(alert.route as any)}
              >
                <View style={[s.alertIconBox, { backgroundColor: alert.color + '1A' }]}>
                  <Icon color={alert.color} size={22} strokeWidth={2.2} />
                </View>
                <Text style={[s.alertCardValue, { color: alert.color }]}>{alert.count}</Text>
                <Text style={s.alertCardTitle} numberOfLines={1}>{alert.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
    </AppBackground>
  );
}

const CARD_W = (width - 48) / 2;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  // Header
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  appName: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  appSub:  { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 1 },


  // Body
  body: { flex: 1, backgroundColor: 'transparent', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  bodyContent: { padding: 16 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    ...Shadows.md,
  },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '800', textAlign: 'center', marginTop: 2, letterSpacing: 0.3 },

  // Register button
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 22,
    ...Shadows.brand,
  },
  registerBtnIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  registerBtnTextWrap: { flex: 1 },
  registerBtnTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
  registerBtnSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700', marginTop: 2 },
  registerBtnArrow: { marginLeft: 6 },

  // Actions grid
  sectionTitle: { fontSize: 17, fontWeight: '900', color: Colors.textPrimary, marginBottom: 12, letterSpacing: 0.2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 22 },
  actionCard: {
    width: CARD_W,
    borderRadius: Radius.xl,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    gap: 12,
    ...Shadows.sm,
  },
  actionImageBox: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  actionImage: { width: 60, height: 60 },
  actionLabel: { fontSize: 14, fontWeight: '800', textAlign: 'center' },

  // Alerts (single-row grid)
  alertsGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  alertCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderTopWidth: 3,
    ...Shadows.sm,
  },
  alertIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  alertCardValue: { fontSize: 24, fontWeight: '900' },
  alertCardTitle: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
});

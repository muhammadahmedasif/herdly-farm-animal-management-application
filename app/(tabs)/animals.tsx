import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Circle, Filter, Plus, Search } from 'lucide-react-native';
import { useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Colors, Shadows, Radius } from '../../constants/Colors';
import { SPECIES_EMOJI } from '../../constants/livestock';
import { useStore } from '../../store/StoreContext';
import { GradientHeader, AppBackground } from '../../components/ui';
import { formatAge, formatDob } from '../../utils/date';
import { useNow } from '../../utils/useNow';

const FILTERS = ['All', 'Pregnant', 'Inseminated', 'Open', 'Dry', 'Breeding', 'Non-Breeding', 'Calf'];

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  Pregnant: { color: '#10B981', bg: '#D1FAE5' }, // Emerald
  Inseminated: { color: '#3B82F6', bg: '#DBEAFE' }, // Blue
  Open: { color: '#F59E0B', bg: '#FEF3C7' }, // Amber
  'Breeding': { color: '#6366F1', bg: '#E0E7FF' }, // Indigo
  'Non-Breeding': { color: '#6B7280', bg: '#F3F4F6' }, // Gray
  Dry: { color: '#8B5CF6', bg: '#EDE9FE' }, // Purple
  Calf: { color: '#EC4899', bg: '#FCE7F3' }, // Pink
};

export default function AnimalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [query, setQuery] = useState('');

  const { animals } = useStore();
  const now = useNow();

  const activeFilter = params.filter || 'All';

  const filtered = animals.filter((a) => {
    const matchFilter = activeFilter === 'All' || a.repro_status === activeFilter;
    const matchQuery = !query ||
      a.tag_number.toLowerCase().includes(query.toLowerCase()) ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.species.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  return (
    <AppBackground>
    <SafeAreaView style={s.safe}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />

      {/* Premium Header */}
      <GradientHeader title="Herdly Register" subtitle="Animal Registry" />

      {/* Search Bar */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Search color={Colors.textMuted} size={20} strokeWidth={2.5} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by tag, name, or species..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Filter Chips */}
      <View style={s.filterRow}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={f => f}
          contentContainerStyle={{ paddingRight: 16 }}
          renderItem={({ item: f }) => {
            const active = activeFilter === f;
            return (
              <TouchableOpacity
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/animals', params: f === 'All' ? {} : { filter: f } })}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Animal List */}
      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Filter color={Colors.textMuted} size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <Text style={s.emptyText}>No animals found matching criteria.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.repro_status] || { color: '#6B7280', bg: '#F3F4F6' };

          const ageStr = formatAge(item.date_of_birth, now);
          const formattedDob = formatDob(item.date_of_birth, item.dob_is_estimated);

          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/animals/[id]', params: { id: item.id } } as any)}
            >
              {/* Card Header (large identifying photo) */}
              <View style={s.cardHead}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={s.cardHeadImage} />
                ) : (
                  <View style={[s.cardHeadImage, s.cardHeadImagePlaceholder]}>
                    <Text style={s.cardHeadEmoji}>{SPECIES_EMOJI[item.species] || '🐄'}</Text>
                  </View>
                )}
                <View style={s.cardHeadOverlay} />
                <View style={s.cardHeadText}>
                  <Text style={s.cardHeadLabel}>Cattle Name</Text>
                  <Text style={s.cardHeadValue} numberOfLines={1}>{item.name}</Text>
                  <View style={s.cardHeadTag}>
                    <Text style={s.cardHeadTagText}>{item.tag_number}</Text>
                  </View>
                </View>
              </View>

              {/* Card Body */}
              <View style={s.cardBody}>
                <Row label="Species" value={`${item.breed} ${item.species}`} />
                <Row label="Sex" value={item.sex} />
                <Row label="Age" value={ageStr} />
                <Row label="Date of Birth" value={formattedDob} />
              </View>

              {/* Footer Status Pill */}
              <View style={[s.cardFoot, { backgroundColor: cfg.bg }]}>
                <Circle color={cfg.color} fill={cfg.color} size={10} />
                <Text style={[s.footText, { color: cfg.color }]}>{item.repro_status}</Text>
                <ChevronRight color={cfg.color} size={20} strokeWidth={3} style={{ marginLeft: 'auto' }} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Premium Animated FAB */}
      <TouchableOpacity
        style={s.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/animals/register' as any)}
      >
        <Plus color="#fff" size={32} strokeWidth={3.5} />
      </TouchableOpacity>

    </SafeAreaView>
    </AppBackground>
  );
}

function Row({ label, value }: { label: string; value: string; }) {
  return (
    <View style={s.gridItem}>
      <Text style={s.gridLabel}>{label}</Text>
      <Text style={s.gridValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  searchWrap: {
    backgroundColor: 'rgba(255,255,255,0.62)', paddingHorizontal: 16,
    paddingTop: 20, paddingBottom: 16,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.sm,
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.textPrimary, padding: 0, fontWeight: '600' },

  filterRow: {
    backgroundColor: 'transparent', paddingHorizontal: 16, paddingBottom: 16,
  },
  chip: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 24, backgroundColor: '#fff',
    marginRight: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    ...Shadows.sm,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: '800', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, backgroundColor: 'transparent', flexGrow: 1 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '700' },

  card: {
    backgroundColor: '#fff', borderRadius: Radius.xl, marginBottom: 20,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  cardHead: {
    position: 'relative',
    height: 150,
    backgroundColor: Colors.primary,
    justifyContent: 'flex-end',
  },
  cardHeadImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: 150,
    backgroundColor: Colors.primary,
  },
  cardHeadImagePlaceholder: {
    alignItems: 'center', justifyContent: 'center',
  },
  cardHeadEmoji: { fontSize: 56 },
  cardHeadOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 39, 66, 0.42)',
  },
  cardHeadText: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 24,
  },
  cardHeadTag: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12,
  },
  cardHeadTagText: { fontSize: 15, fontWeight: '900', color: '#fff' },
  cardHeadLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardHeadValue: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 2 },

  cardBody: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 20, gap: 0,
  },
  gridItem: { width: '50%', paddingVertical: 10, paddingHorizontal: 4 },
  gridLabel: { fontSize: 11, color: '#6B7280', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  gridValue: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginTop: 4 },

  cardFoot: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 10,
  },
  footText: { fontSize: 15, fontWeight: '900' },

  fab: {
    position: 'absolute',
    bottom: 28, right: 24,
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  }
});

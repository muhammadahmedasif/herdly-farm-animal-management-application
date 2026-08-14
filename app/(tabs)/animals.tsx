import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Circle, Filter, Plus, Search } from 'lucide-react-native';
import { useState } from 'react';
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius } from '../../constants/Colors';
import { SPECIES_EMOJI, Species } from '../../constants/livestock';
import { useStore } from '../../store/StoreContext';
import { GradientHeader, AppBackground } from '../../components/ui';
import { formatAge, formatDob } from '../../utils/date';
import { useNow } from '../../utils/useNow';
import { getEffectiveReproStatus } from '../../utils/animal';
import { resolveAnimalImageUri } from '../../database';

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
    // Resolve the lifecycle-aware status (calves that have matured are treated
    // as adults for filtering purposes without mutating the stored value).
    const effectiveStatus = getEffectiveReproStatus(a);
    const matchFilter = activeFilter === 'All' || effectiveStatus === activeFilter;
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

      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <GradientHeader title="Herdly Register" subtitle="Animal Registry" />
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
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Filter color={Colors.textMuted} size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <Text style={s.emptyText}>No animals found matching criteria.</Text>
          </View>
        }
        renderItem={({ item }) => {
          // Use effective status for display so matured calves appear correctly.
          const effectiveStatus = getEffectiveReproStatus(item);
          const cfg = STATUS_CONFIG[effectiveStatus] || { color: '#6B7280', bg: '#F3F4F6' };

          const ageStr = formatAge(item.date_of_birth, now);
          const formattedDob = formatDob(item.date_of_birth, item.dob_is_estimated);

          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/animals/[id]', params: { id: item.id } } as any)}
            >
              {/* Card Header — square photo on left, name + tag centred in blue area */}
              <View style={s.cardHead}>
                {/* Square photo / emoji panel */}
                <AnimalPhoto uri={item.image_url} species={item.species} />

                {/* Name + tag centred in remaining space */}
                <View style={s.cardHeadInfo}>
                  <Text style={s.cardHeadLabel}>CATTLE NAME</Text>
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
                <Text style={[s.footText, { color: cfg.color }]}>{effectiveStatus}</Text>
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

import { MaterialCommunityIcons } from '@expo/vector-icons';

/** Square photo panel on the left of the blue header. Falls back to an icon. */
function AnimalPhoto({ uri, species }: { uri?: string; species: Species; }) {
  const [err, setErr] = useState(false);
  const resolved = resolveAnimalImageUri(uri);

  const getIconName = (s: Species) => {
    switch (s) {
      case 'Cattle': return 'cow';
      case 'Sheep': return 'sheep';
      case 'Goat': return 'goat'; // MaterialCommunityIcons has 'goat' ? wait, let me check. If not, fallback to 'cow' or 'sheep'
      default: return 'cow';
    }
  };

  if (!resolved || err) {
    return (
      <View style={[s.cardHeadPhoto, s.cardHeadPhotoPlaceholder]}>
        <MaterialCommunityIcons name={species === 'Cattle' ? 'cow' : species === 'Sheep' ? 'sheep' : 'paw'} size={48} color="rgba(255,255,255,0.7)" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: resolved }}
      style={s.cardHeadPhoto}
      resizeMode="cover"
      onError={() => setErr(true)}
    />
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

  // ── Card header: navy blue row with square photo on the left ──────────────
  cardHead: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    height: 120,
    alignItems: 'stretch',
  },
  // Square photo / emoji panel — same width as the header height
  cardHeadPhoto: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRightWidth: 2,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  cardHeadPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadEmoji: { fontSize: 52 },

  // Text area — centred vertically in the remaining blue space
  cardHeadInfo: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  cardHeadLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardHeadValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.2,
  },
  cardHeadTag: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  cardHeadTagText: { fontSize: 14, fontWeight: '900', color: '#fff' },

  // ── Card body (white details grid) ───────────────────────────────────────
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
    bottom: 100, right: 24,
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  }
});

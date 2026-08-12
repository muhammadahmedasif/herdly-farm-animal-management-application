import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Edit2, Trash2, Calendar, Tag as TagIcon, Hash, Activity } from 'lucide-react-native';
import { calculateAge, formatDob } from '../../utils/date';
import { getEffectiveLactation } from '../../utils/lactation';
import { useNow } from '../../utils/useNow';
import { Colors, Shadows } from '../../constants/Colors';
import { AppBackground } from '../../components/ui';
import { useStore } from '../../store/StoreContext';

export default function AnimalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { animals, deleteAnimal } = useStore();

  const animal = animals.find(a => a.id === id);
  const now = useNow();
  const [imgError, setImgError] = useState(false);

  if (!animal) {
    return (
      <AppBackground>
      <View style={s.center}>
        <Text style={s.errorText}>Animal not found.</Text>
      </View>
      </AppBackground>
    );
  }

  const handleDelete = () => {
    Alert.alert('Delete Animal', 'Are you sure you want to delete this animal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteAnimal(animal.id);
        router.back();
      }},
    ]);
  };

  const { years, months, valid } = calculateAge(animal.date_of_birth, now);
  const ageStr = valid
    ? years > 0 && months > 0
      ? `${years} years ${months} months`
      : years > 0
        ? `${years} years`
        : `${months} months`
    : 'N/A';

  const formattedDob = formatDob(animal.date_of_birth, animal.dob_is_estimated);

  return (
    <AppBackground>
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      
      {/* Premium Profile Card */}
      <View style={s.headerCard}>
        {animal.image_url && !imgError ? (
          <View style={s.photoCol}>
            <Image source={{ uri: animal.image_url }} style={s.heroImage} resizeMode="contain" onError={() => setImgError(true)} />
          </View>
        ) : (
          <View style={s.photoColPlaceholder}>
            <TagIcon color="#fff" size={40} />
          </View>
        )}
        <View style={s.headerCardBody}>
          <Text style={s.nameText}>{animal.name}</Text>
          <Text style={s.tagText}>{animal.tag_number}</Text>
          <View style={s.statusBadge}>
            <Text style={s.statusText}>{animal.repro_status}</Text>
          </View>
        </View>
      </View>

      {/* Details Grid */}
      <View style={s.card}>
        <View style={s.cardHeaderRow}>
          <View style={s.iconBg}><Activity color="#fff" size={20} /></View>
          <Text style={s.sectionHeader}>Details</Text>
        </View>

        <View style={s.infoRow}>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Species</Text>
            <Text style={s.infoValue}>{animal.species}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Breed</Text>
            <Text style={s.infoValue}>{animal.breed}</Text>
          </View>
        </View>
        
        <View style={s.infoRow}>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Sex</Text>
            <Text style={s.infoValue}>{animal.sex}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Color</Text>
            <Text style={s.infoValue}>{animal.color || 'N/A'}</Text>
          </View>
        </View>

        <View style={s.infoRow}>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Current Age</Text>
            <Text style={s.infoValue}>{ageStr}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Date of Birth</Text>
            <Text style={s.infoValue}>{formattedDob}</Text>
          </View>
        </View>

        {animal.sex === 'Female' && (
          <View style={s.infoRow}>
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>Lactation</Text>
              <Text style={s.infoValue}>
                {animal.lactation_number ? getEffectiveLactation(animal) : 'N/A'}
              </Text>
            </View>
            {animal.last_insemination_date ? (
              <View style={s.infoBlock}>
                <Text style={s.infoLabel}>Last Insemination</Text>
                <Text style={s.infoValue}>{animal.last_insemination_date}</Text>
              </View>
            ) : <View style={s.infoBlock} />}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={s.editBtn} onPress={() => router.push({ pathname: '/animals/edit', params: { id: animal.id } } as any)} activeOpacity={0.8}>
          <Edit2 color="#fff" size={20} style={{ marginRight: 8 }} />
          <Text style={s.editBtnText}>Edit Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Trash2 color={Colors.danger} size={20} style={{ marginRight: 8 }} />
          <Text style={s.deleteBtnText}>Delete Animal</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </AppBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6B7280' },

  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    ...Shadows.lg,
  },
  photoCol: {
    width: 120, height: 120, borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  photoColPlaceholder: {
    width: 120, height: 120, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  heroImage: {
    width: 120, height: 120,
    backgroundColor: '#F1F5F9',
  },
  headerCardBody: {
    flex: 1,
    marginLeft: 16,
    alignItems: 'flex-start',
  },
  nameText: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, marginBottom: 4 },
  tagText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, marginBottom: 14 },
  statusBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: { fontSize: 14, fontWeight: '800', color: Colors.success },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  iconBg: {
    backgroundColor: Colors.primary, width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  sectionHeader: { fontSize: 20, fontWeight: '900', color: Colors.primary },

  infoRow: { flexDirection: 'row', marginBottom: 20 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '800', color: '#1F2937' },

  actions: { gap: 12 },
  editBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary,
    paddingVertical: 18, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  editBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  
  deleteBtn: {
    flexDirection: 'row', backgroundColor: '#FEE2E2',
    paddingVertical: 18, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { color: Colors.danger, fontSize: 17, fontWeight: '900' },
});

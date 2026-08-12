import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { Beaker, Calendar, Check, Lock, Plus, Stethoscope } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { AppBackground } from '../../components/ui';
import { Colors } from '../../constants/Colors';
import { useStore } from '../../store/StoreContext';
import { Insemination } from '../../types';
import { addDays, getGestationDays, parseDate, toDateString } from '../../utils/date';
import { getEffectiveLactation, PREGNANCY_CHECK_DAYS } from '../../utils/lactation';
import { useNow } from '../../utils/useNow';

// Statuses that count as an active (unresolved) pregnancy/cycle
const ACTIVE_INSEM_STATUSES = ['Pending', 'Inseminated', 'Pregnant', 'Repeat'];

export default function InseminationScreen() {
  const router = useRouter();
  const { animals, inseminations, addInsemination, updateInsemination, updateAnimal } = useStore();
  const now = useNow();

  // Only show active females
  const femaleAnimals = animals.filter(a => a.sex === 'Female');

  const [showForm, setShowForm] = useState(false);

  // Form State
  const [animalId, setAnimalId] = useState('');
  const [lactation, setLactation] = useState('');
  const [aiDate, setAiDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [company, setCompany] = useState('');
  const [bull, setBull] = useState('');
  const [notes, setNotes] = useState('');
  const [pregnancyStatus, setPregnancyStatus] = useState<'Inseminated' | 'Pregnant' | 'Open' | 'Dry'>('Inseminated');

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) setAiDate(selectedDate);
  };

  const [editingId, setEditingId] = useState<string | null>(null);

  // Auto-fill effective lactation number from the selected animal's record (read-only)
  useEffect(() => {
    if (!animalId) {
      setLactation('');
      return;
    }
    const animal = animals.find(a => a.id === animalId);
    setLactation(String(getEffectiveLactation(animal)));
  }, [animalId, animals]);

  const handleSave = async () => {
    if (!animalId || !lactation.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Animal and Lactation No. are required.' });
      return;
    }

    // Prevent duplicate active insemination for a new record
    if (!editingId) {
      const dup = inseminations.find(i => i.animal_id === animalId && ACTIVE_INSEM_STATUSES.includes(i.pregnancy_status));
      if (dup) {
        const a = animals.find(x => x.id === animalId);
        Toast.show({ type: 'error', text1: 'Duplicate Insemination', text2: `${a?.tag_number || 'This animal'} already has an active insemination record.` });
        return;
      }
    }

    const aiDateStr = toDateString(aiDate);
    const pcDate = addDays(aiDateStr, PREGNANCY_CHECK_DAYS);

    // Calculate expected Delivery only if Pregnant
    let expectedCalving = '';
    if (pregnancyStatus === 'Pregnant') {
      expectedCalving = addDays(aiDateStr, getGestationDays(animals.find(a => a.id === animalId)?.species));
    }

    if (editingId) {
      const existing = inseminations.find(i => i.id === editingId);
      if (existing) {
        const updated = {
          ...existing,
          animal_id: animalId,
          lactation_number: lactation,
          ai_date: aiDateStr,
          semen_company: company,
          bull_name: bull,
          pregnancy_check_date: pcDate,
          pregnancy_status: pregnancyStatus as any,
          expected_calving_date: expectedCalving,
          notes,
        };
        await updateInsemination(updated);
        // Sync animal repro status
        const animal = animals.find(a => a.id === animalId);
        if (animal) await updateAnimal({ ...animal, repro_status: pregnancyStatus as any });
        Toast.show({ type: 'success', text1: 'Updated', text2: 'Insemination record updated.' });
      }
    } else {
      const newRecord: Insemination = {
        id: Math.random().toString(36).substring(7),
        animal_id: animalId,
        lactation_number: lactation,
        ai_date: aiDateStr,
        semen_company: company,
        bull_name: bull,
        pregnancy_check_date: pcDate,
        pregnancy_status: pregnancyStatus as any,
        expected_calving_date: expectedCalving,
        notes,
        created_at: new Date().toISOString(),
      };
      await addInsemination(newRecord);
      // Sync animal repro status
      const animal = animals.find(a => a.id === animalId);
      if (animal) await updateAnimal({ ...animal, repro_status: pregnancyStatus as any });
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Insemination record added.' });
    }

    setShowForm(false);
    setEditingId(null);
    setAnimalId('');
    setLactation('');
    setCompany('');
    setBull('');
    setNotes('');
    setPregnancyStatus('Inseminated');
  };

  // Helper to calculate days since AI
  const getDaysSinceAI = (aiDateStr: string) => {
    const ai = parseDate(aiDateStr);
    if (isNaN(ai.getTime())) return 0;
    const diff = now.getTime() - ai.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
  };

  if (showForm) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <View style={s.iconBg}><Beaker color="#fff" size={20} /></View>
            <Text style={s.sectionHeader}>New Insemination</Text>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Select Animal *</Text>
            <View style={s.pickerContainer}>
              <Picker
                selectedValue={animalId}
                onValueChange={(id) => {
                  if (!id) { setAnimalId(''); return; }
                  const dup = inseminations.find(i => i.animal_id === id && i.id !== editingId && ACTIVE_INSEM_STATUSES.includes(i.pregnancy_status));
                  if (dup) {
                    const a = animals.find(x => x.id === id);
                    Toast.show({ type: 'error', text1: 'Duplicate Insemination', text2: `${a?.tag_number || 'This animal'} already has an active insemination record.` });
                    return;
                  }
                  setAnimalId(id);
                }}
                style={s.picker}
              >
                <Picker.Item label="-- Select Female Animal --" value="" />
                {femaleAnimals.map(a => (
                  <Picker.Item key={a.id} label={`${a.tag_number} - ${a.name}`} value={a.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={s.row}>
            <View style={[s.inputGroup, { flex: 1, paddingRight: 6 }]}>
              <Text style={s.label}>Lactation No.</Text>
              <View style={[s.inputWrapper, !animalId && s.inputDisabled]}>
                <Lock color={Colors.textMuted} size={16} style={{ marginLeft: 16, marginRight: 4 }} />
                <TextInput
                  style={[s.input, { paddingLeft: 4 }]}
                  value={lactation}
                  onChangeText={setLactation}
                  editable={false}
                  placeholder="Select animal"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <Text style={s.autoHint}>Auto-filled from animal record</Text>
            </View>
            <View style={[s.inputGroup, { flex: 1, paddingLeft: 6 }]}>
              <Text style={s.label}>Date of Insemination</Text>
              {Platform.OS === 'web' ? (
                React.createElement('input', {
                  type: 'date',
                  value: toDateString(aiDate),
                  max: toDateString(new Date()),
                  onChange: (e: any) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) setAiDate(d);
                  },
                  style: {
                    padding: '14px 16px', fontSize: '16px',
                    fontWeight: '700', color: '#1F2937',
                    backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB',
                    borderRadius: '16px', cursor: 'pointer', outline: 'none',
                  }
                })
              ) : (
                <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                  <Calendar color={Colors.primary} size={18} style={{ marginRight: 8 }} />
                  <Text style={s.dateText}>{aiDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                </TouchableOpacity>
              )}

              {showDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={aiDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  style={Platform.OS === 'ios' ? { alignSelf: 'stretch', marginTop: 8 } : {}}
                />
              )}
            </View>
          </View>

          <View style={s.row}>
            <View style={[s.inputGroup, { flex: 1, paddingRight: 6 }]}>
              <Text style={s.label}>Bull ID / Name</Text>
              <View style={s.inputWrapper}>
                <TextInput style={s.input} value={bull} onChangeText={setBull} placeholder="e.g. B-99" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>
            <View style={[s.inputGroup, { flex: 1, paddingLeft: 6 }]}>
              <Text style={s.label}>Semen Company</Text>
              <View style={s.inputWrapper}>
                <TextInput style={s.input} value={company} onChangeText={setCompany} placeholder="e.g. ABS" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Status *</Text>
            <View style={s.pickerContainer}>
              <Picker selectedValue={pregnancyStatus} onValueChange={(v) => setPregnancyStatus(v as any)} style={s.picker}>
                <Picker.Item label="Inseminated" value="Inseminated" />
                <Picker.Item label="Pregnant" value="Pregnant" />
                <Picker.Item label="Open" value="Open" />
                <Picker.Item label="Dry" value="Dry" />
              </Picker>
            </View>
          </View>

          {pregnancyStatus === 'Pregnant' && (() => {
            const animal = animals.find(a => a.id === animalId);
            const gestDays = getGestationDays(animal?.species);
            const calvDate = new Date(addDays(toDateString(aiDate), gestDays));
            return (
              <View style={s.calvingPreview}>
                <Text style={s.calvingPreviewLabel}>📅 Expected Delivery Date</Text>
                <Text style={s.calvingPreviewDate}>{calvDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                <Text style={s.calvingPreviewSub}>Based on {animal?.species || 'Cow'} DElivery Estimated: {gestDays} days from Insemination date</Text>
              </View>
            );
          })()}

          <View style={s.inputGroup}>
            <Text style={s.label}>Notes</Text>
            <View style={s.inputWrapper}>
              <TextInput style={[s.input, { height: 80 }]} value={notes} onChangeText={setNotes} multiline placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Check color="#fff" size={24} style={{ marginRight: 8 }} />
          <Text style={s.saveBtnText}>{editingId ? 'Update Record' : 'Save Record'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowForm(false); setEditingId(null); }} activeOpacity={0.8}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={s.container}>
        <FlatList
          contentContainerStyle={s.listContent}
          data={inseminations.filter(i => i.pregnancy_status !== 'Open')}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Stethoscope color={Colors.textMuted} size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <Text style={s.emptyText}>No records found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const animal = animals.find(a => a.id === item.animal_id);
            const days = getDaysSinceAI(item.ai_date);

            let statusColor = Colors.info;
            let statusBg = Colors.infoLight;
            if (item.pregnancy_status === 'Pregnant') { statusColor = '#10B981'; statusBg = '#D1FAE5'; }
            if (item.pregnancy_status === 'Open') { statusColor = '#F59E0B'; statusBg = '#FEF3C7'; }
            if ((item.pregnancy_status as any) === 'Dry') { statusColor = '#8B5CF6'; statusBg = '#EDE9FE'; }

            // Recalculate expected Delivery using species gestation
            const gestDays = getGestationDays(animal?.species);
            const computedCalving = (() => {
              const d = new Date(addDays(item.ai_date, gestDays));
              return d;
            })();

            return (
              <TouchableOpacity
                style={s.listCard}
                activeOpacity={0.9}
                onPress={() => {
                  setEditingId(item.id);
                  setAnimalId(item.animal_id);
                  setAiDate(parseDate(item.ai_date));
                  setCompany(item.semen_company || '');
                  setBull(item.bull_name || '');
                  setNotes(item.notes || '');
                  setPregnancyStatus((item.pregnancy_status as any) === 'Pending' ? 'Inseminated' : item.pregnancy_status as any);
                  setShowForm(true);
                }}
              >
                <View style={s.listCardHead}>
                  <View>
                    <Text style={s.listCardTitle}>{animal?.name || animal?.tag_number || 'Unknown'}</Text>
                    <Text style={s.lactationText}>Lactation: {getEffectiveLactation(animal)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[s.listCardStatus, { color: statusColor }]}>{item.pregnancy_status}</Text>
                    </View>
                    <Text style={s.daysText}>{days} days since Insemination</Text>
                  </View>
                </View>

                <View style={s.listCardBody}>
                  <View style={s.gridRow}>
                    <Text style={s.gridLabel}>Insemination Date:</Text>
                    <Text style={s.gridValue}>{parseDate(item.ai_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <View style={s.gridRow}>
                    <Text style={s.gridLabel}>Pregnancy Check Due:</Text>
                    <Text style={[s.gridValue, { color: '#EF4444' }]}>{parseDate(item.pregnancy_check_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  {item.pregnancy_status === 'Pregnant' && (
                    <View style={[s.gridRow, { marginTop: 4 }]}>
                      <Text style={s.gridLabel}>Expected Delivery:</Text>
                      <Text style={[s.gridValue, { color: '#10B981' }]}>
                        {computedCalving.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  )}
                  {item.pregnancy_status === 'Pregnant' && (
                    <View style={[s.gridRow, { marginTop: 4 }]}>
                      <Text style={s.gridLabel}>Pregnancy Days:</Text>
                      <Text style={[s.gridValue, { color: '#10B981' }]}>{days} Days</Text>
                    </View>
                  )}
                  {['Inseminated', 'Pending'].includes(item.pregnancy_status as any) && (
                    <View style={[s.gridRow, { marginTop: 4 }]}>
                      <Text style={s.gridLabel}>Expected Delivery:</Text>
                      <Text style={[s.gridValue, { color: '#6366F1' }]}>
                        {computedCalving.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  )}
                  {['Inseminated', 'Pending'].includes(item.pregnancy_status as any) && (
                    <View style={[s.gridRow, { marginTop: 4 }]}>
                      <Text style={s.gridLabel}>Pregnancy Days:</Text>
                      <Text style={[s.gridValue, { color: '#6366F1' }]}>{days} Days</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
          <Plus color="#fff" size={32} strokeWidth={3.5} />
        </TouchableOpacity>
      </SafeAreaView>
    </AppBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16 },
  listContent: { padding: 16, paddingBottom: 120 },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconBg: { backgroundColor: Colors.primary, width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sectionHeader: { fontSize: 20, fontWeight: '900', color: Colors.primary },

  row: { flexDirection: 'row', alignItems: 'center' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 8, marginLeft: 2, letterSpacing: 0.2 },

  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, minHeight: 56, paddingHorizontal: 16 },
  inputDisabled: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  autoHint: { fontSize: 11, color: '#6B7280', fontWeight: '700', marginTop: 6, marginLeft: 4 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingHorizontal: 0, paddingVertical: 16, fontSize: 16, color: '#1F2937', fontWeight: '600' },

  pickerContainer: { justifyContent: 'center' },
  picker: { height: 56, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, color: '#1F2937', paddingHorizontal: 12 },

  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
  dateText: { fontSize: 16, color: '#1F2937', fontWeight: '700' },

  saveBtn: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  cancelBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB', paddingVertical: 16, borderRadius: 20, alignItems: 'center', marginTop: 12 },
  cancelBtnText: { color: '#6B7280', fontSize: 16, fontWeight: '800' },

  empty: { paddingTop: 80, alignItems: 'center' },
  emptyText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '700' },

  listCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
  },
  listCardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16 },
  listCardTitle: { fontSize: 20, fontWeight: '900', color: '#1F2937' },
  lactationText: { fontSize: 13, color: '#6B7280', fontWeight: '700', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 4 },
  listCardStatus: { fontSize: 14, fontWeight: '900' },
  daysText: { fontSize: 12, color: '#6B7280', fontWeight: '800', textAlign: 'right' },

  listCardBody: { gap: 8 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridLabel: { fontSize: 13, color: '#6B7280', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  gridValue: { fontSize: 15, color: '#1F2937', fontWeight: '800' },

  calvingPreview: {
    backgroundColor: '#D1FAE5', borderRadius: 16, padding: 16, marginBottom: 18,
    borderWidth: 1.5, borderColor: '#6EE7B7',
  },
  calvingPreviewLabel: { fontSize: 12, fontWeight: '800', color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  calvingPreviewDate: { fontSize: 20, fontWeight: '900', color: '#065F46', marginBottom: 4 },
  calvingPreviewSub: { fontSize: 12, color: '#6B7280', fontWeight: '700' },

  gestationNote: { marginTop: 8, backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  gestationNoteText: { fontSize: 11, color: '#059669', fontWeight: '800' },

  fab: {
    position: 'absolute', bottom: 28, right: 24, width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
});

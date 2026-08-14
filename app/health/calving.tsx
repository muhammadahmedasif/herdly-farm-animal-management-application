import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Camera, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AppBackground, Select } from '../../components/ui';
import { useImagePicker } from '../../components/PhotoPicker';
import { Colors } from '../../constants/Colors';
import { useStore } from '../../store/StoreContext';
import { Calving, Sex } from '../../types';
import { uuid } from '../../utils/uuid';
import { persistAnimalImage, resolveAnimalImageUri } from '../../database/imageStorage';
import { addDays, dateFromAge, getGestationDays, parseDate, toDateString } from '../../utils/date';
import { getEffectiveReproStatus } from '../../utils/animal';
import { incrementLactation } from '../../utils/lactation';

type CalfAgeInput = { years: string; months: string };

export default function CalvingScreen() {
  const router = useRouter();
  const { animals, calvings, addCalving, updateCalving, deleteCalving, inseminations, recordCalving, updateAnimal, addAnimal } = useStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [animalId, setAnimalId] = useState('');
  const [calvingDate, setCalvingDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calfTag, setCalfTag] = useState('');
  const [calfName, setCalfName] = useState('');
  const [calfSex, setCalfSex] = useState<Sex>('Female');
  const [calfWeight, setCalfWeight] = useState('');
  const [birthDifficulty, setBirthDifficulty] = useState('');
  const [notes, setNotes] = useState('');
  const [childNumber, setChildNumber] = useState('');

  // Calf age/DOB toggle (same UX as register page)
  const [calfAgeMode, setCalfAgeMode] = useState<'dob' | 'age'>('dob');
  const [calfAgeInput, setCalfAgeInput] = useState<CalfAgeInput>({ years: '', months: '' });

  // Optional calf photo (kept as a local uri; not uploaded to a server)
  const [calfImage, setCalfImage] = useState<string | null>(null);
  const imagePicker = useImagePicker();

  const pickImage = async (setter: (uri: string | null) => void) => {
    imagePicker.open(setter);
  };

  // All female animals (mothers) can calve — not just pregnant ones, but exclude calves
  const motherAnimals = animals.filter(a => a.sex === 'Female' && getEffectiveReproStatus(a) !== 'Calf');

  // Calves: animals whose effective reproductive status is still "Calf"
  const calves = animals.filter(a => getEffectiveReproStatus(a) === 'Calf');

  const calfAgeLabel = (dob?: string) => {
    if (!dob) return '';
    const d = parseDate(dob);
    if (isNaN(d.getTime())) return '';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} old`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} old`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setCalvingDate(selectedDate);
  };

  // Derive calf DOB from toggle state
  const getCalfDob = (): string => {
    if (calfAgeMode === 'dob') {
      return calvingDate ? toDateString(calvingDate) : toDateString(new Date());
    }
    // age mode — compute from entered years/months
    const y = parseInt(calfAgeInput.years) || 0;
    const m = parseInt(calfAgeInput.months) || 0;
    return toDateString(dateFromAge(y, m));
  };

  // Auto-pick the calving date from the mother's expected delivery date
  const suppressAutoPick = useRef(false);
  useEffect(() => {
    if (suppressAutoPick.current) {
      suppressAutoPick.current = false;
      return;
    }
    if (!animalId) {
      setCalvingDate(null);
      return;
    }
    const animal = animals.find(a => a.id === animalId);
    const ins = inseminations.find(i => i.animal_id === animalId && i.pregnancy_status === 'Pregnant')
      || [...inseminations].filter(i => i.animal_id === animalId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    let expected = ins?.expected_calving_date || '';
    if (!expected && ins) expected = addDays(ins.ai_date, getGestationDays(animal?.species));
    if (!expected && animal?.last_insemination_date) expected = addDays(animal.last_insemination_date, getGestationDays(animal?.species));
    const d = expected ? parseDate(expected) : new Date();
    setCalvingDate(isNaN(d.getTime()) ? new Date() : d);
  }, [animalId]);

  const handleSave = async () => {
    const mother = animals.find(a => a.id === animalId);
    const matchingIns = inseminations.find(i => i.animal_id === animalId && i.pregnancy_status === 'Pregnant');

    const hasCalfInfo = (calfName && calfName.trim() !== '') || (calfWeight && calfWeight.trim() !== '') || calfImage;
    if (hasCalfInfo && (!calfTag || !calfTag.trim())) {
      Toast.show({ type: 'error', text1: 'Calf Tag Required', text2: 'Please enter a Tag Number to register the calf as an animal.' });
      return;
    }

    if (calfTag && calfTag.trim() !== '') {
      const duplicate = animals.find(a => a.tag_number.trim().toLowerCase() === calfTag.trim().toLowerCase());
      if (duplicate && (!editingId || (editingId && calves.findIndex(c => c.tag_number.trim().toLowerCase() === calfTag.trim().toLowerCase()) === -1))) {
        const originalRecord = calvings.find(c => c.id === editingId);
        const originalCalfTag = originalRecord?.calf_tag || '';
        if (!editingId || originalCalfTag.trim().toLowerCase() !== calfTag.trim().toLowerCase()) {
          Toast.show({ type: 'error', text1: 'Duplicate Tag', text2: `Tag "${calfTag}" is already in use by another animal.` });
          return;
        }
      }
    }

    // Compute calf DOB based on toggle
    const calfDob = getCalfDob();

    const record: Calving = {
      id: editingId || uuid(),
      animal_id: animalId,
      insemination_id: matchingIns?.id || '',
      calving_date: calvingDate ? toDateString(calvingDate) : '',
      calf_tag: calfTag.trim(),
      calf_name: calfName.trim(),
      calf_sex: calfSex,
      calf_weight_kg: parseFloat(calfWeight) || 0,
      complications: birthDifficulty,
      notes,
      created_at: new Date().toISOString(),
    };

    if (calfTag && calfTag.trim() !== '' && !editingId) {
      const calfId = uuid();
      const newCalf = {
        id: calfId,
        tag_number: calfTag.trim(),
        name: calfName.trim() || `Calf of ${mother?.tag_number || 'Unknown'}`,
        species: mother?.species || 'Cow',
        breed: mother?.breed || 'Unknown',
        sex: calfSex,
        date_of_birth: calfDob,
        dob_is_estimated: calfAgeMode === 'age',
        color: '',
        repro_status: 'Calf' as any,
        mother_id: animalId || undefined,
        child_number: childNumber.trim() || undefined,
        created_at: new Date().toISOString(),
        image_url: calfImage ?? '',
        notes: [
          `Mother Tag: ${mother?.tag_number || 'Unknown'}`,
          childNumber.trim() ? `Child No.: ${childNumber.trim()}` : '',
        ].filter(Boolean).join(' | '),
      };
      const motherUpdate = mother
        ? { ...mother, repro_status: 'Newly Calved' as any, lactation_number: incrementLactation(mother.lactation_number) }
        : undefined;
      await recordCalving(record, newCalf, motherUpdate);
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Calving record added.' });

    } else if (!editingId) {
      const motherUpdate = mother
        ? { ...mother, repro_status: 'Newly Calved' as any, lactation_number: incrementLactation(mother.lactation_number) }
        : undefined;
      await recordCalving(record, undefined, motherUpdate);
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Calving record added.' });
    } else {
      await updateCalving(record);
      if (calfTag && calfTag.trim() !== '') {
        const existingCalf = animals.find(a => a.tag_number.trim().toLowerCase() === calfTag.trim().toLowerCase());
        const calfImageUrl = calfImage ? await persistAnimalImage(existingCalf ? existingCalf.id : uuid(), calfImage) : '';
        if (existingCalf) {
          await updateAnimal({
            ...existingCalf,
            tag_number: calfTag.trim(),
            name: calfName.trim() || `Calf of ${mother?.tag_number || 'Unknown'}`,
            sex: calfSex,
            image_url: calfImageUrl || existingCalf.image_url,
            date_of_birth: calfDob,
            mother_id: animalId || existingCalf.mother_id,
            child_number: childNumber.trim() || existingCalf.child_number,
          });
        } else {
          const calfId = uuid();
          const finalCalfImageUrl = calfImage ? await persistAnimalImage(calfId, calfImage) : '';
          const newCalf = {
            id: calfId,
            tag_number: calfTag.trim(),
            name: calfName.trim() || `Calf of ${mother?.tag_number || 'Unknown'}`,
            species: mother?.species || 'Cow',
            breed: mother?.breed || 'Unknown',
            sex: calfSex,
            date_of_birth: calfDob,
            dob_is_estimated: calfAgeMode === 'age',
            color: '',
            repro_status: 'Calf' as any,
            mother_id: animalId || undefined,
            child_number: childNumber.trim() || undefined,
            created_at: new Date().toISOString(),
            image_url: finalCalfImageUrl,
            notes: [
              `Mother Tag: ${mother?.tag_number || 'Unknown'}`,
              childNumber.trim() ? `Child No.: ${childNumber.trim()}` : '',
            ].filter(Boolean).join(' | '),
          };
          await addAnimal(newCalf);
        }
      }
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Calving record updated.' });
    }

    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setAnimalId('');
    setCalvingDate(null);
    setCalfTag('');
    setCalfName('');
    setCalfWeight('');
    setBirthDifficulty('');
    setNotes('');
    setCalfSex('Female');
    setCalfImage(null);
    setChildNumber('');
    setCalfAgeMode('dob');
    setCalfAgeInput({ years: '', months: '' });
  };

  const handleCancel = () => resetForm();

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this calving record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCalving(editingId);
            Toast.show({ type: 'success', text1: 'Deleted', text2: 'Calving record deleted.' });
            handleCancel();
          }
        }
      ]
    );
  };

  if (showForm) {
    return (
      <AppBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
          <ScrollView style={s.container} contentContainerStyle={s.content}>
          <View style={s.card}>
            <Text style={s.sectionHeader}>{editingId ? 'Edit Calving Record' : 'New Calving Record'}</Text>

              {/* Mother Selection — ALL female animals */}
              <View style={s.inputGroup}>
                <Text style={s.label}>Select Mother (Optional)</Text>
                <View style={s.pickerWrapper}>
                  <Select
                    value={animalId}
                    onValueChange={(v) => {
                      setAnimalId(v);
                      setCalvingDate(null);
                    }}
                    options={[
                      { label: '-- No Mother / Unknown --', value: '' },
                      ...motherAnimals.map(a => ({ label: `${a.tag_number}${a.name && a.name !== 'Unknown' ? ' – ' + a.name : ''}`, value: a.id })),
                    ]}
                  />
                </View>
              </View>

            <View style={[s.inputGroup, { paddingRight: 8 }]}>
              <Text style={s.label}>Calving Date (Optional)</Text>
              {Platform.OS === 'web' ? (
                React.createElement('input', {
                  type: 'date',
                  value: calvingDate ? toDateString(calvingDate) : '',
                  max: toDateString(new Date()),
                  onChange: (e: any) => {
                    const v = e.target.value;
                    if (!v) { setCalvingDate(null); return; }
                    const d = new Date(v);
                    if (!isNaN(d.getTime())) setCalvingDate(d);
                  },
                  style: {
                    padding: '14px 16px', fontSize: '16px',
                    fontWeight: '700', color: '#1F2937',
                  backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0',
                  borderRadius: '16px', cursor: 'pointer', outline: 'none',
                  }
                })
              ) : (
                <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
                  <Text style={calvingDate ? s.dateText : [s.dateText, { color: '#9CA3AF' }]}>
                    {calvingDate ? toDateString(calvingDate) : 'Select date'}
                  </Text>
                </TouchableOpacity>
              )}

              {showDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={calvingDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  style={Platform.OS === 'ios' ? { alignSelf: 'flex-start', marginBottom: 12 } : {}}
                />
              )}
            </View>
            <View style={[s.inputGroup, { paddingLeft: 8 }]}>
              <Text style={s.label}>Calf Sex</Text>
              <View style={s.pickerWrapper}>
                <Select
                  value={calfSex}
                  onValueChange={(v) => setCalfSex(v as Sex)}
                  options={[{ label: 'Female', value: 'Female' }, { label: 'Male', value: 'Male' }]}
                />
              </View>
            </View>

            {/* Calf DOB / Age toggle */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Calf Date of Birth / Age</Text>
              <View style={s.ageToggleRow}>
                <TouchableOpacity
                  style={[s.toggleBtn, calfAgeMode === 'dob' && s.toggleBtnActive]}
                  onPress={() => setCalfAgeMode('dob')}
                  activeOpacity={0.8}
                >
                  <Text style={[s.toggleText, calfAgeMode === 'dob' && s.toggleTextActive]}>Date of Birth</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, calfAgeMode === 'age' && s.toggleBtnActive]}
                  onPress={() => setCalfAgeMode('age')}
                  activeOpacity={0.8}
                >
                  <Text style={[s.toggleText, calfAgeMode === 'age' && s.toggleTextActive]}>Enter Age</Text>
                </TouchableOpacity>
              </View>

              {calfAgeMode === 'age' ? (
                <View>
                  <View style={[s.inputGroup, { marginRight: 8, marginBottom: 0 }]}>
                    <Text style={s.label}>Years</Text>
                    <TextInput
                      style={s.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={calfAgeInput.years}
                      onChangeText={(v) => setCalfAgeInput({ ...calfAgeInput, years: v })}
                    />
                  </View>
                  <View style={[s.inputGroup, { marginLeft: 8, marginBottom: 0 }]}>
                    <Text style={s.label}>Months</Text>
                    <TextInput
                      style={s.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={calfAgeInput.months}
                      onChangeText={(v) => setCalfAgeInput({ ...calfAgeInput, months: v })}
                    />
                  </View>
                </View>
              ) : (
                <Text style={s.ageHint}>
                  Calf DOB will be set to: <Text style={{ fontWeight: '900', color: Colors.primary }}>{calvingDate ? toDateString(calvingDate) : 'Calving date'}</Text>
                </Text>
              )}
            </View>

            <View style={[s.inputGroup, { paddingRight: 8 }]}>
              <Text style={s.label}>Calf Name</Text>
              <TextInput style={s.input} value={calfName} onChangeText={setCalfName} placeholder="e.g. Nela" />
            </View>
            <View style={[s.inputGroup, { paddingLeft: 8 }]}>
              <Text style={s.label}>Calf Tag Number</Text>
              <TextInput style={s.input} value={calfTag} onChangeText={setCalfTag} placeholder="e.g. C-105" />
            </View>

            <View style={[s.inputGroup, { paddingRight: 8 }]}>
              <Text style={s.label}>Weight (kg)</Text>
              <TextInput style={s.input} value={calfWeight} onChangeText={setCalfWeight} placeholder="e.g. 28" keyboardType="numeric" />
            </View>
            <View style={[s.inputGroup, { paddingLeft: 8 }]}>
              <Text style={s.label}>Child No.</Text>
              <TextInput
                style={s.input}
                value={childNumber}
                onChangeText={setChildNumber}
                placeholder="e.g. 1st, 2nd..."
                keyboardType="numeric"
              />
            </View>

            <View style={s.photoField}>
              <TouchableOpacity style={s.photoBox} activeOpacity={0.8} onPress={() => pickImage(setCalfImage)}>
                {resolveAnimalImageUri(calfImage) ? (
                  <Image source={{ uri: resolveAnimalImageUri(calfImage) }} style={s.photoPreview} resizeMode="contain" />
                ) : (
                  <View style={s.photoPlaceholder}>
                    <Camera color={Colors.primary} size={26} />
                  </View>
                )}
                {resolveAnimalImageUri(calfImage) ? (
                  <TouchableOpacity style={s.photoRemove} activeOpacity={0.7} onPress={() => setCalfImage(null)}>
                    <X color="#fff" size={14} />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
              <View style={s.photoMeta}>
                <Text style={s.photoTitle}>Calf Photo</Text>
                <Text style={s.photoHint}>Optional · tap to add a calf picture</Text>
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Birth Difficulty</Text>
              <TextInput
                style={s.input}
                value={birthDifficulty}
                onChangeText={setBirthDifficulty}
                placeholder="e.g. Normal / Difficult / Assisted"
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Notes</Text>
              <TextInput style={[s.input, { height: 80 }]} value={notes} onChangeText={setNotes} multiline />
            </View>
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Text style={s.saveBtnText}>Save Record</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
              <Text style={s.deleteBtnText}>Delete Record</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
        </SafeAreaView>
        {imagePicker.modal}
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={s.container}>
        <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
        <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>


          {calvings.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No records found.</Text>
            </View>
          ) : (
            calvings.map(item => {
              const animal = animals.find(a => a.id === item.animal_id);
              const calf = animals.find(a => a.tag_number.trim().toLowerCase() === (item.calf_tag || '').trim().toLowerCase());
              return (
                <TouchableOpacity
                  key={item.id}
                  style={s.listCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    setEditingId(item.id);
                    suppressAutoPick.current = true;
                    setAnimalId(item.animal_id || '');
                    const d = parseDate(item.calving_date);
                    setCalvingDate(isNaN(d.getTime()) ? null : d);
                    setCalfTag(item.calf_tag || '');
                    setCalfName(item.calf_name || '');
                    setCalfSex(item.calf_sex || 'Female');
                    setCalfWeight(item.calf_weight_kg ? item.calf_weight_kg.toString() : '');
                    setBirthDifficulty(item.complications || '');
                    setNotes(item.notes || '');
                    setChildNumber(calf?.child_number || '');
                    setCalfImage(calf?.image_url || null);
                    // default to DOB mode for editing (calving date is the DOB)
                    setCalfAgeMode('dob');
                    setCalfAgeInput({ years: '', months: '' });
                    setShowForm(true);
                  }}
                >
                  <View style={s.listCardHead}>
                    <Text style={s.listCardTitle}>Mother: {animal?.tag_number || 'N/A'}</Text>
                    <Text style={s.listCardStatus}>{item.calving_date || 'N/A'}</Text>
                  </View>
                  <View style={s.listCardBody}>
                    <View style={s.gridRow}>
                      <Text style={s.gridLabel}>Calf:</Text>
                      <Text style={s.gridValue}>{(item.calf_name || item.calf_tag || 'N/A')} ({item.calf_sex || 'N/A'})</Text>
                    </View>
                    {calf?.child_number ? (
                      <View style={s.gridRow}>
                        <Text style={s.gridLabel}>Child No.:</Text>
                        <Text style={s.gridValue}>{calf.child_number}</Text>
                      </View>
                    ) : null}
                    <View style={s.gridRow}>
                      <Text style={s.gridLabel}>Weight:</Text>
                      <Text style={s.gridValue}>{item.calf_weight_kg ? `${item.calf_weight_kg} kg` : 'N/A'}</Text>
                    </View>
                    {item.complications ? (
                      <View style={s.gridRow}>
                        <Text style={s.gridLabel}>Birth Difficulty:</Text>
                        <Text style={[s.gridValue, { color: Colors.danger }]}>{item.complications}</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
        <TouchableOpacity
          style={s.fab}
          onPress={() => {
            setEditingId(null);
            setAnimalId('');
            setCalvingDate(null);
            setCalfTag('');
            setCalfName('');
            setCalfWeight('');
            setBirthDifficulty('');
            setNotes('');
            setCalfSex('Female');
            setCalfImage(null);
            setChildNumber('');
            setCalfAgeMode('dob');
            setCalfAgeInput({ years: '', months: '' });
            setShowForm(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
      {imagePicker.modal}
    </AppBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16 },
  listContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.primary, marginBottom: 12, marginTop: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 3,
  },
  sectionHeader: { fontSize: 18, fontWeight: '800', color: Colors.primary, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 },

  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 8, marginLeft: 2, letterSpacing: 0.2 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: Colors.textPrimary },
  pickerWrapper: { justifyContent: 'center' },
  picker: { height: 56, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, color: '#1F2937', paddingHorizontal: 12 },
  emptyHint: { fontSize: 12, color: Colors.danger, fontWeight: '600', marginTop: 8, marginLeft: 4 },
  dateBtn: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, minHeight: 56, paddingHorizontal: 16, paddingVertical: 0 },
  dateText: { fontSize: 16, color: Colors.textPrimary },

  // Calf DOB/Age toggle
  ageToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 5,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  toggleText: { fontSize: 13, fontWeight: '800', color: '#6B7280' },
  toggleTextActive: { color: Colors.primary },
  ageHint: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 4, marginLeft: 2 },

  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cancelBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 12 },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 12 },
  deleteBtnText: { color: Colors.danger, fontSize: 16, fontWeight: '700' },

  photoField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  photoBox: {
    width: 86, height: 86, borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#C7D2FE',
    position: 'relative',
  },
  photoPreview: { width: 86, height: 86, borderRadius: 16 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoMeta: { flex: 1, marginLeft: 14 },
  photoTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  photoHint: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginTop: 2 },
  photoRemove: {
    position: 'absolute',
    top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.danger,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    zIndex: 2,
  },

  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },

  listCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  listCardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
  listCardTitle: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  listCardStatus: { fontSize: 15, fontWeight: '800', color: Colors.success },

  listCardBody: { gap: 6 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between' },
  gridLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', flexShrink: 0, marginRight: 8 },
  gridValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '800', flexShrink: 1, textAlign: 'right' },

  fab: {
    position: 'absolute', bottom: 100, right: 20, width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  fabText: { fontSize: 32, color: '#fff', marginTop: -4 },
});

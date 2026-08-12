import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, Camera, Check, Hash, Info, Tag, User, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { AppBackground, Select } from '../../components/ui';
import { useImagePicker } from '../../components/PhotoPicker';
import { Colors } from '../../constants/Colors';
import { persistAnimalImage } from '../../database/imageStorage';
import { useStore } from '../../store/StoreContext';
import { Animal, ReproStatus, Sex, Species } from '../../types';
import { addDays, calculateAge, dateFromAge, formatAge, getGestationDays, parseDate, toDateString } from '../../utils/date';
import { useNow } from '../../utils/useNow';

type AgeInput = { years: string; months: string };

export default function EditAnimalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { animals, updateAnimal, deleteAnimal } = useStore();
  const now = useNow();

  const animal = animals.find((a) => a.id === id);

  const [tag, setTag] = useState('');
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('Cow');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<Sex>('Female');

  const [ageMode, setAgeMode] = useState<'dob' | 'age'>('dob');
  const [dob, setDob] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [age, setAge] = useState<AgeInput>({ years: '', months: '' });

  const [color, setColor] = useState('');
  const [reproStatus, setReproStatus] = useState<ReproStatus>('Open');
  const [lactationNo, setLactationNo] = useState('');
  const [image, setImage] = useState<string | null>(null);
  
  const [inseminationDate, setInseminationDate] = useState(new Date());
  const [showInsemPicker, setShowInsemPicker] = useState(false);
  const imagePicker = useImagePicker();

  // Load existing data
  useEffect(() => {
    if (animal) {
      setTag(animal.tag_number);
      setName(animal.name);
      setSpecies(animal.species);
      setBreed(animal.breed);
      setSex(animal.sex);
      setDob(parseDate(animal.date_of_birth));
      setAgeMode(animal.dob_is_estimated ? 'age' : 'dob');
      setAge({ years: '', months: '' });
      const { years, months, valid } = calculateAge(animal.date_of_birth);
      if (valid) {
        setAge({ years: years > 0 ? String(years) : '', months: String(months) });
      }
      setColor(animal.color);
      setReproStatus(animal.repro_status);
      if (animal.lactation_number) setLactationNo(animal.lactation_number);
      if (animal.last_insemination_date) setInseminationDate(parseDate(animal.last_insemination_date));
      setImage(animal.image_url || null);
    }
  }, [animal]);

  const pickImage = async (setter: (uri: string | null) => void) => {
    imagePicker.open(setter);
  };

  // Dynamic Status Options
  const statusOptions = useMemo(() => {
    if (sex === 'Male') {
      return ['Breeding', 'Non-Breeding', 'Not Applicable'];
    }
    return ['Open', 'Inseminated', 'Pregnant', 'Dry', 'Newly Calved', 'Not Applicable'];
  }, [sex]);

  // Ensure selected status is valid if sex changes
  useEffect(() => {
    if (animal) return; // skip on mount when loading
    if (sex === 'Male' && !['Breeding', 'Non-Breeding', 'Not Applicable'].includes(reproStatus)) {
      setReproStatus('Breeding');
    } else if (sex === 'Female' && !['Open', 'Inseminated', 'Pregnant', 'Dry', 'Newly Calved', 'Not Applicable'].includes(reproStatus)) {
      setReproStatus('Open');
    }
  }, [sex]);

  if (!animal) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Animal not found.</Text>
      </View>
    );
  }

  const calculateDobFromAge = () => {
    const y = parseInt(age.years) || 0;
    const m = parseInt(age.months) || 0;
    return dateFromAge(y, m);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selectedDate) setDob(selectedDate);
  };

  const handleSave = async () => {
    if (!tag.trim() || !breed.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Tag number and breed are required.' });
      return;
    }

    const duplicate = animals.find(a => a.id !== animal.id && a.tag_number.trim().toLowerCase() === tag.trim().toLowerCase());
    if (duplicate) {
      Toast.show({ type: 'error', text1: 'Duplicate Tag', text2: `Tag "${tag}" is already used by another animal.` });
      return;
    }

    const isEstimated = ageMode === 'age';
    const finalDob = isEstimated ? calculateDobFromAge() : dob;

    const updatedAnimal: Animal = {
      ...animal,
      tag_number: tag,
      name: name.trim() || 'Unknown',
      species,
      breed,
      sex,
      date_of_birth: toDateString(finalDob),
      dob_is_estimated: isEstimated,
      color,
      repro_status: reproStatus,
      lactation_number: sex === 'Female' ? lactationNo : undefined,
      last_insemination_date: sex === 'Female' && ['Pregnant', 'Inseminated'].includes(reproStatus) ? toDateString(inseminationDate) : undefined,
      image_url: await persistAnimalImage(animal.id, image),
    };

    await updateAnimal(updatedAnimal);

    Toast.show({ type: 'success', text1: 'Updated', text2: 'Animal updated successfully!' });
    router.back();
  };

  const handleDelete = () => {
    if (!animal) return;
    Alert.alert('Delete Animal', 'Are you sure you want to delete this animal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteAnimal(animal.id);
        Toast.show({ type: 'success', text1: 'Deleted', text2: 'Animal deleted.' });
        router.replace('/animals');
      }},
    ]);
  };

  return (
    <AppBackground>
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* Basic Info */}
      <View style={s.card}>
        <View style={s.cardHeaderRow}>
          <View style={s.iconBg}><Tag color="#fff" size={20} /></View>
          <Text style={s.sectionHeader}>Basic Info</Text>
        </View>

        {/* Optional animal photo (side thumbnail, fully visible) */}
        <View style={s.photoField}>
          <TouchableOpacity style={s.photoBox} activeOpacity={0.8} onPress={() => pickImage(setImage)}>
            {image ? (
              <Image source={{ uri: image }} style={s.photoPreview} resizeMode="contain" />
            ) : (
              <View style={s.photoPlaceholder}>
                <Camera color={Colors.primary} size={26} />
              </View>
            )}
            {image ? (
              <TouchableOpacity style={s.photoRemove} activeOpacity={0.7} onPress={() => setImage(null)}>
                <X color="#fff" size={14} />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
          <View style={s.photoMeta}>
            <Text style={s.photoTitle}>Animal Photo</Text>
            <Text style={s.photoHint}>Optional · tap to add an identifying picture</Text>
          </View>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Tag Number *</Text>
          <View style={s.inputWrapper}>
            <Hash color={Colors.textMuted} size={18} style={s.inputIcon} />
            <TextInput style={s.input} placeholder="e.g. C-102" value={tag} onChangeText={setTag} placeholderTextColor={Colors.textMuted} />
          </View>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Name / Alias</Text>
          <View style={s.inputWrapper}>
            <User color={Colors.textMuted} size={18} style={s.inputIcon} />
            <TextInput style={s.input} placeholder="e.g. Nela" value={name} onChangeText={setName} placeholderTextColor={Colors.textMuted} />
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.inputGroup, { flex: 1, paddingRight: 6 }]}>
            <Text style={s.label}>Species</Text>
          <View style={s.pickerContainer}>
            <Select
              value={species}
              onValueChange={(v) => setSpecies(v as Species)}
              options={[
                { label: 'Cow', value: 'Cow' },
                { label: 'Buffalo', value: 'Buffalo' },
                { label: 'Goat', value: 'Goat' },
                { label: 'Sheep', value: 'Sheep' },
              ]}
            />
          </View>
          </View>

          <View style={[s.inputGroup, { flex: 1, paddingLeft: 6 }]}>
            <Text style={s.label}>Breed *</Text>
            <View style={s.inputWrapper}>
              <TextInput style={s.input} placeholder="e.g. Sahiwal" value={breed} onChangeText={setBreed} placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
        </View>
      </View>

      {/* Physical Details */}
      <View style={s.card}>
        <View style={s.cardHeaderRow}>
          <View style={[s.iconBg, { backgroundColor: '#10B981' }]}><Info color="#fff" size={20} /></View>
          <Text style={[s.sectionHeader, { color: '#10B981' }]}>Physical Details</Text>
        </View>

        <View style={s.row}>
          <View style={[s.inputGroup, { flex: 1, paddingRight: 6 }]}>
            <Text style={s.label}>Sex</Text>
          <View style={s.pickerContainer}>
            <Select
              value={sex}
              onValueChange={(v) => setSex(v as Sex)}
              options={[{ label: 'Female', value: 'Female' }, { label: 'Male', value: 'Male' }]}
            />
          </View>
          </View>

          <View style={[s.inputGroup, { flex: 1, paddingLeft: 6 }]}>
            <Text style={s.label}>Color</Text>
            <View style={s.inputWrapper}>
              <TextInput style={s.input} placeholder="e.g. Black" value={color} onChangeText={setColor} placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
        </View>

        {sex === 'Female' && (
          <View style={s.inputGroup}>
            <Text style={s.label}>Lactation No.</Text>
            <View style={s.inputWrapper}>
              <TextInput style={s.input} placeholder="e.g. 2" keyboardType="numeric" value={lactationNo} onChangeText={setLactationNo} placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
        )}

        <View style={s.ageToggleRow}>
          <TouchableOpacity
            style={[s.toggleBtn, ageMode === 'dob' && s.toggleBtnActive]}
            onPress={() => setAgeMode('dob')}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleText, ageMode === 'dob' && s.toggleTextActive]}>Edit Date of Birth</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, ageMode === 'age' && s.toggleBtnActive]}
            onPress={() => setAgeMode('age')}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleText, ageMode === 'age' && s.toggleTextActive]}>Edit Age</Text>
          </TouchableOpacity>
        </View>

        {ageMode === 'age' ? (
          <View style={s.ageStatusRow}>
            <View style={{ flex: 1.7, marginRight: 8 }}>
              <View style={s.row}>
                <View style={[s.inputGroup, { flex: 1, marginRight: 8, marginBottom: 0 }]}>
                  <Text style={s.label}>Years</Text>
                  <View style={s.inputWrapper}>
                    <TextInput style={s.input} placeholder="0" keyboardType="numeric" value={age.years} onChangeText={(v) => setAge({ ...age, years: v })} placeholderTextColor={Colors.textMuted} />
                  </View>
                </View>
                <View style={[s.inputGroup, { flex: 1, marginLeft: 8, marginBottom: 0 }]}>
                  <Text style={s.label}>Months</Text>
                  <View style={s.inputWrapper}>
                    <TextInput style={s.input} placeholder="0" keyboardType="numeric" value={age.months} onChangeText={(v) => setAge({ ...age, months: v })} placeholderTextColor={Colors.textMuted} />
                  </View>
                </View>
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <View style={[s.inputGroup, { marginBottom: 0 }]}>
                <Text style={s.label}>Status</Text>
                <View style={s.pickerContainer}>
                  <Select
                    value={reproStatus}
                    onValueChange={(v) => setReproStatus(v as ReproStatus)}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={s.ageStatusRow}>
            <View style={{ flex: 1.7, marginRight: 8 }}>
              <View style={[s.inputGroup, { marginBottom: 0 }]}>
                <Text style={s.label}>Date of Birth</Text>
                {Platform.OS === 'web' ? (
                  React.createElement('input', {
                    type: 'date',
                    value: toDateString(dob),
                    max: toDateString(new Date()),
                    onChange: (e: any) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) setDob(d);
                    },
                    style: {
                      width: '100%', padding: '14px 16px', fontSize: '16px',
                      fontWeight: '700', color: '#1F2937',
                      backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0',
                      borderRadius: '16px', cursor: 'pointer', outline: 'none',
                    }
                  })
                ) : (
                  <TouchableOpacity style={s.dateBtn} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
                    <Calendar color={Colors.primary} size={20} style={{ marginRight: 10 }} />
                    <Text style={s.dateText}>{dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                  </TouchableOpacity>
                )}

                {showPicker && Platform.OS !== 'web' && (
                  <DateTimePicker
                    value={dob}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    style={Platform.OS === 'ios' ? { alignSelf: 'stretch', marginTop: 8 } : {}}
                  />
                )}
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <View style={[s.inputGroup, { marginBottom: 0 }]}>
                <Text style={s.label}>Status</Text>
                <View style={s.pickerContainer}>
                  <Select
                    value={reproStatus}
                    onValueChange={(v) => setReproStatus(v as ReproStatus)}
                    options={statusOptions.map((opt) => ({ label: opt, value: opt }))}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Big calculated value panel */}
        <View style={s.calcCardBig}>
          <Text style={s.calcLabel}>{ageMode === 'age' ? 'Calculated Date of Birth' : 'Calculated Age'}</Text>
          <Text style={s.calcValueBig}>
            {ageMode === 'age'
              ? toDateString(dateFromAge(parseInt(age.years) || 0, parseInt(age.months) || 0, now))
              : formatAge(toDateString(dob), now)}
          </Text>
        </View>

        {sex === 'Female' && ['Pregnant', 'Inseminated'].includes(reproStatus) && (
          <View style={s.inputGroup}>
            <Text style={s.label}>Date of Insemination</Text>
            {Platform.OS === 'web' ? (
              React.createElement('input', {
                type: 'date',
                value: toDateString(inseminationDate),
                max: toDateString(new Date()),
                onChange: (e: any) => {
                  const d = new Date(e.target.value);
                  if (!isNaN(d.getTime())) setInseminationDate(d);
                },
                style: {
                  width: '100%', padding: '14px 16px', fontSize: '16px',
                  fontWeight: '700', color: '#1F2937',
                  backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB',
                  borderRadius: '16px', cursor: 'pointer', outline: 'none',
                  marginBottom: '12px',
                }
              })
            ) : (
              <TouchableOpacity style={s.dateBtn} onPress={() => setShowInsemPicker(true)} activeOpacity={0.7}>
                <Calendar color={Colors.primary} size={20} style={{ marginRight: 10 }} />
                <Text style={s.dateText}>{inseminationDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </TouchableOpacity>
            )}

            {showInsemPicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={inseminationDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setShowInsemPicker(false);
                  if (e.type === 'set' && d) setInseminationDate(d);
                }}
                maximumDate={new Date()}
                style={Platform.OS === 'ios' ? { alignSelf: 'stretch', marginTop: 8 } : {}}
              />
            )}

            {reproStatus === 'Pregnant' && (
              <View style={{ marginTop: 12, backgroundColor: '#D1FAE5', padding: 12, borderRadius: 12 }}>
                <Text style={{ fontSize: 14, color: '#059669', fontWeight: '800' }}>
                  Expected Calving: {new Date(addDays(toDateString(inseminationDate), getGestationDays(species))).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            )}
          </View>
        )}

      </View>

      <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Check color="#fff" size={24} style={{ marginRight: 8 }} />
        <Text style={s.saveBtnText}>Update Animal</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
        <Trash2 color={Colors.danger} size={20} style={{ marginRight: 8 }} />
        <Text style={s.deleteBtnText}>Delete Animal</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
    </SafeAreaView>
    {imagePicker.modal}
    </AppBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6B7280' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconBg: {
    backgroundColor: Colors.primary,
    width: 36, height: 36,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
  },

  photoField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
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
  photoText: { fontSize: 13, fontWeight: '800', color: Colors.primary, marginTop: 2 },
  photoMeta: { flex: 1, marginLeft: 14 },
  photoRemove: {
    position: 'absolute',
    top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.danger,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    zIndex: 2,
  },
  photoTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  photoHint: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center' },
  inputGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 2,
    letterSpacing: 0.2,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 0,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },

  pickerContainer: {
    justifyContent: 'center',
  },
  picker: {
    height: 56,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    color: '#1F2937',
    paddingHorizontal: 12,
  },

  ageToggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  toggleText: { fontSize: 14, fontWeight: '800', color: '#6B7280' },
  toggleTextActive: { color: Colors.primary },

  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  dateText: { fontSize: 16, color: '#1F2937', fontWeight: '700' },

  calcCard: {
    marginTop: 12,
    backgroundColor: '#E0E7FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderRadius: 16,
    padding: 16,
  },
  calcLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338CA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  calcValue: { fontSize: 20, fontWeight: '900', color: Colors.primary },

  ageStatusRow: { flexDirection: 'row', marginBottom: 16 },
  calcCardBig: {
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: '#EAF1FB',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  calcValueBig: { fontSize: 26, fontWeight: '900', color: Colors.primary, marginTop: 6, textAlign: 'center' },

  saveBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  deleteBtn: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  deleteBtnText: { color: Colors.danger, fontSize: 18, fontWeight: '900' },
});

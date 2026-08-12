import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
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
import { Calving, Sex } from '../../types';
import { addDays, getGestationDays, parseDate, toDateString } from '../../utils/date';
import { incrementLactation } from '../../utils/lactation';

export default function CalvingScreen() {
  const router = useRouter();
  const { animals, calvings, addCalving, updateCalving, deleteCalving, inseminations, addAnimal, updateAnimal } = useStore();

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
  const [complications, setComplications] = useState('');
  const [notes, setNotes] = useState('');

  // Optional calf photo (kept as a local uri; not uploaded to a server)
  const [calfImage, setCalfImage] = useState<string | null>(null);

  const pickImage = async (setter: (uri: string | null) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setter(result.assets[0].uri);
    }
  };

  // Only pregnant animals (not just insemination records) can calve
  const pregnantAnimals = animals.filter(a => a.repro_status === 'Pregnant');

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setCalvingDate(selectedDate);
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

    if (calfTag && calfTag.trim() !== '' && !editingId) {
      const duplicate = animals.find(a => a.tag_number.trim().toLowerCase() === calfTag.trim().toLowerCase());
      if (duplicate) {
        Toast.show({ type: 'error', text1: 'Duplicate Tag', text2: `Tag "${calfTag}" is already in use by another animal.` });
        return;
      }
    }

    const record: Calving = {
      id: editingId || Math.random().toString(36).substring(7),
      animal_id: animalId,
      insemination_id: matchingIns?.id || '',
      calving_date: calvingDate ? toDateString(calvingDate) : '',
      calf_tag: calfTag,
      calf_name: calfName,
      calf_sex: calfSex,
      calf_weight_kg: parseFloat(calfWeight) || 0,
      complications,
      notes,
      created_at: new Date().toISOString(),
    };

    if (calfTag && calfTag.trim() !== '' && !editingId) {
      const newCalf = {
        id: Math.random().toString(36).substring(7),
        tag_number: calfTag.trim(),
        name: calfName.trim() || `Calf of ${mother?.tag_number || 'Unknown'}`,
        species: mother?.species || 'Cow',
        breed: mother?.breed || 'Unknown',
        sex: calfSex,
        date_of_birth: calvingDate ? toDateString(calvingDate) : toDateString(new Date()),
        dob_is_estimated: false,
        color: '',
        repro_status: 'Calf' as any,
        created_at: new Date().toISOString(),
        image_url: calfImage || '',
        notes: `Mother Tag: ${mother?.tag_number || 'Unknown'}`,
      };
      await addAnimal(newCalf);
    }

    if (editingId) {
      await updateCalving(record);
      // Keep the linked calf's photo in sync when editing
      if (calfTag && calfTag.trim() !== '') {
        const existingCalf = animals.find(a => a.tag_number.trim().toLowerCase() === calfTag.trim().toLowerCase());
        if (existingCalf) {
          await updateAnimal({ ...existingCalf, image_url: calfImage || existingCalf.image_url });
        }
      }
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Calving record updated.' });
    } else {
      await addCalving(record);

      // Sync: after a new calving commit the next lactation and end the pregnancy
      if (mother) {
        await updateAnimal({ ...mother, repro_status: 'Newly Calved', lactation_number: incrementLactation(mother.lactation_number) });
      }

      Toast.show({ type: 'success', text1: 'Saved', text2: 'Calving record added.' });
    }

    setShowForm(false);
    setEditingId(null);
    setAnimalId('');
    setCalvingDate(null);
    setCalfTag('');
    setCalfName('');
    setCalfWeight('');
    setComplications('');
    setNotes('');
    setCalfSex('Female');
    setCalfImage(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setAnimalId('');
    setCalvingDate(null);
    setCalfTag('');
    setCalfName('');
    setCalfWeight('');
    setComplications('');
    setNotes('');
    setCalfSex('Female');
    setCalfImage(null);
  };

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
        <ScrollView style={s.container} contentContainerStyle={s.content}>
          <View style={s.card}>
            <Text style={s.sectionHeader}>New Calving Record</Text>

            <View style={s.inputGroup}>
              <Text style={s.label}>Select Pregnant Mother (Optional)</Text>
              <View style={s.pickerWrapper}>
                <Picker
                  selectedValue={animalId}
                  onValueChange={(id) => {
                    setAnimalId(id);
                    setCalvingDate(null);
                  }}
                  style={s.picker}
                >
                  <Picker.Item label="-- No Mother / Unknown --" value="" />
                  {pregnantAnimals.map(a => (
                    <Picker.Item key={a.id} label={`${a.tag_number} - ${a.name || 'Unknown'}`} value={a.id} />
                  ))}
                </Picker>
              </View>
              {pregnantAnimals.length === 0 && (
                <Text style={s.emptyHint}>No pregnant animals. Mark a female as Pregnant (via Insemination or Register) first.</Text>
              )}
            </View>

            <View style={s.row}>
              <View style={[s.inputGroup, { flex: 1, paddingRight: 8 }]}>
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
              <View style={[s.inputGroup, { flex: 1, paddingLeft: 8 }]}>
                <Text style={s.label}>Calf Sex</Text>
                <View style={s.pickerWrapper}>
                  <Picker selectedValue={calfSex} onValueChange={(v) => setCalfSex(v as Sex)} style={s.picker}>
                    <Picker.Item label="Female" value="Female" />
                    <Picker.Item label="Male" value="Male" />
                  </Picker>
                </View>
              </View>
            </View>

            <View style={s.row}>
              <View style={[s.inputGroup, { flex: 1, paddingRight: 8 }]}>
                <Text style={s.label}>Calf Name</Text>
                <TextInput style={s.input} value={calfName} onChangeText={setCalfName} placeholder="e.g. Nela" />
              </View>
              <View style={[s.inputGroup, { flex: 1, paddingLeft: 8 }]}>
                <Text style={s.label}>Calf Tag Number</Text>
                <TextInput style={s.input} value={calfTag} onChangeText={setCalfTag} placeholder="e.g. C-105" />
              </View>
            </View>

            <View style={s.photoField}>
              <TouchableOpacity style={s.photoBox} activeOpacity={0.8} onPress={() => pickImage(setCalfImage)}>
                {calfImage ? (
                  <Image source={{ uri: calfImage }} style={s.photoPreview} resizeMode="contain" />
                ) : (
                  <View style={s.photoPlaceholder}>
                    <Camera color={Colors.primary} size={26} />
                  </View>
                )}
                {calfImage ? (
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
              <Text style={s.label}>Weight (kg)</Text>
              <TextInput style={s.input} value={calfWeight} onChangeText={setCalfWeight} placeholder="e.g. 28" keyboardType="numeric" />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Complications</Text>
              <TextInput style={s.input} value={complications} onChangeText={setComplications} placeholder="e.g. None" />
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
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={s.container}>
        <FlatList
          contentContainerStyle={s.listContent}
          data={calvings}
          keyExtractor={i => i.id}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No records found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const animal = animals.find(a => a.id === item.animal_id);
            return (
              <TouchableOpacity
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
                  setComplications(item.complications || '');
                  setNotes(item.notes || '');
                  const linkedCalf = animals.find(a => a.tag_number.trim().toLowerCase() === (item.calf_tag || '').trim().toLowerCase());
                  setCalfImage(linkedCalf?.image_url || null);
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
                  <View style={s.gridRow}>
                    <Text style={s.gridLabel}>Weight:</Text>
                    <Text style={s.gridValue}>{item.calf_weight_kg ? `${item.calf_weight_kg} kg` : 'N/A'}</Text>
                  </View>
                  {item.complications ? (
                    <View style={s.gridRow}>
                      <Text style={s.gridLabel}>Complications:</Text>
                      <Text style={[s.gridValue, { color: Colors.danger }]}>{item.complications}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
        <TouchableOpacity
          style={s.fab}
          onPress={() => {
            setEditingId(null);
            setAnimalId('');
            setCalvingDate(null);
            setCalfTag('');
            setCalfName('');
            setCalfWeight('');
            setComplications('');
            setNotes('');
            setCalfSex('Female');
            setCalfImage(null);
            setShowForm(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </AppBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16 },
  listContent: { padding: 16, paddingBottom: 100 },

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
  gridLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  gridValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '800' },

  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  fabText: { fontSize: 32, color: '#fff', marginTop: -4 },
});

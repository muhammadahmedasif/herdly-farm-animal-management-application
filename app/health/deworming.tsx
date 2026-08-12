import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
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
import { Colors } from '../../constants/Colors';
import { useStore } from '../../store/StoreContext';
import { Deworming } from '../../types';
import { uuid } from '../../utils/uuid';
import { toDateString } from '../../utils/date';

export default function DewormingScreen() {
  const router = useRouter();
  const { animals, dewormings, addDeworming } = useStore();

  const [showForm, setShowForm] = useState(false);

  // Form State
  const [animalId, setAnimalId] = useState('');
  const [productName, setProductName] = useState('');
  const [dateGiven, setDateGiven] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [nextDueDate, setNextDueDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 3)));
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);
  const [dose, setDose] = useState('');
  const [notes, setNotes] = useState('');

  const onDateGivenChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDateGiven(selectedDate);
  };

  const onNextDateChange = (event: any, selectedDate?: Date) => {
    setShowNextDatePicker(Platform.OS === 'ios');
    if (selectedDate) setNextDueDate(selectedDate);
  };

  const handleSave = async () => {
    if (!animalId || !productName.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Animal and product name are required.' });
      return;
    }

    const newRecord: Deworming = {
      id: uuid(),
      animal_id: animalId,
      product_name: productName,
      date_given: toDateString(dateGiven),
      next_due_date: toDateString(nextDueDate),
      dose_ml: dose,
      notes,
      created_at: new Date().toISOString(),
    };

    await addDeworming(newRecord);
    Toast.show({ type: 'success', text1: 'Saved', text2: 'Deworming record added.' });

    setShowForm(false);
    setAnimalId('');
    setProductName('');
    setDose('');
    setNotes('');
  };

  if (showForm) {
    return (
      <AppBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
          <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.sectionHeader}>New Deworming</Text>

          <View style={s.inputGroup}>
            <Text style={s.label}>Select Animal *</Text>
            <View style={s.pickerWrapper}>
              <Select
                value={animalId}
                onValueChange={setAnimalId}
                placeholder="-- Select Animal --"
                options={animals.map(a => ({ label: `${a.tag_number} - ${a.name}`, value: a.id }))}
              />
            </View>
          </View>

          <View style={s.row}>
            <View style={[s.inputGroup, { flex: 1, paddingRight: 8 }]}>
              <Text style={s.label}>Product Name *</Text>
              <TextInput style={s.input} value={productName} onChangeText={setProductName} placeholder="e.g. Ivermectin" />
            </View>
            <View style={[s.inputGroup, { flex: 1, paddingLeft: 8 }]}>
              <Text style={s.label}>Dose</Text>
              <TextInput style={s.input} value={dose} onChangeText={setDose} placeholder="e.g. 5ml" />
            </View>
          </View>

          <View style={s.row}>
            <View style={[s.inputGroup, { flex: 1, paddingRight: 8 }]}>
              <Text style={s.label}>Date Given</Text>
              {Platform.OS === 'web' ? (
                React.createElement('input', {
                  type: 'date',
                  value: toDateString(dateGiven),
                  max: toDateString(new Date()),
                  onChange: (e: any) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) setDateGiven(d);
                  },
                  style: {
                    padding: '14px 16px', fontSize: '16px',
                    fontWeight: '700', color: '#1F2937',
                    backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                    borderRadius: '12px', cursor: 'pointer', outline: 'none',
                  }
                })
              ) : Platform.OS === 'android' ? (
                <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
                  <Text style={s.dateText}>{toDateString(dateGiven)}</Text>
                </TouchableOpacity>
              ) : null}

              {(showDatePicker || Platform.OS === 'ios') && (
                <DateTimePicker
                  value={dateGiven}
                  mode="date"
                  display="default"
                  onChange={onDateGivenChange}
                  maximumDate={new Date()}
                  style={Platform.OS === 'ios' ? { alignSelf: 'flex-start', marginBottom: 12 } : {}}
                />
              )}
            </View>
            <View style={[s.inputGroup, { flex: 1, paddingLeft: 8 }]}>
              <Text style={s.label}>Next Due Date</Text>
              {Platform.OS === 'web' ? (
                React.createElement('input', {
                  type: 'date',
                  value: toDateString(nextDueDate),
                  min: toDateString(dateGiven),
                  onChange: (e: any) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) setNextDueDate(d);
                  },
                  style: {
                    padding: '14px 16px', fontSize: '16px',
                    fontWeight: '700', color: '#1F2937',
                    backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                    borderRadius: '12px', cursor: 'pointer', outline: 'none',
                  }
                })
              ) : Platform.OS === 'android' ? (
                <TouchableOpacity style={s.dateBtn} onPress={() => setShowNextDatePicker(true)}>
                  <Text style={s.dateText}>{toDateString(nextDueDate)}</Text>
                </TouchableOpacity>
              ) : null}

              {(showNextDatePicker || Platform.OS === 'ios') && (
                <DateTimePicker
                  value={nextDueDate}
                  mode="date"
                  display="default"
                  onChange={onNextDateChange}
                  minimumDate={dateGiven}
                  style={Platform.OS === 'ios' ? { alignSelf: 'flex-start', marginBottom: 12 } : {}}
                />
              )}
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Notes</Text>
            <TextInput style={[s.input, { height: 80 }]} value={notes} onChangeText={setNotes} multiline />
          </View>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={s.saveBtnText}>Save Record</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)} activeOpacity={0.8}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
        </SafeAreaView>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={s.container}>
        <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
        <FlatList
          contentContainerStyle={s.listContent}
          data={dewormings}
          keyExtractor={i => i.id}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>No records found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const animal = animals.find(a => a.id === item.animal_id);
            return (
              <View style={s.listCard}>
                <View style={s.listCardHead}>
                  <Text style={s.listCardTitle}>{animal?.tag_number || 'Unknown'}</Text>
                  <Text style={s.listCardStatus}>{item.product_name}</Text>
                </View>
                <View style={s.listCardBody}>
                  <View style={s.gridRow}>
                    <Text style={s.gridLabel}>Given Date:</Text>
                    <Text style={s.gridValue}>{item.date_given}</Text>
                  </View>
                  <View style={s.gridRow}>
                    <Text style={s.gridLabel}>Dose:</Text>
                    <Text style={s.gridValue}>{item.dose_ml || 'N/A'}</Text>
                  </View>
                  <View style={s.gridRow}>
                    <Text style={s.gridLabel}>Next Due:</Text>
                    <Text style={[s.gridValue, { color: Colors.danger }]}>{item.next_due_date}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
        <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)} activeOpacity={0.85}>
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
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  pickerWrapper: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, overflow: 'hidden' },
  picker: { height: 52 },
  dateBtn: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16 },
  dateText: { fontSize: 16, color: Colors.textPrimary },

  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cancelBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 12 },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700' },

  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },

  listCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  listCardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
  listCardTitle: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  listCardStatus: { fontSize: 15, fontWeight: '800', color: '#DC2626' },

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

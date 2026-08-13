import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Calendar, Camera, Check, Hash, Info, Tag, User, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
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
import { Colors, Shadows } from '../../constants/Colors';
import { SPECIES_EMOJI, SPECIES_LIST } from '../../constants/livestock';
import { useStore } from '../../store/StoreContext';
import { Animal, Calving, Insemination, ReproStatus, Sex, Species } from '../../types';
import { persistAnimalImage } from '../../database/imageStorage';
import { uuid } from '../../utils/uuid';
import { addDays, dateFromAge, formatAge, getGestationDays, toDateString } from '../../utils/date';
import { getEffectiveLactation, PREGNANCY_CHECK_DAYS } from '../../utils/lactation';
import { getEffectiveReproStatus } from '../../utils/animal';
import { useNow } from '../../utils/useNow';

type AgeInput = { years: string; months: string };

export default function RegisterAnimalScreen() {
  const router = useRouter();
  const { animals, addAnimal, addCalving, addInsemination } = useStore();
  const now = useNow();
  const imagePicker = useImagePicker();

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

  const [inseminationDate, setInseminationDate] = useState(new Date());
  const [showInsemPicker, setShowInsemPicker] = useState(false);

  // Optional instant calf registration when the animal is marked Pregnant
  const [registerCalf, setRegisterCalf] = useState(false);
  const [calfRegName, setCalfRegName] = useState('');
  const [calfRegTag, setCalfRegTag] = useState('');
  const [calfRegSex, setCalfRegSex] = useState<Sex>('Female');

  // Optional calf photo (kept as a local uri; not uploaded to a server)
  const [image, setImage] = useState<string | null>(null);
  const [calfRegImage, setCalfRegImage] = useState<string | null>(null);

  // Mother selection & child number (apply to all animals, required for calves)
  const [motherId, setMotherId] = useState('');
  const [childNumber, setChildNumber] = useState('');

  // Suggest a calf tag derived from the mother's tag, e.g. C-102 -> C-102A, C-102B, ...
  const suggestCalfTag = () => {
    const trimmed = tag.trim();
    if (!trimmed) return '';
    const m = /^(.+?)(\d+)$/.exec(trimmed);
    if (m) {
      const base = m[1] + m[2];
      const used = new Set(animals.filter(a => a.tag_number.startsWith(base)).map(a => a.tag_number.toUpperCase()));
      for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        const candidate = base + letter;
        if (!used.has(candidate.toUpperCase())) return candidate;
      }
    }
    return trimmed + 'C';
  };

  // Expected calving (calf DOB) = insemination date + species gestation period
  const expectedCalfDob = reproStatus === 'Pregnant' ? addDays(toDateString(inseminationDate), getGestationDays(species)) : '';

  // Female animals available for mother selection (all females, excluding calves)
  const femaleAnimals = animals.filter(a => a.sex === 'Female' && getEffectiveReproStatus(a) !== 'Calf');

  // Dynamic Status Options
  const statusOptions = useMemo(() => {
    if (sex === 'Male') {
      return ['Breeding', 'Non-Breeding', 'Not Applicable'];
    }
    return ['Open', 'Inseminated', 'Pregnant', 'Dry', 'Other'];
  }, [sex]);

  // Ensure selected status is valid if sex changes
  React.useEffect(() => {
    if (sex === 'Male' && !['Breeding', 'Non-Breeding', 'Not Applicable'].includes(reproStatus)) {
      setReproStatus('Breeding');
    } else if (sex === 'Female' && !['Open', 'Inseminated', 'Pregnant', 'Dry', 'Newly Calved', 'Not Applicable'].includes(reproStatus)) {
      setReproStatus('Open');
    }
  }, [sex]);

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

    const duplicate = animals.find(a => a.tag_number.trim().toLowerCase() === tag.trim().toLowerCase());
    if (duplicate) {
      Toast.show({ type: 'error', text1: 'Duplicate Tag', text2: `Tag "${tag}" is already in use. Please use a unique tag number.` });
      return;
    }

    // Calf registration validation (only when toggled on)
    if (registerCalf && !calfRegTag.trim()) {
      Toast.show({ type: 'error', text1: 'Calf Tag Required', text2: 'Enter a tag number for the calf (e.g. C-102A) or turn off calf registration.' });
      return;
    }
    if (registerCalf && calfRegTag.trim()) {
      const calfDuplicate = animals.find(a => a.tag_number.trim().toLowerCase() === calfRegTag.trim().toLowerCase());
      if (calfDuplicate) {
        Toast.show({ type: 'error', text1: 'Duplicate Calf Tag', text2: `Tag "${calfRegTag}" is already in use by another animal.` });
        return;
      }
    }

    const isEstimated = ageMode === 'age';
    const finalDob = isEstimated ? calculateDobFromAge() : dob;

    const animalId = uuid();
    const image_url = await persistAnimalImage(animalId, image);

    const newAnimal: Animal = {
      id: animalId,
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
      mother_id: motherId || undefined,
      child_number: childNumber.trim() || undefined,
      image_url,
      notes: '',
      created_at: new Date().toISOString(),
    };

    await addAnimal(newAnimal);

    // ── Auto-create an insemination record so the animal appears in the
    //    insemination list when registered with status Inseminated or Pregnant ──
    if (sex === 'Female' && ['Inseminated', 'Pregnant'].includes(reproStatus)) {
      const aiDateStr = toDateString(inseminationDate);
      const pcDate = addDays(aiDateStr, PREGNANCY_CHECK_DAYS);
      const expectedCalving = reproStatus === 'Pregnant'
        ? addDays(aiDateStr, getGestationDays(species))
        : '';
      const insemRecord: Insemination = {
        id: uuid(),
        animal_id: animalId,
        lactation_number: String(getEffectiveLactation({ repro_status: reproStatus, lactation_number: lactationNo })),
        ai_date: aiDateStr,
        semen_company: '',
        bull_name: '',
        pregnancy_check_date: pcDate,
        pregnancy_status: reproStatus as any,
        expected_calving_date: expectedCalving,
        notes: 'Auto-created on animal registration',
        created_at: new Date().toISOString(),
      };
      await addInsemination(insemRecord);
    }

    // Register the calf along with its pregnant mother in one step
    if (registerCalf) {
      const calfId = uuid();
      const calfImage = await persistAnimalImage(calfId, calfRegImage);
      const calf: Animal = {
        id: calfId,
        tag_number: calfRegTag.trim(),
        name: calfRegName.trim() || `Calf of ${newAnimal.tag_number}`,
        species: newAnimal.species,
        breed: newAnimal.breed,
        sex: calfRegSex,
        date_of_birth: expectedCalfDob,
        dob_is_estimated: false,
        color: newAnimal.color,
        repro_status: 'Calf',
        lactation_number: undefined,
        last_insemination_date: undefined,
        mother_id: animalId,
        child_number: undefined,
        image_url: calfImage,
        notes: `Mother Tag: ${newAnimal.tag_number}`,
        created_at: new Date().toISOString(),
      };
      await addAnimal(calf);

      // Also create a calving record linking the mother to this calf
      const calvingRecord: Calving = {
        id: uuid(),
        animal_id: newAnimal.id,
        calving_date: expectedCalfDob,
        calf_tag: calfRegTag.trim(),
        calf_name: calfRegName.trim() || `Calf of ${newAnimal.tag_number}`,
        calf_sex: calfRegSex,
        complications: '',
        notes: '',
        created_at: new Date().toISOString(),
      };
      await addCalving(calvingRecord);
    }

    Toast.show({ type: 'success', text1: 'Awesome!', text2: 'Animal registered successfully.' });
    router.back();
  };


  return (
    <AppBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
        <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Herd group banner */}
        <View style={s.heroBanner}>
          <View style={s.heroBannerOverlay} />
          <View style={s.heroBannerText}>
            <Text style={s.heroBannerTitle}>Register a New Animal</Text>
            <Text style={s.heroBannerSub}>Cow · Buffalo · Goat · Sheep</Text>
          </View>
        </View>

        {/* Basic Info */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <View style={s.iconBg}><Tag color="#fff" size={20} /></View>
            <Text style={s.sectionHeader}>Basic Info</Text>
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

          <View style={s.inputGroup}>
            <Text style={s.label}>Species</Text>
            <View style={s.speciesGrid}>
              {SPECIES_LIST.map((sp) => {
                const selected = species === sp;
                return (
                  <TouchableOpacity
                    key={sp}
                    style={[s.speciesCard, selected && s.speciesCardActive]}
                    onPress={() => setSpecies(sp)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.speciesEmoji}>{SPECIES_EMOJI[sp]}</Text>
                    <Text style={[s.speciesName, selected && s.speciesNameActive]}>{sp}</Text>
                    {selected && (
                      <View style={s.speciesCheck}>
                        <Check color="#fff" size={12} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Optional animal photo */}
          <View style={s.photoField}>
            <TouchableOpacity style={s.photoBox} activeOpacity={0.8} onPress={() => imagePicker.open(setImage)}>
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
            <Text style={s.label}>Breed *</Text>
            <View style={s.inputWrapper}>
              <TextInput style={s.input} placeholder="e.g. Sahiwal" value={breed} onChangeText={setBreed} placeholderTextColor={Colors.textMuted} />
            </View>
          </View>

          {/* Mother Selection (optional) */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Select Mother (Optional)</Text>
            <View style={s.pickerContainer}>
              <Select
                value={motherId}
                placeholder="-- No Mother / Unknown --"
                onValueChange={setMotherId}
                options={[
                  { label: '-- No Mother / Unknown --', value: '' },
                  ...femaleAnimals.map(a => ({ label: `${a.tag_number}${a.name && a.name !== 'Unknown' ? ' – ' + a.name : ''}`, value: a.id })),
                ]}
              />
            </View>
            <Text style={s.fieldHint}>Link this animal to its mother (for calves and traceability)</Text>
          </View>

          {/* Child Number */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Child No. (Optional)</Text>
            <View style={s.inputWrapper}>
              <TextInput
                style={s.input}
                placeholder="e.g. 1 (1st calf), 2 (2nd calf)..."
                value={childNumber}
                onChangeText={setChildNumber}
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <Text style={s.fieldHint}>Which lactation calf number is this animal?</Text>
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
              {['Pregnant', 'Inseminated'].includes(reproStatus) && (
                <Text style={s.lactationHint}>
                  Effective lactation while {reproStatus === 'Pregnant' ? 'pregnant' : 'inseminated'}: {getEffectiveLactation({ repro_status: reproStatus, lactation_number: lactationNo })}
                </Text>
              )}
            </View>
          )}

          <View style={s.ageToggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, ageMode === 'age' && s.toggleBtnActive]}
              onPress={() => setAgeMode('age')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, ageMode === 'age' && s.toggleTextActive]}>Enter Age</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, ageMode === 'dob' && s.toggleBtnActive]}
              onPress={() => setAgeMode('dob')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, ageMode === 'dob' && s.toggleTextActive]}>Enter Date of Birth</Text>
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
                        padding: '14px 16px', fontSize: '16px',
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
                    padding: '14px 16px', fontSize: '16px',
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

              {reproStatus === 'Pregnant' && (() => {
                const gestDays = getGestationDays(species);
                const calving = new Date(addDays(toDateString(inseminationDate), gestDays));
                return (
                  <View style={s.calvingPreview}>
                    <Text style={s.calvingPreviewLabel}>📅 Expected Calving Date</Text>
                    <Text style={s.calvingPreviewDate}>{calving.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    <Text style={s.calvingPreviewSub}>{species} gestation: {gestDays} days from insemination</Text>
                  </View>
                );
              })()}
              {reproStatus === 'Inseminated' && (() => {
                const gestDays = getGestationDays(species);
                const expectedPreg = new Date(addDays(toDateString(inseminationDate), gestDays));
                return (
                  <View style={[s.calvingPreview, { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}>
                    <Text style={[s.calvingPreviewLabel, { color: '#2563EB' }]}>🗓 Expected Pregnancy Confirmation</Text>
                    <Text style={[s.calvingPreviewDate, { color: '#1E3A8A' }]}>{expectedPreg.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    <Text style={s.calvingPreviewSub}>If confirmed pregnant · {species} gestation: {gestDays} days</Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* Optional instant calf registration: only once delivery has already occurred */}
          {sex === 'Female' && reproStatus === 'Pregnant' && expectedCalfDob && expectedCalfDob <= toDateString(now) && (
            <View style={s.inputGroup}>
              <TouchableOpacity
                style={[s.calfToggle, registerCalf && s.calfToggleOn]}
                onPress={() => {
                  const next = !registerCalf;
                  setRegisterCalf(next);
                  if (next && !calfRegTag) setCalfRegTag(suggestCalfTag());
                }}
                activeOpacity={0.8}
              >
                <View style={[s.calfToggleDot, registerCalf && s.calfToggleDotOn]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.calfToggleTitle, registerCalf && s.calfToggleTitleOn]}>Register calf with mother</Text>
                  <Text style={s.calfToggleSub}>Optional · add the unborn calf at the same time</Text>
                </View>
              </TouchableOpacity>

              {registerCalf && (
                <>
                  {/* Optional calf photo */}
                  <View style={s.photoField}>
                    <TouchableOpacity style={s.photoBox} activeOpacity={0.8} onPress={() => imagePicker.open(setCalfRegImage)}>
                      {calfRegImage ? (
                        <Image source={{ uri: calfRegImage }} style={s.photoPreview} resizeMode="contain" />
                      ) : (
                        <View style={s.photoPlaceholder}>
                          <Camera color={Colors.primary} size={26} />
                        </View>
                      )}
                      {calfRegImage ? (
                        <TouchableOpacity style={s.photoRemove} activeOpacity={0.7} onPress={() => setCalfRegImage(null)}>
                          <X color="#fff" size={14} />
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                    <View style={s.photoMeta}>
                      <Text style={s.photoTitle}>Calf Photo</Text>
                      <Text style={s.photoHint}>Optional · tap to add an identifying picture</Text>
                    </View>
                  </View>

                  <View style={s.row}>
                    <View style={[s.inputGroup, { flex: 1, paddingRight: 6, marginBottom: 12 }]}>
                      <Text style={s.label}>Calf Name</Text>
                      <View style={s.inputWrapper}>
                        <TextInput style={s.input} placeholder="e.g. Nela" value={calfRegName} onChangeText={setCalfRegName} placeholderTextColor={Colors.textMuted} />
                      </View>
                    </View>
                    <View style={[s.inputGroup, { flex: 1, paddingLeft: 6, marginBottom: 12 }]}>
                      <Text style={s.label}>Calf Tag *</Text>
                      <View style={s.inputWrapper}>
                        <TextInput style={s.input} placeholder="e.g. C-102A" value={calfRegTag} onChangeText={setCalfRegTag} placeholderTextColor={Colors.textMuted} />
                      </View>
                    </View>
                  </View>

                  <View style={[s.inputGroup, { marginBottom: 12 }]}>
                    <Text style={s.label}>Calf Sex</Text>
                    <View style={s.pickerContainer}>
                      <Select
                        value={calfRegSex}
                        onValueChange={(v) => setCalfRegSex(v as Sex)}
                        options={[{ label: 'Female', value: 'Female' }, { label: 'Male', value: 'Male' }]}
                      />
                    </View>
                  </View>

                  {/* Auto-calculated calf details preview */}
                  <View style={s.calcCard}>
                    <Text style={s.calcLabel}>Auto-calculated for calf</Text>
                    <View style={s.calfCalcRow}>
                      <Text style={s.calfCalcLabel}>Mother</Text>
                      <Text style={s.calfCalcValue}>{tag.trim() || 'This animal'}</Text>
                    </View>
                    <View style={s.calfCalcRow}>
                      <Text style={s.calfCalcLabel}>Date of Birth</Text>
                      <Text style={s.calfCalcValue}>{new Date(expectedCalfDob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    </View>
                    <View style={s.calfCalcRow}>
                      <Text style={s.calfCalcLabel}>Species / Breed</Text>
                      <Text style={s.calfCalcValue}>{species} · {breed || '—'}</Text>
                    </View>
                    <View style={s.calfCalcRow}>
                      <Text style={s.calfCalcLabel}>Age at birth</Text>
                      <Text style={s.calfCalcValue}>0 mo</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Check color="#fff" size={24} style={{ marginRight: 8 }} />
          <Text style={s.saveBtnText}>Save Animal</Text>
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

  heroBanner: {
    position: 'relative',
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: Colors.primary,
    ...Shadows.md,
  },
  heroBannerImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: 160 },
  heroBannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 39, 66, 0.4)' },
  heroBannerText: { position: 'absolute', left: 18, right: 18, bottom: 16 },
  heroBannerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  heroBannerSub: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginTop: 2 },

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

  row: { flexDirection: 'row', alignItems: 'center' },
  inputGroup: { marginBottom: 18 },
  fieldHint: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 6, marginLeft: 4 },

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

  speciesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 12, marginBottom: 4 },
  speciesCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    position: 'relative',
  },
  speciesCardActive: {
    backgroundColor: '#EAF1FB',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  speciesEmoji: { fontSize: 26, marginRight: 10 },
  speciesName: { fontSize: 15, fontWeight: '800', color: Colors.textSecondary },
  speciesNameActive: { color: Colors.primary },
  speciesCheck: {
    position: 'absolute',
    top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  ageToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
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
  lactationHint: {
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#059669',
    fontWeight: '800',
    overflow: 'hidden',
  },
  calfCalcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  calfCalcLabel: { fontSize: 13, fontWeight: '800', color: '#6B7280' },
  calfCalcValue: { fontSize: 14, fontWeight: '900', color: '#1F2937', flexShrink: 1 },

  calfToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 6,
  },
  calfToggleOn: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  calfToggleDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#CBD5E1',
    marginRight: 12,
  },
  calfToggleDotOn: { backgroundColor: '#10B981', borderColor: '#10B981' },
  calfToggleTitle: { fontSize: 15, fontWeight: '900', color: '#1F2937' },
  calfToggleTitleOn: { color: '#059669' },
  calfToggleSub: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 2 },

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

  calvingPreview: {
    marginTop: 12, backgroundColor: '#D1FAE5', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#6EE7B7',
  },
  calvingPreviewLabel: { fontSize: 12, fontWeight: '800', color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  calvingPreviewDate: { fontSize: 18, fontWeight: '900', color: '#065F46', marginBottom: 4 },
  calvingPreviewSub: { fontSize: 12, color: '#6B7280', fontWeight: '700' },
});

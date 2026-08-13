/**
 * Herdly — Data store (SQLite-backed).
 *
 * The public `useStore()` API is unchanged. Internally, every CRUD operation now
 * goes through the repository layer + SQLite instead of AsyncStorage JSON files.
 * When a cloud backend (e.g. Supabase) is added later, only the repositories need
 * to change — this file and all screens stay the same.
 */
import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import type {
  Animal, Insemination, Calving, Vaccination, Deworming,
} from '../types';
import {
  initDatabase,
  migrateFromAsyncStorage,
  animalRepository,
  inseminationRepository,
  calvingRepository,
  vaccinationRepository,
  dewormingRepository,
} from '../database';
import { promoteCalves } from '../utils/calfPromotion';

// ─── State shape ────────────────────────────────────────────────────────────
interface StoreState {
  animals:       Animal[];
  inseminations: Insemination[];
  calvings:      Calving[];
  vaccinations:  Vaccination[];
  dewormings:    Deworming[];
  loading:       boolean;
}

const INITIAL: StoreState = {
  animals: [], inseminations: [], calvings: [],
  vaccinations: [], dewormings: [], loading: true,
};

// ─── Actions ─────────────────────────────────────────────────────────────────
type Action =
  | { type: 'LOAD';    payload: Partial<StoreState> }
  | { type: 'DONE_LOADING' }
  | { type: 'ADD_ANIMAL';         payload: Animal }
  | { type: 'UPDATE_ANIMAL';      payload: Animal }
  | { type: 'DELETE_ANIMAL';      payload: string }
  | { type: 'ADD_INSEMINATION';   payload: Insemination }
  | { type: 'UPDATE_INSEMINATION';payload: Insemination }
  | { type: 'ADD_CALVING';        payload: Calving }
  | { type: 'UPDATE_CALVING';     payload: Calving }
  | { type: 'DELETE_CALVING';     payload: string }
  | { type: 'ADD_VACCINATION';    payload: Vaccination }
  | { type: 'ADD_DEWORMING';      payload: Deworming };

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'LOAD':         return { ...state, ...action.payload, loading: false };
    case 'DONE_LOADING': return { ...state, loading: false };
    case 'ADD_ANIMAL':         return { ...state, animals: [...state.animals, action.payload] };
    case 'UPDATE_ANIMAL':      return { ...state, animals: state.animals.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_ANIMAL':
      return {
        ...state,
        animals: state.animals.filter(a => a.id !== action.payload),
        vaccinations: state.vaccinations.filter(v => v.animal_id !== action.payload),
        dewormings: state.dewormings.filter(d => d.animal_id !== action.payload),
        inseminations: state.inseminations.map(i => i.animal_id === action.payload ? { ...i, animal_id: '' } : i),
        calvings: state.calvings.map(c => c.animal_id === action.payload ? { ...c, animal_id: '' } : c),
      };
    case 'ADD_INSEMINATION':   return { ...state, inseminations: [...state.inseminations, action.payload] };
    case 'UPDATE_INSEMINATION':return { ...state, inseminations: state.inseminations.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'ADD_CALVING':        return { ...state, calvings: [...state.calvings, action.payload] };
    case 'UPDATE_CALVING':     return { ...state, calvings: state.calvings.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CALVING':     return { ...state, calvings: state.calvings.filter(c => c.id !== action.payload) };
    case 'ADD_VACCINATION':    return { ...state, vaccinations: [...state.vaccinations, action.payload] };
    case 'ADD_DEWORMING':      return { ...state, dewormings: [...state.dewormings, action.payload] };
    default: return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface StoreContext extends StoreState {
  addAnimal:          (a: Animal) => Promise<void>;
  updateAnimal:       (a: Animal) => Promise<void>;
  deleteAnimal:       (id: string) => Promise<void>;
  addInsemination:    (i: Insemination) => Promise<void>;
  updateInsemination: (i: Insemination) => Promise<void>;
  addCalving:         (c: Calving) => Promise<void>;
  updateCalving:      (c: Calving) => Promise<void>;
  deleteCalving:      (id: string) => Promise<void>;
  addVaccination:     (v: Vaccination) => Promise<void>;
  addDeworming:       (d: Deworming) => Promise<void>;
  /** Atomic calving write: insert calving (+ optional calf animal + mother update). */
  recordCalving:      (c: Calving, calf?: Animal, motherUpdate?: Animal) => Promise<void>;
}

const Ctx = createContext<StoreContext>({} as StoreContext);

// ─── Provider ────────────────────────────────────────────────────────────────
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Initialize DB, migrate legacy data, then load everything into state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await initDatabase();
        await migrateFromAsyncStorage(db);
        const [animals, inseminations, calvings, vaccinations, dewormings] = await Promise.all([
          animalRepository.getAnimals(db),
          inseminationRepository.getInseminations(db),
          calvingRepository.getCalvings(db),
          vaccinationRepository.getVaccinations(db),
          dewormingRepository.getDewormings(db),
        ]);
        if (!cancelled) {
          // Auto-promote mature calves to adult status in the DB
          // (runs silently; errors are non-fatal)
          try {
            await promoteCalves(animals, async (updated) => {
              await animalRepository.updateAnimal(updated);
              // reflect in the local array so dispatch gets the updated list
              const idx = animals.findIndex(a => a.id === updated.id);
              if (idx !== -1) animals[idx] = updated;
            });
          } catch (e) {
            console.warn('[Herdly] calf promotion error (non-fatal):', e);
          }
          dispatch({ type: 'LOAD', payload: { animals, inseminations, calvings, vaccinations, dewormings } });
        }
      } catch (e) {
        // Never leave the app stuck on the loading screen.
        console.error('[Herdly] Failed to initialize local database:', e);
        if (!cancelled) dispatch({ type: 'DONE_LOADING' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addAnimal = useCallback(async (a: Animal) => {
    try {
      await animalRepository.createAnimal(a);
      dispatch({ type: 'ADD_ANIMAL', payload: a });
    } catch (e) {
      console.error('[Herdly] addAnimal failed:', e);
      Toast.show({ type: 'error', text1: 'Save failed', text2: 'Could not save animal.' });
      throw e;
    }
  }, []);

  const updateAnimal = useCallback(async (a: Animal) => {
    try {
      await animalRepository.updateAnimal(a);
      dispatch({ type: 'UPDATE_ANIMAL', payload: a });
    } catch (e) {
      console.error('[Herdly] updateAnimal failed:', e);
      Toast.show({ type: 'error', text1: 'Save failed', text2: 'Could not update animal.' });
      throw e;
    }
  }, []);

  const deleteAnimal = useCallback(async (id: string) => {
    try {
      await animalRepository.deleteAnimal(id);
      dispatch({ type: 'DELETE_ANIMAL', payload: id });
    } catch (e) {
      console.error('[Herdly] deleteAnimal failed:', e);
      Toast.show({ type: 'error', text1: 'Delete failed', text2: 'Could not delete animal.' });
      throw e;
    }
  }, []);

  const addInsemination = useCallback(async (i: Insemination) => {
    try {
      await inseminationRepository.createInsemination(i);
      dispatch({ type: 'ADD_INSEMINATION', payload: i });
    } catch (e) {
      console.error('[Herdly] addInsemination failed:', e);
      Toast.show({ type: 'error', text1: 'Save failed', text2: 'Could not save insemination.' });
      throw e;
    }
  }, []);

  const updateInsemination = useCallback(async (i: Insemination) => {
    try {
      await inseminationRepository.updateInsemination(i);
      dispatch({ type: 'UPDATE_INSEMINATION', payload: i });
    } catch (e) {
      console.error('[Herdly] updateInsemination failed:', e);
      Toast.show({ type: 'error', text1: 'Save failed', text2: 'Could not update insemination.' });
      throw e;
    }
  }, []);

  const addCalving = useCallback(async (c: Calving) => {
    try {
      await calvingRepository.createCalving(c);
      dispatch({ type: 'ADD_CALVING', payload: c });
    } catch (e) {
      console.error('[Herdly] addCalving failed:', e);
      Toast.show({ type: 'error', text1: 'Save failed', text2: 'Could not save calving.' });
      throw e;
    }
  }, []);

  const updateCalving = useCallback(async (c: Calving) => {
    try {
      await calvingRepository.updateCalving(c);
      dispatch({ type: 'UPDATE_CALVING', payload: c });
    } catch (e) {
      console.error('[Herdly] updateCalving failed:', e);
      Toast.show({ type: 'error', text1: 'Save failed', text2: 'Could not update calving.' });
      throw e;
    }
  }, []);

  const deleteCalving = useCallback(async (id: string) => {
    try {
      await calvingRepository.deleteCalving(id);
      dispatch({ type: 'DELETE_CALVING', payload: id });
    } catch (e) {
      console.error('[Herdly] deleteCalving failed:', e);
      Toast.show({ type: 'error', text1: 'Delete failed', text2: 'Could not delete calving.' });
      throw e;
    }
  }, []);

  const addVaccination = useCallback(async (v: Vaccination) => {
    try {
      await vaccinationRepository.createVaccination(v);
      dispatch({ type: 'ADD_VACCINATION', payload: v });
    } catch (e) {
      console.error('[Herdly] addVaccination failed:', e);
      Toast.show({ type: 'error', text1: 'Save failed', text2: 'Could not save vaccination.' });
      throw e;
    }
  }, []);

  const addDeworming = useCallback(async (d: Deworming) => {
    try {
      await dewormingRepository.createDeworming(d);
      dispatch({ type: 'ADD_DEWORMING', payload: d });
    } catch (e) {
      console.error('[Herdly] addDeworming failed:', e);
      Toast.show({ type: 'error', text1: 'Save failed', text2: 'Could not save deworming.' });
      throw e;
    }
  }, []);

  const recordCalving = useCallback(async (c: Calving, calf?: Animal, motherUpdate?: Animal) => {
    try {
      await calvingRepository.recordCalving(c, calf, motherUpdate);
      dispatch({ type: 'ADD_CALVING', payload: c });
      if (calf) dispatch({ type: 'ADD_ANIMAL', payload: calf });
      if (motherUpdate) dispatch({ type: 'UPDATE_ANIMAL', payload: motherUpdate });
    } catch (e) {
      console.error('[Herdly] recordCalving failed:', e);
      Toast.show({ type: 'error', text1: 'Save failed', text2: 'Could not save calving.' });
      throw e;
    }
  }, []);

  return (
    <Ctx.Provider value={{
      ...state,
      addAnimal,      updateAnimal,
      deleteAnimal,
      addInsemination,
      updateInsemination,
      addCalving,
      updateCalving,
      deleteCalving,
      addVaccination, addDeworming,
      recordCalving,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  return useContext(Ctx);
}

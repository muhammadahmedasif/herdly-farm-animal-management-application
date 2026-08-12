/**
 * Herdly — Local Data Store
 * Uses AsyncStorage so data persists between app restarts.
 * When Supabase is connected, only this file changes — all screens stay the same.
 */
import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Animal, Insemination, Calving, Vaccination, Deworming,
} from '../types';

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
  | { type: 'ADD_VACCINATION';    payload: Vaccination }
  | { type: 'ADD_DEWORMING';      payload: Deworming }
  | { type: 'DELETE_CALVING';     payload: string };

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'LOAD':         return { ...state, ...action.payload, loading: false };
    case 'DONE_LOADING': return { ...state, loading: false };
    case 'ADD_ANIMAL':         return { ...state, animals: [...state.animals, action.payload] };
    case 'UPDATE_ANIMAL':      return { ...state, animals: state.animals.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_ANIMAL':      return { ...state, animals: state.animals.filter(a => a.id !== action.payload) };
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
}

const Ctx = createContext<StoreContext>({} as StoreContext);

// ─── Storage helpers ─────────────────────────────────────────────────────────
const KEYS = {
  animals:       '@herdly/animals',
  inseminations: '@herdly/inseminations',
  calvings:      '@herdly/calvings',
  vaccinations:  '@herdly/vaccinations',
  dewormings:    '@herdly/dewormings',
};

async function save<T>(key: string, data: T[]) {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}
async function load<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Load everything from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const [animals, inseminations, calvings, vaccinations, dewormings] = await Promise.all([
          load<Animal>(KEYS.animals),
          load<Insemination>(KEYS.inseminations),
          load<Calving>(KEYS.calvings),
          load<Vaccination>(KEYS.vaccinations),
          load<Deworming>(KEYS.dewormings),
        ]);
        dispatch({ type: 'LOAD', payload: { animals, inseminations, calvings, vaccinations, dewormings } });
      } catch {
        dispatch({ type: 'DONE_LOADING' });
      }
    })();
  }, []);

  // CRUD helpers
  const addAnimal = useCallback(async (a: Animal) => {
    dispatch({ type: 'ADD_ANIMAL', payload: a });
    const next = [...state.animals, a];
    await save(KEYS.animals, next);
  }, [state.animals]);

  const updateAnimal = useCallback(async (a: Animal) => {
    dispatch({ type: 'UPDATE_ANIMAL', payload: a });
    const next = state.animals.map(x => x.id === a.id ? a : x);
    await save(KEYS.animals, next);
  }, [state.animals]);

  const deleteAnimal = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_ANIMAL', payload: id });
    const next = state.animals.filter(x => x.id !== id);
    await save(KEYS.animals, next);
  }, [state.animals]);

  const addInsemination = useCallback(async (i: Insemination) => {
    dispatch({ type: 'ADD_INSEMINATION', payload: i });
    const next = [...state.inseminations, i];
    await save(KEYS.inseminations, next);
  }, [state.inseminations]);

  const updateInsemination = useCallback(async (i: Insemination) => {
    dispatch({ type: 'UPDATE_INSEMINATION', payload: i });
    const next = state.inseminations.map(x => x.id === i.id ? i : x);
    await save(KEYS.inseminations, next);
  }, [state.inseminations]);

  const addCalving = useCallback(async (c: Calving) => {
    dispatch({ type: 'ADD_CALVING', payload: c });
    const next = [...state.calvings, c];
    await save(KEYS.calvings, next);
  }, [state.calvings]);

  const updateCalving = useCallback(async (c: Calving) => {
    dispatch({ type: 'UPDATE_CALVING', payload: c });
    const next = state.calvings.map(x => x.id === c.id ? c : x);
    await save(KEYS.calvings, next);
  }, [state.calvings]);

  const deleteCalving = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_CALVING', payload: id });
    const next = state.calvings.filter(x => x.id !== id);
    await save(KEYS.calvings, next);
  }, [state.calvings]);

  const addVaccination = useCallback(async (v: Vaccination) => {
    dispatch({ type: 'ADD_VACCINATION', payload: v });
    const next = [...state.vaccinations, v];
    await save(KEYS.vaccinations, next);
  }, [state.vaccinations]);

  const addDeworming = useCallback(async (d: Deworming) => {
    dispatch({ type: 'ADD_DEWORMING', payload: d });
    const next = [...state.dewormings, d];
    await save(KEYS.dewormings, next);
  }, [state.dewormings]);

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
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  return useContext(Ctx);
}

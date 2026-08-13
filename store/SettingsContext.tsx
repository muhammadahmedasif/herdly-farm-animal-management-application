import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppHeaderStyle = 'gradient' | 'solid' | 'minimal';
export type AppTheme = 'light' | 'dark' | 'system';

interface SettingsState {
  headerStyle: AppHeaderStyle;
  theme: AppTheme;
  appName: string;
  loading: boolean;
}

interface SettingsContextType extends SettingsState {
  setHeaderStyle: (style: AppHeaderStyle) => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
  setAppName: (name: string) => Promise<void>;
}

const SETTINGS_STORAGE_KEY = '@herdly_app_settings';

const defaultSettings: SettingsState = {
  headerStyle: 'gradient',
  theme: 'system',
  appName: 'Herdly',
  loading: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({ ...defaultSettings, ...parsed, loading: false });
        } else {
          setSettings({ ...defaultSettings, loading: false });
        }
      } catch (e) {
        console.error('Failed to load settings', e);
        setSettings({ ...defaultSettings, loading: false });
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (newSettings: Partial<SettingsState>) => {
    const updated = { ...settings, ...newSettings, loading: false };
    setSettings(updated);
    try {
      // Don't persist the loading flag
      const { loading, ...toSave } = updated;
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  };

  const setHeaderStyle = async (headerStyle: AppHeaderStyle) => {
    await saveSettings({ headerStyle });
  };

  const setTheme = async (theme: AppTheme) => {
    await saveSettings({ theme });
  };

  const setAppName = async (appName: string) => {
    await saveSettings({ appName });
  };

  return (
    <SettingsContext.Provider value={{ ...settings, setHeaderStyle, setTheme, setAppName }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

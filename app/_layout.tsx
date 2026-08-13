import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { StoreProvider, useStore } from '../store/StoreContext';
import { SettingsProvider } from '../store/SettingsContext';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { loading } = useStore();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  return (
    <>
    <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="animals/register"
          options={{
            headerShown: true,
            title: 'Register Animal',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="animals/[id]"
          options={{
            headerShown: true,
            title: 'Animal Details',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          }}
        />
        <Stack.Screen
          name="animals/edit"
          options={{
            headerShown: true,
            title: 'Edit Animal',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          }}
        />
        <Stack.Screen
          name="health/insemination"
          options={{
            headerShown: true,
            title: 'Insemination',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          }}
        />
        <Stack.Screen
          name="health/calving"
          options={{
            headerShown: true,
            title: 'Calving Register',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          }}
        />
        <Stack.Screen
          name="health/vaccination"
          options={{
            headerShown: true,
            title: 'Vaccination',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          }}
        />
        <Stack.Screen
          name="health/deworming"
          options={{
            headerShown: true,
            title: 'Deworming',
            headerStyle: { backgroundColor: '#1E3A5F' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <Toast />
    </>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <StoreProvider>
        <RootStack />
      </StoreProvider>
    </SettingsProvider>
  );
}

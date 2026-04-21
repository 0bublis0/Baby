import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import RecordScreen from './src/screens/RecordScreen';
import DescribeScreen from './src/screens/DescribeScreen';
import PlayScreen from './src/screens/PlayScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1c1008' },
          headerTintColor: '#c9a84c',
          headerTitleStyle: { fontWeight: 'bold', letterSpacing: 2 },
          headerBackTitleVisible: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0a0500' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Record" component={RecordScreen} options={{ title: 'RECORD MELODY' }} />
        <Stack.Screen name="Describe" component={DescribeScreen} options={{ title: 'DESCRIBE STYLE' }} />
        <Stack.Screen name="Play" component={PlayScreen} options={{ title: 'THE BARD PERFORMS' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

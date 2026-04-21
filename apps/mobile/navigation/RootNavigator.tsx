import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { FONTS, THEME } from "../constants/theme";
import { supabase } from "../lib/supabase";
import { syncAppUser } from "../lib/api";
import LoginScreen from "../screens/auth/LoginScreen";
import SymptomInputScreen from "../screens/check/SymptomInputScreen";
import FollowupScreen from "../screens/check/FollowupScreen";
import ResultScreen from "../screens/check/ResultScreen";
import HistoryDetailScreen from "../screens/history/HistoryDetailScreen";
import HistoryListScreen from "../screens/history/HistoryListScreen";
import AddChildScreen from "../screens/home/AddChildScreen";
import ChildDetailScreen from "../screens/home/ChildDetailScreen";
import HomeScreen from "../screens/home/HomeScreen";
import MilestonesScreen from "../screens/home/MilestonesScreen";
import VaccinesScreen from "../screens/home/VaccinesScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import type {
  CheckStackParamList,
  HistoryStackParamList,
  HomeStackParamList,
  RootStackParamList,
} from "./types";

import type { Session } from "@supabase/supabase-js";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const CheckStack = createNativeStackNavigator<CheckStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const Tab = createBottomTabNavigator();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
      <HomeStack.Screen name="AddChild" component={AddChildScreen} />
      <HomeStack.Screen name="ChildDetail" component={ChildDetailScreen} />
      <HomeStack.Screen name="Milestones" component={MilestonesScreen} />
      <HomeStack.Screen name="Vaccines" component={VaccinesScreen} />
    </HomeStack.Navigator>
  );
}

function CheckNavigator() {
  return (
    <CheckStack.Navigator screenOptions={{ headerShown: false }}>
      <CheckStack.Screen name="SymptomInput" component={SymptomInputScreen} />
      <CheckStack.Screen name="Followup" component={FollowupScreen} />
      <CheckStack.Screen name="Result" component={ResultScreen} />
    </CheckStack.Navigator>
  );
}

function HistoryNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="HistoryList" component={HistoryListScreen} />
      <HistoryStack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
    </HistoryStack.Navigator>
  );
}

const TAB_ICONS: Record<string, string> = {
  Home: "🏠",
  Check: "🔍",
  History: "📋",
  Profile: "👤",
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: THEME.card,
          borderTopColor: THEME.borderSoft,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor: "#7c3aed",
        tabBarInactiveTintColor: THEME.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: FONTS.semiBold,
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{TAB_ICONS[route.name] ?? "•"}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Check" component={CheckNavigator} />
      <Tab.Screen name="History" component={HistoryNavigator} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [session, setSession] = useState<Session | null | "loading">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_IN") {
        // Ensure Prisma user row exists for FK integrity
        void syncAppUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === "loading") {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: THEME.page }}
      >
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

import { useEffect, useState } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import BrandLogo from './components/BrandLogo';
import { colors, fonts, styles } from './styles';
import { demoJobs, companyJobs } from './data/jobs';
import { api, setSessionExpiredHandler, setToken } from './data/api';
import { ActivityProvider, useActivity } from './data/ActivityContext';
import FeedScreen from './screens/FeedScreen';
import HomeScreen from './screens/HomeScreen';
import JobScreen from './screens/JobScreen';
import ApplyScreen from './screens/ApplyScreen';
import RoleScreen from './screens/RoleScreen';
import CompanyScreen from './screens/CompanyScreen';
import ApplicationsScreen from './screens/ApplicationsScreen';
import ProfileScreen from './screens/ProfileScreen';
import EmploymentScreen from './screens/EmploymentScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.petrol,
    background: colors.background,
    card: colors.white,
    text: colors.ink,
    border: colors.border,
    notification: colors.orange,
  },
  fonts: {
    regular: { fontFamily: fonts.regular, fontWeight: '400' },
    medium: { fontFamily: fonts.bold, fontWeight: '400' },
    bold: { fontFamily: fonts.bold, fontWeight: '400' },
    heavy: { fontFamily: fonts.bold, fontWeight: '400' },
  },
};
const stackOptions = {
  headerRight: () => <BrandLogo markOnly size={26} />,
  headerStyle: styles.navigationHeader,
  headerTintColor: colors.ink,
  headerShadowVisible: false,
  headerTitleStyle: styles.navigationTitle,
  contentStyle: styles.screen,
};

function FeedNavigator({ user }) {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Feed" options={{ headerShown: false }}>
        {p => <FeedScreen {...p} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="Profile" options={{ title: 'Profil' }}>
        {p => <ProfileScreen {...p} user={user} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
function JobsNavigator({ user, jobs, examples, ...props }) {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="JobList"
        options={{ headerShown: user.role === 'company', title: 'Jeres jobs' }}
      >
        {p =>
          user.role === 'company' ? (
            <CompanyScreen
              {...p}
              {...props}
              user={user}
              jobs={jobs.filter(j => j.companyId === user.id)}
              demoJobs={jobs.filter(j => j.fictional)}
            />
          ) : (
            <HomeScreen
              {...p}
              jobs={[...jobs, ...examples]}
              onRefresh={props.onRetry}
              refreshing={props.loading}
              storageError={props.storageError}
            />
          )
        }
      </Stack.Screen>
      <Stack.Screen name="Job" options={{ title: 'Jobmulighed' }}>
        {p => <JobScreen {...p} jobs={[...jobs, ...examples]} canApply={user.role === 'young'} />}
      </Stack.Screen>
      {user.role === 'young' && (
        <Stack.Screen name="Apply" options={{ title: 'Din ansøgning' }}>
          {p => <ApplyScreen {...p} jobs={jobs} user={user} />}
        </Stack.Screen>
      )}
      {user.role === 'company' && (
        <Stack.Screen name="Applications" options={{ title: 'Ansøgninger og tilbud' }}>
          {p => <ApplicationsScreen {...p} jobs={jobs.filter(j => j.companyId === user.id)} />}
        </Stack.Screen>
      )}
      <Stack.Screen name="Profile" options={{ title: 'Profil' }}>
        {p => <ProfileScreen {...p} user={user} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
function ProfileNavigator({ user, jobs, onLogout }) {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="MyProfile"
        options={{ title: user.role === 'company' ? 'Virksomhedsprofil' : 'Min profil' }}
      >
        {p => <ProfileScreen {...p} user={user} onLogout={onLogout} />}
      </Stack.Screen>
      {user.role === 'young' ? (
        <Stack.Screen
          name="Employment"
          component={EmploymentScreen}
          options={{ title: 'Mine ansættelser' }}
        />
      ) : (
        <Stack.Screen name="Applications" options={{ title: 'Ansøgninger og tilbud' }}>
          {p => <ApplicationsScreen {...p} jobs={jobs.filter(j => j.companyId === user.id)} />}
        </Stack.Screen>
      )}
      <Stack.Screen name="Profile" options={{ title: 'Profil' }}>
        {p => <ProfileScreen {...p} user={user} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
function MainTabs(props) {
  const { counts } = useActivity();
  const insets = useSafeAreaInsets();
  const company = props.user.role === 'company';
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => {
        const key = { FeedTab: 'feed', JobsTab: 'jobs', ProfileTab: 'profile' }[route.name];
        const icons = {
          FeedTab: ['home-outline', 'home'],
          JobsTab: ['briefcase-outline', 'briefcase'],
          ProfileTab: ['person-outline', 'person'],
        }[route.name];
        return {
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.green,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            height: 72 + insets.bottom,
            backgroundColor: colors.white,
            borderTopColor: colors.border,
            paddingTop: 8,
            paddingBottom: Math.max(8, insets.bottom),
          },
          tabBarLabelStyle: { fontSize: 12, fontFamily: fonts.bold },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={icons[focused ? 1 : 0]} size={size} color={color} />
          ),
          tabBarBadge: counts[key] ? (counts[key] > 99 ? '99+' : counts[key]) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.petrol,
            color: colors.white,
            fontSize: 10,
            fontFamily: fonts.bold,
          },
          tabBarHideOnKeyboard: true,
        };
      }}
    >
      <Tabs.Screen
        name="FeedTab"
        options={{
          title: company ? 'Feed' : 'Hjem',
          tabBarAccessibilityLabel: company ? 'Feed' : 'Hjem',
        }}
      >
        {() => <FeedNavigator user={props.user} />}
      </Tabs.Screen>
      <Tabs.Screen name="JobsTab" options={{ title: 'Job', tabBarAccessibilityLabel: 'Job' }}>
        {() => <JobsNavigator {...props} />}
      </Tabs.Screen>
      <Tabs.Screen
        name="ProfileTab"
        options={{ title: 'Profil', tabBarAccessibilityLabel: 'Profil' }}
      >
        {() => <ProfileNavigator {...props} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Lato-Regular': require('./assets/fonts/Lato-Regular.ttf'),
    'Lato-Bold': require('./assets/fonts/Lato-Bold.ttf'),
  });
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  // RETTELSE (udløbet login): Send brugeren til login med en forklaring, når sessionen er udløbet.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setToken('');
      setUser(null);
      setJobs([]);
      setError('');
      setSessionMessage('Du er blevet logget ud, fordi din session er udløbet. Log ind igen.');
    });
  }, []);
  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setJobs(await api('/jobs'));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }
  async function authenticate(register, fields) {
    const result = await api(register ? '/auth/register' : '/auth/login', 'POST', fields);
    if (result.user.role !== fields.role) {
      setToken(result.token);
      await api('/auth/logout', 'POST');
      setToken('');
      throw new Error('Brug login for din kontotype.');
    }
    setToken(result.token);
    setUser(result.user);
    setSessionMessage('');
    setJobs([]);
    await refresh();
  }
  async function logout() {
    try {
      await api('/auth/logout', 'POST');
    } catch {
      /* Discard the local token even offline. */
    }
    setToken('');
    setUser(null);
    setJobs([]);
    setError('');
  }
  async function createJob(fields) {
    await api('/jobs', 'POST', fields);
    await refresh();
  }
  if (!fontsLoaded && !fontError) return null;
  const examples = [...companyJobs, ...demoJobs].map(j => ({ ...j, demo: true }));
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ActivityProvider key={user?.id || 'guest'} user={user}>
        <NavigationContainer theme={navigationTheme} key={user?.id || 'guest'}>
          {user ? (
            <MainTabs
              user={user}
              jobs={jobs}
              examples={examples}
              onCreateJob={createJob}
              loading={loading}
              storageError={error}
              onRetry={refresh}
              onLogout={logout}
            />
          ) : (
            <Stack.Navigator screenOptions={stackOptions}>
              <Stack.Screen name="Role" options={{ headerShown: false }}>
                {p => <RoleScreen {...p} onAuthenticate={authenticate} notice={sessionMessage} />}
              </Stack.Screen>
              <Stack.Screen name="CompanyLogin" options={{ headerShown: false }}>
                {p => <RoleScreen {...p} onAuthenticate={authenticate} notice={sessionMessage} />}
              </Stack.Screen>
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </ActivityProvider>
    </SafeAreaProvider>
  );
}

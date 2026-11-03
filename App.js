import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, styles } from './styles';
import { demoJobs, companyJobs } from './data/jobs';
import { api, setToken } from './data/api';
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
const stackOptions = { headerStyle: styles.navigationHeader, headerTintColor: colors.ink, headerShadowVisible: false, headerTitleStyle: styles.navigationTitle, contentStyle: styles.screen };

function FeedNavigator({ user }) {
  return <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="Feed" options={{ headerShown: false }}>{p => <FeedScreen {...p} user={user} />}</Stack.Screen>
    <Stack.Screen name="Profile" options={{ title: 'Profil' }}>{p => <ProfileScreen {...p} user={user} />}</Stack.Screen>
  </Stack.Navigator>;
}
function JobsNavigator({ user, jobs, examples, ...props }) {
  return <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="JobList" options={{ headerShown: user.role === 'company', title: 'Jeres jobs' }}>{p => user.role === 'company' ? <CompanyScreen {...p} {...props} user={user} jobs={jobs.filter(j => j.companyId === user.id)} /> : <HomeScreen {...p} jobs={[...jobs, ...examples]} onRefresh={props.onRetry} refreshing={props.loading} storageError={props.storageError} />}</Stack.Screen>
    <Stack.Screen name="Job" options={{ title: 'Jobmulighed' }}>{p => <JobScreen {...p} jobs={[...jobs, ...examples]} canApply={user.role === 'young'} />}</Stack.Screen>
    {user.role === 'young' && <Stack.Screen name="Apply" options={{ title: 'Din ansøgning' }}>{p => <ApplyScreen {...p} jobs={jobs} user={user} />}</Stack.Screen>}
    {user.role === 'company' && <Stack.Screen name="Applications" options={{ title: 'Ansøgninger og tilbud' }}>{p => <ApplicationsScreen {...p} jobs={jobs.filter(j => j.companyId === user.id)} />}</Stack.Screen>}
    <Stack.Screen name="Profile" options={{ title: 'Profil' }}>{p => <ProfileScreen {...p} user={user} />}</Stack.Screen>
  </Stack.Navigator>;
}
function ProfileNavigator({ user, jobs, onLogout }) {
  return <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="MyProfile" options={{ title: user.role === 'company' ? 'Virksomhedsprofil' : 'Min profil' }}>{p => <ProfileScreen {...p} user={user} onLogout={onLogout} />}</Stack.Screen>
    {user.role === 'young' ? <Stack.Screen name="Employment" component={EmploymentScreen} options={{ title: 'Mine ansættelser' }} /> : <Stack.Screen name="Applications" options={{ title: 'Ansøgninger og tilbud' }}>{p => <ApplicationsScreen {...p} jobs={jobs.filter(j => j.companyId === user.id)} />}</Stack.Screen>}
    <Stack.Screen name="Profile" options={{ title: 'Profil' }}>{p => <ProfileScreen {...p} user={user} />}</Stack.Screen>
  </Stack.Navigator>;
}
function MainTabs(props) {
  const { counts } = useActivity();
  const insets = useSafeAreaInsets();
  const company = props.user.role === 'company';
  return <Tabs.Navigator screenOptions={({ route }) => {
    const key = { FeedTab: 'feed', JobsTab: 'jobs', ProfileTab: 'profile' }[route.name];
    const icons = { FeedTab: ['home-outline', 'home'], JobsTab: ['briefcase-outline', 'briefcase'], ProfileTab: ['person-outline', 'person'] }[route.name];
    return { headerShown: false, tabBarShowLabel: true, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 72 + insets.bottom, backgroundColor: colors.white, borderTopColor: colors.border, paddingTop: 8, paddingBottom: Math.max(8, insets.bottom) }, tabBarLabelStyle: { fontSize: 12, fontWeight: '700' }, tabBarIcon: ({ focused, color, size }) => <Ionicons name={icons[focused ? 1 : 0]} size={size} color={color} />, tabBarBadge: counts[key] ? counts[key] > 99 ? '99+' : counts[key] : undefined, tabBarBadgeStyle: { backgroundColor: '#D83B47', color: '#fff', fontSize: 10 }, tabBarHideOnKeyboard: true };
  }}>
    <Tabs.Screen name="FeedTab" options={{ title: company ? 'Feed' : 'Hjem', tabBarAccessibilityLabel: company ? 'Feed' : 'Hjem' }}>{() => <FeedNavigator user={props.user} />}</Tabs.Screen>
    <Tabs.Screen name="JobsTab" options={{ title: 'Job', tabBarAccessibilityLabel: 'Job' }}>{() => <JobsNavigator {...props} />}</Tabs.Screen>
    <Tabs.Screen name="ProfileTab" options={{ title: 'Profil', tabBarAccessibilityLabel: 'Profil' }}>{() => <ProfileNavigator {...props} />}</Tabs.Screen>
  </Tabs.Navigator>;
}
export default function App() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [legacyJobs, setLegacyJobs] = useState([]);
  const [migrationError, setMigrationError] = useState('');
  async function refresh() {
    setLoading(true); setError('');
    try { setJobs(await api('/jobs')); return true; } catch (e) { setError(e.message); return false; } finally { setLoading(false); }
  }
  async function authenticate(register, fields) {
    const result = await api(register ? '/auth/register' : '/auth/login', 'POST', fields);
    if (result.user.role !== fields.role) { setToken(result.token); await api('/auth/logout', 'POST'); setToken(''); throw new Error('Brug login for din kontotype.'); }
    setToken(result.token); setUser(result.user); setJobs([]); setLegacyJobs([]); setMigrationError('');
    if (result.user.role === 'company') {
      try { const stored = await AsyncStorage.getItem('foothold.companyJobs.v2'); const old = stored ? JSON.parse(stored) : []; if (!Array.isArray(old)) throw new Error(); setLegacyJobs(old); }
      catch { setMigrationError('Ældre lokale opslag kunne ikke læses. De er bevaret på enheden.'); }
    }
    await refresh();
  }
  async function logout() {
    try { await api('/auth/logout', 'POST'); } catch { /* Discard the local token even offline. */ }
    setToken(''); setUser(null); setJobs([]); setError(''); setLegacyJobs([]);
  }
  async function createJob(fields) { await api('/jobs', 'POST', fields); await refresh(); }
  async function migrate() { await api('/jobs/import', 'POST', { jobs: legacyJobs }); setLegacyJobs([]); await refresh(); }
  const examples = [...companyJobs, ...demoJobs].map(j => ({ ...j, demo: true }));
  return <SafeAreaProvider><StatusBar style="dark" /><ActivityProvider key={user?.id || 'guest'} user={user}><NavigationContainer key={user?.id || 'guest'}>
    {user ? <MainTabs user={user} jobs={jobs} examples={examples} onCreateJob={createJob} loading={loading} storageError={error} onRetry={refresh} onLogout={logout} legacyJobs={legacyJobs} onMigrate={migrate} migrationError={migrationError} /> : <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Role" options={{ headerShown: false }}>{p => <RoleScreen {...p} onAuthenticate={authenticate} />}</Stack.Screen>
      <Stack.Screen name="CompanyLogin" options={{ headerShown: false }}>{p => <RoleScreen {...p} onAuthenticate={authenticate} />}</Stack.Screen>
    </Stack.Navigator>}
  </NavigationContainer></ActivityProvider></SafeAreaProvider>;
}

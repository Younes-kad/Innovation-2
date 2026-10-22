import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, styles } from './styles';
import { demoJobs, companyJobs, companyDetails } from './data/jobs';
import HomeScreen from './screens/HomeScreen';
import JobScreen from './screens/JobScreen';
import ApplyScreen from './screens/ApplyScreen';
import RoleScreen from './screens/RoleScreen';
import CompanyScreen from './screens/CompanyScreen';

const Stack = createNativeStackNavigator();
const STORAGE_KEY = 'foothold.companyJobs.v2';

export default function App() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState('');

  // Hent brugeroprettede opslag fra enhedens lager ved opstart.
  // De faste demonstrationsopslag ligger separat i data/jobs.js.
  async function loadJobs() {
    setLoading(true);
    setStorageError('');
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed) || !parsed.every(job =>
        job && ['id', 'title', 'description', 'location'].every(key => typeof job[key] === 'string') &&
        Array.isArray(job.tasks) && job.tasks.every(task => typeof task === 'string')
      )) throw new Error('Ugyldige jobdata');
      // Ældre opslag uden alder eller tags kan stadig åbnes.
      setSavedJobs(parsed.map(job => ({
        ...job, ...companyDetails,
        ageGroup: typeof job.ageGroup === 'string' ? job.ageGroup : '',
        tags: Array.isArray(job.tags) ? job.tags.filter(tag => typeof tag === 'string') : [],
      })));
    } catch {
      setStorageError('Gemte opslag kunne ikke hentes. Prøv igen, før du opretter et nyt opslag.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadJobs(); }, []);

  // Gem hele listen under samme nøgle, så tidligere opslag også bevares.
  async function createJob(fields) {
    if (loading || storageError) throw new Error('Vent, til dine gemte opslag er hentet.');
    const job = {
      ...companyDetails, ...fields,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tasks: [fields.description],
    };
    const nextJobs = [job, ...savedJobs];
    // Opdatér først skærmene, når opslaget er gemt på enheden.
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextJobs));
    setSavedJobs(nextJobs);
  }

  // Begge oversigter bruger samme state, så nye opslag vises med det samme.
  const businessJobs = [...savedJobs, ...companyJobs];
  const jobs = [...businessJobs, ...demoJobs];

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Role" screenOptions={{
          headerStyle: styles.navigationHeader,
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerTitleStyle: styles.navigationTitle,
          contentStyle: styles.screen,
        }}>
          <Stack.Screen name="Role" component={RoleScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CompanyLogin" component={RoleScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Home" options={{ headerShown: false }}>
            {props => <HomeScreen {...props} jobs={jobs} />}
          </Stack.Screen>
          <Stack.Screen name="Company" options={{ title: 'Virksomhed', headerBackTitle: 'Log ind' }}>
            {props => <CompanyScreen {...props} jobs={businessJobs} onCreateJob={createJob} loading={loading} storageError={storageError} onRetry={loadJobs} />}
          </Stack.Screen>
          <Stack.Screen name="Job" options={{ title: 'Jobmulighed', headerBackTitle: 'Tilbage' }}>
            {props => <JobScreen {...props} jobs={jobs} />}
          </Stack.Screen>
          <Stack.Screen name="Apply" options={{ title: 'Din ansøgning', headerBackTitle: 'Tilbage' }}>
            {props => <ApplyScreen {...props} jobs={jobs} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

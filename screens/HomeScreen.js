import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles, colors } from '../styles';
import JobCard from '../components/JobCard';
import { Button, Field } from '../components/ProfileUI';
import { useActivity } from '../data/ActivityContext';

export default function HomeScreen({ navigation, jobs, onRefresh, refreshing, storageError }) {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [tag, setTag] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [includeExamples, setIncludeExamples] = useState(false);
  const { beginRead, markRead } = useActivity();
  async function load() { try { const cursor = await beginRead('jobs'); const ok = await onRefresh(); if (ok) await markRead('jobs', cursor); } catch { await onRefresh(); } }
  useFocusEffect(useCallback(() => { load(); }, []));
  const locations = [...new Set(jobs.filter(j => includeExamples || !j.demo).map(j => j.location))].sort();
  const tags = [...new Set(jobs.filter(j => includeExamples || !j.demo).flatMap(j => [j.category, ...(j.tags || [])]).filter(Boolean))].sort();
  const filtered = useMemo(() => jobs.filter(j => (includeExamples || !j.demo) && (!location || j.location === location) && (!tag || j.category === tag || j.tags?.includes(tag)) && `${j.title} ${j.company} ${j.description} ${j.location} ${(j.tags || []).join(' ')}`.toLocaleLowerCase('da-DK').includes(search.trim().toLocaleLowerCase('da-DK'))), [jobs, location, tag, search, includeExamples]);
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}><FlatList
    data={filtered} keyExtractor={j => j.id} contentContainerStyle={styles.listContent} onRefresh={load} refreshing={refreshing}
    renderItem={({ item }) => <JobCard job={item} onPress={() => navigation.navigate('Job', { id: item.id })} />}
    ListHeaderComponent={<>
      <View style={styles.brandRow}><View style={styles.companyRow}><View style={styles.brandMark}><Text style={styles.brandMarkText}>f.</Text></View><Text style={styles.brandName}>foothold</Text></View><Ionicons name="briefcase-outline" size={24} color={colors.green} /></View>
      <Text style={styles.eyebrow}>DIN NÆSTE MULIGHED</Text><Text style={styles.pageTitle}>Find dit næste job</Text><Text style={styles.roleDescription}>Et lille skridt. En ny begyndelse.</Text>
      <Field label="Søg jobs" placeholder="Jobtitel, virksomhed eller interesse" value={search} onChangeText={setSearch} />
      <View style={[styles.rowBetween, { marginVertical: 16 }]}><Button secondary title={`${showFilters ? 'Skjul filtre' : 'Filtrér jobs'}${location || tag ? ' •' : ''}`} onPress={() => setShowFilters(!showFilters)} /><Text style={styles.count}>{filtered.length} jobs</Text></View>
      {showFilters && <View style={styles.card}><Text style={styles.inputLabel}>Lokation</Text><View style={[styles.tagOptions, { marginVertical: 12 }]}>{['', ...locations].map(l => <Button key={l} secondary title={`${l || 'Alle steder'}${location === l ? ' ✓' : ''}`} onPress={() => setLocation(l)} />)}</View><Text style={styles.inputLabel}>Område / kompetencer</Text><View style={[styles.tagOptions, { marginVertical: 12 }]}>{['', ...tags].map(t => <Button key={t} secondary title={`${t || 'Alle områder'}${tag === t ? ' ✓' : ''}`} onPress={() => setTag(t)} />)}</View><Button secondary title={`${includeExamples ? 'Skjul' : 'Vis'} eksempelopslag`} onPress={() => { setIncludeExamples(!includeExamples); setLocation(''); setTag(''); }} /><View style={{ marginTop: 12 }}><Button secondary title="Nulstil filtre" onPress={() => { setSearch(''); setLocation(''); setTag(''); setIncludeExamples(false); }} /></View></View>}
      {storageError ? <View style={styles.card}><Text style={styles.error} accessibilityRole="alert">{storageError}</Text><Button secondary title="Prøv igen" onPress={load} /></View> : null}
    </>}
    ListEmptyComponent={!refreshing ? <View style={styles.card}><Text style={styles.sectionTitle}>Ingen jobs lige nu</Text><Text style={styles.body}>{search || location || tag ? 'Prøv at ændre dine filtre eller søgeord.' : 'Nye jobopslag vises her, når virksomheder deler dem.'}</Text><Pressable accessibilityRole="button" style={styles.smallButton} onPress={load}><Text style={styles.smallButtonText}>Opdatér</Text></Pressable></View> : null}
  /></SafeAreaView>;
}

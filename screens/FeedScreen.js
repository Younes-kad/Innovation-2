import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles, colors } from '../styles';
import { api } from '../data/api';
import { useActivity } from '../data/ActivityContext';
import { Avatar, Button, Field, dateLabel } from '../components/ProfileUI';

export default function FeedScreen({ navigation, user }) {
  const [posts, setPosts] = useState([]);
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState('');
  const [showPeople, setShowPeople] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const list = useRef(null);
  useScrollToTop(list);
  const { beginRead, markRead } = useActivity();
  async function load() {
    setLoading(true); setError('');
    try {
      const cursor = await beginRead('feed');
      const [feed, profiles] = await Promise.all([api('/feed'), api('/people')]);
      setPosts(feed); setPeople(profiles); await markRead('feed', cursor);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useFocusEffect(useCallback(() => { load(); }, []));
  useEffect(() => navigation.getParent()?.addListener('tabPress', () => { if (navigation.isFocused()) load(); }), [navigation]);
  async function follow(person) {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await api(`/follows/${person.id}`, person.following ? 'DELETE' : 'POST', {}); await load(); }
    catch (e) { setError(e.message); } finally { lock.current = false; setBusy(false); }
  }
  const filteredPeople = people.filter(p => p.name.toLocaleLowerCase('da-DK').includes(search.toLocaleLowerCase('da-DK')));
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}><FlatList ref={list}
    data={posts} keyExtractor={p => p.id} contentContainerStyle={styles.listContent} onRefresh={load} refreshing={loading}
    ListHeaderComponent={<>
      <View style={styles.brandRow}><View style={styles.companyRow}><View style={styles.brandMark}><Text style={styles.brandMarkText}>f.</Text></View><Text style={styles.brandName}>foothold</Text></View><Ionicons name="sparkles-outline" size={24} color={colors.green} /></View>
      <Text style={styles.eyebrow}>{user.role === 'company' ? 'JERES NETVÆRK' : 'DIT NETVÆRK'}</Text><Text style={styles.pageTitle}>{user.role === 'company' ? 'Feed' : 'Hjem'}</Text><Text style={styles.roleDescription}>Små sejre, nye idéer og historier fra dem, du følger.</Text>
      <View style={[styles.rowBetween, { marginBottom: 20 }]}><Button secondary title="+ Skriv et opslag" onPress={() => navigation.navigate('ProfileTab', { screen: 'MyProfile', params: { section: 'Opslag' } })} /><Button secondary title={showPeople ? 'Luk profiler' : 'Find nogen at følge'} onPress={() => setShowPeople(!showPeople)} /></View>
      {error ? <View style={styles.card}><Text style={styles.error} accessibilityRole="alert">{error}</Text><Button secondary title="Prøv igen" onPress={load} /></View> : null}
      {(showPeople || !posts.length) && <View style={styles.card}><Text style={styles.sectionTitle}>Dit netværk starter her</Text><Text style={styles.noteText}>Find profiler, og tryk Følg. Kun opslag, der er delt med dig, vises i dit feed.</Text><View style={{ marginVertical: 16 }}><Field label="Find profiler" placeholder="Søg efter navn" value={search} onChangeText={setSearch} /></View>
        {!filteredPeople.length && <Text style={styles.body}>Ingen profiler at vise. Man skal selv slå synlighed til under Rediger profil for at kunne findes af andre.</Text>}
        {filteredPeople.map(p => <View key={p.id} style={[styles.rowBetween, { marginTop: 16 }]}><Pressable accessibilityRole="button" accessibilityLabel={`Åbn ${p.name}s profil`} style={styles.companyRow} onPress={() => navigation.navigate('Profile', { userId: p.id })}><Avatar name={p.name} uri={p.avatar} /><View style={styles.flex}><Text style={styles.company}>{p.name}</Text><Text style={styles.location}>{p.role === 'company' ? 'Virksomhed' : 'Ung'}{p.headline ? ` · ${p.headline}` : ''}</Text></View></Pressable><Button secondary disabled={busy} title={p.following ? 'Følger ✓' : '+ Følg'} onPress={() => follow(p)} /></View>)}
      </View>}
    </>}
    ListEmptyComponent={!loading ? <View style={styles.card}><Ionicons name="people-outline" size={36} color={colors.green} /><Text style={styles.cardTitle}>Plads til nye historier</Text><Text style={styles.body}>Når dem, du følger, deler et opslag med følgere, dukker det op her.</Text></View> : null}
    renderItem={({ item: p }) => <View style={styles.card}><Pressable accessibilityRole="button" style={styles.companyRow} onPress={() => navigation.navigate('Profile', { userId: p.author.id })}><Avatar name={p.author.name} uri={p.author.avatar} /><View style={styles.flex}><Text style={styles.company}>{p.author.name}</Text><Text style={styles.location}>{dateLabel(p.createdAt)}</Text></View><Ionicons name="arrow-forward" size={18} color={colors.muted} /></Pressable><Text style={styles.body}>{p.text}</Text>{p.image ? <Image source={{ uri: p.image }} accessibilityLabel="Billede i opslag" style={{ width: '100%', height: 260, borderRadius: 16, marginTop: 18 }} resizeMode="contain" /> : null}</View>}
  /></SafeAreaView>;
}

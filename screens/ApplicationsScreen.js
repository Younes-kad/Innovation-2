import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../data/api';
import { styles } from '../styles';
import { Avatar, Button, dateLabel } from '../components/ProfileUI';
import { emptyTerms, offerStatus, TermsForm, TermsSummary } from '../components/EmploymentTerms';
import { validateTerms } from '../shared/employment';
import { useActivity } from '../data/ActivityContext';
const statuses = ['Modtaget', 'Under behandling', 'Accepteret', 'Afvist'];
export default function ApplicationsScreen({ navigation, route, jobs }) {
  const [applications, setApplications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [offers, setOffers] = useState([]);
  const [terms, setTerms] = useState({ ...emptyTerms });
  const [tab, setTab] = useState(route.params?.initialTab || 'Ansøgninger');
  const { markRead } = useActivity();
  useEffect(() => { if (route.params?.initialTab) setTab(route.params.initialTab); }, [route.params?.initialTab]);
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { const snapshot = await api('/notifications'); const [a, e, o] = await Promise.all([api('/applications'), api('/employees'), api('/employment-offers')]); setApplications(a); setEmployees(e); setOffers(o); await Promise.all([markRead('jobs', snapshot.cursors.jobs), markRead('profile', snapshot.cursors.profile)]); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useFocusEffect(useCallback(() => { load(); }, []));
  async function changeStatus(next) {
    if (busy) return; setBusy(true); setError('');
    try { await api(`/applications/${selected.id}`, 'PATCH', { status: next }); setSelected(s => ({ ...s, status: next })); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function hire() {
    if (busy) return; setBusy(true); setError('');
    try { const valid = validateTerms(terms); await api('/employment-offers', 'POST', { applicationId: selected.id, ...valid }); await load(); setSelected(null); setTerms({ ...emptyTerms }); setTab('Tilbud'); setMessage('Tilbuddet er sendt. Personen vises først under Ansatte efter egen godkendelse.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function profile(id) { setSelected(null); navigation.navigate('Profile', { userId: id }); }
  const filtered = applications.filter(a => (!jobId || a.jobId === jobId) && (!status || a.status === status));
  const person = a => <Pressable accessibilityRole="button" accessibilityLabel={`Åbn ${a.name}s profil`} style={styles.companyRow} onPress={() => profile(a.userId)}><Avatar name={a.name} uri={a.avatar} /><Text style={styles.company}>{a.name} ↗</Text></Pressable>;
  const feedback = <>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{message ? <Text accessibilityLiveRegion="polite" style={styles.feedbackText}>{message}</Text> : null}</>;
  return <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}><ScrollView contentContainerStyle={styles.pageContent}>
    <Text style={styles.eyebrow}>MENNESKER OG MULIGHEDER</Text><Text style={styles.pageTitle}>{tab}</Text>
    <View style={[styles.tagOptions, { marginVertical: 20 }]}>{['Ansøgninger', 'Tilbud', 'Ansatte'].map(t => <Button secondary key={t} title={`${t} (${t === 'Ansatte' ? employees.length : t === 'Tilbud' ? offers.length : applications.length})${tab === t ? ' ✓' : ''}`} onPress={() => setTab(t)} />)}<Button secondary title="Opdatér" disabled={loading || busy} onPress={load} /></View>
    {feedback}{loading && <Text style={styles.body}>Henter …</Text>}
    {tab === 'Ansøgninger' ? <>
      <View style={styles.card}><Text style={styles.inputLabel}>Filtrér efter stilling</Text><View style={[styles.tagOptions, { marginVertical: 12 }]}>{[{ id: '', title: 'Alle stillinger' }, ...jobs].map(j => <Button key={j.id} secondary title={`${j.title}${jobId === j.id ? ' ✓' : ''}`} onPress={() => setJobId(j.id)} />)}</View><Text style={styles.inputLabel}>Status</Text><View style={[styles.tagOptions, { marginTop: 12 }]}>{['', ...statuses].map(s => <Button key={s} secondary title={`${s || 'Alle statusser'}${status === s ? ' ✓' : ''}`} onPress={() => setStatus(s)} />)}</View></View>
      {!loading && !filtered.length && <Text style={styles.body}>Ingen ansøgninger matcher dit valg.</Text>}
      {filtered.map(a => <View key={a.id} style={styles.card}>{person(a)}<Text style={styles.cardTitle}>{a.title}</Text><Text style={styles.location}>{dateLabel(a.createdAt)} · {a.status}</Text><View style={{ marginTop: 16 }}><Button secondary title="Læs ansøgning →" onPress={() => { setSelected(a); setTerms({ ...emptyTerms }); setError(''); setMessage(''); }} /></View></View>)}
    </> : tab === 'Tilbud' ? <>
      {!loading && !offers.length && <Text style={styles.body}>Ingen tilbud endnu. Åbn en accepteret ansøgning, og udfyld vilkårene.</Text>}
      {offers.map(o => <View key={o.id} style={styles.card}>{person(o)}<Text style={styles.cardTitle}>{o.title}</Text><Text style={styles.noteTitle}>{offerStatus[o.status]}</Text><TermsSummary terms={o.terms} /><Text style={styles.location}>Sendt {dateLabel(o.createdAt)}{o.respondedAt ? ` · Besvaret ${dateLabel(o.respondedAt)}` : ''}</Text></View>)}
    </> : <>{!loading && !employees.length && <Text style={styles.body}>Ingen ansatte endnu. Send et tilbud fra en accepteret ansøgning. Personen registreres, når tilbuddet er godkendt på egen side.</Text>}{employees.map(e => { const offer = offers.find(o => o.userId === e.userId && o.status === 'accepted'); return <View key={e.id} style={styles.card}>{person(e)}<Text style={styles.body}>{e.title}</Text><Text style={styles.location}>Registreret {dateLabel(e.createdAt)}</Text>{offer ? <TermsSummary terms={offer.terms} /> : <Text style={styles.helper}>Tidligere registreret ansættelse · Ingen tilbudsvilkår gemt</Text>}</View>; })}</>}
  </ScrollView>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => !busy && setSelected(null)}><SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
      <Button secondary title="← Tilbage til oversigt" disabled={busy} onPress={() => setSelected(null)} />
      {selected && <View style={[styles.card, { marginTop: 24 }]}>{person(selected)}<Text style={styles.pageTitle}>{selected.title}</Text><Text style={styles.location}>{dateLabel(selected.createdAt)} · {selected.email}</Text><Text style={styles.body}>{selected.about}</Text><View style={styles.divider} /><Text style={styles.inputLabel}>Ansøgningsstatus</Text><View style={[styles.tagOptions, { marginVertical: 16 }]}>{statuses.map(s => <Button key={s} secondary title={`${s}${selected.status === s ? ' ✓' : ''}`} disabled={busy} onPress={() => changeStatus(s)} />)}</View>{feedback}
        {employees.some(e => e.userId === selected.userId) ? <Text style={styles.noteTitle}>Allerede registreret som ansat</Text> : offers.some(o => o.userId === selected.userId && o.status === 'pending') ? <Text style={styles.noteTitle}>Tilbud sendt · Afventer den unges godkendelse. Se vilkårene under Tilbud.</Text> : selected.status === 'Accepteret' ? <View style={styles.form}><TermsForm value={terms} onChange={setTerms} disabled={busy} />{error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}<Button title={busy ? 'Sender …' : 'Send tilbud til godkendelse'} disabled={busy} onPress={hire} /></View> : <Text style={styles.helper}>Accepter ansøgningen for at sende et ansættelsestilbud.</Text>}
      </View>}
    </ScrollView></SafeAreaView></Modal>
  </SafeAreaView>;
}

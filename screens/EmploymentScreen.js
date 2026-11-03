import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../data/api';
import { styles } from '../styles';
import { Button, Toggle, dateLabel } from '../components/ProfileUI';
import { offerStatus, TermsSummary } from '../components/EmploymentTerms';
import { useActivity } from '../data/ActivityContext';

export default function EmploymentScreen({ navigation }) {
  const [offers, setOffers] = useState([]);
  const [choices, setChoices] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const { beginRead, markRead } = useActivity();
  async function load() {
    setLoading(true); setError('');
    try { const cursor = await beginRead('profile'); setOffers(await api('/employment-offers')); await markRead('profile', cursor); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useFocusEffect(useCallback(() => { load(); }, []));
  async function respond(offer, decision, addLater = false) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await api(`/employment-offers/${offer.id}${addLater ? '/profile' : ''}`, 'POST', addLater ? {} : { decision, addToProfile: choices[offer.id] === true });
      setMessage(addLater ? 'Ansættelsen er tilføjet under Erfaring på din profil.' : decision === 'accepted' ? 'Du har godkendt tilbuddet. Ansættelsen er nu registreret.' : 'Du har afvist tilbuddet.');
      await load();
    } catch (e) { setError(e.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}><ScrollView contentContainerStyle={styles.pageContent}>
    <Text style={styles.eyebrow}>DIT NÆSTE SKRIDT</Text><Text style={styles.pageTitle}>Mine ansættelser</Text><Text style={styles.body}>Læs vilkårene fra virksomheden, før du godkender. Du bestemmer selv, om jobbet skal på din profil.</Text>
    <View style={{ marginVertical: 20 }}><Button secondary title="Opdatér tilbud" disabled={loading || busy} onPress={load} /></View>
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}{message ? <Text style={styles.feedbackText} accessibilityLiveRegion="polite">{message}</Text> : null}
    {loading && <Text style={styles.body}>Henter …</Text>}{!loading && !offers.length && <Text style={styles.body}>Du har endnu ingen ansættelsestilbud. De vises her, når en virksomhed sender et tilbud efter din ansøgning.</Text>}
    {offers.map(o => <View key={o.id} style={[styles.card, { marginTop: 20 }]}><Text style={styles.company}>{o.company}</Text><Text style={styles.cardTitle}>{o.title}</Text><Text style={styles.location}>Sendt {dateLabel(o.createdAt)}</Text><Text style={styles.noteTitle}>{offerStatus[o.status]}</Text><TermsSummary terms={o.terms} />
      {o.status === 'pending' ? <View style={styles.form}>
        <Toggle label="Tilføj jobbet til min profil med det samme" value={choices[o.id]} disabled={busy} onValueChange={v => setChoices(c => ({ ...c, [o.id]: v }))} />
        <Text style={styles.helper}>Kun virksomhed, stilling og periode tilføjes under Erfaring. Løn og timer deles aldrig på profilen. Dine eksisterende privatlivsindstillinger bevares. Du kan også tilføje jobbet senere.</Text>
        <Button title="Godkend tilbud og ansættelse" disabled={busy} onPress={() => respond(o, 'accepted')} />
        <Button secondary title="Afvis tilbud" disabled={busy} onPress={() => respond(o, 'declined')} />
      </View> : o.status === 'accepted' ? <View style={styles.form}>{o.addedToProfile ? <Button secondary title="Se min profil →" onPress={() => navigation.navigate('MyProfile')} /> : <><Text style={styles.helper}>Ansættelsen er registreret, men er ikke tilføjet til din profil.</Text><Button secondary title="Tilføj til min profil nu" disabled={busy} onPress={() => respond(o, null, true)} /></>}</View> : <Text style={styles.helper}>Ingen ansættelse er registreret på baggrund af dette tilbud.</Text>}
    </View>)}
  </ScrollView></SafeAreaView>;
}


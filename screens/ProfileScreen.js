import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../data/api';
import { styles } from '../styles';
import { Avatar, Button, Field, Toggle, dateLabel } from '../components/ProfileUI';
import { useActivity } from '../data/ActivityContext';

const blankEntry = type => ({ id: `${Date.now()}-${Math.random()}`, organization: '', title: '', start: '', end: '', description: '', type });
async function pickImage() {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.75 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.base64 || asset.base64.length > 7000000) throw new Error('Vælg et billede på højst 5 MB.');
  // Native pickers may convert HEIC to JPEG while retaining the source MIME type.
  const mime = asset.base64.startsWith('/9j/') ? 'image/jpeg' : asset.base64.startsWith('iVBORw0KGgo') ? 'image/png' : asset.base64.startsWith('UklGR') ? 'image/webp' : asset.mimeType || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('Vælg JPG, PNG eller WebP.');
  return `data:${mime};base64,${asset.base64}`;
}

function EntryEditor({ title, entries, onChange, education, disabled }) {
  function update(index, key, value) { onChange(entries.map((e, i) => i === index ? { ...e, [key]: value } : e)); }
  return <View style={styles.form}><Text style={styles.sectionTitle}>{title}</Text>{entries.map((e, index) => <View key={e.id} style={styles.card}><View style={styles.form}>
    {!education && <View style={styles.tagOptions}>{['Job', 'Frivilligt arbejde', 'Projekt', 'Andet'].map(type => <Button key={type} secondary disabled={disabled} title={`${type}${e.type === type ? ' ✓' : ''}`} onPress={() => update(index, 'type', type)} />)}</View>}
    <Field label={education ? 'Uddannelsessted' : 'Virksomhed / organisation'} value={e.organization} onChangeText={v => update(index, 'organization', v)} editable={!disabled} maxLength={160} />
    <Field label={education ? 'Uddannelse' : 'Rolle / projekttitel'} value={e.title} onChangeText={v => update(index, 'title', v)} editable={!disabled} maxLength={160} />
    <Field label="Start (ÅÅÅÅ-MM)" placeholder="2026-08" value={e.start} onChangeText={v => update(index, 'start', v)} editable={!disabled} maxLength={7} />
    <Field label="Slut (ÅÅÅÅ-MM) · Tom = nuværende" placeholder="2026-11" value={e.end} onChangeText={v => update(index, 'end', v)} editable={!disabled} maxLength={7} />
    <Field label="Beskrivelse" value={e.description} onChangeText={v => update(index, 'description', v)} editable={!disabled} multiline maxLength={2000} />
    <Button secondary title="Fjern denne post" disabled={disabled} onPress={() => onChange(entries.filter((_, i) => i !== index))} />
  </View></View>)}<Button secondary title={education ? '+ Tilføj uddannelse' : '+ Tilføj erfaring'} disabled={disabled || entries.length >= 50} onPress={() => onChange([...entries, blankEntry(education ? 'Uddannelse' : 'Job')])} /></View>;
}

export default function ProfileScreen({ route, user, navigation, onLogout }) {
  const id = route.params?.userId || 'me';
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [postDraft, setPostDraft] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [tab, setTab] = useState('Om mig');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const companyOwner = user.role === 'company' && id === 'me';
  const { counts, refresh: refreshActivity } = useActivity();
  const pending = useRef(false);
  const scroll = useRef(null);
  async function load() {
    setLoading(true); setError('');
    try { const [p, staff] = await Promise.all([api(`/profiles/${id}`), companyOwner ? api('/employees') : Promise.resolve([])]); setProfile(p); setEmployees(staff); await refreshActivity(); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useFocusEffect(useCallback(() => { load(); }, [id]));
  useEffect(() => { if (route.params?.section) setTab(route.params.section); }, [route.params?.section]);
  async function perform(action, success) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); await load(); } catch (e) { setError(e.message); }
    finally { pending.current = false; setBusy(false); }
  }
  async function choose(target) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { const uri = await pickImage(); if (uri) target(uri); } catch (e) { setError(e.message); }
    finally { pending.current = false; setBusy(false); }
  }
  const feedback = <>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{message ? <Text accessibilityLiveRegion="polite" style={styles.feedbackText}>{message}</Text> : null}</>;
  const entries = (items, empty) => items?.length ? items.map(e => <View key={e.id} style={styles.card}><Text style={styles.noteTitle}>{e.title}</Text><Text style={styles.company}>{e.organization}</Text><Text style={styles.location}>{e.type} · {e.start} – {e.end || 'Nu'}</Text>{e.description ? <Text style={styles.body}>{e.description}</Text> : null}</View>) : <Text style={styles.body}>{empty}</Text>;
  function close() { if (!busy) { setDraft(null); setPostDraft(null); setDeleting(null); setError(''); } }
  return <SafeAreaView style={styles.screen} edges={['left', 'right']}><ScrollView ref={scroll} contentContainerStyle={styles.pageContent}>
    {feedback}{loading && <Text style={styles.body}>Henter profil …</Text>}{!profile && !loading && <Button secondary title="Prøv igen" onPress={load} />}
    {profile && <>
      {profile.owner && <View style={[styles.rowBetween, { marginBottom: 20 }]}><Button secondary title={`${companyOwner ? 'Ansøgninger og tilbud' : 'Mine ansættelser'}${counts.profile ? ` · ${counts.profile} nyt` : ''} →`} onPress={() => navigation.navigate(companyOwner ? 'Applications' : 'Employment', companyOwner ? { initialTab: 'Tilbud' } : undefined)} />{onLogout && <Button secondary title="Log ud" onPress={onLogout} />}</View>}
      <View style={styles.hero}><Text style={styles.heroLabel}>{profile.fictional ? 'FIKTIV DEMOPROFIL' : 'SMÅ SKRIDT. DIN HISTORIE.'}</Text><View style={{ marginTop: 24 }}><Avatar large name={profile.name} uri={profile.avatar} /></View><Text style={styles.heroTitle}>{profile.name}</Text>{profile.headline ? <Text style={styles.heroDescription}>{profile.headline}</Text> : null}{profile.location ? <Text style={styles.heroDescription}>{profile.location}</Text> : null}</View>
      {profile.owner ? <View style={styles.card}><Text style={styles.noteTitle}>Din profil. Dine valg.</Text><Text style={styles.noteText}>Du vælger selv, om andre må finde og følge din profil. Private sektioner forbliver private. Opslag til følgere deles kun, når du vælger det på det enkelte opslag.</Text><View style={{ marginTop: 16 }}><Button title="Rediger profil og privatliv" onPress={() => { setError(''); setDraft({ ...profile, skillsText: profile.skills.join(', ') }); }} /></View></View> : <View style={styles.demoNotice}><Text style={styles.noteText}>Her vises kun de oplysninger og opslag, som {profile.name} har valgt at dele med dig.</Text><Button secondary title={profile.following ? 'Følger ✓ · Stop med at følge' : '+ Følg profil'} disabled={busy} onPress={() => perform(() => api(`/follows/${profile.id}`, profile.following ? 'DELETE' : 'POST', {}), profile.following ? 'Du følger ikke længere profilen.' : 'Du følger nu profilen.')} /></View>}
      {companyOwner && <View style={styles.card}><View style={styles.rowBetween}><Text style={styles.sectionTitle}>Hvem har vi ansat?</Text><Text style={styles.count}>{employees.length} ansatte</Text></View>{!employees.length && <Text style={styles.body}>Jeres ansatte vises her, når de har godkendt et ansættelsestilbud.</Text>}{employees.map(e => <View key={e.id} style={{ marginTop: 18 }}><Button secondary title={`${e.name} →`} onPress={() => navigation.push('Profile', { userId: e.userId })} /><Text style={styles.location}>{e.title}</Text></View>)}</View>}
      <View style={[styles.tagOptions, { marginVertical: 20 }]}>{(companyOwner || profile.role === 'company' ? ['Om mig', 'Opslag'] : ['Om mig', 'Erfaring', 'Uddannelse og kompetencer', 'Opslag']).map(t => <Button secondary key={t} title={`${t}${tab === t ? ' ✓' : ''}`} onPress={() => setTab(t)} />)}</View>
      {tab === 'Om mig' && <View style={styles.card}><Text style={styles.sectionTitle}>Om mig</Text><Text style={styles.body}>{profile.about || (profile.owner ? 'Fortæl om dig selv, dine interesser og det, du gerne vil lære.' : 'Ingen præsentation er delt med virksomheder.')}</Text></View>}
      {tab === 'Erfaring' && <><Text style={styles.sectionTitle}>Erfaring</Text><View style={{ marginTop: 16 }}>{entries(profile.experiences, profile.owner ? 'Tilføj et job, et projekt eller frivilligt arbejde via Rediger profil.' : 'Ingen erfaringer er delt.')}</View></>}
      {tab === 'Uddannelse og kompetencer' && <><Text style={styles.sectionTitle}>Uddannelse</Text><View style={{ marginTop: 16 }}>{entries(profile.education, 'Ingen uddannelser at vise.')}</View><View style={styles.card}><Text style={styles.sectionTitle}>Kompetencer</Text><View style={[styles.tagOptions, { marginTop: 16 }]}>{profile.skills.map(s => <View key={s} style={styles.jobTag}><Text style={styles.jobTagText}>{s}</Text></View>)}</View>{!profile.skills.length && <Text style={styles.body}>Ingen kompetencer at vise.</Text>}</View></>}
      {tab === 'Opslag' && <>
        <View style={[styles.rowBetween, { marginBottom: 20 }]}><Text style={styles.sectionTitle}>Tanker og små sejre</Text>{profile.owner && <Button secondary title="+ Nyt opslag" onPress={() => { setError(''); setPostDraft({ text: '', image: '', shared: false }); }} />}</View>
        {!profile.posts.length && <Text style={styles.body}>{profile.owner ? 'Del noget, du har lært, eller fortæl om dit næste skridt.' : 'Ingen opslag er delt med virksomheder.'}</Text>}
        {profile.posts.map(post => <View key={post.id} style={styles.card}><View style={styles.companyRow}><Avatar uri={profile.avatar} name={profile.name} /><View style={styles.flex}><Text style={styles.company}>{profile.name}</Text><Text style={styles.location}>{dateLabel(post.createdAt)}</Text>{profile.owner && <Text style={styles.location}>{[post.followers && 'Delt med følgere', post.shared && 'Delt med dine virksomheder'].filter(Boolean).join(' · ') || 'Privat · Kun dig'}</Text>}</View></View><Text style={styles.body}>{post.text}</Text>{post.image ? <Image accessibilityLabel="Billede vedhæftet opslag" source={{ uri: post.image }} style={{ width: '100%', height: 260, borderRadius: 16, marginTop: 18 }} resizeMode="contain" /> : null}{profile.owner && <View style={[styles.tagOptions, { marginTop: 18 }]}><Button secondary title="Rediger" onPress={() => { setError(''); setPostDraft({ ...post }); }} /><Button secondary title="Slet" onPress={() => { setError(''); setDeleting(post); }} /></View>}</View>)}
      </>}
    </>}
  </ScrollView>
    <Modal visible={!!draft || !!postDraft || !!deleting} animationType="slide" onRequestClose={close}><SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled"><Button secondary title="← Annuller" disabled={busy} onPress={close} /><View style={{ marginVertical: 20 }}>{feedback}</View>
      {draft && <View style={styles.form}><Text style={styles.pageTitle}>Din professionelle profil</Text><Avatar large name={draft.name} uri={draft.avatar} /><Button secondary title="Vælg profilbillede" disabled={busy} onPress={() => choose(uri => setDraft(d => ({ ...d, avatar: uri })))} />{draft.avatar ? <Button secondary title="Fjern profilbillede" disabled={busy} onPress={() => setDraft(d => ({ ...d, avatar: '' }))} /> : null}
        {['name', 'headline', 'location', 'about'].map((key, i) => <Field key={key} label={['Navn', 'Kort overskrift', 'Lokation (valgfrit)', 'Om mig'][i]} value={draft[key]} multiline={key === 'about'} editable={!busy} maxLength={key === 'about' ? 3000 : key === 'headline' ? 180 : 120} onChangeText={v => setDraft(d => ({ ...d, [key]: v }))} />)}
        <View style={styles.demoNotice}><Text style={styles.noteTitle}>Dit netværk</Text><Toggle label="Min profil må findes og følges af andre" value={draft.discoverable} disabled={busy} onValueChange={v => setDraft(d => ({ ...d, discoverable: v }))} /><Text style={styles.noteText}>Når du slår dette til, kan andre konti finde dit navn, billede og overskrift. Du vælger separat, hvilke opslag følgere må se. Fødselsdato, telefonnummer, løn og private profilsektioner deles ikke.</Text></View>
        {!companyOwner && <><View style={styles.demoNotice}><Text style={styles.noteTitle}>Hvad må dine virksomheder se?</Text>{[['presentation', 'Præsentation, billede og lokation'], ['experiences', 'Erfaringer'], ['education', 'Uddannelse'], ['skills', 'Kompetencer']].map(([key, label]) => <Toggle key={key} disabled={busy} label={label} value={draft.visibility[key]} onValueChange={v => setDraft(d => ({ ...d, visibility: { ...d.visibility, [key]: v } }))} />)}</View>
        <EntryEditor title="Erfaring" entries={draft.experiences} disabled={busy} onChange={v => setDraft(d => ({ ...d, experiences: v }))} />
        <EntryEditor title="Uddannelse" entries={draft.education} education disabled={busy} onChange={v => setDraft(d => ({ ...d, education: v }))} />
        <Field label="Kompetencer (adskil med komma)" placeholder="Kundeservice, kommunikation, teamwork" value={draft.skillsText} editable={!busy} onChangeText={v => setDraft(d => ({ ...d, skillsText: v }))} />
        </>}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Button title={busy ? 'Gemmer …' : 'Gem profil'} disabled={busy} onPress={() => perform(async () => { await api('/profiles/me', 'PUT', { ...draft, skills: draft.skillsText.split(',').map(s => s.trim()).filter(Boolean) }); setDraft(null); }, 'Din profil er opdateret.')} />
      </View>}
      {postDraft && <View style={styles.form}><Text style={styles.pageTitle}>{postDraft.id ? 'Rediger opslag' : 'Et nyt skridt'}</Text><Field label="Dit opslag" placeholder="Hvad har du lært eller oplevet?" multiline maxLength={5000} value={postDraft.text} editable={!busy} onChangeText={v => setPostDraft(d => ({ ...d, text: v }))} />
        {postDraft.image ? <><Image source={{ uri: postDraft.image }} accessibilityLabel="Valgt billede" style={{ width: '100%', height: 240 }} resizeMode="contain" /><Button secondary title="Fjern billede" disabled={busy} onPress={() => setPostDraft(d => ({ ...d, image: '' }))} /></> : null}
        <Button secondary title="Vedhæft billede" disabled={busy} onPress={() => choose(uri => setPostDraft(d => ({ ...d, image: uri })))} />
        <Toggle label="Del dette opslag med mine følgere" value={postDraft.followers} disabled={busy || !profile.discoverable} onValueChange={v => setPostDraft(d => ({ ...d, followers: v }))} />
        {!profile.discoverable && <Text style={styles.helper}>Slå først “Min profil må findes og følges” til under Rediger profil, hvis du vil dele med følgere.</Text>}
        {!companyOwner && <Toggle label="Del med virksomheder, jeg har søgt hos eller er ansat hos" value={postDraft.shared} disabled={busy} onValueChange={v => setPostDraft(d => ({ ...d, shared: v }))} />}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Button title={busy ? 'Gemmer …' : 'Gem opslag'} disabled={busy} onPress={() => perform(async () => { await api(postDraft.id ? `/posts/${postDraft.id}` : '/posts', postDraft.id ? 'PUT' : 'POST', postDraft); setPostDraft(null); setTab('Opslag'); }, 'Opslaget er gemt.')} />
      </View>}
      {deleting && <View style={styles.form}><Text style={styles.sectionTitle}>Slet opslag?</Text><Text style={styles.body}>Opslaget og det vedhæftede billede slettes permanent.</Text><Button title="Slet opslag permanent" disabled={busy} onPress={() => perform(async () => { await api(`/posts/${deleting.id}`, 'DELETE'); setDeleting(null); }, 'Opslaget er slettet.')} /></View>}
    </ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>
  </SafeAreaView>;
}

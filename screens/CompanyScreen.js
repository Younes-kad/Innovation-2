import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import JobCard from '../components/JobCard';
import { colors, styles } from '../styles';
import { jobTags } from '../data/jobTags';

export default function CompanyScreen({ navigation, jobs, onCreateJob, loading, storageError, onRetry }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const submitting = useRef(false);

  async function submitJob() {
    // Afvis dobbelte tryk og tomme obligatoriske felter før lagring.
    if (submitting.current) return;
    if (!title.trim() || !description.trim() || !location.trim()) {
      setError('Udfyld jobtitel, kort beskrivelse og lokation.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      // App.js gemmer opslaget med AsyncStorage. Ryd kun felterne ved succes.
      await onCreateJob({ title: title.trim(), description: description.trim(), location: location.trim(), ageGroup: ageGroup.trim(), tags });
      setShowForm(false);
      setTitle(''); setDescription(''); setLocation(''); setAgeGroup(''); setTags([]);
      setMessage('Opslaget er gemt på denne enhed og vises nu også i joboversigten.');
    } catch {
      setError('Opslaget kunne ikke gemmes. Dine felter er bevaret – prøv igen.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Pressable accessibilityRole="button" style={styles.roleSwitch} onPress={() => navigation.goBack()}><Text style={styles.smallButtonText}>← Tilbage til login</Text></Pressable>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>VIRKSOMHEDENS OVERBLIK</Text>
          <Text style={styles.heroTitle}>Velkommen,{'\n'}MC El & Teknik</Text>
          <Text style={styles.heroDescription}>Giv unge på 18–25 år deres første erfaring med enkle praktiske opgaver og vejledning fra en erfaren kollega.</Text>
        </View>
        <View style={styles.demoNotice}>
          <Text style={styles.noteTitle}>Demonstration · Fiktive oplysninger</Text>
          <Text style={styles.noteText}>MC El & Teknik bruges som eksempelvirksomhed. Jobopslag og personer er eksempler, ikke virkelige oplysninger om virksomheden.</Text>
        </View>
        <Pressable accessibilityRole="button" disabled={loading || !!storageError} style={({ pressed }) => [styles.primaryButton, (pressed || loading || !!storageError) && styles.pressed]} onPress={() => { setError(''); setMessage(''); setShowForm(true); }}>
          <Text style={styles.primaryButtonText}>Opret nyt jobopslag</Text>
        </Pressable>
        {loading ? <Text style={styles.helperCentered}>Henter gemte opslag …</Text> : null}
        {storageError ? <View style={styles.feedback}><Text style={styles.error} accessibilityRole="alert">{storageError}</Text><Pressable accessibilityRole="button" style={styles.smallButton} onPress={onRetry}><Text style={styles.smallButtonText}>Prøv igen</Text></Pressable></View> : null}
        {message ? <Text style={styles.feedbackText} accessibilityLiveRegion="polite">{message}</Text> : null}
        <View style={styles.companySectionHeading}><Text style={styles.sectionTitle}>Aktive jobopslag</Text><Text style={styles.count}>{jobs.length} opslag</Text></View>
        {jobs.map(job => <JobCard key={job.id} job={job} onPress={() => navigation.navigate('Job', { id: job.id })} />)}
        <View style={styles.companySectionHeading}><Text style={styles.sectionTitle}>Tilknyttede unge</Text><Text style={styles.count}>2 unge</Text></View>
        <View style={styles.card}>
          <Text style={styles.noteTitle}>Emil, 19 år</Text><Text style={styles.noteText}>Praktisk hjælper · Følger en erfaren elektriker</Text>
          <View style={styles.divider} />
          <Text style={styles.noteTitle}>Sara, 22 år</Text><Text style={styles.noteText}>Hjælper med værktøj og materialer</Text>
        </View>
        <Text style={styles.helperCentered}>Fiktive personer · Overblikket er kun visuelt.{'\n'}Nye opslag gemmes kun på denne enhed.</Text>
      </ScrollView>
      <Modal visible={showForm} animationType="slide" onRequestClose={() => { if (!submitting.current) setShowForm(false); }}>
        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
              <Pressable accessibilityRole="button" disabled={saving} style={styles.roleSwitch} onPress={() => setShowForm(false)}><Text style={styles.smallButtonText}>← Annuller</Text></Pressable>
              <Text style={styles.sectionTitle}>Opret nyt jobopslag</Text>
              <Text style={styles.roleDescription}>MC El & Teknik · Demonstrationsopslag</Text>
              <View style={styles.form}>
                <View style={styles.field}><Text style={styles.inputLabel}>Jobtitel</Text><TextInput accessibilityLabel="Jobtitel" style={styles.input} value={title} onChangeText={setTitle} editable={!saving} placeholder="Fx praktisk hjælper" placeholderTextColor={colors.placeholder} /></View>
                <View style={styles.field}><Text style={styles.inputLabel}>Kort beskrivelse</Text><TextInput accessibilityLabel="Kort beskrivelse" style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} editable={!saving} multiline textAlignVertical="top" placeholder="Hvad skal den unge hjælpe med?" placeholderTextColor={colors.placeholder} /></View>
                <View style={styles.field}><Text style={styles.inputLabel}>Lokation</Text><TextInput accessibilityLabel="Lokation" style={styles.input} value={location} onChangeText={setLocation} editable={!saving} placeholder="Fx København" placeholderTextColor={colors.placeholder} /></View>
                <View style={styles.field}>
                  <Text style={styles.inputLabel}>Aldersgruppe (valgfrit)</Text>
                  <TextInput accessibilityLabel="Aldersgruppe" style={styles.input} value={ageGroup} onChangeText={setAgeGroup} editable={!saving} placeholder="Fx 15–17 år eller 18–20 år" placeholderTextColor={colors.placeholder} maxLength={40} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.inputLabel}>Tags</Text>
                  <Text style={styles.helper}>Vælg alle, der passer til jobbet. Tags er valgfrie.</Text>
                  <View style={styles.tagOptions}>
                    {jobTags.map(tag => {
                      const selected = tags.includes(tag);
                      return (
                        <Pressable key={tag} accessibilityRole="checkbox" accessibilityLabel={tag} accessibilityState={{ checked: selected, disabled: saving }} aria-checked={selected} disabled={saving}
                          style={({ pressed }) => [styles.tagOption, selected && styles.tagOptionSelected, pressed && styles.pressed]}
                          onPress={() => setTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])}>
                          <View style={[styles.checkbox, selected && styles.checkboxSelected]}><Text style={styles.checkboxMark}>{selected ? '✓' : ''}</Text></View>
                          <Text style={styles.jobTagText}>{tag}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
                <Pressable accessibilityRole="button" disabled={saving} style={({ pressed }) => [styles.primaryButton, (pressed || saving) && styles.pressed]} onPress={submitJob}><Text style={styles.primaryButtonText}>{saving ? 'Gemmer …' : 'Opret opslag'}</Text></Pressable>
              </View>
              <Text style={styles.helperCentered}>Opslaget gemmes lokalt og vises for jobsøgeren på samme enhed.</Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

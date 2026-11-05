import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import JobCard from '../components/JobCard';
import { colors, styles } from '../styles';
import { jobTags } from '../data/jobTags';
import { Button } from '../components/ProfileUI';
import { useActivity } from '../data/ActivityContext';

export default function CompanyScreen({
  navigation,
  user,
  jobs,
  demoJobs = [],
  onCreateJob,
  loading,
  storageError,
  onRetry,
  onLogout,
  legacyJobs,
  onMigrate,
  migrationError,
}) {
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
  const { counts } = useActivity();
  useFocusEffect(
    useCallback(() => {
      onRetry();
    }, [])
  );

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
      // Ryd kun felterne, når opslaget er gemt på serveren.
      await onCreateJob({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        ageGroup: ageGroup.trim(),
        tags,
      });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setLocation('');
      setAgeGroup('');
      setTags([]);
      setMessage('Opslaget er gemt og vises nu også i joboversigten.');
    } catch (e) {
      setError(e.message);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Text style={styles.eyebrow}>{user.name}</Text>
        <Text style={styles.pageTitle}>Jeres jobmuligheder</Text>
        <Text style={styles.roleDescription}>
          Opret jobs, og find jeres næste kollega. Ansatte finder I under Profil.
        </Text>
        <View style={{ marginBottom: 20 }}>
          <Button
            secondary
            title={`Ansøgninger${counts.jobs ? ` · ${counts.jobs} nye` : ''} →`}
            onPress={() => navigation.navigate('Applications')}
          />
        </View>
        {migrationError ? <Text style={styles.error}>{migrationError}</Text> : null}
        {legacyJobs.length > 0 ? (
          <View style={styles.demoNotice}>
            <Text style={styles.noteTitle}>{legacyJobs.length} ældre lokale opslag</Text>
            <Text style={styles.noteText}>
              Importér kun, hvis opslagene tilhører din virksomhed. Den lokale kopi bevares.
            </Text>
            <Button
              secondary
              title="Importér til denne virksomhed"
              disabled={saving}
              onPress={async () => {
                setSaving(true);
                try {
                  await onMigrate();
                  setMessage('Opslagene er importeret.');
                } catch (e) {
                  setMessage(e.message);
                } finally {
                  setSaving(false);
                }
              }}
            />
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={loading || !!storageError}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || loading || !!storageError) && styles.pressed,
          ]}
          onPress={() => {
            setError('');
            setMessage('');
            setShowForm(true);
          }}
        >
          <Text style={styles.primaryButtonText}>Opret nyt jobopslag</Text>
        </Pressable>
        {loading ? <Text style={styles.helperCentered}>Henter gemte opslag …</Text> : null}
        {storageError ? (
          <View style={styles.feedback}>
            <Text style={styles.error} accessibilityRole="alert">
              {storageError}
            </Text>
            <Pressable accessibilityRole="button" style={styles.smallButton} onPress={onRetry}>
              <Text style={styles.smallButtonText}>Prøv igen</Text>
            </Pressable>
          </View>
        ) : null}
        {message ? (
          <Text style={styles.feedbackText} accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}
        <View style={styles.companySectionHeading}>
          <Text style={styles.sectionTitle}>Aktive jobopslag</Text>
          <Text style={styles.count}>{jobs.length} opslag</Text>
        </View>
        {jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            onPress={() => navigation.navigate('Job', { id: job.id })}
          />
        ))}
        {!jobs.length && !loading ? (
          <Text style={styles.body}>
            Opret jeres første jobopslag. Ansøgninger fra unge samles under Ansøgninger.
          </Text>
        ) : null}
        {demoJobs.length > 0 && (
          <>
            <View style={styles.companySectionHeading}>
              <Text style={styles.sectionTitle}>Fiktive jobeksempler</Text>
              <Text style={styles.count}>{demoJobs.length} jobs</Text>
            </View>
            {demoJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onPress={() => navigation.navigate('Job', { id: job.id })}
              />
            ))}
          </>
        )}
      </ScrollView>
      <Modal
        visible={showForm}
        animationType="slide"
        onRequestClose={() => {
          if (!submitting.current) setShowForm(false);
        }}
      >
        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={styles.pageContent}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                style={styles.roleSwitch}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.smallButtonText}>← Annuller</Text>
              </Pressable>
              <Text style={styles.sectionTitle}>Opret nyt jobopslag</Text>
              <Text style={styles.roleDescription}>{user.name}</Text>
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.inputLabel}>Jobtitel</Text>
                  <TextInput
                    accessibilityLabel="Jobtitel"
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    editable={!saving}
                    placeholder="Fx praktisk hjælper"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.inputLabel}>Kort beskrivelse</Text>
                  <TextInput
                    accessibilityLabel="Kort beskrivelse"
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    editable={!saving}
                    multiline
                    textAlignVertical="top"
                    placeholder="Hvad skal den unge hjælpe med?"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.inputLabel}>Lokation</Text>
                  <TextInput
                    accessibilityLabel="Lokation"
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    editable={!saving}
                    placeholder="Fx København"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.inputLabel}>Aldersgruppe (valgfrit)</Text>
                  <TextInput
                    accessibilityLabel="Aldersgruppe"
                    style={styles.input}
                    value={ageGroup}
                    onChangeText={setAgeGroup}
                    editable={!saving}
                    placeholder="Fx 15–17 år eller 18–20 år"
                    placeholderTextColor={colors.placeholder}
                    maxLength={40}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.inputLabel}>Tags</Text>
                  <Text style={styles.helper}>
                    Vælg alle, der passer til jobbet. Tags er valgfrie.
                  </Text>
                  <View style={styles.tagOptions}>
                    {jobTags.map(tag => {
                      const selected = tags.includes(tag);
                      return (
                        <Pressable
                          key={tag}
                          accessibilityRole="checkbox"
                          accessibilityLabel={tag}
                          accessibilityState={{ checked: selected, disabled: saving }}
                          aria-checked={selected}
                          disabled={saving}
                          style={({ pressed }) => [
                            styles.tagOption,
                            selected && styles.tagOptionSelected,
                            pressed && styles.pressed,
                          ]}
                          onPress={() =>
                            setTags(current =>
                              current.includes(tag)
                                ? current.filter(item => item !== tag)
                                : [...current, tag]
                            )
                          }
                        >
                          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                            <Text style={styles.checkboxMark}>{selected ? '✓' : ''}</Text>
                          </View>
                          <Text style={styles.jobTagText}>{tag}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                {error ? (
                  <Text style={styles.error} accessibilityRole="alert">
                    {error}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (pressed || saving) && styles.pressed,
                  ]}
                  onPress={submitJob}
                >
                  <Text style={styles.primaryButtonText}>
                    {saving ? 'Gemmer …' : 'Opret opslag'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.helperCentered}>
                Opslaget gemmes i databasen og kan søges af unge på Foothold.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

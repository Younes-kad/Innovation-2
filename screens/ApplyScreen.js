import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, styles } from '../styles';
import { api } from '../data/api';

export default function ApplyScreen({ navigation, route, jobs, user }) {
  const { id } = route.params;
  const job = jobs.find(item => item.id === id);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [about, setAbout] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  // Vis først kvitteringen, når serveren har gemt ansøgningen.
  async function sendApplication() {
    if (saving) return;
    if (!name.trim() || !about.trim() || !email.trim()) {
      setError('Udfyld dit navn, din e-mail og lidt om dig selv.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api('/applications', 'POST', { jobId: id, name, email, about });
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!job) {
    return (
      <View style={styles.empty}>
        <Text style={styles.sectionTitle}>Jobbet blev ikke fundet</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => navigation.popTo('JobList')}
        >
          <Text style={styles.primaryButtonText}>Tilbage til jobs</Text>
        </Pressable>
      </View>
    );
  }

  if (sent) {
    // Returknappen fjerner detalje og kvittering fra stakken, så næste ansøgning starter frisk.
    return (
      <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
        <View style={styles.success}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.eyebrow}>FØRSTE SKRIDT ER TAGET</Text>
          <Text
            style={styles.successTitle}
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
          >
            {job.fictional ? 'Din demoansøgning er gemt ✓' : 'Din ansøgning er sendt ✓'}
          </Text>
          <Text style={styles.successText}>
            {job.fictional
              ? `Tak, ${name.trim()}! Du har prøvet at søge jobbet som ${job.title}. Ansøgningen er gemt i Foothold, men sendes ikke til en rigtig arbejdsgiver.`
              : `Tak, ${name.trim()}! Din ansøgning som ${job.title} ligger nu hos ${job.company}.`}
          </Text>
          <Text style={styles.helperCentered}>
            {job.fictional
              ? 'Dette er et fiktivt job og ikke en virkelig ledig stilling.'
              : 'Virksomheden kan se din ansøgning og de profiloplysninger, du har valgt at dele.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => navigation.popTo('JobList')}
          >
            <Text style={styles.primaryButtonText}>Tilbage til jobs →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>EN NY BEGYNDELSE</Text>
          <Text style={styles.pageTitle}>Lad os høre lidt{'\n'}om dig.</Text>
          <Text style={styles.body}>
            Du behøver ikke et langt CV. Start med at fortælle, hvem du er.
          </Text>
          <View style={styles.applicationJob}>
            <View style={[styles.logo, { backgroundColor: job.background }]}>
              <Text style={[styles.logoText, { color: job.color }]}>{job.initials}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.company}>{job.title}</Text>
              <Text style={styles.location}>
                {job.company} · {job.location}
              </Text>
            </View>
          </View>
          <View style={styles.form}>
            {job.fictional && (
              <Text style={styles.noteText}>
                Du søger et fiktivt job. Din demoansøgning gemmes kun i Foothold og sendes ikke til
                en rigtig arbejdsgiver.
              </Text>
            )}
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Navn</Text>
              <TextInput
                accessibilityLabel="Navn"
                style={styles.input}
                placeholder="Dit fulde navn"
                placeholderTextColor={colors.placeholder}
                value={name}
                onChangeText={setName}
                autoComplete="name"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.inputLabel}>E-mail</Text>
              <TextInput
                accessibilityLabel="E-mail"
                style={styles.input}
                placeholder="dig@eksempel.dk"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.inputLabel}>Kort om dig</Text>
              <TextInput
                accessibilityLabel="Kort om dig"
                style={[styles.input, styles.textArea]}
                placeholder="Hvem er du, og hvad gør dig nysgerrig på jobbet?"
                placeholderTextColor={colors.placeholder}
                value={about}
                onChangeText={setAbout}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.helper}>Et par sætninger er helt fint.</Text>
            </View>
            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              style={({ pressed }) => [styles.primaryButton, (pressed || saving) && styles.pressed]}
              onPress={sendApplication}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Sender …' : 'Send ansøgning  →'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.helperCentered}>
            Dit navn, din e-mail og ansøgning deles med {job.company}. Profilsektioner og opslag
            deles kun, hvis du har valgt det på din profil.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

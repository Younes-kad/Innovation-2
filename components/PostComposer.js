import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles';
import { api } from '../data/api';
import { pickImage } from '../data/pickImage';
import { Avatar, Button, Field, Toggle } from './ProfileUI';

export default function PostComposer({ visible, initialPost, profile, company, onClose, onSaved }) {
  const [draft, setDraft] = useState({ text: '', image: '', shared: false, followers: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    if (visible) {
      setDraft(
        initialPost ? { ...initialPost } : { text: '', image: '', shared: false, followers: false }
      );
      setError('');
    }
  }, [visible, initialPost]);
  function close() {
    if (!lock.current) onClose();
  }
  async function choose() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const image = await pickImage();
      if (image) setDraft(d => ({ ...d, image }));
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (lock.current) return;
    if (!draft.text.trim()) {
      setError('Skriv lidt tekst til dit opslag.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api(draft.id ? `/posts/${draft.id}` : '/posts', draft.id ? 'PUT' : 'POST', draft);
    } catch (e) {
      setError(e.message);
      return;
    } finally {
      lock.current = false;
      setBusy(false);
    }
    await onSaved();
  }
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.pageContent}
            keyboardShouldPersistTaps="handled"
          >
            <Button secondary title="← Annuller" disabled={busy} onPress={close} />
            <Text style={styles.pageTitle}>{draft.id ? 'Rediger opslag' : 'Skriv et opslag'}</Text>
            <View style={[styles.companyRow, { marginVertical: 24 }]}>
              <Avatar name={profile?.name} uri={profile?.avatar} />
              <View style={styles.flex}>
                <Text style={styles.company}>{profile?.name}</Text>
                {profile?.headline ? <Text style={styles.location}>{profile.headline}</Text> : null}
              </View>
            </View>
            <View style={styles.form}>
              <Field
                label="Dit opslag"
                placeholder="Del en oplevelse, en tanke eller noget, du har lært …"
                multiline
                maxLength={5000}
                value={draft.text}
                editable={!busy}
                onChangeText={text => setDraft(d => ({ ...d, text }))}
              />
              {draft.image ? (
                <>
                  <Image
                    source={{ uri: draft.image }}
                    accessibilityLabel="Valgt billede"
                    style={{ width: '100%', height: 260 }}
                    resizeMode="contain"
                  />
                  <Button
                    secondary
                    title="Fjern billede"
                    disabled={busy}
                    onPress={() => setDraft(d => ({ ...d, image: '' }))}
                  />
                </>
              ) : null}
              <Button secondary title="Vedhæft billede" disabled={busy} onPress={choose} />
              <View style={styles.demoNotice}>
                <Text style={styles.noteTitle}>Hvem kan se opslaget?</Text>
                <Text style={styles.noteText}>
                  Dit opslag vises altid i dit eget feed og på din profil. Uden deling er det kun
                  synligt for dig.
                </Text>
                <Toggle
                  label="Del dette opslag med mine følgere"
                  value={draft.followers}
                  disabled={busy || (!profile?.discoverable && !draft.followers)}
                  onValueChange={followers => setDraft(d => ({ ...d, followers }))}
                />
                {!profile?.discoverable && (
                  <Text style={styles.helper}>
                    Slå “Min profil må findes og følges” til under Rediger profil, hvis følgere skal
                    kunne se opslaget.
                  </Text>
                )}
                {!company && (
                  <Toggle
                    label="Del med virksomheder, jeg har søgt hos eller er ansat hos"
                    value={draft.shared}
                    disabled={busy}
                    onValueChange={shared => setDraft(d => ({ ...d, shared }))}
                  />
                )}
              </View>
              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
              <Button
                title={busy ? 'Gemmer …' : draft.id ? 'Gem ændringer' : 'Slå op'}
                disabled={busy}
                onPress={save}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles, colors } from '../styles';
import { api } from '../data/api';
import { useActivity } from '../data/ActivityContext';
import { Avatar, Button, Field } from '../components/ProfileUI';
import JobCard from '../components/JobCard';
import FeedPostCard from '../components/FeedPostCard';
import PostComposer from '../components/PostComposer';

export default function FeedScreen({ navigation, user }) {
  const [posts, setPosts] = useState([]);
  const [people, setPeople] = useState([]);
  const [profile, setProfile] = useState(null);
  const [composer, setComposer] = useState(null);
  const [search, setSearch] = useState('');
  const [showPeople, setShowPeople] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lock = useRef(false),
    request = useRef(0),
    list = useRef(null);
  useScrollToTop(list);
  const { beginRead, markRead } = useActivity();
  async function load() {
    const version = ++request.current;
    setLoading(true);
    setError('');
    try {
      const cursorRequest = beginRead('feed').catch(() => null);
      const [feed, network, me] = await Promise.allSettled([
        api('/feed'),
        api('/people'),
        api('/profiles/me'),
      ]);
      if (version !== request.current) return;
      if (feed.status === 'rejected') throw feed.reason;
      setPosts(feed.value);
      if (network.status === 'fulfilled') setPeople(network.value);
      if (me.status === 'fulfilled') setProfile(me.value);
      const cursor = await cursorRequest;
      if (cursor !== null) await markRead('feed', cursor);
    } catch (e) {
      if (version === request.current) setError(e.message);
    } finally {
      if (version === request.current) setLoading(false);
    }
  }
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );
  useEffect(
    () =>
      navigation.getParent()?.addListener('tabPress', () => {
        if (navigation.isFocused()) load();
      }),
    [navigation]
  );
  async function openComposer(post = null) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      setProfile(await api('/profiles/me'));
      setComposer({ post });
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function follow(person) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api(`/follows/${person.id}`, person.following ? 'DELETE' : 'POST', {});
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const filteredPeople = people.filter(p =>
    p.name.toLocaleLowerCase('da-DK').includes(search.toLocaleLowerCase('da-DK'))
  );
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FlatList
        ref={list}
        data={posts}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.listContent}
        onRefresh={load}
        refreshing={loading}
        ListHeaderComponent={
          <>
            <View style={[styles.brandRow, { marginBottom: 16 }]}>
              <View style={styles.companyRow}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>f.</Text>
                </View>
                <Text style={styles.brandName}>foothold</Text>
              </View>
              <Ionicons name="sparkles-outline" size={24} color={colors.green} />
            </View>
            <Text style={styles.sectionTitle}>
              {user.role === 'company' ? 'Jeres feed' : 'Dit feed'}
            </Text>
            <Text style={[styles.sectionDescription, { marginBottom: 18 }]}>
              Oplevelser, nye skridt og jobmuligheder.
            </Text>
            <View style={styles.card}>
              <View style={styles.companyRow}>
                <Avatar name={profile?.name || user.name} uri={profile?.avatar} />
                <View style={styles.flex}>
                  <Text style={styles.company}>{profile?.name || user.name}</Text>
                  <Text style={styles.location}>Hvad har du oplevet eller lært?</Text>
                </View>
              </View>
              <View style={{ marginTop: 16 }}>
                <Button
                  secondary
                  title="+ Skriv et opslag"
                  disabled={busy}
                  onPress={() => openComposer()}
                />
              </View>
            </View>
            <View style={{ marginBottom: 16 }}>
              <Button
                secondary
                title={showPeople ? 'Luk profiler' : 'Find nogen at følge'}
                onPress={() => setShowPeople(!showPeople)}
              />
            </View>
            {error ? (
              <View style={styles.card}>
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
                <Button secondary title="Prøv igen" onPress={load} />
              </View>
            ) : null}
            {message ? (
              <Text
                style={[styles.feedbackText, { marginBottom: 16 }]}
                accessibilityLiveRegion="polite"
              >
                {message}
              </Text>
            ) : null}
            {showPeople && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Find dit netværk</Text>
                <View style={{ marginVertical: 16 }}>
                  <Field
                    label="Find profiler"
                    placeholder="Søg efter navn"
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
                {!filteredPeople.length && (
                  <Text style={styles.body}>
                    Ingen profiler at vise. Man skal selv slå synlighed til under Rediger profil for
                    at kunne findes af andre.
                  </Text>
                )}
                {filteredPeople.map(p => (
                  <View key={p.id} style={[styles.rowBetween, { marginTop: 16 }]}>
                    <View style={styles.companyRow}>
                      <Avatar name={p.name} uri={p.avatar} />
                      <View style={styles.flex}>
                        <Text style={styles.company}>{p.name}</Text>
                        {p.headline ? <Text style={styles.location}>{p.headline}</Text> : null}
                      </View>
                    </View>
                    <Button
                      secondary
                      disabled={busy}
                      title={p.following ? 'Følger ✓' : '+ Følg'}
                      onPress={() => follow(p)}
                    />
                  </View>
                ))}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Dit første opslag starter her</Text>
              <Text style={styles.body}>
                Skriv et opslag ovenfor. Det vises i dit eget feed, også når det er privat.
              </Text>
              <Button secondary title="Opdatér feed" onPress={load} />
            </View>
          ) : null
        }
        renderItem={({ item: p }) =>
          p.type === 'job' ? (
            <JobCard
              job={p.job}
              onPress={() =>
                navigation.navigate('JobsTab', {
                  screen: 'Job',
                  params: { id: p.job.id },
                  initial: false,
                })
              }
            />
          ) : (
            <FeedPostCard
              post={p}
              own={p.author.id === user.id}
              following={people.find(person => person.id === p.author.id)?.following}
              busy={busy}
              onProfile={() =>
                p.author.id === user.id
                  ? navigation.navigate('ProfileTab', { screen: 'MyProfile' })
                  : navigation.navigate('Profile', { userId: p.author.id })
              }
              onFollow={() =>
                follow({
                  id: p.author.id,
                  following: people.find(person => person.id === p.author.id)?.following,
                })
              }
              onEdit={() => openComposer(p)}
            />
          )
        }
      />
      <PostComposer
        visible={!!composer}
        initialPost={composer?.post}
        profile={profile}
        company={user.role === 'company'}
        onClose={() => setComposer(null)}
        onSaved={async () => {
          setComposer(null);
          setMessage('Dit opslag er gemt og vises her i dit feed.');
          await load();
          list.current?.scrollToOffset({ offset: 0, animated: true });
        }}
      />
    </SafeAreaView>
  );
}

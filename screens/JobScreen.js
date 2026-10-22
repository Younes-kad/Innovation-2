import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles';
import JobTags from '../components/JobTags';

export default function JobScreen({ navigation, route, jobs }) {
  const { id } = route.params;
  // Den fælles jobliste indeholder også opslag hentet fra AsyncStorage.
  const job = jobs.find(item => item.id === id);

  if (!job) {
    return <View style={styles.empty}><Text style={styles.sectionTitle}>Jobbet blev ikke fundet</Text><Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => navigation.popTo('Home')}><Text style={styles.primaryButtonText}>Tilbage til jobs</Text></Pressable></View>;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <View style={styles.detailTop}>
          <View style={[styles.largeLogo, { backgroundColor: job.background }]}>
            <Text style={[styles.largeLogoText, { color: job.color }]}>{job.initials}</Text>
          </View>
          <Text style={styles.eyebrow}>{job.company}</Text>
          <Text style={styles.pageTitle}>{job.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.location}>{job.location}</Text>
            <View style={[styles.badge, { backgroundColor: job.background }]}>
              <Text style={[styles.badgeText, { color: job.color }]}>{job.category}</Text>
            </View>
          </View>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Om jobbet</Text>
          <Text style={styles.body}>{job.description}</Text>
          {job.ageGroup ? <Text style={styles.body}>Aldersgruppe: {job.ageGroup}</Text> : null}
          <JobTags tags={job.tags} />
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Det kommer du til at lave</Text>
          {job.tasks.map((task, index) => (
            <View key={task} style={styles.taskRow}>
              <View style={styles.taskNumber}><Text style={styles.taskNumberText}>{index + 1}</Text></View>
              <Text style={styles.taskText}>{task}</Text>
            </View>
          ))}
        </View>
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Dit første skridt behøver ikke være stort.</Text>
          <Text style={styles.noteText}>Fortæl kort om dig selv, og hvorfor jobbet vækker din nysgerrighed.</Text>
        </View>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => navigation.navigate('Apply', { id: job.id })}>
          <Text style={styles.primaryButtonText}>Ansøg nu  →</Text>
        </Pressable>
        <Text style={styles.helperCentered}>En kort ansøgning er en god start.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

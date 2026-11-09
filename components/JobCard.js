import { Pressable, Text, View } from 'react-native';
import { styles, jobTone } from '../styles';
import JobTags from './JobTags';

export default function JobCard({ job, onPress }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.companyRow}>
          <View style={[styles.logo, { backgroundColor: jobTone(job).background }]}>
            <Text style={[styles.logoText, { color: jobTone(job).color }]}>{job.initials}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.company}>{job.company}</Text>
            <Text style={styles.location}>{job.location}</Text>
          </View>
        </View>
        <Text style={styles.smallArrow} accessibilityElementsHidden>
          ↗
        </Text>
      </View>
      <Text style={styles.cardTitle}>{job.title}</Text>
      {job.demo ? <Text style={styles.location}>Eksempelopslag · Kan ikke søges</Text> : null}
      {job.fictional ? (
        <Text style={styles.location}>Fiktivt job · Prøv at sende en demoansøgning</Text>
      ) : null}
      <Text style={styles.cardDescription} numberOfLines={3}>
        {job.description}
      </Text>
      {job.ageGroup ? <Text style={styles.location}>Aldersgruppe: {job.ageGroup}</Text> : null}
      <JobTags tags={job.tags} />
      <View style={styles.cardFooter}>
        <View style={[styles.badge, { backgroundColor: jobTone(job).background }]}>
          <Text style={[styles.badgeText, { color: jobTone(job).color }]}>{job.category}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={'Se job: ' + job.title}
          onPress={onPress}
          style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
        >
          <Text style={styles.smallButtonText}>Se job →</Text>
        </Pressable>
      </View>
    </View>
  );
}

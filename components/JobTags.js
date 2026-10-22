import { Text, View } from 'react-native';
import { styles } from '../styles';

export default function JobTags({ tags = [] }) {
  if (!tags.length) return null;
  return (
    <View style={styles.jobTags}>
      {tags.map(tag => <View key={tag} style={styles.jobTag}><Text style={styles.jobTagText}>{tag}</Text></View>)}
    </View>
  );
}

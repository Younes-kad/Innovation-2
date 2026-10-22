import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles';
import JobCard from '../components/JobCard';

export default function HomeScreen({ navigation, jobs }) {

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={jobs}
        keyExtractor={job => job.id}
        renderItem={({ item }) => <JobCard job={item} onPress={() => navigation.navigate('Job', { id: item.id })} />}
        ListHeaderComponent={
          <View>
            <View style={styles.brandRow}>
              <View style={styles.companyRow}>
                <View style={styles.brandMark}><Text style={styles.brandMarkText}>f.</Text></View>
                <Text style={styles.brandName}>foothold</Text>
              </View>
              <Text style={styles.brandCaption}>Små skridt. Nye muligheder.</Text>
            </View>
            <Pressable accessibilityRole="button" style={styles.roleSwitch} onPress={() => navigation.popToTop()}><Text style={styles.smallButtonText}>← Tilbage til login</Text></Pressable>
            <View style={styles.hero}>
              <View style={styles.heroLabelRow}>
                <View style={styles.dot} />
                <Text style={styles.heroLabel}>DIT NÆSTE SKRIDT STARTER HER</Text>
              </View>
              <Text style={styles.heroTitle}>Store muligheder.{'\n'}Din første fod indenfor.</Text>
              <Text style={styles.heroDescription}>For dig på 18–25 år med lidt eller ingen erhvervserfaring. Find dit første job, og lær gennem konkrete opgaver.</Text>
              <View style={styles.heroBottom}>
                <Text style={styles.heroTag}>Nysgerrighed er en god start</Text>
                <Text style={styles.heroArrow} accessibilityElementsHidden>↗</Text>
              </View>
            </View>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Find dit næste job</Text>
              <Text style={styles.count}>{jobs.length} jobs</Text>
            </View>
            <Text style={styles.sectionDescription}>Nye begyndelser, tæt på dig.</Text>
            <View style={styles.filters}>
              {/* Visuelle muligheder. Filtrering kan udvikles senere. */}
              <View style={styles.filterOptions}>
                {['København', 'Aarhus', 'IT', 'Marketing'].map(label => (
                  <Pressable key={label} style={styles.filter} accessibilityRole="button" accessibilityState={{ disabled: true }} disabled>
                    <Text style={styles.filterText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={[styles.filter, styles.extraFilter]} accessibilityRole="button" accessibilityState={{ disabled: true }} disabled>
                <Text style={styles.extraFilterText}>Filtrer</Text>
              </Pressable>
            </View>
          </View>
        }
        ListFooterComponent={<Text style={styles.footerNote}>En lille start kan føre til noget stort.{'\n'}Foothold · Prototype med fiktive jobs</Text>}
      />
    </SafeAreaView>
  );
}

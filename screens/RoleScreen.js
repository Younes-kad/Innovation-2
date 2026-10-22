import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, styles } from '../styles';

export default function RoleScreen({ navigation, route }) {
  // Samme formular bruges på to ruter. Login er kun navigation i prototypen.
  const isCompany = route.name === 'CompanyLogin';

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.companyRow}>
              <View style={styles.brandMark}><Text style={styles.brandMarkText}>f.</Text></View>
              <Text style={styles.brandName}>foothold</Text>
            </View>
            <Text style={styles.brandCaption}>Små skridt. Nye muligheder.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>{isCompany ? 'FOR VIRKSOMHEDER' : 'FOR BRUGERE'}</Text>
            <Text style={styles.pageTitle}>{isCompany ? 'Virksomhedslogin' : 'Velkommen tilbage'}</Text>
            <Text style={styles.roleDescription}>{isCompany ? 'Log ind for at se jeres jobopslag og give unge en god start.' : 'Find dit første job. For dig på 18–25 år med lidt eller ingen erhvervserfaring.'}</Text>
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.inputLabel}>E-mail</Text>
                <TextInput accessibilityLabel="E-mail" style={styles.input} placeholder={isCompany ? 'virksomhed@eksempel.dk' : 'dig@eksempel.dk'} placeholderTextColor={colors.placeholder} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </View>
              <View style={styles.field}>
                <Text style={styles.inputLabel}>Adgangskode</Text>
                <TextInput accessibilityLabel="Adgangskode" style={styles.input} placeholder="Din adgangskode" placeholderTextColor={colors.placeholder} secureTextEntry autoCapitalize="none" autoCorrect={false} />
              </View>
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => navigation.navigate(isCompany ? 'Company' : 'Home')}>
                <Text style={styles.primaryButtonText}>Log ind</Text>
              </Pressable>
            </View>
            <Text style={styles.helperCentered}>Demo · Du kan logge ind uden at udfylde felterne. Oplysningerne bliver ikke sendt eller gemt.</Text>
          </View>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => isCompany ? navigation.goBack() : navigation.navigate('CompanyLogin')}>
            <Text style={styles.secondaryButtonText}>{isCompany ? '← Tilbage til brugerlogin' : 'Log ind som virksomhed'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

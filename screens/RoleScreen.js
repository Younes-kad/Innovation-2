import BrandLogo from '../components/BrandLogo';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles';
import { Button, Field } from '../components/ProfileUI';
import { MIN_AGE, ageOnDate, normalizePhone } from '../shared/registration';
export default function RoleScreen({ navigation, route, onAuthenticate, notice }) {
  const isCompany = route.name === 'CompanyLogin';
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const age = ageOnDate(birthDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (busy) return;
    if (register) {
      if (!normalizePhone(phone)) {
        setError('Skriv et gyldigt telefonnummer: 8 cifre eller med landekode, fx +45.');
        return;
      }
      if (!isCompany && age === null) {
        setError('Skriv en gyldig fødselsdato som ÅÅÅÅ-MM-DD.');
        return;
      }
      // RETTELSE (aldersgrænse): Samme grænse som på serveren, så man får besked med det samme.
      if (!isCompany && age < MIN_AGE) {
        setError(`Du skal være mindst ${MIN_AGE} år for at oprette en konto.`);
        return;
      }
      if (!isCompany && age < 18 && !normalizePhone(parentPhone)) {
        setError('Når du er under 18, skal du også angive en forælders telefonnummer.');
        return;
      }
    }
    setBusy(true);
    setError('');
    try {
      await onAuthenticate(register, {
        name,
        email,
        password,
        phone,
        birthDate,
        parentPhone,
        role: isCompany ? 'company' : 'young',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <BrandLogo />
            <Text style={styles.brandCaption}>Små skridt. Nye muligheder.</Text>
          </View>
          {/* RETTELSE (udløbet login): Forklarer, hvorfor man er tilbage på login. */}
          {notice ? (
            <View style={styles.demoNotice}>
              <Text accessibilityRole="alert" style={styles.noteText}>
                {notice}
              </Text>
            </View>
          ) : null}
          <View style={[styles.card, styles.loginCard]}>
            <Text style={styles.eyebrow}>{isCompany ? 'FOR VIRKSOMHEDER' : 'FOR UNGE'}</Text>
            <Text style={styles.pageTitle}>
              {register ? 'Opret din konto' : 'Velkommen tilbage'}
            </Text>
            <Text style={styles.roleDescription}>
              {isCompany
                ? 'Giv unge en god start. Se jeres jobs, ansøgninger og ansatte.'
                : 'Dit første job. Dine erfaringer. Din egen vej videre.'}
            </Text>
            <View style={styles.form}>
              {register && (
                <Field
                  label={isCompany ? 'Virksomhedens navn' : 'Dit navn'}
                  value={name}
                  onChangeText={setName}
                  editable={!busy}
                  maxLength={120}
                />
              )}
              <Field
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              {register && (
                <>
                  <Field
                    label={isCompany ? 'Virksomhedens telefonnummer' : 'Dit telefonnummer'}
                    placeholder="Fx 12 34 56 78 eller +45 12 34 56 78"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    editable={!busy}
                    maxLength={40}
                  />
                  {!isCompany && (
                    <>
                      <Field
                        label="Fødselsdato (ÅÅÅÅ-MM-DD)"
                        placeholder="Fx 2010-05-21"
                        value={birthDate}
                        onChangeText={setBirthDate}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!busy}
                        maxLength={10}
                      />
                      <Text style={styles.helper}>
                        Du skal være mindst {MIN_AGE} år. Vi bruger din fødselsdato til at tjekke
                        din alder, og om en forælders telefonnummer er påkrævet.
                      </Text>
                      {age !== null && age < 18 && (
                        <Field
                          label="Forælders telefonnummer"
                          placeholder="Fx 12 34 56 78 eller +45 12 34 56 78"
                          value={parentPhone}
                          onChangeText={setParentPhone}
                          keyboardType="phone-pad"
                          editable={!busy}
                          maxLength={40}
                        />
                      )}
                    </>
                  )}
                  <Text style={styles.helper}>
                    Telefonnumre og fødselsdato gemmes privat og vises ikke på din profil eller til
                    virksomheder.
                  </Text>
                </>
              )}
              <Field
                label="Adgangskode"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!busy}
              />
              {register && (
                <Text style={styles.helper}>
                  Mindst 10 tegn. Din profil og dine opslag er private som udgangspunkt.
                </Text>
              )}
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <Button
                title={busy ? 'Vent …' : register ? 'Opret konto' : 'Log ind'}
                disabled={busy}
                onPress={submit}
              />
              <Button
                secondary
                title={register ? 'Jeg har allerede en konto' : 'Ny her? Opret en konto'}
                disabled={busy}
                onPress={() => {
                  setRegister(!register);
                  setError('');
                }}
              />
            </View>
          </View>
          <Button
            secondary
            disabled={busy}
            title={isCompany ? '← Tilbage til brugerlogin' : 'Log ind som virksomhed'}
            onPress={() => (isCompany ? navigation.goBack() : navigation.navigate('CompanyLogin'))}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { Text, View } from 'react-native';
import { styles } from '../styles';
import { Button, Field } from './ProfileUI';
import { durations, wageUnits, validateTerms } from '../shared/employment';

export const emptyTerms = {
  wage: '',
  wageUnit: 'kr./time',
  hoursPerWeek: '',
  duration: '3 måneder',
  startDate: '',
  endDate: '',
};
export const offerStatus = {
  pending: 'Afventer den unges godkendelse',
  accepted: 'Godkendt af den unge',
  declined: 'Afvist af den unge',
  withdrawn: 'Trukket tilbage af virksomheden',
};
export function TermsSummary({ terms }) {
  return (
    <View style={{ gap: 8, marginVertical: 16 }}>
      <Text style={styles.noteTitle}>Aftalte vilkår</Text>
      <Text style={styles.noteText}>
        Løn: {terms.wage.toLocaleString('da-DK')} {terms.wageUnit}
      </Text>
      <Text style={styles.noteText}>
        Timer om ugen: {terms.hoursPerWeek.toLocaleString('da-DK')}
      </Text>
      <Text style={styles.noteText}>
        {terms.duration} · {terms.startDate} – {terms.endDate}
      </Text>
    </View>
  );
}
export function TermsForm({ value, onChange, disabled }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  const task = ['Miniprojekt', 'Engangsopgave'].includes(value.duration);
  let preview;
  try {
    preview = validateTerms(value);
  } catch {
    /* Show the computed end date once the form is valid. */
  }
  return (
    <View style={styles.form}>
      <Text style={styles.sectionTitle}>Tilbud om ansættelse</Text>
      <Text style={styles.noteText}>
        Udfyld de aftalte vilkår. Personen bliver først registreret som ansat, når tilbuddet er
        godkendt på vedkommendes egen side.
      </Text>
      <Field
        label="Aftalt løn (DKK)"
        placeholder="Fx 135,50"
        value={value.wage}
        keyboardType="decimal-pad"
        editable={!disabled}
        maxLength={12}
        onChangeText={v => update('wage', v)}
      />
      <View style={styles.tagOptions}>
        {wageUnits.map(unit => (
          <Button
            key={unit}
            secondary
            title={`${unit}${value.wageUnit === unit ? ' ✓' : ''}`}
            disabled={disabled}
            onPress={() => update('wageUnit', unit)}
          />
        ))}
      </View>
      <Field
        label="Aftalte timer om ugen"
        placeholder="Fx 8"
        value={value.hoursPerWeek}
        keyboardType="decimal-pad"
        editable={!disabled}
        maxLength={8}
        onChangeText={v => update('hoursPerWeek', v)}
      />
      <Text style={styles.inputLabel}>Varighed / opgavetype</Text>
      <View style={styles.tagOptions}>
        {durations.map(duration => (
          <Button
            key={duration}
            secondary
            title={`${duration}${value.duration === duration ? ' ✓' : ''}`}
            disabled={disabled}
            onPress={() => update('duration', duration)}
          />
        ))}
      </View>
      <Field
        label="Startdato (ÅÅÅÅ-MM-DD)"
        placeholder="2026-12-01"
        value={value.startDate}
        editable={!disabled}
        maxLength={10}
        onChangeText={v => update('startDate', v)}
      />
      {task ? (
        <Field
          label="Slutdato (ÅÅÅÅ-MM-DD)"
          placeholder="2026-12-15"
          value={value.endDate}
          editable={!disabled}
          maxLength={10}
          onChangeText={v => update('endDate', v)}
        />
      ) : (
        <Text style={styles.helper}>
          Slutdato beregnes ud fra startdato og varighed.
          {preview ? ` Slutdato: ${preview.endDate}.` : ''}
        </Text>
      )}
      <Text style={styles.helper}>
        Løn og arbejdstid vises kun til virksomheden og modtageren af tilbuddet.
      </Text>
      {/* RETTELSE (timer efter alder): Appen ved ikke, om 9. klasse er afsluttet, så virksomheden
          får reglen her. Selve grænserne tjekkes på serveren (se shared/employment.js). */}
      <Text style={styles.helper}>
        Under 18 år: 14-årige må højst arbejde 12 timer om ugen og 15-17-årige højst 40 timer. Har
        den unge ikke afsluttet 9. klasse, er grænsen 12 timer i skoleuger.
      </Text>
    </View>
  );
}

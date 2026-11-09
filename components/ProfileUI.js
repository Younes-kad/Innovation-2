import { Image, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { colors, fonts, styles } from '../styles';
export function Button({ title, onPress, disabled, secondary = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        secondary ? styles.smallButton : styles.primaryButton,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={secondary ? styles.smallButtonText : styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}
export function Field({ label, multiline, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, multiline && styles.textArea]}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}
export function Toggle({ label, value, onValueChange, disabled }) {
  return (
    <View style={[styles.rowBetween, { marginVertical: 10 }]}>
      <Text style={[styles.noteText, { flex: 1 }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={!!value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.green }}
      />
    </View>
  );
}
export function Avatar({ uri, name, large = false }) {
  const size = large ? 84 : 46;
  return uri ? (
    <Image
      accessibilityLabel={`Profilbillede af ${name}`}
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.lime,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: colors.green, fontSize: large ? 28 : 18, fontFamily: fonts.bold }}>
        {(name || '?')
          .split(' ')
          .map(s => s[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()}
      </Text>
    </View>
  );
}
export const dateLabel = value =>
  new Date(value).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });

import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../styles';

// The transparent mark is shared by web and native; the SVG source lives in assets/brand.
export default function BrandLogo({ markOnly = false, size = 40 }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Foothold" style={logo.row}>
      <Image
        source={require('../assets/brand/foothold-mark.png')}
        style={{ width: size, height: (size * 152) / 148 }}
        resizeMode="contain"
      />
      {!markOnly && <Text style={logo.wordmark}>Foothold</Text>}
    </View>
  );
}

const logo = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, flexShrink: 0 },
  wordmark: { fontFamily: fonts.bold, fontSize: 30, letterSpacing: -0.7, color: colors.petrol },
});

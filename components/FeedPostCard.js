import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, styles } from '../styles';
import { Avatar, Button, dateLabel } from './ProfileUI';

export default function FeedPostCard({ post, own, following, busy, onProfile, onFollow, onEdit }) {
  const audience =
    [post.followers && 'Følgere', post.shared && 'Dine virksomheder'].filter(Boolean).join(' · ') ||
    'Kun mig';
  return (
    <View style={card.container} testID={`feed-post-${post.id}`}>
      <View style={card.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Åbn ${post.author.name}s profil`}
          style={styles.companyRow}
          onPress={onProfile}
        >
          <Avatar name={post.author.name} uri={post.author.avatar} />
          <View style={styles.flex}>
            <Text style={card.name}>{post.author.name}</Text>
            {post.author.headline ? <Text style={card.meta}>{post.author.headline}</Text> : null}
            <Text style={card.meta}>
              {dateLabel(post.createdAt)}
              {own ? ` · ${audience}` : ''}
            </Text>
          </View>
        </Pressable>
        {!own && (
          <Button
            secondary
            disabled={busy}
            title={following ? 'Følger ✓' : '+ Følg'}
            onPress={onFollow}
          />
        )}
      </View>
      {post.fictional && <Text style={card.demo}>Fiktivt inspirationsopslag</Text>}
      <Text selectable style={card.text}>
        {post.text}
      </Text>
      {post.image ? (
        <Image
          source={{ uri: post.image }}
          accessibilityLabel={`Billede i ${post.author.name}s opslag`}
          style={card.image}
          resizeMode="contain"
        />
      ) : null}
      {own && (
        <View style={card.footer}>
          <Text style={styles.helper}>
            {post.followers || post.shared ? 'Dit opslag' : 'Privat opslag · Kun synligt for dig'}
          </Text>
          <Button secondary title="Rediger opslag" onPress={onEdit} />
        </View>
      )}
    </View>
  );
}
const card = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink, lineHeight: 21 },
  meta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.muted,
    lineHeight: 18,
    marginTop: 2,
  },
  demo: { fontSize: 11, fontFamily: fonts.regular, color: colors.muted, marginTop: 14 },
  text: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.ink,
    lineHeight: 25,
    marginTop: 18,
  },
  image: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: 12,
    marginTop: 18,
    backgroundColor: colors.background,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 18,
    paddingTop: 12,
    gap: 10,
  },
});

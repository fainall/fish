import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import FishCatalogScreen from './FishCatalogScreen';
import FloraScreen from './FloraScreen';

type Segment = 'fish' | 'flora';

export default function ExploreScreen({ navigation }: any) {
  const { fs } = useResponsive();
  const [segment, setSegment] = useState<Segment>('fish');

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* Top bar */}
      <LinearGradient colors={['#EDF6FB', '#F4FAFD']} style={styles.topSection}>
        <View style={styles.topBar}>
          <Text style={[styles.title, { fontSize: fs(24) }]}>Explorar</Text>
          <TouchableOpacity
            style={styles.wishlistBtn}
            onPress={() => navigation.navigate('Wishlist')}
          >
            <Ionicons name="heart-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Segmented control */}
        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[styles.segment, segment === 'fish' && styles.segmentActive]}
            onPress={() => setSegment('fish')}
          >
            <Text style={[styles.segmentText, segment === 'fish' && styles.segmentTextActive]}>
              🐠 Peces
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, segment === 'flora' && styles.segmentActive]}
            onPress={() => setSegment('flora')}
          >
            <Text style={[styles.segmentText, segment === 'flora' && styles.segmentTextActive]}>
              🌿 Plantas
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {segment === 'fish' ? (
          <FishCatalogScreen embedded navigation={navigation} />
        ) : (
          <FloraScreen embedded />
        )}
      </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  topSection: { paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  title: { fontSize: 24, fontWeight: '800', fontFamily: FONTS.sansEb, color: COLORS.text, letterSpacing: -0.3 },
  wishlistBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  segmentWrap: {
    flexDirection: 'row', marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.backgroundCard, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, padding: 4,
  },
  segment: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: BORDER_RADIUS.lg,
  },
  segmentActive: { backgroundColor: COLORS.primary + '14' },
  segmentText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.sans },
  segmentTextActive: { color: COLORS.primary, fontWeight: '700', fontFamily: FONTS.sansBd },
  content: { flex: 1 },
});

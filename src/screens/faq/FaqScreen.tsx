import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {ScreenContainer} from '../../components/common';
import {useThemeColors} from '../../hooks/useThemeColors';
import apiClient from '../../services/apiClient';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

interface FaqScreenProps {
  navigation: any;
}

interface FaqItem {
  question: string;
  answer: string;
}

export const FaqScreen: React.FC<FaqScreenProps> = ({navigation}) => {
  const {colors} = useThemeColors();
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchFaq = async () => {
      try {
        const response = await apiClient.get('/settings/app-content');
        const data = response.data?.data || response.data;
        const faq = data?.faq || [];
        setFaqItems(faq);
      } catch (error) {
        console.log('[FAQ] Error fetching FAQ:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFaq();
  }, []);

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ScreenContainer>
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, {color: colors.text}]}>FAQ</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionSubtitle, {color: colors.textMuted}]}>
          Domande frequenti
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : faqItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="help-circle-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, {color: colors.textMuted}]}>
              Nessuna FAQ disponibile
            </Text>
          </View>
        ) : (
          <View style={styles.faqList}>
            {faqItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.faqItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: COLORS.primary,
                  },
                ]}
                onPress={() => toggleExpanded(index)}
                activeOpacity={0.8}>
                <View style={styles.faqHeader}>
                  <View style={[styles.faqIconContainer, {backgroundColor: `${COLORS.primary}15`}]}>
                    <Ionicons name="help-circle" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={[styles.faqQuestion, {color: colors.text}]} numberOfLines={expandedIndex === index ? undefined : 2}>
                    {item.question}
                  </Text>
                  <Ionicons
                    name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textMuted}
                  />
                </View>
                {expandedIndex === index && (
                  <View style={[styles.faqAnswerContainer, {borderTopColor: COLORS.primary}]}>
                    <Text style={[styles.faqAnswer, {color: '#000000'}]}>
                      {item.answer}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  screenTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
  },
  faqList: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  faqItem: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  faqIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: 22,
  },
  faqAnswerContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    marginHorizontal: SPACING.sm,
  },
  faqAnswer: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 22,
  },
});

export default FaqScreen;

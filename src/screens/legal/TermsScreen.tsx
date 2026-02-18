import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer} from '../../components/common';
import {useThemeColors} from '../../hooks/useThemeColors';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  RADIUS,
} from '../../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;

export const TermsScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useThemeColors();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Termini di Servizio</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <Text style={[styles.mainTitle, {color: colors.text}]}>
          Politica di Rimborso - Acquisti In-App
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>1. Ambito di applicazione</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          La presente Politica di Rimborso si applica a tutti gli acquisti effettuati all'interno dell'applicazione RaffleMania, inclusi ma non limitati a contenuti digitali, funzionalit&agrave; premium, abbonamenti, valute virtuali e beni virtuali.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>2. Natura dei contenuti digitali</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Gli acquisti in-app consistono in contenuti digitali e/o servizi immediatamente fruibili al momento della conferma del pagamento. L'utente riconosce che tali contenuti non sono beni materiali e non possono essere restituiti.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>3. Assenza di diritto al rimborso</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Salvo ove diversamente previsto dalla legge applicabile, tutti gli acquisti in-app sono definitivi e non rimborsabili.{'\n'}Effettuando un acquisto, l'utente:
        </Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>
          {'\u2022'} conferma di voler ottenere l'accesso immediato al contenuto digitale o al servizio;
        </Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>
          {'\u2022'} accetta espressamente di rinunciare a qualsiasi diritto di recesso o rimborso previsto per i consumatori, laddove consentito dalla normativa locale.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>4. Eccezioni</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Eventuali rimborsi potranno essere valutati esclusivamente nei seguenti casi:
        </Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} addebiti fraudolenti comprovati;</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} errori tecnici imputabili all'App che impediscano completamente l'erogazione del contenuto acquistato;</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} obblighi inderogabili previsti dalla legge del paese dell'utente.</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          La decisione finale resta a discrezione del gestore dell'App, nel rispetto delle normative vigenti.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>5. Piattaforme di pagamento</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Gli acquisti effettuati tramite store di terze parti (es. Apple App Store, Google Play Store, ecc.) possono essere soggetti alle politiche di rimborso delle rispettive piattaforme. L'utente &egrave; tenuto a consultare anche tali condizioni.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>6. Responsabilit&agrave; dell'utente</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          L'utente &egrave; responsabile di:
        </Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} verificare attentamente l'acquisto prima della conferma;</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} assicurarsi che il dispositivo e l'account utilizzato siano corretti;</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} impedire acquisti non autorizzati da parte di minori o terzi.</Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>7. Contatti</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Per segnalazioni relative a problemi tecnici o pagamenti non autorizzati:{'\n\n'}Contattaci direttamente in app cliccando su "parla con un operatore" oppure manda una email al seguente indirizzo: app.rafflemania@gmail.com
        </Text>

        <View style={{height: SPACING.xl}} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
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
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  mainTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  paragraph: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  listItem: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 22,
    paddingLeft: SPACING.md,
    marginBottom: 4,
  },
});

export default TermsScreen;

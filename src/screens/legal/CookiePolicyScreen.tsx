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

type Props = NativeStackScreenProps<RootStackParamList, 'CookiePolicy'>;

export const CookiePolicyScreen: React.FC<Props> = ({navigation}) => {
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
        <Text style={[styles.headerTitle, {color: colors.text}]}>Cookie Policy</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <Text style={[styles.lastUpdate, {color: colors.textSecondary}]}>
          Ultimo aggiornamento: 18/02/2026
        </Text>

        <Text style={[styles.paragraph, {color: colors.text}]}>
          La presente Cookie Policy descrive l'uso dei cookie e di tecnologie simili da parte di Rafflemania! ("Titolare") all'interno dell'applicazione e/o sito RaffleMania! ("Servizio").
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>1. Cosa sono i Cookie</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          I cookie sono piccoli file di testo che vengono salvati sul dispositivo dell'utente quando visita un sito o utilizza un'app. Servono a migliorare l'esperienza di utilizzo, ricordare preferenze e raccogliere informazioni statistiche.
        </Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Nelle app mobili possono essere utilizzate tecnologie equivalenti, come identificativi pubblicitari (IDFA, GAID), local storage o SDK di terze parti.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>2. Tipologie di Cookie Utilizzati</Text>

        <Text style={[styles.subTitle, {color: colors.text}]}>a) Cookie Tecnici / Necessari</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Sono indispensabili per il funzionamento del Servizio.{'\n'}Esempi:{'\n'}- autenticazione utente{'\n'}- sicurezza{'\n'}- salvataggio preferenze base
        </Text>
        <Text style={[styles.note, {color: colors.textSecondary}]}>
          Questi cookie non richiedono consenso.
        </Text>

        <Text style={[styles.subTitle, {color: colors.text}]}>b) Cookie Analitici / Statistici</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Utilizzati per raccogliere informazioni anonime sull'uso del Servizio (numero utenti, pagine visitate, tempo di utilizzo). Possono essere gestiti direttamente dal Titolare o da terze parti.
        </Text>
        <Text style={[styles.note, {color: colors.textSecondary}]}>
          Possono richiedere consenso a seconda della normativa locale.
        </Text>

        <Text style={[styles.subTitle, {color: colors.text}]}>c) Cookie di Profilazione / Marketing</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Utilizzati per mostrare pubblicita personalizzata o analizzare il comportamento dell'utente a fini commerciali.
        </Text>
        <Text style={[styles.note, {color: colors.textSecondary}]}>
          Richiedono sempre il consenso esplicito dell'utente.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>3. Cookie di Terze Parti</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Il Servizio puo integrare strumenti di terze parti che installano cookie o tecnologie simili, ad esempio:{'\n'}- servizi di analisi dati{'\n'}- reti pubblicitarie{'\n'}- social media plugin{'\n'}- piattaforme di pagamento
        </Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Le informazioni raccolte sono gestite secondo le privacy policy delle rispettive terze parti.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>4. Gestione del Consenso</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          L'utente puo:{'\n'}- accettare o rifiutare i cookie non necessari tramite banner o impostazioni dell'app{'\n'}- modificare le preferenze in qualsiasi momento{'\n'}- disabilitare i cookie dalle impostazioni del dispositivo o del browser
        </Text>
        <Text style={[styles.note, {color: colors.textSecondary}]}>
          La disabilitazione dei cookie tecnici puo compromettere il funzionamento del Servizio.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>5. Conservazione dei Dati</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          I cookie hanno una durata variabile:{'\n'}- di sessione: si cancellano alla chiusura dell'app/browser{'\n'}- persistenti: rimangono per un periodo definito o finche non vengono eliminati manualmente
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>6. Diritti dell'Utente</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          L'utente puo esercitare i diritti previsti dalla normativa privacy applicabile, inclusi accesso, cancellazione, limitazione del trattamento e opposizione.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>7. Modifiche alla Cookie Policy</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Il Titolare si riserva il diritto di aggiornare questa Cookie Policy. Le modifiche saranno pubblicate con data di aggiornamento.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>8. Contatti</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Per informazioni sull'uso dei cookie o sul trattamento dei dati personali:
        </Text>
        <Text style={[styles.email, {color: COLORS.primary}]}>
          app.rafflemania@gmail.com
        </Text>

        <View style={styles.bottomSpacer} />
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
    paddingBottom: SPACING.xl,
  },
  lastUpdate: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  subTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  paragraph: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  note: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
  },
  email: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.md,
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
});

export default CookiePolicyScreen;

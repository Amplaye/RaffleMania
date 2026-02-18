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

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

export const PrivacyPolicyScreen: React.FC<Props> = ({navigation}) => {
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
        <Text style={[styles.headerTitle, {color: colors.text}]}>Privacy Policy</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <Text style={[styles.paragraph, {color: colors.text}]}>
          La presente Informativa sulla Privacy descrive le modalit&agrave; di raccolta, utilizzo e protezione dei dati personali degli utenti ("Utente") dell'applicazione RaffleMania ("App").
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>1. Titolare del Trattamento</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Email di contatto: app.rafflemania@gmail.com
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>2. Tipologia di Dati Raccolti</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          L'App pu&ograve; raccogliere le seguenti categorie di dati:
        </Text>

        <Text style={[styles.subTitle, {color: colors.text}]}>a) Dati forniti volontariamente dall'utente</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Nome e cognome</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Indirizzo email</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Username o nickname</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Informazioni inserite nei moduli dell'App</Text>

        <Text style={[styles.subTitle, {color: colors.text}]}>b) Dati raccolti automaticamente</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Indirizzo IP</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Tipo di dispositivo</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Sistema operativo</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Log di utilizzo</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Identificativi pubblicitari (IDFA, GAID o simili)</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Cookie o tecnologie simili</Text>

        <Text style={[styles.subTitle, {color: colors.text}]}>c) Dati di pagamento</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          I pagamenti sono gestiti da piattaforme terze (es. store digitali o provider di pagamento). L'App non memorizza i dati completi delle carte di credito.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>3. Finalit&agrave; del Trattamento</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          I dati raccolti possono essere utilizzati per:
        </Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Fornire e mantenere il servizio</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Gestire account utente</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Elaborare acquisti in-app</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Migliorare funzionalit&agrave; e prestazioni</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Assistenza clienti</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Comunicazioni di servizio</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Sicurezza e prevenzione frodi</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Adempimenti legali</Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>4. Base Giuridica del Trattamento</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Consenso dell'utente</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Esecuzione di un contratto</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Obblighi legali</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Legittimo interesse del titolare</Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>5. Condivisione dei Dati</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          I dati possono essere condivisi con:
        </Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Fornitori di servizi tecnici (hosting, analytics, cloud)</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Piattaforme di pagamento</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Autorit&agrave; pubbliche quando richiesto dalla legge</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Partner commerciali solo previo consenso</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          I dati non vengono venduti a terzi.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>6. Conservazione dei Dati</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          I dati personali vengono conservati solo per il tempo necessario alle finalit&agrave; indicate o secondo quanto richiesto dalle leggi applicabili.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>7. Sicurezza dei Dati</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Vengono adottate misure tecniche e organizzative adeguate per proteggere i dati personali da accessi non autorizzati, perdita o divulgazione.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>8. Diritti dell'Utente</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          L'utente pu&ograve;, ove previsto dalla legge:
        </Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Accedere ai propri dati</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Richiederne la rettifica</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Richiederne la cancellazione</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Limitare o opporsi al trattamento</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Richiedere la portabilit&agrave; dei dati</Text>
        <Text style={[styles.listItem, {color: colors.textSecondary}]}>{'\u2022'} Revocare il consenso</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Le richieste possono essere inviate alla mail di contatto indicata sopra.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>9. Minori</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          L'App non &egrave; destinata a minori di 16 anni senza il consenso dei genitori o tutori legali. In caso di raccolta involontaria di dati di minori, questi verranno cancellati.
        </Text>

        <Text style={[styles.sectionTitle, {color: colors.text}]}>10. Modifiche alla Privacy Policy</Text>
        <Text style={[styles.paragraph, {color: colors.text}]}>
          Ci riserviamo il diritto di aggiornare questa Privacy Policy. Le modifiche saranno pubblicate all'interno dell'App con data di aggiornamento.
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
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  subTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
    marginTop: SPACING.sm,
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

export default PrivacyPolicyScreen;

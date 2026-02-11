# RaffleMania - Note Operative

## Server & Credenziali

### FTP (Filesystem REALE di WordPress)
- **Host:** 93.186.242.234
- **Username:** accdevelo256
- **Password:** wK!4067gu
- **Root FTP = WordPress root** (`/var/www/vhosts/rafflemania.it/httpdocs/`)
- Questo account ha accesso COMPLETO a tutti i file WordPress (core, config, plugins, themes)

### FTP (Account LIMITATO - NON usare per modifiche WordPress!)
- **Username:** developer2026
- **Password:** 0y44r6_Jc
- **ATTENZIONE:** Questo account scrive in un overlay separato dal filesystem reale di WordPress. I file caricati NON vengono visti da WordPress. Usare SOLO per il contenuto di `wp-content/plugins/rafflemania-api/` (che per qualche ragione funziona).

### WordPress Admin
- **URL:** https://www.rafflemania.it/wp-admin/
- **Username:** steward
- **Password:** Ammcraftr25$!
- **REST API Base:** https://www.rafflemania.it/wp-json/rafflemania/v1

### Server Info
- **Hosting:** Aruba (Plesk Obsidian 18.0.72)
- **Plesk Panel:** https://93.186.242.234:8443/ (credenziali Plesk diverse da FTP/WP)
- **Plesk hostname:** mu001358.arubabiz.net
- **PHP:** 8.1.34
- **WordPress:** 6.9.1
- **nginx** come web server (NO .htaccess)
- **Plesk API:** bloccato per IP esterni
- **SSH:** porte 22 e 2222 chiuse
- **MySQL:** porta 3306 chiusa dall'esterno
- **phpMyAdmin:** accessibile su porta 8443 (richiede credenziali DB)

### Database (da wp-config.php)
- Credenziali in `C:\Users\Steward\RaffleMania\wp-config.php` (scaricato dal server)

## Plugin Attivi (dopo pulizia 2026-02-10)
1. **rafflemania-api** - Plugin principale API
2. **elementor + elementor-pro** - Page builder per frontend sito
3. **wp-mail-smtp** - Invio email (verifica, recupero, ecc.)

## Plugin Rimossi (2026-02-10)
- code-snippets (causava crash fatale)
- advanced-custom-fields (non utilizzato)
- custom-css-js (non utilizzato)
- wp-file-manager (rischio sicurezza, directory residua vuota in plugins/)
- rm-referral-bridge (non utilizzato)

## Regole Importanti
1. **MAI usare** l'account FTP `developer2026` per modificare file WordPress (i file finiscono in un overlay separato)
2. **SEMPRE usare** l'account FTP `accdevelo256` per qualsiasi modifica al server
3. **MAI installare** Code Snippets o plugin simili che eseguono codice PHP arbitrario
4. **OPcache:** validate_timestamps=1, revalidate_freq=2. Dopo modifiche ai file PHP, potrebbe essere necessario resettare opcache
5. **WAF/ModSecurity:** Il server blocca richieste POST senza headers appropriati (Content-Type, User-Agent). L'app deve sempre inviare headers corretti.
6. Il server ha **3 directory FTP** (httpdocs, htdocs, public_html) ma solo la root di `accdevelo256` mappa al vero filesystem WordPress

## Fix Applicati

### apply_referral v1 (2026-02-10)
- **File:** `/wp-content/plugins/rafflemania-api/includes/API/AuthController.php` (riga 1157)
- **Problema:** Nessun null check su `$user` prima di `$user->referred_by`, crash PHP 8.1
- **Fix:** try-catch \Throwable + null checks su user_id, user, referral_code + controllo self-referral + controllo referral duplicato

### apply_referral v2 - Rimozione JWT auth (2026-02-10)
- **File server:** `/wp-content/plugins/rafflemania-api/includes/API/AuthController.php`
- **File app:** `src/screens/referral/ReferralScreen.tsx` (riga 261)
- **Problema:** L'endpoint usava `permission_callback => check_auth` (JWT) che causava errori 401 quando il token era scaduto. Il token refresh non funzionava correttamente, risultando in errori per l'utente.
- **Fix:** Rimossa autenticazione JWT dall'endpoint. Ora usa `permission_callback => '__return_true'` con verifica `user_id` + `email` (match nel DB) come auth alternativa. L'app passa `user_id` e `email` nel body della richiesta POST.

<?php
// Settings Page v2.0 - Cleaned up, XP/Credits moved to Economia page
if (!defined('ABSPATH')) exit;

// Handle save
$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rafflemania_settings_nonce'])) {
    if (wp_verify_nonce($_POST['rafflemania_settings_nonce'], 'rafflemania_settings_action')) {

        // Push notifications (OneSignal)
        update_option('rafflemania_onesignal_app_id', sanitize_text_field($_POST['onesignal_app_id']));
        update_option('rafflemania_onesignal_api_key', sanitize_text_field($_POST['onesignal_api_key']));

        // Firebase (for Support Chat)
        update_option('rafflemania_firebase_project_id', sanitize_text_field($_POST['firebase_project_id']));
        update_option('rafflemania_firebase_api_key', sanitize_text_field($_POST['firebase_api_key']));

        // Contact email
        update_option('rafflemania_contact_email', sanitize_email($_POST['contact_email']));

        // Admin key
        if (!empty($_POST['admin_api_key'])) {
            update_option('rafflemania_admin_api_key', sanitize_text_field($_POST['admin_api_key']));
        }

        // Stripe
        if (isset($_POST['stripe_secret_key'])) {
            update_option('rafflemania_stripe_secret_key', sanitize_text_field($_POST['stripe_secret_key']));
        }
        if (isset($_POST['stripe_publishable_key'])) {
            update_option('rafflemania_stripe_publishable_key', sanitize_text_field($_POST['stripe_publishable_key']));
        }
        if (isset($_POST['stripe_webhook_secret'])) {
            update_option('rafflemania_stripe_webhook_secret', sanitize_text_field($_POST['stripe_webhook_secret']));
        }

        // Apple IAP
        if (isset($_POST['apple_shared_secret'])) {
            update_option('rafflemania_apple_shared_secret', sanitize_text_field($_POST['apple_shared_secret']));
        }

        // Google IAP
        if (isset($_POST['google_service_account'])) {
            update_option('rafflemania_google_service_account', sanitize_text_field($_POST['google_service_account']));
        }

        $message = 'Impostazioni salvate con successo!';
    }
}

$contact_email = get_option('rafflemania_contact_email', get_option('admin_email'));
$jwt_secret = get_option('rafflemania_jwt_secret', '');
$admin_api_key = get_option('rafflemania_admin_api_key', '');
?>

<div class="wrap rafflemania-settings-wrap">
    <h1>
        <span class="dashicons dashicons-admin-settings" style="font-size: 30px; margin-right: 10px; color: #FF6B00;"></span>
        Impostazioni RaffleMania
    </h1>

    <?php if ($message): ?>
    <div class="rafflemania-toast rafflemania-toast-success">
        <span class="dashicons dashicons-yes-alt"></span> <?php echo esc_html($message); ?>
    </div>
    <?php endif; ?>

    <style>
        .rafflemania-settings-wrap { }

        .rafflemania-toast {
            position: fixed;
            top: 40px;
            right: 20px;
            z-index: 99999;
            padding: 14px 24px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            animation: slideIn 0.4s ease-out, fadeOut 0.4s ease-in 3.5s forwards;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .rafflemania-toast-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }

        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; visibility: hidden; } }

        /* Quick links */
        .rafflemania-quick-links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-bottom: 24px;
        }
        .rafflemania-quick-link {
            background: white;
            border-radius: 10px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            text-decoration: none;
            color: #333;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }
        .rafflemania-quick-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            border-left-color: #FF6B00;
            color: #FF6B00;
        }
        .rafflemania-quick-link .dashicons {
            font-size: 20px;
            color: #FF6B00;
        }
        .rafflemania-quick-link span:last-child {
            font-weight: 600;
            font-size: 13px;
        }

        /* Settings grid */
        .rafflemania-settings {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 24px;
            margin-top: 24px;
        }
        .rafflemania-settings-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 24px;
        }
        .rafflemania-settings-card h2 {
            margin-top: 0;
            border-bottom: 2px solid #FF6B00;
            padding-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #333;
        }
        .rafflemania-form-row { margin-bottom: 16px; }
        .rafflemania-form-row label {
            display: block;
            font-weight: 600;
            margin-bottom: 6px;
            color: #444;
        }
        .rafflemania-form-row input[type="text"],
        .rafflemania-form-row input[type="number"],
        .rafflemania-form-row input[type="email"],
        .rafflemania-form-row input[type="password"] {
            width: 100%;
            padding: 10px 14px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
        }
        .rafflemania-form-row input:focus {
            border-color: #FF6B00;
            outline: none;
            box-shadow: 0 0 0 3px rgba(255,107,0,0.1);
        }
        .rafflemania-form-row small { color: #888; display: block; margin-top: 4px; }
        .rafflemania-info-box {
            background: #f0f8ff;
            border: 1px solid #b8daff;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }
        .rafflemania-info-box code {
            background: #e7f1ff;
            padding: 2px 8px;
            border-radius: 4px;
            word-break: break-all;
            font-size: 13px;
        }
        .button-primary {
            background: #FF6B00 !important;
            border-color: #FF6B00 !important;
            border-radius: 8px !important;
            padding: 8px 24px !important;
        }
        .button-primary:hover {
            background: #e55d00 !important;
            border-color: #e55d00 !important;
        }
    </style>

    <!-- Quick Links to new admin pages -->
    <div class="rafflemania-quick-links">
        <a href="<?php echo admin_url('admin.php?page=rafflemania-economy'); ?>" class="rafflemania-quick-link">
            <span class="dashicons dashicons-chart-area"></span>
            <span>Economia di Gioco</span>
        </a>
        <a href="<?php echo admin_url('admin.php?page=rafflemania-content'); ?>" class="rafflemania-quick-link">
            <span class="dashicons dashicons-admin-page"></span>
            <span>Contenuti App</span>
        </a>
        <a href="<?php echo admin_url('admin.php?page=rafflemania-notifications'); ?>" class="rafflemania-quick-link">
            <span class="dashicons dashicons-bell"></span>
            <span>Notifiche Push</span>
        </a>
        <a href="<?php echo admin_url('admin.php?page=rafflemania-rewards'); ?>" class="rafflemania-quick-link">
            <span class="dashicons dashicons-awards"></span>
            <span>Ricompense Globali</span>
        </a>
    </div>

    <form method="post">
        <?php wp_nonce_field('rafflemania_settings_action', 'rafflemania_settings_nonce'); ?>

        <div class="rafflemania-settings">

            <!-- Notifications -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-bell"></span> Notifiche Push (OneSignal)</h2>

                <div class="rafflemania-info-box" style="background: #e8f5e9; border-color: #4caf50;">
                    <strong>OneSignal</strong> - Registrati su <a href="https://onesignal.com" target="_blank">onesignal.com</a> per le push notification gratuite.
                </div>

                <div class="rafflemania-form-row">
                    <label>OneSignal App ID</label>
                    <input type="text" name="onesignal_app_id" value="<?php echo esc_attr(get_option('rafflemania_onesignal_app_id', '')); ?>">
                </div>

                <div class="rafflemania-form-row">
                    <label>OneSignal REST API Key</label>
                    <input type="password" name="onesignal_api_key" value="<?php echo esc_attr(get_option('rafflemania_onesignal_api_key', '')); ?>">
                </div>
            </div>

            <!-- Firebase for Chat -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-format-chat"></span> Firebase (Chat Supporto)</h2>

                <div class="rafflemania-info-box" style="background: #fff3e0; border-color: #ff9800;">
                    <strong>Firebase Firestore</strong> - Per la chat di supporto. <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a>
                </div>

                <div class="rafflemania-form-row">
                    <label>Firebase Project ID</label>
                    <input type="text" name="firebase_project_id" value="<?php echo esc_attr(get_option('rafflemania_firebase_project_id', '')); ?>" placeholder="es. rafflemania-12345">
                </div>

                <div class="rafflemania-form-row">
                    <label>Firebase Web API Key</label>
                    <input type="password" name="firebase_api_key" value="<?php echo esc_attr(get_option('rafflemania_firebase_api_key', '')); ?>">
                    <small>Opzionale per regole pubbliche</small>
                </div>
            </div>

            <!-- Payments: Stripe -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-money-alt"></span> Stripe (Carta di Credito)</h2>

                <div class="rafflemania-info-box" style="background: #f3e8ff; border-color: #7c3aed;">
                    <strong>Stripe</strong> - Pagamenti con carta di credito/debito. Configura le chiavi da <a href="https://dashboard.stripe.com/apikeys" target="_blank">Stripe Dashboard</a>.
                </div>

                <div class="rafflemania-form-row">
                    <label>Secret Key</label>
                    <input type="password" name="stripe_secret_key" value="<?php echo esc_attr(get_option('rafflemania_stripe_secret_key', '')); ?>" placeholder="sk_live_...">
                    <small>Chiave segreta (inizia con sk_live_ o sk_test_)</small>
                </div>

                <div class="rafflemania-form-row">
                    <label>Publishable Key</label>
                    <input type="text" name="stripe_publishable_key" value="<?php echo esc_attr(get_option('rafflemania_stripe_publishable_key', '')); ?>" placeholder="pk_live_...">
                    <small>Chiave pubblica (inizia con pk_live_ o pk_test_)</small>
                </div>

                <div class="rafflemania-form-row">
                    <label>Webhook Signing Secret</label>
                    <input type="password" name="stripe_webhook_secret" value="<?php echo esc_attr(get_option('rafflemania_stripe_webhook_secret', '')); ?>" placeholder="whsec_...">
                    <small>Da <a href="https://dashboard.stripe.com/webhooks" target="_blank">Stripe Webhooks</a> &rarr; Endpoint &rarr; Signing secret</small>
                </div>

                <div class="rafflemania-info-box">
                    <strong>Webhook URL:</strong><br>
                    <code><?php echo home_url('/wp-json/rafflemania/v1/payments/stripe-webhook'); ?></code>
                    <br><small>Eventi: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded</small>
                </div>
            </div>

            <!-- Payments: Apple IAP -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-smartphone"></span> Apple Pay (In-App Purchase)</h2>

                <div class="rafflemania-info-box" style="background: #f0f0f0; border-color: #999;">
                    <strong>Apple App Store</strong> - Per la verifica dei receipt IAP. Configura da <a href="https://appstoreconnect.apple.com" target="_blank">App Store Connect</a>.
                </div>

                <div class="rafflemania-form-row">
                    <label>App-Specific Shared Secret</label>
                    <input type="password" name="apple_shared_secret" value="<?php echo esc_attr(get_option('rafflemania_apple_shared_secret', '')); ?>" placeholder="Shared secret da App Store Connect">
                    <small>App Store Connect &rarr; App &rarr; In-App Purchases &rarr; App-Specific Shared Secret</small>
                </div>
            </div>

            <!-- Payments: Google IAP -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-google"></span> Google Pay (In-App Purchase)</h2>

                <div class="rafflemania-info-box" style="background: #e8f5e9; border-color: #4caf50;">
                    <strong>Google Play Console</strong> - Per la verifica dei receipt IAP. Configura da <a href="https://play.google.com/console" target="_blank">Google Play Console</a>.
                </div>

                <div class="rafflemania-form-row">
                    <label>Service Account JSON (Base64)</label>
                    <input type="password" name="google_service_account" value="<?php echo esc_attr(get_option('rafflemania_google_service_account', '')); ?>" placeholder="Contenuto JSON del service account codificato in Base64">
                    <small>Google Cloud Console &rarr; IAM &rarr; Service Accounts &rarr; Crea chiave JSON &rarr; codifica in Base64</small>
                </div>
            </div>

            <!-- Contact & Admin -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-email"></span> Contatto & Sicurezza</h2>

                <div class="rafflemania-form-row">
                    <label>Email Contatto</label>
                    <input type="email" name="contact_email" value="<?php echo esc_attr($contact_email); ?>">
                    <small>Email per notifiche admin e contatti utenti</small>
                </div>

                <div class="rafflemania-form-row">
                    <label>Admin API Key</label>
                    <input type="password" name="admin_api_key" value="<?php echo esc_attr($admin_api_key); ?>" placeholder="Lascia vuoto per mantenere attuale">
                    <small>Chiave per l'accesso API da app esterne (header X-Admin-Key)</small>
                </div>
            </div>

            <!-- API Info -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-rest-api"></span> Informazioni API</h2>

                <div class="rafflemania-info-box">
                    <strong>Base URL:</strong><br>
                    <code><?php echo home_url('/wp-json/rafflemania/v1/'); ?></code>
                </div>

                <div class="rafflemania-info-box">
                    <strong>JWT Secret:</strong><br>
                    <code><?php echo esc_html(substr($jwt_secret, 0, 20) . '...'); ?></code>
                    <br><small>Generato automaticamente</small>
                </div>

                <div class="rafflemania-info-box">
                    <strong>Nuovi Endpoint Admin v2.0:</strong>
                    <ul style="margin: 10px 0 0 20px; font-size: 13px;">
                        <li><code>GET /settings/game-config</code> - Config economia</li>
                        <li><code>GET /settings/levels</code> - Livelli</li>
                        <li><code>GET /settings/shop-packages</code> - Pacchetti shop</li>
                        <li><code>GET /settings/streak-config</code> - Config streak</li>
                        <li><code>GET /settings/app-content</code> - Contenuti app</li>
                        <li><code>POST /notifications/broadcast</code> - Push broadcast</li>
                        <li><code>POST /admin/bulk-reward</code> - Ricompense globali</li>
                        <li><code>GET /admin/user/{id}/full-profile</code> - Profilo completo</li>
                    </ul>
                </div>
            </div>

            <!-- Database Info -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-database"></span> Database</h2>

                <?php
                global $wpdb;
                $tables = [
                    'rafflemania_users' => 'Utenti',
                    'rafflemania_prizes' => 'Premi',
                    'rafflemania_tickets' => 'Biglietti',
                    'rafflemania_draws' => 'Estrazioni',
                    'rafflemania_winners' => 'Vincitori',
                    'rafflemania_transactions' => 'Transazioni',
                    'rafflemania_streaks' => 'Streak',
                    'rafflemania_referrals' => 'Referral',
                    'rafflemania_levels' => 'Livelli',
                    'rafflemania_shop_packages' => 'Pacchetti Shop',
                    'rafflemania_payments' => 'Pagamenti',
                    'rafflemania_notification_log' => 'Log Notifiche',
                    'rafflemania_admin_actions_log' => 'Log Azioni Admin',
                ];

                foreach ($tables as $table => $label):
                    $full_table = $wpdb->prefix . $table;
                    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$full_table}'");
                    $count = $table_exists ? $wpdb->get_var("SELECT COUNT(*) FROM {$full_table}") : '-';
                ?>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                    <span style="color: #555;"><?php echo $label; ?></span>
                    <strong style="color: <?php echo $table_exists ? '#333' : '#dc3545'; ?>;"><?php echo $table_exists ? number_format($count) . ' record' : 'Non presente'; ?></strong>
                </div>
                <?php endforeach; ?>

                <div style="margin-top: 12px; font-size: 12px; color: #999;">
                    DB Version: <?php echo get_option('rafflemania_admin_panel_db_version', 'N/A'); ?>
                </div>
            </div>

        </div>

        <p style="margin-top: 24px;">
            <button type="submit" class="button button-primary button-large">Salva Impostazioni</button>
        </p>
    </form>
</div>

<script>
setTimeout(function() {
    document.querySelectorAll('.rafflemania-toast').forEach(function(t) { t.style.display = 'none'; });
}, 4000);
</script>

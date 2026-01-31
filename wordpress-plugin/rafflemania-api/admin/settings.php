<?php
if (!defined('ABSPATH')) exit;

// Handle save
$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rafflemania_settings_nonce'])) {
    if (wp_verify_nonce($_POST['rafflemania_settings_nonce'], 'rafflemania_settings_action')) {

        // Credits settings
        update_option('rafflemania_credits_per_ticket', intval($_POST['credits_per_ticket']));

        // Referral bonus
        update_option('rafflemania_referral_bonus', intval($_POST['referral_bonus']));

        // XP rewards
        update_option('rafflemania_xp_watch_ad', intval($_POST['xp_watch_ad']));
        update_option('rafflemania_xp_daily_streak', intval($_POST['xp_daily_streak']));
        update_option('rafflemania_xp_credit_ticket', intval($_POST['xp_credit_ticket']));

        // Push notifications (OneSignal - Free)
        update_option('rafflemania_onesignal_app_id', sanitize_text_field($_POST['onesignal_app_id']));
        update_option('rafflemania_onesignal_api_key', sanitize_text_field($_POST['onesignal_api_key']));

        // Contact email
        update_option('rafflemania_contact_email', sanitize_email($_POST['contact_email']));

        $message = 'Impostazioni salvate con successo!';
    }
}

// Get current settings
$credits_per_ticket = get_option('rafflemania_credits_per_ticket', 5);
$referral_bonus = get_option('rafflemania_referral_bonus', 10);
$xp_watch_ad = get_option('rafflemania_xp_watch_ad', 10);
$xp_daily_streak = get_option('rafflemania_xp_daily_streak', 10);
$xp_credit_ticket = get_option('rafflemania_xp_credit_ticket', 5);
$contact_email = get_option('rafflemania_contact_email', get_option('admin_email'));
$jwt_secret = get_option('rafflemania_jwt_secret', '');
?>

<div class="wrap">
    <h1>
        <span class="dashicons dashicons-admin-settings" style="font-size: 30px; margin-right: 10px;"></span>
        Impostazioni RaffleMania
    </h1>

    <?php if ($message): ?>
    <div class="notice notice-success is-dismissible"><p><?php echo esc_html($message); ?></p></div>
    <?php endif; ?>

    <style>
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
        }
        .rafflemania-form-row {
            margin-bottom: 16px;
        }
        .rafflemania-form-row label {
            display: block;
            font-weight: 600;
            margin-bottom: 6px;
        }
        .rafflemania-form-row input[type="text"],
        .rafflemania-form-row input[type="number"],
        .rafflemania-form-row input[type="email"],
        .rafflemania-form-row input[type="password"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
        }
        .rafflemania-form-row small {
            color: #666;
            display: block;
            margin-top: 4px;
        }
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
        }
        .button-primary {
            background: #FF6B00 !important;
            border-color: #FF6B00 !important;
        }
        .button-primary:hover {
            background: #e55d00 !important;
            border-color: #e55d00 !important;
        }
    </style>

    <form method="post">
        <?php wp_nonce_field('rafflemania_settings_action', 'rafflemania_settings_nonce'); ?>

        <div class="rafflemania-settings">

            <!-- Credits Settings -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-money-alt"></span> Crediti</h2>

                <div class="rafflemania-form-row">
                    <label>Crediti per Biglietto</label>
                    <input type="number" name="credits_per_ticket" min="1" value="<?php echo esc_attr($credits_per_ticket); ?>">
                    <small>Quanti crediti servono per ottenere un biglietto</small>
                </div>

                <div class="rafflemania-form-row">
                    <label>Bonus Referral</label>
                    <input type="number" name="referral_bonus" min="0" value="<?php echo esc_attr($referral_bonus); ?>">
                    <small>Crediti bonus per chi invita e chi viene invitato</small>
                </div>
            </div>

            <!-- XP Settings -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-star-filled"></span> Esperienza (XP)</h2>

                <div class="rafflemania-form-row">
                    <label>XP per Ads Guardata</label>
                    <input type="number" name="xp_watch_ad" min="0" value="<?php echo esc_attr($xp_watch_ad); ?>">
                </div>

                <div class="rafflemania-form-row">
                    <label>XP Base Streak Giornaliera</label>
                    <input type="number" name="xp_daily_streak" min="0" value="<?php echo esc_attr($xp_daily_streak); ?>">
                    <small>XP base, aumenta con i giorni consecutivi</small>
                </div>

                <div class="rafflemania-form-row">
                    <label>XP per Biglietto con Crediti</label>
                    <input type="number" name="xp_credit_ticket" min="0" value="<?php echo esc_attr($xp_credit_ticket); ?>">
                    <small>XP guadagnati quando si acquista un biglietto con crediti</small>
                </div>
            </div>

            <!-- Notifications -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-bell"></span> Notifiche Push (OneSignal - Gratuito)</h2>

                <div class="rafflemania-info-box" style="background: #e8f5e9; border-color: #4caf50;">
                    <strong>💡 OneSignal è gratuito!</strong><br>
                    Registrati su <a href="https://onesignal.com" target="_blank">onesignal.com</a> per ottenere App ID e API Key gratuiti.
                </div>

                <div class="rafflemania-form-row">
                    <label>OneSignal App ID</label>
                    <input type="text" name="onesignal_app_id" value="<?php echo esc_attr(get_option('rafflemania_onesignal_app_id', '')); ?>">
                    <small>Il tuo OneSignal App ID (gratuito)</small>
                </div>

                <div class="rafflemania-form-row">
                    <label>OneSignal REST API Key</label>
                    <input type="password" name="onesignal_api_key" value="<?php echo esc_attr(get_option('rafflemania_onesignal_api_key', '')); ?>">
                    <small>La tua REST API Key di OneSignal</small>
                </div>
            </div>

            <!-- Contact -->
            <div class="rafflemania-settings-card">
                <h2><span class="dashicons dashicons-email"></span> Contatto</h2>

                <div class="rafflemania-form-row">
                    <label>Email Contatto</label>
                    <input type="email" name="contact_email" value="<?php echo esc_attr($contact_email); ?>">
                    <small>Email per notifiche admin e contatti utenti</small>
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
                    <br><small>Generato automaticamente, non modificare</small>
                </div>

                <div class="rafflemania-info-box">
                    <strong>Endpoints Principali:</strong>
                    <ul style="margin: 10px 0 0 20px;">
                        <li><code>POST /auth/register</code></li>
                        <li><code>POST /auth/login</code></li>
                        <li><code>GET /prizes</code></li>
                        <li><code>POST /tickets</code></li>
                        <li><code>GET /users/me</code></li>
                        <li><code>GET /winners</code></li>
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
                    'rafflemania_referrals' => 'Referral'
                ];

                foreach ($tables as $table => $label):
                    $full_table = $wpdb->prefix . $table;
                    $count = $wpdb->get_var("SELECT COUNT(*) FROM {$full_table}");
                ?>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span><?php echo $label; ?></span>
                    <strong><?php echo number_format($count); ?> record</strong>
                </div>
                <?php endforeach; ?>
            </div>

        </div>

        <p style="margin-top: 24px;">
            <button type="submit" class="button button-primary button-large">Salva Impostazioni</button>
        </p>
    </form>
</div>

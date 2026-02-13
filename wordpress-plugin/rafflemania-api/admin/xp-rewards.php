<?php
if (!defined('ABSPATH')) exit;

// -----------------------------------------------------------------------
// Handle form submission - Sync BOTH settings systems
// -----------------------------------------------------------------------
$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rafflemania_xp_nonce'])) {
    if (wp_verify_nonce($_POST['rafflemania_xp_nonce'], 'rafflemania_xp_save')) {

        // --- XP Rewards (individual options - used by backend controllers) ---
        $xp_watch_ad = max(0, intval($_POST['xp_watch_ad']));
        $xp_credit_ticket = max(0, intval($_POST['xp_credit_ticket']));
        $xp_daily_streak = max(0, intval($_POST['xp_daily_streak']));
        $xp_purchase_credits = max(0, intval($_POST['xp_purchase_credits']));
        $xp_referral = max(0, intval($_POST['xp_referral']));
        $xp_win_prize = max(0, intval($_POST['xp_win_prize']));

        update_option('rafflemania_xp_watch_ad', $xp_watch_ad);
        update_option('rafflemania_xp_credit_ticket', $xp_credit_ticket);
        update_option('rafflemania_xp_daily_streak', $xp_daily_streak);
        update_option('rafflemania_xp_purchase_credits', $xp_purchase_credits);
        update_option('rafflemania_xp_referral', $xp_referral);
        update_option('rafflemania_xp_win_prize', $xp_win_prize);

        // --- Sync to JSON option (used by /settings/game-config endpoint) ---
        $existing_xp_json = json_decode(get_option('rafflemania_xp_rewards', '{}'), true) ?: [];
        $xp_json = array_merge($existing_xp_json, [
            'watch_ad'         => $xp_watch_ad,
            'purchase_ticket'  => $xp_credit_ticket,
            'skip_ad'          => $xp_watch_ad * 2,
            'purchase_credits' => $xp_purchase_credits,
            'win_prize'        => $xp_win_prize,
            'referral'         => $xp_referral,
        ]);
        update_option('rafflemania_xp_rewards', wp_json_encode($xp_json));

        // --- Referral Config ---
        $ref_days = max(1, intval($_POST['ref_days_required']));
        $ref_referrer_credits = max(0, intval($_POST['ref_referrer_credits']));
        $ref_referred_credits = max(0, intval($_POST['ref_referred_credits']));

        $referral_config = [
            'days_required'    => $ref_days,
            'referrer_credits' => $ref_referrer_credits,
            'referred_credits' => $ref_referred_credits,
        ];
        update_option('rafflemania_referral_config', wp_json_encode($referral_config));
        update_option('rafflemania_referral_bonus', $ref_referrer_credits);

        // --- Credits Config ---
        $credits_per_ticket = max(1, intval($_POST['credits_per_ticket']));
        update_option('rafflemania_credits_per_ticket', $credits_per_ticket);

        // --- Daily Limits ---
        $max_tickets = max(1, intval($_POST['max_tickets_per_day']));
        $max_ads = max(1, intval($_POST['max_ads_per_day']));
        $ad_cooldown = max(0, intval($_POST['ad_cooldown_minutes']));

        $daily_limits = [
            'max_tickets'      => $max_tickets,
            'max_ads'          => $max_ads,
            'cooldown_minutes' => $ad_cooldown,
        ];
        update_option('rafflemania_daily_limits', wp_json_encode($daily_limits));

        // Clear game-config cache
        wp_cache_delete('rafflemania_game_config_cache');

        $message = 'Impostazioni salvate con successo!';
    }
}

// -----------------------------------------------------------------------
// Load current values
// -----------------------------------------------------------------------

// XP Rewards (individual options)
$xp_watch_ad = (int) get_option('rafflemania_xp_watch_ad', 10);
$xp_credit_ticket = (int) get_option('rafflemania_xp_credit_ticket', 5);
$xp_daily_streak = (int) get_option('rafflemania_xp_daily_streak', 10);
$xp_purchase_credits = (int) get_option('rafflemania_xp_purchase_credits', 25);
$xp_referral = (int) get_option('rafflemania_xp_referral', 50);
$xp_win_prize = (int) get_option('rafflemania_xp_win_prize', 250);

// Referral Config (JSON)
$ref_raw = json_decode(get_option('rafflemania_referral_config', '{}'), true) ?: [];
$ref_days_required = (int) ($ref_raw['days_required'] ?? 7);
$ref_referrer_credits = (int) ($ref_raw['referrer_credits'] ?? 15);
$ref_referred_credits = (int) ($ref_raw['referred_credits'] ?? 15);

// Credits Config
$credits_per_ticket = (int) get_option('rafflemania_credits_per_ticket', 5);

// Daily Limits (JSON)
$limits_raw = json_decode(get_option('rafflemania_daily_limits', '{}'), true) ?: [];
$max_tickets_per_day = (int) ($limits_raw['max_tickets'] ?? $limits_raw['max_tickets_per_day'] ?? 60);
$max_ads_per_day = (int) ($limits_raw['max_ads'] ?? $limits_raw['max_ads_per_day'] ?? 72);
$ad_cooldown_minutes = (int) ($limits_raw['cooldown_minutes'] ?? $limits_raw['ad_cooldown_minutes'] ?? 20);
?>

<div class="wrap rafflemania-xp-wrap">
    <h1>
        <span class="dashicons dashicons-star-filled" style="font-size: 30px; margin-right: 10px; color: #FF6B00;"></span>
        XP, Ricompense e Limiti
    </h1>

    <?php if ($message): ?>
    <div class="rafflemania-toast rafflemania-toast-success" id="toast-msg">
        <span class="dashicons dashicons-yes-alt"></span> <?php echo esc_html($message); ?>
    </div>
    <?php endif; ?>

    <style>
        .rafflemania-xp-wrap {
            max-width: 100%;
        }
        .rafflemania-toast {
            padding: 12px 20px;
            border-radius: 10px;
            margin: 16px 0;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            font-size: 14px;
        }
        .rafflemania-toast-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .xp-section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .xp-section h2 {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 6px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .xp-section h2 .dashicons {
            font-size: 22px;
            width: 22px;
            height: 22px;
            color: #FF6B00;
        }
        .xp-section p.description {
            color: #888;
            font-size: 13px;
            margin: 0 0 20px 0;
        }
        .xp-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 16px;
        }
        .xp-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .xp-field label {
            font-weight: 600;
            font-size: 14px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .xp-field label .dashicons {
            font-size: 16px;
            width: 16px;
            height: 16px;
            color: #FF6B00;
        }
        .xp-field input[type="number"] {
            padding: 10px 14px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            width: 140px;
            transition: border-color 0.2s;
        }
        .xp-field input[type="number"]:focus {
            border-color: #FF6B00;
            outline: none;
            box-shadow: 0 0 0 3px rgba(255,107,0,0.15);
        }
        .xp-field .hint {
            font-size: 12px;
            color: #999;
        }
        .xp-summary {
            background: #FFF8F0;
            border: 2px solid #FF6B00;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .xp-summary h3 {
            margin: 0 0 12px 0;
            font-size: 16px;
            color: #FF6B00;
        }
        .xp-summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;
        }
        .xp-summary-item {
            background: white;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            border: 1px solid #FFE0C0;
        }
        .xp-summary-item .value {
            font-size: 24px;
            font-weight: 800;
            color: #FF6B00;
        }
        .xp-summary-item .label {
            font-size: 11px;
            color: #888;
            margin-top: 4px;
        }
        .xp-summary-item.blue { border-color: #C0D8FF; }
        .xp-summary-item.blue .value { color: #2563EB; }
        .xp-summary-item.green { border-color: #C0F0D0; }
        .xp-summary-item.green .value { color: #16A34A; }
        .xp-summary-item.purple { border-color: #E0C0FF; }
        .xp-summary-item.purple .value { color: #7C3AED; }
        .btn-save {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 32px;
            background: #FF6B00;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-save:hover {
            background: #e55d00;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255,107,0,0.3);
        }
        .section-divider {
            border: none;
            border-top: 2px dashed #e0e0e0;
            margin: 8px 0 20px 0;
        }
    </style>

    <!-- Summary -->
    <div class="xp-summary">
        <h3><span class="dashicons dashicons-chart-bar" style="vertical-align: middle; margin-right: 4px;"></span> Riepilogo Configurazione Attuale</h3>
        <div class="xp-summary-grid">
            <div class="xp-summary-item">
                <div class="value"><?php echo $xp_watch_ad; ?></div>
                <div class="label">XP Annuncio</div>
            </div>
            <div class="xp-summary-item">
                <div class="value"><?php echo $xp_credit_ticket; ?></div>
                <div class="label">XP Biglietto Crediti</div>
            </div>
            <div class="xp-summary-item">
                <div class="value"><?php echo $xp_daily_streak; ?></div>
                <div class="label">XP Streak Base</div>
            </div>
            <div class="xp-summary-item">
                <div class="value"><?php echo $xp_purchase_credits; ?></div>
                <div class="label">XP Acquisto Crediti</div>
            </div>
            <div class="xp-summary-item">
                <div class="value"><?php echo $xp_referral; ?></div>
                <div class="label">XP Referral</div>
            </div>
            <div class="xp-summary-item">
                <div class="value"><?php echo $xp_win_prize; ?></div>
                <div class="label">XP Vincita</div>
            </div>
            <div class="xp-summary-item blue">
                <div class="value"><?php echo $credits_per_ticket; ?></div>
                <div class="label">Crediti / Biglietto</div>
            </div>
            <div class="xp-summary-item green">
                <div class="value"><?php echo $ref_referrer_credits; ?></div>
                <div class="label">Crediti Referrer</div>
            </div>
            <div class="xp-summary-item green">
                <div class="value"><?php echo $ref_referred_credits; ?></div>
                <div class="label">Crediti Referito</div>
            </div>
            <div class="xp-summary-item purple">
                <div class="value"><?php echo $max_tickets_per_day; ?></div>
                <div class="label">Max Ticket/Giorno</div>
            </div>
            <div class="xp-summary-item purple">
                <div class="value"><?php echo $max_ads_per_day; ?></div>
                <div class="label">Max Annunci/Giorno</div>
            </div>
            <div class="xp-summary-item purple">
                <div class="value"><?php echo $ad_cooldown_minutes; ?>m</div>
                <div class="label">Cooldown Annunci</div>
            </div>
        </div>
    </div>

    <form method="post">
        <?php wp_nonce_field('rafflemania_xp_save', 'rafflemania_xp_nonce'); ?>

        <!-- ============================================================
             SEZIONE 1: RICOMPENSE XP
             ============================================================ -->
        <div class="xp-section">
            <h2><span class="dashicons dashicons-star-filled"></span> Ricompense XP</h2>
            <p class="description">Punti esperienza assegnati per ogni azione dell'utente nell'app.</p>
            <div class="xp-grid">
                <div class="xp-field">
                    <label><span class="dashicons dashicons-video-alt3"></span> Guarda Annuncio</label>
                    <input type="number" name="xp_watch_ad" value="<?php echo $xp_watch_ad; ?>" min="0" max="9999">
                    <span class="hint">XP per ogni annuncio guardato</span>
                </div>
                <div class="xp-field">
                    <label><span class="dashicons dashicons-money-alt"></span> Biglietto con Crediti</label>
                    <input type="number" name="xp_credit_ticket" value="<?php echo $xp_credit_ticket; ?>" min="0" max="9999">
                    <span class="hint">XP per biglietto acquistato con crediti</span>
                </div>
                <div class="xp-field">
                    <label><span class="dashicons dashicons-calendar-alt"></span> Streak Giornaliero</label>
                    <input type="number" name="xp_daily_streak" value="<?php echo $xp_daily_streak; ?>" min="0" max="9999">
                    <span class="hint">XP base per streak (base + giorno*2)</span>
                </div>
                <div class="xp-field">
                    <label><span class="dashicons dashicons-cart"></span> Acquisto Crediti</label>
                    <input type="number" name="xp_purchase_credits" value="<?php echo $xp_purchase_credits; ?>" min="0" max="9999">
                    <span class="hint">XP per ogni acquisto in-app</span>
                </div>
                <div class="xp-field">
                    <label><span class="dashicons dashicons-share"></span> Referral</label>
                    <input type="number" name="xp_referral" value="<?php echo $xp_referral; ?>" min="0" max="9999">
                    <span class="hint">XP per ogni referral reclamato</span>
                </div>
                <div class="xp-field">
                    <label><span class="dashicons dashicons-trophy"></span> Vincita Premio</label>
                    <input type="number" name="xp_win_prize" value="<?php echo $xp_win_prize; ?>" min="0" max="9999">
                    <span class="hint">XP per ogni premio vinto</span>
                </div>
            </div>
        </div>

        <!-- ============================================================
             SEZIONE 2: CREDITI
             ============================================================ -->
        <div class="xp-section">
            <h2><span class="dashicons dashicons-money"></span> Crediti</h2>
            <p class="description">Configurazione del costo in crediti per le azioni dell'utente.</p>
            <div class="xp-grid">
                <div class="xp-field">
                    <label><span class="dashicons dashicons-tickets-alt"></span> Crediti per Biglietto</label>
                    <input type="number" name="credits_per_ticket" value="<?php echo $credits_per_ticket; ?>" min="1" max="9999">
                    <span class="hint">Crediti necessari per acquistare un biglietto</span>
                </div>
            </div>
        </div>

        <!-- ============================================================
             SEZIONE 3: REFERRAL
             ============================================================ -->
        <div class="xp-section">
            <h2><span class="dashicons dashicons-groups"></span> Referral</h2>
            <p class="description">Configurazione del sistema referral: giorni richiesti e ricompense in crediti.</p>
            <div class="xp-grid">
                <div class="xp-field">
                    <label><span class="dashicons dashicons-calendar"></span> Giorni Richiesti</label>
                    <input type="number" name="ref_days_required" value="<?php echo $ref_days_required; ?>" min="1" max="365">
                    <span class="hint">Giorni di attivita per completare il referral</span>
                </div>
                <div class="xp-field">
                    <label><span class="dashicons dashicons-admin-users"></span> Crediti Referrer</label>
                    <input type="number" name="ref_referrer_credits" value="<?php echo $ref_referrer_credits; ?>" min="0" max="9999">
                    <span class="hint">Crediti dati a chi invita</span>
                </div>
                <div class="xp-field">
                    <label><span class="dashicons dashicons-welcome-add-page"></span> Crediti Invitato</label>
                    <input type="number" name="ref_referred_credits" value="<?php echo $ref_referred_credits; ?>" min="0" max="9999">
                    <span class="hint">Crediti dati a chi viene invitato</span>
                </div>
            </div>
        </div>

        <!-- ============================================================
             SEZIONE 4: LIMITI GIORNALIERI
             ============================================================ -->
        <div class="xp-section">
            <h2><span class="dashicons dashicons-lock"></span> Limiti Giornalieri</h2>
            <p class="description">Limiti massimi giornalieri per biglietti, annunci e cooldown tra le azioni.</p>
            <div class="xp-grid">
                <div class="xp-field">
                    <label><span class="dashicons dashicons-tickets-alt"></span> Max Biglietti / Giorno</label>
                    <input type="number" name="max_tickets_per_day" value="<?php echo $max_tickets_per_day; ?>" min="1" max="9999">
                    <span class="hint">Numero massimo di biglietti riscattabili al giorno</span>
                </div>
                <div class="xp-field">
                    <label><span class="dashicons dashicons-video-alt3"></span> Max Annunci / Giorno</label>
                    <input type="number" name="max_ads_per_day" value="<?php echo $max_ads_per_day; ?>" min="1" max="9999">
                    <span class="hint">Numero massimo di annunci visualizzabili al giorno</span>
                </div>
                <div class="xp-field">
                    <label><span class="dashicons dashicons-clock"></span> Cooldown Annunci (minuti)</label>
                    <input type="number" name="ad_cooldown_minutes" value="<?php echo $ad_cooldown_minutes; ?>" min="0" max="9999">
                    <span class="hint">Minuti di attesa tra un annuncio e l'altro</span>
                </div>
            </div>
        </div>

        <button type="submit" class="btn-save">
            <span class="dashicons dashicons-saved" style="font-size: 18px; width: 18px; height: 18px;"></span>
            Salva Tutte le Impostazioni
        </button>
    </form>
</div>

<script>
// Auto-dismiss toasts
setTimeout(function() {
    var toasts = document.querySelectorAll('.rafflemania-toast');
    toasts.forEach(function(t) { t.style.display = 'none'; });
}, 4000);
</script>

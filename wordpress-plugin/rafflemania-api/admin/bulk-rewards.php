<?php
if (!defined('ABSPATH')) exit;

global $wpdb;

$table_users      = $wpdb->prefix . 'rafflemania_users';
$table_levels     = $wpdb->prefix . 'rafflemania_levels';
$table_bulk_log   = $wpdb->prefix . 'rafflemania_bulk_rewards_log';
$table_admin_log  = $wpdb->prefix . 'rafflemania_admin_actions_log';

$italy_tz = new DateTimeZone('Europe/Rome');

// ── Handle POST ────────────────────────────────────────────────────────────
$notice        = '';
$notice_type   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rafflemania_bulk_reward_nonce'])) {

    if (!wp_verify_nonce($_POST['rafflemania_bulk_reward_nonce'], 'rafflemania_bulk_reward_action')) {
        $notice      = 'Errore di sicurezza: nonce non valido. Riprova.';
        $notice_type = 'error';
    } else {
        // Sanitize inputs
        $reason         = sanitize_text_field($_POST['reason'] ?? '');
        $credits_amount = max(0, intval($_POST['credits_amount'] ?? 0));
        $xp_amount      = max(0, intval($_POST['xp_amount'] ?? 0));
        $tickets_amount = max(0, intval($_POST['tickets_amount'] ?? 0));
        $target         = sanitize_text_field($_POST['target'] ?? 'all');
        $min_level      = max(0, intval($_POST['min_level'] ?? 0));
        $max_level      = max(0, intval($_POST['max_level'] ?? 10));
        $send_push      = isset($_POST['send_push']) ? 1 : 0;

        // Validation
        if (empty($reason)) {
            $notice      = 'Il motivo è obbligatorio.';
            $notice_type = 'error';
        } elseif ($credits_amount === 0 && $xp_amount === 0 && $tickets_amount === 0) {
            $notice      = 'Devi assegnare almeno un tipo di ricompensa (crediti, XP o biglietti).';
            $notice_type = 'error';
        } else {
            // Build WHERE clause
            $where_clause = "is_active = 1";
            $target_filter = null;

            if ($target === 'level_range') {
                $where_clause .= $wpdb->prepare(" AND level >= %d AND level <= %d", $min_level, $max_level);
                $target_filter = wp_json_encode(['min_level' => $min_level, 'max_level' => $max_level]);
            }

            // Count recipients
            $recipients_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_users} WHERE {$where_clause}");

            if ($recipients_count === 0) {
                $notice      = 'Nessun utente corrisponde ai criteri selezionati.';
                $notice_type = 'error';
            } else {
                // ── Update credits and XP ──────────────────────────────────────
                $set_parts = [];
                $set_values = [];

                if ($credits_amount > 0) {
                    $set_parts[] = "credits = credits + %d";
                    $set_values[] = $credits_amount;
                }
                if ($xp_amount > 0) {
                    $set_parts[] = "xp = xp + %d";
                    $set_values[] = $xp_amount;
                }

                if (!empty($set_parts)) {
                    $set_sql = implode(', ', $set_parts);
                    $update_sql = "UPDATE {$table_users} SET {$set_sql} WHERE {$where_clause}";
                    $wpdb->query($wpdb->prepare($update_sql, ...$set_values));
                }

                // ── Recalculate levels if XP was added ─────────────────────────
                if ($xp_amount > 0) {
                    $levels = $wpdb->get_results(
                        "SELECT level, min_xp FROM {$table_levels} WHERE is_active = 1 ORDER BY min_xp DESC"
                    );
                    foreach ($levels as $l) {
                        $wpdb->query($wpdb->prepare(
                            "UPDATE {$table_users} SET level = %d WHERE xp >= %d AND level < %d",
                            $l->level, $l->min_xp, $l->level
                        ));
                    }
                }

                // ── Log to bulk_rewards_log ─────────────────────────────────────
                $wpdb->insert($table_bulk_log, [
                    'reason'           => $reason,
                    'credits_amount'   => $credits_amount,
                    'xp_amount'        => $xp_amount,
                    'tickets_amount'   => $tickets_amount,
                    'target'           => $target === 'level_range' ? 'level_range' : 'all',
                    'target_filter'    => $target_filter,
                    'recipients_count' => $recipients_count,
                    'created_by'       => get_current_user_id(),
                    'created_at'       => (new DateTime('now', $italy_tz))->format('Y-m-d H:i:s'),
                ]);

                // ── Log to admin_actions_log ────────────────────────────────────
                $wpdb->insert($table_admin_log, [
                    'admin_user_id' => get_current_user_id(),
                    'action_type'   => 'bulk_reward',
                    'details'       => wp_json_encode([
                        'reason'           => $reason,
                        'credits_amount'   => $credits_amount,
                        'xp_amount'        => $xp_amount,
                        'tickets_amount'   => $tickets_amount,
                        'target'           => $target,
                        'target_filter'    => $target_filter,
                        'recipients_count' => $recipients_count,
                        'send_push'        => $send_push,
                    ]),
                ]);

                // ── Push notification ───────────────────────────────────────────
                if ($send_push) {
                    $parts = [];
                    if ($credits_amount > 0) $parts[] = "{$credits_amount} crediti";
                    if ($xp_amount > 0)      $parts[] = "{$xp_amount} XP";
                    if ($tickets_amount > 0)  $parts[] = "{$tickets_amount} biglietti";
                    $push_msg = $reason . ' — ' . implode(', ', $parts);

                    \RaffleMania\NotificationHelper::send_to_all('Ricompensa ricevuta!', $push_msg);
                }

                $notice      = "Ricompensa inviata con successo a <strong>{$recipients_count}</strong> utenti.";
                $notice_type = 'success';
            }
        }
    }
}

// ── History pagination ─────────────────────────────────────────────────────
$hist_page     = max(1, intval($_GET['hist_paged'] ?? 1));
$hist_per_page = 15;
$hist_offset   = ($hist_page - 1) * $hist_per_page;

$hist_total       = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_bulk_log}");
$hist_total_pages = max(1, ceil($hist_total / $hist_per_page));

$history = $wpdb->get_results($wpdb->prepare(
    "SELECT * FROM {$table_bulk_log} ORDER BY created_at DESC LIMIT %d OFFSET %d",
    $hist_per_page, $hist_offset
));

// ── Recipient preview count (AJAX-like via GET param) ──────────────────────
$preview_count = null;
if (isset($_GET['preview_target'])) {
    $preview_target = sanitize_text_field($_GET['preview_target']);
    $preview_where  = "is_active = 1";
    if ($preview_target === 'level_range') {
        $p_min = max(0, intval($_GET['preview_min'] ?? 0));
        $p_max = max(0, intval($_GET['preview_max'] ?? 10));
        $preview_where .= $wpdb->prepare(" AND level >= %d AND level <= %d", $p_min, $p_max);
    }
    $preview_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_users} WHERE {$preview_where}");
}

// Active users total for the preview
$total_active_users = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_users} WHERE is_active = 1");
?>

<div class="wrap rafflemania-rewards-wrap">
    <h1>
        <span class="dashicons dashicons-megaphone" style="font-size: 30px; margin-right: 10px; color: #FF6B00;"></span>
        Ricompense Globali
    </h1>

    <style>
        /* ── Base ─────────────────────────────────────────────────── */
        .rafflemania-rewards-wrap {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
        }
        .rafflemania-rewards-wrap h1 {
            display: flex;
            align-items: center;
            margin-bottom: 24px;
        }

        /* ── Cards ────────────────────────────────────────────────── */
        .rm-card {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 28px 32px;
            margin-bottom: 28px;
            transition: box-shadow 0.25s ease;
        }
        .rm-card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .rm-card-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 20px 0;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #1d2327;
        }
        .rm-card-title .dashicons {
            color: #FF6B00;
            font-size: 24px;
            width: 24px;
            height: 24px;
        }

        /* ── Form ─────────────────────────────────────────────────── */
        .rm-form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .rm-form-group {
            display: flex;
            flex-direction: column;
        }
        .rm-form-group.full-width {
            grid-column: 1 / -1;
        }
        .rm-form-group label {
            font-weight: 600;
            margin-bottom: 6px;
            color: #1d2327;
            font-size: 14px;
        }
        .rm-form-group label .required {
            color: #d63638;
            margin-left: 2px;
        }
        .rm-form-group input[type="text"],
        .rm-form-group input[type="number"],
        .rm-form-group select {
            padding: 10px 14px;
            border: 1.5px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
            background: #fff;
            color: #1d2327;
        }
        .rm-form-group input:focus,
        .rm-form-group select:focus {
            outline: none;
            border-color: #FF6B00;
            box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.15);
        }
        .rm-form-hint {
            font-size: 12px;
            color: #888;
            margin-top: 4px;
        }

        /* ── Level range row ──────────────────────────────────────── */
        .rm-level-range {
            display: none;
            grid-column: 1 / -1;
            gap: 16px;
            align-items: end;
        }
        .rm-level-range.visible {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
        }

        /* ── Preview box ──────────────────────────────────────────── */
        .rm-preview-box {
            grid-column: 1 / -1;
            background: #FFF8F0;
            border: 1.5px solid #FFD9B3;
            border-radius: 10px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.3s ease;
        }
        .rm-preview-box .dashicons {
            color: #FF6B00;
            font-size: 22px;
            width: 22px;
            height: 22px;
        }
        .rm-preview-count {
            font-size: 26px;
            font-weight: 800;
            color: #FF6B00;
        }
        .rm-preview-label {
            font-size: 14px;
            color: #666;
        }

        /* ── Checkbox row ─────────────────────────────────────────── */
        .rm-checkbox-row {
            grid-column: 1 / -1;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: #f9f9f9;
            border-radius: 8px;
        }
        .rm-checkbox-row input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: #FF6B00;
            cursor: pointer;
        }
        .rm-checkbox-row label {
            font-weight: 500;
            cursor: pointer;
            color: #1d2327;
        }

        /* ── Submit button ────────────────────────────────────────── */
        .rm-submit-row {
            grid-column: 1 / -1;
            display: flex;
            justify-content: flex-end;
            padding-top: 8px;
        }
        .rm-btn-primary {
            background: #FF6B00;
            color: #fff;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .rm-btn-primary:hover {
            background: #e55d00;
            box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);
        }
        .rm-btn-primary:active {
            transform: scale(0.97);
        }

        /* ── Toast notification ───────────────────────────────────── */
        .rm-toast {
            position: fixed;
            top: 40px;
            right: 24px;
            z-index: 999999;
            min-width: 340px;
            max-width: 500px;
            padding: 16px 24px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 6px 24px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
        }
        .rm-toast.visible {
            transform: translateX(0);
            opacity: 1;
        }
        .rm-toast-success {
            background: #fff;
            border-left: 4px solid #00a854;
            color: #1d2327;
        }
        .rm-toast-error {
            background: #fff;
            border-left: 4px solid #d63638;
            color: #1d2327;
        }
        .rm-toast .dashicons {
            font-size: 22px;
            width: 22px;
            height: 22px;
        }
        .rm-toast-success .dashicons { color: #00a854; }
        .rm-toast-error .dashicons { color: #d63638; }
        .rm-toast-close {
            margin-left: auto;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 18px;
            color: #999;
            padding: 0 0 0 12px;
            transition: color 0.2s;
        }
        .rm-toast-close:hover { color: #333; }

        /* ── History table ────────────────────────────────────────── */
        .rm-table-container {
            overflow-x: auto;
        }
        .rm-table {
            width: 100%;
            border-collapse: collapse;
        }
        .rm-table th,
        .rm-table td {
            padding: 13px 16px;
            text-align: left;
            border-bottom: 1px solid #eee;
            font-size: 13.5px;
            white-space: nowrap;
        }
        .rm-table th {
            background: #FAFAFA;
            font-weight: 600;
            color: #555;
            text-transform: uppercase;
            font-size: 11.5px;
            letter-spacing: 0.5px;
        }
        .rm-table tbody tr {
            transition: background 0.15s ease;
        }
        .rm-table tbody tr:hover {
            background: #FFF8F0;
        }
        .rm-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .rm-badge-orange { background: #FFF0E0; color: #FF6B00; }
        .rm-badge-blue   { background: #E8F0FE; color: #1967D2; }
        .rm-badge-green  { background: #E6F4EA; color: #137333; }
        .rm-badge-purple { background: #F3E8FD; color: #7B2FF0; }

        /* ── Pagination ───────────────────────────────────────────── */
        .rm-pagination {
            padding: 16px;
            text-align: center;
        }
        .rm-pagination .page-numbers {
            display: inline-block;
            padding: 6px 12px;
            margin: 0 3px;
            border-radius: 6px;
            text-decoration: none;
            color: #555;
            font-weight: 500;
            font-size: 13px;
            transition: all 0.2s ease;
        }
        .rm-pagination .page-numbers.current {
            background: #FF6B00;
            color: #fff;
        }
        .rm-pagination .page-numbers:hover:not(.current) {
            background: #FFF0E0;
            color: #FF6B00;
        }

        /* ── Empty state ──────────────────────────────────────────── */
        .rm-empty-state {
            text-align: center;
            padding: 48px 24px;
            color: #999;
        }
        .rm-empty-state .dashicons {
            font-size: 48px;
            width: 48px;
            height: 48px;
            color: #ddd;
            margin-bottom: 12px;
        }

        /* ── Responsive ───────────────────────────────────────────── */
        @media (max-width: 782px) {
            .rm-form-grid {
                grid-template-columns: 1fr;
            }
            .rm-level-range.visible {
                grid-template-columns: 1fr;
            }
        }
    </style>

    <!-- ═══ TOAST NOTIFICATION ═══════════════════════════════════════════ -->
    <?php if ($notice): ?>
    <div id="rm-toast" class="rm-toast rm-toast-<?php echo $notice_type === 'success' ? 'success' : 'error'; ?>">
        <span class="dashicons dashicons-<?php echo $notice_type === 'success' ? 'yes-alt' : 'warning'; ?>"></span>
        <span><?php echo wp_kses($notice, ['strong' => []]); ?></span>
        <button class="rm-toast-close" onclick="this.parentElement.classList.remove('visible')">&times;</button>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var toast = document.getElementById('rm-toast');
            if (toast) {
                setTimeout(function() { toast.classList.add('visible'); }, 100);
                setTimeout(function() { toast.classList.remove('visible'); }, 6000);
            }
        });
    </script>
    <?php endif; ?>

    <!-- ═══ CARD 1: INVIA RICOMPENSA ═════════════════════════════════════ -->
    <div class="rm-card">
        <h2 class="rm-card-title">
            <span class="dashicons dashicons-gifts"></span>
            Invia Ricompensa
        </h2>

        <form method="post" id="rm-bulk-reward-form">
            <?php wp_nonce_field('rafflemania_bulk_reward_action', 'rafflemania_bulk_reward_nonce'); ?>

            <div class="rm-form-grid">

                <!-- Motivo -->
                <div class="rm-form-group full-width">
                    <label for="reason">Motivo <span class="required">*</span></label>
                    <input type="text" id="reason" name="reason" required
                           placeholder="es. Bonus settimanale, Compensazione manutenzione..."
                           value="<?php echo esc_attr($_POST['reason'] ?? ''); ?>">
                </div>

                <!-- Crediti -->
                <div class="rm-form-group">
                    <label for="credits_amount">Crediti da assegnare</label>
                    <input type="number" id="credits_amount" name="credits_amount" min="0" value="<?php echo esc_attr($_POST['credits_amount'] ?? '0'); ?>" placeholder="0">
                    <span class="rm-form-hint">Verranno aggiunti al saldo attuale di ogni utente</span>
                </div>

                <!-- XP -->
                <div class="rm-form-group">
                    <label for="xp_amount">XP da assegnare</label>
                    <input type="number" id="xp_amount" name="xp_amount" min="0" value="<?php echo esc_attr($_POST['xp_amount'] ?? '0'); ?>" placeholder="0">
                    <span class="rm-form-hint">I livelli verranno ricalcolati automaticamente</span>
                </div>

                <!-- Biglietti -->
                <div class="rm-form-group">
                    <label for="tickets_amount">Biglietti da assegnare</label>
                    <input type="number" id="tickets_amount" name="tickets_amount" min="0" value="<?php echo esc_attr($_POST['tickets_amount'] ?? '0'); ?>" placeholder="0">
                    <span class="rm-form-hint">Aggiunti come crediti bonus (valore in crediti equivalenti)</span>
                </div>

                <!-- Destinatari -->
                <div class="rm-form-group">
                    <label for="target">Destinatari</label>
                    <select id="target" name="target">
                        <option value="all" <?php selected(($_POST['target'] ?? 'all'), 'all'); ?>>Tutti gli utenti attivi</option>
                        <option value="level_range" <?php selected(($_POST['target'] ?? ''), 'level_range'); ?>>Per range di livello</option>
                    </select>
                </div>

                <!-- Level range (conditionally visible) -->
                <div class="rm-level-range" id="rm-level-range-row">
                    <div class="rm-form-group">
                        <label for="min_level">Livello minimo</label>
                        <input type="number" id="min_level" name="min_level" min="0" max="10" value="<?php echo esc_attr($_POST['min_level'] ?? '0'); ?>">
                    </div>
                    <div class="rm-form-group">
                        <label for="max_level">Livello massimo</label>
                        <input type="number" id="max_level" name="max_level" min="0" max="10" value="<?php echo esc_attr($_POST['max_level'] ?? '10'); ?>">
                    </div>
                    <div class="rm-form-group">
                        <button type="button" class="rm-btn-primary" style="padding: 10px 20px; font-size: 13px;" onclick="rmUpdatePreview()">
                            <span class="dashicons dashicons-visibility" style="font-size: 16px; width: 16px; height: 16px;"></span>
                            Aggiorna anteprima
                        </button>
                    </div>
                </div>

                <!-- Preview box -->
                <div class="rm-preview-box" id="rm-preview-box">
                    <span class="dashicons dashicons-groups"></span>
                    <div>
                        <div class="rm-preview-count" id="rm-preview-count"><?php echo number_format($preview_count !== null ? $preview_count : $total_active_users); ?></div>
                        <div class="rm-preview-label">destinatari stimati</div>
                    </div>
                </div>

                <!-- Push checkbox -->
                <div class="rm-checkbox-row">
                    <input type="checkbox" id="send_push" name="send_push" value="1" <?php checked(!empty($_POST['send_push'])); ?>>
                    <label for="send_push">Invia notifica push automatica a tutti i destinatari</label>
                </div>

                <!-- Submit -->
                <div class="rm-submit-row">
                    <button type="submit" class="rm-btn-primary" id="rm-submit-btn">
                        <span class="dashicons dashicons-yes-alt" style="font-size: 18px; width: 18px; height: 18px;"></span>
                        Invia Ricompensa
                    </button>
                </div>

            </div>
        </form>
    </div>

    <!-- ═══ CARD 2: STORICO RICOMPENSE ═══════════════════════════════════ -->
    <div class="rm-card">
        <h2 class="rm-card-title">
            <span class="dashicons dashicons-backup"></span>
            Storico Ricompense
        </h2>

        <?php if (empty($history)): ?>
            <div class="rm-empty-state">
                <span class="dashicons dashicons-archive"></span>
                <p>Nessuna ricompensa inviata finora.</p>
            </div>
        <?php else: ?>
            <div class="rm-table-container">
                <table class="rm-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Motivo</th>
                            <th>Crediti</th>
                            <th>XP</th>
                            <th>Biglietti</th>
                            <th>Destinatari</th>
                            <th>N. Utenti</th>
                            <th>Autore</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($history as $row): ?>
                        <tr>
                            <td>
                                <?php
                                    $dt = new DateTime($row->created_at, new DateTimeZone('UTC'));
                                    $dt->setTimezone($italy_tz);
                                    echo esc_html($dt->format('d/m/Y H:i'));
                                ?>
                            </td>
                            <td><strong><?php echo esc_html($row->reason); ?></strong></td>
                            <td>
                                <?php if ($row->credits_amount > 0): ?>
                                    <span class="rm-badge rm-badge-orange">+<?php echo number_format($row->credits_amount); ?></span>
                                <?php else: ?>
                                    <span style="color: #ccc;">—</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ($row->xp_amount > 0): ?>
                                    <span class="rm-badge rm-badge-blue">+<?php echo number_format($row->xp_amount); ?></span>
                                <?php else: ?>
                                    <span style="color: #ccc;">—</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ($row->tickets_amount > 0): ?>
                                    <span class="rm-badge rm-badge-purple">+<?php echo number_format($row->tickets_amount); ?></span>
                                <?php else: ?>
                                    <span style="color: #ccc;">—</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php
                                if ($row->target === 'all') {
                                    echo '<span class="rm-badge rm-badge-green">Tutti</span>';
                                } else {
                                    $filter = json_decode($row->target_filter, true);
                                    if ($filter) {
                                        echo '<span class="rm-badge rm-badge-blue">Lv. ' . esc_html($filter['min_level']) . '–' . esc_html($filter['max_level']) . '</span>';
                                    } else {
                                        echo esc_html($row->target);
                                    }
                                }
                                ?>
                            </td>
                            <td><strong><?php echo number_format($row->recipients_count); ?></strong></td>
                            <td>
                                <?php
                                if ($row->created_by) {
                                    $wp_user = get_userdata($row->created_by);
                                    echo esc_html($wp_user ? $wp_user->display_name : 'ID #' . $row->created_by);
                                } else {
                                    echo '<span style="color: #ccc;">Sistema</span>';
                                }
                                ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <?php if ($hist_total_pages > 1): ?>
            <div class="rm-pagination">
                <?php
                echo paginate_links([
                    'base'      => add_query_arg('hist_paged', '%#%'),
                    'format'    => '',
                    'current'   => $hist_page,
                    'total'     => $hist_total_pages,
                    'prev_text' => '&laquo; Precedente',
                    'next_text' => 'Successivo &raquo;',
                ]);
                ?>
            </div>
            <?php endif; ?>

        <?php endif; ?>
    </div>

</div><!-- .wrap -->

<script>
(function() {
    var targetSelect = document.getElementById('target');
    var levelRangeRow = document.getElementById('rm-level-range-row');
    var previewCount = document.getElementById('rm-preview-count');
    var form = document.getElementById('rm-bulk-reward-form');

    // ── Show / hide level range inputs ───────────────────────────────────
    function toggleLevelRange() {
        if (targetSelect.value === 'level_range') {
            levelRangeRow.classList.add('visible');
        } else {
            levelRangeRow.classList.remove('visible');
        }
        rmUpdatePreview();
    }

    targetSelect.addEventListener('change', toggleLevelRange);

    // Initialize on page load
    if (targetSelect.value === 'level_range') {
        levelRangeRow.classList.add('visible');
    }

    // ── Update recipient preview via AJAX ────────────────────────────────
    window.rmUpdatePreview = function() {
        var target = targetSelect.value;
        var params = 'action=rafflemania_preview_recipients&target=' + encodeURIComponent(target);

        if (target === 'level_range') {
            var minL = document.getElementById('min_level').value || 0;
            var maxL = document.getElementById('max_level').value || 10;
            params += '&min_level=' + encodeURIComponent(minL) + '&max_level=' + encodeURIComponent(maxL);
        }

        previewCount.style.opacity = '0.4';

        var xhr = new XMLHttpRequest();
        xhr.open('POST', ajaxurl, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var resp = JSON.parse(xhr.responseText);
                    if (resp.success) {
                        previewCount.textContent = resp.data.count.toLocaleString('it-IT');
                    }
                } catch(e) {}
                previewCount.style.opacity = '1';
            }
        };
        xhr.send(params);
    };

    // ── Double confirmation on submit ────────────────────────────────────
    form.addEventListener('submit', function(e) {
        var reason   = document.getElementById('reason').value.trim();
        var credits  = parseInt(document.getElementById('credits_amount').value) || 0;
        var xp       = parseInt(document.getElementById('xp_amount').value) || 0;
        var tickets  = parseInt(document.getElementById('tickets_amount').value) || 0;
        var target   = targetSelect.value === 'level_range' ? 'utenti livello ' + (document.getElementById('min_level').value || 0) + '–' + (document.getElementById('max_level').value || 10) : 'tutti gli utenti attivi';
        var count    = previewCount.textContent;
        var pushText = document.getElementById('send_push').checked ? 'SI' : 'NO';

        if (credits === 0 && xp === 0 && tickets === 0) {
            e.preventDefault();
            alert('Devi assegnare almeno un tipo di ricompensa.');
            return;
        }

        // First confirmation
        if (!confirm('Sei sicuro di voler inviare questa ricompensa a ' + count + ' utenti?')) {
            e.preventDefault();
            return;
        }

        // Second confirmation with full summary
        var summary = '=== RIEPILOGO RICOMPENSA ===\n\n';
        summary += 'Motivo: ' + reason + '\n';
        if (credits > 0) summary += 'Crediti: +' + credits.toLocaleString('it-IT') + '\n';
        if (xp > 0)      summary += 'XP: +' + xp.toLocaleString('it-IT') + '\n';
        if (tickets > 0)  summary += 'Biglietti: +' + tickets.toLocaleString('it-IT') + '\n';
        summary += 'Destinatari: ' + target + ' (~' + count + ' utenti)\n';
        summary += 'Notifica push: ' + pushText + '\n\n';
        summary += 'Confermi l\'invio definitivo?';

        if (!confirm(summary)) {
            e.preventDefault();
            return;
        }

        // Disable button to prevent double submit
        document.getElementById('rm-submit-btn').disabled = true;
        document.getElementById('rm-submit-btn').style.opacity = '0.6';
    });
})();
</script>

<?php
if (!defined('ABSPATH')) exit;

require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';

global $wpdb;

$italy_tz = new DateTimeZone('Europe/Rome');
$now = new DateTime('now', $italy_tz);

$table_log = $wpdb->prefix . 'rafflemania_notification_log';
$table_users = $wpdb->prefix . 'rafflemania_users';

// Ensure notification_log table exists
$table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_log}'");
if (!$table_exists) {
    $charset_collate = $wpdb->get_charset_collate();
    $wpdb->query("CREATE TABLE {$table_log} (
        id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        title varchar(255) NOT NULL,
        body text NOT NULL,
        target_type varchar(50) DEFAULT 'all',
        target_filter text DEFAULT NULL,
        status enum('draft','scheduled','sent','failed') DEFAULT 'draft',
        scheduled_at datetime DEFAULT NULL,
        sent_at datetime DEFAULT NULL,
        recipients_count int(11) DEFAULT 0,
        onesignal_response text DEFAULT NULL,
        created_by bigint(20) UNSIGNED DEFAULT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY status (status),
        KEY scheduled_at (scheduled_at)
    ) ENGINE=InnoDB {$charset_collate}");
}

// ──────────────────────────────────────────────
// Handle POST submission
// ──────────────────────────────────────────────
$flash_message = '';
$flash_type = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rm_notif_action'])) {

    // Verify nonce
    if (!isset($_POST['rm_notif_nonce']) || !wp_verify_nonce($_POST['rm_notif_nonce'], 'rm_send_notification')) {
        $flash_message = 'Errore di sicurezza: token non valido. Riprova.';
        $flash_type = 'error';

    // Handle delete action
    } elseif ($_POST['rm_notif_action'] === 'delete' && !empty($_POST['notif_delete_id'])) {
        $delete_id = intval($_POST['notif_delete_id']);
        $deleted = $wpdb->delete($table_log, ['id' => $delete_id], ['%d']);
        if ($deleted) {
            $flash_message = 'Notifica eliminata con successo.';
            $flash_type = 'success';
        } else {
            $flash_message = 'Errore durante l\'eliminazione della notifica.';
            $flash_type = 'error';
        }

    } else {

        $title       = sanitize_text_field($_POST['notif_title'] ?? '');
        $body        = sanitize_textarea_field($_POST['notif_body'] ?? '');
        $target_type = sanitize_text_field($_POST['notif_target'] ?? 'all');
        $schedule    = sanitize_text_field($_POST['notif_schedule'] ?? 'now');
        $scheduled_at_input = sanitize_text_field($_POST['notif_scheduled_at'] ?? '');
        $min_level   = intval($_POST['notif_min_level'] ?? 1);
        $max_level   = intval($_POST['notif_max_level'] ?? 100);

        if (empty($title) || empty($body)) {
            $flash_message = 'Titolo e messaggio sono obbligatori.';
            $flash_type = 'error';
        } else {

            // Build target_filter JSON
            $target_filter = null;
            if ($target_type === 'level_range') {
                $target_filter = json_encode(['min_level' => $min_level, 'max_level' => $max_level]);
            }

            // Determine schedule
            $is_scheduled = ($schedule === 'scheduled' && !empty($scheduled_at_input));

            if ($is_scheduled) {
                // Save as scheduled -- cron will handle sending
                $wpdb->insert($table_log, [
                    'title'         => $title,
                    'body'          => $body,
                    'target_type'   => $target_type,
                    'target_filter' => $target_filter,
                    'status'        => 'scheduled',
                    'scheduled_at'  => $scheduled_at_input,
                    'created_by'    => get_current_user_id(),
                ]);

                if ($wpdb->insert_id) {
                    $flash_message = 'Notifica programmata con successo per il ' . date('d/m/Y H:i', strtotime($scheduled_at_input)) . '.';
                    $flash_type = 'success';
                } else {
                    $flash_message = 'Errore nel salvataggio della notifica programmata.';
                    $flash_type = 'error';
                }

            } else {
                // Send immediately
                $result = false;
                $recipients_count = 0;

                switch ($target_type) {
                    case 'all':
                        $result = \RaffleMania\NotificationHelper::send_to_all($title, $body);
                        if ($result && isset($result['recipients'])) {
                            $recipients_count = (int) $result['recipients'];
                        }
                        break;

                    case 'level_range':
                        $user_ids = $wpdb->get_col($wpdb->prepare(
                            "SELECT id FROM {$table_users} WHERE level >= %d AND level <= %d AND is_active = 1",
                            $min_level, $max_level
                        ));
                        $recipients_count = count($user_ids);
                        if (!empty($user_ids)) {
                            $result = \RaffleMania\NotificationHelper::send_to_users($user_ids, $title, $body);
                        }
                        break;

                    case 'active':
                        $user_ids = $wpdb->get_col(
                            "SELECT id FROM {$table_users} WHERE is_active = 1 AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
                        );
                        $recipients_count = count($user_ids);
                        if (!empty($user_ids)) {
                            $result = \RaffleMania\NotificationHelper::send_to_users($user_ids, $title, $body);
                        }
                        break;

                    case 'inactive':
                        $user_ids = $wpdb->get_col(
                            "SELECT id FROM {$table_users} WHERE is_active = 1 AND updated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
                        );
                        $recipients_count = count($user_ids);
                        if (!empty($user_ids)) {
                            $result = \RaffleMania\NotificationHelper::send_to_users($user_ids, $title, $body);
                        }
                        break;
                }

                $status = $result ? 'sent' : 'failed';

                $wpdb->insert($table_log, [
                    'title'              => $title,
                    'body'               => $body,
                    'target_type'        => $target_type,
                    'target_filter'      => $target_filter,
                    'status'             => $status,
                    'sent_at'            => current_time('mysql'),
                    'recipients_count'   => $recipients_count,
                    'onesignal_response' => is_array($result) ? json_encode($result) : null,
                    'created_by'         => get_current_user_id(),
                ]);

                if ($result) {
                    // For 'all' target, update recipients_count from OneSignal response
                    if ($target_type === 'all' && isset($result['recipients'])) {
                        $recipients_count = (int) $result['recipients'];
                        // Update the log record
                        if ($wpdb->insert_id) {
                            $wpdb->update($table_log, ['recipients_count' => $recipients_count], ['id' => $wpdb->insert_id]);
                        }
                    }

                    if ($target_type === 'all' && $recipients_count === 0) {
                        $flash_message = "Notifica inviata a OneSignal (ID: " . substr($result['id'] ?? '', 0, 8) . "...). Potrebbe servire qualche secondo per la consegna.";
                    } else {
                        $flash_message = "Notifica inviata con successo a {$recipients_count} destinatari.";
                    }
                    $flash_type = 'success';
                } else {
                    if ($target_type !== 'all' && empty($user_ids)) {
                        $flash_message = 'Nessun utente trovato per il target selezionato.';
                    } else {
                        $flash_message = 'Errore durante l\'invio della notifica. Controlla le impostazioni OneSignal.';
                    }
                    $flash_type = 'error';
                }
            }
        }
    }
}

// ──────────────────────────────────────────────
// Pagination for notification history
// ──────────────────────────────────────────────
$per_page = 20;
$current_page = max(1, intval($_GET['paged'] ?? 1));
$offset = ($current_page - 1) * $per_page;

$total_notifications = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_log}");
$total_pages = max(1, ceil($total_notifications / $per_page));

$notifications = $wpdb->get_results($wpdb->prepare(
    "SELECT * FROM {$table_log} ORDER BY created_at DESC LIMIT %d OFFSET %d",
    $per_page, $offset
));

// Target type labels (Italian)
$target_labels = [
    'all'         => 'Tutti gli utenti',
    'level_range' => 'Per livello',
    'active'      => 'Attivi (30gg)',
    'inactive'    => 'Inattivi (30gg+)',
];
?>

<div class="wrap" id="rm-notifications-wrap">
    <h1 style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
        <span class="dashicons dashicons-megaphone" style="font-size: 28px; color: #FF6B00;"></span>
        Notifiche Push
    </h1>

    <!-- Toast notification container -->
    <div id="rm-toast-container"></div>

    <style>
        /* ─── Base reset ─── */
        #rm-notifications-wrap {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
        }

        /* ─── Toast notifications ─── */
        #rm-toast-container {
            position: fixed;
            top: 40px;
            right: 24px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .rm-toast {
            min-width: 320px;
            max-width: 480px;
            padding: 16px 20px;
            border-radius: 12px;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 8px 24px rgba(0,0,0,0.18);
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease;
        }
        .rm-toast.rm-toast-visible {
            transform: translateX(0);
            opacity: 1;
        }
        .rm-toast.rm-toast-hiding {
            transform: translateX(120%);
            opacity: 0;
        }
        .rm-toast-success {
            background: linear-gradient(135deg, #28a745, #20c997);
        }
        .rm-toast-error {
            background: linear-gradient(135deg, #dc3545, #e74c3c);
        }
        .rm-toast .dashicons {
            font-size: 20px;
            width: 20px;
            height: 20px;
        }
        .rm-toast-close {
            margin-left: auto;
            background: none;
            border: none;
            color: rgba(255,255,255,0.8);
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            padding: 0 0 0 12px;
        }
        .rm-toast-close:hover {
            color: #fff;
        }

        /* ─── Layout ─── */
        .rm-notif-grid {
            display: grid;
            grid-template-columns: 1fr 1.5fr;
            gap: 28px;
            margin-top: 8px;
        }
        @media (max-width: 1200px) {
            .rm-notif-grid {
                grid-template-columns: 1fr;
            }
        }

        /* ─── Card ─── */
        .rm-card {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 28px;
            transition: box-shadow 0.25s ease;
        }
        .rm-card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .rm-card-title {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0 0 24px 0;
            padding-bottom: 14px;
            border-bottom: 3px solid #FF6B00;
            color: #1a1a2e;
            font-size: 17px;
            font-weight: 700;
        }
        .rm-card-title .dashicons {
            color: #FF6B00;
            font-size: 22px;
            width: 22px;
            height: 22px;
        }

        /* ─── Form controls ─── */
        .rm-form-group {
            margin-bottom: 20px;
        }
        .rm-form-group label {
            display: block;
            margin-bottom: 6px;
            font-weight: 600;
            font-size: 13px;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .rm-form-group label .rm-required {
            color: #dc3545;
            margin-left: 2px;
        }
        .rm-input,
        .rm-textarea,
        .rm-select {
            width: 100%;
            padding: 12px 14px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 14px;
            color: #333;
            background: #fafbfc;
            transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            box-sizing: border-box;
            font-family: inherit;
        }
        .rm-input:focus,
        .rm-textarea:focus,
        .rm-select:focus {
            outline: none;
            border-color: #FF6B00;
            box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.12);
            background: #fff;
        }
        .rm-textarea {
            min-height: 120px;
            resize: vertical;
            line-height: 1.6;
        }
        .rm-input::placeholder,
        .rm-textarea::placeholder {
            color: #a0aec0;
        }

        /* ─── Level range row ─── */
        .rm-level-row {
            display: none;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-top: 12px;
            padding: 16px;
            background: #fff8f0;
            border-radius: 10px;
            border: 1px dashed #FFB366;
            animation: rm-fade-in 0.3s ease;
        }
        .rm-level-row.rm-visible {
            display: grid;
        }
        .rm-level-row label {
            font-weight: 500;
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 4px;
        }
        .rm-level-row .rm-input {
            padding: 10px 12px;
        }

        /* ─── Radio buttons (schedule) ─── */
        .rm-radio-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        .rm-radio-label {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #555;
            transition: all 0.2s ease;
            user-select: none;
        }
        .rm-radio-label:hover {
            border-color: #FF6B00;
            background: #fff8f0;
        }
        .rm-radio-label input[type="radio"] {
            accent-color: #FF6B00;
            width: 16px;
            height: 16px;
        }
        .rm-radio-label.rm-radio-active {
            border-color: #FF6B00;
            background: #fff5eb;
            color: #FF6B00;
        }

        /* ─── Datetime picker row ─── */
        .rm-schedule-datetime {
            display: none;
            margin-top: 12px;
            animation: rm-fade-in 0.3s ease;
        }
        .rm-schedule-datetime.rm-visible {
            display: block;
        }
        .rm-schedule-datetime .rm-input {
            max-width: 300px;
        }

        /* ─── Submit button ─── */
        .rm-btn-send {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 14px 32px;
            background: linear-gradient(135deg, #FF6B00, #FF8C33);
            color: #fff;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.25s ease;
            box-shadow: 0 4px 14px rgba(255, 107, 0, 0.35);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .rm-btn-send:hover {
            background: linear-gradient(135deg, #e85d00, #FF6B00);
            box-shadow: 0 6px 20px rgba(255, 107, 0, 0.45);
            transform: translateY(-1px);
        }
        .rm-btn-send:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3);
        }
        .rm-btn-send .dashicons {
            font-size: 18px;
            width: 18px;
            height: 18px;
        }
        .rm-btn-send:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        /* ─── Character counter ─── */
        .rm-char-count {
            text-align: right;
            font-size: 12px;
            color: #a0aec0;
            margin-top: 4px;
            transition: color 0.2s;
        }
        .rm-char-count.rm-char-warn {
            color: #e67e22;
        }
        .rm-char-count.rm-char-limit {
            color: #dc3545;
        }

        /* ─── History table ─── */
        .rm-table-wrap {
            overflow-x: auto;
        }
        .rm-notif-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .rm-notif-table th {
            padding: 14px 12px;
            text-align: left;
            background: #f8f9fb;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #666;
            border-bottom: 2px solid #eee;
            white-space: nowrap;
        }
        .rm-notif-table td {
            padding: 14px 12px;
            border-bottom: 1px solid #f0f0f0;
            vertical-align: middle;
            color: #444;
        }
        .rm-notif-table tbody tr {
            transition: background 0.15s ease;
        }
        .rm-notif-table tbody tr:hover {
            background: #fef9f4;
        }
        .rm-notif-table .rm-cell-title {
            font-weight: 600;
            color: #1a1a2e;
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .rm-notif-table .rm-cell-body {
            max-width: 220px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #888;
            font-size: 12px;
        }
        .rm-notif-table .rm-cell-date {
            white-space: nowrap;
            font-size: 12px;
            color: #888;
        }
        .rm-notif-table .rm-cell-count {
            text-align: center;
            font-weight: 700;
            color: #FF6B00;
        }

        /* ─── Status badges ─── */
        .rm-status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            white-space: nowrap;
        }
        .rm-status-sent {
            background: #d4edda;
            color: #155724;
        }
        .rm-status-scheduled {
            background: #fff3cd;
            color: #856404;
        }
        .rm-status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        .rm-status-draft {
            background: #e2e8f0;
            color: #4a5568;
        }

        /* ─── Target badge ─── */
        .rm-target-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            background: #eef2ff;
            color: #4338ca;
            white-space: nowrap;
        }

        /* ─── Pagination ─── */
        .rm-pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;
            margin-top: 24px;
            flex-wrap: wrap;
        }
        .rm-page-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 36px;
            height: 36px;
            padding: 0 10px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            background: #fff;
            color: #555;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
        }
        .rm-page-btn:hover {
            border-color: #FF6B00;
            color: #FF6B00;
            background: #fff8f0;
        }
        .rm-page-btn.rm-page-active {
            background: #FF6B00;
            border-color: #FF6B00;
            color: #fff;
        }
        .rm-page-btn.rm-page-disabled {
            opacity: 0.4;
            cursor: not-allowed;
            pointer-events: none;
        }
        .rm-page-info {
            font-size: 13px;
            color: #888;
            margin: 0 8px;
        }

        /* ─── Empty state ─── */
        .rm-empty-state {
            text-align: center;
            padding: 48px 20px;
            color: #a0aec0;
        }
        .rm-empty-state .dashicons {
            font-size: 48px;
            width: 48px;
            height: 48px;
            margin-bottom: 12px;
            color: #ddd;
        }
        .rm-empty-state p {
            font-size: 15px;
            margin: 0;
        }

        /* ─── Confirmation overlay ─── */
        .rm-confirm-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999998;
            align-items: center;
            justify-content: center;
            animation: rm-fade-in 0.2s ease;
        }
        .rm-confirm-overlay.rm-visible {
            display: flex;
        }
        .rm-confirm-box {
            background: #fff;
            border-radius: 16px;
            padding: 32px;
            max-width: 440px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            text-align: center;
            animation: rm-scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .rm-confirm-box .dashicons {
            font-size: 48px;
            width: 48px;
            height: 48px;
            color: #FF6B00;
            margin-bottom: 12px;
        }
        .rm-confirm-box h3 {
            margin: 0 0 8px 0;
            color: #1a1a2e;
            font-size: 18px;
        }
        .rm-confirm-box p {
            color: #666;
            font-size: 14px;
            margin: 0 0 24px 0;
            line-height: 1.6;
        }
        .rm-confirm-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        .rm-confirm-cancel {
            padding: 10px 24px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            background: #fff;
            color: #666;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .rm-confirm-cancel:hover {
            border-color: #ccc;
            background: #f8f9fa;
        }
        .rm-confirm-submit {
            padding: 10px 24px;
            border: none;
            border-radius: 10px;
            background: linear-gradient(135deg, #FF6B00, #FF8C33);
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 14px rgba(255, 107, 0, 0.3);
        }
        .rm-confirm-submit:hover {
            background: linear-gradient(135deg, #e85d00, #FF6B00);
        }

        /* ─── Delete button ─── */
        .rm-btn-delete {
            background: none;
            border: none;
            color: #ccc;
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .rm-btn-delete:hover {
            color: #dc3545;
            background: #fff5f5;
        }
        .rm-btn-delete .dashicons {
            font-size: 16px;
            width: 16px;
            height: 16px;
        }

        /* ─── Animations ─── */
        @keyframes rm-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes rm-scale-in {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }

        /* ─── Helper for form hint ─── */
        .rm-form-hint {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 4px;
        }
    </style>

    <div class="rm-notif-grid">

        <!-- ═══════════════════════════════════════════ -->
        <!-- CARD 1: Componi Notifica                    -->
        <!-- ═══════════════════════════════════════════ -->
        <div class="rm-card">
            <h2 class="rm-card-title">
                <span class="dashicons dashicons-edit"></span>
                Componi Notifica
            </h2>

            <form id="rm-notif-form" method="post" action="">
                <?php wp_nonce_field('rm_send_notification', 'rm_notif_nonce'); ?>
                <input type="hidden" name="rm_notif_action" value="send">

                <!-- Title -->
                <div class="rm-form-group">
                    <label for="notif_title">Titolo <span class="rm-required">*</span></label>
                    <input type="text" id="notif_title" name="notif_title" class="rm-input"
                           placeholder="Es: Nuovo premio disponibile!"
                           maxlength="255" required
                           value="<?php echo esc_attr($_POST['notif_title'] ?? ''); ?>">
                    <div class="rm-char-count"><span id="rm-title-count">0</span> / 255</div>
                </div>

                <!-- Body -->
                <div class="rm-form-group">
                    <label for="notif_body">Messaggio <span class="rm-required">*</span></label>
                    <textarea id="notif_body" name="notif_body" class="rm-textarea"
                              placeholder="Scrivi qui il contenuto della notifica..."
                              maxlength="1000" required><?php echo esc_textarea($_POST['notif_body'] ?? ''); ?></textarea>
                    <div class="rm-char-count"><span id="rm-body-count">0</span> / 1000</div>
                </div>

                <!-- Target -->
                <div class="rm-form-group">
                    <label for="notif_target">Destinatari</label>
                    <select id="notif_target" name="notif_target" class="rm-select">
                        <option value="all" <?php selected(($_POST['notif_target'] ?? ''), 'all'); ?>>Tutti gli utenti</option>
                        <option value="level_range" <?php selected(($_POST['notif_target'] ?? ''), 'level_range'); ?>>Per livello (min - max)</option>
                        <option value="active" <?php selected(($_POST['notif_target'] ?? ''), 'active'); ?>>Utenti attivi (ultimi 30 giorni)</option>
                        <option value="inactive" <?php selected(($_POST['notif_target'] ?? ''), 'inactive'); ?>>Utenti inattivi (30+ giorni)</option>
                    </select>
                </div>

                <!-- Level range (shown conditionally) -->
                <div class="rm-level-row" id="rm-level-range">
                    <div>
                        <label for="notif_min_level">Livello minimo</label>
                        <input type="number" id="notif_min_level" name="notif_min_level" class="rm-input"
                               min="1" max="999" value="<?php echo esc_attr($_POST['notif_min_level'] ?? '1'); ?>">
                    </div>
                    <div>
                        <label for="notif_max_level">Livello massimo</label>
                        <input type="number" id="notif_max_level" name="notif_max_level" class="rm-input"
                               min="1" max="999" value="<?php echo esc_attr($_POST['notif_max_level'] ?? '100'); ?>">
                    </div>
                </div>

                <!-- Schedule -->
                <div class="rm-form-group" style="margin-top: 20px;">
                    <label>Programmazione</label>
                    <div class="rm-radio-group">
                        <label class="rm-radio-label <?php echo (($_POST['notif_schedule'] ?? 'now') === 'now') ? 'rm-radio-active' : ''; ?>">
                            <input type="radio" name="notif_schedule" value="now"
                                   <?php checked(($_POST['notif_schedule'] ?? 'now'), 'now'); ?>>
                            <span class="dashicons dashicons-controls-play" style="font-size: 16px; width: 16px; height: 16px;"></span>
                            Invia ora
                        </label>
                        <label class="rm-radio-label <?php echo (($_POST['notif_schedule'] ?? '') === 'scheduled') ? 'rm-radio-active' : ''; ?>">
                            <input type="radio" name="notif_schedule" value="scheduled"
                                   <?php checked(($_POST['notif_schedule'] ?? ''), 'scheduled'); ?>>
                            <span class="dashicons dashicons-clock" style="font-size: 16px; width: 16px; height: 16px;"></span>
                            Programma invio
                        </label>
                    </div>
                </div>

                <!-- Scheduled datetime (shown conditionally) -->
                <div class="rm-schedule-datetime <?php echo (($_POST['notif_schedule'] ?? '') === 'scheduled') ? 'rm-visible' : ''; ?>" id="rm-schedule-datetime">
                    <div class="rm-form-group">
                        <label for="notif_scheduled_at">Data e ora di invio</label>
                        <input type="datetime-local" id="notif_scheduled_at" name="notif_scheduled_at" class="rm-input"
                               value="<?php echo esc_attr($_POST['notif_scheduled_at'] ?? ''); ?>"
                               min="<?php echo $now->format('Y-m-d\TH:i'); ?>">
                        <div class="rm-form-hint">Fuso orario: Europa/Roma</div>
                    </div>
                </div>

                <!-- Submit -->
                <div style="margin-top: 28px;">
                    <button type="button" id="rm-btn-send" class="rm-btn-send">
                        <span class="dashicons dashicons-megaphone"></span>
                        Invia Notifica
                    </button>
                </div>
            </form>
        </div>

        <!-- ═══════════════════════════════════════════ -->
        <!-- CARD 2: Cronologia Notifiche                -->
        <!-- ═══════════════════════════════════════════ -->
        <div class="rm-card">
            <h2 class="rm-card-title">
                <span class="dashicons dashicons-list-view"></span>
                Cronologia Notifiche
                <?php if ($total_notifications > 0): ?>
                    <span style="font-weight: 400; font-size: 13px; color: #a0aec0; margin-left: auto;">
                        <?php echo number_format($total_notifications); ?> totali
                    </span>
                <?php endif; ?>
            </h2>

            <?php if (empty($notifications)): ?>
                <div class="rm-empty-state">
                    <span class="dashicons dashicons-megaphone"></span>
                    <p>Nessuna notifica inviata ancora.<br>Componi la tua prima notifica!</p>
                </div>
            <?php else: ?>
                <div class="rm-table-wrap">
                    <table class="rm-notif-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Titolo</th>
                                <th>Messaggio</th>
                                <th>Destinatari</th>
                                <th>Stato</th>
                                <th style="text-align: center;">Inviati</th>
                                <th style="text-align: center; width: 50px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($notifications as $notif):
                                $created = $notif->created_at ? date('d/m/Y', strtotime($notif->created_at)) : '-';
                                $created_time = $notif->created_at ? date('H:i', strtotime($notif->created_at)) : '';
                                $body_short = mb_strlen($notif->body) > 60 ? mb_substr($notif->body, 0, 60) . '...' : $notif->body;

                                // Build target display
                                $target_display = $target_labels[$notif->target_type] ?? $notif->target_type;
                                if ($notif->target_type === 'level_range' && $notif->target_filter) {
                                    $filter_data = json_decode($notif->target_filter, true);
                                    if ($filter_data) {
                                        $target_display = 'Lv. ' . ($filter_data['min_level'] ?? '?') . ' - ' . ($filter_data['max_level'] ?? '?');
                                    }
                                }

                                $status_class = 'rm-status-' . $notif->status;
                                $status_labels_it = [
                                    'sent'      => 'Inviata',
                                    'scheduled' => 'Programmata',
                                    'failed'    => 'Fallita',
                                    'draft'     => 'Bozza',
                                ];
                                $status_label = $status_labels_it[$notif->status] ?? $notif->status;
                            ?>
                            <tr>
                                <td class="rm-cell-date">
                                    <?php echo esc_html($created); ?>
                                    <br><small style="color: #bbb;"><?php echo esc_html($created_time); ?></small>
                                </td>
                                <td class="rm-cell-title" title="<?php echo esc_attr($notif->title); ?>">
                                    <?php echo esc_html($notif->title); ?>
                                </td>
                                <td class="rm-cell-body" title="<?php echo esc_attr($notif->body); ?>">
                                    <?php echo esc_html($body_short); ?>
                                </td>
                                <td>
                                    <span class="rm-target-badge"><?php echo esc_html($target_display); ?></span>
                                </td>
                                <td>
                                    <span class="rm-status-badge <?php echo esc_attr($status_class); ?>">
                                        <?php echo esc_html($status_label); ?>
                                    </span>
                                    <?php if ($notif->status === 'scheduled' && $notif->scheduled_at): ?>
                                        <br><small style="color: #856404; font-size: 11px;">
                                            <?php echo date('d/m/Y H:i', strtotime($notif->scheduled_at)); ?>
                                        </small>
                                    <?php endif; ?>
                                </td>
                                <td class="rm-cell-count">
                                    <?php echo number_format((int) $notif->recipients_count); ?>
                                </td>
                                <td style="text-align: center;">
                                    <button type="button" class="rm-btn-delete" data-id="<?php echo (int) $notif->id; ?>" data-title="<?php echo esc_attr($notif->title); ?>" title="Elimina">
                                        <span class="dashicons dashicons-trash"></span>
                                    </button>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <?php if ($total_pages > 1): ?>
                <div class="rm-pagination">
                    <?php
                    $base_url = admin_url('admin.php?page=rafflemania-notifications');

                    // Previous
                    if ($current_page > 1): ?>
                        <a href="<?php echo esc_url($base_url . '&paged=' . ($current_page - 1)); ?>" class="rm-page-btn">&laquo;</a>
                    <?php else: ?>
                        <span class="rm-page-btn rm-page-disabled">&laquo;</span>
                    <?php endif;

                    // Page numbers (show max 7 pages around current)
                    $start_page = max(1, $current_page - 3);
                    $end_page = min($total_pages, $current_page + 3);

                    if ($start_page > 1): ?>
                        <a href="<?php echo esc_url($base_url . '&paged=1'); ?>" class="rm-page-btn">1</a>
                        <?php if ($start_page > 2): ?>
                            <span class="rm-page-info">...</span>
                        <?php endif;
                    endif;

                    for ($i = $start_page; $i <= $end_page; $i++): ?>
                        <?php if ($i === $current_page): ?>
                            <span class="rm-page-btn rm-page-active"><?php echo $i; ?></span>
                        <?php else: ?>
                            <a href="<?php echo esc_url($base_url . '&paged=' . $i); ?>" class="rm-page-btn"><?php echo $i; ?></a>
                        <?php endif;
                    endfor;

                    if ($end_page < $total_pages): ?>
                        <?php if ($end_page < $total_pages - 1): ?>
                            <span class="rm-page-info">...</span>
                        <?php endif; ?>
                        <a href="<?php echo esc_url($base_url . '&paged=' . $total_pages); ?>" class="rm-page-btn"><?php echo $total_pages; ?></a>
                    <?php endif;

                    // Next
                    if ($current_page < $total_pages): ?>
                        <a href="<?php echo esc_url($base_url . '&paged=' . ($current_page + 1)); ?>" class="rm-page-btn">&raquo;</a>
                    <?php else: ?>
                        <span class="rm-page-btn rm-page-disabled">&raquo;</span>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
            <?php endif; ?>
        </div>

    </div><!-- .rm-notif-grid -->

    <!-- Confirmation dialog overlay -->
    <div class="rm-confirm-overlay" id="rm-confirm-overlay">
        <div class="rm-confirm-box">
            <span class="dashicons dashicons-megaphone"></span>
            <h3>Conferma Invio</h3>
            <p id="rm-confirm-text">Sei sicuro di voler inviare questa notifica?</p>
            <div class="rm-confirm-actions">
                <button type="button" class="rm-confirm-cancel" id="rm-confirm-cancel">Annulla</button>
                <button type="button" class="rm-confirm-submit" id="rm-confirm-submit">
                    Conferma Invio
                </button>
            </div>
        </div>
    </div>

    <!-- Hidden form for delete action -->
    <form id="rm-delete-form" method="post" action="" style="display: none;">
        <?php wp_nonce_field('rm_send_notification', 'rm_notif_nonce'); ?>
        <input type="hidden" name="rm_notif_action" value="delete">
        <input type="hidden" name="notif_delete_id" id="rm-delete-id" value="">
    </form>

    <!-- Delete confirmation overlay -->
    <div class="rm-confirm-overlay" id="rm-delete-overlay">
        <div class="rm-confirm-box">
            <span class="dashicons dashicons-trash" style="color: #dc3545;"></span>
            <h3>Conferma Eliminazione</h3>
            <p id="rm-delete-text">Sei sicuro di voler eliminare questa notifica?</p>
            <div class="rm-confirm-actions">
                <button type="button" class="rm-confirm-cancel" id="rm-delete-cancel">Annulla</button>
                <button type="button" class="rm-confirm-submit" id="rm-delete-submit" style="background: linear-gradient(135deg, #dc3545, #e74c3c); box-shadow: 0 4px 14px rgba(220, 53, 69, 0.3);">
                    Elimina
                </button>
            </div>
        </div>
    </div>

</div><!-- .wrap -->

<script>
document.addEventListener('DOMContentLoaded', function() {

    // ─── Toast notification system ───
    function showToast(message, type) {
        var container = document.getElementById('rm-toast-container');
        var toast = document.createElement('div');
        toast.className = 'rm-toast rm-toast-' + type;

        var icon = type === 'success' ? 'yes-alt' : 'warning';
        toast.innerHTML =
            '<span class="dashicons dashicons-' + icon + '"></span>' +
            '<span>' + message + '</span>' +
            '<button class="rm-toast-close" type="button">&times;</button>';

        container.appendChild(toast);

        // Trigger slide-in
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                toast.classList.add('rm-toast-visible');
            });
        });

        // Close handler
        toast.querySelector('.rm-toast-close').addEventListener('click', function() {
            dismissToast(toast);
        });

        // Auto dismiss after 6 seconds
        setTimeout(function() {
            dismissToast(toast);
        }, 6000);
    }

    function dismissToast(toast) {
        if (toast.classList.contains('rm-toast-hiding')) return;
        toast.classList.remove('rm-toast-visible');
        toast.classList.add('rm-toast-hiding');
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
    }

    // Show flash message as toast (from PHP)
    <?php if (!empty($flash_message)): ?>
    showToast(<?php echo json_encode($flash_message); ?>, <?php echo json_encode($flash_type); ?>);
    <?php endif; ?>

    // ─── Target select: show/hide level range ───
    var targetSelect = document.getElementById('notif_target');
    var levelRow = document.getElementById('rm-level-range');

    function toggleLevelRange() {
        if (targetSelect.value === 'level_range') {
            levelRow.classList.add('rm-visible');
        } else {
            levelRow.classList.remove('rm-visible');
        }
    }
    targetSelect.addEventListener('change', toggleLevelRange);
    toggleLevelRange();

    // ─── Schedule radios: show/hide datetime ───
    var scheduleRadios = document.querySelectorAll('input[name="notif_schedule"]');
    var scheduleDatetime = document.getElementById('rm-schedule-datetime');
    var radioLabels = document.querySelectorAll('.rm-radio-label');

    function toggleScheduleDatetime() {
        var checked = document.querySelector('input[name="notif_schedule"]:checked');
        var isScheduled = checked && checked.value === 'scheduled';

        if (isScheduled) {
            scheduleDatetime.classList.add('rm-visible');
        } else {
            scheduleDatetime.classList.remove('rm-visible');
        }

        // Update active style on radio labels
        radioLabels.forEach(function(label) {
            var radio = label.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                label.classList.add('rm-radio-active');
            } else {
                label.classList.remove('rm-radio-active');
            }
        });
    }

    scheduleRadios.forEach(function(radio) {
        radio.addEventListener('change', toggleScheduleDatetime);
    });
    toggleScheduleDatetime();

    // ─── Character counters ───
    var titleInput = document.getElementById('notif_title');
    var bodyInput = document.getElementById('notif_body');
    var titleCount = document.getElementById('rm-title-count');
    var bodyCount = document.getElementById('rm-body-count');

    function updateCount(input, counter, max) {
        var len = input.value.length;
        counter.textContent = len;

        var parent = counter.parentNode;
        parent.classList.remove('rm-char-warn', 'rm-char-limit');
        if (len >= max) {
            parent.classList.add('rm-char-limit');
        } else if (len >= max * 0.85) {
            parent.classList.add('rm-char-warn');
        }
    }

    titleInput.addEventListener('input', function() { updateCount(titleInput, titleCount, 255); });
    bodyInput.addEventListener('input', function() { updateCount(bodyInput, bodyCount, 1000); });

    // Init counts
    updateCount(titleInput, titleCount, 255);
    updateCount(bodyInput, bodyCount, 1000);

    // ─── Confirmation dialog ───
    var form = document.getElementById('rm-notif-form');
    var btnSend = document.getElementById('rm-btn-send');
    var overlay = document.getElementById('rm-confirm-overlay');
    var confirmCancel = document.getElementById('rm-confirm-cancel');
    var confirmSubmit = document.getElementById('rm-confirm-submit');
    var confirmText = document.getElementById('rm-confirm-text');

    var targetLabels = {
        'all': 'tutti gli utenti',
        'level_range': 'utenti per livello',
        'active': 'utenti attivi (ultimi 30 giorni)',
        'inactive': 'utenti inattivi (30+ giorni)'
    };

    btnSend.addEventListener('click', function() {
        // Basic validation
        if (!titleInput.value.trim() || !bodyInput.value.trim()) {
            showToast('Compila titolo e messaggio prima di inviare.', 'error');
            return;
        }

        var scheduleChecked = document.querySelector('input[name="notif_schedule"]:checked');
        var isScheduled = scheduleChecked && scheduleChecked.value === 'scheduled';
        var scheduledAt = document.getElementById('notif_scheduled_at').value;

        if (isScheduled && !scheduledAt) {
            showToast('Seleziona una data e ora per la programmazione.', 'error');
            return;
        }

        // Level validation
        if (targetSelect.value === 'level_range') {
            var minLvl = parseInt(document.getElementById('notif_min_level').value) || 0;
            var maxLvl = parseInt(document.getElementById('notif_max_level').value) || 0;
            if (minLvl > maxLvl) {
                showToast('Il livello minimo non puo\u0027 essere maggiore del massimo.', 'error');
                return;
            }
        }

        // Build confirmation message
        var target = targetLabels[targetSelect.value] || targetSelect.value;
        var action = isScheduled
            ? 'programmare l\u0027invio per il <strong>' + scheduledAt.replace('T', ' alle ') + '</strong>'
            : 'inviare immediatamente';

        confirmText.innerHTML =
            'Stai per ' + action + ' la notifica<br>' +
            '<strong>&laquo;' + titleInput.value.substring(0, 60) + '&raquo;</strong><br>' +
            'a <strong>' + target + '</strong>.<br><br>' +
            'Vuoi procedere?';

        overlay.classList.add('rm-visible');
    });

    confirmCancel.addEventListener('click', function() {
        overlay.classList.remove('rm-visible');
    });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.classList.remove('rm-visible');
        }
    });

    confirmSubmit.addEventListener('click', function() {
        overlay.classList.remove('rm-visible');
        btnSend.disabled = true;
        btnSend.innerHTML = '<span class="dashicons dashicons-update" style="animation: spin 1s linear infinite;"></span> Invio in corso...';

        // Add spin animation
        var style = document.createElement('style');
        style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
        document.head.appendChild(style);

        form.submit();
    });

    // ─── Keyboard shortcut: Escape to close overlay ───
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (overlay.classList.contains('rm-visible')) {
                overlay.classList.remove('rm-visible');
            }
            if (deleteOverlay.classList.contains('rm-visible')) {
                deleteOverlay.classList.remove('rm-visible');
            }
        }
    });

    // ─── Delete notification ───
    var deleteOverlay = document.getElementById('rm-delete-overlay');
    var deleteCancel = document.getElementById('rm-delete-cancel');
    var deleteSubmit = document.getElementById('rm-delete-submit');
    var deleteText = document.getElementById('rm-delete-text');
    var deleteForm = document.getElementById('rm-delete-form');
    var deleteIdInput = document.getElementById('rm-delete-id');

    document.querySelectorAll('.rm-btn-delete').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var id = this.getAttribute('data-id');
            var title = this.getAttribute('data-title');
            deleteIdInput.value = id;
            deleteText.innerHTML = 'Sei sicuro di voler eliminare la notifica<br><strong>&laquo;' + title.substring(0, 60) + '&raquo;</strong>?';
            deleteOverlay.classList.add('rm-visible');
        });
    });

    deleteCancel.addEventListener('click', function() {
        deleteOverlay.classList.remove('rm-visible');
    });

    deleteOverlay.addEventListener('click', function(e) {
        if (e.target === deleteOverlay) {
            deleteOverlay.classList.remove('rm-visible');
        }
    });

    deleteSubmit.addEventListener('click', function() {
        deleteOverlay.classList.remove('rm-visible');
        deleteForm.submit();
    });

});
</script>

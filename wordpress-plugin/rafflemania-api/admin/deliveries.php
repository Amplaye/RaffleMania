<?php
if (!defined('ABSPATH')) exit;

global $wpdb;
$table_winners = $wpdb->prefix . 'rafflemania_winners';
$table_prizes = $wpdb->prefix . 'rafflemania_prizes';
$table_users = $wpdb->prefix . 'rafflemania_users';

// Handle deliver action
if (isset($_POST['deliver_winner_id']) && wp_verify_nonce($_POST['_wpnonce'], 'rafflemania_deliver_prize')) {
    $winner_id = intval($_POST['deliver_winner_id']);
    $voucher_code = sanitize_text_field($_POST['voucher_code'] ?? '');
    $delivery_notes = sanitize_textarea_field($_POST['delivery_notes'] ?? '');

    $winner = $wpdb->get_row($wpdb->prepare(
        "SELECT w.*, p.name as prize_name, p.value as prize_value, p.image_url as prize_image, u.username, u.email, u.id as uid
         FROM {$table_winners} w
         LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
         LEFT JOIN {$table_users} u ON w.user_id = u.id
         WHERE w.id = %d",
        $winner_id
    ));

    if ($winner && (!isset($winner->delivery_status) || $winner->delivery_status !== 'delivered')) {
        // Update delivery status with voucher code and notes
        $update_data = [
            'delivery_status' => 'delivered',
            'delivered_at' => current_time('mysql'),
            'delivery_email_sent' => 1,
        ];
        if (!empty($voucher_code)) {
            $update_data['voucher_code'] = $voucher_code;
        }
        if (!empty($delivery_notes)) {
            $update_data['delivery_notes'] = $delivery_notes;
        }
        $wpdb->update($table_winners, $update_data, ['id' => $winner_id]);

        // Build professional delivery email
        $prize_image_html = '';
        if (!empty($winner->prize_image)) {
            $prize_image_html = "<img src='" . esc_url($winner->prize_image) . "' alt='" . esc_attr($winner->prize_name) . "' style='max-width: 200px; max-height: 200px; margin: 0 auto 16px; display: block; border-radius: 12px;' />";
        }

        $voucher_section = '';
        if (!empty($voucher_code)) {
            $voucher_section = "
                    <tr>
                        <td style='padding: 0 40px 16px;'>
                            <div style='background: #FFF8F0; border: 2px dashed #FF6B00; border-radius: 12px; padding: 20px; text-align: center;'>
                                <div style='font-size: 14px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;'>Il tuo codice</div>
                                <div style='font-size: 28px; font-weight: 700; color: #FF6B00; letter-spacing: 2px; font-family: Courier New, monospace; word-break: break-all;'>{$voucher_code}</div>
                            </div>
                        </td>
                    </tr>";
        }

        $notes_section = '';
        if (!empty($delivery_notes)) {
            $escaped_notes = nl2br(esc_html($delivery_notes));
            $notes_section = "
                    <tr>
                        <td style='padding: 0 40px 16px;'>
                            <div style='background: #f0f7ff; border-left: 4px solid #4A90D9; border-radius: 0 8px 8px 0; padding: 16px 20px;'>
                                <div style='font-size: 15px; font-weight: 600; color: #4A90D9; margin-bottom: 6px;'>Istruzioni</div>
                                <div style='font-size: 16px; color: #333; line-height: 1.5;'>{$escaped_notes}</div>
                            </div>
                        </td>
                    </tr>";
        }

        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/EmailHelper.php';
        $prize_value_formatted = number_format($winner->prize_value, 2, ',', '.');

        $subject = "RaffleMania - Il tuo premio \"{$winner->prize_name}\" e stato consegnato!";
        $body = "<tr><td style='padding:16px 40px 0;'>
<h2 style='color:#1a1a1a;margin:0 0 10px;font-size:26px;font-weight:700;'>Ciao {$winner->username}!</h2>
<p style='color:#555;font-size:18px;line-height:1.6;margin:0;'>Ottime notizie! Il tuo premio e stato <strong style='color:#FF6B00;'>consegnato con successo</strong>.</p>
</td></tr>
<tr><td style='padding:24px 40px;'>
<table role='presentation' cellspacing='0' cellpadding='0' border='0' width='100%' style='border:2px solid #FFD700;border-radius:16px;overflow:hidden;'>
<tr><td style='padding:24px;text-align:center;'>
{$prize_image_html}
<div style='font-size:24px;font-weight:700;color:#FF6B00;margin-bottom:6px;'>{$winner->prize_name}</div>
<div style='font-size:18px;color:#888;margin-bottom:16px;'>Valore: &euro;{$prize_value_formatted}</div>
<table role='presentation' cellspacing='0' cellpadding='0' border='0' align='center'><tr><td style='background-color:#00B894;color:#ffffff;padding:12px 32px;border-radius:24px;font-weight:700;font-size:16px;text-transform:uppercase;'>&#10003; Consegnato</td></tr></table>
</td></tr></table>
</td></tr>
{$voucher_section}
{$notes_section}
<tr><td style='padding:0 40px 32px;'><div style='background:#f9f9f9;border-radius:12px;padding:20px;text-align:center;'><p style='color:#666;font-size:16px;line-height:1.5;margin:0;'>Hai domande sul tuo premio? Contatta il nostro supporto direttamente dall'app RaffleMania.</p></div></td></tr>";

        \RaffleMania\EmailHelper::send($winner->email, $subject, $body, true);

        // Send push notification
        \RaffleMania\NotificationHelper::send_to_user(
            $winner->uid,
            'Premio Consegnato!',
            "Il tuo premio \"{$winner->prize_name}\" e stato consegnato alla tua email!",
            ['type' => 'prize_delivered', 'prize_id' => (string)$winner->prize_id]
        );

        echo '<div class="notice notice-success is-dismissible"><p>Premio consegnato con successo! Email e notifica inviate a <strong>' . esc_html($winner->username) . '</strong>.</p></div>';
    }
}

// Fetch winners with delivery info
$filter = isset($_GET['filter']) ? sanitize_text_field($_GET['filter']) : 'all';
$where_clause = '';
if ($filter === 'processing') {
    $where_clause = "AND (w.delivery_status IS NULL OR w.delivery_status = 'processing')";
} elseif ($filter === 'delivered') {
    $where_clause = "AND w.delivery_status = 'delivered'";
}

$winners = $wpdb->get_results(
    "SELECT w.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
            u.username, u.email
     FROM {$table_winners} w
     LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
     LEFT JOIN {$table_users} u ON w.user_id = u.id
     WHERE 1=1 {$where_clause}
     ORDER BY w.won_at DESC
     LIMIT 100"
);

// Count stats
$total_count = $wpdb->get_var("SELECT COUNT(*) FROM {$table_winners}");
$processing_count = $wpdb->get_var("SELECT COUNT(*) FROM {$table_winners} WHERE delivery_status IS NULL OR delivery_status = 'processing'");
$delivered_count = $wpdb->get_var("SELECT COUNT(*) FROM {$table_winners} WHERE delivery_status = 'delivered'");
?>

<div class="wrap rafflemania-delivery-wrap">
    <h1>
        <span class="dashicons dashicons-email-alt" style="font-size: 30px; margin-right: 10px; color: #FF6B00;"></span>
        Consegna Premi Digitali
    </h1>

    <style>
        .rafflemania-delivery-wrap { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif; }
        .rafflemania-delivery-wrap h1 { display: flex; align-items: center; margin-bottom: 20px; }

        .delivery-stats { display: flex; gap: 15px; margin: 20px 0; }
        .delivery-stat-card { background: white; border-radius: 12px; padding: 20px 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); min-width: 160px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; color: inherit; }
        .delivery-stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
        .delivery-stat-card.active { border: 2px solid #FF6B00; }
        .delivery-stat-number { font-size: 28px; font-weight: 700; color: #333; }
        .delivery-stat-label { font-size: 13px; color: #888; margin-top: 4px; }

        .rafflemania-table-container { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-top: 20px; max-height: 700px; overflow-y: auto; }
        .rafflemania-table-container::-webkit-scrollbar { width: 6px; }
        .rafflemania-table-container::-webkit-scrollbar-track { background: #f8f9fa; }
        .rafflemania-table-container::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        .rafflemania-table { width: 100%; border-collapse: collapse; }
        .rafflemania-table th, .rafflemania-table td { padding: 14px; text-align: left; border-bottom: 1px solid #eee; font-size: 13px; }
        .rafflemania-table th { background: #f9f9f9; font-weight: 600; position: sticky; top: 0; z-index: 1; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; color: #666; }
        .rafflemania-table img { width: 50px; height: 50px; object-fit: cover; border-radius: 8px; }
        .rafflemania-table tbody tr { transition: background 0.15s ease; }
        .rafflemania-table tbody tr:hover { background: #FFF8F0; }

        .rafflemania-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .rafflemania-badge-processing { background: #fff3cd; color: #856404; }
        .rafflemania-badge-delivered { background: #d4edda; color: #155724; }

        .deliver-btn { background: #FF6B00; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; transition: background 0.2s; display: inline-flex; align-items: center; gap: 4px; }
        .deliver-btn:hover { background: #E55A00; }

        /* Modal styles */
        .rm-modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100000; align-items: center; justify-content: center; }
        .rm-modal-overlay.active { display: flex; }
        .rm-modal { background: white; border-radius: 16px; width: 480px; max-width: 90vw; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .rm-modal-header { background: linear-gradient(135deg, #FF6B00, #FF8C33); padding: 24px 28px; border-radius: 16px 16px 0 0; }
        .rm-modal-header h3 { color: white; margin: 0; font-size: 18px; display: flex; align-items: center; }
        .rm-modal-header p { color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px; }
        .rm-modal-body { padding: 24px 28px; }
        .rm-modal-footer { padding: 16px 28px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px; }

        .rm-field { margin-bottom: 18px; }
        .rm-field label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #333; }
        .rm-field label .optional { color: #999; font-weight: 400; }
        .rm-field input[type="text"], .rm-field textarea { width: 100%; padding: 10px 14px; border: 1.5px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; transition: border-color 0.2s; box-sizing: border-box; }
        .rm-field input:focus, .rm-field textarea:focus { outline: none; border-color: #FF6B00; box-shadow: 0 0 0 3px rgba(255,107,0,0.15); }
        .rm-field textarea { resize: vertical; min-height: 80px; }
        .rm-field .rm-hint { font-size: 11px; color: #999; margin-top: 4px; }

        .rm-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; border: none; transition: all 0.2s; }
        .rm-btn-cancel { background: #f0f0f0; color: #555; }
        .rm-btn-cancel:hover { background: #e0e0e0; }
        .rm-btn-deliver { background: #FF6B00; color: white; display: inline-flex; align-items: center; }
        .rm-btn-deliver:hover { background: #E55A00; }

        .rm-prize-preview { display: flex; align-items: center; gap: 12px; background: #FFF8F0; padding: 12px 16px; border-radius: 10px; margin-bottom: 18px; }
        .rm-prize-preview img { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; }
        .rm-prize-preview-info { flex: 1; }
        .rm-prize-preview-name { font-weight: 600; color: #333; font-size: 14px; }
        .rm-prize-preview-user { color: #888; font-size: 13px; }

        .rm-delivered-info { font-size: 12px; color: #888; margin-top: 4px; }
        .rm-voucher-tag { display: inline-block; background: #FFF0E0; color: #FF6B00; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; font-family: "Courier New", monospace; margin-top: 4px; }
    </style>

    <!-- Stats Cards -->
    <div class="delivery-stats">
        <a href="?page=rafflemania-deliveries&filter=all" class="delivery-stat-card <?php echo $filter === 'all' ? 'active' : ''; ?>">
            <div class="delivery-stat-number"><?php echo $total_count; ?></div>
            <div class="delivery-stat-label">Totale Vincite</div>
        </a>
        <a href="?page=rafflemania-deliveries&filter=processing" class="delivery-stat-card <?php echo $filter === 'processing' ? 'active' : ''; ?>">
            <div class="delivery-stat-number" style="color: #856404;"><?php echo $processing_count; ?></div>
            <div class="delivery-stat-label">In Processo</div>
        </a>
        <a href="?page=rafflemania-deliveries&filter=delivered" class="delivery-stat-card <?php echo $filter === 'delivered' ? 'active' : ''; ?>">
            <div class="delivery-stat-number" style="color: #155724;"><?php echo $delivered_count; ?></div>
            <div class="delivery-stat-label">Consegnati</div>
        </a>
    </div>

    <!-- Winners Table -->
    <div class="rafflemania-table-container">
        <table class="rafflemania-table">
            <thead>
                <tr>
                    <th>Premio</th>
                    <th>Vincitore</th>
                    <th>Email</th>
                    <th>Valore</th>
                    <th>Data Vincita</th>
                    <th>Stato Consegna</th>
                    <th>Azione</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($winners)): ?>
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #999;">Nessun vincitore trovato.</td>
                </tr>
                <?php else: ?>
                <?php foreach ($winners as $winner): ?>
                <?php
                    $is_delivered = (isset($winner->delivery_status) && $winner->delivery_status === 'delivered');
                ?>
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <?php if ($winner->prize_image): ?>
                            <img src="<?php echo esc_url($winner->prize_image); ?>" alt="">
                            <?php endif; ?>
                            <strong><?php echo esc_html($winner->prize_name); ?></strong>
                        </div>
                    </td>
                    <td><strong><?php echo esc_html($winner->username); ?></strong></td>
                    <td><?php echo esc_html($winner->email); ?></td>
                    <td>&euro;<?php echo number_format($winner->prize_value, 2); ?></td>
                    <td><?php echo date('d/m/Y H:i', strtotime($winner->won_at)); ?></td>
                    <td>
                        <?php if ($is_delivered): ?>
                        <span class="rafflemania-badge rafflemania-badge-delivered">Consegnato</span>
                        <div class="rm-delivered-info"><?php echo date('d/m/Y H:i', strtotime($winner->delivered_at)); ?></div>
                        <?php if (!empty($winner->voucher_code)): ?>
                        <div class="rm-voucher-tag"><?php echo esc_html($winner->voucher_code); ?></div>
                        <?php endif; ?>
                        <?php else: ?>
                        <span class="rafflemania-badge rafflemania-badge-processing">In Processo</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php if (!$is_delivered): ?>
                        <button type="button" class="deliver-btn" onclick="rmOpenDeliveryModal(<?php echo (int)$winner->id; ?>, '<?php echo esc_js($winner->prize_name); ?>', '<?php echo esc_js($winner->username); ?>', '<?php echo esc_js($winner->email); ?>', '<?php echo esc_url($winner->prize_image); ?>')">
                            <span class="dashicons dashicons-email-alt" style="font-size: 14px; line-height: 1.4;"></span>
                            Consegna
                        </button>
                        <?php else: ?>
                        <span style="color: #155724; font-weight: 600;">
                            <span class="dashicons dashicons-yes-alt" style="font-size: 16px; vertical-align: middle;"></span>
                            Fatto
                        </span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Delivery Modal -->
<div class="rm-modal-overlay" id="rm-delivery-modal">
    <div class="rm-modal">
        <div class="rm-modal-header">
            <h3><span class="dashicons dashicons-email-alt" style="margin-right: 8px; font-size: 20px;"></span>Consegna Premio</h3>
            <p>Inserisci i dati per la consegna digitale</p>
        </div>
        <form method="post" id="rm-delivery-form">
            <?php wp_nonce_field('rafflemania_deliver_prize'); ?>
            <input type="hidden" name="deliver_winner_id" id="rm-deliver-winner-id" value="">

            <div class="rm-modal-body">
                <!-- Prize preview -->
                <div class="rm-prize-preview" id="rm-prize-preview">
                    <img id="rm-modal-prize-img" src="" alt="" />
                    <div class="rm-prize-preview-info">
                        <div class="rm-prize-preview-name" id="rm-modal-prize-name"></div>
                        <div class="rm-prize-preview-user" id="rm-modal-prize-user"></div>
                    </div>
                </div>

                <!-- Voucher code -->
                <div class="rm-field">
                    <label for="voucher_code">Codice Buono / Codice Prodotto <span class="optional">(consigliato)</span></label>
                    <input type="text" id="voucher_code" name="voucher_code" placeholder="es. AMZN-XXXX-XXXX-XXXX" />
                    <div class="rm-hint">Il codice verra incluso nell'email di consegna al vincitore</div>
                </div>

                <!-- Delivery notes -->
                <div class="rm-field">
                    <label for="delivery_notes">Istruzioni / Note <span class="optional">(opzionale)</span></label>
                    <textarea id="delivery_notes" name="delivery_notes" placeholder="es. Vai su amazon.it/redeem per riscattare il codice. Valido fino al 31/12/2026."></textarea>
                    <div class="rm-hint">Queste istruzioni verranno incluse nell'email di consegna</div>
                </div>
            </div>

            <div class="rm-modal-footer">
                <button type="button" class="rm-btn rm-btn-cancel" onclick="rmCloseDeliveryModal()">Annulla</button>
                <button type="submit" class="rm-btn rm-btn-deliver" id="rm-deliver-submit-btn">
                    <span class="dashicons dashicons-yes-alt" style="font-size: 16px; vertical-align: middle; margin-right: 4px;"></span>
                    Consegna e Invia Email
                </button>
            </div>
        </form>
    </div>
</div>

<script>
(function() {
    var modal = document.getElementById('rm-delivery-modal');

    window.rmOpenDeliveryModal = function(winnerId, prizeName, username, email, prizeImage) {
        document.getElementById('rm-deliver-winner-id').value = winnerId;
        document.getElementById('rm-modal-prize-name').textContent = prizeName;
        document.getElementById('rm-modal-prize-user').textContent = username + ' (' + email + ')';
        var imgEl = document.getElementById('rm-modal-prize-img');
        if (prizeImage) {
            imgEl.src = prizeImage;
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
        }
        // Reset fields
        document.getElementById('voucher_code').value = '';
        document.getElementById('delivery_notes').value = '';
        document.getElementById('rm-deliver-submit-btn').disabled = false;
        document.getElementById('rm-deliver-submit-btn').style.opacity = '1';
        modal.classList.add('active');
    };

    window.rmCloseDeliveryModal = function() {
        modal.classList.remove('active');
    };

    // Close on overlay click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) rmCloseDeliveryModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            rmCloseDeliveryModal();
        }
    });

    // Confirm before submit
    document.getElementById('rm-delivery-form').addEventListener('submit', function(e) {
        var prizeName = document.getElementById('rm-modal-prize-name').textContent;
        var userName = document.getElementById('rm-modal-prize-user').textContent;
        var voucher = document.getElementById('voucher_code').value.trim();

        var msg = 'Confermi la consegna di "' + prizeName + '" a ' + userName + '?\n\n';
        if (voucher) {
            msg += 'Codice buono: ' + voucher + '\n';
        }
        msg += '\nVerra inviata un\'email e una notifica push al vincitore.';

        if (!confirm(msg)) {
            e.preventDefault();
            return;
        }

        document.getElementById('rm-deliver-submit-btn').disabled = true;
        document.getElementById('rm-deliver-submit-btn').style.opacity = '0.6';
    });
})();
</script>

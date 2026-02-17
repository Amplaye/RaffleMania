<?php
if (!defined('ABSPATH')) exit;

global $wpdb;
$table_users = $wpdb->prefix . 'rafflemania_users';
$table_referrals = $wpdb->prefix . 'rafflemania_referrals';
$table_tickets = $wpdb->prefix . 'rafflemania_tickets';
$table_winners = $wpdb->prefix . 'rafflemania_winners';
$table_transactions = $wpdb->prefix . 'rafflemania_transactions';
$table_streaks = $wpdb->prefix . 'rafflemania_streaks';
$table_admin_log = $wpdb->prefix . 'rafflemania_admin_actions_log';

$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rafflemania_user_nonce'])) {
    if (!wp_verify_nonce($_POST['rafflemania_user_nonce'], 'rafflemania_user_action')) {
        $error = 'Errore di sicurezza.';
    } else {
        $action = sanitize_text_field($_POST['user_action'] ?? '');
        $target_id = intval($_POST['target_user_id'] ?? 0);

        switch ($action) {
            case 'add_credits':
                $amount = intval($_POST['amount']);
                $reason = sanitize_text_field($_POST['reason'] ?? 'Admin');
                if ($amount > 0 && $target_id > 0) {
                    $wpdb->query($wpdb->prepare("UPDATE {$table_users} SET credits = credits + %d WHERE id = %d", $amount, $target_id));
                    $wpdb->insert($table_transactions, ['user_id' => $target_id, 'type' => 'bonus', 'amount' => $amount, 'description' => "Admin: {$reason}"]);
                    $wpdb->insert($table_admin_log, ['admin_user_id' => get_current_user_id(), 'action_type' => 'add_credits', 'target_user_id' => $target_id, 'details' => json_encode(['amount' => $amount, 'reason' => $reason])]);
                    $message = "{$amount} crediti aggiunti con successo!";
                }
                break;
            case 'add_xp':
                $amount = intval($_POST['amount']);
                $reason = sanitize_text_field($_POST['reason'] ?? 'Admin');
                if ($amount > 0 && $target_id > 0) {
                    $wpdb->query($wpdb->prepare("UPDATE {$table_users} SET xp = xp + %d WHERE id = %d", $amount, $target_id));
                    $user_xp = $wpdb->get_var($wpdb->prepare("SELECT xp FROM {$table_users} WHERE id = %d", $target_id));
                    $tl = $wpdb->prefix . 'rafflemania_levels';
                    $new_level = $wpdb->get_var($wpdb->prepare("SELECT level FROM {$tl} WHERE min_xp <= %d AND is_active = 1 ORDER BY min_xp DESC LIMIT 1", $user_xp));
                    if ($new_level !== null) $wpdb->update($table_users, ['level' => $new_level], ['id' => $target_id]);
                    $wpdb->insert($table_admin_log, ['admin_user_id' => get_current_user_id(), 'action_type' => 'add_xp', 'target_user_id' => $target_id, 'details' => json_encode(['amount' => $amount, 'reason' => $reason])]);
                    $message = "{$amount} XP aggiunti! Nuovo livello: {$new_level}";
                }
                break;
            case 'add_tickets':
                $amount = intval($_POST['amount']);
                $prize_id = intval($_POST['prize_id']);
                if ($amount > 0 && $target_id > 0 && $prize_id > 0) {
                    $max_t = $wpdb->get_var($wpdb->prepare("SELECT MAX(ticket_number) FROM {$table_tickets} WHERE prize_id = %d", $prize_id));
                    $start = ($max_t ?: 0) + 1;
                    for ($i = 0; $i < $amount; $i++) {
                        $wpdb->insert($table_tickets, ['user_id' => $target_id, 'prize_id' => $prize_id, 'ticket_number' => $start + $i, 'source' => 'bonus', 'status' => 'active']);
                    }
                    $wpdb->insert($table_admin_log, ['admin_user_id' => get_current_user_id(), 'action_type' => 'add_tickets', 'target_user_id' => $target_id, 'details' => json_encode(['amount' => $amount, 'prize_id' => $prize_id])]);
                    $message = "{$amount} biglietti regalati!";
                }
                break;
            case 'reset_streak':
                $value = max(0, intval($_POST['streak_value']));
                $wpdb->update($table_users, ['current_streak' => $value, 'last_streak_date' => $value > 0 ? current_time('Y-m-d') : null], ['id' => $target_id]);
                $wpdb->insert($table_admin_log, ['admin_user_id' => get_current_user_id(), 'action_type' => 'reset_streak', 'target_user_id' => $target_id, 'details' => json_encode(['value' => $value])]);
                $message = "Streak impostata a {$value}";
                break;
            case 'reset_password':
                $user = $wpdb->get_row($wpdb->prepare("SELECT email, username FROM {$table_users} WHERE id = %d", $target_id));
                if ($user) {
                    $new_pw = wp_generate_password(12, false);
                    $wpdb->update($table_users, ['password_hash' => password_hash($new_pw, PASSWORD_DEFAULT)], ['id' => $target_id]);
                    require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/EmailHelper.php';
                    $pw_body = "<tr><td style='padding:16px 40px;'>
<h2 style='color:#1a1a1a;margin:0 0 10px;font-size:26px;font-weight:700;'>Ciao {$user->username}!</h2>
<p style='color:#555;font-size:18px;line-height:1.6;margin:0 0 16px;'>La tua password è stata reimpostata.</p>
<div style='background:#FFF8F0;border:2px solid #FF6B00;border-radius:12px;padding:20px;text-align:center;'>
<div style='font-size:14px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;'>Nuova Password</div>
<div style='font-size:24px;font-weight:700;color:#FF6B00;font-family:Courier New,monospace;'>{$new_pw}</div>
</div>
<p style='color:#888;font-size:15px;line-height:1.6;margin:16px 0 0;'>Ti consigliamo di cambiarla al primo accesso.</p>
</td></tr>";
                    \RaffleMania\EmailHelper::send($user->email, 'RaffleMania - Nuova Password', $pw_body);
                    $wpdb->insert($table_admin_log, ['admin_user_id' => get_current_user_id(), 'action_type' => 'reset_password', 'target_user_id' => $target_id, 'details' => '{}']);
                    $message = "Password resettata e email inviata a {$user->email}";
                }
                break;
            case 'verify_email':
                $wpdb->update($table_users, ['email_verified' => 1, 'verification_token' => null, 'verification_token_expires' => null], ['id' => $target_id]);
                $wpdb->insert($table_admin_log, ['admin_user_id' => get_current_user_id(), 'action_type' => 'verify_email', 'target_user_id' => $target_id, 'details' => '{}']);
                $message = "Email verificata!";
                break;
            case 'ban':
                $ban_reason = sanitize_text_field($_POST['ban_reason'] ?? '');
                $wpdb->update($table_users, ['is_banned' => 1, 'ban_reason' => $ban_reason, 'is_active' => 0], ['id' => $target_id]);
                $wpdb->insert($table_admin_log, ['admin_user_id' => get_current_user_id(), 'action_type' => 'ban_user', 'target_user_id' => $target_id, 'details' => json_encode(['reason' => $ban_reason])]);
                $message = "Utente bannato.";
                break;
            case 'unban':
                $wpdb->update($table_users, ['is_banned' => 0, 'ban_reason' => null, 'is_active' => 1], ['id' => $target_id]);
                $wpdb->insert($table_admin_log, ['admin_user_id' => get_current_user_id(), 'action_type' => 'unban_user', 'target_user_id' => $target_id, 'details' => '{}']);
                $message = "Utente sbannato.";
                break;
            case 'save_notes':
                $wpdb->update($table_users, ['admin_notes' => sanitize_textarea_field($_POST['admin_notes'] ?? '')], ['id' => $target_id]);
                $message = "Note salvate.";
                break;
            case 'delete_user':
                $wpdb->update($table_users, ['username' => 'deleted_' . $target_id, 'email' => 'deleted_' . $target_id . '@deleted.local', 'password_hash' => '', 'avatar_url' => null, 'push_token' => null, 'is_active' => 0, 'is_banned' => 1, 'ban_reason' => 'Account eliminato', 'referral_code' => null, 'social_id' => null], ['id' => $target_id]);
                $wpdb->insert($table_admin_log, ['admin_user_id' => get_current_user_id(), 'action_type' => 'delete_user', 'target_user_id' => $target_id, 'details' => '{}']);
                $message = "Account anonimizzato ed eliminato.";
                break;
        }
    }
}

$view_user_id = isset($_GET['view']) ? intval($_GET['view']) : null;
$active_tab = sanitize_text_field($_GET['tab'] ?? 'tickets');

if ($view_user_id):
    $user = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_users} WHERE id = %d", $view_user_id));
    if (!$user) { echo '<div class="wrap"><h1>Utente non trovato</h1></div>'; return; }

    $tickets_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_tickets} WHERE user_id = %d", $view_user_id));
    $wins_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_winners} WHERE user_id = %d", $view_user_id));
    $referral_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_referrals} WHERE referrer_user_id = %d", $view_user_id));
    $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
    $active_prizes = $wpdb->get_results("SELECT id, name FROM {$table_prizes} WHERE is_active = 1 ORDER BY name");

    $tab_data = [];
    switch ($active_tab) {
        case 'tickets': $tab_data = $wpdb->get_results($wpdb->prepare("SELECT t.*, p.name as prize_name FROM {$table_tickets} t LEFT JOIN {$table_prizes} p ON t.prize_id = p.id WHERE t.user_id = %d ORDER BY t.created_at DESC LIMIT 100", $view_user_id)); break;
        case 'wins': $tab_data = $wpdb->get_results($wpdb->prepare("SELECT w.*, p.name as prize_name FROM {$table_winners} w LEFT JOIN {$table_prizes} p ON w.prize_id = p.id WHERE w.user_id = %d ORDER BY w.won_at DESC", $view_user_id)); break;
        case 'transactions': $tab_data = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$table_transactions} WHERE user_id = %d ORDER BY created_at DESC LIMIT 100", $view_user_id)); break;
        case 'streaks': $tab_data = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$table_streaks} WHERE user_id = %d ORDER BY claimed_at DESC LIMIT 50", $view_user_id)); break;
        case 'referrals': $tab_data = $wpdb->get_results($wpdb->prepare("SELECT r.*, u.username, u.email FROM {$table_referrals} r LEFT JOIN {$table_users} u ON r.referred_user_id = u.id WHERE r.referrer_user_id = %d ORDER BY r.created_at DESC", $view_user_id)); break;
        case 'admin_log': $tab_data = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$table_admin_log} WHERE target_user_id = %d ORDER BY created_at DESC LIMIT 50", $view_user_id)); break;
    }
?>
<div class="wrap">
    <h1><a href="<?php echo admin_url('admin.php?page=rafflemania-users'); ?>" class="button" style="margin-right:10px;">← Lista</a> Dettaglio Utente</h1>
    <?php if ($message): ?><div class="notice notice-success is-dismissible"><p><?php echo esc_html($message); ?></p></div><?php endif; ?>
    <?php if ($error): ?><div class="notice notice-error is-dismissible"><p><?php echo esc_html($error); ?></p></div><?php endif; ?>

    <style>
        .rm-grid{display:grid;grid-template-columns:350px 1fr;gap:24px;margin-top:20px}
        .rm-card{background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);padding:24px;margin-bottom:20px}
        .rm-card h3{margin-top:0;border-bottom:2px solid #FF6B00;padding-bottom:10px;display:flex;align-items:center;gap:8px}
        .rm-profile{text-align:center;padding:30px 24px}
        .rm-avatar-lg{width:80px;height:80px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:32px;margin-bottom:12px}
        .rm-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
        .rm-badge-s{background:#d4edda;color:#155724}.rm-badge-d{background:#f8d7da;color:#721c24}.rm-badge-w{background:#fff3cd;color:#856404}.rm-badge-p{background:#FF6B00;color:#fff}
        .rm-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0}.rm-row:last-child{border:0}
        .rm-lbl{color:#666}.rm-val{font-weight:700}
        .rm-act-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .rm-btn{display:flex;align-items:center;gap:8px;padding:10px 16px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;transition:.2s}
        .rm-btn:hover{border-color:#FF6B00;background:#fff8f0}.rm-btn.dng{border-color:#dc3545;color:#dc3545}.rm-btn.dng:hover{background:#fff5f5}
        .rm-tabs{display:flex;gap:0;border-bottom:2px solid #eee;margin-bottom:16px}
        .rm-tab{padding:10px 20px;text-decoration:none;color:#666;font-weight:600;border-bottom:3px solid transparent;margin-bottom:-2px;transition:.2s}.rm-tab:hover{color:#FF6B00}.rm-tab.on{color:#FF6B00;border-bottom-color:#FF6B00}
        .rm-tbl{width:100%;border-collapse:collapse}.rm-tbl th,.rm-tbl td{padding:10px 12px;text-align:left;border-bottom:1px solid #eee;font-size:13px}.rm-tbl th{background:#f9f9f9;font-weight:600}
        .rm-modal-bg{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:100000;align-items:center;justify-content:center}.rm-modal-bg.on{display:flex}
        .rm-modal{background:#fff;border-radius:16px;padding:30px;max-width:450px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,.2)}
        .rm-modal h3{margin-top:0}.rm-modal input,.rm-modal select,.rm-modal textarea{width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;box-sizing:border-box}
        .rm-modal-acts{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}
        .button-primary{background:#FF6B00!important;border-color:#FF6B00!important}.button-primary:hover{background:#e55d00!important;border-color:#e55d00!important}
        @media(max-width:1200px){.rm-grid{grid-template-columns:1fr}}
    </style>

    <div class="rm-grid">
        <div>
            <div class="rm-card rm-profile">
                <div class="rm-avatar-lg" style="background:<?php echo esc_attr($user->avatar_color ?: '#FF6B00'); ?>"><?php echo strtoupper(substr($user->username, 0, 1)); ?></div>
                <h2 style="margin:8px 0 4px"><?php echo esc_html($user->username); ?></h2>
                <p style="color:#666;margin:0"><?php echo esc_html($user->email); ?></p>
                <div style="margin-top:12px">
                    <span class="rm-badge rm-badge-p">Lv. <?php echo $user->level; ?></span>
                    <?php if (!empty($user->is_banned)): ?><span class="rm-badge rm-badge-d">Bannato</span>
                    <?php elseif ($user->is_active): ?><span class="rm-badge rm-badge-s">Attivo</span>
                    <?php else: ?><span class="rm-badge rm-badge-w">Inattivo</span><?php endif; ?>
                    <?php echo $user->email_verified ? '<span class="rm-badge rm-badge-s">Email OK</span>' : '<span class="rm-badge rm-badge-w">Email non verificata</span>'; ?>
                </div>
            </div>
            <div class="rm-card">
                <h3><span class="dashicons dashicons-chart-bar"></span> Statistiche</h3>
                <div class="rm-row"><span class="rm-lbl">XP</span><span class="rm-val"><?php echo number_format($user->xp); ?></span></div>
                <div class="rm-row"><span class="rm-lbl">Crediti</span><span class="rm-val"><?php echo number_format($user->credits); ?></span></div>
                <div class="rm-row"><span class="rm-lbl">Streak</span><span class="rm-val"><?php echo $user->current_streak; ?> 🔥</span></div>
                <div class="rm-row"><span class="rm-lbl">Biglietti</span><span class="rm-val"><?php echo number_format($tickets_count); ?></span></div>
                <div class="rm-row"><span class="rm-lbl">Vittorie</span><span class="rm-val"><?php echo number_format($wins_count); ?></span></div>
                <div class="rm-row"><span class="rm-lbl">Referral</span><span class="rm-val"><?php echo number_format($referral_count); ?></span></div>
                <div class="rm-row"><span class="rm-lbl">Codice</span><span class="rm-val"><code><?php echo esc_html($user->referral_code); ?></code></span></div>
                <div class="rm-row"><span class="rm-lbl">Provider</span><span class="rm-val"><?php echo esc_html($user->social_provider ?: 'Email'); ?></span></div>
                <div class="rm-row"><span class="rm-lbl">Registrato</span><span class="rm-val"><?php echo date('d/m/Y H:i', strtotime($user->created_at)); ?></span></div>
            </div>
            <div class="rm-card">
                <h3><span class="dashicons dashicons-admin-tools"></span> Azioni Rapide</h3>
                <div class="rm-act-grid">
                    <button class="rm-btn" onclick="openM('credits')">💰 Crediti</button>
                    <button class="rm-btn" onclick="openM('xp')">⭐ XP</button>
                    <button class="rm-btn" onclick="openM('tickets')">🎟️ Biglietti</button>
                    <button class="rm-btn" onclick="openM('streak')">🔥 Streak</button>
                    <button class="rm-btn" onclick="doAct('reset_password')">🔑 Reset PW</button>
                    <?php if (!$user->email_verified): ?><button class="rm-btn" onclick="doAct('verify_email')">✉️ Verifica</button><?php endif; ?>
                    <?php if (empty($user->is_banned)): ?><button class="rm-btn dng" onclick="openM('ban')">🚫 Banna</button>
                    <?php else: ?><button class="rm-btn" onclick="doAct('unban')">✅ Sbanna</button><?php endif; ?>
                    <button class="rm-btn dng" onclick="if(confirm('ATTENZIONE: Irreversibile!')){if(confirm('Confermi?')){doAct('delete_user')}}">🗑️ Elimina</button>
                </div>
            </div>
            <div class="rm-card">
                <h3><span class="dashicons dashicons-edit"></span> Note Interne</h3>
                <form method="post">
                    <?php wp_nonce_field('rafflemania_user_action', 'rafflemania_user_nonce'); ?>
                    <input type="hidden" name="user_action" value="save_notes">
                    <input type="hidden" name="target_user_id" value="<?php echo $view_user_id; ?>">
                    <textarea name="admin_notes" rows="4" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;resize:vertical"><?php echo esc_textarea($user->admin_notes ?? ''); ?></textarea>
                    <button type="submit" class="button button-primary" style="margin-top:8px">Salva Note</button>
                </form>
            </div>
        </div>
        <div>
            <div class="rm-card">
                <div class="rm-tabs">
                    <?php foreach (['tickets'=>'🎟️ Biglietti','wins'=>'🏆 Vittorie','transactions'=>'💳 Transazioni','streaks'=>'🔥 Streak','referrals'=>'👥 Referral','admin_log'=>'📋 Log'] as $k=>$l): ?>
                    <a href="<?php echo admin_url("admin.php?page=rafflemania-users&view={$view_user_id}&tab={$k}"); ?>" class="rm-tab <?php echo $active_tab===$k?'on':''; ?>"><?php echo $l; ?></a>
                    <?php endforeach; ?>
                </div>
                <?php if ($active_tab==='tickets'): ?>
                <table class="rm-tbl"><thead><tr><th>#</th><th>Premio</th><th>Fonte</th><th>Stato</th><th>Data</th></tr></thead><tbody>
                <?php foreach ($tab_data as $t): ?><tr><td>#<?php echo $t->ticket_number; ?></td><td><?php echo esc_html($t->prize_name); ?></td><td><span class="rm-badge rm-badge-p"><?php echo ucfirst($t->source); ?></span></td><td><span class="rm-badge rm-badge-<?php echo $t->status==='winner'?'s':($t->status==='active'?'p':'w'); ?>"><?php echo ucfirst($t->status); ?></span></td><td><?php echo date('d/m H:i', strtotime($t->created_at)); ?></td></tr><?php endforeach; ?>
                <?php if (empty($tab_data)): ?><tr><td colspan="5" style="text-align:center;padding:30px;color:#999">Nessun biglietto</td></tr><?php endif; ?>
                </tbody></table>
                <?php elseif ($active_tab==='wins'): ?>
                <table class="rm-tbl"><thead><tr><th>Premio</th><th>Riscosso</th><th>Data</th></tr></thead><tbody>
                <?php foreach ($tab_data as $w): ?><tr><td><?php echo esc_html($w->prize_name); ?></td><td><?php echo $w->claimed?'<span class="rm-badge rm-badge-s">Sì</span>':'<span class="rm-badge rm-badge-w">No</span>'; ?></td><td><?php echo date('d/m/Y H:i', strtotime($w->won_at)); ?></td></tr><?php endforeach; ?>
                <?php if (empty($tab_data)): ?><tr><td colspan="3" style="text-align:center;padding:30px;color:#999">Nessuna vittoria</td></tr><?php endif; ?>
                </tbody></table>
                <?php elseif ($active_tab==='transactions'): ?>
                <table class="rm-tbl"><thead><tr><th>Tipo</th><th>Importo</th><th>Descrizione</th><th>Data</th></tr></thead><tbody>
                <?php foreach ($tab_data as $tx): ?><tr><td><span class="rm-badge rm-badge-<?php echo $tx->type==='spend'?'d':'s'; ?>"><?php echo ucfirst($tx->type); ?></span></td><td style="font-weight:700;color:<?php echo $tx->amount>=0?'#155724':'#721c24'; ?>"><?php echo ($tx->amount>=0?'+':'').$tx->amount; ?></td><td><?php echo esc_html($tx->description); ?></td><td><?php echo date('d/m H:i', strtotime($tx->created_at)); ?></td></tr><?php endforeach; ?>
                <?php if (empty($tab_data)): ?><tr><td colspan="4" style="text-align:center;padding:30px;color:#999">Nessuna transazione</td></tr><?php endif; ?>
                </tbody></table>
                <?php elseif ($active_tab==='streaks'): ?>
                <table class="rm-tbl"><thead><tr><th>Giorno</th><th>XP</th><th>Crediti</th><th>Data</th></tr></thead><tbody>
                <?php foreach ($tab_data as $s): ?><tr><td>G. <?php echo $s->streak_day; ?></td><td>+<?php echo $s->xp_earned; ?></td><td><?php echo $s->credits_earned>0?"+{$s->credits_earned}":'-'; ?></td><td><?php echo date('d/m H:i', strtotime($s->claimed_at)); ?></td></tr><?php endforeach; ?>
                <?php if (empty($tab_data)): ?><tr><td colspan="4" style="text-align:center;padding:30px;color:#999">Nessun dato</td></tr><?php endif; ?>
                </tbody></table>
                <?php elseif ($active_tab==='referrals'): ?>
                <table class="rm-tbl"><thead><tr><th>Utente</th><th>Giorni</th><th>Completato</th><th>Reward</th><th>Data</th></tr></thead><tbody>
                <?php foreach ($tab_data as $r): ?><tr><td><?php echo esc_html($r->username); ?></td><td><?php echo $r->days_active; ?>/7</td><td><?php echo $r->days_active>=7?'<span class="rm-badge rm-badge-s">Sì</span>':'<span class="rm-badge rm-badge-w">In corso</span>'; ?></td><td><?php echo $r->reward_claimed?'<span class="rm-badge rm-badge-s">Sì</span>':'-'; ?></td><td><?php echo date('d/m/Y', strtotime($r->created_at)); ?></td></tr><?php endforeach; ?>
                <?php if (empty($tab_data)): ?><tr><td colspan="5" style="text-align:center;padding:30px;color:#999">Nessun referral</td></tr><?php endif; ?>
                </tbody></table>
                <?php elseif ($active_tab==='admin_log'): ?>
                <table class="rm-tbl"><thead><tr><th>Azione</th><th>Dettagli</th><th>Admin</th><th>Data</th></tr></thead><tbody>
                <?php foreach ($tab_data as $log): ?><tr><td><span class="rm-badge rm-badge-p"><?php echo esc_html($log->action_type); ?></span></td><td><code style="font-size:11px"><?php echo esc_html(substr($log->details,0,80)); ?></code></td><td><?php $wu=get_user_by('id',$log->admin_user_id); echo $wu?esc_html($wu->display_name):'#'.$log->admin_user_id; ?></td><td><?php echo date('d/m H:i', strtotime($log->created_at)); ?></td></tr><?php endforeach; ?>
                <?php if (empty($tab_data)): ?><tr><td colspan="4" style="text-align:center;padding:30px;color:#999">Nessun log</td></tr><?php endif; ?>
                </tbody></table>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <?php // Modals ?>
    <div id="m-credits" class="rm-modal-bg"><div class="rm-modal"><h3>💰 Aggiungi Crediti</h3><form method="post"><?php wp_nonce_field('rafflemania_user_action','rafflemania_user_nonce'); ?><input type="hidden" name="user_action" value="add_credits"><input type="hidden" name="target_user_id" value="<?php echo $view_user_id; ?>"><label style="font-weight:600;display:block;margin-bottom:4px">Quantità</label><input type="number" name="amount" min="1" required><label style="font-weight:600;display:block;margin-bottom:4px">Motivo</label><input type="text" name="reason" placeholder="Es. Compensazione"><div class="rm-modal-acts"><button type="button" class="button" onclick="closeM('credits')">Annulla</button><button type="submit" class="button button-primary">Aggiungi</button></div></form></div></div>
    <div id="m-xp" class="rm-modal-bg"><div class="rm-modal"><h3>⭐ Aggiungi XP</h3><form method="post"><?php wp_nonce_field('rafflemania_user_action','rafflemania_user_nonce'); ?><input type="hidden" name="user_action" value="add_xp"><input type="hidden" name="target_user_id" value="<?php echo $view_user_id; ?>"><label style="font-weight:600;display:block;margin-bottom:4px">Quantità XP</label><input type="number" name="amount" min="1" required><label style="font-weight:600;display:block;margin-bottom:4px">Motivo</label><input type="text" name="reason" placeholder="Evento speciale"><div class="rm-modal-acts"><button type="button" class="button" onclick="closeM('xp')">Annulla</button><button type="submit" class="button button-primary">Aggiungi</button></div></form></div></div>
    <div id="m-tickets" class="rm-modal-bg"><div class="rm-modal"><h3>🎟️ Regala Biglietti</h3><form method="post"><?php wp_nonce_field('rafflemania_user_action','rafflemania_user_nonce'); ?><input type="hidden" name="user_action" value="add_tickets"><input type="hidden" name="target_user_id" value="<?php echo $view_user_id; ?>"><label style="font-weight:600;display:block;margin-bottom:4px">Quantità</label><input type="number" name="amount" min="1" required><label style="font-weight:600;display:block;margin-bottom:4px">Premio</label><select name="prize_id" required><option value="">Seleziona...</option><?php foreach($active_prizes as $p): ?><option value="<?php echo $p->id; ?>"><?php echo esc_html($p->name); ?></option><?php endforeach; ?></select><div class="rm-modal-acts"><button type="button" class="button" onclick="closeM('tickets')">Annulla</button><button type="submit" class="button button-primary">Regala</button></div></form></div></div>
    <div id="m-streak" class="rm-modal-bg"><div class="rm-modal"><h3>🔥 Ripristina Streak</h3><form method="post"><?php wp_nonce_field('rafflemania_user_action','rafflemania_user_nonce'); ?><input type="hidden" name="user_action" value="reset_streak"><input type="hidden" name="target_user_id" value="<?php echo $view_user_id; ?>"><label style="font-weight:600;display:block;margin-bottom:4px">Valore</label><input type="number" name="streak_value" min="0" value="<?php echo $user->current_streak; ?>" required><div class="rm-modal-acts"><button type="button" class="button" onclick="closeM('streak')">Annulla</button><button type="submit" class="button button-primary">Imposta</button></div></form></div></div>
    <div id="m-ban" class="rm-modal-bg"><div class="rm-modal"><h3>🚫 Banna Utente</h3><form method="post"><?php wp_nonce_field('rafflemania_user_action','rafflemania_user_nonce'); ?><input type="hidden" name="user_action" value="ban"><input type="hidden" name="target_user_id" value="<?php echo $view_user_id; ?>"><label style="font-weight:600;display:block;margin-bottom:4px">Motivo</label><textarea name="ban_reason" rows="3" required></textarea><div class="rm-modal-acts"><button type="button" class="button" onclick="closeM('ban')">Annulla</button><button type="submit" class="button button-primary" style="background:#dc3545!important;border-color:#dc3545!important">Banna</button></div></form></div></div>
    <form id="act-form" method="post" style="display:none"><?php wp_nonce_field('rafflemania_user_action','rafflemania_user_nonce'); ?><input type="hidden" name="user_action" id="act-type"><input type="hidden" name="target_user_id" value="<?php echo $view_user_id; ?>"></form>

    <script>
    function openM(t){document.getElementById('m-'+t).classList.add('on')}
    function closeM(t){document.getElementById('m-'+t).classList.remove('on')}
    function doAct(a){if(!confirm('Confermi?'))return;document.getElementById('act-type').value=a;document.getElementById('act-form').submit()}
    document.querySelectorAll('.rm-modal-bg').forEach(function(e){e.addEventListener('click',function(ev){if(ev.target===e)e.classList.remove('on')})});
    </script>
</div>
<?php else:
// === USER LIST ===
$search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '';
$pg = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
$pp = 20; $off = ($pg - 1) * $pp;
$where = "1=1"; $params = [];
if ($search) { $where .= " AND (u.username LIKE %s OR u.email LIKE %s)"; $params[] = '%'.$wpdb->esc_like($search).'%'; $params[] = '%'.$wpdb->esc_like($search).'%'; }
$cq = "SELECT COUNT(*) FROM {$table_users} u WHERE {$where}";
$total = empty($params) ? $wpdb->get_var($cq) : $wpdb->get_var($wpdb->prepare($cq, ...$params));
$tp = ceil($total / $pp);
$ap = array_merge($params, [$pp, $off]);
$users = $wpdb->get_results($wpdb->prepare("SELECT u.*, (SELECT COUNT(*) FROM {$table_referrals} r WHERE r.referrer_user_id = u.id) as referral_count FROM {$table_users} u WHERE {$where} ORDER BY u.created_at DESC LIMIT %d OFFSET %d", ...$ap));
?>
<div class="wrap">
    <h1><span class="dashicons dashicons-groups" style="font-size:30px;margin-right:10px"></span> Utenti App</h1>
    <?php if ($message): ?><div class="notice notice-success is-dismissible"><p><?php echo esc_html($message); ?></p></div><?php endif; ?>
    <style>
        .rm-search{background:#fff;padding:16px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);margin:20px 0}
        .rm-tc{background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);max-height:650px;overflow-y:auto}
        .rm-tc::-webkit-scrollbar{width:6px}.rm-tc::-webkit-scrollbar-track{background:#f8f9fa}.rm-tc::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}
        .rm-tbl2{width:100%;border-collapse:collapse}.rm-tbl2 th,.rm-tbl2 td{padding:14px;text-align:left;border-bottom:1px solid #eee}.rm-tbl2 th{background:#f9f9f9;font-weight:600}
        .rm-tbl2 tbody tr{cursor:pointer;transition:.15s}.rm-tbl2 tbody tr:hover{background:#fff8f0}
        .rm-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
        .rm-badge-s{background:#d4edda;color:#155724}.rm-badge-d{background:#f8d7da;color:#721c24}.rm-badge-p{background:#FF6B00;color:#fff}
        .rm-av{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px}
        .rm-pg{margin-top:20px;text-align:center}
    </style>
    <div class="rm-search">
        <form method="get"><input type="hidden" name="page" value="rafflemania-users">
        <input type="text" name="s" value="<?php echo esc_attr($search); ?>" placeholder="Cerca username o email..." style="width:300px;padding:8px;border:1px solid #ddd;border-radius:8px">
        <button type="submit" class="button">Cerca</button>
        <?php if ($search): ?><a href="<?php echo admin_url('admin.php?page=rafflemania-users'); ?>" class="button">Reset</a><?php endif; ?>
        </form>
        <p style="margin-top:10px;color:#666">Totale: <strong><?php echo number_format($total); ?></strong> — Clicca per dettaglio</p>
    </div>
    <div class="rm-tc"><table class="rm-tbl2"><thead><tr><th></th><th>Username</th><th>Email</th><th>Lv</th><th>XP</th><th>Crediti</th><th>Streak</th><th>Ref</th><th>Data</th><th>Stato</th></tr></thead><tbody>
    <?php foreach ($users as $u): ?>
    <tr onclick="window.location='<?php echo admin_url('admin.php?page=rafflemania-users&view='.$u->id); ?>'">
        <td><div class="rm-av" style="background:<?php echo esc_attr($u->avatar_color?:'#FF6B00'); ?>"><?php echo strtoupper(substr($u->username,0,1)); ?></div></td>
        <td><strong><?php echo esc_html($u->username); ?></strong></td>
        <td><?php echo esc_html($u->email); ?></td>
        <td><span class="rm-badge rm-badge-p">Lv.<?php echo $u->level; ?></span></td>
        <td><?php echo number_format($u->xp); ?></td>
        <td><?php echo number_format($u->credits); ?></td>
        <td><?php echo $u->current_streak; ?>🔥</td>
        <td><?php echo $u->referral_count>0?'<span class="rm-badge rm-badge-s">'.$u->referral_count.'</span>':'<span style="color:#999">0</span>'; ?></td>
        <td><?php echo date('d/m/Y', strtotime($u->created_at)); ?></td>
        <td><?php if(!empty($u->is_banned)):?><span class="rm-badge rm-badge-d">Ban</span><?php elseif($u->is_active):?><span class="rm-badge rm-badge-s">OK</span><?php else:?><span class="rm-badge rm-badge-d">Off</span><?php endif;?></td>
    </tr>
    <?php endforeach; ?>
    </tbody></table></div>
    <?php if ($tp > 1): ?><div class="rm-pg"><?php echo paginate_links(['base'=>add_query_arg('paged','%#%'),'format'=>'','current'=>$pg,'total'=>$tp,'prev_text'=>'«','next_text'=>'»']); ?></div><?php endif; ?>
</div>
<?php endif; ?>

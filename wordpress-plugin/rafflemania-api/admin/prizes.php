<?php
if (!defined('ABSPATH')) exit;

global $wpdb;
$table_prizes = $wpdb->prefix . 'rafflemania_prizes';
$table_draws = $wpdb->prefix . 'rafflemania_draws';
$table_tickets = $wpdb->prefix . 'rafflemania_tickets';
$table_log = $wpdb->prefix . 'rafflemania_admin_actions_log';

// Handle form submissions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rafflemania_prize_nonce'])) {
    if (!wp_verify_nonce($_POST['rafflemania_prize_nonce'], 'rafflemania_prize_action')) {
        $error = 'Errore di sicurezza. Riprova.';
    } else {
        $action = $_POST['action_type'] ?? '';

        if ($action === 'create' || $action === 'update') {
            $data = [
                'name' => sanitize_text_field($_POST['name']),
                'description' => sanitize_textarea_field($_POST['description']),
                'image_url' => esc_url_raw($_POST['image_url']),
                'value' => floatval($_POST['value']),
                'goal_ads' => intval($_POST['goal_ads']),
                'timer_duration' => intval($_POST['timer_duration']),
                'is_active' => isset($_POST['is_active']) ? 1 : 0
            ];

            if ($action === 'create') {
                $data['timer_status'] = 'waiting';
                $data['current_ads'] = 0;
                $wpdb->insert($table_prizes, $data);
                $message = 'Premio creato con successo!';
            } else {
                $prize_id = intval($_POST['prize_id']);
                $wpdb->update($table_prizes, $data, ['id' => $prize_id]);
                $message = 'Premio aggiornato con successo!';
            }
        } elseif ($action === 'delete') {
            $prize_id = intval($_POST['prize_id']);
            $wpdb->delete($table_prizes, ['id' => $prize_id]);
            $message = 'Premio eliminato.';
        } elseif ($action === 'reset_timer') {
            $prize_id = intval($_POST['prize_id']);
            $wpdb->update($table_prizes, [
                'timer_status' => 'waiting',
                'current_ads' => 0,
                'scheduled_at' => null,
                'timer_started_at' => null
            ], ['id' => $prize_id]);
            // Log action
            $wpdb->insert($table_log, [
                'admin_user' => wp_get_current_user()->user_login,
                'action_type' => 'reset_timer',
                'target_type' => 'prize',
                'target_id' => $prize_id,
                'details' => 'Timer resettato manualmente',
                'created_at' => current_time('mysql')
            ]);
            $message = 'Timer resettato.';
        } elseif ($action === 'force_timer') {
            $prize_id = intval($_POST['prize_id']);
            $prize = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_prizes} WHERE id = %d", $prize_id));
            if ($prize && $prize->timer_status === 'waiting') {
                $scheduled_at = gmdate('Y-m-d H:i:s', time() + $prize->timer_duration);
                $wpdb->update($table_prizes, [
                    'timer_status' => 'countdown',
                    'timer_started_at' => current_time('mysql'),
                    'scheduled_at' => $scheduled_at
                ], ['id' => $prize_id]);
                $wpdb->insert($table_log, [
                    'admin_user' => wp_get_current_user()->user_login,
                    'action_type' => 'force_timer',
                    'target_type' => 'prize',
                    'target_id' => $prize_id,
                    'details' => "Timer forzato, estrazione programmata: {$scheduled_at}",
                    'created_at' => current_time('mysql')
                ]);
                $message = 'Timer avviato forzatamente! Estrazione programmata.';
            } else {
                $error = 'Il timer può essere forzato solo per premi in stato "waiting".';
            }
        } elseif ($action === 'force_extraction') {
            $prize_id = intval($_POST['prize_id']);
            $prize = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_prizes} WHERE id = %d", $prize_id));
            if ($prize && in_array($prize->timer_status, ['countdown', 'waiting'])) {
                // Get total tickets for this prize
                $total_tickets = (int) $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM {$table_tickets} WHERE prize_id = %d", $prize_id
                ));

                if ($total_tickets === 0) {
                    $error = 'Nessun biglietto per questo premio. Impossibile estrarre.';
                } else {
                    // Pick random winning number
                    $winning_number = rand(1, $total_tickets);
                    $draw_id = 'DRAW-' . strtoupper(substr(md5(uniqid()), 0, 8));

                    // Find winner
                    $winner = $wpdb->get_row($wpdb->prepare(
                        "SELECT user_id FROM {$table_tickets} WHERE prize_id = %d ORDER BY id ASC LIMIT 1 OFFSET %d",
                        $prize_id, $winning_number - 1
                    ));

                    // Create draw
                    $wpdb->insert($table_draws, [
                        'draw_id' => $draw_id,
                        'prize_id' => $prize_id,
                        'winning_number' => $winning_number,
                        'winner_user_id' => $winner ? $winner->user_id : null,
                        'total_tickets' => $total_tickets,
                        'status' => 'completed',
                        'extracted_at' => current_time('mysql')
                    ]);

                    // Update prize status
                    $wpdb->update($table_prizes, [
                        'timer_status' => 'completed',
                        'is_active' => 0
                    ], ['id' => $prize_id]);

                    // Log action
                    $wpdb->insert($table_log, [
                        'admin_user' => wp_get_current_user()->user_login,
                        'action_type' => 'force_extraction',
                        'target_type' => 'prize',
                        'target_id' => $prize_id,
                        'details' => "Estrazione forzata: {$draw_id}, vincitore: " . ($winner ? $winner->user_id : 'nessuno') . ", biglietto #{$winning_number}/{$total_tickets}",
                        'created_at' => current_time('mysql')
                    ]);

                    $message = "Estrazione forzata completata! Draw ID: {$draw_id}";
                }
            } else {
                $error = 'Estrazione forzata non disponibile per questo stato.';
            }
        }
    }
}

// Get prizes
$prizes = $wpdb->get_results("SELECT * FROM {$table_prizes} ORDER BY created_at DESC");

// Stats
$stats = [
    'total' => count($prizes),
    'active' => 0,
    'countdown' => 0,
    'completed' => 0,
    'total_value' => 0
];
foreach ($prizes as $p) {
    if ($p->is_active) $stats['active']++;
    if ($p->timer_status === 'countdown') $stats['countdown']++;
    if ($p->timer_status === 'completed') $stats['completed']++;
    $stats['total_value'] += $p->value;
}

// Edit mode
$editing = null;
if (isset($_GET['edit'])) {
    $edit_id = intval($_GET['edit']);
    $editing = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_prizes} WHERE id = %d", $edit_id));
}
?>

<div class="wrap rafflemania-prizes-wrap">
    <h1>
        <span class="dashicons dashicons-gift" style="font-size: 30px; margin-right: 10px; color: #FF6B00;"></span>
        Gestione Premi
    </h1>

    <?php if ($message): ?>
    <div class="rafflemania-toast rafflemania-toast-success" id="toast-msg">
        <span class="dashicons dashicons-yes-alt"></span> <?php echo esc_html($message); ?>
    </div>
    <?php endif; ?>

    <?php if ($error): ?>
    <div class="rafflemania-toast rafflemania-toast-error" id="toast-err">
        <span class="dashicons dashicons-warning"></span> <?php echo esc_html($error); ?>
    </div>
    <?php endif; ?>

    <style>
        .rafflemania-prizes-wrap { }

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
        .rafflemania-toast-error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }

        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; visibility: hidden; } }

        /* Stats cards */
        .rafflemania-stats-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .rafflemania-stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            text-align: center;
            transition: transform 0.2s;
        }
        .rafflemania-stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
        .rafflemania-stat-card .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #FF6B00;
        }
        .rafflemania-stat-card .stat-label {
            font-size: 13px;
            color: #666;
            margin-top: 4px;
        }

        /* Form */
        .rafflemania-form {
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            margin-bottom: 24px;
        }
        .rafflemania-form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
        }
        .rafflemania-form h2 {
            margin-top: 0;
            border-bottom: 2px solid #FF6B00;
            padding-bottom: 12px;
            color: #333;
        }
        .rafflemania-form-row {
            margin-bottom: 16px;
        }
        .rafflemania-form-row label {
            display: block;
            font-weight: 600;
            margin-bottom: 6px;
            color: #444;
        }
        .rafflemania-form-row input[type="text"],
        .rafflemania-form-row input[type="number"],
        .rafflemania-form-row input[type="url"],
        .rafflemania-form-row textarea {
            width: 100%;
            padding: 10px 14px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
        }
        .rafflemania-form-row input:focus,
        .rafflemania-form-row textarea:focus {
            border-color: #FF6B00;
            outline: none;
            box-shadow: 0 0 0 3px rgba(255,107,0,0.1);
        }
        .rafflemania-form-row textarea { min-height: 100px; resize: vertical; }

        /* Prize cards */
        .rafflemania-prize-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 20px;
        }
        .rafflemania-prize-card {
            background: white;
            border-radius: 14px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .rafflemania-prize-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .rafflemania-prize-card-header {
            display: flex;
            gap: 16px;
            padding: 20px;
            border-bottom: 1px solid #f0f0f0;
        }
        .rafflemania-prize-card-header img {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 10px;
            flex-shrink: 0;
        }
        .rafflemania-prize-card-header .prize-info { flex: 1; }
        .rafflemania-prize-card-header .prize-name {
            font-size: 17px;
            font-weight: 700;
            color: #222;
            margin: 0 0 4px;
        }
        .rafflemania-prize-card-header .prize-value {
            font-size: 22px;
            font-weight: 700;
            color: #FF6B00;
        }
        .rafflemania-prize-card-body { padding: 16px 20px; }
        .rafflemania-prize-card-footer {
            padding: 14px 20px;
            background: #fafafa;
            border-top: 1px solid #f0f0f0;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        /* Progress bar */
        .rafflemania-progress {
            background: #e9ecef;
            border-radius: 10px;
            height: 24px;
            overflow: hidden;
            position: relative;
        }
        .rafflemania-progress-bar {
            background: linear-gradient(90deg, #FF6B00, #FF8C00);
            height: 100%;
            border-radius: 10px;
            text-align: center;
            color: white;
            font-size: 11px;
            line-height: 24px;
            font-weight: 700;
            transition: width 0.5s ease;
        }
        .rafflemania-progress-bar.full {
            background: linear-gradient(90deg, #28a745, #20c997);
        }

        /* Timer countdown */
        .rafflemania-countdown {
            background: linear-gradient(135deg, #FF6B00, #FF8C00);
            color: white;
            padding: 10px 16px;
            border-radius: 8px;
            text-align: center;
            font-size: 13px;
            margin-top: 10px;
        }
        .rafflemania-countdown .countdown-time {
            font-size: 20px;
            font-weight: 700;
            font-family: 'Courier New', monospace;
            letter-spacing: 1px;
        }

        /* Badges */
        .rafflemania-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .rafflemania-badge-success { background: #d4edda; color: #155724; }
        .rafflemania-badge-warning { background: #fff3cd; color: #856404; }
        .rafflemania-badge-danger { background: #f8d7da; color: #721c24; }
        .rafflemania-badge-primary { background: #FF6B00; color: white; }
        .rafflemania-badge-info { background: #d1ecf1; color: #0c5460; }

        /* Buttons */
        .rafflemania-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 6px 14px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
        }
        .rafflemania-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .rafflemania-btn-primary { background: #FF6B00; color: white; }
        .rafflemania-btn-success { background: #28a745; color: white; }
        .rafflemania-btn-warning { background: #ffc107; color: #333; }
        .rafflemania-btn-danger { background: #dc3545; color: white; }
        .rafflemania-btn-secondary { background: #6c757d; color: white; }
        .rafflemania-btn-outline { background: transparent; border: 2px solid #FF6B00; color: #FF6B00; }

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

        /* No image placeholder */
        .prize-no-image {
            width: 80px;
            height: 80px;
            background: #f0f0f0;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ccc;
            font-size: 30px;
            flex-shrink: 0;
        }

        .prize-meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
            color: #666;
        }
    </style>

    <!-- Stats Row -->
    <div class="rafflemania-stats-row">
        <div class="rafflemania-stat-card">
            <div class="stat-value"><?php echo $stats['total']; ?></div>
            <div class="stat-label">Premi Totali</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="stat-value" style="color: #28a745;"><?php echo $stats['active']; ?></div>
            <div class="stat-label">Attivi</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="stat-value" style="color: #FF6B00;"><?php echo $stats['countdown']; ?></div>
            <div class="stat-label">In Countdown</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="stat-value" style="color: #6c757d;"><?php echo $stats['completed']; ?></div>
            <div class="stat-label">Completati</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="stat-value">&euro;<?php echo number_format($stats['total_value'], 0); ?></div>
            <div class="stat-label">Valore Totale</div>
        </div>
    </div>

    <!-- Add/Edit Form -->
    <div class="rafflemania-form">
        <h2><?php echo $editing ? 'Modifica Premio' : 'Aggiungi Nuovo Premio'; ?></h2>
        <form method="post">
            <?php wp_nonce_field('rafflemania_prize_action', 'rafflemania_prize_nonce'); ?>
            <input type="hidden" name="action_type" value="<?php echo $editing ? 'update' : 'create'; ?>">
            <?php if ($editing): ?>
            <input type="hidden" name="prize_id" value="<?php echo $editing->id; ?>">
            <?php endif; ?>

            <div class="rafflemania-form-grid">
                <div class="rafflemania-form-row">
                    <label>Nome Premio *</label>
                    <input type="text" name="name" required value="<?php echo esc_attr($editing->name ?? ''); ?>">
                </div>

                <div class="rafflemania-form-row">
                    <label>URL Immagine</label>
                    <input type="url" name="image_url" value="<?php echo esc_url($editing->image_url ?? ''); ?>">
                </div>

                <div class="rafflemania-form-row">
                    <label>Valore (&euro;)</label>
                    <input type="number" name="value" step="0.01" min="0" value="<?php echo esc_attr($editing->value ?? 0); ?>">
                </div>

                <div class="rafflemania-form-row">
                    <label>Goal Biglietti (per avviare il timer)</label>
                    <input type="number" name="goal_ads" min="1" value="<?php echo esc_attr($editing->goal_ads ?? 100); ?>">
                </div>

                <div class="rafflemania-form-row">
                    <label>
                        <input type="checkbox" name="is_active" <?php checked($editing->is_active ?? true, 1); ?>>
                        Premio Attivo
                    </label>
                </div>
                <input type="hidden" name="timer_duration" value="86400">
            </div>

            <div class="rafflemania-form-row" style="margin-top: 16px;">
                <label>Descrizione</label>
                <textarea name="description"><?php echo esc_textarea($editing->description ?? ''); ?></textarea>
            </div>

            <button type="submit" class="button button-primary"><?php echo $editing ? 'Aggiorna' : 'Crea Premio'; ?></button>
            <?php if ($editing): ?>
            <a href="<?php echo admin_url('admin.php?page=rafflemania-prizes'); ?>" class="button">Annulla</a>
            <?php endif; ?>
        </form>
    </div>

    <!-- Prize Cards -->
    <?php if (empty($prizes)): ?>
    <div class="rafflemania-form" style="text-align: center; padding: 60px;">
        <span class="dashicons dashicons-gift" style="font-size: 48px; color: #ccc;"></span>
        <p style="color: #999; margin-top: 12px;">Nessun premio ancora. Creane uno!</p>
    </div>
    <?php else: ?>
    <div class="rafflemania-prize-grid">
        <?php foreach ($prizes as $prize): ?>
        <?php
        $progress = $prize->goal_ads > 0 ? min(100, round(($prize->current_ads / $prize->goal_ads) * 100)) : 0;
        $is_full = $progress >= 100;
        $has_countdown = $prize->timer_status === 'countdown' && $prize->scheduled_at;
        $scheduled_ts = $has_countdown ? strtotime($prize->scheduled_at) : 0;
        $remaining = $has_countdown ? max(0, $scheduled_ts - time()) : 0;

        // Get ticket count for this prize
        $ticket_count = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table_tickets} WHERE prize_id = %d", $prize->id
        ));
        ?>
        <div class="rafflemania-prize-card">
            <!-- Header -->
            <div class="rafflemania-prize-card-header">
                <?php if ($prize->image_url): ?>
                <img src="<?php echo esc_url($prize->image_url); ?>" alt="<?php echo esc_attr($prize->name); ?>">
                <?php else: ?>
                <div class="prize-no-image"><span class="dashicons dashicons-gift"></span></div>
                <?php endif; ?>
                <div class="prize-info">
                    <p class="prize-name"><?php echo esc_html($prize->name); ?></p>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                        <span class="prize-value">&euro;<?php echo number_format($prize->value, 2); ?></span>
                        <?php if ($prize->is_active): ?>
                        <span class="rafflemania-badge rafflemania-badge-success">Attivo</span>
                        <?php else: ?>
                        <span class="rafflemania-badge rafflemania-badge-danger">Inattivo</span>
                        <?php endif; ?>
                    </div>
                    <div style="margin-top: 6px;">
                        <?php
                        $badge_class = 'rafflemania-badge-warning';
                        $status_label = 'In Attesa';
                        if ($prize->timer_status === 'countdown') { $badge_class = 'rafflemania-badge-primary'; $status_label = 'Countdown'; }
                        if ($prize->timer_status === 'extracting') { $badge_class = 'rafflemania-badge-info'; $status_label = 'Estrazione...'; }
                        if ($prize->timer_status === 'completed') { $badge_class = 'rafflemania-badge-success'; $status_label = 'Completato'; }
                        ?>
                        <span class="rafflemania-badge <?php echo $badge_class; ?>"><?php echo $status_label; ?></span>
                    </div>
                </div>
            </div>

            <!-- Body -->
            <div class="rafflemania-prize-card-body">
                <!-- Progress -->
                <div class="prize-meta-row">
                    <span>Progresso Biglietti</span>
                    <strong><?php echo $prize->current_ads; ?> / <?php echo $prize->goal_ads; ?></strong>
                </div>
                <div class="rafflemania-progress">
                    <div class="rafflemania-progress-bar <?php echo $is_full ? 'full' : ''; ?>" style="width: <?php echo $progress; ?>%">
                        <?php echo $progress; ?>%
                    </div>
                </div>

                <div class="prize-meta-row" style="margin-top: 10px;">
                    <span>Biglietti Venduti</span>
                    <strong><?php echo number_format($ticket_count); ?></strong>
                </div>

                <!-- Countdown Timer -->
                <?php if ($has_countdown && $remaining > 0): ?>
                <div class="rafflemania-countdown" data-target="<?php echo $scheduled_ts; ?>">
                    <div style="font-size: 11px; margin-bottom: 4px;">Estrazione tra</div>
                    <div class="countdown-time" data-countdown="<?php echo $scheduled_ts; ?>">
                        <?php
                        $h = floor($remaining / 3600);
                        $m = floor(($remaining % 3600) / 60);
                        $s = $remaining % 60;
                        printf('%02d:%02d:%02d', $h, $m, $s);
                        ?>
                    </div>
                    <div style="font-size: 11px; margin-top: 4px;">
                        <?php echo date('d/m/Y H:i', $scheduled_ts); ?>
                    </div>
                </div>
                <?php elseif ($prize->timer_status === 'completed'): ?>
                <div style="background: #d4edda; color: #155724; padding: 10px 16px; border-radius: 8px; text-align: center; margin-top: 10px; font-weight: 600;">
                    Estrazione completata
                </div>
                <?php endif; ?>
            </div>

            <!-- Footer Actions -->
            <div class="rafflemania-prize-card-footer">
                <a href="<?php echo admin_url('admin.php?page=rafflemania-prizes&edit=' . $prize->id); ?>" class="rafflemania-btn rafflemania-btn-outline">
                    <span class="dashicons dashicons-edit" style="font-size: 14px;"></span> Modifica
                </a>

                <?php if ($prize->timer_status === 'waiting'): ?>
                <form method="post" style="display:inline;" onsubmit="return confirm('Avviare il timer forzatamente? Il countdown partira subito.');">
                    <?php wp_nonce_field('rafflemania_prize_action', 'rafflemania_prize_nonce'); ?>
                    <input type="hidden" name="action_type" value="force_timer">
                    <input type="hidden" name="prize_id" value="<?php echo $prize->id; ?>">
                    <button type="submit" class="rafflemania-btn rafflemania-btn-warning">
                        <span class="dashicons dashicons-clock" style="font-size: 14px;"></span> Forza Timer
                    </button>
                </form>
                <?php endif; ?>

                <?php if (in_array($prize->timer_status, ['waiting', 'countdown']) && $ticket_count > 0): ?>
                <form method="post" style="display:inline;" onsubmit="return confirm('ATTENZIONE: Estrarre immediatamente? Questa azione e irreversibile!');">
                    <?php wp_nonce_field('rafflemania_prize_action', 'rafflemania_prize_nonce'); ?>
                    <input type="hidden" name="action_type" value="force_extraction">
                    <input type="hidden" name="prize_id" value="<?php echo $prize->id; ?>">
                    <button type="submit" class="rafflemania-btn rafflemania-btn-danger">
                        <span class="dashicons dashicons-randomize" style="font-size: 14px;"></span> Forza Estrazione
                    </button>
                </form>
                <?php endif; ?>

                <form method="post" style="display:inline;" onsubmit="return confirm('Resettare il timer e il progresso?');">
                    <?php wp_nonce_field('rafflemania_prize_action', 'rafflemania_prize_nonce'); ?>
                    <input type="hidden" name="action_type" value="reset_timer">
                    <input type="hidden" name="prize_id" value="<?php echo $prize->id; ?>">
                    <button type="submit" class="rafflemania-btn rafflemania-btn-secondary">
                        <span class="dashicons dashicons-image-rotate" style="font-size: 14px;"></span> Reset
                    </button>
                </form>

                <form method="post" style="display:inline;" onsubmit="return confirm('Eliminare questo premio definitivamente?');">
                    <?php wp_nonce_field('rafflemania_prize_action', 'rafflemania_prize_nonce'); ?>
                    <input type="hidden" name="action_type" value="delete">
                    <input type="hidden" name="prize_id" value="<?php echo $prize->id; ?>">
                    <button type="submit" class="rafflemania-btn" style="color: #dc3545; background: transparent;">
                        <span class="dashicons dashicons-trash" style="font-size: 14px;"></span>
                    </button>
                </form>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</div>

<script>
// Live countdown timers
function updateCountdowns() {
    document.querySelectorAll('[data-countdown]').forEach(function(el) {
        var target = parseInt(el.getAttribute('data-countdown'));
        var now = Math.floor(Date.now() / 1000);
        var remaining = target - now;

        if (remaining <= 0) {
            el.textContent = '00:00:00';
            el.closest('.rafflemania-countdown').style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
            el.closest('.rafflemania-countdown').querySelector('div').textContent = 'Estrazione imminente!';
            return;
        }

        var h = Math.floor(remaining / 3600);
        var m = Math.floor((remaining % 3600) / 60);
        var s = remaining % 60;
        el.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    });
}

setInterval(updateCountdowns, 1000);

// Auto-dismiss toasts
setTimeout(function() {
    var toasts = document.querySelectorAll('.rafflemania-toast');
    toasts.forEach(function(t) { t.style.display = 'none'; });
}, 4000);
</script>

<?php
if (!defined('ABSPATH')) exit;

global $wpdb;
$table_prizes = $wpdb->prefix . 'rafflemania_prizes';

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
            $message = 'Timer resettato.';
        }
    }
}

// Get prizes
$prizes = $wpdb->get_results("SELECT * FROM {$table_prizes} ORDER BY created_at DESC");

// Edit mode
$editing = null;
if (isset($_GET['edit'])) {
    $edit_id = intval($_GET['edit']);
    $editing = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_prizes} WHERE id = %d", $edit_id));
}
?>

<div class="wrap">
    <h1>
        <span class="dashicons dashicons-gift" style="font-size: 30px; margin-right: 10px;"></span>
        Gestione Premi
    </h1>

    <?php if ($message): ?>
    <div class="notice notice-success is-dismissible"><p><?php echo esc_html($message); ?></p></div>
    <?php endif; ?>

    <?php if ($error): ?>
    <div class="notice notice-error is-dismissible"><p><?php echo esc_html($error); ?></p></div>
    <?php endif; ?>

    <style>
        .rafflemania-form {
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            margin-bottom: 24px;
        }
        .rafflemania-form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
        }
        .rafflemania-form h2 {
            margin-top: 0;
            border-bottom: 2px solid #FF6B00;
            padding-bottom: 12px;
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
        .rafflemania-form-row input[type="url"],
        .rafflemania-form-row textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
        }
        .rafflemania-form-row textarea {
            min-height: 100px;
        }
        .rafflemania-table-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        .rafflemania-table {
            width: 100%;
            border-collapse: collapse;
        }
        .rafflemania-table th,
        .rafflemania-table td {
            padding: 14px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        .rafflemania-table th {
            background: #f9f9f9;
            font-weight: 600;
        }
        .rafflemania-table img {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
        }
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
        .rafflemania-progress {
            background: #e9ecef;
            border-radius: 10px;
            height: 20px;
            overflow: hidden;
            min-width: 100px;
        }
        .rafflemania-progress-bar {
            background: linear-gradient(90deg, #FF6B00, #FF8500);
            height: 100%;
            border-radius: 10px;
            text-align: center;
            color: white;
            font-size: 11px;
            line-height: 20px;
            font-weight: 600;
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
                    <label>Valore (€)</label>
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
                <!-- Timer duration fixed at 24 hours (86400 seconds) for all prizes -->
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

    <!-- Prizes List -->
    <div class="rafflemania-table-container">
        <table class="rafflemania-table">
            <thead>
                <tr>
                    <th>Immagine</th>
                    <th>Nome</th>
                    <th>Valore</th>
                    <th>Progresso</th>
                    <th>Stato Timer</th>
                    <th>Attivo</th>
                    <th>Azioni</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($prizes as $prize): ?>
                <?php
                $progress = $prize->goal_ads > 0 ? min(100, round(($prize->current_ads / $prize->goal_ads) * 100)) : 0;
                ?>
                <tr>
                    <td>
                        <?php if ($prize->image_url): ?>
                        <img src="<?php echo esc_url($prize->image_url); ?>" alt="">
                        <?php else: ?>
                        <span style="color:#ccc;">Nessuna</span>
                        <?php endif; ?>
                    </td>
                    <td><strong><?php echo esc_html($prize->name); ?></strong></td>
                    <td>€<?php echo number_format($prize->value, 2); ?></td>
                    <td>
                        <div class="rafflemania-progress">
                            <div class="rafflemania-progress-bar" style="width: <?php echo $progress; ?>%">
                                <?php echo $prize->current_ads; ?>/<?php echo $prize->goal_ads; ?>
                            </div>
                        </div>
                    </td>
                    <td>
                        <?php
                        $badge_class = 'rafflemania-badge-warning';
                        if ($prize->timer_status === 'countdown') $badge_class = 'rafflemania-badge-primary';
                        if ($prize->timer_status === 'extracting') $badge_class = 'rafflemania-badge-danger';
                        if ($prize->timer_status === 'completed') $badge_class = 'rafflemania-badge-success';
                        ?>
                        <span class="rafflemania-badge <?php echo $badge_class; ?>">
                            <?php echo ucfirst($prize->timer_status); ?>
                        </span>
                        <?php if ($prize->scheduled_at && $prize->timer_status === 'countdown'): ?>
                        <br><small><?php echo date('d/m H:i', strtotime($prize->scheduled_at)); ?></small>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php if ($prize->is_active): ?>
                        <span class="rafflemania-badge rafflemania-badge-success">Sì</span>
                        <?php else: ?>
                        <span class="rafflemania-badge rafflemania-badge-danger">No</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <a href="<?php echo admin_url('admin.php?page=rafflemania-prizes&edit=' . $prize->id); ?>" class="button button-small">Modifica</a>
                        <form method="post" style="display:inline;" onsubmit="return confirm('Resettare il timer?');">
                            <?php wp_nonce_field('rafflemania_prize_action', 'rafflemania_prize_nonce'); ?>
                            <input type="hidden" name="action_type" value="reset_timer">
                            <input type="hidden" name="prize_id" value="<?php echo $prize->id; ?>">
                            <button type="submit" class="button button-small">Reset</button>
                        </form>
                        <form method="post" style="display:inline;" onsubmit="return confirm('Eliminare questo premio?');">
                            <?php wp_nonce_field('rafflemania_prize_action', 'rafflemania_prize_nonce'); ?>
                            <input type="hidden" name="action_type" value="delete">
                            <input type="hidden" name="prize_id" value="<?php echo $prize->id; ?>">
                            <button type="submit" class="button button-small" style="color:#dc3545;">Elimina</button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php
if (!defined('ABSPATH')) exit;

global $wpdb;
$table_draws = $wpdb->prefix . 'rafflemania_draws';
$table_prizes = $wpdb->prefix . 'rafflemania_prizes';
$table_users = $wpdb->prefix . 'rafflemania_users';

$draws = $wpdb->get_results(
    "SELECT d.*, p.name as prize_name, p.image_url as prize_image, u.username as winner_username
     FROM {$table_draws} d
     LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
     LEFT JOIN {$table_users} u ON d.winner_user_id = u.id
     ORDER BY d.extracted_at DESC
     LIMIT 100"
);
?>

<div class="wrap">
    <h1>
        <span class="dashicons dashicons-randomize" style="font-size: 30px; margin-right: 10px;"></span>
        Estrazioni
    </h1>

    <style>
        .rafflemania-table-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            overflow: hidden;
            margin-top: 20px;
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
        .rafflemania-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .rafflemania-badge-success { background: #d4edda; color: #155724; }
        .rafflemania-badge-warning { background: #fff3cd; color: #856404; }
        .rafflemania-badge-primary { background: #FF6B00; color: white; }
    </style>

    <div class="rafflemania-table-container">
        <table class="rafflemania-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Premio</th>
                    <th>Numero Vincente</th>
                    <th>Vincitore</th>
                    <th>Biglietti Totali</th>
                    <th>Data Estrazione</th>
                    <th>Stato</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($draws)): ?>
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">Nessuna estrazione ancora.</td>
                </tr>
                <?php else: ?>
                <?php foreach ($draws as $draw): ?>
                <tr>
                    <td><code><?php echo esc_html($draw->draw_id); ?></code></td>
                    <td><strong><?php echo esc_html($draw->prize_name); ?></strong></td>
                    <td><span class="rafflemania-badge rafflemania-badge-primary">#<?php echo $draw->winning_number; ?></span></td>
                    <td>
                        <?php if ($draw->winner_username): ?>
                        <strong><?php echo esc_html($draw->winner_username); ?></strong>
                        <?php else: ?>
                        <span style="color: #999;">Nessun vincitore</span>
                        <?php endif; ?>
                    </td>
                    <td><?php echo number_format($draw->total_tickets); ?></td>
                    <td><?php echo $draw->extracted_at ? date('d/m/Y H:i', strtotime($draw->extracted_at)) : '-'; ?></td>
                    <td>
                        <span class="rafflemania-badge rafflemania-badge-<?php echo $draw->status === 'completed' ? 'success' : 'warning'; ?>">
                            <?php echo ucfirst($draw->status); ?>
                        </span>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php
if (!defined('ABSPATH')) exit;

global $wpdb;
$table_winners = $wpdb->prefix . 'rafflemania_winners';
$table_prizes = $wpdb->prefix . 'rafflemania_prizes';
$table_users = $wpdb->prefix . 'rafflemania_users';

$winners = $wpdb->get_results(
    "SELECT w.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
            u.username, u.email
     FROM {$table_winners} w
     LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
     LEFT JOIN {$table_users} u ON w.user_id = u.id
     ORDER BY w.won_at DESC
     LIMIT 100"
);
?>

<div class="wrap">
    <h1>
        <span class="dashicons dashicons-awards" style="font-size: 30px; margin-right: 10px;"></span>
        Vincitori
    </h1>

    <style>
        .rafflemania-table-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            margin-top: 20px;
            max-height: 650px;
            overflow-y: auto;
        }
        .rafflemania-table-container::-webkit-scrollbar { width: 6px; }
        .rafflemania-table-container::-webkit-scrollbar-track { background: #f8f9fa; }
        .rafflemania-table-container::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        .rafflemania-table-container::-webkit-scrollbar-thumb:hover { background: #ccc; }
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
            width: 50px;
            height: 50px;
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
        .rafflemania-address {
            background: #f9f9f9;
            padding: 10px;
            border-radius: 6px;
            font-size: 12px;
            max-width: 200px;
        }
    </style>

    <div class="rafflemania-table-container">
        <table class="rafflemania-table">
            <thead>
                <tr>
                    <th>Premio</th>
                    <th>Vincitore</th>
                    <th>Email</th>
                    <th>Valore</th>
                    <th>Data Vincita</th>
                    <th>Stato</th>
                    <th>Indirizzo Spedizione</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($winners)): ?>
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">Nessun vincitore ancora.</td>
                </tr>
                <?php else: ?>
                <?php foreach ($winners as $winner): ?>
                <?php $address = $winner->shipping_address ? json_decode($winner->shipping_address, true) : null; ?>
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
                    <td>€<?php echo number_format($winner->prize_value, 2); ?></td>
                    <td><?php echo date('d/m/Y H:i', strtotime($winner->won_at)); ?></td>
                    <td>
                        <?php if ($winner->claimed): ?>
                        <span class="rafflemania-badge rafflemania-badge-success">Riscosso</span>
                        <br><small><?php echo date('d/m/Y', strtotime($winner->claimed_at)); ?></small>
                        <?php else: ?>
                        <span class="rafflemania-badge rafflemania-badge-warning">Da Riscuotere</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php if ($address): ?>
                        <div class="rafflemania-address">
                            <?php echo esc_html($address['fullName'] ?? ''); ?><br>
                            <?php echo esc_html($address['address'] ?? ''); ?><br>
                            <?php echo esc_html(($address['postalCode'] ?? '') . ' ' . ($address['city'] ?? '')); ?><br>
                            <?php echo esc_html($address['country'] ?? ''); ?>
                            <?php if (!empty($address['phone'])): ?>
                            <br>Tel: <?php echo esc_html($address['phone']); ?>
                            <?php endif; ?>
                        </div>
                        <?php else: ?>
                        <span style="color: #999;">-</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

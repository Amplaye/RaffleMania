<?php
if (!defined('ABSPATH')) exit;

global $wpdb;

// Get stats
$table_users = $wpdb->prefix . 'rafflemania_users';
$table_prizes = $wpdb->prefix . 'rafflemania_prizes';
$table_tickets = $wpdb->prefix . 'rafflemania_tickets';
$table_draws = $wpdb->prefix . 'rafflemania_draws';
$table_winners = $wpdb->prefix . 'rafflemania_winners';

$total_users = $wpdb->get_var("SELECT COUNT(*) FROM {$table_users}");
$total_prizes = $wpdb->get_var("SELECT COUNT(*) FROM {$table_prizes} WHERE is_active = 1");
$total_tickets = $wpdb->get_var("SELECT COUNT(*) FROM {$table_tickets}");
$total_draws = $wpdb->get_var("SELECT COUNT(*) FROM {$table_draws}");
$total_winners = $wpdb->get_var("SELECT COUNT(*) FROM {$table_winners}");

// Recent activity
$recent_winners = $wpdb->get_results(
    "SELECT w.*, u.username, p.name as prize_name
     FROM {$table_winners} w
     LEFT JOIN {$table_users} u ON w.user_id = u.id
     LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
     ORDER BY w.won_at DESC
     LIMIT 5"
);

$active_timers = $wpdb->get_results(
    "SELECT * FROM {$table_prizes}
     WHERE timer_status = 'countdown'
     ORDER BY scheduled_at ASC"
);
?>

<div class="wrap">
    <h1>
        <span class="dashicons dashicons-tickets-alt" style="font-size: 30px; margin-right: 10px;"></span>
        RaffleMania Dashboard
    </h1>

    <style>
        .rafflemania-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .rafflemania-stat-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            text-align: center;
            border-left: 4px solid #FF6B00;
        }
        .rafflemania-stat-number {
            font-size: 36px;
            font-weight: 700;
            color: #FF6B00;
            margin-bottom: 8px;
        }
        .rafflemania-stat-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .rafflemania-section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .rafflemania-section h2 {
            margin-top: 0;
            color: #333;
            border-bottom: 2px solid #FF6B00;
            padding-bottom: 12px;
        }
        .rafflemania-table {
            width: 100%;
            border-collapse: collapse;
        }
        .rafflemania-table th,
        .rafflemania-table td {
            padding: 12px;
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
        .rafflemania-badge-success {
            background: #d4edda;
            color: #155724;
        }
        .rafflemania-badge-warning {
            background: #fff3cd;
            color: #856404;
        }
        .rafflemania-badge-primary {
            background: #FF6B00;
            color: white;
        }
        .rafflemania-api-info {
            background: #f0f8ff;
            border: 1px solid #b8daff;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
        }
        .rafflemania-api-info code {
            background: #e7f1ff;
            padding: 2px 8px;
            border-radius: 4px;
        }
    </style>

    <!-- Stats Grid -->
    <div class="rafflemania-stats">
        <div class="rafflemania-stat-card">
            <div class="rafflemania-stat-number"><?php echo number_format($total_users); ?></div>
            <div class="rafflemania-stat-label">Utenti Registrati</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="rafflemania-stat-number"><?php echo number_format($total_prizes); ?></div>
            <div class="rafflemania-stat-label">Premi Attivi</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="rafflemania-stat-number"><?php echo number_format($total_tickets); ?></div>
            <div class="rafflemania-stat-label">Biglietti Emessi</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="rafflemania-stat-number"><?php echo number_format($total_draws); ?></div>
            <div class="rafflemania-stat-label">Estrazioni Completate</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="rafflemania-stat-number"><?php echo number_format($total_winners); ?></div>
            <div class="rafflemania-stat-label">Vincitori Totali</div>
        </div>
    </div>

    <!-- API Info -->
    <div class="rafflemania-api-info">
        <strong>🔗 API Base URL:</strong>
        <code><?php echo home_url('/wp-json/rafflemania/v1/'); ?></code>
        <br><br>
        <strong>Endpoints disponibili:</strong>
        <ul style="margin-top: 10px;">
            <li><code>POST /auth/register</code> - Registrazione utente</li>
            <li><code>POST /auth/login</code> - Login utente</li>
            <li><code>GET /prizes</code> - Lista premi</li>
            <li><code>POST /tickets</code> - Crea biglietto</li>
            <li><code>GET /winners</code> - Lista vincitori</li>
        </ul>
    </div>

    <!-- Active Timers -->
    <?php if (!empty($active_timers)): ?>
    <div class="rafflemania-section">
        <h2>⏱️ Timer Attivi</h2>
        <table class="rafflemania-table">
            <thead>
                <tr>
                    <th>Premio</th>
                    <th>Progresso</th>
                    <th>Estrazione</th>
                    <th>Stato</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($active_timers as $prize): ?>
                <tr>
                    <td><strong><?php echo esc_html($prize->name); ?></strong></td>
                    <td><?php echo $prize->current_ads; ?> / <?php echo $prize->goal_ads; ?> biglietti</td>
                    <td><?php echo date('d/m/Y H:i', strtotime($prize->scheduled_at)); ?></td>
                    <td><span class="rafflemania-badge rafflemania-badge-warning">In Countdown</span></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>

    <!-- Recent Winners -->
    <div class="rafflemania-section">
        <h2>🏆 Ultimi Vincitori</h2>
        <?php if (!empty($recent_winners)): ?>
        <table class="rafflemania-table">
            <thead>
                <tr>
                    <th>Utente</th>
                    <th>Premio</th>
                    <th>Data</th>
                    <th>Stato</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($recent_winners as $winner): ?>
                <tr>
                    <td><strong><?php echo esc_html($winner->username); ?></strong></td>
                    <td><?php echo esc_html($winner->prize_name); ?></td>
                    <td><?php echo date('d/m/Y H:i', strtotime($winner->won_at)); ?></td>
                    <td>
                        <?php if ($winner->claimed): ?>
                            <span class="rafflemania-badge rafflemania-badge-success">Riscosso</span>
                        <?php else: ?>
                            <span class="rafflemania-badge rafflemania-badge-warning">Da Riscuotere</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <?php else: ?>
        <p>Nessun vincitore ancora.</p>
        <?php endif; ?>
    </div>
</div>

<?php
if (!defined('ABSPATH')) exit;

global $wpdb;

// Use Italian timezone (Europe/Rome)
$italy_tz = new DateTimeZone('Europe/Rome');
$now = new DateTime('now', $italy_tz);

// Get selected period from URL (default: today)
$period = isset($_GET['period']) ? sanitize_text_field($_GET['period']) : 'today';
$custom_date = isset($_GET['date']) ? sanitize_text_field($_GET['date']) : null;

// Calculate date ranges based on period
switch ($period) {
    case 'yesterday':
        $selected_date = (clone $now)->modify('-1 day')->format('Y-m-d');
        $period_label = 'Ieri';
        $date_display = (clone $now)->modify('-1 day')->format('d/m/Y');
        break;
    case 'week':
        $start_date = (clone $now)->modify('monday this week')->format('Y-m-d');
        $end_date = (clone $now)->format('Y-m-d');
        $period_label = 'Questa Settimana';
        $date_display = (clone $now)->modify('monday this week')->format('d/m') . ' - ' . $now->format('d/m/Y');
        break;
    case 'month':
        $start_date = $now->format('Y-m-01');
        $end_date = $now->format('Y-m-d');
        $period_label = 'Questo Mese';
        $date_display = $now->format('F Y');
        break;
    case 'year':
        $start_date = $now->format('Y-01-01');
        $end_date = $now->format('Y-m-d');
        $period_label = 'Quest\'Anno';
        $date_display = $now->format('Y');
        break;
    case 'custom':
        $selected_date = $custom_date ?: $now->format('Y-m-d');
        $period_label = 'Data Personalizzata';
        $date_display = (new DateTime($selected_date))->format('d/m/Y');
        break;
    case 'today':
    default:
        $selected_date = $now->format('Y-m-d');
        $period_label = 'Oggi';
        $date_display = $now->format('d/m/Y');
        break;
}

// Get table names
$table_users = $wpdb->prefix . 'rafflemania_users';
$table_prizes = $wpdb->prefix . 'rafflemania_prizes';
$table_tickets = $wpdb->prefix . 'rafflemania_tickets';
$table_draws = $wpdb->prefix . 'rafflemania_draws';
$table_winners = $wpdb->prefix . 'rafflemania_winners';
$table_daily_stats = $wpdb->prefix . 'rafflemania_daily_stats';

// Ensure daily_stats table exists with all columns
$table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_daily_stats}'");
if (!$table_exists) {
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$table_daily_stats} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        stat_date DATE NOT NULL UNIQUE,
        logins INT DEFAULT 0,
        tickets_created INT DEFAULT 0,
        new_users INT DEFAULT 0,
        ads_watched INT DEFAULT 0,
        credits_spent INT DEFAULT 0,
        draws_made INT DEFAULT 0,
        winners INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY stat_date (stat_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} else {
    $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_daily_stats}");
    $column_names = array_column($columns, 'Field');
    if (!in_array('draws_made', $column_names)) {
        $wpdb->query("ALTER TABLE {$table_daily_stats} ADD COLUMN draws_made INT DEFAULT 0");
    }
    if (!in_array('winners', $column_names)) {
        $wpdb->query("ALTER TABLE {$table_daily_stats} ADD COLUMN winners INT DEFAULT 0");
    }
}

// Function to get stats for a date range
function get_period_stats($wpdb, $table_daily_stats, $start_date, $end_date = null) {
    if ($end_date === null) $end_date = $start_date;
    return $wpdb->get_row($wpdb->prepare(
        "SELECT
            COALESCE(SUM(logins), 0) as logins,
            COALESCE(SUM(tickets_created), 0) as tickets_created,
            COALESCE(SUM(new_users), 0) as new_users,
            COALESCE(SUM(ads_watched), 0) as ads_watched,
            COALESCE(SUM(credits_spent), 0) as credits_spent,
            COALESCE(SUM(draws_made), 0) as draws_made,
            COALESCE(SUM(winners), 0) as winners
        FROM {$table_daily_stats}
        WHERE stat_date BETWEEN %s AND %s",
        $start_date, $end_date
    ));
}

function get_daily_stats($wpdb, $table_daily_stats, $date) {
    $stats = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table_daily_stats} WHERE stat_date = %s", $date
    ));
    if (!$stats) {
        return (object)['logins' => 0, 'tickets_created' => 0, 'new_users' => 0,
                        'ads_watched' => 0, 'credits_spent' => 0, 'draws_made' => 0, 'winners' => 0];
    }
    return $stats;
}

// Get stats based on period
if (in_array($period, ['week', 'month', 'year'])) {
    $period_stats = get_period_stats($wpdb, $table_daily_stats, $start_date, $end_date);
} else {
    $period_stats = get_daily_stats($wpdb, $table_daily_stats, $selected_date);
}

// Ensure today's record exists
$today = $now->format('Y-m-d');
$today_exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_daily_stats} WHERE stat_date = %s", $today));
if (!$today_exists) {
    $wpdb->insert($table_daily_stats, [
        'stat_date' => $today, 'logins' => 0, 'tickets_created' => 0, 'new_users' => 0,
        'ads_watched' => 0, 'credits_spent' => 0, 'draws_made' => 0, 'winners' => 0
    ]);
}

// Get ALL TIME totals
$total_users = $wpdb->get_var("SELECT COUNT(*) FROM {$table_users}") ?: 0;
$total_prizes = $wpdb->get_var("SELECT COUNT(*) FROM {$table_prizes} WHERE is_active = 1") ?: 0;
$total_tickets = $wpdb->get_var("SELECT COUNT(*) FROM {$table_tickets}") ?: 0;
$total_draws = $wpdb->get_var("SELECT COUNT(*) FROM {$table_draws}") ?: 0;
$total_winners = $wpdb->get_var("SELECT COUNT(*) FROM {$table_winners}") ?: 0;
$total_credits_spent = $wpdb->get_var("SELECT COALESCE(SUM(credits_spent), 0) FROM {$table_daily_stats}") ?: 0;
$total_ads_watched = $wpdb->get_var("SELECT COALESCE(SUM(ads_watched), 0) FROM {$table_daily_stats}") ?: 0;
$total_logins = $wpdb->get_var("SELECT COALESCE(SUM(logins), 0) FROM {$table_daily_stats}") ?: 0;

// Get all prizes for the prizes section
$all_prizes = $wpdb->get_results(
    "SELECT p.*,
            (SELECT COUNT(*) FROM {$table_tickets} t WHERE t.prize_id = p.id AND t.status = 'active') as active_tickets
     FROM {$table_prizes} p
     WHERE p.is_active = 1
     ORDER BY p.created_at DESC"
);

// Get active timers (prizes with countdown status)
$active_timers = $wpdb->get_results(
    "SELECT p.*,
            (SELECT COUNT(*) FROM {$table_tickets} t WHERE t.prize_id = p.id AND t.status = 'active') as active_tickets
     FROM {$table_prizes} p
     WHERE p.timer_status = 'countdown'
     ORDER BY p.scheduled_at ASC"
);

// Get recent draws
$recent_draws = $wpdb->get_results(
    "SELECT d.*, p.name as prize_name, u.username as winner_username
     FROM {$table_draws} d
     LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
     LEFT JOIN {$table_users} u ON d.winner_user_id = u.id
     ORDER BY d.extracted_at DESC
     LIMIT 10"
);

// Recent winners
$recent_winners = $wpdb->get_results(
    "SELECT w.*, u.username, p.name as prize_name
     FROM {$table_winners} w
     LEFT JOIN {$table_users} u ON w.user_id = u.id
     LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
     ORDER BY w.won_at DESC
     LIMIT 5"
);
?>

<div class="wrap">
    <h1 style="display: flex; align-items: center; gap: 10px;">
        <span class="dashicons dashicons-tickets-alt" style="font-size: 28px;"></span>
        RaffleMania Dashboard
    </h1>

    <style>
        .rm-period-nav {
            display: flex;
            gap: 8px;
            margin: 20px 0;
            flex-wrap: wrap;
            align-items: center;
        }
        .rm-period-btn {
            padding: 10px 20px;
            border: 2px solid #ddd;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
            text-decoration: none;
            color: #333;
            font-size: 14px;
        }
        .rm-period-btn:hover {
            border-color: #FF6B00;
            color: #FF6B00;
        }
        .rm-period-btn.active {
            background: #FF6B00;
            border-color: #FF6B00;
            color: white;
        }
        .rm-date-picker {
            padding: 8px 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
        }

        /* Two column stats layout */
        .rm-stats-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin: 24px 0;
        }
        @media (max-width: 1200px) {
            .rm-stats-row { grid-template-columns: 1fr; }
        }

        .rm-box {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .rm-box h3 {
            margin: 0 0 20px 0;
            padding-bottom: 12px;
            border-bottom: 2px solid #FF6B00;
            color: #333;
            font-size: 16px;
        }
        .rm-box h3 span {
            font-weight: normal;
            font-size: 13px;
            color: #888;
            margin-left: 10px;
        }

        /* Stats grid inside boxes */
        .rm-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }
        @media (max-width: 768px) {
            .rm-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .rm-stat-item {
            text-align: center;
            padding: 16px 8px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .rm-stat-item.purple { background: #f3f0ff; }
        .rm-stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #FF6B00;
        }
        .rm-stat-item.purple .rm-stat-value { color: #6c5ce7; }
        .rm-stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-top: 4px;
        }

        /* Section styling */
        .rm-section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .rm-section h3 {
            margin: 0 0 20px 0;
            padding-bottom: 12px;
            border-bottom: 2px solid #FF6B00;
            color: #333;
        }

        /* Table styling */
        .rm-table {
            width: 100%;
            border-collapse: collapse;
        }
        .rm-table th, .rm-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        .rm-table th {
            background: #f9f9f9;
            font-weight: 600;
            font-size: 13px;
        }

        /* Timer styling */
        .rm-timer {
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            color: #FF6B00;
            background: #fff5eb;
            padding: 4px 10px;
            border-radius: 6px;
        }
        .rm-timer.expired {
            color: #d63031;
            background: #ffebee;
        }

        /* Progress bar */
        .rm-progress {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
        }
        .rm-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #FF6B00, #ff9248);
            border-radius: 4px;
            transition: width 0.3s;
        }
        .rm-progress-text {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
        }

        /* Badge styling */
        .rm-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
        }
        .rm-badge-waiting { background: #e9ecef; color: #666; }
        .rm-badge-countdown { background: #fff3cd; color: #856404; }
        .rm-badge-extracting { background: #d4edda; color: #155724; }
        .rm-badge-success { background: #d4edda; color: #155724; }
        .rm-badge-warning { background: #fff3cd; color: #856404; }
        .rm-badge-winner { background: #d4edda; color: #155724; }
        .rm-badge-no-winner { background: #f8d7da; color: #721c24; }

        /* Three column layout */
        .rm-three-col {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
        }
        @media (max-width: 1400px) {
            .rm-three-col { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 900px) {
            .rm-three-col { grid-template-columns: 1fr; }
        }
    </style>

    <!-- Period Navigation (no icons) -->
    <div class="rm-period-nav">
        <a href="?page=rafflemania&period=today" class="rm-period-btn <?php echo $period === 'today' ? 'active' : ''; ?>">Oggi</a>
        <a href="?page=rafflemania&period=yesterday" class="rm-period-btn <?php echo $period === 'yesterday' ? 'active' : ''; ?>">Ieri</a>
        <a href="?page=rafflemania&period=week" class="rm-period-btn <?php echo $period === 'week' ? 'active' : ''; ?>">Settimana</a>
        <a href="?page=rafflemania&period=month" class="rm-period-btn <?php echo $period === 'month' ? 'active' : ''; ?>">Mese</a>
        <a href="?page=rafflemania&period=year" class="rm-period-btn <?php echo $period === 'year' ? 'active' : ''; ?>">Anno</a>
        <span style="color: #ccc; margin: 0 8px;">|</span>
        <form method="get" style="display: flex; align-items: center; gap: 8px;">
            <input type="hidden" name="page" value="rafflemania">
            <input type="hidden" name="period" value="custom">
            <input type="date" name="date" class="rm-date-picker"
                   value="<?php echo $period === 'custom' ? $selected_date : $now->format('Y-m-d'); ?>"
                   max="<?php echo $now->format('Y-m-d'); ?>">
            <button type="submit" class="rm-period-btn">Cerca</button>
        </form>
    </div>

    <!-- Stats Row: Total + Period side by side -->
    <div class="rm-stats-row">
        <!-- Total Stats Box -->
        <div class="rm-box">
            <h3>Statistiche Totali</h3>
            <div class="rm-stats-grid">
                <div class="rm-stat-item purple">
                    <div class="rm-stat-value"><?php echo number_format($total_users); ?></div>
                    <div class="rm-stat-label">Utenti</div>
                </div>
                <div class="rm-stat-item purple">
                    <div class="rm-stat-value"><?php echo number_format($total_tickets); ?></div>
                    <div class="rm-stat-label">Biglietti</div>
                </div>
                <div class="rm-stat-item purple">
                    <div class="rm-stat-value"><?php echo number_format($total_draws); ?></div>
                    <div class="rm-stat-label">Estrazioni</div>
                </div>
                <div class="rm-stat-item purple">
                    <div class="rm-stat-value"><?php echo number_format($total_winners); ?></div>
                    <div class="rm-stat-label">Vincitori</div>
                </div>
                <div class="rm-stat-item purple">
                    <div class="rm-stat-value"><?php echo number_format($total_logins); ?></div>
                    <div class="rm-stat-label">Login</div>
                </div>
                <div class="rm-stat-item purple">
                    <div class="rm-stat-value"><?php echo number_format($total_ads_watched); ?></div>
                    <div class="rm-stat-label">Ads Viste</div>
                </div>
                <div class="rm-stat-item purple">
                    <div class="rm-stat-value"><?php echo number_format($total_credits_spent); ?></div>
                    <div class="rm-stat-label">Crediti Usati</div>
                </div>
                <div class="rm-stat-item purple">
                    <div class="rm-stat-value"><?php echo number_format($total_prizes); ?></div>
                    <div class="rm-stat-label">Premi Attivi</div>
                </div>
            </div>
        </div>

        <!-- Period Stats Box -->
        <div class="rm-box">
            <h3><?php echo esc_html($period_label); ?><span><?php echo esc_html($date_display); ?></span></h3>
            <div class="rm-stats-grid">
                <div class="rm-stat-item">
                    <div class="rm-stat-value"><?php echo number_format((int)($period_stats->logins ?? 0)); ?></div>
                    <div class="rm-stat-label">Login</div>
                </div>
                <div class="rm-stat-item">
                    <div class="rm-stat-value"><?php echo number_format((int)($period_stats->tickets_created ?? 0)); ?></div>
                    <div class="rm-stat-label">Biglietti</div>
                </div>
                <div class="rm-stat-item">
                    <div class="rm-stat-value"><?php echo number_format((int)($period_stats->new_users ?? 0)); ?></div>
                    <div class="rm-stat-label">Nuovi Utenti</div>
                </div>
                <div class="rm-stat-item">
                    <div class="rm-stat-value"><?php echo number_format((int)($period_stats->ads_watched ?? 0)); ?></div>
                    <div class="rm-stat-label">Ads Viste</div>
                </div>
                <div class="rm-stat-item">
                    <div class="rm-stat-value"><?php echo number_format((int)($period_stats->credits_spent ?? 0)); ?></div>
                    <div class="rm-stat-label">Crediti Usati</div>
                </div>
                <div class="rm-stat-item">
                    <div class="rm-stat-value"><?php echo number_format((int)($period_stats->draws_made ?? 0)); ?></div>
                    <div class="rm-stat-label">Estrazioni</div>
                </div>
                <div class="rm-stat-item">
                    <div class="rm-stat-value"><?php echo number_format((int)($period_stats->winners ?? 0)); ?></div>
                    <div class="rm-stat-label">Vittorie</div>
                </div>
                <div class="rm-stat-item">
                    <div class="rm-stat-value">-</div>
                    <div class="rm-stat-label">-</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Three column layout: Premi, Timer Attivi, Estrazioni -->
    <div class="rm-three-col">
        <!-- Premi Section -->
        <div class="rm-section">
            <h3>Premi</h3>
            <?php if (!empty($all_prizes)): ?>
            <table class="rm-table">
                <thead>
                    <tr>
                        <th>Premio</th>
                        <th>Progresso</th>
                        <th>Stato</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($all_prizes as $prize):
                        $progress = ($prize->goal_ads > 0) ? round(($prize->current_ads / $prize->goal_ads) * 100, 1) : 0;
                        $status_class = 'rm-badge-' . $prize->timer_status;
                        $status_labels = ['waiting' => 'In Attesa', 'countdown' => 'Timer Attivo', 'extracting' => 'In Estrazione'];
                        $status_label = $status_labels[$prize->timer_status] ?? $prize->timer_status;
                    ?>
                    <tr>
                        <td>
                            <strong><?php echo esc_html($prize->name); ?></strong>
                            <div style="font-size: 11px; color: #888;"><?php echo $prize->active_tickets; ?> biglietti</div>
                        </td>
                        <td style="min-width: 120px;">
                            <div class="rm-progress">
                                <div class="rm-progress-bar" style="width: <?php echo min($progress, 100); ?>%;"></div>
                            </div>
                            <div class="rm-progress-text"><?php echo $prize->current_ads; ?> / <?php echo $prize->goal_ads; ?></div>
                        </td>
                        <td><span class="rm-badge <?php echo $status_class; ?>"><?php echo $status_label; ?></span></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php else: ?>
            <p style="color: #666; text-align: center; padding: 20px;">Nessun premio attivo</p>
            <?php endif; ?>
        </div>

        <!-- Timer Attivi Section -->
        <div class="rm-section">
            <h3>Timer Attivi</h3>
            <?php if (!empty($active_timers)): ?>
            <table class="rm-table">
                <thead>
                    <tr>
                        <th>Premio</th>
                        <th>Countdown</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($active_timers as $prize):
                        $scheduled_time = strtotime($prize->scheduled_at);
                        $current_time = time();
                        $remaining = max(0, $scheduled_time - $current_time);
                    ?>
                    <tr>
                        <td>
                            <strong><?php echo esc_html($prize->name); ?></strong>
                            <div style="font-size: 11px; color: #888;"><?php echo $prize->active_tickets; ?> biglietti</div>
                        </td>
                        <td>
                            <?php if ($remaining > 0): ?>
                            <span class="rm-timer" data-target="<?php echo $scheduled_time; ?>">
                                <?php
                                $hours = floor($remaining / 3600);
                                $minutes = floor(($remaining % 3600) / 60);
                                $seconds = $remaining % 60;
                                printf('%02d:%02d:%02d', $hours, $minutes, $seconds);
                                ?>
                            </span>
                            <?php else: ?>
                            <span class="rm-timer expired">ESTRAZIONE!</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php else: ?>
            <p style="color: #666; text-align: center; padding: 20px;">Nessun timer attivo</p>
            <?php endif; ?>
        </div>

        <!-- Estrazioni Section -->
        <div class="rm-section">
            <h3>Ultime Estrazioni</h3>
            <?php if (!empty($recent_draws)): ?>
            <table class="rm-table">
                <thead>
                    <tr>
                        <th>Premio</th>
                        <th>Risultato</th>
                        <th>Data</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($recent_draws as $draw): ?>
                    <tr>
                        <td>
                            <strong><?php echo esc_html($draw->prize_name ?: 'N/A'); ?></strong>
                            <div style="font-size: 11px; color: #888;">N. <?php echo $draw->winning_number; ?></div>
                        </td>
                        <td>
                            <?php if ($draw->winner_user_id): ?>
                            <span class="rm-badge rm-badge-winner"><?php echo esc_html($draw->winner_username); ?></span>
                            <?php else: ?>
                            <span class="rm-badge rm-badge-no-winner">Nessun vincitore</span>
                            <?php endif; ?>
                        </td>
                        <td style="font-size: 12px;"><?php echo date('d/m H:i', strtotime($draw->extracted_at)); ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php else: ?>
            <p style="color: #666; text-align: center; padding: 20px;">Nessuna estrazione ancora</p>
            <?php endif; ?>
        </div>
    </div>

    <!-- Recent Winners -->
    <div class="rm-section">
        <h3>Ultimi Vincitori</h3>
        <?php if (!empty($recent_winners)): ?>
        <table class="rm-table">
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
                            <span class="rm-badge rm-badge-success">Riscosso</span>
                        <?php else: ?>
                            <span class="rm-badge rm-badge-warning">Da Riscuotere</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        <?php else: ?>
        <p style="color: #666; text-align: center; padding: 20px;">Nessun vincitore ancora</p>
        <?php endif; ?>
    </div>
</div>

<!-- Live Timer Update Script -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    function updateTimers() {
        const timers = document.querySelectorAll('.rm-timer[data-target]');
        const now = Math.floor(Date.now() / 1000);

        timers.forEach(function(timer) {
            const target = parseInt(timer.getAttribute('data-target'));
            let remaining = target - now;

            if (remaining <= 0) {
                timer.textContent = 'ESTRAZIONE!';
                timer.classList.add('expired');
                // Refresh page after a short delay to show updated state
                setTimeout(function() { location.reload(); }, 3000);
            } else {
                const hours = Math.floor(remaining / 3600);
                const minutes = Math.floor((remaining % 3600) / 60);
                const seconds = remaining % 60;
                timer.textContent =
                    String(hours).padStart(2, '0') + ':' +
                    String(minutes).padStart(2, '0') + ':' +
                    String(seconds).padStart(2, '0');
            }
        });
    }

    // Update every second
    setInterval(updateTimers, 1000);
    updateTimers();
});
</script>

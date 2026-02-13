<?php
if (!defined('ABSPATH')) exit;

global $wpdb;
$table_draws = $wpdb->prefix . 'rafflemania_draws';
$table_prizes = $wpdb->prefix . 'rafflemania_prizes';
$table_users = $wpdb->prefix . 'rafflemania_users';

// Pagination
$per_page = 25;
$current_page = max(1, intval($_GET['paged'] ?? 1));
$offset = ($current_page - 1) * $per_page;

$total_draws = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_draws}");
$total_pages = ceil($total_draws / $per_page);

$draws = $wpdb->get_results($wpdb->prepare(
    "SELECT d.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
            u.username as winner_username, u.email as winner_email
     FROM {$table_draws} d
     LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
     LEFT JOIN {$table_users} u ON d.winner_user_id = u.id
     ORDER BY d.extracted_at DESC
     LIMIT %d OFFSET %d",
    $per_page, $offset
));

// Stats
$stats = $wpdb->get_row("
    SELECT
        COUNT(*) as total,
        COUNT(DISTINCT winner_user_id) as unique_winners,
        SUM(total_tickets) as total_tickets_used
    FROM {$table_draws}
");
$total_value_awarded = $wpdb->get_var("
    SELECT COALESCE(SUM(p.value), 0)
    FROM {$table_draws} d
    JOIN {$table_prizes} p ON d.prize_id = p.id
    WHERE d.status = 'completed'
");

// Active countdowns
$active_countdowns = $wpdb->get_results("
    SELECT id, name, image_url, value, timer_status, scheduled_at, current_ads, goal_ads
    FROM {$table_prizes}
    WHERE timer_status = 'countdown' AND scheduled_at IS NOT NULL
    ORDER BY scheduled_at ASC
");
?>

<div class="wrap rafflemania-draws-wrap">
    <h1>
        <span class="dashicons dashicons-randomize" style="font-size: 30px; margin-right: 10px; color: #FF6B00;"></span>
        Estrazioni
    </h1>

    <style>
        .rafflemania-draws-wrap { }
        .rafflemania-table-scroll {
            max-height: 600px;
            overflow-y: auto;
        }
        .rafflemania-table-scroll::-webkit-scrollbar { width: 6px; }
        .rafflemania-table-scroll::-webkit-scrollbar-track { background: #f8f9fa; }
        .rafflemania-table-scroll::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        .rafflemania-table-scroll::-webkit-scrollbar-thumb:hover { background: #ccc; }

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
        .rafflemania-stat-card:hover { transform: translateY(-2px); }
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

        .rafflemania-countdown-section {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 24px;
            margin-bottom: 24px;
        }
        .rafflemania-countdown-section h3 {
            margin: 0 0 16px;
            color: #FF6B00;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .rafflemania-countdown-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
        }
        .countdown-card {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px;
            background: linear-gradient(135deg, #fff5eb, #fff);
            border: 2px solid #FFE0C0;
            border-radius: 10px;
        }
        .countdown-card img {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 8px;
        }
        .countdown-card .countdown-info { flex: 1; }
        .countdown-card .countdown-name { font-weight: 700; color: #333; }
        .countdown-card .countdown-timer {
            font-size: 22px;
            font-weight: 700;
            font-family: 'Courier New', monospace;
            color: #FF6B00;
            letter-spacing: 1px;
        }
        .countdown-card .countdown-date { font-size: 11px; color: #999; }

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
            padding: 14px 16px;
            text-align: left;
            border-bottom: 1px solid #f0f0f0;
        }
        .rafflemania-table th {
            background: #fafafa;
            font-weight: 600;
            color: #555;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .rafflemania-table tr:hover { background: #fafafa; }
        .rafflemania-table img {
            width: 40px;
            height: 40px;
            object-fit: cover;
            border-radius: 6px;
            vertical-align: middle;
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

        .winner-link {
            color: #FF6B00;
            text-decoration: none;
            font-weight: 600;
        }
        .winner-link:hover { text-decoration: underline; }

        .rafflemania-pagination {
            display: flex;
            justify-content: center;
            gap: 8px;
            padding: 20px;
        }
        .rafflemania-pagination a,
        .rafflemania-pagination span {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.2s;
        }
        .rafflemania-pagination a {
            background: white;
            border: 1px solid #ddd;
            color: #555;
        }
        .rafflemania-pagination a:hover { background: #FF6B00; color: white; border-color: #FF6B00; }
        .rafflemania-pagination span.current {
            background: #FF6B00;
            color: white;
            border: 1px solid #FF6B00;
        }
    </style>

    <!-- Stats -->
    <div class="rafflemania-stats-row">
        <div class="rafflemania-stat-card">
            <div class="stat-value"><?php echo number_format($stats->total ?? 0); ?></div>
            <div class="stat-label">Estrazioni Totali</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="stat-value" style="color: #28a745;"><?php echo number_format($stats->unique_winners ?? 0); ?></div>
            <div class="stat-label">Vincitori Unici</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="stat-value" style="color: #6c757d;"><?php echo number_format($stats->total_tickets_used ?? 0); ?></div>
            <div class="stat-label">Biglietti Utilizzati</div>
        </div>
        <div class="rafflemania-stat-card">
            <div class="stat-value">&euro;<?php echo number_format($total_value_awarded, 0); ?></div>
            <div class="stat-label">Valore Premi Assegnati</div>
        </div>
    </div>

    <!-- Active Countdowns -->
    <?php if (!empty($active_countdowns)): ?>
    <div class="rafflemania-countdown-section">
        <h3>
            <span class="dashicons dashicons-clock" style="color: #FF6B00;"></span>
            Countdown Attivi (<?php echo count($active_countdowns); ?>)
        </h3>
        <div class="rafflemania-countdown-grid">
            <?php foreach ($active_countdowns as $cd): ?>
            <?php
            $cd_ts = strtotime($cd->scheduled_at);
            $cd_remaining = max(0, $cd_ts - time());
            $h = floor($cd_remaining / 3600);
            $m = floor(($cd_remaining % 3600) / 60);
            $s = $cd_remaining % 60;
            ?>
            <div class="countdown-card">
                <?php if ($cd->image_url): ?>
                <img src="<?php echo esc_url($cd->image_url); ?>" alt="">
                <?php endif; ?>
                <div class="countdown-info">
                    <div class="countdown-name"><?php echo esc_html($cd->name); ?> (&euro;<?php echo number_format($cd->value, 0); ?>)</div>
                    <div class="countdown-timer" data-countdown="<?php echo $cd_ts; ?>">
                        <?php printf('%02d:%02d:%02d', $h, $m, $s); ?>
                    </div>
                    <div class="countdown-date"><?php echo date('d/m/Y H:i', $cd_ts); ?></div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Draws Table -->
    <div class="rafflemania-table-container">
        <div class="rafflemania-table-scroll">
        <table class="rafflemania-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Premio</th>
                    <th>#Vincente</th>
                    <th>Vincitore</th>
                    <th>Biglietti</th>
                    <th>Data</th>
                    <th>Stato</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($draws)): ?>
                <tr>
                    <td colspan="7" style="text-align: center; padding: 50px; color: #999;">
                        <span class="dashicons dashicons-randomize" style="font-size: 36px; display: block; margin-bottom: 10px;"></span>
                        Nessuna estrazione ancora.
                    </td>
                </tr>
                <?php else: ?>
                <?php foreach ($draws as $draw): ?>
                <tr>
                    <td><code style="background: #f0f0f0; padding: 3px 8px; border-radius: 4px; font-size: 12px;"><?php echo esc_html($draw->draw_id); ?></code></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <?php if ($draw->prize_image): ?>
                            <img src="<?php echo esc_url($draw->prize_image); ?>" alt="">
                            <?php endif; ?>
                            <div>
                                <strong><?php echo esc_html($draw->prize_name); ?></strong>
                                <?php if ($draw->prize_value): ?>
                                <br><span style="color: #FF6B00; font-weight: 600; font-size: 13px;">&euro;<?php echo number_format($draw->prize_value, 2); ?></span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </td>
                    <td><span class="rafflemania-badge rafflemania-badge-primary">#<?php echo $draw->winning_number; ?></span></td>
                    <td>
                        <?php if ($draw->winner_username): ?>
                        <a href="<?php echo admin_url('admin.php?page=rafflemania-users&user_id=' . $draw->winner_user_id); ?>" class="winner-link">
                            <?php echo esc_html($draw->winner_username); ?>
                        </a>
                        <?php if ($draw->winner_email): ?>
                        <br><span style="font-size: 12px; color: #999;"><?php echo esc_html($draw->winner_email); ?></span>
                        <?php endif; ?>
                        <?php else: ?>
                        <span style="color: #999;">Nessun vincitore</span>
                        <?php endif; ?>
                    </td>
                    <td><strong><?php echo number_format($draw->total_tickets); ?></strong></td>
                    <td>
                        <?php if ($draw->extracted_at): ?>
                        <div><?php echo date('d/m/Y', strtotime($draw->extracted_at)); ?></div>
                        <div style="font-size: 12px; color: #999;"><?php echo date('H:i:s', strtotime($draw->extracted_at)); ?></div>
                        <?php else: ?>
                        -
                        <?php endif; ?>
                    </td>
                    <td>
                        <span class="rafflemania-badge rafflemania-badge-<?php echo $draw->status === 'completed' ? 'success' : 'warning'; ?>">
                            <?php echo $draw->status === 'completed' ? 'Completata' : ucfirst($draw->status); ?>
                        </span>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
        </div>

        <!-- Pagination -->
        <?php if ($total_pages > 1): ?>
        <div class="rafflemania-pagination">
            <?php for ($i = 1; $i <= $total_pages; $i++): ?>
                <?php if ($i === $current_page): ?>
                <span class="current"><?php echo $i; ?></span>
                <?php else: ?>
                <a href="<?php echo admin_url('admin.php?page=rafflemania-draws&paged=' . $i); ?>"><?php echo $i; ?></a>
                <?php endif; ?>
            <?php endfor; ?>
        </div>
        <?php endif; ?>
    </div>
</div>

<script>
// Live countdown timers
function updateCountdowns() {
    document.querySelectorAll('[data-countdown]').forEach(function(el) {
        var target = parseInt(el.getAttribute('data-countdown'));
        var now = Math.floor(Date.now() / 1000);
        var remaining = target - now;

        if (remaining <= 0) {
            el.textContent = 'ESTRAZIONE!';
            el.style.color = '#dc3545';
            return;
        }

        var h = Math.floor(remaining / 3600);
        var m = Math.floor((remaining % 3600) / 60);
        var s = remaining % 60;
        el.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    });
}

setInterval(updateCountdowns, 1000);
</script>

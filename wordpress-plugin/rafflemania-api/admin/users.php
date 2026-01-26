<?php
if (!defined('ABSPATH')) exit;

global $wpdb;
$table_users = $wpdb->prefix . 'rafflemania_users';

$search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '';
$page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
$per_page = 20;
$offset = ($page - 1) * $per_page;

$where = "1=1";
$params = [];

if ($search) {
    $where .= " AND (username LIKE %s OR email LIKE %s)";
    $params[] = '%' . $wpdb->esc_like($search) . '%';
    $params[] = '%' . $wpdb->esc_like($search) . '%';
}

$total = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_users} WHERE {$where}", ...$params));
$total_pages = ceil($total / $per_page);

$params[] = $per_page;
$params[] = $offset;

$users = $wpdb->get_results($wpdb->prepare(
    "SELECT * FROM {$table_users} WHERE {$where} ORDER BY created_at DESC LIMIT %d OFFSET %d",
    ...$params
));
?>

<div class="wrap">
    <h1>
        <span class="dashicons dashicons-groups" style="font-size: 30px; margin-right: 10px;"></span>
        Utenti App
    </h1>

    <style>
        .rafflemania-search {
            background: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            margin: 20px 0;
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
        .rafflemania-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .rafflemania-badge-success { background: #d4edda; color: #155724; }
        .rafflemania-badge-danger { background: #f8d7da; color: #721c24; }
        .rafflemania-badge-primary { background: #FF6B00; color: white; }
        .rafflemania-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 16px;
        }
        .rafflemania-pagination {
            margin-top: 20px;
            text-align: center;
        }
    </style>

    <!-- Search -->
    <div class="rafflemania-search">
        <form method="get">
            <input type="hidden" name="page" value="rafflemania-users">
            <input type="text" name="s" value="<?php echo esc_attr($search); ?>" placeholder="Cerca per username o email..." style="width: 300px; padding: 8px;">
            <button type="submit" class="button">Cerca</button>
            <?php if ($search): ?>
            <a href="<?php echo admin_url('admin.php?page=rafflemania-users'); ?>" class="button">Reset</a>
            <?php endif; ?>
        </form>
        <p style="margin-top: 10px; color: #666;">Totale utenti: <strong><?php echo number_format($total); ?></strong></p>
    </div>

    <div class="rafflemania-table-container">
        <table class="rafflemania-table">
            <thead>
                <tr>
                    <th>Avatar</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Livello</th>
                    <th>XP</th>
                    <th>Crediti</th>
                    <th>Streak</th>
                    <th>Referral</th>
                    <th>Registrato</th>
                    <th>Stato</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($users as $user): ?>
                <tr>
                    <td>
                        <div class="rafflemania-avatar" style="background: <?php echo esc_attr($user->avatar_color ?: '#FF6B00'); ?>">
                            <?php echo strtoupper(substr($user->username, 0, 1)); ?>
                        </div>
                    </td>
                    <td><strong><?php echo esc_html($user->username); ?></strong></td>
                    <td><?php echo esc_html($user->email); ?></td>
                    <td><span class="rafflemania-badge rafflemania-badge-primary">Lv. <?php echo $user->level; ?></span></td>
                    <td><?php echo number_format($user->xp); ?></td>
                    <td><?php echo number_format($user->credits); ?></td>
                    <td><?php echo $user->current_streak; ?> 🔥</td>
                    <td><code><?php echo esc_html($user->referral_code); ?></code></td>
                    <td><?php echo date('d/m/Y', strtotime($user->created_at)); ?></td>
                    <td>
                        <?php if ($user->is_active): ?>
                        <span class="rafflemania-badge rafflemania-badge-success">Attivo</span>
                        <?php else: ?>
                        <span class="rafflemania-badge rafflemania-badge-danger">Disattivo</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <!-- Pagination -->
    <?php if ($total_pages > 1): ?>
    <div class="rafflemania-pagination">
        <?php
        echo paginate_links([
            'base' => add_query_arg('paged', '%#%'),
            'format' => '',
            'current' => $page,
            'total' => $total_pages,
            'prev_text' => '« Precedente',
            'next_text' => 'Successivo »'
        ]);
        ?>
    </div>
    <?php endif; ?>
</div>

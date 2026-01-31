<?php
/**
 * Test script to manually update stats and verify they work
 * Access via: /wp-content/plugins/rafflemania-api/test-stats.php?action=xxx
 */

require_once(__DIR__ . '/../../../wp-load.php');

if (!current_user_can('manage_options')) {
    die('Access denied - must be admin');
}

global $wpdb;
$table_daily_stats = $wpdb->prefix . 'rafflemania_daily_stats';

// Use Italian timezone
$italy_tz = new DateTimeZone('Europe/Rome');
$today = (new DateTime('now', $italy_tz))->format('Y-m-d');

$action = isset($_GET['action']) ? $_GET['action'] : 'show';

echo "<h1>RaffleMania Stats Tester</h1>";
echo "<p>Today (Italy): <strong>{$today}</strong></p>";

// Show current stats
echo "<h2>Current Daily Stats:</h2>";
$stats = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM {$table_daily_stats} WHERE stat_date = %s",
    $today
));

if ($stats) {
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
    echo "<tr><th>Field</th><th>Value</th></tr>";
    foreach ($stats as $key => $value) {
        echo "<tr><td>{$key}</td><td>{$value}</td></tr>";
    }
    echo "</table>";
} else {
    echo "<p style='color: red;'>No stats record for today!</p>";
}

// Handle actions
if ($action === 'add_ads') {
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table_daily_stats} WHERE stat_date = %s",
        $today
    ));

    if ($existing) {
        $result = $wpdb->query($wpdb->prepare(
            "UPDATE {$table_daily_stats} SET ads_watched = ads_watched + 1 WHERE stat_date = %s",
            $today
        ));
        echo "<p style='color: green;'>✅ Added 1 to ads_watched (result: {$result})</p>";
    } else {
        $wpdb->insert($table_daily_stats, [
            'stat_date' => $today,
            'ads_watched' => 1
        ]);
        echo "<p style='color: green;'>✅ Created new record with ads_watched = 1</p>";
    }
    echo "<script>setTimeout(() => location.href='?action=show', 1000);</script>";
}

if ($action === 'add_credits') {
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table_daily_stats} WHERE stat_date = %s",
        $today
    ));

    if ($existing) {
        $result = $wpdb->query($wpdb->prepare(
            "UPDATE {$table_daily_stats} SET credits_spent = credits_spent + 5 WHERE stat_date = %s",
            $today
        ));
        echo "<p style='color: green;'>✅ Added 5 to credits_spent (result: {$result})</p>";
    } else {
        $wpdb->insert($table_daily_stats, [
            'stat_date' => $today,
            'credits_spent' => 5
        ]);
        echo "<p style='color: green;'>✅ Created new record with credits_spent = 5</p>";
    }
    echo "<script>setTimeout(() => location.href='?action=show', 1000);</script>";
}

if ($action === 'add_draw') {
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table_daily_stats} WHERE stat_date = %s",
        $today
    ));

    if ($existing) {
        $result = $wpdb->query($wpdb->prepare(
            "UPDATE {$table_daily_stats} SET draws_made = draws_made + 1 WHERE stat_date = %s",
            $today
        ));
        echo "<p style='color: green;'>✅ Added 1 to draws_made (result: {$result})</p>";
    } else {
        $wpdb->insert($table_daily_stats, [
            'stat_date' => $today,
            'draws_made' => 1
        ]);
        echo "<p style='color: green;'>✅ Created new record with draws_made = 1</p>";
    }
    echo "<script>setTimeout(() => location.href='?action=show', 1000);</script>";
}

if ($action === 'add_winner') {
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table_daily_stats} WHERE stat_date = %s",
        $today
    ));

    if ($existing) {
        $result = $wpdb->query($wpdb->prepare(
            "UPDATE {$table_daily_stats} SET winners = winners + 1 WHERE stat_date = %s",
            $today
        ));
        echo "<p style='color: green;'>✅ Added 1 to winners (result: {$result})</p>";
    } else {
        $wpdb->insert($table_daily_stats, [
            'stat_date' => $today,
            'winners' => 1
        ]);
        echo "<p style='color: green;'>✅ Created new record with winners = 1</p>";
    }
    echo "<script>setTimeout(() => location.href='?action=show', 1000);</script>";
}

if ($action === 'add_login') {
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table_daily_stats} WHERE stat_date = %s",
        $today
    ));

    if ($existing) {
        $result = $wpdb->query($wpdb->prepare(
            "UPDATE {$table_daily_stats} SET logins = logins + 1 WHERE stat_date = %s",
            $today
        ));
        echo "<p style='color: green;'>✅ Added 1 to logins (result: {$result})</p>";
    } else {
        $wpdb->insert($table_daily_stats, [
            'stat_date' => $today,
            'logins' => 1
        ]);
        echo "<p style='color: green;'>✅ Created new record with logins = 1</p>";
    }
    echo "<script>setTimeout(() => location.href='?action=show', 1000);</script>";
}

// Test buttons
echo "<h2>Test Actions:</h2>";
echo "<p><a href='?action=add_login' style='padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;'>+ Add Login</a>";
echo "<a href='?action=add_ads' style='padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;'>+ Add Ad Watched</a>";
echo "<a href='?action=add_credits' style='padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;'>+ Add Credits Spent</a>";
echo "<a href='?action=add_draw' style='padding: 10px 20px; background: #6f42c1; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;'>+ Add Draw</a>";
echo "<a href='?action=add_winner' style='padding: 10px 20px; background: #fd7e14; color: white; text-decoration: none; border-radius: 5px;'>+ Add Winner</a></p>";

echo "<hr>";
echo "<p><strong>After clicking a button, refresh the dashboard to see if stats updated!</strong></p>";
echo "<p><a href='/wp-admin/admin.php?page=rafflemania'>Go to Dashboard</a></p>";

// Show all daily stats
echo "<h2>All Daily Stats Records:</h2>";
$all_stats = $wpdb->get_results("SELECT * FROM {$table_daily_stats} ORDER BY stat_date DESC LIMIT 10");
if (!empty($all_stats)) {
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
    echo "<tr><th>Date</th><th>Logins</th><th>Ads</th><th>Credits</th><th>Draws</th><th>Winners</th></tr>";
    foreach ($all_stats as $row) {
        $draws = isset($row->draws_made) ? $row->draws_made : 'N/A';
        $winners = isset($row->winners) ? $row->winners : 'N/A';
        echo "<tr>";
        echo "<td>{$row->stat_date}</td>";
        echo "<td>{$row->logins}</td>";
        echo "<td>{$row->ads_watched}</td>";
        echo "<td>{$row->credits_spent}</td>";
        echo "<td>{$draws}</td>";
        echo "<td>{$winners}</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "<p>No records found.</p>";
}

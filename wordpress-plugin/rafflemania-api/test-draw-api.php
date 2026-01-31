<?php
/**
 * Test the draws API tracking
 */

require_once(__DIR__ . '/../../../wp-load.php');

if (!current_user_can('manage_options')) {
    die('Access denied');
}

global $wpdb;
$table_daily_stats = $wpdb->prefix . 'rafflemania_daily_stats';

$italy_tz = new DateTimeZone('Europe/Rome');
$today = (new DateTime('now', $italy_tz))->format('Y-m-d');

echo "<h1>Test Draw API Tracking</h1>";

$action = isset($_GET['action']) ? $_GET['action'] : 'show';

// Get current stats
$stats_before = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM {$table_daily_stats} WHERE stat_date = %s",
    $today
));

echo "<h2>Current Stats (Before):</h2>";
echo "<pre>";
print_r($stats_before);
echo "</pre>";

if ($action === 'add_draw') {
    echo "<h2>Adding Draw...</h2>";

    // Simulate what track_daily_stat does
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table_daily_stats} WHERE stat_date = %s",
        $today
    ));

    echo "Existing record ID: " . ($existing ?: 'NONE') . "<br>";

    if ($existing) {
        $sql = $wpdb->prepare(
            "UPDATE {$table_daily_stats} SET draws_made = draws_made + 1 WHERE stat_date = %s",
            $today
        );
        echo "SQL: {$sql}<br>";
        $result = $wpdb->query($sql);
        echo "Result: " . ($result === false ? "FAILED - " . $wpdb->last_error : "SUCCESS (rows: {$result})") . "<br>";
    } else {
        $result = $wpdb->insert($table_daily_stats, [
            'stat_date' => $today,
            'draws_made' => 1
        ]);
        echo "Insert result: " . ($result === false ? "FAILED - " . $wpdb->last_error : "SUCCESS") . "<br>";
    }

    // Get stats after
    $stats_after = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table_daily_stats} WHERE stat_date = %s",
        $today
    ));

    echo "<h2>Stats After:</h2>";
    echo "<pre>";
    print_r($stats_after);
    echo "</pre>";
}

if ($action === 'add_winner') {
    echo "<h2>Adding Winner...</h2>";

    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table_daily_stats} WHERE stat_date = %s",
        $today
    ));

    if ($existing) {
        $sql = $wpdb->prepare(
            "UPDATE {$table_daily_stats} SET winners = winners + 1 WHERE stat_date = %s",
            $today
        );
        echo "SQL: {$sql}<br>";
        $result = $wpdb->query($sql);
        echo "Result: " . ($result === false ? "FAILED - " . $wpdb->last_error : "SUCCESS (rows: {$result})") . "<br>";
    } else {
        $result = $wpdb->insert($table_daily_stats, [
            'stat_date' => $today,
            'winners' => 1
        ]);
        echo "Insert result: " . ($result === false ? "FAILED - " . $wpdb->last_error : "SUCCESS") . "<br>";
    }

    // Get stats after
    $stats_after = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table_daily_stats} WHERE stat_date = %s",
        $today
    ));

    echo "<h2>Stats After:</h2>";
    echo "<pre>";
    print_r($stats_after);
    echo "</pre>";
}

echo "<hr>";
echo "<h2>Test Actions:</h2>";
echo "<p>";
echo "<a href='?action=add_draw' style='padding: 10px 20px; background: #6f42c1; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;'>+ Add Draw</a>";
echo "<a href='?action=add_winner' style='padding: 10px 20px; background: #fd7e14; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;'>+ Add Winner</a>";
echo "<a href='?' style='padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px;'>Refresh</a>";
echo "</p>";

echo "<hr>";
echo "<p><a href='/wp-admin/admin.php?page=rafflemania'>Go to Dashboard</a></p>";

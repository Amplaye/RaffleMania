<?php
/**
 * Create the daily stats table
 */

require_once(__DIR__ . '/../../../wp-load.php');

if (!current_user_can('manage_options')) {
    die('Access denied');
}

global $wpdb;

$table_daily_stats = $wpdb->prefix . 'rafflemania_daily_stats';

echo "<h1>Creating Daily Stats Table</h1>";
echo "<pre style='background: #f5f5f5; padding: 20px;'>";

// First, try to drop the table if it exists (to start fresh)
echo "Step 1: Dropping table if exists...\n";
$wpdb->query("DROP TABLE IF EXISTS {$table_daily_stats}");
echo "Done.\n\n";

// Create table with simpler syntax (no duplicate index name issue)
echo "Step 2: Creating table...\n";
$sql = "CREATE TABLE {$table_daily_stats} (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    stat_date DATE NOT NULL,
    logins INT DEFAULT 0,
    tickets_created INT DEFAULT 0,
    new_users INT DEFAULT 0,
    ads_watched INT DEFAULT 0,
    credits_spent INT DEFAULT 0,
    draws_made INT DEFAULT 0,
    winners INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

echo "SQL:\n{$sql}\n\n";

$result = $wpdb->query($sql);

if ($result === false) {
    echo "ERROR: " . $wpdb->last_error . "\n";
} else {
    echo "SUCCESS! Table created.\n\n";

    // Verify table exists
    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_daily_stats}'");
    echo "Table exists check: " . ($table_exists ? "YES" : "NO") . "\n\n";

    // Show structure
    echo "Table structure:\n";
    $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_daily_stats}");
    foreach ($columns as $col) {
        echo "  - {$col->Field} ({$col->Type})\n";
    }
    echo "\n";

    // Insert today's record
    $italy_tz = new DateTimeZone('Europe/Rome');
    $today = (new DateTime('now', $italy_tz))->format('Y-m-d');

    echo "Step 3: Creating today's record ({$today})...\n";
    $insert_result = $wpdb->insert($table_daily_stats, [
        'stat_date' => $today,
        'logins' => 0,
        'tickets_created' => 0,
        'new_users' => 0,
        'ads_watched' => 0,
        'credits_spent' => 0,
        'draws_made' => 0,
        'winners' => 0
    ]);

    if ($insert_result === false) {
        echo "ERROR: " . $wpdb->last_error . "\n";
    } else {
        echo "SUCCESS! Record created with ID: " . $wpdb->insert_id . "\n\n";
    }

    // Test update
    echo "Step 4: Testing update (ads_watched +1)...\n";
    $update_result = $wpdb->query($wpdb->prepare(
        "UPDATE {$table_daily_stats} SET ads_watched = ads_watched + 1 WHERE stat_date = %s",
        $today
    ));

    if ($update_result === false) {
        echo "ERROR: " . $wpdb->last_error . "\n";
    } else {
        echo "SUCCESS! Rows affected: {$update_result}\n\n";
    }

    // Show final data
    echo "Final data:\n";
    $record = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table_daily_stats} WHERE stat_date = %s",
        $today
    ));
    print_r($record);
}

echo "</pre>";

echo "<hr>";
echo "<h2 style='color: green;'>DONE! Now go check the dashboard.</h2>";
echo "<p><a href='/wp-admin/admin.php?page=rafflemania' style='padding: 15px 30px; background: #FF6B00; color: white; text-decoration: none; border-radius: 8px; font-size: 18px;'>Go to Dashboard</a></p>";

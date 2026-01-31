<?php
/**
 * Debug script - shows exactly what's happening with the database
 */

require_once(__DIR__ . '/../../../wp-load.php');

if (!current_user_can('manage_options')) {
    die('Access denied');
}

global $wpdb;

echo "<h1>RaffleMania Database Debug</h1>";
echo "<pre style='background: #f5f5f5; padding: 20px; font-size: 14px;'>";

// 1. Check table name
$table_daily_stats = $wpdb->prefix . 'rafflemania_daily_stats';
echo "Table name: {$table_daily_stats}\n\n";

// 2. Check if table exists
$table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_daily_stats}'");
echo "Table exists: " . ($table_exists ? "YES" : "NO") . "\n\n";

if (!$table_exists) {
    echo "CREATING TABLE...\n";
    $result = $wpdb->query("CREATE TABLE {$table_daily_stats} (
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

    echo "Create result: " . ($result === false ? "FAILED - " . $wpdb->last_error : "SUCCESS") . "\n\n";
}

// 3. Show table structure
echo "TABLE STRUCTURE:\n";
$columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_daily_stats}");
if ($wpdb->last_error) {
    echo "ERROR: " . $wpdb->last_error . "\n";
} else {
    foreach ($columns as $col) {
        echo "  - {$col->Field} ({$col->Type})\n";
    }
}
echo "\n";

// 4. Check for missing columns and add them
$column_names = array_column($columns, 'Field');
$required_columns = ['logins', 'tickets_created', 'new_users', 'ads_watched', 'credits_spent', 'draws_made', 'winners'];

echo "CHECKING REQUIRED COLUMNS:\n";
foreach ($required_columns as $col) {
    $exists = in_array($col, $column_names);
    echo "  - {$col}: " . ($exists ? "EXISTS" : "MISSING") . "\n";

    if (!$exists) {
        echo "    Adding column {$col}...\n";
        $result = $wpdb->query("ALTER TABLE {$table_daily_stats} ADD COLUMN {$col} INT DEFAULT 0");
        echo "    Result: " . ($result === false ? "FAILED - " . $wpdb->last_error : "SUCCESS") . "\n";
    }
}
echo "\n";

// 5. Get today's date (Italian timezone)
$italy_tz = new DateTimeZone('Europe/Rome');
$today = (new DateTime('now', $italy_tz))->format('Y-m-d');
echo "TODAY (Italy): {$today}\n\n";

// 6. Check if today's record exists
$today_record = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM {$table_daily_stats} WHERE stat_date = %s",
    $today
));

if ($today_record) {
    echo "TODAY'S RECORD EXISTS:\n";
    print_r($today_record);
} else {
    echo "TODAY'S RECORD DOES NOT EXIST - Creating...\n";
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
        echo "INSERT FAILED: " . $wpdb->last_error . "\n";
    } else {
        echo "INSERT SUCCESS - ID: " . $wpdb->insert_id . "\n";
        $today_record = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_daily_stats} WHERE stat_date = %s",
            $today
        ));
        print_r($today_record);
    }
}
echo "\n";

// 7. Test UPDATE
echo "TESTING UPDATE (ads_watched +1):\n";
$update_sql = $wpdb->prepare(
    "UPDATE {$table_daily_stats} SET ads_watched = ads_watched + 1 WHERE stat_date = %s",
    $today
);
echo "SQL: {$update_sql}\n";
$update_result = $wpdb->query($update_sql);
echo "Result: " . ($update_result === false ? "FAILED - " . $wpdb->last_error : "SUCCESS (rows affected: {$update_result})") . "\n\n";

// 8. Verify update
$after_update = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM {$table_daily_stats} WHERE stat_date = %s",
    $today
));
echo "AFTER UPDATE:\n";
print_r($after_update);
echo "\n";

// 9. Show all records
echo "ALL RECORDS IN TABLE:\n";
$all_records = $wpdb->get_results("SELECT * FROM {$table_daily_stats} ORDER BY stat_date DESC");
if (empty($all_records)) {
    echo "  (no records)\n";
} else {
    foreach ($all_records as $row) {
        echo "  [{$row->stat_date}] logins:{$row->logins}, ads:{$row->ads_watched}, credits:{$row->credits_spent}";
        if (isset($row->draws_made)) echo ", draws:{$row->draws_made}";
        if (isset($row->winners)) echo ", winners:{$row->winners}";
        echo "\n";
    }
}

echo "</pre>";

echo "<hr>";
echo "<p><a href='/wp-admin/admin.php?page=rafflemania'>Go to Dashboard</a></p>";
echo "<p><a href='?refresh=1'>Run Debug Again</a></p>";

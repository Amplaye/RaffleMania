<?php
/**
 * Check users table structure and add missing columns
 */

require_once(__DIR__ . '/../../../wp-load.php');

if (!current_user_can('manage_options')) {
    die('Access denied');
}

global $wpdb;
$table_users = $wpdb->prefix . 'rafflemania_users';

echo "<h1>Users Table Structure</h1>";
echo "<pre style='background: #f5f5f5; padding: 20px;'>";

// Show table structure
$columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_users}");
if ($wpdb->last_error) {
    echo "ERROR: " . $wpdb->last_error . "\n";
} else {
    echo "Current columns:\n";
    $column_names = [];
    foreach ($columns as $col) {
        echo "  - {$col->Field} ({$col->Type}) " . ($col->Null === 'YES' ? 'NULL' : 'NOT NULL') . "\n";
        $column_names[] = $col->Field;
    }
}
echo "\n";

// Check if watched_ads column exists
if (!in_array('watched_ads', $column_names)) {
    echo "Column 'watched_ads' DOES NOT EXIST! Adding it...\n";
    $result = $wpdb->query("ALTER TABLE {$table_users} ADD COLUMN watched_ads INT DEFAULT 0");
    if ($result === false) {
        echo "ERROR: " . $wpdb->last_error . "\n";
    } else {
        echo "SUCCESS! Column added.\n";
    }
} else {
    echo "Column 'watched_ads' exists.\n";
}

echo "\n";

// Show a sample user
echo "Sample user data:\n";
$user = $wpdb->get_row("SELECT id, username, email, credits, xp, level, watched_ads FROM {$table_users} LIMIT 1");
print_r($user);

echo "</pre>";

echo "<hr>";
echo "<p><a href='/wp-admin/admin.php?page=rafflemania'>Go to Dashboard</a></p>";

<?php
/**
 * Database Update Script - Create missing tables
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

$wp_root = dirname(dirname(dirname(dirname(__FILE__))));
$wp_load = $wp_root . '/wp-load.php';

if (!file_exists($wp_load)) {
    die("Cannot find wp-load.php at: " . $wp_load);
}

require_once($wp_load);

global $wpdb;
$charset_collate = $wpdb->get_charset_collate();

echo "WordPress prefix: " . $wpdb->prefix . "\n\n";

$table_users = $wpdb->prefix . 'rafflemania_users';
$table_draws = $wpdb->prefix . 'rafflemania_draws';

$updates = [];

// Create users table using direct SQL
$sql_users = "CREATE TABLE IF NOT EXISTS {$table_users} (
    id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    wp_user_id bigint(20) UNSIGNED DEFAULT NULL,
    email varchar(255) NOT NULL,
    username varchar(100) NOT NULL,
    password_hash varchar(255) NOT NULL,
    avatar_url varchar(500) DEFAULT NULL,
    avatar_color varchar(20) DEFAULT '#FF6B00',
    credits int(11) DEFAULT 0,
    xp int(11) DEFAULT 0,
    level int(11) DEFAULT 1,
    current_streak int(11) DEFAULT 0,
    last_streak_date date DEFAULT NULL,
    referral_code varchar(20),
    referred_by varchar(20) DEFAULT NULL,
    push_token varchar(500) DEFAULT NULL,
    is_active tinyint(1) DEFAULT 1,
    email_verified tinyint(1) DEFAULT 0,
    verification_token varchar(64) DEFAULT NULL,
    verification_token_expires datetime DEFAULT NULL,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY email (email),
    UNIQUE KEY username (username)
) {$charset_collate};";

$result = $wpdb->query($sql_users);
if ($result === false) {
    $updates[] = "ERROR creating users: " . $wpdb->last_error;
} else {
    $updates[] = "Created/verified users table";
}

// Create draws table using direct SQL
$sql_draws = "CREATE TABLE IF NOT EXISTS {$table_draws} (
    id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    draw_id varchar(100) NOT NULL,
    prize_id bigint(20) UNSIGNED NOT NULL,
    winning_number int(11) NOT NULL,
    winner_user_id bigint(20) UNSIGNED DEFAULT NULL,
    winner_ticket_id bigint(20) UNSIGNED DEFAULT NULL,
    total_tickets int(11) DEFAULT 0,
    extracted_at datetime DEFAULT NULL,
    status varchar(20) DEFAULT 'scheduled',
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY draw_id (draw_id)
) {$charset_collate};";

$result = $wpdb->query($sql_draws);
if ($result === false) {
    $updates[] = "ERROR creating draws: " . $wpdb->last_error;
} else {
    $updates[] = "Created/verified draws table";
}

echo "Updates:\n";
foreach ($updates as $u) {
    echo "- {$u}\n";
}

// Verify all rafflemania tables
echo "\nAll RaffleMania tables:\n";
$all_tables = $wpdb->get_results("SHOW TABLES");
foreach ($all_tables as $table) {
    $name = array_values((array)$table)[0];
    if (strpos($name, 'rafflemania') !== false) {
        echo "- {$name}\n";
    }
}

// Show users table structure
echo "\nUsers table structure:\n";
$cols = $wpdb->get_results("SHOW COLUMNS FROM {$table_users}");
if ($cols) {
    foreach ($cols as $col) {
        echo "- {$col->Field}: {$col->Type}\n";
    }
} else {
    echo "Could not read users table: " . $wpdb->last_error . "\n";
}

echo "\nDONE! Delete this file now.";

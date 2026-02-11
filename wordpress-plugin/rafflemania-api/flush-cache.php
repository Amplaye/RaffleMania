<?php
/**
 * Cache flush utility + TEMP DB debug
 */

// TEMP DEBUG: DB query FIRST before anything else - REMOVE AFTER DEBUGGING
if (isset($_GET['dbcheck'])) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    header('Content-Type: application/json');
    header('Cache-Control: no-cache, no-store');

    require_once(dirname(dirname(dirname(dirname(__FILE__)))) . '/wp-load.php');
    global $wpdb;

    $table_referrals = $wpdb->prefix . 'rafflemania_referrals';
    $table_users = $wpdb->prefix . 'rafflemania_users';

    $referrals = $wpdb->get_results("SELECT * FROM {$table_referrals} ORDER BY created_at DESC LIMIT 20");
    $referred_users = $wpdb->get_results("SELECT id, username, email, referral_code, referred_by, email_verified FROM {$table_users} WHERE referred_by IS NOT NULL ORDER BY id DESC LIMIT 20");
    $all_users = $wpdb->get_results("SELECT id, username, email, referral_code, referred_by, email_verified FROM {$table_users} ORDER BY id DESC LIMIT 20");

    echo json_encode([
        'referrals_table' => $referrals,
        'users_with_referral' => $referred_users,
        'recent_users' => $all_users,
        'referrals_count' => count($referrals),
    ], JSON_PRETTY_PRINT);
    exit;
}

// Clear OPcache if available
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "OPcache cleared!\n";
} else {
    echo "OPcache not available\n";
}

// Clear specific files from opcache
$files_to_clear = [
    __DIR__ . '/includes/API/PrizesController.php',
    __DIR__ . '/includes/API/SettingsController.php',
    __DIR__ . '/includes/API/ReferralController.php',
    __DIR__ . '/includes/Plugin.php',
];

foreach ($files_to_clear as $file) {
    if (function_exists('opcache_invalidate') && file_exists($file)) {
        opcache_invalidate($file, true);
        echo "Invalidated: $file\n";
    }
}

// Also invalidate THIS file so next request picks up any changes
if (function_exists('opcache_invalidate')) {
    opcache_invalidate(__FILE__, true);
    echo "Self-invalidated: " . __FILE__ . "\n";
}

echo "\nDone! Refresh the API to see changes.\n";

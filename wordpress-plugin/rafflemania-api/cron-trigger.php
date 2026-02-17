<?php
/**
 * RaffleMania External Cron Trigger
 *
 * MUST be called every minute by Plesk Scheduled Tasks.
 *
 * Plesk command:
 *   curl -s "https://www.rafflemania.it/wp-content/plugins/rafflemania-api/cron-trigger.php" > /dev/null 2>&1
 *
 * This loads WordPress and triggers the extraction check DIRECTLY,
 * completely independent from WP-Cron and site visits.
 */

// Write execution log (always, for debugging)
$log_dir = __DIR__ . '/logs';
if (!is_dir($log_dir)) {
    @mkdir($log_dir, 0755, true);
    // Protect logs directory
    @file_put_contents($log_dir . '/.htaccess', 'Deny from all');
}
$log_file = $log_dir . '/cron.log';

// Keep log file manageable (max 50KB)
if (file_exists($log_file) && filesize($log_file) > 50000) {
    $lines = file($log_file);
    file_put_contents($log_file, implode('', array_slice($lines, -100)));
}

function cron_log($msg) {
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($log_file, "[{$timestamp}] {$msg}\n", FILE_APPEND);
}

cron_log('=== Cron trigger started ===');

// Rate limiting: max once per 45 seconds
$lock_file = sys_get_temp_dir() . '/rafflemania_cron.lock';
if (file_exists($lock_file) && (time() - filemtime($lock_file)) < 45) {
    cron_log('Skipped: rate limited (last run ' . (time() - filemtime($lock_file)) . 's ago)');
    http_response_code(200);
    echo json_encode(['status' => 'skipped', 'reason' => 'rate_limited']);
    exit;
}
touch($lock_file);

// Load WordPress
$wp_load_path = dirname(__FILE__) . '/../../../wp-load.php';
if (!file_exists($wp_load_path)) {
    $wp_load_path = dirname(__FILE__) . '/../../../../wp-load.php';
}

if (!file_exists($wp_load_path)) {
    cron_log('ERROR: WordPress not found at any expected path');
    http_response_code(500);
    echo json_encode(['error' => 'WordPress not found']);
    exit;
}

// Silence output during WP load
define('DOING_CRON', true);
require_once $wp_load_path;

cron_log('WordPress loaded successfully');

// Check for prizes with expired timers BEFORE triggering action
global $wpdb;
$expired = $wpdb->get_results(
    "SELECT id, name, scheduled_at FROM {$wpdb->prefix}rafflemania_prizes
     WHERE timer_status = 'countdown'
     AND scheduled_at IS NOT NULL
     AND scheduled_at <= NOW()"
);

if (!empty($expired)) {
    foreach ($expired as $p) {
        cron_log("EXPIRED PRIZE FOUND: ID={$p->id} name={$p->name} scheduled_at={$p->scheduled_at}");
    }
} else {
    cron_log('No expired prizes found');
}

// Also check approaching prizes
$approaching = $wpdb->get_results(
    "SELECT id, name, scheduled_at FROM {$wpdb->prefix}rafflemania_prizes
     WHERE timer_status = 'countdown'
     AND scheduled_at IS NOT NULL
     AND scheduled_at > NOW()
     AND scheduled_at <= DATE_ADD(NOW(), INTERVAL 6 MINUTE)"
);

if (!empty($approaching)) {
    foreach ($approaching as $p) {
        cron_log("APPROACHING PRIZE: ID={$p->id} name={$p->name} scheduled_at={$p->scheduled_at}");
    }
}

// Trigger the extraction check directly
do_action('rafflemania_check_extractions');
cron_log('rafflemania_check_extractions action fired');

// Also trigger WP-Cron events (catches any other scheduled tasks)
wp_cron();
cron_log('wp_cron() executed');

cron_log('=== Cron trigger completed ===');

http_response_code(200);
echo json_encode([
    'status' => 'ok',
    'timestamp' => current_time('mysql'),
    'expired_prizes' => count($expired ?? []),
    'approaching_prizes' => count($approaching ?? []),
]);

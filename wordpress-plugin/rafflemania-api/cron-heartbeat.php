<?php
/**
 * RaffleMania Cron Heartbeat - Self-sustaining cron loop
 *
 * This script runs WP-Cron tasks and then re-calls itself after 55 seconds,
 * creating a perpetual heartbeat that doesn't depend on site visits or
 * external cron services.
 *
 * The chain is restarted automatically by Plugin.php's shutdown hook
 * if it ever dies (e.g., server restart, timeout).
 */

// Prevent direct browser abuse (allow CLI and HTTP with Host header)
if (php_sapi_name() !== 'cli' && empty($_SERVER['HTTP_HOST'])) {
    exit;
}

// Increase limits for this long-running script
@ignore_user_abort(true);
@set_time_limit(90);

// Logging
$log_dir = __DIR__ . '/logs';
if (!is_dir($log_dir)) {
    @mkdir($log_dir, 0755, true);
    @file_put_contents($log_dir . '/.htaccess', 'Deny from all');
}
$log_file = $log_dir . '/heartbeat.log';

// Keep log manageable (max 50KB)
if (file_exists($log_file) && filesize($log_file) > 50000) {
    $lines = file($log_file);
    file_put_contents($log_file, implode('', array_slice($lines, -100)));
}

function hb_log($msg) {
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($log_file, "[{$timestamp}] {$msg}\n", FILE_APPEND);
}

hb_log('=== Heartbeat started ===');

// Rate limit: only one heartbeat chain at a time
$lock_file = sys_get_temp_dir() . '/rafflemania_heartbeat.lock';

// If lock exists and is fresh (< 80 seconds old), another instance is running
if (file_exists($lock_file) && (time() - filemtime($lock_file)) < 80) {
    hb_log('Another instance running (lock fresh). Exiting.');
    // Update transient to show chain is alive
    $wp_load = dirname(__FILE__) . '/../../../wp-load.php';
    if (file_exists($wp_load)) {
        define('DOING_CRON', true);
        require_once $wp_load;
        set_transient('rafflemania_heartbeat_alive', 1, 90);
    }
    http_response_code(200);
    echo json_encode(['status' => 'already_running']);
    exit;
}

// Acquire lock
@touch($lock_file);
hb_log('Lock acquired');

// Load WordPress
$wp_load = dirname(__FILE__) . '/../../../wp-load.php';
if (!file_exists($wp_load)) {
    $wp_load = dirname(__FILE__) . '/../../../../wp-load.php';
}

if (!file_exists($wp_load)) {
    hb_log('ERROR: wp-load.php not found');
    http_response_code(500);
    echo json_encode(['error' => 'wp-load not found']);
    exit;
}

define('DOING_CRON', true);
require_once $wp_load;
hb_log('WordPress loaded');

// Mark heartbeat as alive (90 second TTL)
set_transient('rafflemania_heartbeat_alive', 1, 90);

// Run extraction checks
do_action('rafflemania_check_extractions');
hb_log('Extraction check done');

// Process any pending WP-Cron events
wp_cron();
hb_log('wp_cron() executed');

// Build the response BEFORE trying to disconnect
$response_body = json_encode(['status' => 'ok', 'time' => time()]);
$response_length = strlen($response_body);

// Send response and close connection so the caller can disconnect
// Method 1: fastcgi_finish_request (PHP-FPM) - most reliable
if (function_exists('fastcgi_finish_request')) {
    hb_log('Using fastcgi_finish_request to disconnect');
    echo $response_body;
    fastcgi_finish_request();
} else {
    // Method 2: Headers + flush (Apache mod_php)
    hb_log('Using header flush to disconnect');
    if (!headers_sent()) {
        header('Content-Type: application/json');
        header('Content-Length: ' . $response_length);
        header('Connection: close');
    }
    echo $response_body;

    // Flush all output buffers
    while (ob_get_level() > 0) {
        ob_end_flush();
    }
    flush();
}

hb_log('Response sent, sleeping 55 seconds...');

// Now sleep and re-trigger ourselves
// The caller has already disconnected, so this runs in the background
sleep(55);

hb_log('Woke up from sleep');

// Release lock BEFORE re-triggering so the new instance can acquire it
@unlink($lock_file);

// Re-trigger: call ourselves to create the next iteration
$heartbeat_url = site_url('/wp-content/plugins/rafflemania-api/cron-heartbeat.php?t=' . time());
hb_log('Re-triggering: ' . $heartbeat_url);

wp_remote_get($heartbeat_url, [
    'timeout' => 5,
    'blocking' => false,
    'sslverify' => false,
]);

hb_log('=== Heartbeat cycle complete ===');

<?php
/**
 * Test the /draws/track-stats endpoint
 */

require_once(__DIR__ . '/../../../wp-load.php');

if (!current_user_can('manage_options')) {
    die('Access denied');
}

global $wpdb;
$table_daily_stats = $wpdb->prefix . 'rafflemania_daily_stats';

$italy_tz = new DateTimeZone('Europe/Rome');
$today = (new DateTime('now', $italy_tz))->format('Y-m-d');

echo "<h1>Test Track Stats Endpoint</h1>";

// Get current stats
$stats_before = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM {$table_daily_stats} WHERE stat_date = %s",
    $today
));

echo "<h2>Current Stats (Before):</h2>";
echo "<pre>";
print_r($stats_before);
echo "</pre>";

$action = isset($_GET['action']) ? $_GET['action'] : 'show';

if ($action === 'test_draw') {
    echo "<h2>Testing draw tracking...</h2>";

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
}

if ($action === 'test_winner') {
    echo "<h2>Testing winner tracking...</h2>";

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
}

if ($action === 'test_api') {
    echo "<h2>Testing API Endpoint via cURL...</h2>";

    // Get a test user token (for testing purposes)
    $jwt_secret = get_option('rafflemania_jwt_secret');

    if (!$jwt_secret) {
        echo "<p style='color: red;'>JWT Secret not configured!</p>";
    } else {
        // Create a test token for user 1
        $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload = base64_encode(json_encode([
            'user_id' => 1,
            'exp' => time() + 3600
        ]));
        $signature = base64_encode(hash_hmac('sha256', $header . '.' . $payload, $jwt_secret, true));
        $token = $header . '.' . $payload . '.' . str_replace(['+', '/', '='], ['-', '_', ''], $signature);

        $url = home_url('/wp-json/rafflemania/v1/draws/track-stats');

        echo "API URL: {$url}<br>";
        echo "Token (first 50 chars): " . substr($token, 0, 50) . "...<br><br>";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['is_winner' => false]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        echo "HTTP Code: {$http_code}<br>";
        if ($error) {
            echo "cURL Error: {$error}<br>";
        }
        echo "Response:<br><pre>";
        print_r(json_decode($response, true));
        echo "</pre>";
    }
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

echo "<hr>";
echo "<h2>Test Actions:</h2>";
echo "<p>";
echo "<a href='?action=test_draw' style='padding: 10px 20px; background: #6f42c1; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;'>Test Draw</a>";
echo "<a href='?action=test_winner' style='padding: 10px 20px; background: #fd7e14; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;'>Test Winner</a>";
echo "<a href='?action=test_api' style='padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;'>Test API Endpoint</a>";
echo "<a href='?' style='padding: 10px 20px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px;'>Refresh</a>";
echo "</p>";

echo "<hr>";
echo "<p><a href='/wp-admin/admin.php?page=rafflemania'>Go to Dashboard</a></p>";

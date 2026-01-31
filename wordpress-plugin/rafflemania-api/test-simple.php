<?php
/**
 * Simple test - DELETE AFTER USE
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once($_SERVER['DOCUMENT_ROOT'] . '/wp-load.php');

header('Content-Type: application/json');

global $wpdb;
$table_users = $wpdb->prefix . 'rafflemania_users';

// Get JWT secret
$secret = get_option('rafflemania_jwt_secret');

// Test query
$user = $wpdb->get_row($wpdb->prepare(
    "SELECT id, email, credits FROM {$table_users} WHERE id = %d",
    2
));

echo json_encode([
    'secret_exists' => !empty($secret),
    'user' => $user
], JSON_PRETTY_PRINT);

<?php
/**
 * Test REST API directly - DELETE AFTER USE
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once($_SERVER['DOCUMENT_ROOT'] . '/wp-load.php');

header('Content-Type: application/json');

global $wpdb;
$table_users = $wpdb->prefix . 'rafflemania_users';

// Get JWT secret
$secret = get_option('rafflemania_jwt_secret');

if (!$secret) {
    echo json_encode(['error' => 'No JWT secret']);
    exit;
}

// Create token for user 2
$header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
$payload = json_encode(['user_id' => 2, 'exp' => time() + 3600]);

$base64Header = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
$base64Payload = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
$signature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
$base64Signature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

$token = "$base64Header.$base64Payload.$base64Signature";

// Now manually do what UsersController does
// 1. Verify token
$parts = explode('.', $token);
list($b64Header, $b64Payload, $b64Sig) = $parts;

$sig = base64_decode(strtr($b64Sig, '-_', '+/'));
$expectedSig = hash_hmac('sha256', "$b64Header.$b64Payload", $secret, true);

$sigMatch = hash_equals($sig, $expectedSig);

$payloadDecoded = json_decode(base64_decode(strtr($b64Payload, '-_', '+/')), true);

// 2. Get user
$user_id = $payloadDecoded['user_id'];
$user = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM {$table_users} WHERE id = %d",
    $user_id
));

echo json_encode([
    'token_valid' => $sigMatch,
    'payload' => $payloadDecoded,
    'user_id' => $user_id,
    'user_found' => $user !== null,
    'user_credits' => $user ? (int)$user->credits : null
], JSON_PRETTY_PRINT);

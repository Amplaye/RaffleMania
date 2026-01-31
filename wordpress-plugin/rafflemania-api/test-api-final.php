<?php
/**
 * Test API final - DELETE AFTER USE
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once($_SERVER['DOCUMENT_ROOT'] . '/wp-load.php');

header('Content-Type: application/json');

// Get JWT secret
$secret = get_option('rafflemania_jwt_secret');

// Create token for user 2
$header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
$payload = json_encode(['user_id' => 2, 'exp' => time() + 3600]);

$base64Header = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
$base64Payload = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
$signature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
$base64Signature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

$token = "$base64Header.$base64Payload.$base64Signature";

// Test /users/me endpoint
$request = new WP_REST_Request('GET', '/rafflemania/v1/users/me');
$request->set_header('Authorization', "Bearer $token");

$server = rest_get_server();
$response = $server->dispatch($request);

echo json_encode([
    'status' => $response->get_status(),
    'data' => $response->get_data()
], JSON_PRETTY_PRINT);

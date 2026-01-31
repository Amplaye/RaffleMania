<?php
/**
 * Test endpoint - DELETE AFTER USE
 */
require_once($_SERVER['DOCUMENT_ROOT'] . '/wp-load.php');

header('Content-Type: application/json');

// Get the JWT secret
$secret = get_option('rafflemania_jwt_secret');

// Create a test token for user 2
$header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
$payload = base64_encode(json_encode([
    'user_id' => 2,
    'exp' => time() + 3600
]));
$signature = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));

// Convert to URL-safe base64
$header = strtr($header, '+/', '-_');
$payload = strtr($payload, '+/', '-_');
$signature = strtr($signature, '+/', '-_');

$token = "$header.$payload.$signature";

// Test the REST API
$request = new WP_REST_Request('GET', '/rafflemania/v1/users/me');
$request->set_header('Authorization', "Bearer $token");

// Get the server
$server = rest_get_server();
$response = $server->dispatch($request);

echo json_encode([
    'jwt_secret_exists' => !empty($secret),
    'test_token' => substr($token, 0, 50) . '...',
    'response_status' => $response->get_status(),
    'response_data' => $response->get_data()
], JSON_PRETTY_PRINT);

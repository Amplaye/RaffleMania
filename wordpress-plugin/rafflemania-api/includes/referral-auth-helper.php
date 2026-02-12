<?php
// Referral Auth Helper - v2026-02-09
// This file provides JWT auth for referral endpoints
// when the ReferralController's own check_auth is not available in opcache

add_filter('rest_request_before_callbacks', function($response, $handler, $request) {
    // Only for referral endpoints
    $route = $request->get_route();
    if (strpos($route, '/rafflemania/v1/referrals') === false) {
        return $response;
    }

    // Skip if already authenticated
    if ($request->get_param('_auth_user_id')) {
        return $response;
    }

    // Get auth header
    $auth_header = $request->get_header('Authorization');
    if (!$auth_header || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        return $response;
    }

    $token = $matches[1];

    // Verify JWT
    $secret = get_option('rafflemania_jwt_secret');
    if (!$secret) {
        return $response;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return $response;
    }

    list($base64_header, $base64_payload, $base64_signature) = $parts;

    $signature = base64_decode(strtr($base64_signature, '-_', '+/'));
    $expected_signature = hash_hmac('sha256', $base64_header . '.' . $base64_payload, $secret, true);

    if (!hash_equals($signature, $expected_signature)) {
        return $response;
    }

    $payload = json_decode(base64_decode(strtr($base64_payload, '-_', '+/')), true);

    if (!$payload) {
        return $response;
    }

    if (isset($payload['type']) && $payload['type'] !== 'access') {
        return $response;
    }

    // Check expiry but allow 1 hour grace period for debugging
    if (isset($payload['exp']) && $payload['exp'] < (time() - 3600)) {
        return $response;
    }

    // Set user_id in request
    $request->set_param('_auth_user_id', $payload['user_id']);

    return $response;
}, 10, 3);

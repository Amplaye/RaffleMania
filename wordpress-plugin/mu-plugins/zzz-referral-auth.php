<?php
/**
 * Plugin Name: RaffleMania Referral Auth Helper
 * Description: Provides JWT auth for referral endpoints
 */
add_filter('rest_request_before_callbacks', function($response, $handler, $request) {
    $route = $request->get_route();
    if (strpos($route, '/rafflemania/v1/referrals') === false) {
        return $response;
    }
    if ($request->get_param('_auth_user_id')) {
        return $response;
    }
    $auth_header = $request->get_header('Authorization');
    if (!$auth_header || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        return $response;
    }
    $token = $matches[1];
    $secret = get_option('rafflemania_jwt_secret');
    if (!$secret) return $response;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return $response;
    list($h, $p, $s) = $parts;
    $sig = base64_decode(strtr($s, '-_', '+/'));
    $exp = hash_hmac('sha256', $h . '.' . $p, $secret, true);
    if (!hash_equals($sig, $exp)) return $response;
    $payload = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
    if (!$payload) return $response;
    if (isset($payload['type']) && $payload['type'] !== 'access') return $response;
    $request->set_param('_auth_user_id', $payload['user_id']);
    return $response;
}, 10, 3);

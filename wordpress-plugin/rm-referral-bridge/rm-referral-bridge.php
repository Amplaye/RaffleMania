<?php
/**
 * Plugin Name: RaffleMania Referral Bridge
 * Description: Temporary bridge to serve referral data via AJAX (bypasses opcache issues)
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

// AJAX handler: get referral data (for logged-in and non-logged-in via JWT)
add_action('wp_ajax_rm_referrals', 'rm_bridge_get_referrals');
add_action('wp_ajax_nopriv_rm_referrals', 'rm_bridge_get_referrals');

function rm_bridge_get_referrals() {
    header('Content-Type: application/json');

    // Verify JWT from Authorization header
    $auth_header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($auth_header) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    }

    if (!preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        wp_send_json(['success' => false, 'message' => 'No token provided'], 401);
    }

    $token = $matches[1];
    $secret = get_option('rafflemania_jwt_secret');
    if (!$secret) {
        wp_send_json(['success' => false, 'message' => 'JWT secret not configured'], 500);
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        wp_send_json(['success' => false, 'message' => 'Invalid token format'], 401);
    }

    list($b64header, $b64payload, $b64sig) = $parts;
    $sig = base64_decode(strtr($b64sig, '-_', '+/'));
    $expected = hash_hmac('sha256', $b64header . '.' . $b64payload, $secret, true);

    if (!hash_equals($sig, $expected)) {
        wp_send_json(['success' => false, 'message' => 'Invalid token signature'], 401);
    }

    $payload = json_decode(base64_decode(strtr($b64payload, '-_', '+/')), true);
    if (!$payload || !isset($payload['user_id'])) {
        wp_send_json(['success' => false, 'message' => 'Invalid token payload'], 401);
    }

    if (isset($payload['exp']) && $payload['exp'] < time()) {
        wp_send_json(['success' => false, 'message' => 'Token expired'], 401);
    }

    $user_id = intval($payload['user_id']);

    global $wpdb;
    $table_users = $wpdb->prefix . 'rafflemania_users';
    $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

    $action = isset($_GET['ref_action']) ? sanitize_text_field($_GET['ref_action']) : 'get_referrals';

    switch ($action) {
        case 'get_referrals':
            $referrals = $wpdb->get_results($wpdb->prepare(
                "SELECT r.id, r.referred_user_id as user_id, r.created_at as joined_at,
                        r.days_active, r.last_active_date, r.reward_claimed,
                        u.username as display_name
                 FROM {$table_referrals} r
                 JOIN {$table_users} u ON r.referred_user_id = u.id
                 WHERE r.referrer_user_id = %d
                 ORDER BY r.created_at DESC",
                $user_id
            ));

            $mapped = array_map(function($ref) {
                $days = intval($ref->days_active ?? 0);
                return [
                    'id' => intval($ref->user_id),
                    'username' => $ref->display_name,
                    'display_name' => $ref->display_name,
                    'joined_at' => $ref->joined_at,
                    'days_active' => $days,
                    'last_active_date' => $ref->last_active_date,
                    'is_completed' => $days >= 7,
                    'reward_claimed' => (bool) $ref->reward_claimed,
                ];
            }, $referrals);

            wp_send_json([
                'success' => true,
                'data' => ['referrals' => $mapped, 'total' => count($mapped)]
            ]);
            break;

        case 'get_my_referrer':
            $referral = $wpdb->get_row($wpdb->prepare(
                "SELECT r.id, r.referrer_user_id, r.referral_code,
                        r.days_active as my_days_active, r.last_active_date as my_last_active_date,
                        r.referred_reward_claimed as my_reward_claimed,
                        u.username as referrer_username
                 FROM {$table_referrals} r
                 JOIN {$table_users} u ON r.referrer_user_id = u.id
                 WHERE r.referred_user_id = %d",
                $user_id
            ));

            if (!$referral) {
                wp_send_json(['success' => true, 'data' => ['referrer' => null]]);
            }

            $days = intval($referral->my_days_active ?? 0);
            wp_send_json([
                'success' => true,
                'data' => [
                    'referrer' => [
                        'id' => intval($referral->referrer_user_id),
                        'username' => $referral->referrer_username,
                        'display_name' => $referral->referrer_username,
                        'referral_code' => $referral->referral_code,
                        'my_days_active' => $days,
                        'my_last_active_date' => $referral->my_last_active_date,
                        'my_is_completed' => $days >= 7,
                        'my_reward_claimed' => (bool) $referral->my_reward_claimed,
                    ]
                ]
            ]);
            break;

        case 'track_activity':
            $today = date('Y-m-d');
            $yesterday = date('Y-m-d', strtotime('-1 day'));

            $referral = $wpdb->get_row($wpdb->prepare(
                "SELECT id, days_active, last_active_date FROM {$table_referrals} WHERE referred_user_id = %d",
                $user_id
            ));

            $updated = false;
            $new_days = 0;

            if ($referral) {
                $last = $referral->last_active_date;
                $current = intval($referral->days_active);
                if ($last !== $today) {
                    $new_days = ($last === $yesterday || $last === null) ? min($current + 1, 7) : 1;
                    $wpdb->update($table_referrals,
                        ['days_active' => $new_days, 'last_active_date' => $today],
                        ['id' => $referral->id]
                    );
                    $updated = true;
                } else {
                    $new_days = $current;
                }
            }

            wp_send_json([
                'success' => true,
                'data' => ['updated' => $updated, 'days_active' => $new_days, 'is_completed' => $new_days >= 7]
            ]);
            break;

        case 'debug_db':
            $referrals = $wpdb->get_results("SELECT * FROM {$table_referrals} ORDER BY created_at DESC LIMIT 20");
            $users = $wpdb->get_results("SELECT id, username, email, referral_code, referred_by, email_verified FROM {$table_users} ORDER BY id DESC LIMIT 20");
            wp_send_json([
                'referrals' => $referrals,
                'users' => $users,
                'referrals_count' => count($referrals),
            ]);
            break;

        default:
            wp_send_json(['success' => false, 'message' => 'Unknown action'], 400);
    }
}

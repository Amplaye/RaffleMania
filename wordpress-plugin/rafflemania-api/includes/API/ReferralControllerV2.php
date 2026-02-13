<?php
// ReferralController V2 - with built-in auth - 2026-02-09
namespace RaffleMania\API;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

class ReferralControllerV2 {
    private $namespace = 'rafflemania/v1';
    private $rest_base = 'referrals';

    // Referral rewards configuration
    const DAYS_REQUIRED = 7;
    const REFERRER_CREDITS = 15;
    const REFERRED_CREDITS = 15;

    public function register_routes() {
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_referrals'],
                'permission_callback' => [$this, 'check_auth'],
            ]
        ]);

        register_rest_route($this->namespace, '/' . $this->rest_base . '/my-referrer', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_my_referrer'],
                'permission_callback' => [$this, 'check_auth'],
            ]
        ]);

        register_rest_route($this->namespace, '/' . $this->rest_base . '/activity', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'track_activity'],
                'permission_callback' => [$this, 'check_auth'],
            ]
        ]);

        register_rest_route($this->namespace, '/' . $this->rest_base . '/claim', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'claim_rewards'],
                'permission_callback' => [$this, 'check_auth'],
            ]
        ]);
    }

    public function check_auth(WP_REST_Request $request) {
        $auth_header = $request->get_header('Authorization');

        if (!$auth_header || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            return false;
        }

        $token = $matches[1];
        $payload = $this->verify_jwt($token);

        if (is_wp_error($payload)) {
            return false;
        }

        $request->set_param('_auth_user_id', $payload['user_id']);
        return true;
    }

    private function verify_jwt($token) {
        $secret = get_option('rafflemania_jwt_secret');
        if (!$secret) {
            return new WP_Error('no_secret', 'JWT secret not configured', ['status' => 500]);
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return new WP_Error('invalid_token', 'Token non valido', ['status' => 401]);
        }

        list($base64_header, $base64_payload, $base64_signature) = $parts;

        $signature = $this->base64url_decode($base64_signature);
        $expected_signature = hash_hmac('sha256', $base64_header . '.' . $base64_payload, $secret, true);

        if (!hash_equals($signature, $expected_signature)) {
            return new WP_Error('invalid_signature', 'Firma non valida', ['status' => 401]);
        }

        $payload = json_decode($this->base64url_decode($base64_payload), true);

        if ($payload['exp'] < time()) {
            return new WP_Error('token_expired', 'Token scaduto', ['status' => 401]);
        }

        if (isset($payload['type']) && $payload['type'] !== 'access') {
            return new WP_Error('invalid_token_type', 'Tipo di token non valido', ['status' => 401]);
        }

        return $payload;
    }

    private function base64url_decode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public function get_referrals(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

        $user_id = $request->get_param('_auth_user_id');

        if (!$user_id) {
            return new WP_Error('not_authenticated', 'Autenticazione richiesta', ['status' => 401]);
        }

        $referrals = $wpdb->get_results($wpdb->prepare(
            "SELECT
                r.id,
                r.referred_user_id as user_id,
                r.created_at as joined_at,
                r.days_active,
                r.last_active_date,
                r.reward_claimed,
                u.username as display_name
             FROM {$table_referrals} r
             JOIN {$table_users} u ON r.referred_user_id = u.id
             WHERE r.referrer_user_id = %d
             ORDER BY r.created_at DESC",
            $user_id
        ));

        $mapped_referrals = array_map(function($ref) {
            $days_active = (int) ($ref->days_active ?? 0);
            return [
                'id' => (int) $ref->user_id,
                'username' => $ref->display_name,
                'display_name' => $ref->display_name,
                'joined_at' => $ref->joined_at,
                'days_active' => $days_active,
                'last_active_date' => $ref->last_active_date,
                'is_completed' => $days_active >= self::DAYS_REQUIRED,
                'reward_claimed' => (bool) $ref->reward_claimed,
            ];
        }, $referrals);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'referrals' => $mapped_referrals,
                'total' => count($mapped_referrals),
            ]
        ]);
    }

    public function get_my_referrer(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

        $user_id = $request->get_param('_auth_user_id');

        if (!$user_id) {
            return new WP_Error('not_authenticated', 'Autenticazione richiesta', ['status' => 401]);
        }

        $referral = $wpdb->get_row($wpdb->prepare(
            "SELECT
                r.id,
                r.referrer_user_id,
                r.referral_code,
                r.days_active as my_days_active,
                r.last_active_date as my_last_active_date,
                r.referred_reward_claimed as my_reward_claimed,
                u.username as referrer_username
             FROM {$table_referrals} r
             JOIN {$table_users} u ON r.referrer_user_id = u.id
             WHERE r.referred_user_id = %d",
            $user_id
        ));

        if (!$referral) {
            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'referrer' => null,
                ]
            ]);
        }

        $days_active = (int) ($referral->my_days_active ?? 0);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'referrer' => [
                    'id' => (int) $referral->referrer_user_id,
                    'username' => $referral->referrer_username,
                    'display_name' => $referral->referrer_username,
                    'referral_code' => $referral->referral_code,
                    'my_days_active' => $days_active,
                    'my_last_active_date' => $referral->my_last_active_date,
                    'my_is_completed' => $days_active >= self::DAYS_REQUIRED,
                    'my_reward_claimed' => (bool) $referral->my_reward_claimed,
                ]
            ]
        ]);
    }

    public function track_activity(WP_REST_Request $request) {
        global $wpdb;
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

        $user_id = $request->get_param('_auth_user_id');

        if (!$user_id) {
            return new WP_Error('not_authenticated', 'Autenticazione richiesta', ['status' => 401]);
        }

        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));

        $referral = $wpdb->get_row($wpdb->prepare(
            "SELECT id, days_active, last_active_date FROM {$table_referrals} WHERE referred_user_id = %d",
            $user_id
        ));

        $updated = false;
        $new_days = 0;

        if ($referral) {
            $last_date = $referral->last_active_date;
            $current_days = (int) $referral->days_active;

            if ($last_date !== $today) {
                if ($last_date === $yesterday || $last_date === null) {
                    $new_days = min($current_days + 1, self::DAYS_REQUIRED);
                } else {
                    $new_days = 1;
                }

                $wpdb->update(
                    $table_referrals,
                    [
                        'days_active' => $new_days,
                        'last_active_date' => $today,
                    ],
                    ['id' => $referral->id]
                );
                $updated = true;
            } else {
                $new_days = $current_days;
            }
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'updated' => $updated,
                'days_active' => $new_days,
                'days_required' => self::DAYS_REQUIRED,
                'is_completed' => $new_days >= self::DAYS_REQUIRED,
            ]
        ]);
    }

    public function claim_rewards(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

        $user_id = $request->get_param('_auth_user_id');

        if (!$user_id) {
            return new WP_Error('not_authenticated', 'Autenticazione richiesta', ['status' => 401]);
        }

        $referrer_credits = 0;
        $referred_credits = 0;

        $completed_referrals = $wpdb->get_results($wpdb->prepare(
            "SELECT id FROM {$table_referrals}
             WHERE referrer_user_id = %d
             AND days_active >= %d
             AND reward_claimed = 0",
            $user_id,
            self::DAYS_REQUIRED
        ));

        foreach ($completed_referrals as $ref) {
            $wpdb->update(
                $table_referrals,
                ['reward_claimed' => 1],
                ['id' => $ref->id]
            );
            $referrer_credits += self::REFERRER_CREDITS;
        }

        $my_referral = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM {$table_referrals}
             WHERE referred_user_id = %d
             AND days_active >= %d
             AND referred_reward_claimed = 0",
            $user_id,
            self::DAYS_REQUIRED
        ));

        if ($my_referral) {
            $wpdb->update(
                $table_referrals,
                ['referred_reward_claimed' => 1],
                ['id' => $my_referral->id]
            );
            $referred_credits = self::REFERRED_CREDITS;
        }

        $total_credits = $referrer_credits + $referred_credits;
        $total_xp = 0;

        if ($total_credits > 0) {
            // Award credits
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_users} SET credits = credits + %d WHERE id = %d",
                $total_credits,
                $user_id
            ));

            // Award XP for each referral claimed
            $xp_per_referral = (int) get_option('rafflemania_xp_referral', 50);
            $num_claims = count($completed_referrals) + ($my_referral ? 1 : 0);
            $total_xp = $xp_per_referral * $num_claims;

            if ($total_xp > 0) {
                // Get current XP to calculate new level
                $user = $wpdb->get_row($wpdb->prepare(
                    "SELECT xp, level FROM {$table_users} WHERE id = %d",
                    $user_id
                ));
                $new_xp = (int) $user->xp + $total_xp;
                $new_level = $this->calculate_level($new_xp);

                $wpdb->query($wpdb->prepare(
                    "UPDATE {$table_users} SET xp = %d, level = %d WHERE id = %d",
                    $new_xp,
                    $new_level,
                    $user_id
                ));
            }
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'referrer_credits' => $referrer_credits,
                'referred_credits' => $referred_credits,
                'total_credits' => $total_credits,
                'total_xp' => $total_xp,
                'message' => $total_credits > 0 ? "Hai ottenuto {$total_credits} crediti e {$total_xp} XP!" : 'Nessun premio da riscuotere',
            ]
        ]);
    }

    private function calculate_level($xp) {
        global $wpdb;
        $table_levels = $wpdb->prefix . 'rafflemania_levels';

        $level = $wpdb->get_var($wpdb->prepare(
            "SELECT level FROM {$table_levels} WHERE min_xp <= %d AND is_active = 1 ORDER BY min_xp DESC LIMIT 1",
            $xp
        ));

        return $level ? (int) $level : 1;
    }
}

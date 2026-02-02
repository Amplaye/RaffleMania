<?php
// Cache bust: 1769980015
namespace RaffleMania\API;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

class ReferralController {
    private $namespace = 'rafflemania/v1';
    private $rest_base = 'referrals';

    // Referral rewards configuration
    const DAYS_REQUIRED = 7;
    const REFERRER_CREDITS = 15;
    const REFERRED_CREDITS = 15;

    public function register_routes() {
        // Get my referred users (people who used my code)
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_referrals'],
                'permission_callback' => '__return_true',
            ]
        ]);

        // Get who referred me
        register_rest_route($this->namespace, '/' . $this->rest_base . '/my-referrer', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_my_referrer'],
                'permission_callback' => '__return_true',
            ]
        ]);

        // Track daily activity
        register_rest_route($this->namespace, '/' . $this->rest_base . '/activity', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'track_activity'],
                'permission_callback' => '__return_true',
            ]
        ]);

        // Claim rewards
        register_rest_route($this->namespace, '/' . $this->rest_base . '/claim', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'claim_rewards'],
                'permission_callback' => '__return_true',
            ]
        ]);
    }

    /**
     * Get users that the current user has referred
     */
    public function get_referrals(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

        $user_id = $request->get_param('_auth_user_id');

        if (!$user_id) {
            return new WP_Error('not_authenticated', 'Autenticazione richiesta', ['status' => 401]);
        }

        // Get all users referred by this user
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

    /**
     * Get info about who referred the current user
     */
    public function get_my_referrer(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

        $user_id = $request->get_param('_auth_user_id');

        if (!$user_id) {
            return new WP_Error('not_authenticated', 'Autenticazione richiesta', ['status' => 401]);
        }

        // Find the referral record where this user was referred
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

    /**
     * Track daily activity for referral progress
     */
    public function track_activity(WP_REST_Request $request) {
        global $wpdb;
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

        $user_id = $request->get_param('_auth_user_id');

        if (!$user_id) {
            return new WP_Error('not_authenticated', 'Autenticazione richiesta', ['status' => 401]);
        }

        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));

        // Update activity for referrals where this user was referred
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
                // Calculate new days active
                if ($last_date === $yesterday || $last_date === null) {
                    $new_days = min($current_days + 1, self::DAYS_REQUIRED);
                } else {
                    // Streak broken, but we count today
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

    /**
     * Claim referral rewards
     */
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

        // 1. Claim rewards for users I referred (as referrer)
        $completed_referrals = $wpdb->get_results($wpdb->prepare(
            "SELECT id FROM {$table_referrals}
             WHERE referrer_user_id = %d
             AND days_active >= %d
             AND reward_claimed = 0",
            $user_id,
            self::DAYS_REQUIRED
        ));

        foreach ($completed_referrals as $ref) {
            // Mark as claimed
            $wpdb->update(
                $table_referrals,
                ['reward_claimed' => 1],
                ['id' => $ref->id]
            );
            $referrer_credits += self::REFERRER_CREDITS;
        }

        // 2. Claim reward as referred user
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

        // Add credits to user
        $total_credits = $referrer_credits + $referred_credits;
        if ($total_credits > 0) {
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_users} SET credits = credits + %d WHERE id = %d",
                $total_credits,
                $user_id
            ));
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'referrer_credits' => $referrer_credits,
                'referred_credits' => $referred_credits,
                'total_credits' => $total_credits,
                'message' => $total_credits > 0 ? "Hai ottenuto {$total_credits} crediti!" : 'Nessun premio da riscuotere',
            ]
        ]);
    }
}

<?php
// opcache-bust: 1739109000-settings-debug
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Settings API Controller - Exposes app settings to mobile app
 */
class SettingsController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'settings';

    public function register_routes() {
        // Get public settings (XP rewards, credits config, etc.)
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_settings'],
                'permission_callback' => '__return_true'
            ]
        ]);
    }

    /**
     * Get app settings
     */
    public function get_settings(WP_REST_Request $request) {
        // TEMP DEBUG: Return referral data when debug param is passed - REMOVE AFTER DEBUGGING
        if ($request->get_param('debug_ref') === '2026check') {
            global $wpdb;
            $table_referrals = $wpdb->prefix . 'rafflemania_referrals';
            $table_users = $wpdb->prefix . 'rafflemania_users';

            $referrals = $wpdb->get_results("SELECT * FROM {$table_referrals} ORDER BY created_at DESC LIMIT 20");
            $referred_users = $wpdb->get_results("SELECT id, username, email, referral_code, referred_by, email_verified FROM {$table_users} WHERE referred_by IS NOT NULL ORDER BY id DESC LIMIT 20");
            $all_users = $wpdb->get_results("SELECT id, username, email, referral_code, referred_by, email_verified FROM {$table_users} ORDER BY id DESC LIMIT 20");

            return new WP_REST_Response([
                'referrals_table' => $referrals,
                'users_with_referral' => $referred_users,
                'recent_users' => $all_users,
                'referrals_count' => count($referrals),
            ]);
        }

        // XP rewards from WordPress settings
        $xp_watch_ad = (int) get_option('rafflemania_xp_watch_ad', 10);
        $xp_daily_streak = (int) get_option('rafflemania_xp_daily_streak', 10);
        $xp_credit_ticket = (int) get_option('rafflemania_xp_credit_ticket', 5);

        // Credits settings
        $credits_per_ticket = (int) get_option('rafflemania_credits_per_ticket', 5);
        $referral_bonus = (int) get_option('rafflemania_referral_bonus', 10);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'xp' => [
                    'watch_ad' => $xp_watch_ad,
                    'daily_streak' => $xp_daily_streak,
                    'credit_ticket' => $xp_credit_ticket,
                    // Additional XP rewards (calculated or default)
                    'skip_ad' => $xp_watch_ad * 2,       // Double XP for premium
                    'purchase_credits' => 25,            // Fixed for purchases
                    'win_prize' => 250,                  // Fixed for winning
                    'referral' => 50,                    // Fixed for referrals
                ],
                'credits' => [
                    'per_ticket' => $credits_per_ticket,
                    'referral_bonus' => $referral_bonus,
                ],
            ]
        ], 200);
    }
}

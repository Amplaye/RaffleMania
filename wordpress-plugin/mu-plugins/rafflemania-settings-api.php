<?php
/**
 * RaffleMania Settings API - Must-Use Plugin
 * This bypasses opcache by being a separate file
 * Upload to: wp-content/mu-plugins/rafflemania-settings-api.php
 */

add_action('rest_api_init', function() {
    register_rest_route('rafflemania/v1', '/app-settings', [
        'methods' => 'GET',
        'callback' => function() {
            $xp_watch_ad = (int) get_option('rafflemania_xp_watch_ad', 10);
            $xp_daily_streak = (int) get_option('rafflemania_xp_daily_streak', 10);
            $xp_credit_ticket = (int) get_option('rafflemania_xp_credit_ticket', 5);
            $credits_per_ticket = (int) get_option('rafflemania_credits_per_ticket', 5);
            $referral_bonus = (int) get_option('rafflemania_referral_bonus', 10);

            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'xp' => [
                        'watch_ad' => $xp_watch_ad,
                        'daily_streak' => $xp_daily_streak,
                        'credit_ticket' => $xp_credit_ticket,
                        'skip_ad' => $xp_watch_ad * 2,
                        'purchase_credits' => 25,
                        'win_prize' => 250,
                        'referral' => 50,
                    ],
                    'credits' => [
                        'per_ticket' => $credits_per_ticket,
                        'referral_bonus' => $referral_bonus,
                    ],
                    'timestamp' => time(),
                ]
            ], 200);
        },
        'permission_callback' => '__return_true'
    ]);
});

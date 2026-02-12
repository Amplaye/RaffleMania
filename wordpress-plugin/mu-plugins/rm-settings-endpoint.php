<?php
/**
 * Plugin Name: RaffleMania Settings Endpoint
 * Description: Adds XP settings REST API endpoint
 * Version: 1.0.0
 */

// Add REST API endpoint for settings
add_action('rest_api_init', function() {
    register_rest_route('rafflemania/v1', '/xp-settings', [
        'methods' => 'GET',
        'callback' => function() {
            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'xp' => [
                        'watch_ad' => (int) get_option('rafflemania_xp_watch_ad', 10),
                        'daily_streak' => (int) get_option('rafflemania_xp_daily_streak', 10),
                        'credit_ticket' => (int) get_option('rafflemania_xp_credit_ticket', 5),
                        'skip_ad' => (int) get_option('rafflemania_xp_watch_ad', 10) * 2,
                        'purchase_credits' => 25,
                        'win_prize' => 250,
                        'referral' => 50,
                    ],
                    'credits' => [
                        'per_ticket' => (int) get_option('rafflemania_credits_per_ticket', 5),
                        'referral_bonus' => (int) get_option('rafflemania_referral_bonus', 10),
                    ],
                    'source' => 'mu-plugin',
                    'timestamp' => time(),
                ]
            ], 200);
        },
        'permission_callback' => '__return_true'
    ]);
});

// Also add AJAX endpoint
add_action('wp_ajax_rm_get_xp_settings', 'rm_xp_settings_ajax_handler');
add_action('wp_ajax_nopriv_rm_get_xp_settings', 'rm_xp_settings_ajax_handler');

function rm_xp_settings_ajax_handler() {
    wp_send_json_success([
        'xp' => [
            'watch_ad' => (int) get_option('rafflemania_xp_watch_ad', 10),
            'daily_streak' => (int) get_option('rafflemania_xp_daily_streak', 10),
            'credit_ticket' => (int) get_option('rafflemania_xp_credit_ticket', 5),
            'skip_ad' => (int) get_option('rafflemania_xp_watch_ad', 10) * 2,
            'purchase_credits' => 25,
            'win_prize' => 250,
            'referral' => 50,
        ],
        'credits' => [
            'per_ticket' => (int) get_option('rafflemania_credits_per_ticket', 5),
            'referral_bonus' => (int) get_option('rafflemania_referral_bonus', 10),
        ],
        'source' => 'mu-plugin-ajax',
    ]);
}

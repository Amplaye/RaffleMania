<?php
/**
 * MU-Plugin: RaffleMania Settings AJAX
 * This is loaded before any caching and provides a direct settings endpoint
 */

// AJAX handler for settings - works without REST API
add_action('wp_ajax_rafflemania_get_settings', 'mu_rafflemania_settings_handler');
add_action('wp_ajax_nopriv_rafflemania_get_settings', 'mu_rafflemania_settings_handler');

function mu_rafflemania_settings_handler() {
    // No caching headers
    header('Content-Type: application/json');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('Access-Control-Allow-Origin: *');

    // Get settings from WordPress options
    $xp_watch_ad = (int) get_option('rafflemania_xp_watch_ad', 10);
    $xp_daily_streak = (int) get_option('rafflemania_xp_daily_streak', 10);
    $xp_credit_ticket = (int) get_option('rafflemania_xp_credit_ticket', 5);
    $credits_per_ticket = (int) get_option('rafflemania_credits_per_ticket', 5);
    $referral_bonus = (int) get_option('rafflemania_referral_bonus', 10);

    wp_send_json_success([
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
        'source' => 'mu-plugin',
        'timestamp' => time(),
    ]);
}

<?php
/**
 * Direct settings endpoint - bypasses WordPress REST API cache
 * URL: /wp-content/plugins/rafflemania-api/get-settings.php
 */

// Load WordPress
require_once dirname(__FILE__) . '/../../../wp-load.php';

// Set JSON headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Get settings from WordPress options
$xp_watch_ad = (int) get_option('rafflemania_xp_watch_ad', 10);
$xp_daily_streak = (int) get_option('rafflemania_xp_daily_streak', 10);
$xp_credit_ticket = (int) get_option('rafflemania_xp_credit_ticket', 5);
$credits_per_ticket = (int) get_option('rafflemania_credits_per_ticket', 5);
$referral_bonus = (int) get_option('rafflemania_referral_bonus', 10);

echo json_encode([
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
]);

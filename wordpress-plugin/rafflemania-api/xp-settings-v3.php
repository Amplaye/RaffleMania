<?php
/**
 * XP Settings Endpoint v3 - New file to bypass opcache
 * Created: 2026-01-27
 */

// Load WordPress
require_once dirname(__FILE__) . '/../../../wp-load.php';

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');

// Get settings from WordPress options
$response = [
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
        'version' => '3.0',
        'timestamp' => time(),
    ]
];

echo json_encode($response);
exit;

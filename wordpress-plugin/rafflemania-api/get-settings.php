<?php
/**
 * Direct settings endpoint - bypasses WordPress REST API cache
 * URL: /wp-content/plugins/rafflemania-api/get-settings.php
 * Returns combined game config from new admin panel JSON configs
 */

// Load WordPress
require_once dirname(__FILE__) . '/../../../wp-load.php';

// Set JSON headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=300');

// Get configs from new JSON wp_options (set by admin panel)
$xp_rewards = json_decode(get_option('rafflemania_xp_rewards', '{}'), true) ?: [];
$streak_config = json_decode(get_option('rafflemania_streak_config', '{}'), true) ?: [];
$daily_limits = json_decode(get_option('rafflemania_daily_limits', '{}'), true) ?: [];
$referral_config = json_decode(get_option('rafflemania_referral_config', '{}'), true) ?: [];

echo json_encode([
    'success' => true,
    'data' => [
        'xp' => [
            'watch_ad' => $xp_rewards['watch_ad'] ?? 3,
            'purchase_ticket' => $xp_rewards['purchase_ticket'] ?? 2,
            'skip_ad' => $xp_rewards['skip_ad'] ?? 0,
            'purchase_credits' => $xp_rewards['purchase_credits'] ?? 0,
            'win_prize' => $xp_rewards['win_prize'] ?? 0,
            'referral' => $xp_rewards['referral'] ?? 0,
            'daily_streak' => $streak_config['daily_xp'] ?? 5,
            'credit_ticket' => $xp_rewards['purchase_ticket'] ?? 2,
        ],
        'credits' => [
            'per_ticket' => $daily_limits['credits_per_ticket'] ?? 5,
            'referral_bonus' => $referral_config['referrer_credits'] ?? 15,
        ],
        'xp_rewards' => $xp_rewards,
        'streak_config' => $streak_config,
        'daily_limits' => $daily_limits,
        'referral_config' => $referral_config,
        'timestamp' => time(),
    ]
]);

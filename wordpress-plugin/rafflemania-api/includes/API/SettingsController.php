<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Settings API Controller - Exposes app settings to mobile app
 * v2.0 - Added dynamic config endpoints
 */
class SettingsController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'settings';

    public function register_routes() {
        // Legacy: Get public settings
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            ['methods' => 'GET', 'callback' => [$this, 'get_settings'], 'permission_callback' => '__return_true']
        ]);

        // NEW: Levels
        register_rest_route($this->namespace, '/' . $this->rest_base . '/levels', [
            ['methods' => 'GET', 'callback' => [$this, 'get_levels'], 'permission_callback' => '__return_true']
        ]);

        // NEW: Shop packages
        register_rest_route($this->namespace, '/' . $this->rest_base . '/shop-packages', [
            ['methods' => 'GET', 'callback' => [$this, 'get_shop_packages'], 'permission_callback' => '__return_true']
        ]);

        // NEW: Streak config
        register_rest_route($this->namespace, '/' . $this->rest_base . '/streak-config', [
            ['methods' => 'GET', 'callback' => [$this, 'get_streak_config'], 'permission_callback' => '__return_true']
        ]);

        // NEW: Game config (combined: xp_rewards + daily_limits + referral_config + credits_per_ticket)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/game-config', [
            ['methods' => 'GET', 'callback' => [$this, 'get_game_config'], 'permission_callback' => '__return_true']
        ]);

        // NEW: App content (referral steps, FAQ, rules, links)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/app-content', [
            ['methods' => 'GET', 'callback' => [$this, 'get_app_content'], 'permission_callback' => '__return_true']
        ]);
    }

    /**
     * Get levels
     */
    public function get_levels(WP_REST_Request $request) {
        $cache_key = 'rafflemania_levels_cache';
        $cached = wp_cache_get($cache_key);
        if ($cached !== false) {
            $response = new WP_REST_Response(['success' => true, 'data' => $cached], 200);
            $response->header('Cache-Control', 'public, max-age=300');
            return $response;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'rafflemania_levels';
        $levels = $wpdb->get_results(
            "SELECT level, name, min_xp, max_xp, icon, color, credit_reward
             FROM {$table}
             WHERE is_active = 1
             ORDER BY sort_order ASC"
        );

        // Cast numeric fields
        $levels = array_map(function($l) {
            return [
                'level' => (int)$l->level,
                'name' => $l->name,
                'minXP' => (int)$l->min_xp,
                'maxXP' => (int)$l->max_xp,
                'icon' => $l->icon,
                'color' => $l->color,
                'creditReward' => (int)$l->credit_reward,
            ];
        }, $levels);

        wp_cache_set($cache_key, $levels, '', 300);

        $response = new WP_REST_Response(['success' => true, 'data' => $levels], 200);
        $response->header('Cache-Control', 'public, max-age=300');
        return $response;
    }

    /**
     * Get shop packages
     */
    public function get_shop_packages(WP_REST_Request $request) {
        $cache_key = 'rafflemania_shop_packages_cache';
        $cached = wp_cache_get($cache_key);
        if ($cached !== false) {
            $response = new WP_REST_Response(['success' => true, 'data' => $cached], 200);
            $response->header('Cache-Control', 'public, max-age=300');
            return $response;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'rafflemania_shop_packages';
        $packages = $wpdb->get_results(
            "SELECT id, credits, price, discount_label, badge, iap_product_id
             FROM {$table}
             WHERE is_active = 1
             ORDER BY sort_order ASC"
        );

        $packages = array_map(function($p) {
            return [
                'id' => (string)$p->id,
                'credits' => (int)$p->credits,
                'price' => (float)$p->price,
                'discount' => $p->discount_label,
                'badge' => $p->badge,
                'iapProductId' => $p->iap_product_id,
            ];
        }, $packages);

        wp_cache_set($cache_key, $packages, '', 300);

        $response = new WP_REST_Response(['success' => true, 'data' => $packages], 200);
        $response->header('Cache-Control', 'public, max-age=300');
        return $response;
    }

    /**
     * Get streak config
     */
    public function get_streak_config(WP_REST_Request $request) {
        $config = json_decode(get_option('rafflemania_streak_config', '{}'), true);

        $response = new WP_REST_Response(['success' => true, 'data' => $config], 200);
        $response->header('Cache-Control', 'public, max-age=300');
        return $response;
    }

    /**
     * Get game config (combined: xp_rewards + streak_config + daily_limits + referral_config)
     * Normalizes field names for React Native consumption
     */
    public function get_game_config(WP_REST_Request $request) {
        $cache_key = 'rafflemania_game_config_cache';
        $cached = wp_cache_get($cache_key);
        if ($cached !== false) {
            $response = new WP_REST_Response(['success' => true, 'data' => $cached], 200);
            $response->header('Cache-Control', 'public, max-age=300');
            return $response;
        }

        $xp_raw = json_decode(get_option('rafflemania_xp_rewards', '{}'), true) ?: [];
        $streak_raw = json_decode(get_option('rafflemania_streak_config', '{}'), true) ?: [];
        $daily_raw = json_decode(get_option('rafflemania_daily_limits', '{}'), true) ?: [];
        $referral_raw = json_decode(get_option('rafflemania_referral_config', '{}'), true) ?: [];
        $credits_per_ticket = (int) get_option('rafflemania_credits_per_ticket', 5);

        // Normalize XP rewards
        $xp_rewards = [
            'watch_ad' => (int)($xp_raw['watch_ad'] ?? 3),
            'purchase_ticket' => (int)($xp_raw['purchase_ticket'] ?? 2),
            'skip_ad' => (int)($xp_raw['skip_ad'] ?? 0),
            'purchase_credits' => (int)($xp_raw['purchase_credits'] ?? 0),
            'win_prize' => (int)($xp_raw['win_prize'] ?? 0),
            'referral' => (int)($xp_raw['referral'] ?? 0),
        ];

        // Normalize streak config (canonical names for React Native)
        $streak_config = [
            'daily_xp' => (int)($streak_raw['daily_xp'] ?? 5),
            'day_7_xp' => (int)($streak_raw['day_7_xp'] ?? 10),
            'day_7_credits' => (int)($streak_raw['day_7_credits'] ?? 1),
            'week_1_credits' => (int)($streak_raw['week_1_credits'] ?? 1),
            'week_2_credits' => (int)($streak_raw['week_2_credits'] ?? 2),
            'week_3_credits' => (int)($streak_raw['week_3_credits'] ?? 3),
            'week_4_credits' => (int)($streak_raw['week_4_credits'] ?? 5),
            'max_streak' => (int)($streak_raw['max_streak'] ?? 1000),
            'recovery_cost_per_day' => (int)($streak_raw['recovery_cost_per_day'] ?? 2),
        ];

        // Normalize daily limits (canonical names for React Native)
        $daily_limits = [
            'max_tickets_per_day' => (int)($daily_raw['max_tickets'] ?? $daily_raw['max_tickets_per_day'] ?? 60),
            'max_ads_per_day' => (int)($daily_raw['max_ads'] ?? $daily_raw['max_ads_per_day'] ?? 72),
            'ad_cooldown_minutes' => (int)($daily_raw['cooldown_minutes'] ?? $daily_raw['ad_cooldown_minutes'] ?? 20),
        ];

        // Normalize referral config
        $referral_config = [
            'days_required' => (int)($referral_raw['days_required'] ?? 7),
            'referrer_credits' => (int)($referral_raw['referrer_credits'] ?? 15),
            'referred_credits' => (int)($referral_raw['referred_credits'] ?? 15),
        ];

        $data = [
            'xp_rewards' => $xp_rewards,
            'streak_config' => $streak_config,
            'daily_limits' => $daily_limits,
            'referral_config' => $referral_config,
            'credits_per_ticket' => $credits_per_ticket,
        ];

        wp_cache_set($cache_key, $data, '', 300);

        $response = new WP_REST_Response(['success' => true, 'data' => $data], 200);
        $response->header('Cache-Control', 'public, max-age=300');
        return $response;
    }

    /**
     * Get app content
     */
    public function get_app_content(WP_REST_Request $request) {
        $content = json_decode(get_option('rafflemania_app_content', '{}'), true);

        $response = new WP_REST_Response(['success' => true, 'data' => $content], 200);
        $response->header('Cache-Control', 'public, max-age=300');
        return $response;
    }

    /**
     * Legacy: Get app settings (backward compatible)
     */
    public function get_settings(WP_REST_Request $request) {
        $xp_rewards = json_decode(get_option('rafflemania_xp_rewards', '{}'), true);
        $credits_per_ticket = (int) get_option('rafflemania_credits_per_ticket', 5);
        $referral_config = json_decode(get_option('rafflemania_referral_config', '{}'), true);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'xp' => [
                    'watch_ad' => $xp_rewards['watch_ad'] ?? 3,
                    'daily_streak' => $xp_rewards['watch_ad'] ?? 3,
                    'credit_ticket' => $xp_rewards['purchase_ticket'] ?? 2,
                    'skip_ad' => $xp_rewards['skip_ad'] ?? 0,
                    'purchase_credits' => $xp_rewards['purchase_credits'] ?? 0,
                    'win_prize' => $xp_rewards['win_prize'] ?? 0,
                    'referral' => $xp_rewards['referral'] ?? 0,
                ],
                'credits' => [
                    'per_ticket' => $credits_per_ticket,
                    'referral_bonus' => $referral_config['referrer_credits'] ?? 15,
                ],
            ]
        ], 200);
    }
}

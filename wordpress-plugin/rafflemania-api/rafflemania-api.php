<?php
/**
 * Plugin Name: RaffleMania API
 * Plugin URI: https://rafflemania.app
 * Description: REST API backend per l'app RaffleMania - Gestione premi, biglietti, estrazioni e utenti
 * Version: 1.4.2
 * Author: RaffleMania Team
 * Author URI: https://rafflemania.app
 * Text Domain: rafflemania-api
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

// Force opcache invalidation of critical files
if (function_exists('opcache_invalidate')) {
    opcache_invalidate(plugin_dir_path(__FILE__) . 'includes/API/AuthController.php', true);
    opcache_invalidate(plugin_dir_path(__FILE__) . 'includes/API/ReferralController.php', true);
    opcache_invalidate(plugin_dir_path(__FILE__) . 'includes/Plugin.php', true);
}

// Define plugin constants
define('RAFFLEMANIA_VERSION', '1.0.0');
define('RAFFLEMANIA_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('RAFFLEMANIA_PLUGIN_URL', plugin_dir_url(__FILE__));

// Autoload classes
spl_autoload_register(function ($class) {
    $prefix = 'RaffleMania\\';
    $base_dir = RAFFLEMANIA_PLUGIN_DIR . 'includes/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

// Initialize plugin
add_action('plugins_loaded', function() {
    // Load text domain
    load_plugin_textdomain('rafflemania-api', false, dirname(plugin_basename(__FILE__)) . '/languages');

    // Initialize main plugin class
    RaffleMania\Plugin::instance();
});

// Activation hook
register_activation_hook(__FILE__, function() {
    require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/Activator.php';
    RaffleMania\Activator::activate();
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/Deactivator.php';
    RaffleMania\Deactivator::deactivate();
});

// AJAX endpoint for app settings (bypasses REST API cache) - v2
add_action('init', function() {
    add_action('wp_ajax_rafflemania_settings', 'rafflemania_ajax_settings_handler');
    add_action('wp_ajax_nopriv_rafflemania_settings', 'rafflemania_ajax_settings_handler');
});

// Directly register referral routes to ensure they load - v1.4.1
add_action('rest_api_init', function() {
    require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/ReferralController.php';
    $referrals = new RaffleMania\API\ReferralController();
    $referrals->register_routes();
}, 99);

// TEMP: AJAX endpoint for DB referral check - DELETE AFTER DEBUGGING
add_action('wp_ajax_nopriv_rafflemania_dbcheck', 'rafflemania_ajax_dbcheck_handler');
add_action('wp_ajax_rafflemania_dbcheck', 'rafflemania_ajax_dbcheck_handler');

function rafflemania_ajax_dbcheck_handler() {
    global $wpdb;
    $table_referrals = $wpdb->prefix . 'rafflemania_referrals';
    $table_users = $wpdb->prefix . 'rafflemania_users';

    $referrals = $wpdb->get_results("SELECT * FROM {$table_referrals} ORDER BY created_at DESC LIMIT 20");
    $all_users = $wpdb->get_results("SELECT id, username, email, referral_code, referred_by, email_verified FROM {$table_users} ORDER BY id DESC LIMIT 20");

    wp_send_json_success([
        'referrals' => $referrals,
        'users' => $all_users,
        'count' => count($referrals),
    ]);
}

// AJAX endpoint for bulk rewards recipient preview (admin only)
add_action('wp_ajax_rafflemania_preview_recipients', 'rafflemania_ajax_preview_recipients');

function rafflemania_ajax_preview_recipients() {
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => 'Non autorizzato'], 403);
    }
    global $wpdb;
    $table_users = $wpdb->prefix . 'rafflemania_users';
    $target = sanitize_text_field($_POST['target'] ?? 'all');
    $where = "is_active = 1";
    if ($target === 'level_range') {
        $min_level = max(0, intval($_POST['min_level'] ?? 0));
        $max_level = max(0, intval($_POST['max_level'] ?? 10));
        $where .= $wpdb->prepare(" AND level >= %d AND level <= %d", $min_level, $max_level);
    }
    $count = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_users} WHERE {$where}");
    wp_send_json_success(['count' => $count]);
}

function rafflemania_ajax_settings_handler() {
    // Read from new JSON wp_options (set by admin panel)
    $xp_rewards = json_decode(get_option('rafflemania_xp_rewards', '{}'), true) ?: [];
    $streak_config = json_decode(get_option('rafflemania_streak_config', '{}'), true) ?: [];
    $daily_limits = json_decode(get_option('rafflemania_daily_limits', '{}'), true) ?: [];
    $referral_config = json_decode(get_option('rafflemania_referral_config', '{}'), true) ?: [];

    wp_send_json_success([
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
    ]);
}

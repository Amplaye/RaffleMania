<?php
/**
 * Plugin Name: RaffleMania API
 * Plugin URI: https://rafflemania.app
 * Description: REST API backend per l'app RaffleMania - Gestione premi, biglietti, estrazioni e utenti
 * Version: 1.0.0
 * Author: RaffleMania Team
 * Author URI: https://rafflemania.app
 * Text Domain: rafflemania-api
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
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

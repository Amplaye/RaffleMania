<?php
/**
 * Plugin Name: Auto Activate WP Mail SMTP
 * Description: Automatically activates WP Mail SMTP plugin
 */

// Activate WP Mail SMTP if not already active
add_action('admin_init', function() {
    $plugin = 'wp-mail-smtp/wp_mail_smtp.php';

    if (!is_plugin_active($plugin) && file_exists(WP_PLUGIN_DIR . '/' . $plugin)) {
        activate_plugin($plugin);
        error_log('[RaffleMania] WP Mail SMTP activated automatically');
    }
}, 1);

<?php
/**
 * Plugin Name: RaffleMania Route Fix
 * Description: Forces registration of RaffleMania referral routes - Debug version
 */

add_action('rest_api_init', function() {
    $plugin_dir = WP_PLUGIN_DIR . '/rafflemania-api/';
    $controller_file = $plugin_dir . 'includes/API/ReferralController.php';

    // Debug: Check if file exists
    if (!file_exists($controller_file)) {
        error_log('[RaffleMania MU] Controller file not found: ' . $controller_file);
        return;
    }

    // Include the file
    require_once $controller_file;

    // Check if class exists
    if (!class_exists('RaffleMania\API\ReferralController')) {
        error_log('[RaffleMania MU] Class not found after include');
        return;
    }

    // Create and register routes
    $controller = new RaffleMania\API\ReferralController();
    $controller->register_routes();
    error_log('[RaffleMania MU] Routes registered successfully');
}, 5);

// Also add a test endpoint to verify the mu-plugin is loaded
add_action('rest_api_init', function() {
    register_rest_route('rafflemania/v1', '/mu-test', [
        'methods' => 'GET',
        'callback' => function() {
            return new WP_REST_Response([
                'success' => true,
                'message' => 'MU plugin is working',
                'controller_exists' => class_exists('RaffleMania\API\ReferralController'),
            ]);
        },
        'permission_callback' => '__return_true',
    ]);
}, 1);

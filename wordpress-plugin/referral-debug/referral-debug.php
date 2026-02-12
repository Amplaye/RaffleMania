<?php
/**
 * Plugin Name: RaffleMania Referral Debug
 * Description: TEMP DEBUG PLUGIN - DELETE AFTER USE
 * Version: 1.0
 */

// AJAX handler for DB check
add_action('wp_ajax_nopriv_rm_refcheck', function() {
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
});
add_action('wp_ajax_rm_refcheck', function() {
    do_action('wp_ajax_nopriv_rm_refcheck');
});

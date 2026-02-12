<?php
// Test: add a custom HTTP header to prove this mu-plugin loads
add_action('send_headers', function() {
    header('X-MU-Plugin-Loaded: referral-debug-v1');
});

// AJAX handler
add_action('wp_ajax_nopriv_rm_refcheck', 'rm_do_refcheck');
add_action('wp_ajax_rm_refcheck', 'rm_do_refcheck');

function rm_do_refcheck() {
    global $wpdb;
    $prefix = $wpdb->prefix;
    $referrals = $wpdb->get_results("SELECT * FROM {$prefix}rafflemania_referrals ORDER BY created_at DESC LIMIT 20");
    $users = $wpdb->get_results("SELECT id, username, email, referral_code, referred_by, email_verified FROM {$prefix}rafflemania_users ORDER BY id DESC LIMIT 20");
    wp_send_json(['referrals' => $referrals, 'users' => $users, 'count' => count($referrals)]);
}

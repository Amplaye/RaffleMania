<?php
// Temporary endpoint to check referral data - DELETE AFTER USE
add_action('rest_api_init', function() {
    register_rest_route('rm-debug/v1', '/referrals', [
        'methods' => 'GET',
        'callback' => function() {
            global $wpdb;
            $table_users = $wpdb->prefix . 'rafflemania_users';
            $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

            $referrals = $wpdb->get_results("SELECT * FROM {$table_referrals} ORDER BY created_at DESC LIMIT 20");
            $referred_users = $wpdb->get_results("SELECT id, username, email, referral_code, referred_by, email_verified FROM {$table_users} WHERE referred_by IS NOT NULL ORDER BY id DESC LIMIT 20");
            $all_users = $wpdb->get_results("SELECT id, username, email, referral_code, referred_by, email_verified FROM {$table_users} ORDER BY id DESC LIMIT 20");

            return [
                'referrals_table' => $referrals,
                'users_with_referral' => $referred_users,
                'recent_users' => $all_users,
                'referrals_count' => count($referrals),
            ];
        },
        'permission_callback' => '__return_true',
    ]);
});

<?php
/**
 * Debug API - DELETE AFTER USE
 */
require_once($_SERVER['DOCUMENT_ROOT'] . '/wp-load.php');

header('Content-Type: application/json');

global $wpdb;

// Check if tables exist
$table_users = $wpdb->prefix . 'rafflemania_users';
$table_transactions = $wpdb->prefix . 'rafflemania_transactions';

$users_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_users}'") === $table_users;
$trans_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_transactions}'") === $table_transactions;

// Check last error
$last_error = $wpdb->last_error;

// Try to get user 2
$user = $wpdb->get_row("SELECT * FROM {$table_users} WHERE id = 2");

echo json_encode([
    'tables' => [
        'users_exists' => $users_exists,
        'transactions_exists' => $trans_exists,
    ],
    'last_db_error' => $last_error,
    'user_2' => $user ? [
        'id' => $user->id,
        'email' => $user->email,
        'credits' => $user->credits
    ] : null,
    'php_errors' => error_get_last()
], JSON_PRETTY_PRINT);

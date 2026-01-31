<?php
/**
 * Check user credits - DELETE AFTER USE
 */
require_once($_SERVER['DOCUMENT_ROOT'] . '/wp-load.php');

global $wpdb;
$table = $wpdb->prefix . 'rafflemania_users';

header('Content-Type: application/json');

$users = $wpdb->get_results("SELECT id, email, username, credits FROM {$table} ORDER BY id");

echo json_encode([
    'users' => array_map(function($u) {
        return [
            'id' => $u->id,
            'email' => $u->email,
            'username' => $u->username,
            'credits' => (int)$u->credits
        ];
    }, $users)
], JSON_PRETTY_PRINT);

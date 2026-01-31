<?php
/**
 * Temporary script to check and update user credits
 * DELETE THIS FILE AFTER USE
 */

// Load WordPress
require_once($_SERVER['DOCUMENT_ROOT'] . '/wp-load.php');

global $wpdb;
$table_users = $wpdb->prefix . 'rafflemania_users';

// Get all users and their credits
$users = $wpdb->get_results("SELECT id, email, username, credits FROM {$table_users} ORDER BY id");

echo "<h2>Current User Credits</h2>";
echo "<table border='1' cellpadding='5'>";
echo "<tr><th>ID</th><th>Email</th><th>Username</th><th>Credits</th></tr>";

foreach ($users as $user) {
    echo "<tr>";
    echo "<td>{$user->id}</td>";
    echo "<td>{$user->email}</td>";
    echo "<td>{$user->username}</td>";
    echo "<td>{$user->credits}</td>";
    echo "</tr>";
}
echo "</table>";

// Update all users to have 500 credits for testing
if (isset($_GET['update']) && $_GET['update'] === 'yes') {
    $wpdb->query("UPDATE {$table_users} SET credits = 500");
    echo "<h3 style='color: green;'>All users updated to 500 credits!</h3>";
    echo "<p><a href='?'>Refresh to see updated values</a></p>";
} else {
    echo "<p><a href='?update=yes'>Click here to set all users to 500 credits</a></p>";
}

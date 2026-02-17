<?php
/**
 * Test script to debug ads_watched tracking
 * Access: https://www.rafflemania.it/wp-content/plugins/rafflemania-api/test-ad-watched.php
 */

// Load WordPress
require_once dirname(__FILE__) . '/../../../wp-load.php';

global $wpdb;
$table_daily_stats = $wpdb->prefix . 'rafflemania_daily_stats';
$table_users = $wpdb->prefix . 'rafflemania_users';

$italy_tz = new DateTimeZone('Europe/Rome');
$today = (new DateTime('now', $italy_tz))->format('Y-m-d');

echo "<h2>Debug ads_watched tracking</h2>";
echo "<p>Server time (Italy): " . (new DateTime('now', $italy_tz))->format('Y-m-d H:i:s') . "</p>";
echo "<p>Today date used for stats: <strong>{$today}</strong></p>";

// Check if daily_stats table exists
$table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_daily_stats}'");
echo "<p>Table exists: " . ($table_exists ? 'YES' : 'NO') . "</p>";

if ($table_exists) {
    // Show table structure
    $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_daily_stats}");
    echo "<h3>Table columns:</h3><ul>";
    foreach ($columns as $col) {
        echo "<li>{$col->Field} ({$col->Type}) - Default: {$col->Default}</li>";
    }
    echo "</ul>";

    // Show all rows
    $rows = $wpdb->get_results("SELECT * FROM {$table_daily_stats} ORDER BY stat_date DESC LIMIT 10");
    echo "<h3>Recent daily_stats rows:</h3>";
    echo "<table border='1' cellpadding='5'><tr><th>ID</th><th>Date</th><th>Logins</th><th>Tickets</th><th>New Users</th><th>Ads Watched</th><th>Credits Spent</th><th>Draws</th><th>Winners</th></tr>";
    foreach ($rows as $row) {
        echo "<tr>";
        echo "<td>" . ($row->id ?? 'N/A') . "</td>";
        echo "<td>{$row->stat_date}</td>";
        echo "<td>{$row->logins}</td>";
        echo "<td>{$row->tickets_created}</td>";
        echo "<td>{$row->new_users}</td>";
        echo "<td><strong>{$row->ads_watched}</strong></td>";
        echo "<td>{$row->credits_spent}</td>";
        echo "<td>{$row->draws_made}</td>";
        echo "<td>{$row->winners}</td>";
        echo "</tr>";
    }
    echo "</table>";

    // Check today's row specifically
    $today_row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_daily_stats} WHERE stat_date = %s", $today));
    echo "<h3>Today's row ({$today}):</h3>";
    if ($today_row) {
        echo "<pre>" . print_r($today_row, true) . "</pre>";
    } else {
        echo "<p style='color:red'>NO ROW for today!</p>";
    }

    // Test: manually increment ads_watched
    if (isset($_GET['test_increment'])) {
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table_daily_stats} WHERE stat_date = %s",
            $today
        ));

        if ($existing) {
            $result = $wpdb->query($wpdb->prepare(
                "UPDATE {$table_daily_stats} SET ads_watched = ads_watched + 1 WHERE stat_date = %s",
                $today
            ));
            echo "<p style='color:green'>UPDATE result: {$result} (1 = success)</p>";
        } else {
            $result = $wpdb->insert($table_daily_stats, [
                'stat_date' => $today,
                'ads_watched' => 1
            ]);
            echo "<p style='color:green'>INSERT result: {$result}</p>";
        }

        // Show updated value
        $updated = $wpdb->get_var($wpdb->prepare("SELECT ads_watched FROM {$table_daily_stats} WHERE stat_date = %s", $today));
        echo "<p>Updated ads_watched for today: <strong>{$updated}</strong></p>";
    } else {
        echo "<p><a href='?test_increment=1'>Click here to test increment ads_watched</a></p>";
    }

    // Check user watched_ads column
    $users_with_ads = $wpdb->get_results("SELECT id, username, watched_ads, credits FROM {$table_users} WHERE watched_ads > 0 ORDER BY watched_ads DESC LIMIT 5");
    echo "<h3>Users with watched_ads > 0:</h3>";
    if ($users_with_ads) {
        foreach ($users_with_ads as $u) {
            echo "<p>User #{$u->id} ({$u->username}): watched_ads={$u->watched_ads}, credits={$u->credits}</p>";
        }
    } else {
        echo "<p style='color:red'>No users with watched_ads > 0</p>";
    }

    // Check transactions for ad credits
    $table_transactions = $wpdb->prefix . 'rafflemania_transactions';
    $ad_transactions = $wpdb->get_results("SELECT * FROM {$table_transactions} WHERE description LIKE '%pubblicità%' ORDER BY created_at DESC LIMIT 5");
    echo "<h3>Recent ad-credit transactions:</h3>";
    if ($ad_transactions) {
        foreach ($ad_transactions as $t) {
            echo "<p>#{$t->id} user_id={$t->user_id} type={$t->type} amount={$t->amount} desc='{$t->description}' ref={$t->reference_id} at={$t->created_at}</p>";
        }
    } else {
        echo "<p style='color:red'>No ad-credit transactions found! The endpoint has NEVER been called successfully.</p>";
    }
}

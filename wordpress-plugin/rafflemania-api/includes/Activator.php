<?php
namespace RaffleMania;

/**
 * Plugin Activator - Creates database tables
 */
class Activator {

    public static function activate() {
        self::create_tables();
        self::migrate_referrals_table();
        self::insert_default_data();
        flush_rewrite_rules();
    }

    /**
     * Migrate existing referrals table to add new columns
     */
    private static function migrate_referrals_table() {
        global $wpdb;
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

        // Check if table exists
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_referrals}'");
        if (!$table_exists) {
            return;
        }

        // Get existing columns
        $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_referrals}");
        $existing_columns = array_map(function($col) { return $col->Field; }, $columns);

        // Add days_active column if not exists
        if (!in_array('days_active', $existing_columns)) {
            $wpdb->query("ALTER TABLE {$table_referrals} ADD COLUMN days_active int(11) DEFAULT 1 AFTER bonus_given");
        }

        // Add last_active_date column if not exists
        if (!in_array('last_active_date', $existing_columns)) {
            $wpdb->query("ALTER TABLE {$table_referrals} ADD COLUMN last_active_date date DEFAULT NULL AFTER days_active");
        }

        // Add reward_claimed column if not exists
        if (!in_array('reward_claimed', $existing_columns)) {
            $wpdb->query("ALTER TABLE {$table_referrals} ADD COLUMN reward_claimed tinyint(1) DEFAULT 0 AFTER last_active_date");
        }

        // Add referred_reward_claimed column if not exists
        if (!in_array('referred_reward_claimed', $existing_columns)) {
            $wpdb->query("ALTER TABLE {$table_referrals} ADD COLUMN referred_reward_claimed tinyint(1) DEFAULT 0 AFTER reward_claimed");
        }

        // Set initial last_active_date for existing records
        $wpdb->query("UPDATE {$table_referrals} SET last_active_date = DATE(created_at) WHERE last_active_date IS NULL");
    }

    private static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Users table (extends WP users with app-specific data)
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $sql_users = "CREATE TABLE {$table_users} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            wp_user_id bigint(20) UNSIGNED DEFAULT NULL,
            email varchar(255) NOT NULL,
            username varchar(100) NOT NULL,
            password_hash varchar(255) NOT NULL,
            avatar_url varchar(500) DEFAULT NULL,
            avatar_color varchar(20) DEFAULT '#FF6B00',
            credits int(11) DEFAULT 0,
            xp int(11) DEFAULT 0,
            level int(11) DEFAULT 1,
            current_streak int(11) DEFAULT 0,
            last_streak_date date DEFAULT NULL,
            referral_code varchar(20) UNIQUE,
            referred_by varchar(20) DEFAULT NULL,
            push_token varchar(500) DEFAULT NULL,
            is_active tinyint(1) DEFAULT 1,
            email_verified tinyint(1) DEFAULT 0,
            verification_token varchar(64) DEFAULT NULL,
            verification_token_expires datetime DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY email (email),
            UNIQUE KEY username (username),
            KEY referral_code (referral_code),
            KEY verification_token (verification_token)
        ) {$charset_collate};";
        dbDelta($sql_users);

        // Prizes table
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $sql_prizes = "CREATE TABLE {$table_prizes} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            description text,
            image_url varchar(500),
            value decimal(10,2) DEFAULT 0,
            stock int(11) DEFAULT 1,
            is_active tinyint(1) DEFAULT 1,
            current_ads int(11) DEFAULT 0,
            goal_ads int(11) DEFAULT 100,
            timer_status enum('waiting','countdown','extracting','completed') DEFAULT 'waiting',
            timer_duration int(11) DEFAULT 86400,
            scheduled_at datetime DEFAULT NULL,
            timer_started_at datetime DEFAULT NULL,
            extracted_at datetime DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY is_active (is_active),
            KEY timer_status (timer_status)
        ) {$charset_collate};";
        dbDelta($sql_prizes);

        // Tickets table
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $sql_tickets = "CREATE TABLE {$table_tickets} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            prize_id bigint(20) UNSIGNED NOT NULL,
            draw_id varchar(100) DEFAULT NULL,
            ticket_number int(11) NOT NULL,
            source enum('ad','credits','referral','bonus') DEFAULT 'ad',
            status enum('active','used','winner','expired') DEFAULT 'active',
            is_winner tinyint(1) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY prize_id (prize_id),
            KEY draw_id (draw_id),
            KEY status (status)
        ) {$charset_collate};";
        dbDelta($sql_tickets);

        // Draws table
        $table_draws = $wpdb->prefix . 'rafflemania_draws';
        $sql_draws = "CREATE TABLE {$table_draws} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            draw_id varchar(100) NOT NULL UNIQUE,
            prize_id bigint(20) UNSIGNED NOT NULL,
            winning_number int(11) NOT NULL,
            winner_user_id bigint(20) UNSIGNED DEFAULT NULL,
            winner_ticket_id bigint(20) UNSIGNED DEFAULT NULL,
            total_tickets int(11) DEFAULT 0,
            extracted_at datetime DEFAULT NULL,
            status enum('scheduled','extracting','completed','cancelled') DEFAULT 'scheduled',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY draw_id (draw_id),
            KEY prize_id (prize_id),
            KEY winner_user_id (winner_user_id),
            KEY status (status)
        ) {$charset_collate};";
        dbDelta($sql_draws);

        // Winners table
        $table_winners = $wpdb->prefix . 'rafflemania_winners';
        $sql_winners = "CREATE TABLE {$table_winners} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            prize_id bigint(20) UNSIGNED NOT NULL,
            draw_id bigint(20) UNSIGNED NOT NULL,
            ticket_id bigint(20) UNSIGNED NOT NULL,
            claimed tinyint(1) DEFAULT 0,
            claimed_at datetime DEFAULT NULL,
            shipping_address text DEFAULT NULL,
            won_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY prize_id (prize_id)
        ) {$charset_collate};";
        dbDelta($sql_winners);

        // Transactions table (for credits)
        $table_transactions = $wpdb->prefix . 'rafflemania_transactions';
        $sql_transactions = "CREATE TABLE {$table_transactions} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            type enum('purchase','spend','bonus','referral') NOT NULL,
            amount int(11) NOT NULL,
            description varchar(255) DEFAULT NULL,
            reference_id varchar(100) DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY type (type)
        ) {$charset_collate};";
        dbDelta($sql_transactions);

        // Streak history table
        $table_streaks = $wpdb->prefix . 'rafflemania_streaks';
        $sql_streaks = "CREATE TABLE {$table_streaks} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            streak_day int(11) NOT NULL,
            xp_earned int(11) DEFAULT 0,
            credits_earned int(11) DEFAULT 0,
            is_milestone tinyint(1) DEFAULT 0,
            is_weekly_bonus tinyint(1) DEFAULT 0,
            claimed_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id)
        ) {$charset_collate};";
        dbDelta($sql_streaks);

        // Referrals table (updated for 7-day activity tracking)
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';
        $sql_referrals = "CREATE TABLE {$table_referrals} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            referrer_user_id bigint(20) UNSIGNED NOT NULL,
            referred_user_id bigint(20) UNSIGNED NOT NULL,
            referral_code varchar(20) NOT NULL,
            bonus_given tinyint(1) DEFAULT 0,
            days_active int(11) DEFAULT 1,
            last_active_date date DEFAULT NULL,
            reward_claimed tinyint(1) DEFAULT 0,
            referred_reward_claimed tinyint(1) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY referrer_user_id (referrer_user_id),
            KEY referred_user_id (referred_user_id)
        ) {$charset_collate};";
        dbDelta($sql_referrals);

        // Push notifications log
        $table_notifications = $wpdb->prefix . 'rafflemania_notifications';
        $sql_notifications = "CREATE TABLE {$table_notifications} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED DEFAULT NULL,
            type varchar(50) NOT NULL,
            title varchar(255) NOT NULL,
            body text,
            data text,
            sent_at datetime DEFAULT CURRENT_TIMESTAMP,
            read_at datetime DEFAULT NULL,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY type (type)
        ) {$charset_collate};";
        dbDelta($sql_notifications);

        // Shipments table
        $table_shipments = $wpdb->prefix . 'rafflemania_shipments';
        $sql_shipments = "CREATE TABLE {$table_shipments} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            winner_id bigint(20) UNSIGNED NOT NULL,
            user_id bigint(20) UNSIGNED NOT NULL,
            prize_id bigint(20) UNSIGNED NOT NULL,
            tracking_number varchar(100) DEFAULT NULL,
            carrier varchar(100) DEFAULT NULL,
            status enum('pending','shipped','in_transit','delivered','returned') DEFAULT 'pending',
            shipped_at datetime DEFAULT NULL,
            delivered_at datetime DEFAULT NULL,
            notes text DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY winner_id (winner_id),
            KEY user_id (user_id),
            KEY status (status)
        ) {$charset_collate};";
        dbDelta($sql_shipments);

        // Save DB version
        update_option('rafflemania_db_version', RAFFLEMANIA_VERSION);
    }

    private static function insert_default_data() {
        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        // Check if prizes already exist
        $count = $wpdb->get_var("SELECT COUNT(*) FROM {$table_prizes}");
        if ($count > 0) {
            return;
        }

        // Insert default prizes
        $default_prizes = [
            [
                'name' => 'iPhone 15 Pro',
                'description' => 'L\'ultimo iPhone con chip A17 Pro, fotocamera da 48MP e design in titanio',
                'image_url' => 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium',
                'value' => 1199.00,
                'goal_ads' => 500,
                'timer_duration' => 86400
            ],
            [
                'name' => 'PlayStation 5',
                'description' => 'Console next-gen Sony con SSD ultra veloce e controller DualSense',
                'image_url' => 'https://media.direct.playstation.com/is/image/psdglobal/PS5-Slim-Console',
                'value' => 549.00,
                'goal_ads' => 300,
                'timer_duration' => 86400
            ],
            [
                'name' => 'AirPods Pro 2',
                'description' => 'Auricolari wireless con cancellazione attiva del rumore e audio spaziale',
                'image_url' => 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/MQD83',
                'value' => 279.00,
                'goal_ads' => 150,
                'timer_duration' => 43200
            ],
            [
                'name' => 'Nintendo Switch OLED',
                'description' => 'Console ibrida con schermo OLED da 7 pollici e dock migliorato',
                'image_url' => 'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.5/c_scale,w_400/ncom/en_US/switch/site-design-update/oled-background',
                'value' => 349.00,
                'goal_ads' => 200,
                'timer_duration' => 86400
            ],
            [
                'name' => 'Buono Amazon €100',
                'description' => 'Gift card Amazon da utilizzare su milioni di prodotti',
                'image_url' => 'https://m.media-amazon.com/images/G/29/gc/designs/livepreview/amazon_dkblue_noto_email_v2016_it-main._CB468775011_.png',
                'value' => 100.00,
                'goal_ads' => 100,
                'timer_duration' => 21600
            ]
        ];

        foreach ($default_prizes as $prize) {
            $wpdb->insert($table_prizes, array_merge($prize, [
                'stock' => 1,
                'is_active' => 1,
                'current_ads' => 0,
                'timer_status' => 'waiting'
            ]));
        }
    }
}

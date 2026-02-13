<?php
namespace RaffleMania;

/**
 * Plugin Activator - Creates database tables
 */
class Activator {

    public static function activate() {
        self::create_tables();
        self::create_admin_panel_tables();
        self::migrate_referrals_table();
        self::insert_default_data();
        self::insert_admin_panel_defaults();
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
            social_provider varchar(20) DEFAULT NULL,
            social_id varchar(255) DEFAULT NULL,
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

    /**
     * Create admin panel tables (levels, shop packages, notification log, etc.)
     */
    private static function create_admin_panel_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Levels table
        $table_levels = $wpdb->prefix . 'rafflemania_levels';
        $sql_levels = "CREATE TABLE {$table_levels} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            level int(11) NOT NULL,
            name varchar(100) NOT NULL,
            min_xp int(11) NOT NULL DEFAULT 0,
            max_xp int(11) NOT NULL DEFAULT 0,
            icon varchar(50) DEFAULT 'star',
            color varchar(20) DEFAULT '#FF6B00',
            credit_reward int(11) DEFAULT 0,
            sort_order int(11) DEFAULT 0,
            is_active tinyint(1) DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY level (level),
            KEY sort_order (sort_order),
            KEY is_active (is_active)
        ) {$charset_collate};";
        dbDelta($sql_levels);

        // Shop packages table
        $table_packages = $wpdb->prefix . 'rafflemania_shop_packages';
        $sql_packages = "CREATE TABLE {$table_packages} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            credits int(11) NOT NULL,
            price decimal(10,2) NOT NULL,
            discount_label varchar(50) DEFAULT NULL,
            badge varchar(50) DEFAULT NULL,
            iap_product_id varchar(100) DEFAULT NULL,
            sort_order int(11) DEFAULT 0,
            is_active tinyint(1) DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY sort_order (sort_order),
            KEY is_active (is_active)
        ) {$charset_collate};";
        dbDelta($sql_packages);

        // Notification log table
        $table_notif_log = $wpdb->prefix . 'rafflemania_notification_log';
        $sql_notif_log = "CREATE TABLE {$table_notif_log} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            title varchar(255) NOT NULL,
            body text NOT NULL,
            target_type varchar(50) DEFAULT 'all',
            target_filter text DEFAULT NULL,
            status enum('draft','scheduled','sent','failed') DEFAULT 'draft',
            scheduled_at datetime DEFAULT NULL,
            sent_at datetime DEFAULT NULL,
            recipients_count int(11) DEFAULT 0,
            onesignal_response text DEFAULT NULL,
            created_by bigint(20) UNSIGNED DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY status (status),
            KEY scheduled_at (scheduled_at)
        ) {$charset_collate};";
        dbDelta($sql_notif_log);

        // Admin actions log table (audit trail)
        $table_admin_log = $wpdb->prefix . 'rafflemania_admin_actions_log';
        $sql_admin_log = "CREATE TABLE {$table_admin_log} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            admin_user_id bigint(20) UNSIGNED NOT NULL,
            action_type varchar(100) NOT NULL,
            target_user_id bigint(20) UNSIGNED DEFAULT NULL,
            details longtext DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY admin_user_id (admin_user_id),
            KEY action_type (action_type),
            KEY target_user_id (target_user_id),
            KEY created_at (created_at)
        ) {$charset_collate};";
        dbDelta($sql_admin_log);

        // Bulk rewards log table
        $table_bulk_log = $wpdb->prefix . 'rafflemania_bulk_rewards_log';
        $sql_bulk_log = "CREATE TABLE {$table_bulk_log} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            reason varchar(255) NOT NULL,
            credits_amount int(11) DEFAULT 0,
            xp_amount int(11) DEFAULT 0,
            tickets_amount int(11) DEFAULT 0,
            target varchar(50) DEFAULT 'all',
            target_filter text DEFAULT NULL,
            recipients_count int(11) DEFAULT 0,
            created_by bigint(20) UNSIGNED DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY created_at (created_at)
        ) {$charset_collate};";
        dbDelta($sql_bulk_log);

        // Add performance indexes on existing tables
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_draws = $wpdb->prefix . 'rafflemania_draws';
        $table_streaks = $wpdb->prefix . 'rafflemania_streaks';

        // Composite index on tickets (user_id + prize_id)
        $idx = $wpdb->get_results("SHOW INDEX FROM {$table_tickets} WHERE Key_name = 'idx_user_prize'");
        if (empty($idx)) {
            $wpdb->query("ALTER TABLE {$table_tickets} ADD INDEX idx_user_prize (user_id, prize_id)");
        }

        // Composite index on draws (prize_id + status)
        $idx = $wpdb->get_results("SHOW INDEX FROM {$table_draws} WHERE Key_name = 'idx_prize_status'");
        if (empty($idx)) {
            $wpdb->query("ALTER TABLE {$table_draws} ADD INDEX idx_prize_status (prize_id, status)");
        }

        // Composite index on streaks (user_id + streak_day)
        $idx = $wpdb->get_results("SHOW INDEX FROM {$table_streaks} WHERE Key_name = 'idx_user_streak'");
        if (empty($idx)) {
            $wpdb->query("ALTER TABLE {$table_streaks} ADD INDEX idx_user_streak (user_id, streak_day)");
        }
    }

    /**
     * Insert default admin panel data (levels, shop packages, wp_options configs)
     */
    private static function insert_admin_panel_defaults() {
        global $wpdb;

        // === LEVELS (seed from React Native hardcoded values) ===
        $table_levels = $wpdb->prefix . 'rafflemania_levels';
        $count = $wpdb->get_var("SELECT COUNT(*) FROM {$table_levels}");
        if ($count == 0) {
            $levels = [
                ['level' => 0, 'name' => 'Principiante', 'min_xp' => 0, 'max_xp' => 1000, 'icon' => 'leaf', 'color' => '#FF6B00', 'credit_reward' => 0, 'sort_order' => 0],
                ['level' => 1, 'name' => 'Novizio', 'min_xp' => 1000, 'max_xp' => 2200, 'icon' => 'flash', 'color' => '#FF6B00', 'credit_reward' => 5, 'sort_order' => 1],
                ['level' => 2, 'name' => 'Apprendista', 'min_xp' => 2200, 'max_xp' => 3800, 'icon' => 'compass', 'color' => '#FF6B00', 'credit_reward' => 10, 'sort_order' => 2],
                ['level' => 3, 'name' => 'Esploratore', 'min_xp' => 3800, 'max_xp' => 5800, 'icon' => 'map', 'color' => '#FF6B00', 'credit_reward' => 20, 'sort_order' => 3],
                ['level' => 4, 'name' => 'Avventuriero', 'min_xp' => 5800, 'max_xp' => 8300, 'icon' => 'shield', 'color' => '#FF6B00', 'credit_reward' => 35, 'sort_order' => 4],
                ['level' => 5, 'name' => 'Veterano', 'min_xp' => 8300, 'max_xp' => 11500, 'icon' => 'medal', 'color' => '#FF6B00', 'credit_reward' => 50, 'sort_order' => 5],
                ['level' => 6, 'name' => 'Campione', 'min_xp' => 11500, 'max_xp' => 15500, 'icon' => 'ribbon', 'color' => '#FF6B00', 'credit_reward' => 65, 'sort_order' => 6],
                ['level' => 7, 'name' => 'Maestro', 'min_xp' => 15500, 'max_xp' => 20500, 'icon' => 'star', 'color' => '#FF6B00', 'credit_reward' => 80, 'sort_order' => 7],
                ['level' => 8, 'name' => 'Leggenda', 'min_xp' => 20500, 'max_xp' => 26500, 'icon' => 'diamond', 'color' => '#FF6B00', 'credit_reward' => 90, 'sort_order' => 8],
                ['level' => 9, 'name' => 'Mito', 'min_xp' => 26500, 'max_xp' => 33500, 'icon' => 'flame', 'color' => '#FF6B00', 'credit_reward' => 95, 'sort_order' => 9],
                ['level' => 10, 'name' => 'Divinita', 'min_xp' => 33500, 'max_xp' => 999999, 'icon' => 'trophy', 'color' => '#FFD700', 'credit_reward' => 100, 'sort_order' => 10],
            ];
            foreach ($levels as $level) {
                $wpdb->insert($table_levels, array_merge($level, ['is_active' => 1]));
            }
        }

        // === SHOP PACKAGES (seed from React Native CREDIT_PACKAGES) ===
        $table_packages = $wpdb->prefix . 'rafflemania_shop_packages';
        $count = $wpdb->get_var("SELECT COUNT(*) FROM {$table_packages}");
        if ($count == 0) {
            $packages = [
                ['credits' => 10, 'price' => 0.99, 'discount_label' => null, 'badge' => null, 'iap_product_id' => 'credits_10', 'sort_order' => 1],
                ['credits' => 25, 'price' => 1.99, 'discount_label' => null, 'badge' => null, 'iap_product_id' => 'credits_25', 'sort_order' => 2],
                ['credits' => 60, 'price' => 2.99, 'discount_label' => '-50%', 'badge' => 'most popular', 'iap_product_id' => 'credits_60', 'sort_order' => 3],
                ['credits' => 100, 'price' => 4.49, 'discount_label' => null, 'badge' => null, 'iap_product_id' => 'credits_100', 'sort_order' => 4],
                ['credits' => 250, 'price' => 9.99, 'discount_label' => null, 'badge' => null, 'iap_product_id' => 'credits_250', 'sort_order' => 5],
                ['credits' => 600, 'price' => 19.99, 'discount_label' => null, 'badge' => null, 'iap_product_id' => 'credits_600', 'sort_order' => 6],
                ['credits' => 1000, 'price' => 29.99, 'discount_label' => '-69%', 'badge' => null, 'iap_product_id' => 'credits_1000', 'sort_order' => 7],
                ['credits' => 2500, 'price' => 59.99, 'discount_label' => '-76%', 'badge' => null, 'iap_product_id' => 'credits_2500', 'sort_order' => 8],
                ['credits' => 6000, 'price' => 99.99, 'discount_label' => '-83%', 'badge' => 'best value', 'iap_product_id' => 'credits_6000', 'sort_order' => 9],
            ];
            foreach ($packages as $pkg) {
                $wpdb->insert($table_packages, array_merge($pkg, ['is_active' => 1]));
            }
        }

        // === WP_OPTIONS CONFIG (seed from React Native hardcoded values) ===

        // Streak config
        if (!get_option('rafflemania_streak_config')) {
            update_option('rafflemania_streak_config', json_encode([
                'daily_xp' => 5,
                'day_7_xp' => 10,
                'day_7_credits' => 1,
                'week_1_credits' => 1,
                'week_2_credits' => 2,
                'week_3_credits' => 3,
                'week_4_credits' => 5,
                'max_streak' => 1000,
                'recovery_cost_per_day' => 2,
            ]));
        }

        // Daily limits
        if (!get_option('rafflemania_daily_limits')) {
            update_option('rafflemania_daily_limits', json_encode([
                'max_tickets' => 60,
                'max_ads' => 72,
                'cooldown_minutes' => 20,
            ]));
        }

        // XP rewards
        if (!get_option('rafflemania_xp_rewards')) {
            update_option('rafflemania_xp_rewards', json_encode([
                'watch_ad' => 3,
                'purchase_ticket' => 2,
                'skip_ad' => 0,
                'purchase_credits' => 0,
                'win_prize' => 0,
                'referral' => 0,
            ]));
        }

        // Referral config
        if (!get_option('rafflemania_referral_config')) {
            update_option('rafflemania_referral_config', json_encode([
                'days_required' => 7,
                'referrer_credits' => 15,
                'referred_credits' => 15,
            ]));
        }

        // App content
        if (!get_option('rafflemania_app_content')) {
            update_option('rafflemania_app_content', json_encode([
                'referral_steps' => [
                    ['icon' => 'share-social-outline', 'title' => 'Condividi il codice', 'description' => 'Invia il tuo codice personale ai tuoi amici'],
                    ['icon' => 'person-add-outline', 'title' => "L'amico si registra", 'description' => 'Il tuo amico si iscrive usando il tuo codice'],
                    ['icon' => 'calendar-outline', 'title' => '7 giorni attivi', 'description' => "L'amico deve essere attivo per 7 giorni consecutivi"],
                    ['icon' => 'gift-outline', 'title' => 'Entrambi vincete!', 'description' => 'Tu e il tuo amico ricevete 15 crediti ciascuno'],
                ],
                'faq' => [],
                'rules' => '',
                'privacy_url' => '',
                'terms_url' => '',
            ]));
        }

        // Save admin panel DB version
        update_option('rafflemania_admin_panel_db_version', '2.0');
    }
}

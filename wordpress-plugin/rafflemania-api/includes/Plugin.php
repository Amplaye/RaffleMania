<?php
// Force opcache refresh: 2026-02-01-referral-v1
namespace RaffleMania;

/**
 * Main Plugin Class - v1.4.1
 */
class Plugin {
    private static $instance = null;

    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->init_hooks();
    }

    private function init_hooks() {
        // Run database migration on init (ensures columns exist)
        add_action('init', [$this, 'maybe_migrate_database']);

        // Register REST API routes
        add_action('rest_api_init', [$this, 'register_routes']);

        // Add CORS headers
        add_action('rest_api_init', [$this, 'add_cors_headers'], 15);

        // Admin menu
        add_action('admin_menu', [$this, 'add_admin_menu']);

        // Cron for scheduled extractions
        add_action('rafflemania_check_extractions', [$this, 'check_scheduled_extractions']);

        if (!wp_next_scheduled('rafflemania_check_extractions')) {
            wp_schedule_event(time(), 'every_minute', 'rafflemania_check_extractions');
        }

        // Custom cron schedule
        add_filter('cron_schedules', function($schedules) {
            $schedules['every_minute'] = [
                'interval' => 60,
                'display' => __('Every Minute', 'rafflemania-api')
            ];
            return $schedules;
        });
    }

    public function add_cors_headers() {
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', function($value) {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
            header('Access-Control-Allow-Credentials: true');
            return $value;
        });
    }

    public function register_routes() {
        // Auth endpoints
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/AuthController.php';
        $auth = new API\AuthController();
        $auth->register_routes();

        // Prizes endpoints
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/PrizesController.php';
        $prizes = new API\PrizesController();
        $prizes->register_routes();

        // Tickets endpoints
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/TicketsController.php';
        $tickets = new API\TicketsController();
        $tickets->register_routes();

        // Draws endpoints
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/DrawsController.php';
        $draws = new API\DrawsController();
        $draws->register_routes();

        // Users endpoints
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/UsersController.php';
        $users = new API\UsersController();
        $users->register_routes();

        // Winners endpoints
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/WinnersController.php';
        $winners = new API\WinnersController();
        $winners->register_routes();

        // Shipments endpoints
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/ShipmentsController.php';
        $shipments = new API\ShipmentsController();
        $shipments->register_routes();

        // Settings endpoints (public app settings) - v1.1
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/SettingsController.php';
        $settings = new API\SettingsController();
        $settings->register_routes();

        // Referral endpoints - v1.4
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/ReferralController.php';
        $referrals = new API\ReferralController();
        $referrals->register_routes();

        // Chat/Support endpoints - v1.5
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/ChatController.php';
        $chat = new API\ChatController();
        $chat->register_routes();
    }

    public function add_admin_menu() {
        add_menu_page(
            'RaffleMania',
            'RaffleMania',
            'manage_options',
            'rafflemania',
            [$this, 'render_admin_page'],
            'dashicons-tickets-alt',
            30
        );

        add_submenu_page(
            'rafflemania',
            'Premi',
            'Premi',
            'manage_options',
            'rafflemania-prizes',
            [$this, 'render_prizes_page']
        );

        add_submenu_page(
            'rafflemania',
            'Estrazioni',
            'Estrazioni',
            'manage_options',
            'rafflemania-draws',
            [$this, 'render_draws_page']
        );

        add_submenu_page(
            'rafflemania',
            'Utenti',
            'Utenti',
            'manage_options',
            'rafflemania-users',
            [$this, 'render_users_page']
        );

        add_submenu_page(
            'rafflemania',
            'Vincitori',
            'Vincitori',
            'manage_options',
            'rafflemania-winners',
            [$this, 'render_winners_page']
        );

        add_submenu_page(
            'rafflemania',
            'Spedizioni',
            'Spedizioni',
            'manage_options',
            'rafflemania-shipments',
            [$this, 'render_shipments_page']
        );

        add_submenu_page(
            'rafflemania',
            'Impostazioni',
            'Impostazioni',
            'manage_options',
            'rafflemania-settings',
            [$this, 'render_settings_page']
        );
    }

    public function render_admin_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/dashboard.php';
    }

    public function render_prizes_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/prizes.php';
    }

    public function render_draws_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/draws.php';
    }

    public function render_users_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/users.php';
    }

    public function render_winners_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/winners.php';
    }

    public function render_settings_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/settings.php';
    }

    public function render_shipments_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/shipments.php';
    }

    public function check_scheduled_extractions() {
        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_draws = $wpdb->prefix . 'rafflemania_draws';

        // Find prizes with countdown status and expired timer
        $expired_prizes = $wpdb->get_results(
            "SELECT * FROM {$table_prizes}
             WHERE timer_status = 'countdown'
             AND scheduled_at IS NOT NULL
             AND scheduled_at <= NOW()"
        );

        foreach ($expired_prizes as $prize) {
            $this->perform_extraction($prize);
        }
    }

    private function perform_extraction($prize) {
        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_draws = $wpdb->prefix . 'rafflemania_draws';
        $table_winners = $wpdb->prefix . 'rafflemania_winners';

        // Mark prize as extracting
        $wpdb->update(
            $table_prizes,
            ['timer_status' => 'extracting'],
            ['id' => $prize->id]
        );

        // Get all tickets for this prize
        $tickets = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table_tickets} WHERE prize_id = %d AND status = 'active'",
            $prize->id
        ));

        if (empty($tickets)) {
            // No tickets, reset prize
            $wpdb->update(
                $table_prizes,
                [
                    'timer_status' => 'waiting',
                    'current_ads' => 0,
                    'scheduled_at' => null,
                    'timer_started_at' => null
                ],
                ['id' => $prize->id]
            );
            return;
        }

        // Generate random winning number
        $winning_number = rand(1, count($tickets) * 3);

        // Find winner (if any ticket matches)
        $winner_ticket = null;
        foreach ($tickets as $ticket) {
            if ($ticket->ticket_number == $winning_number) {
                $winner_ticket = $ticket;
                break;
            }
        }

        // Create draw record
        $draw_id = 'draw_' . $prize->id . '_' . date('YmdHis');
        $wpdb->insert($table_draws, [
            'draw_id' => $draw_id,
            'prize_id' => $prize->id,
            'winning_number' => $winning_number,
            'winner_user_id' => $winner_ticket ? $winner_ticket->user_id : null,
            'winner_ticket_id' => $winner_ticket ? $winner_ticket->id : null,
            'total_tickets' => count($tickets),
            'extracted_at' => current_time('mysql'),
            'status' => 'completed'
        ]);

        // Track daily stats for cron extractions
        $this->track_daily_stat('draws_made');

        // If there's a winner, record it
        if ($winner_ticket) {
            $wpdb->insert($table_winners, [
                'user_id' => $winner_ticket->user_id,
                'prize_id' => $prize->id,
                'draw_id' => $wpdb->insert_id,
                'ticket_id' => $winner_ticket->id,
                'claimed' => 0,
                'won_at' => current_time('mysql')
            ]);

            // Track daily winner stat
            $this->track_daily_stat('winners');

            // Mark winning ticket
            $wpdb->update(
                $table_tickets,
                ['status' => 'winner', 'is_winner' => 1],
                ['id' => $winner_ticket->id]
            );

            // Send push notification to winner
            $this->send_winner_notification($winner_ticket->user_id, $prize);
        }

        // Mark all other tickets as used
        $wpdb->query($wpdb->prepare(
            "UPDATE {$table_tickets} SET status = 'used' WHERE prize_id = %d AND status = 'active'",
            $prize->id
        ));

        // Reset prize for next round
        $wpdb->update(
            $table_prizes,
            [
                'timer_status' => 'waiting',
                'current_ads' => 0,
                'scheduled_at' => null,
                'timer_started_at' => null,
                'extracted_at' => current_time('mysql')
            ],
            ['id' => $prize->id]
        );
    }

    private function track_daily_stat($stat_name, $amount = 1) {
        global $wpdb;
        $table_daily_stats = $wpdb->prefix . 'rafflemania_daily_stats';

        // Use Italian timezone
        $italy_tz = new \DateTimeZone('Europe/Rome');
        $today = (new \DateTime('now', $italy_tz))->format('Y-m-d');

        // Try to insert or update
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table_daily_stats} WHERE stat_date = %s",
            $today
        ));

        if ($existing) {
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_daily_stats} SET {$stat_name} = {$stat_name} + %d WHERE stat_date = %s",
                $amount,
                $today
            ));
        } else {
            $wpdb->insert($table_daily_stats, [
                'stat_date' => $today,
                $stat_name => $amount
            ]);
        }
    }

    private function send_winner_notification($user_id, $prize) {
        // Get user's push token
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        if ($user && !empty($user->push_token)) {
            // Send push notification (implement your push service here)
            // Example: Firebase, OneSignal, etc.
            do_action('rafflemania_send_push', $user->push_token, [
                'title' => 'Hai Vinto!',
                'body' => 'Congratulazioni! Hai vinto ' . $prize->name,
                'data' => [
                    'type' => 'win',
                    'prize_id' => $prize->id
                ]
            ]);
        }
    }

    /**
     * Run database migration if needed (called on init)
     */
    public function maybe_migrate_database() {
        $db_version = get_option('rafflemania_referral_db_version', '0');

        if (version_compare($db_version, '1.4', '<')) {
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

            // Add new columns if they don't exist
            if (!in_array('days_active', $existing_columns)) {
                $wpdb->query("ALTER TABLE {$table_referrals} ADD COLUMN days_active int(11) DEFAULT 1 AFTER bonus_given");
            }

            if (!in_array('last_active_date', $existing_columns)) {
                $wpdb->query("ALTER TABLE {$table_referrals} ADD COLUMN last_active_date date DEFAULT NULL AFTER days_active");
            }

            if (!in_array('reward_claimed', $existing_columns)) {
                $wpdb->query("ALTER TABLE {$table_referrals} ADD COLUMN reward_claimed tinyint(1) DEFAULT 0 AFTER last_active_date");
            }

            if (!in_array('referred_reward_claimed', $existing_columns)) {
                $wpdb->query("ALTER TABLE {$table_referrals} ADD COLUMN referred_reward_claimed tinyint(1) DEFAULT 0 AFTER reward_claimed");
            }

            // Set initial values for existing records
            $wpdb->query("UPDATE {$table_referrals} SET last_active_date = DATE(created_at) WHERE last_active_date IS NULL");

            // Update version
            update_option('rafflemania_referral_db_version', '1.4');
        }
    }
}

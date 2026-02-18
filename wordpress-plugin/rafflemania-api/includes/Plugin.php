<?php
// Force opcache refresh: 2026-02-13-delivery-v2
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

        // Check for expired extractions on every request (rate-limited to once per 60s)
        // This ensures extractions fire even if WP-Cron is unreliable
        add_action('init', [$this, 'maybe_check_extractions'], 99);

        // Heartbeat: on every request, ensure the cron chain stays alive
        add_action('shutdown', [$this, 'maybe_heartbeat']);

        // Self-ping: when a timer starts, we schedule this to fire a loopback HTTP request
        // at extraction time, triggering WP-Cron even without external visits.
        add_action('rafflemania_self_ping', [$this, 'do_self_ping']);

        // Register REST API routes
        add_action('rest_api_init', [$this, 'register_routes']);

        // Add CORS headers
        add_action('rest_api_init', [$this, 'add_cors_headers'], 15);

        // Inject JWT auth for referral endpoints (workaround for opcache)
        add_filter('rest_request_before_callbacks', [$this, 'inject_referral_auth'], 10, 3);

        // Admin menu
        add_action('admin_menu', [$this, 'add_admin_menu']);

        // Custom cron schedule - MUST be registered BEFORE wp_schedule_event
        add_filter('cron_schedules', function($schedules) {
            $schedules['every_minute'] = [
                'interval' => 60,
                'display' => __('Every Minute', 'rafflemania-api')
            ];
            return $schedules;
        });

        // Cron for scheduled extractions
        add_action('rafflemania_check_extractions', [$this, 'check_scheduled_extractions']);

        // Daily cleanup cron
        add_action('rafflemania_daily_cleanup', [$this, 'perform_daily_cleanup']);
        if (!wp_next_scheduled('rafflemania_daily_cleanup')) {
            wp_schedule_event(time(), 'daily', 'rafflemania_daily_cleanup');
        }

        // Force re-schedule to fix previously broken cron registration
        $cron_fix_version = get_option('rafflemania_cron_fix_version', '0');
        if ($cron_fix_version < 2) {
            $timestamp = wp_next_scheduled('rafflemania_check_extractions');
            if ($timestamp) {
                wp_unschedule_event($timestamp, 'rafflemania_check_extractions');
            }
            wp_schedule_event(time(), 'every_minute', 'rafflemania_check_extractions');
            update_option('rafflemania_cron_fix_version', 2);
        } elseif (!wp_next_scheduled('rafflemania_check_extractions')) {
            wp_schedule_event(time(), 'every_minute', 'rafflemania_check_extractions');
        }
    }

    public function add_cors_headers() {
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', function($value) {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With, X-Support-Secret, X-Admin-Key');
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

        // NotificationHelper (needed by chat controllers)
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';

        // Support Chat endpoints - v1.5
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/SupportChatController.php';
        $support = new API\SupportChatController();
        $support->register_routes();

        // Admin Chat endpoints (push notifications for admin chat)
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/ChatController.php';
        $chat = new API\ChatController();
        $chat->register_routes();

        // Notification endpoints (admin push management) - v2.0
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/NotificationController.php';
        $notifications = new API\NotificationController();
        $notifications->register_routes();

        // Admin endpoints (user management, bulk rewards, force actions) - v2.0
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/AdminController.php';
        $admin = new API\AdminController();
        $admin->register_routes();

        // Payments endpoints (IAP + Stripe) - v2.6
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/PaymentsController.php';
        $payments = new API\PaymentsController();
        $payments->register_routes();

        // Public cron endpoint for external cron services
        register_rest_route('rafflemania/v1', '/cron/run', [
            'methods' => 'GET',
            'callback' => [$this, 'handle_cron_endpoint'],
            'permission_callback' => '__return_true',
        ]);

        // Public endpoint for app to trigger extraction check (rate-limited, no secret needed)
        register_rest_route('rafflemania/v1', '/extractions/check', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_extraction_check'],
            'permission_callback' => '__return_true',
        ]);
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
            'Consegna Premi',
            'Consegna Premi',
            'manage_options',
            'rafflemania-deliveries',
            [$this, 'render_deliveries_page']
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
            'Economia di Gioco',
            'Economia',
            'manage_options',
            'rafflemania-economy',
            [$this, 'render_economy_page']
        );

        add_submenu_page(
            'rafflemania',
            'Contenuti App',
            'Contenuti',
            'manage_options',
            'rafflemania-content',
            [$this, 'render_content_page']
        );

        add_submenu_page(
            'rafflemania',
            'Notifiche Push',
            'Notifiche',
            'manage_options',
            'rafflemania-notifications',
            [$this, 'render_notifications_page']
        );

        add_submenu_page(
            'rafflemania',
            'Ricompense Globali',
            'Ricompense',
            'manage_options',
            'rafflemania-rewards',
            [$this, 'render_rewards_page']
        );

        add_submenu_page(
            'rafflemania',
            'Supporto Chat',
            'Supporto',
            'manage_options',
            'rafflemania-support',
            [$this, 'render_support_page']
        );

        add_submenu_page(
            'rafflemania',
            'XP, Ricompense e Limiti',
            'XP e Ricompense',
            'manage_options',
            'rafflemania-xp',
            [$this, 'render_xp_page']
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

    public function render_support_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/support-chat.php';
    }

    public function render_deliveries_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/deliveries.php';
    }

    public function render_shipments_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/shipments.php';
    }

    public function render_economy_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/game-economy.php';
    }

    public function render_content_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/app-content.php';
    }

    public function render_notifications_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/notifications.php';
    }

    public function render_rewards_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/bulk-rewards.php';
    }

    public function render_xp_page() {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'admin/xp-rewards.php';
    }

    /**
     * Inject JWT auth for referral endpoints
     * This is needed because opcache may cache the old ReferralController
     * that doesn't have its own check_auth method
     */
    public function inject_referral_auth($response, $handler, $request) {
        // Only for referral endpoints
        $route = $request->get_route();
        if (strpos($route, '/rafflemania/v1/referrals') === false) {
            return $response;
        }

        // Skip if already authenticated
        if ($request->get_param('_auth_user_id')) {
            return $response;
        }

        // Get auth header
        $auth_header = $request->get_header('Authorization');
        if (!$auth_header || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            return $response;
        }

        $token = $matches[1];

        // Verify JWT
        $secret = get_option('rafflemania_jwt_secret');
        if (!$secret) {
            return $response;
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return $response;
        }

        list($base64_header, $base64_payload, $base64_signature) = $parts;

        $signature = base64_decode(strtr($base64_signature, '-_', '+/'));
        $expected_signature = hash_hmac('sha256', $base64_header . '.' . $base64_payload, $secret, true);

        if (!hash_equals($signature, $expected_signature)) {
            return $response;
        }

        $payload = json_decode(base64_decode(strtr($base64_payload, '-_', '+/')), true);

        if (!$payload) {
            return $response;
        }
        // Note: not checking expiry here since the callback itself handles auth errors
        // and the token refresh mechanism should handle expired tokens

        if (isset($payload['type']) && $payload['type'] !== 'access') {
            return $response;
        }

        // Set user_id in request
        $request->set_param('_auth_user_id', $payload['user_id']);

        return $response;
    }

    /**
     * Lightweight check on every request (rate-limited to once per 60s via transient).
     * Ensures extractions happen even when WP-Cron doesn't fire.
     */
    /**
     * Self-ping: makes a non-blocking HTTP request to the site's cron trigger,
     * ensuring WP-Cron fires even without external traffic.
     */
    public function do_self_ping() {
        $url = site_url('/wp-content/plugins/rafflemania-api/cron-trigger.php');
        wp_remote_get($url, [
            'timeout' => 5,
            'blocking' => false,
            'sslverify' => false,
        ]);
        error_log('[RaffleMania] Self-ping triggered: ' . $url);
    }

    /**
     * Heartbeat: fires on every request shutdown.
     * Ensures the cron-heartbeat chain is always running by checking
     * a transient. If the heartbeat hasn't run in 90 seconds, kick it off.
     */
    public function maybe_heartbeat() {
        if (get_transient('rafflemania_heartbeat_alive')) {
            return; // Heartbeat chain is running, nothing to do
        }

        // Rate-limit restart attempts: only one per 60 seconds
        // Prevents stampede when many requests hit at once while heartbeat is down
        if (get_transient('rafflemania_heartbeat_kick')) {
            return;
        }
        set_transient('rafflemania_heartbeat_kick', 1, 60);

        // Heartbeat is dead - restart it
        $url = site_url('/wp-content/plugins/rafflemania-api/cron-heartbeat.php?kick=1');
        wp_remote_get($url, [
            'timeout' => 1,
            'blocking' => false,
            'sslverify' => false,
        ]);
    }

    public function maybe_check_extractions() {
        if (get_transient('rafflemania_last_extraction_check')) {
            return; // Already checked within last 30 seconds
        }
        set_transient('rafflemania_last_extraction_check', 1, 30);

        // Quick DB check: are there any expired countdowns?
        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $has_expired = $wpdb->get_var(
            "SELECT COUNT(*) FROM {$table_prizes}
             WHERE timer_status = 'countdown'
             AND scheduled_at IS NOT NULL
             AND scheduled_at <= NOW()"
        );

        if ($has_expired > 0) {
            $this->check_scheduled_extractions();
        }
    }

    /**
     * Public endpoint for the app to trigger extraction check.
     * Rate-limited to once per 15 seconds, no authentication needed.
     */
    public function handle_extraction_check($request) {
        $transient_key = 'rafflemania_app_extraction_check';
        if (get_transient($transient_key)) {
            return new \WP_REST_Response([
                'success' => true,
                'checked' => false,
                'reason' => 'rate_limited',
            ]);
        }
        set_transient($transient_key, 1, 15);

        $this->check_scheduled_extractions();

        return new \WP_REST_Response([
            'success' => true,
            'checked' => true,
            'timestamp' => current_time('mysql'),
        ]);
    }

    public function handle_cron_endpoint($request) {
        $secret = $request->get_param('secret');
        $expected = get_option('rafflemania_cron_secret', '');

        if (empty($expected) || $secret !== $expected) {
            return new \WP_REST_Response(['error' => 'Unauthorized'], 403);
        }

        $this->check_scheduled_extractions();

        return new \WP_REST_Response([
            'success' => true,
            'timestamp' => current_time('mysql'),
        ]);
    }

    public function check_scheduled_extractions() {
        // Ensure NotificationHelper is loaded (critical in WP-Cron context)
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';

        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_draws = $wpdb->prefix . 'rafflemania_draws';

        error_log('[RaffleMania Cron] check_scheduled_extractions running at ' . current_time('mysql'));

        // Send "extraction imminent" for timers approaching last 5 minutes
        $approaching_prizes = $wpdb->get_results(
            "SELECT * FROM {$table_prizes}
             WHERE timer_status = 'countdown'
             AND scheduled_at IS NOT NULL
             AND scheduled_at > NOW()
             AND scheduled_at <= DATE_ADD(NOW(), INTERVAL 6 MINUTE)"
        );

        foreach ($approaching_prizes as $prize) {
            $transient_key = 'rafflemania_reminder_' . $prize->id;
            if (!get_transient($transient_key)) {
                NotificationHelper::notify_extraction_soon($prize->name);
                set_transient($transient_key, 1, 90);
            }
        }

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

        // Process scheduled notifications
        try {
            require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/API/NotificationController.php';
            API\NotificationController::process_scheduled();
        } catch (\Throwable $e) {
            error_log('[RaffleMania Cron] Error in process_scheduled: ' . $e->getMessage());
        }
    }

    private function perform_extraction($prize) {
        error_log('[RaffleMania Cron] perform_extraction started for prize ID=' . $prize->id . ' name=' . $prize->name);
        try {

        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_draws = $wpdb->prefix . 'rafflemania_draws';
        $table_winners = $wpdb->prefix . 'rafflemania_winners';

        // Deduplication: check if a draw already exists for this prize recently
        $recent_draw = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM {$table_draws} WHERE prize_id = %d AND extracted_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)",
            $prize->id
        ));
        if ($recent_draw) {
            // Draw already exists, just reset the prize status
            $wpdb->update($table_prizes, [
                'timer_status' => 'waiting',
                'current_ads' => 0,
                'scheduled_at' => null,
                'timer_started_at' => null,
                'extracted_at' => current_time('mysql')
            ], ['id' => $prize->id]);
            return;
        }

        // Mark prize as extracting
        $wpdb->update(
            $table_prizes,
            ['timer_status' => 'extracting'],
            ['id' => $prize->id]
        );

        // Get all active tickets for this prize
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

        // Pick winning number from actual ticket numbers (guarantees a winner)
        $random_index = array_rand($tickets);
        $winner_ticket = $tickets[$random_index];
        $winning_number = (int) $winner_ticket->ticket_number;

        // Create draw record
        $draw_id = 'draw_' . $prize->id . '_' . date('YmdHis');
        $wpdb->insert($table_draws, [
            'draw_id' => $draw_id,
            'prize_id' => $prize->id,
            'winning_number' => $winning_number,
            'winner_user_id' => $winner_ticket->user_id,
            'winner_ticket_id' => $winner_ticket->id,
            'total_tickets' => count($tickets),
            'extracted_at' => current_time('mysql'),
            'status' => 'completed'
        ]);

        $draw_db_id = $wpdb->insert_id;

        // Track daily stats
        $this->track_daily_stat('draws_made');

        // Record winner
        $wpdb->insert($table_winners, [
            'user_id' => $winner_ticket->user_id,
            'prize_id' => $prize->id,
            'draw_id' => $draw_db_id,
            'ticket_id' => $winner_ticket->id,
            'claimed' => 0,
            'won_at' => current_time('mysql')
        ]);

        $this->track_daily_stat('winners');

        // Award XP to winner
        $xp_reward = (int) get_option('rafflemania_xp_win_prize', 250);
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $winner_user = $wpdb->get_row($wpdb->prepare(
            "SELECT id, xp, level FROM {$table_users} WHERE id = %d",
            $winner_ticket->user_id
        ));
        if ($winner_user) {
            $new_xp = (int)$winner_user->xp + $xp_reward;
            $new_level = self::calculate_level_from_xp($new_xp);
            $wpdb->update($table_users, [
                'xp' => $new_xp,
                'level' => $new_level
            ], ['id' => $winner_user->id]);
            error_log('[RaffleMania Cron] Awarded ' . $xp_reward . ' XP to user ' . $winner_user->id . ' (new total: ' . $new_xp . ', level: ' . $new_level . ')');
        }

        // Mark winning ticket
        $wpdb->update(
            $table_tickets,
            ['status' => 'winner', 'is_winner' => 1],
            ['id' => $winner_ticket->id]
        );

        // Mark all other tickets as used
        $wpdb->query($wpdb->prepare(
            "UPDATE {$table_tickets} SET status = 'used' WHERE prize_id = %d AND status = 'active'",
            $prize->id
        ));

        error_log('[RaffleMania Cron] Extraction completed for prize ' . $prize->name . ', winning_number=' . $winning_number . ', winner_user_id=' . $winner_ticket->user_id . ', total_tickets=' . count($tickets));

        // Notify all users that extraction is completed
        $completion_key = 'rafflemania_completion_' . $prize->id;
        if (!get_transient($completion_key)) {
            NotificationHelper::notify_extraction_completed($prize->name);
            set_transient($completion_key, 1, 60);
        }

        // Handle stock and reset prize for next round
        $current_stock = (int) $prize->stock;

        if ($current_stock === 0) {
            // Illimitato - reset normale
            $wpdb->update($table_prizes, [
                'timer_status' => 'waiting',
                'current_ads' => 0,
                'scheduled_at' => null,
                'timer_started_at' => null,
                'extracted_at' => current_time('mysql')
            ], ['id' => $prize->id]);
        } elseif ($current_stock <= 1) {
            // Ultima estrazione - disattivare il premio
            $wpdb->update($table_prizes, [
                'stock' => 0,
                'timer_status' => 'completed',
                'is_active' => 0,
                'extracted_at' => current_time('mysql')
            ], ['id' => $prize->id]);
            error_log('[RaffleMania Cron] Prize ' . $prize->name . ' stock exhausted, deactivated.');
        } else {
            // Stock rimanente - decrementa e resetta per nuovo round
            $wpdb->update($table_prizes, [
                'stock' => $current_stock - 1,
                'timer_status' => 'waiting',
                'current_ads' => 0,
                'scheduled_at' => null,
                'timer_started_at' => null,
                'extracted_at' => current_time('mysql')
            ], ['id' => $prize->id]);
            error_log('[RaffleMania Cron] Prize ' . $prize->name . ' stock decremented to ' . ($current_stock - 1));
        }

        } catch (\Throwable $e) {
            error_log('[RaffleMania Cron] FATAL ERROR in perform_extraction for prize ' . $prize->id . ': ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine());
            // Reset prize status so it doesn't stay stuck in 'extracting'
            global $wpdb;
            $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
            $wpdb->update($table_prizes, ['timer_status' => 'waiting', 'scheduled_at' => null, 'timer_started_at' => null], ['id' => $prize->id]);
        }
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
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';
        NotificationHelper::notify_winner($user_id, $prize->name);
    }

    private static function calculate_level_from_xp($xp) {
        global $wpdb;
        $table_levels = $wpdb->prefix . 'rafflemania_levels';
        $level = $wpdb->get_var($wpdb->prepare(
            "SELECT level FROM {$table_levels} WHERE min_xp <= %d AND is_active = 1 ORDER BY level DESC LIMIT 1",
            $xp
        ));
        return $level ? (int)$level : 1;
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

        // Migration 1.5: Add notification_preferences to users table
        global $wpdb;
        $notif_version = get_option('rafflemania_notif_db_version', '0');
        if (version_compare($notif_version, '1.5', '<')) {
            $table_users = $wpdb->prefix . 'rafflemania_users';
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_users}'");
            if ($table_exists) {
                $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_users}");
                $existing_columns = array_map(function($col) { return $col->Field; }, $columns);

                if (!in_array('notification_preferences', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_users} ADD COLUMN notification_preferences TEXT DEFAULT NULL");
                }
            }
            update_option('rafflemania_notif_db_version', '1.5');
        }

        // Migration 2.0: Admin panel tables + seed data
        $admin_db_version = get_option('rafflemania_admin_panel_db_version', '0');
        if (version_compare($admin_db_version, '2.0', '<')) {
            require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/Activator.php';
            Activator::activate();
        }

        // Migration 2.1: Add admin_notes and is_banned to users table
        if (version_compare($admin_db_version, '2.1', '<')) {
            $table_users = $wpdb->prefix . 'rafflemania_users';
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_users}'");
            if ($table_exists) {
                $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_users}");
                $existing_columns = array_map(function($col) { return $col->Field; }, $columns);

                if (!in_array('is_banned', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_users} ADD COLUMN is_banned tinyint(1) DEFAULT 0 AFTER is_active");
                }
                if (!in_array('ban_reason', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_users} ADD COLUMN ban_reason varchar(500) DEFAULT NULL AFTER is_banned");
                }
                if (!in_array('admin_notes', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_users} ADD COLUMN admin_notes text DEFAULT NULL AFTER ban_reason");
                }
                if (!in_array('last_login_at', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_users} ADD COLUMN last_login_at datetime DEFAULT NULL AFTER updated_at");
                }
            }
            update_option('rafflemania_admin_panel_db_version', '2.1');
        }

        // Migration 2.2: Add delivery_status and delivered_at to winners table
        if (version_compare($admin_db_version, '2.2', '<')) {
            $table_winners = $wpdb->prefix . 'rafflemania_winners';
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_winners}'");
            if ($table_exists) {
                $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_winners}");
                $existing_columns = array_map(function($col) { return $col->Field; }, $columns);

                if (!in_array('delivery_status', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_winners} ADD COLUMN delivery_status varchar(20) DEFAULT 'processing' AFTER claimed_at");
                }
                if (!in_array('delivered_at', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_winners} ADD COLUMN delivered_at datetime DEFAULT NULL AFTER delivery_status");
                }
                if (!in_array('delivery_email_sent', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_winners} ADD COLUMN delivery_email_sent tinyint(1) DEFAULT 0 AFTER delivered_at");
                }
            }
            update_option('rafflemania_admin_panel_db_version', '2.2');
        }

        // Migration 2.3: Add reward_notifications table for in-app reward popups
        if (version_compare($admin_db_version, '2.3', '<')) {
            $table_reward_notif = $wpdb->prefix . 'rafflemania_reward_notifications';
            $charset_collate = $wpdb->get_charset_collate();

            $wpdb->query("CREATE TABLE IF NOT EXISTS {$table_reward_notif} (
                id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                user_id bigint(20) unsigned NOT NULL,
                bulk_reward_id bigint(20) unsigned DEFAULT NULL,
                reason varchar(255) NOT NULL,
                credits_amount int(11) DEFAULT 0,
                xp_amount int(11) DEFAULT 0,
                tickets_amount int(11) DEFAULT 0,
                seen tinyint(1) DEFAULT 0,
                created_at datetime DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_user_seen (user_id, seen),
                KEY idx_created (created_at)
            ) {$charset_collate}");

            update_option('rafflemania_admin_panel_db_version', '2.3');
        }

        // Migration 2.4: Add voucher_code and delivery_notes to winners table
        if (version_compare($admin_db_version, '2.4', '<')) {
            $table_winners = $wpdb->prefix . 'rafflemania_winners';
            $existing_columns = array_map(function($col) { return $col->Field; },
                $wpdb->get_results("SHOW COLUMNS FROM {$table_winners}")
            );

            if (!in_array('voucher_code', $existing_columns)) {
                $wpdb->query("ALTER TABLE {$table_winners} ADD COLUMN voucher_code varchar(500) DEFAULT NULL AFTER delivery_email_sent");
            }
            if (!in_array('delivery_notes', $existing_columns)) {
                $wpdb->query("ALTER TABLE {$table_winners} ADD COLUMN delivery_notes text DEFAULT NULL AFTER voucher_code");
            }

            update_option('rafflemania_admin_panel_db_version', '2.4');
        }

        // Migration 2.5: Add publish_at column to prizes table for scheduling
        if (version_compare($admin_db_version, '2.5', '<')) {
            $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_prizes}'");
            if ($table_exists) {
                $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_prizes}");
                $existing_columns = array_map(function($col) { return $col->Field; }, $columns);

                if (!in_array('publish_at', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_prizes} ADD COLUMN publish_at datetime DEFAULT NULL AFTER extracted_at");
                    $wpdb->query("ALTER TABLE {$table_prizes} ADD KEY publish_at (publish_at)");
                }
            }
            update_option('rafflemania_admin_panel_db_version', '2.5');
        }

        // Migration 2.6: Create rafflemania_payments table + add iap_product_id to shop_packages
        if (version_compare($admin_db_version, '2.6', '<')) {
            $table_payments = $wpdb->prefix . 'rafflemania_payments';
            $charset_collate = $wpdb->get_charset_collate();

            $wpdb->query("CREATE TABLE IF NOT EXISTS {$table_payments} (
                id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                user_id bigint(20) unsigned NOT NULL,
                package_id bigint(20) unsigned DEFAULT NULL,
                payment_method enum('apple_iap','google_iap','stripe') NOT NULL,
                transaction_id varchar(255) NOT NULL,
                receipt_data longtext DEFAULT NULL,
                amount decimal(10,2) DEFAULT 0.00,
                credits_awarded int(11) DEFAULT 0,
                status enum('pending','verified','failed','refunded') DEFAULT 'pending',
                verified_at datetime DEFAULT NULL,
                verification_response longtext DEFAULT NULL,
                created_at datetime DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY idx_transaction_id (transaction_id),
                KEY idx_user_id (user_id),
                KEY idx_status (status),
                KEY idx_created (created_at)
            ) {$charset_collate}");

            // Add iap_product_id column to shop_packages if not exists
            $table_packages = $wpdb->prefix . 'rafflemania_shop_packages';
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_packages}'");
            if ($table_exists) {
                $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_packages}");
                $existing_columns = array_map(function($col) { return $col->Field; }, $columns);

                if (!in_array('iap_product_id', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_packages} ADD COLUMN iap_product_id varchar(100) DEFAULT NULL AFTER discount");

                    // Populate iap_product_id based on credits
                    $packages = $wpdb->get_results("SELECT id, credits FROM {$table_packages}");
                    foreach ($packages as $pkg) {
                        $iap_id = 'credits_' . $pkg->credits;
                        $wpdb->update($table_packages, ['iap_product_id' => $iap_id], ['id' => $pkg->id]);
                    }
                }
            }

            update_option('rafflemania_admin_panel_db_version', '2.6');
        }

        // Migration 2.7: Add ad_free column to users table
        if (version_compare($admin_db_version, '2.7', '<')) {
            $table_users = $wpdb->prefix . 'rafflemania_users';
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_users}'");
            if ($table_exists) {
                $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_users}");
                $existing_columns = array_map(function($col) { return $col->Field; }, $columns);

                if (!in_array('ad_free', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_users} ADD COLUMN ad_free tinyint(1) DEFAULT 0 AFTER is_active");
                }
            }
            update_option('rafflemania_admin_panel_db_version', '2.7');
        }

        // Migration 2.8: Add watched_ads column to users table (needed for ad stats tracking)
        if (version_compare($admin_db_version, '2.8', '<')) {
            $table_users = $wpdb->prefix . 'rafflemania_users';
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_users}'");
            if ($table_exists) {
                $columns = $wpdb->get_results("SHOW COLUMNS FROM {$table_users}");
                $existing_columns = array_map(function($col) { return $col->Field; }, $columns);

                if (!in_array('watched_ads', $existing_columns)) {
                    $wpdb->query("ALTER TABLE {$table_users} ADD COLUMN watched_ads int(11) DEFAULT 0 AFTER ad_free");
                }
            }
            update_option('rafflemania_admin_panel_db_version', '2.8');
        }
    }

    /**
     * Daily cleanup - removes old data to keep DB lean
     */
    public function perform_daily_cleanup() {
        global $wpdb;

        error_log('[RaffleMania Cleanup] Daily cleanup started at ' . current_time('mysql'));

        $cleaned = [];

        // 1. Delete used/expired tickets older than 90 days
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $deleted = $wpdb->query("DELETE FROM {$table_tickets} WHERE status IN ('used','expired') AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)");
        if ($deleted) $cleaned[] = "tickets: {$deleted}";

        // 2. Delete old notification_log entries (older than 90 days)
        $table_notif = $wpdb->prefix . 'rafflemania_notification_log';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_notif}'");
        if ($table_exists) {
            $deleted = $wpdb->query("DELETE FROM {$table_notif} WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)");
            if ($deleted) $cleaned[] = "notification_log: {$deleted}";
        }

        // 3. Delete old admin_actions_log entries (older than 180 days)
        $table_log = $wpdb->prefix . 'rafflemania_admin_actions_log';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_log}'");
        if ($table_exists) {
            $deleted = $wpdb->query("DELETE FROM {$table_log} WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY)");
            if ($deleted) $cleaned[] = "admin_actions_log: {$deleted}";
        }

        // 4. Delete old bulk_rewards_log entries (older than 90 days)
        $table_bulk = $wpdb->prefix . 'rafflemania_bulk_rewards_log';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_bulk}'");
        if ($table_exists) {
            $deleted = $wpdb->query("DELETE FROM {$table_bulk} WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)");
            if ($deleted) $cleaned[] = "bulk_rewards_log: {$deleted}";
        }

        // 5. Delete old daily_stats (older than 365 days)
        $table_stats = $wpdb->prefix . 'rafflemania_daily_stats';
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_stats}'");
        if ($table_exists) {
            $deleted = $wpdb->query("DELETE FROM {$table_stats} WHERE stat_date < DATE_SUB(CURDATE(), INTERVAL 365 DAY)");
            if ($deleted) $cleaned[] = "daily_stats: {$deleted}";
        }

        // 6. Invalidate API caches
        wp_cache_delete('rafflemania_levels', 'rafflemania');
        wp_cache_delete('rafflemania_shop_packages', 'rafflemania');
        wp_cache_delete('rafflemania_streak_config', 'rafflemania');
        wp_cache_delete('rafflemania_game_config', 'rafflemania');
        wp_cache_delete('rafflemania_app_content', 'rafflemania');

        $summary = empty($cleaned) ? 'nothing to clean' : implode(', ', $cleaned);
        error_log("[RaffleMania Cleanup] Completed: {$summary}");
    }
}

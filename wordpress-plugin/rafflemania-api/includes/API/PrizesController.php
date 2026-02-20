<?php
// Force opcache refresh: 2026-01-27-v3
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Prizes API Controller - v1.3 with settings
 */
class PrizesController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'prizes';

    public function register_routes() {
        // Get all prizes
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_prizes'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Get single prize
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_prize'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Increment ads for prize (watch ad)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)/increment-ads', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'increment_ads'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Get prize timer status
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)/timer', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_timer_status'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // App settings (XP, credits config) - using prizes/settings path
        register_rest_route($this->namespace, '/' . $this->rest_base . '/settings', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_app_settings'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Sync timer status from app (public - for timer sync without full auth)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)/sync-timer', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'sync_timer_status'],
                'permission_callback' => '__return_true',
                'args' => [
                    'timer_status' => [
                        'required' => true,
                        'type' => 'string',
                        'enum' => ['waiting', 'countdown', 'completed']
                    ],
                    'timer_started_at' => [
                        'required' => false,
                        'type' => 'string'
                    ],
                    'scheduled_at' => [
                        'required' => false,
                        'type' => 'string'
                    ],
                    'current_ads' => [
                        'required' => false,
                        'type' => 'integer'
                    ]
                ]
            ]
        ]);
    }

    public function get_prizes(WP_REST_Request $request) {
        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        // Auto-activate scheduled prizes whose publish_at has passed
        $wpdb->query(
            "UPDATE {$table_prizes} SET is_active = 1 WHERE publish_at IS NOT NULL AND publish_at <= NOW() AND is_active = 0"
        );

        $active_param = $request->get_param('active');
        $sort_by = $request->get_param('sort_by');

        // Default: return active + scheduled future prizes for the app
        if ($active_param === 'false') {
            $where = 'WHERE is_active = 0';
        } elseif ($active_param === 'all') {
            $where = '';
        } else {
            $where = 'WHERE (is_active = 1 OR (is_active = 0 AND publish_at IS NOT NULL AND publish_at > NOW()))';
        }

        // Support sorting by value for the app
        $order_sql = 'ORDER BY created_at DESC';
        if ($sort_by === 'value_desc') {
            $order_sql = 'ORDER BY value DESC';
        } elseif ($sort_by === 'value_asc') {
            $order_sql = 'ORDER BY value ASC';
        }

        $prizes = $wpdb->get_results(
            "SELECT *,
                CASE WHEN timer_status = 'countdown' AND scheduled_at IS NOT NULL
                    THEN GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), scheduled_at))
                    ELSE NULL
                END AS remaining_seconds
            FROM {$table_prizes} {$where} {$order_sql}"
        );

        $formatted = array_map([$this, 'format_prize'], $prizes);

        // Include app settings in prizes response for mobile app - v1.2
        $settings = $this->get_settings_data();

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'prizes' => $formatted,
                'total' => count($formatted),
                'settings' => $settings
            ]
        ]);
    }

    /**
     * Get app settings data
     */
    private function get_settings_data() {
        $xp_watch_ad = (int) get_option('rafflemania_xp_watch_ad', 10);
        return [
            'xp' => [
                'watch_ad' => $xp_watch_ad,
                'daily_streak' => (int) get_option('rafflemania_xp_daily_streak', 10),
                'credit_ticket' => (int) get_option('rafflemania_xp_credit_ticket', 5),
                'skip_ad' => $xp_watch_ad * 2,
                'purchase_credits' => (int) get_option('rafflemania_xp_purchase_credits', 25),
                'win_prize' => (int) get_option('rafflemania_xp_win_prize', 250),
                'referral' => (int) get_option('rafflemania_xp_referral', 50),
            ],
            'credits' => [
                'per_ticket' => (int) get_option('rafflemania_credits_per_ticket', 5),
                'referral_bonus' => (int) get_option('rafflemania_referral_bonus', 10),
            ],
        ];
    }

    public function get_prize(WP_REST_Request $request) {
        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $id = $request->get_param('id');

        $prize = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_prizes} WHERE id = %d",
            $id
        ));

        if (!$prize) {
            return new WP_Error('not_found', 'Premio non trovato', ['status' => 404]);
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'prize' => $this->format_prize($prize)
            ]
        ]);
    }

    public function increment_ads(WP_REST_Request $request) {
        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $prize_id = $request->get_param('id');
        $user_id = $request->get_param('_auth_user_id');

        // Get prize
        $prize = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_prizes} WHERE id = %d AND is_active = 1",
            $prize_id
        ));

        if (!$prize) {
            return new WP_Error('not_found', 'Premio non trovato', ['status' => 404]);
        }

        // Increment ads count
        $new_count = min($prize->current_ads + 1, $prize->goal_ads);

        $update_data = ['current_ads' => $new_count];

        // Check if goal reached and timer should start
        $timer_just_started = false;
        if ($new_count >= $prize->goal_ads && $prize->timer_status === 'waiting') {
            // Compute duration based on prize value (≤25€ = 5 min, >25€ = 12h)
            $prize_value = (float) $prize->value;
            $duration = ($prize_value <= 25) ? 300 : 43200;
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_prizes} SET current_ads = %d, timer_status = 'countdown', timer_started_at = NOW(), scheduled_at = DATE_ADD(NOW(), INTERVAL %d SECOND) WHERE id = %d",
                $new_count, $duration, $prize_id
            ));
            $timer_just_started = true;

            // Read back for notification
            $sched = $wpdb->get_var($wpdb->prepare("SELECT scheduled_at FROM {$table_prizes} WHERE id = %d", $prize_id));
            if ($sched) {
                $remaining_min = max(1, intval((strtotime($sched) - time()) / 60));
                if ($remaining_min <= 10) {
                    $transient_key = 'rafflemania_reminder_' . $prize->id;
                    if (!get_transient($transient_key)) {
                        \RaffleMania\NotificationHelper::notify_extraction_soon($prize->name, $remaining_min);
                        set_transient($transient_key, 1, 600);
                    }
                }
                // Schedule extraction event
                $extraction_time = strtotime($sched);
                if ($extraction_time > time()) {
                    wp_schedule_single_event($extraction_time + 5, 'rafflemania_check_extractions');
                }
            }
        }

        if (!$timer_just_started) {
            $wpdb->update($table_prizes, $update_data, ['id' => $prize_id]);
        }

        // Get updated prize
        $updated_prize = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_prizes} WHERE id = %d",
            $prize_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'prize' => $this->format_prize($updated_prize),
                'timerStarted' => $new_count >= $prize->goal_ads && $prize->timer_status === 'waiting'
            ]
        ]);
    }

    public function get_timer_status(WP_REST_Request $request) {
        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $prize_id = $request->get_param('id');

        $prize = $wpdb->get_row($wpdb->prepare(
            "SELECT id, timer_status, scheduled_at, timer_started_at, current_ads, goal_ads,
                CASE WHEN timer_status = 'countdown' AND scheduled_at IS NOT NULL
                    THEN GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), scheduled_at))
                    ELSE NULL
                END AS remaining_seconds
            FROM {$table_prizes} WHERE id = %d",
            $prize_id
        ));

        if (!$prize) {
            return new WP_Error('not_found', 'Premio non trovato', ['status' => 404]);
        }

        $remaining = (int)($prize->remaining_seconds ?? 0);
        $scheduled_at_utc = $remaining > 0 ? gmdate('Y-m-d\TH:i:s.000\Z', time() + $remaining) : null;

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'prizeId' => (int) $prize->id,
                'timerStatus' => $prize->timer_status,
                'scheduledAt' => $scheduled_at_utc,
                'timerStartedAt' => self::to_utc_iso($prize->timer_started_at),
                'remainingSeconds' => $remaining,
                'currentAds' => (int) $prize->current_ads,
                'goalAds' => (int) $prize->goal_ads,
                'progress' => $prize->goal_ads > 0 ? round(($prize->current_ads / $prize->goal_ads) * 100, 2) : 0
            ]
        ]);
    }

    public function check_auth(WP_REST_Request $request) {
        $auth_header = $request->get_header('Authorization');

        if (!$auth_header || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            return false;
        }

        $token = $matches[1];
        $auth_controller = new AuthController();
        $payload = $this->verify_token($token);

        if (is_wp_error($payload)) {
            return false;
        }

        $request->set_param('_auth_user_id', $payload['user_id']);
        return true;
    }

    private function verify_token($token) {
        $secret = get_option('rafflemania_jwt_secret');
        if (!$secret) {
            return new WP_Error('no_secret', 'Server configuration error', ['status' => 500]);
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return new WP_Error('invalid_token', 'Token non valido', ['status' => 401]);
        }

        list($base64_header, $base64_payload, $base64_signature) = $parts;

        $signature = $this->base64url_decode($base64_signature);
        $expected_signature = hash_hmac('sha256', $base64_header . '.' . $base64_payload, $secret, true);

        if (!hash_equals($signature, $expected_signature)) {
            return new WP_Error('invalid_signature', 'Firma non valida', ['status' => 401]);
        }

        $payload = json_decode($this->base64url_decode($base64_payload), true);

        if ($payload['exp'] < time()) {
            return new WP_Error('token_expired', 'Token scaduto', ['status' => 401]);
        }

        return $payload;
    }

    private function base64url_decode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Convert MySQL datetime (server local time) to UTC ISO 8601 format.
     * Uses PHP strtotime which should match server timezone.
     * For time-critical fields (scheduledAt), use remaining_seconds from MySQL instead.
     */
    public static function to_utc_iso($mysql_datetime) {
        if (!$mysql_datetime) return null;
        $ts = strtotime($mysql_datetime);
        return $ts ? gmdate('Y-m-d\TH:i:s.000\Z', $ts) : null;
    }

    private function format_prize($prize) {
        // For scheduledAt: use MySQL-computed remaining_seconds (timezone-safe)
        // MySQL computes TIMESTAMPDIFF(SECOND, NOW(), scheduled_at) using its own timezone
        // consistently, then we reconstruct the UTC timestamp from current UTC time + remaining
        $scheduled_at_utc = null;
        if (isset($prize->remaining_seconds) && $prize->remaining_seconds !== null) {
            $scheduled_at_utc = gmdate('Y-m-d\TH:i:s.000\Z', time() + (int)$prize->remaining_seconds);
        }

        return [
            'id' => (string) $prize->id,
            'name' => $prize->name,
            'description' => $prize->description,
            'imageUrl' => $prize->image_url,
            'value' => (float) $prize->value,
            'stock' => (int) $prize->stock,
            'isActive' => (bool) $prize->is_active,
            'currentAds' => (int) $prize->current_ads,
            'goalAds' => (int) $prize->goal_ads,
            'timerStatus' => $prize->timer_status,
            'timerDuration' => (int) $prize->timer_duration,
            'scheduledAt' => $scheduled_at_utc,
            'timerStartedAt' => self::to_utc_iso($prize->timer_started_at),
            'extractedAt' => self::to_utc_iso($prize->extracted_at),
            'publishAt' => self::to_utc_iso($prize->publish_at),
            'createdAt' => self::to_utc_iso($prize->created_at)
        ];
    }

    /**
     * Sync timer status from app (public endpoint for timer sync)
     */
    public function sync_timer_status(WP_REST_Request $request) {
        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $prize_id = $request->get_param('id');
        $timer_status = $request->get_param('timer_status');
        $timer_started_at = $request->get_param('timer_started_at');
        $scheduled_at = $request->get_param('scheduled_at');
        $current_ads = $request->get_param('current_ads');

        // Get prize
        $prize = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_prizes} WHERE id = %d",
            $prize_id
        ));

        if (!$prize) {
            return new WP_Error('not_found', 'Premio non trovato', ['status' => 404]);
        }

        // When starting a countdown, always compute scheduled_at server-side using DATE_ADD(NOW(), ...)
        // to avoid timezone mismatches between app (UTC) and MySQL (server local time)
        if ($timer_status === 'countdown' && $prize->timer_status !== 'countdown') {
            $ads = ($current_ads !== null) ? (int) $current_ads : (int) $prize->current_ads;
            // Compute duration based on prize value (≤25€ = 5 min, >25€ = 12h)
            $prize_value = (float) $prize->value;
            $duration = ($prize_value <= 25) ? 300 : 43200;
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_prizes} SET timer_status = 'countdown', timer_started_at = NOW(), scheduled_at = DATE_ADD(NOW(), INTERVAL %d SECOND), current_ads = %d WHERE id = %d",
                $duration, $ads, $prize_id
            ));

            // Read back the saved scheduled_at for notification scheduling
            $updated = $wpdb->get_row($wpdb->prepare("SELECT scheduled_at FROM {$table_prizes} WHERE id = %d", $prize_id));
            $update_data = ['_done' => true]; // flag to skip the generic update below
        } else {
            // For non-countdown updates, build data normally
            $update_data = ['timer_status' => $timer_status];

            if ($current_ads !== null) {
                $update_data['current_ads'] = (int) $current_ads;
            }
            if ($timer_started_at) {
                $update_data['timer_started_at'] = wp_date('Y-m-d H:i:s', strtotime($timer_started_at));
            }
            if ($scheduled_at) {
                $update_data['scheduled_at'] = wp_date('Y-m-d H:i:s', strtotime($scheduled_at));
            }

            // If completing, set extracted_at
            if ($timer_status === 'completed' && !$prize->extracted_at) {
                $update_data['extracted_at'] = current_time('mysql');
            }

            $wpdb->update($table_prizes, $update_data, ['id' => $prize_id]);
        }

        // Send "extraction imminent" notification if timer just started
        if ($timer_status === 'countdown' && $prize->timer_status !== 'countdown') {
            // Get the actual scheduled_at from DB (reliable after direct MySQL update)
            $actual_scheduled_at = isset($updated->scheduled_at) ? $updated->scheduled_at : (isset($update_data['scheduled_at']) ? $update_data['scheduled_at'] : $prize->scheduled_at);
            if ($actual_scheduled_at) {
                $remaining_min = max(1, intval((strtotime($actual_scheduled_at) - time()) / 60));
                if ($remaining_min <= 10) {
                    $transient_key = 'rafflemania_reminder_' . $prize->id;
                    if (!get_transient($transient_key)) {
                        \RaffleMania\NotificationHelper::notify_extraction_soon($prize->name, $remaining_min);
                        set_transient($transient_key, 1, 600);
                    }
                }

                // Schedule a one-time extraction event for the exact moment the timer expires.
                // This ensures extraction happens even without WP-Cron traffic or external cron.
                $extraction_time = strtotime($actual_scheduled_at);
                $hook = 'rafflemania_check_extractions';
                // Schedule at expiry + 5 seconds buffer
                if ($extraction_time > time()) {
                    wp_schedule_single_event($extraction_time + 5, $hook);
                    // Also schedule a self-ping to trigger WP-Cron at that time
                    wp_schedule_single_event($extraction_time + 10, 'rafflemania_self_ping');
                }
            }
        }

        // Get updated prize
        $updated_prize = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_prizes} WHERE id = %d",
            $prize_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Timer synced successfully',
            'data' => [
                'prize' => $this->format_prize($updated_prize)
            ]
        ]);
    }

    /**
     * Get app settings (XP rewards, credits config)
     */
    public function get_app_settings(WP_REST_Request $request) {
        return new WP_REST_Response([
            'success' => true,
            'data' => $this->get_settings_data()
        ], 200);
    }
}

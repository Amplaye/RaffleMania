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
            "SELECT * FROM {$table_prizes} {$where} {$order_sql}"
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
        $user_id = $request->get_attribute('user_id');

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
        if ($new_count >= $prize->goal_ads && $prize->timer_status === 'waiting') {
            $update_data['timer_status'] = 'countdown';
            $update_data['timer_started_at'] = current_time('mysql');
            $update_data['scheduled_at'] = date('Y-m-d H:i:s', strtotime('+' . $prize->timer_duration . ' seconds'));

            // Send "extraction imminent" notification
            $scheduled_time = strtotime($update_data['scheduled_at']);
            $remaining_min = max(1, intval(($scheduled_time - time()) / 60));
            if ($remaining_min <= 10) {
                // Timer is short (≤10 min) - notify immediately
                $transient_key = 'rafflemania_reminder_' . $prize->id;
                if (!get_transient($transient_key)) {
                    \RaffleMania\NotificationHelper::notify_extraction_soon($prize->name, $remaining_min);
                    set_transient($transient_key, 1, 600);
                }
            }
        }

        $wpdb->update($table_prizes, $update_data, ['id' => $prize_id]);

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
            "SELECT id, timer_status, scheduled_at, timer_started_at, current_ads, goal_ads FROM {$table_prizes} WHERE id = %d",
            $prize_id
        ));

        if (!$prize) {
            return new WP_Error('not_found', 'Premio non trovato', ['status' => 404]);
        }

        $remaining_seconds = 0;
        if ($prize->timer_status === 'countdown' && $prize->scheduled_at) {
            $scheduled_time = strtotime($prize->scheduled_at);
            $remaining_seconds = max(0, $scheduled_time - time());
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'prizeId' => (int) $prize->id,
                'timerStatus' => $prize->timer_status,
                'scheduledAt' => $prize->scheduled_at,
                'timerStartedAt' => $prize->timer_started_at,
                'remainingSeconds' => $remaining_seconds,
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

        $request->set_attribute('user_id', $payload['user_id']);
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

    private function format_prize($prize) {
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
            'scheduledAt' => $prize->scheduled_at,
            'timerStartedAt' => $prize->timer_started_at,
            'extractedAt' => $prize->extracted_at,
            'publishAt' => $prize->publish_at ?? null,
            'createdAt' => $prize->created_at
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

        // Build update data
        $update_data = ['timer_status' => $timer_status];

        if ($timer_started_at) {
            // Convert ISO format to MySQL format if needed
            $ts = strtotime($timer_started_at);
            $update_data['timer_started_at'] = date('Y-m-d H:i:s', $ts);
        }

        if ($scheduled_at) {
            $ts = strtotime($scheduled_at);
            $update_data['scheduled_at'] = date('Y-m-d H:i:s', $ts);
        }

        if ($current_ads !== null) {
            $update_data['current_ads'] = (int) $current_ads;
        }

        // If starting countdown, ensure timer_started_at is set
        if ($timer_status === 'countdown' && !isset($update_data['timer_started_at']) && !$prize->timer_started_at) {
            $update_data['timer_started_at'] = current_time('mysql');
        }

        // If starting countdown without scheduled_at, calculate from timer_duration
        if ($timer_status === 'countdown' && !isset($update_data['scheduled_at']) && !$prize->scheduled_at) {
            $start_time = isset($update_data['timer_started_at'])
                ? strtotime($update_data['timer_started_at'])
                : time();
            $update_data['scheduled_at'] = date('Y-m-d H:i:s', $start_time + $prize->timer_duration);
        }

        // If completing, set extracted_at
        if ($timer_status === 'completed' && !$prize->extracted_at) {
            $update_data['extracted_at'] = current_time('mysql');
        }

        $wpdb->update($table_prizes, $update_data, ['id' => $prize_id]);

        // Send "extraction imminent" notification if timer just started
        if ($timer_status === 'countdown' && $prize->timer_status !== 'countdown') {
            // Get the actual scheduled_at (from update or from DB)
            $actual_scheduled_at = isset($update_data['scheduled_at']) ? $update_data['scheduled_at'] : $prize->scheduled_at;
            if ($actual_scheduled_at) {
                $remaining_min = max(1, intval((strtotime($actual_scheduled_at) - time()) / 60));
                if ($remaining_min <= 10) {
                    $transient_key = 'rafflemania_reminder_' . $prize->id;
                    if (!get_transient($transient_key)) {
                        \RaffleMania\NotificationHelper::notify_extraction_soon($prize->name, $remaining_min);
                        set_transient($transient_key, 1, 600);
                    }
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

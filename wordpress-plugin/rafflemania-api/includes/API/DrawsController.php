<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Draws API Controller
 */
class DrawsController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'draws';

    public function register_routes() {
        // Get all draws
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_draws'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Get draws for a prize
        register_rest_route($this->namespace, '/' . $this->rest_base . '/prize/(?P<prize_id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_draws_for_prize'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Get single draw
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_draw'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Get draw result
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)/result', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_draw_result'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Simulate extraction (for user - checks if they won)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)/check-result', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'check_user_result'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Create a draw (extraction) - called from app when timer expires
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'POST',
                'callback' => [$this, 'create_draw'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'prize_id' => [
                        'required' => true,
                        'type' => 'integer'
                    ],
                    'winning_number' => [
                        'required' => false,
                        'type' => 'integer'
                    ],
                    'user_ticket_id' => [
                        'required' => false,
                        'type' => 'string'
                    ],
                    'timer_started_at' => [
                        'required' => false,
                        'type' => 'string',
                        'description' => 'ISO timestamp when timer started (fallback)'
                    ]
                ]
            ]
        ]);

        // Track extraction stats - simpler endpoint for debug/testing
        register_rest_route($this->namespace, '/' . $this->rest_base . '/track-stats', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'track_extraction_stats'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'is_winner' => [
                        'required' => false,
                        'type' => 'boolean',
                        'default' => false
                    ]
                ]
            ]
        ]);

        // Debug: check DB state (no auth) - REMOVE IN PRODUCTION
        register_rest_route($this->namespace, '/' . $this->rest_base . '/debug-db', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'debug_db_state'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Public test endpoint (no auth required) - for debugging
        register_rest_route($this->namespace, '/' . $this->rest_base . '/track-stats-test', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'track_extraction_stats_test'],
                'permission_callback' => '__return_true',
                'args' => [
                    'is_winner' => [
                        'required' => false,
                        'type' => 'boolean',
                        'default' => false
                    ]
                ]
            ]
        ]);
    }

    public function get_draws(WP_REST_Request $request) {
        global $wpdb;
        $table_draws = $wpdb->prefix . 'rafflemania_draws';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $limit = $request->get_param('limit') ?: 20;
        $status = $request->get_param('status');

        $where = "1=1";
        $params = [];

        if ($status) {
            $where .= " AND d.status = %s";
            $params[] = $status;
        }

        $query = "SELECT d.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value
                  FROM {$table_draws} d
                  LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
                  WHERE {$where}
                  ORDER BY d.extracted_at DESC
                  LIMIT %d";
        $params[] = $limit;

        $draws = $wpdb->get_results($wpdb->prepare($query, ...$params));

        $formatted = array_map([$this, 'format_draw'], $draws);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'draws' => $formatted,
                'total' => count($formatted)
            ]
        ]);
    }

    public function get_draws_for_prize(WP_REST_Request $request) {
        global $wpdb;
        $table_draws = $wpdb->prefix . 'rafflemania_draws';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $prize_id = $request->get_param('prize_id');
        $limit = $request->get_param('limit') ?: 10;

        $draws = $wpdb->get_results($wpdb->prepare(
            "SELECT d.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value
             FROM {$table_draws} d
             LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
             WHERE d.prize_id = %d
             ORDER BY d.extracted_at DESC
             LIMIT %d",
            $prize_id,
            $limit
        ));

        $formatted = array_map([$this, 'format_draw'], $draws);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'draws' => $formatted,
                'total' => count($formatted)
            ]
        ]);
    }

    public function get_draw(WP_REST_Request $request) {
        global $wpdb;
        $table_draws = $wpdb->prefix . 'rafflemania_draws';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $id = $request->get_param('id');

        $draw = $wpdb->get_row($wpdb->prepare(
            "SELECT d.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value
             FROM {$table_draws} d
             LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
             WHERE d.id = %d",
            $id
        ));

        if (!$draw) {
            return new WP_Error('not_found', 'Estrazione non trovata', ['status' => 404]);
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'draw' => $this->format_draw($draw)
            ]
        ]);
    }

    public function get_draw_result(WP_REST_Request $request) {
        global $wpdb;
        $table_draws = $wpdb->prefix . 'rafflemania_draws';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $id = $request->get_param('id');

        $draw = $wpdb->get_row($wpdb->prepare(
            "SELECT d.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
                    u.username as winner_username, u.avatar_url as winner_avatar
             FROM {$table_draws} d
             LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
             LEFT JOIN {$table_users} u ON d.winner_user_id = u.id
             WHERE d.id = %d",
            $id
        ));

        if (!$draw) {
            return new WP_Error('not_found', 'Estrazione non trovata', ['status' => 404]);
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'draw' => $this->format_draw($draw),
                'winningNumber' => (int) $draw->winning_number,
                'hasWinner' => !empty($draw->winner_user_id),
                'winner' => $draw->winner_user_id ? [
                    'username' => $draw->winner_username,
                    'avatarUrl' => $draw->winner_avatar
                ] : null
            ]
        ]);
    }

    public function check_user_result(WP_REST_Request $request) {
        global $wpdb;
        $table_draws = $wpdb->prefix . 'rafflemania_draws';
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $user_id = $request->get_attribute('user_id');
        $draw_id = $request->get_param('id');

        // Get draw
        $draw = $wpdb->get_row($wpdb->prepare(
            "SELECT d.*, p.name as prize_name, p.image_url as prize_image
             FROM {$table_draws} d
             LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
             WHERE d.id = %d",
            $draw_id
        ));

        if (!$draw) {
            return new WP_Error('not_found', 'Estrazione non trovata', ['status' => 404]);
        }

        // Get user's tickets for this draw
        $user_tickets = $wpdb->get_results($wpdb->prepare(
            "SELECT ticket_number, is_winner FROM {$table_tickets}
             WHERE user_id = %d AND prize_id = %d",
            $user_id,
            $draw->prize_id
        ));

        $user_numbers = array_column($user_tickets, 'ticket_number');
        $is_winner = (int) $draw->winner_user_id === (int) $user_id;

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'isWinner' => $is_winner,
                'winningNumber' => (int) $draw->winning_number,
                'userNumbers' => array_map('intval', $user_numbers),
                'prizeName' => $draw->prize_name,
                'prizeImage' => $draw->prize_image,
                'draw' => $this->format_draw($draw)
            ]
        ]);
    }

    public function create_draw(WP_REST_Request $request) {
        global $wpdb;
        $table_draws = $wpdb->prefix . 'rafflemania_draws';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_winners = $wpdb->prefix . 'rafflemania_winners';
        $table_users = $wpdb->prefix . 'rafflemania_users';

        try {
        $user_id = $request->get_attribute('user_id');
        $prize_id = $request->get_param('prize_id');
        $winning_number = $request->get_param('winning_number');
        $user_ticket_id = $request->get_param('user_ticket_id');
        $app_timer_started_at = $request->get_param('timer_started_at');

        // Get prize
        $prize = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_prizes} WHERE id = %d",
            $prize_id
        ));

        if (!$prize) {
            return new WP_Error('prize_not_found', 'Premio non trovato', ['status' => 404]);
        }

        // CRITICAL: Check if a draw already exists for this prize (created in last 10 min)
        // This ensures ALL devices get the same winning number regardless of draw_id differences
        $recent_draw = $wpdb->get_row($wpdb->prepare(
            "SELECT d.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value
             FROM {$table_draws} d
             LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
             WHERE d.prize_id = %d AND d.extracted_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
             ORDER BY d.extracted_at DESC LIMIT 1",
            $prize_id
        ));

        if ($recent_draw) {
            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'draw' => $this->format_draw($recent_draw),
                    'already_exists' => true
                ]
            ]);
        }

        // Use app-provided timer_started_at if DB doesn't have it
        $timer_started_at = $prize->timer_started_at;
        if (!$timer_started_at && $app_timer_started_at) {
            // Convert ISO format to MySQL format
            $ts = strtotime($app_timer_started_at);
            $timer_started_at = date('Y-m-d H:i:s', $ts);

            // Also update the prize in DB with timer data
            $wpdb->update($table_prizes, [
                'timer_status' => 'completed',
                'timer_started_at' => $timer_started_at,
                'extracted_at' => current_time('mysql')
            ], ['id' => $prize_id]);
        }

        // Generate draw_id - add microseconds to ensure uniqueness
        $timestamp_part = str_replace(['-', ':', ' '], '', substr($timer_started_at ?: current_time('mysql'), 0, 19));
        $draw_id = 'draw_' . $prize_id . '_' . $timestamp_part;

        // Double-check by draw_id too
        $existing_draw = $wpdb->get_row($wpdb->prepare(
            "SELECT d.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value
             FROM {$table_draws} d
             LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
             WHERE d.draw_id = %s",
            $draw_id
        ));

        if ($existing_draw) {
            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'draw' => $this->format_draw($existing_draw),
                    'already_exists' => true
                ]
            ]);
        }

        // Get total tickets for this prize
        $total_tickets = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table_tickets} WHERE prize_id = %d AND status = 'active'",
            $prize_id
        ));

        // If no winning_number provided, pick one randomly from existing active tickets
        if (!$winning_number || $winning_number <= 0) {
            $random_ticket = $wpdb->get_row($wpdb->prepare(
                "SELECT ticket_number FROM {$table_tickets} WHERE prize_id = %d AND status = 'active' ORDER BY RAND() LIMIT 1",
                $prize_id
            ));
            if ($random_ticket) {
                $winning_number = (int) $random_ticket->ticket_number;
            } else {
                // No active tickets exist - return error instead of fake number
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Nessun biglietto attivo per questo premio',
                    'data' => [
                        'draw' => [
                            'id' => '0',
                            'drawId' => $draw_id,
                            'prizeId' => (string) $prize_id,
                            'prizeName' => $prize->name,
                            'prizeImage' => $prize->image_url,
                            'prizeValue' => (float) $prize->value,
                            'winningNumber' => 0,
                            'winnerUserId' => null,
                            'totalTickets' => 0,
                            'status' => 'no_tickets',
                            'extractedAt' => current_time('mysql'),
                            'createdAt' => current_time('mysql')
                        ],
                        'no_tickets' => true
                    ]
                ]);
            }
        }

        // Find winner ticket
        $winner_ticket = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_tickets} WHERE prize_id = %d AND ticket_number = %d AND status = 'active'",
            $prize_id,
            $winning_number
        ));

        $winner_user_id = $winner_ticket ? $winner_ticket->user_id : null;
        $winner_ticket_id = $winner_ticket ? $winner_ticket->id : null;

        // Create draw
        $insert_result = $wpdb->insert($table_draws, [
            'draw_id' => $draw_id,
            'prize_id' => $prize_id,
            'winning_number' => $winning_number,
            'winner_user_id' => $winner_user_id,
            'winner_ticket_id' => $winner_ticket_id,
            'total_tickets' => $total_tickets,
            'status' => 'completed',
            'extracted_at' => current_time('mysql')
        ]);

        if ($insert_result === false) {
            // If insert fails due to duplicate draw_id, try to fetch the existing one
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT d.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value
                 FROM {$table_draws} d
                 LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
                 WHERE d.draw_id = %s",
                $draw_id
            ));
            if ($existing) {
                return new WP_REST_Response([
                    'success' => true,
                    'data' => [
                        'draw' => $this->format_draw($existing),
                        'already_exists' => true
                    ]
                ]);
            }
            return new WP_Error('draw_insert_failed', 'Impossibile creare estrazione: ' . $wpdb->last_error, ['status' => 500]);
        }

        $draw_db_id = $wpdb->insert_id;

        // Track daily draw stat
        $this->track_daily_stat('draws_made');

        // Update prize status
        $wpdb->update($table_prizes, [
            'timer_status' => 'completed',
            'extracted_at' => current_time('mysql')
        ], ['id' => $prize_id]);

        // Mark all tickets for this prize as used
        $wpdb->update($table_tickets, ['status' => 'used'], ['prize_id' => $prize_id, 'status' => 'active']);

        // If there's a winner, create winner record and mark ticket as winner
        if ($winner_ticket) {
            $wpdb->update($table_tickets, [
                'status' => 'winner',
                'is_winner' => 1
            ], ['id' => $winner_ticket->id]);

            // Create winner record
            $wpdb->insert($table_winners, [
                'user_id' => $winner_user_id,
                'prize_id' => $prize_id,
                'draw_id' => $draw_db_id,
                'ticket_id' => $winner_ticket->id
            ]);

            // Track daily winner stat
            $this->track_daily_stat('winners');

            // Get winner info for response
            $winner = $wpdb->get_row($wpdb->prepare(
                "SELECT username, avatar_url FROM {$table_users} WHERE id = %d",
                $winner_user_id
            ));
        }

        // Get created draw
        $draw = $wpdb->get_row($wpdb->prepare(
            "SELECT d.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value
             FROM {$table_draws} d
             LEFT JOIN {$table_prizes} p ON d.prize_id = p.id
             WHERE d.id = %d",
            $draw_db_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'draw' => $this->format_draw($draw),
                'hasWinner' => !empty($winner_user_id),
                'winner' => $winner_user_id ? [
                    'userId' => (string) $winner_user_id,
                    'username' => $winner->username ?? 'Utente',
                    'avatarUrl' => $winner->avatar_url ?? null
                ] : null
            ]
        ], 201);

        } catch (\Exception $e) {
            return new WP_Error('draw_error', 'Errore estrazione: ' . $e->getMessage(), ['status' => 500]);
        }
    }

    public function debug_db_state(WP_REST_Request $request) {
        global $wpdb;
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_draws = $wpdb->prefix . 'rafflemania_draws';

        $ticket_stats = $wpdb->get_results(
            "SELECT prize_id, status, COUNT(*) as cnt FROM {$table_tickets} GROUP BY prize_id, status ORDER BY prize_id DESC LIMIT 30"
        );
        $users = $wpdb->get_results(
            "SELECT id, username, credits, level FROM {$table_users} LIMIT 10"
        );
        $recent_draws = $wpdb->get_results(
            "SELECT id, draw_id, prize_id, winning_number, total_tickets, status, extracted_at FROM {$table_draws} ORDER BY id DESC LIMIT 5"
        );

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'ticket_stats' => $ticket_stats,
                'users' => $users,
                'recent_draws' => $recent_draws
            ]
        ]);
    }

    public function check_auth(WP_REST_Request $request) {
        $auth_header = $request->get_header('Authorization');

        if (!$auth_header || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            return false;
        }

        $token = $matches[1];
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

        $signature = base64_decode(strtr($base64_signature, '-_', '+/'));
        $expected_signature = hash_hmac('sha256', $base64_header . '.' . $base64_payload, $secret, true);

        if (!hash_equals($signature, $expected_signature)) {
            return new WP_Error('invalid_signature', 'Firma non valida', ['status' => 401]);
        }

        $payload = json_decode(base64_decode(strtr($base64_payload, '-_', '+/')), true);

        if ($payload['exp'] < time()) {
            return new WP_Error('token_expired', 'Token scaduto', ['status' => 401]);
        }

        return $payload;
    }

    public function track_extraction_stats(WP_REST_Request $request) {
        $is_winner = $request->get_param('is_winner');

        // Always track the draw
        $this->track_daily_stat('draws_made');

        // Track winner if applicable
        if ($is_winner) {
            $this->track_daily_stat('winners');
        }

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Stats tracked successfully',
            'data' => [
                'draws_tracked' => true,
                'winner_tracked' => $is_winner
            ]
        ]);
    }

    // Public test endpoint (no auth) - for debugging only
    public function track_extraction_stats_test(WP_REST_Request $request) {
        $is_winner = $request->get_param('is_winner');

        // Always track the draw
        $this->track_daily_stat('draws_made');

        // Track winner if applicable
        if ($is_winner) {
            $this->track_daily_stat('winners');
        }

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Stats tracked (TEST endpoint)',
            'data' => [
                'draws_tracked' => true,
                'winner_tracked' => $is_winner
            ]
        ]);
    }

    private function format_draw($draw) {
        return [
            'id' => (string) $draw->id,
            'drawId' => $draw->draw_id,
            'prizeId' => (string) $draw->prize_id,
            'prizeName' => $draw->prize_name ?? null,
            'prizeImage' => $draw->prize_image ?? null,
            'prizeValue' => isset($draw->prize_value) ? (float) $draw->prize_value : null,
            'winningNumber' => (int) $draw->winning_number,
            'winnerUserId' => $draw->winner_user_id ? (string) $draw->winner_user_id : null,
            'totalTickets' => (int) $draw->total_tickets,
            'status' => $draw->status,
            'extractedAt' => $draw->extracted_at,
            'createdAt' => $draw->created_at
        ];
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
}

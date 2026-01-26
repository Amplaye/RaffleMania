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
}

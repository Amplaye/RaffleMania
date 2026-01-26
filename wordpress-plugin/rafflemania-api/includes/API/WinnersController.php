<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Winners API Controller
 */
class WinnersController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'winners';

    public function register_routes() {
        // Get recent winners
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_winners'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Get winners for a prize
        register_rest_route($this->namespace, '/' . $this->rest_base . '/prize/(?P<prize_id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_winners_for_prize'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Claim prize
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)/claim', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'claim_prize'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'shipping_address' => [
                        'required' => true,
                        'type' => 'object'
                    ]
                ]
            ]
        ]);
    }

    public function get_winners(WP_REST_Request $request) {
        global $wpdb;
        $table_winners = $wpdb->prefix . 'rafflemania_winners';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $limit = $request->get_param('limit') ?: 20;

        $winners = $wpdb->get_results($wpdb->prepare(
            "SELECT w.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
                    u.username, u.avatar_url, u.avatar_color
             FROM {$table_winners} w
             LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
             LEFT JOIN {$table_users} u ON w.user_id = u.id
             ORDER BY w.won_at DESC
             LIMIT %d",
            $limit
        ));

        $formatted = array_map([$this, 'format_winner'], $winners);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'winners' => $formatted,
                'total' => count($formatted)
            ]
        ]);
    }

    public function get_winners_for_prize(WP_REST_Request $request) {
        global $wpdb;
        $table_winners = $wpdb->prefix . 'rafflemania_winners';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $prize_id = $request->get_param('prize_id');
        $limit = $request->get_param('limit') ?: 10;

        $winners = $wpdb->get_results($wpdb->prepare(
            "SELECT w.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
                    u.username, u.avatar_url, u.avatar_color
             FROM {$table_winners} w
             LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
             LEFT JOIN {$table_users} u ON w.user_id = u.id
             WHERE w.prize_id = %d
             ORDER BY w.won_at DESC
             LIMIT %d",
            $prize_id,
            $limit
        ));

        $formatted = array_map([$this, 'format_winner'], $winners);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'winners' => $formatted,
                'total' => count($formatted)
            ]
        ]);
    }

    public function claim_prize(WP_REST_Request $request) {
        global $wpdb;
        $table_winners = $wpdb->prefix . 'rafflemania_winners';

        $user_id = $request->get_attribute('user_id');
        $winner_id = $request->get_param('id');
        $shipping_address = $request->get_param('shipping_address');

        // Check if winner exists and belongs to user
        $winner = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_winners} WHERE id = %d AND user_id = %d",
            $winner_id,
            $user_id
        ));

        if (!$winner) {
            return new WP_Error('not_found', 'Vincita non trovata', ['status' => 404]);
        }

        if ($winner->claimed) {
            return new WP_Error('already_claimed', 'Premio già riscosso', ['status' => 400]);
        }

        // Validate address
        $required_fields = ['fullName', 'address', 'city', 'postalCode', 'country'];
        foreach ($required_fields as $field) {
            if (empty($shipping_address[$field])) {
                return new WP_Error('invalid_address', "Campo '{$field}' mancante", ['status' => 400]);
            }
        }

        // Update winner record
        $wpdb->update($table_winners, [
            'claimed' => 1,
            'claimed_at' => current_time('mysql'),
            'shipping_address' => json_encode($shipping_address)
        ], ['id' => $winner_id]);

        // Send notification to admin
        $admin_email = get_option('admin_email');
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $prize = $wpdb->get_row($wpdb->prepare(
            "SELECT name FROM {$table_prizes} WHERE id = %d",
            $winner->prize_id
        ));

        wp_mail(
            $admin_email,
            'RaffleMania - Nuovo premio da spedire',
            "Un utente ha riscosso un premio!\n\n" .
            "Premio: {$prize->name}\n" .
            "Indirizzo:\n" .
            "{$shipping_address['fullName']}\n" .
            "{$shipping_address['address']}\n" .
            "{$shipping_address['postalCode']} {$shipping_address['city']}\n" .
            "{$shipping_address['country']}\n" .
            (isset($shipping_address['phone']) ? "Tel: {$shipping_address['phone']}" : '')
        );

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Premio riscosso con successo! Riceverai il premio all\'indirizzo indicato.'
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

    private function format_winner($winner) {
        return [
            'id' => (int) $winner->id,
            'userId' => (string) $winner->user_id,
            'username' => $winner->username,
            'avatarUrl' => $winner->avatar_url,
            'avatarColor' => $winner->avatar_color,
            'prizeId' => (string) $winner->prize_id,
            'prizeName' => $winner->prize_name,
            'prizeImage' => $winner->prize_image,
            'prizeValue' => (float) $winner->prize_value,
            'claimed' => (bool) $winner->claimed,
            'claimedAt' => $winner->claimed_at,
            'wonAt' => $winner->won_at
        ];
    }
}

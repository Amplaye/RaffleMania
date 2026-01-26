<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Tickets API Controller
 */
class TicketsController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'tickets';

    public function register_routes() {
        // Get user's tickets
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_tickets'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Create ticket (after watching ad or using credits)
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'POST',
                'callback' => [$this, 'create_ticket'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'prize_id' => [
                        'required' => true,
                        'type' => 'integer'
                    ],
                    'source' => [
                        'required' => false,
                        'type' => 'string',
                        'default' => 'ad',
                        'enum' => ['ad', 'credits', 'referral', 'bonus']
                    ]
                ]
            ]
        ]);

        // Get tickets for a specific prize
        register_rest_route($this->namespace, '/' . $this->rest_base . '/prize/(?P<prize_id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_tickets_for_prize'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Get single ticket
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_ticket'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Get total pool tickets for prize
        register_rest_route($this->namespace, '/' . $this->rest_base . '/pool/(?P<prize_id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_pool_tickets'],
                'permission_callback' => '__return_true'
            ]
        ]);
    }

    public function get_tickets(WP_REST_Request $request) {
        global $wpdb;
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $user_id = $request->get_attribute('user_id');
        $status = $request->get_param('status');

        $where = "t.user_id = %d";
        $params = [$user_id];

        if ($status) {
            $where .= " AND t.status = %s";
            $params[] = $status;
        }

        $tickets = $wpdb->get_results($wpdb->prepare(
            "SELECT t.*, p.name as prize_name, p.image_url as prize_image
             FROM {$table_tickets} t
             LEFT JOIN {$table_prizes} p ON t.prize_id = p.id
             WHERE {$where}
             ORDER BY t.created_at DESC",
            ...$params
        ));

        $formatted = array_map([$this, 'format_ticket'], $tickets);

        // Group by status
        $active = array_filter($formatted, fn($t) => $t['status'] === 'active');
        $used = array_filter($formatted, fn($t) => $t['status'] === 'used');
        $winners = array_filter($formatted, fn($t) => $t['status'] === 'winner');

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'tickets' => array_values($formatted),
                'active' => array_values($active),
                'used' => array_values($used),
                'winners' => array_values($winners),
                'total' => count($formatted)
            ]
        ]);
    }

    public function create_ticket(WP_REST_Request $request) {
        global $wpdb;
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $user_id = $request->get_attribute('user_id');
        $prize_id = $request->get_param('prize_id');
        $source = $request->get_param('source') ?: 'ad';

        // Check prize exists and is active
        $prize = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_prizes} WHERE id = %d AND is_active = 1",
            $prize_id
        ));

        if (!$prize) {
            return new WP_Error('prize_not_found', 'Premio non trovato o non attivo', ['status' => 404]);
        }

        // If using credits, check and deduct
        if ($source === 'credits') {
            $user = $wpdb->get_row($wpdb->prepare(
                "SELECT credits FROM {$table_users} WHERE id = %d",
                $user_id
            ));

            $credit_cost = 5; // Cost per ticket in credits
            if ($user->credits < $credit_cost) {
                return new WP_Error('insufficient_credits', 'Crediti insufficienti', ['status' => 400]);
            }

            // Deduct credits
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_users} SET credits = credits - %d WHERE id = %d",
                $credit_cost,
                $user_id
            ));

            // Record transaction
            $table_transactions = $wpdb->prefix . 'rafflemania_transactions';
            $wpdb->insert($table_transactions, [
                'user_id' => $user_id,
                'type' => 'spend',
                'amount' => -$credit_cost,
                'description' => 'Biglietto per ' . $prize->name,
                'reference_id' => 'prize_' . $prize_id
            ]);
        }

        // Generate ticket number (unique per prize draw)
        $draw_id = $prize->timer_started_at
            ? 'draw_' . $prize_id . '_' . str_replace(['-', ':', ' '], '', substr($prize->timer_started_at, 0, 19))
            : 'draw_' . $prize_id . '_pending';

        // Get next ticket number for this prize
        $max_number = $wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(MAX(ticket_number), 0) FROM {$table_tickets} WHERE prize_id = %d",
            $prize_id
        ));
        $ticket_number = $max_number + 1;

        // Create ticket
        $result = $wpdb->insert($table_tickets, [
            'user_id' => $user_id,
            'prize_id' => $prize_id,
            'draw_id' => $draw_id,
            'ticket_number' => $ticket_number,
            'source' => $source,
            'status' => 'active'
        ]);

        if (!$result) {
            return new WP_Error('ticket_creation_failed', 'Impossibile creare il biglietto', ['status' => 500]);
        }

        $ticket_id = $wpdb->insert_id;

        // Get created ticket with prize info
        $ticket = $wpdb->get_row($wpdb->prepare(
            "SELECT t.*, p.name as prize_name, p.image_url as prize_image
             FROM {$table_tickets} t
             LEFT JOIN {$table_prizes} p ON t.prize_id = p.id
             WHERE t.id = %d",
            $ticket_id
        ));

        // Get all user numbers for this prize
        $user_numbers = $wpdb->get_col($wpdb->prepare(
            "SELECT ticket_number FROM {$table_tickets} WHERE user_id = %d AND prize_id = %d AND status = 'active'",
            $user_id,
            $prize_id
        ));

        // Get total pool tickets
        $total_pool = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table_tickets} WHERE prize_id = %d AND status = 'active'",
            $prize_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'ticket' => $this->format_ticket($ticket),
                'userNumbers' => array_map('intval', $user_numbers),
                'totalPoolTickets' => (int) $total_pool
            ]
        ], 201);
    }

    public function get_tickets_for_prize(WP_REST_Request $request) {
        global $wpdb;
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $user_id = $request->get_attribute('user_id');
        $prize_id = $request->get_param('prize_id');

        $tickets = $wpdb->get_results($wpdb->prepare(
            "SELECT t.*, p.name as prize_name, p.image_url as prize_image
             FROM {$table_tickets} t
             LEFT JOIN {$table_prizes} p ON t.prize_id = p.id
             WHERE t.user_id = %d AND t.prize_id = %d
             ORDER BY t.created_at DESC",
            $user_id,
            $prize_id
        ));

        $formatted = array_map([$this, 'format_ticket'], $tickets);
        $numbers = array_column($formatted, 'ticketNumber');

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'tickets' => $formatted,
                'numbers' => $numbers,
                'total' => count($formatted)
            ]
        ]);
    }

    public function get_ticket(WP_REST_Request $request) {
        global $wpdb;
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $user_id = $request->get_attribute('user_id');
        $ticket_id = $request->get_param('id');

        $ticket = $wpdb->get_row($wpdb->prepare(
            "SELECT t.*, p.name as prize_name, p.image_url as prize_image
             FROM {$table_tickets} t
             LEFT JOIN {$table_prizes} p ON t.prize_id = p.id
             WHERE t.id = %d AND t.user_id = %d",
            $ticket_id,
            $user_id
        ));

        if (!$ticket) {
            return new WP_Error('not_found', 'Biglietto non trovato', ['status' => 404]);
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'ticket' => $this->format_ticket($ticket)
            ]
        ]);
    }

    public function get_pool_tickets(WP_REST_Request $request) {
        global $wpdb;
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';

        $prize_id = $request->get_param('prize_id');

        $total = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table_tickets} WHERE prize_id = %d AND status = 'active'",
            $prize_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'prizeId' => (int) $prize_id,
                'totalTickets' => (int) $total
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

    private function format_ticket($ticket) {
        return [
            'id' => (string) $ticket->id,
            'ticketNumber' => (int) $ticket->ticket_number,
            'prizeId' => (string) $ticket->prize_id,
            'prizeName' => $ticket->prize_name ?? null,
            'prizeImage' => $ticket->prize_image ?? null,
            'drawId' => $ticket->draw_id,
            'source' => $ticket->source,
            'status' => $ticket->status,
            'isWinner' => (bool) $ticket->is_winner,
            'createdAt' => $ticket->created_at
        ];
    }
}

<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Prizes API Controller
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
    }

    public function get_prizes(WP_REST_Request $request) {
        global $wpdb;
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $active_only = $request->get_param('active') !== 'false';

        $where = $active_only ? 'WHERE is_active = 1' : '';

        $prizes = $wpdb->get_results(
            "SELECT * FROM {$table_prizes} {$where} ORDER BY created_at DESC"
        );

        $formatted = array_map([$this, 'format_prize'], $prizes);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'prizes' => $formatted,
                'total' => count($formatted)
            ]
        ]);
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
            'createdAt' => $prize->created_at
        ];
    }
}

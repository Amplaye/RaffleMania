<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use RaffleMania\NotificationHelper;

/**
 * Notification API Controller - Admin push notification management
 */
class NotificationController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'notifications';

    public function register_routes() {
        // POST /notifications/broadcast (admin-only)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/broadcast', [
            ['methods' => 'POST', 'callback' => [$this, 'broadcast'], 'permission_callback' => [$this, 'check_admin']]
        ]);

        // POST /notifications/schedule-ad-ready (user-authenticated)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/schedule-ad-ready', [
            ['methods' => 'POST', 'callback' => [$this, 'schedule_ad_ready'], 'permission_callback' => [$this, 'check_user_auth']]
        ]);
    }

    public function check_admin(WP_REST_Request $request) {
        // Check X-Admin-Key header
        $admin_key = $request->get_header('X-Admin-Key');
        $stored_key = get_option('rafflemania_admin_api_key', '');
        if (!empty($stored_key) && $admin_key === $stored_key) {
            return true;
        }
        return current_user_can('manage_options');
    }

    /**
     * Check user auth via JWT Bearer token
     */
    public function check_user_auth(WP_REST_Request $request) {
        $auth_header = $request->get_header('Authorization');
        if (!$auth_header || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            return false;
        }
        $token = $matches[1];
        $secret = get_option('rafflemania_jwt_secret');
        if (!$secret) return false;

        $parts = explode('.', $token);
        if (count($parts) !== 3) return false;

        $payload_json = base64_decode(strtr($parts[1], '-_', '+/'));
        $payload = json_decode($payload_json, true);
        if (!$payload || empty($payload['user_id'])) return false;

        // Verify signature
        $header_payload = $parts[0] . '.' . $parts[1];
        $expected_sig = rtrim(strtr(base64_encode(hash_hmac('sha256', $header_payload, $secret, true)), '+/', '-_'), '=');
        if (!hash_equals($expected_sig, $parts[2])) return false;

        $request->set_param('_auth_user_id', $payload['user_id']);
        return true;
    }

    /**
     * Schedule "ad ready" push notification after cooldown expires
     */
    public function schedule_ad_ready(WP_REST_Request $request) {
        $user_id = $request->get_param('_auth_user_id');

        // Get cooldown minutes from config
        $limits_json = get_option('rafflemania_daily_limits', '');
        $limits = $limits_json ? json_decode($limits_json, true) : null;
        $cooldown_minutes = ($limits && isset($limits['cooldown_minutes'])) ? (int)$limits['cooldown_minutes'] : 20;

        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';

        // Cancel any previously scheduled ad-ready notification for this user
        $option_key = 'rafflemania_ad_notif_' . $user_id;
        $prev_notif_id = get_option($option_key);
        if ($prev_notif_id) {
            NotificationHelper::cancel_notification($prev_notif_id);
            delete_option($option_key);
        }

        $result = NotificationHelper::send_to_user_delayed(
            $user_id,
            'Pubblicita pronta!',
            'Il cooldown e scaduto! Guarda una pubblicita per ottenere un nuovo biglietto.',
            $cooldown_minutes,
            ['type' => 'ad_ready']
        );

        // Store the new notification ID so we can cancel it next time
        if ($result && isset($result['id'])) {
            update_option($option_key, $result['id'], false);
        }

        return new WP_REST_Response([
            'success' => (bool)$result,
            'data' => ['delay_minutes' => $cooldown_minutes],
        ]);
    }

    /**
     * Broadcast push notification
     */
    public function broadcast(WP_REST_Request $request) {
        $title = sanitize_text_field($request->get_param('title'));
        $body = sanitize_textarea_field($request->get_param('body'));
        $target_type = sanitize_text_field($request->get_param('target_type') ?: 'all');
        $target_filter = $request->get_param('target_filter');
        $schedule = $request->get_param('schedule'); // 'now' or datetime string

        if (empty($title) || empty($body)) {
            return new WP_REST_Response(['success' => false, 'message' => 'Titolo e messaggio sono obbligatori'], 400);
        }

        global $wpdb;
        $table_log = $wpdb->prefix . 'rafflemania_notification_log';

        // If scheduled for later
        if ($schedule && $schedule !== 'now') {
            $wpdb->insert($table_log, [
                'title' => $title,
                'body' => $body,
                'target_type' => $target_type,
                'target_filter' => is_array($target_filter) ? json_encode($target_filter) : $target_filter,
                'status' => 'scheduled',
                'scheduled_at' => $schedule,
                'created_by' => get_current_user_id(),
            ]);

            return new WP_REST_Response([
                'success' => true,
                'message' => 'Notifica programmata',
                'data' => ['id' => $wpdb->insert_id, 'scheduled_at' => $schedule]
            ], 200);
        }

        // Send now
        $result = $this->send_notification($title, $body, $target_type, $target_filter);

        $wpdb->insert($table_log, [
            'title' => $title,
            'body' => $body,
            'target_type' => $target_type,
            'target_filter' => is_array($target_filter) ? json_encode($target_filter) : $target_filter,
            'status' => $result ? 'sent' : 'failed',
            'sent_at' => current_time('mysql'),
            'recipients_count' => $result['recipients'] ?? 0,
            'onesignal_response' => json_encode($result),
            'created_by' => get_current_user_id(),
        ]);

        $this->log_admin_action('notification_broadcast', null, [
            'title' => $title,
            'target_type' => $target_type,
        ]);

        return new WP_REST_Response([
            'success' => (bool)$result,
            'message' => $result ? 'Notifica inviata' : 'Errore invio notifica',
            'data' => $result
        ], $result ? 200 : 500);
    }

    /**
     * Send notification based on target type
     */
    private function send_notification($title, $body, $target_type, $target_filter) {
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';

        switch ($target_type) {
            case 'all':
                return NotificationHelper::send_to_all($title, $body);

            case 'level_range':
                $user_ids = $this->get_users_by_level_range($target_filter);
                if (empty($user_ids)) return false;
                return NotificationHelper::send_to_users($user_ids, $title, $body);

            case 'active':
                $user_ids = $this->get_active_users(30);
                if (empty($user_ids)) return false;
                return NotificationHelper::send_to_users($user_ids, $title, $body);

            case 'inactive':
                $user_ids = $this->get_inactive_users(30);
                if (empty($user_ids)) return false;
                return NotificationHelper::send_to_users($user_ids, $title, $body);

            default:
                return NotificationHelper::send_to_all($title, $body);
        }
    }

    private function get_users_by_level_range($filter) {
        global $wpdb;
        $table = $wpdb->prefix . 'rafflemania_users';
        $filter = is_array($filter) ? $filter : json_decode($filter, true);
        $min_level = (int)($filter['min_level'] ?? 0);
        $max_level = (int)($filter['max_level'] ?? 10);

        return $wpdb->get_col($wpdb->prepare(
            "SELECT id FROM {$table} WHERE level >= %d AND level <= %d AND is_active = 1",
            $min_level, $max_level
        ));
    }

    private function get_active_users($days = 30) {
        global $wpdb;
        $table = $wpdb->prefix . 'rafflemania_users';
        return $wpdb->get_col($wpdb->prepare(
            "SELECT id FROM {$table} WHERE is_active = 1 AND updated_at >= DATE_SUB(NOW(), INTERVAL %d DAY)",
            $days
        ));
    }

    private function get_inactive_users($days = 30) {
        global $wpdb;
        $table = $wpdb->prefix . 'rafflemania_users';
        return $wpdb->get_col($wpdb->prepare(
            "SELECT id FROM {$table} WHERE is_active = 1 AND updated_at < DATE_SUB(NOW(), INTERVAL %d DAY)",
            $days
        ));
    }

    private function log_admin_action($action_type, $target_user_id, $details) {
        global $wpdb;
        $wpdb->insert($wpdb->prefix . 'rafflemania_admin_actions_log', [
            'admin_user_id' => get_current_user_id(),
            'action_type' => $action_type,
            'target_user_id' => $target_user_id,
            'details' => json_encode($details),
        ]);
    }

    /**
     * Process scheduled notifications (called by cron)
     */
    public static function process_scheduled() {
        global $wpdb;
        $table_log = $wpdb->prefix . 'rafflemania_notification_log';

        $pending = $wpdb->get_results(
            "SELECT * FROM {$table_log}
             WHERE status = 'scheduled'
             AND scheduled_at <= NOW()"
        );

        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';

        foreach ($pending as $notif) {
            $controller = new self();
            $result = $controller->send_notification(
                $notif->title,
                $notif->body,
                $notif->target_type,
                $notif->target_filter
            );

            $wpdb->update($table_log, [
                'status' => $result ? 'sent' : 'failed',
                'sent_at' => current_time('mysql'),
                'recipients_count' => is_array($result) ? ($result['recipients'] ?? 0) : 0,
                'onesignal_response' => json_encode($result),
            ], ['id' => $notif->id]);
        }
    }
}

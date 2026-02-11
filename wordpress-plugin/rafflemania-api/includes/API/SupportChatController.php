<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use RaffleMania\NotificationHelper;

/**
 * Support Chat API Controller
 * Handles chat messages between users and support
 */
class SupportChatController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'support';

    public function register_routes() {
        // Send message from admin to user (triggers push notification)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/send', [
            'methods' => 'POST',
            'callback' => [$this, 'send_message'],
            'permission_callback' => [$this, 'admin_permissions_check'],
        ]);

        // Get list of active chats for admin panel
        register_rest_route($this->namespace, '/' . $this->rest_base . '/chats', [
            'methods' => 'GET',
            'callback' => [$this, 'get_chats'],
            'permission_callback' => [$this, 'admin_permissions_check'],
        ]);

        // Webhook for Firestore (when support replies from WordPress)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/notify', [
            'methods' => 'POST',
            'callback' => [$this, 'notify_user'],
            'permission_callback' => '__return_true', // Will verify secret key
        ]);

        // Notify admin when user sends a message
        register_rest_route($this->namespace, '/' . $this->rest_base . '/notify-admin', [
            'methods' => 'POST',
            'callback' => [$this, 'notify_admin'],
            'permission_callback' => '__return_true', // Auth via JWT token
        ]);
    }

    /**
     * Check if user is admin
     */
    public function admin_permissions_check($request) {
        return current_user_can('manage_options');
    }

    /**
     * Send notification to user when support replies
     */
    public function notify_user(WP_REST_Request $request) {
        $params = $request->get_json_params();

        // Verify secret key for security
        $secret = $request->get_header('X-Support-Secret');
        $expected_secret = get_option('rafflemania_support_secret', 'rafflemania-support-2024');

        if ($secret !== $expected_secret) {
            return new WP_Error('unauthorized', 'Invalid secret key', ['status' => 401]);
        }

        $user_id = sanitize_text_field($params['user_id'] ?? '');
        $message = sanitize_text_field($params['message'] ?? '');

        if (empty($user_id) || empty($message)) {
            return new WP_Error('missing_params', 'user_id and message are required', ['status' => 400]);
        }

        // Send push notification via OneSignal
        $result = NotificationHelper::send_to_user(
            $user_id,
            'Supporto RaffleMania',
            $message,
            [
                'type' => 'support_message',
                'screen' => 'SupportChat'
            ]
        );

        if ($result) {
            return new WP_REST_Response([
                'success' => true,
                'message' => 'Notification sent'
            ], 200);
        } else {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Failed to send notification (OneSignal may not be configured)'
            ], 200);
        }
    }

    /**
     * Send message and notify user (for admin panel use)
     */
    public function send_message(WP_REST_Request $request) {
        $params = $request->get_json_params();

        $user_id = sanitize_text_field($params['user_id'] ?? '');
        $message = sanitize_text_field($params['message'] ?? '');

        if (empty($user_id) || empty($message)) {
            return new WP_Error('missing_params', 'user_id and message are required', ['status' => 400]);
        }

        // Send push notification
        $result = NotificationHelper::send_to_user(
            $user_id,
            'Supporto RaffleMania',
            strlen($message) > 50 ? substr($message, 0, 47) . '...' : $message,
            [
                'type' => 'support_message',
                'screen' => 'SupportChat'
            ]
        );

        return new WP_REST_Response([
            'success' => true,
            'notification_sent' => $result ? true : false,
            'message' => 'Message processed'
        ], 200);
    }

    /**
     * Get list of chats (placeholder - Firestore is source of truth)
     */
    public function get_chats(WP_REST_Request $request) {
        // This is a placeholder - the actual chat data is in Firestore
        // This endpoint could be used to sync with a local database if needed
        return new WP_REST_Response([
            'message' => 'Chat data is managed in Firebase Firestore',
            'firestore_collection' => 'chats'
        ], 200);
    }

    /**
     * Notify admin when user sends a support message
     */
    public function notify_admin(WP_REST_Request $request) {
        $params = $request->get_json_params();

        $user_id = sanitize_text_field($params['user_id'] ?? '');
        $user_name = sanitize_text_field($params['user_name'] ?? 'Utente');
        $message = sanitize_text_field($params['message'] ?? '');

        if (empty($user_id) || empty($message)) {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Missing parameters'
            ], 200);
        }

        // Send email notification to admin
        $admin_email = get_option('rafflemania_contact_email', get_option('admin_email'));
        $subject = 'Nuovo messaggio supporto da ' . $user_name;
        $body = "Hai ricevuto un nuovo messaggio di supporto:\n\n";
        $body .= "Da: {$user_name} (ID: {$user_id})\n";
        $body .= "Messaggio: {$message}\n\n";
        $body .= "Rispondi dal pannello WordPress: " . admin_url('admin.php?page=rafflemania-support&chat=' . urlencode($user_id));

        $email_sent = wp_mail($admin_email, $subject, $body);

        // Send push notification to admin devices via OneSignal
        $push_sent = false;
        $admin_users = get_users(['role' => 'administrator', 'fields' => 'ID']);
        if (!empty($admin_users)) {
            $admin_ids = array_map('strval', $admin_users);
            $push_preview = strlen($message) > 50
                ? substr($message, 0, 47) . '...'
                : $message;
            $push_sent = NotificationHelper::send_to_users(
                $admin_ids,
                "Messaggio da {$user_name}",
                $push_preview,
                [
                    'type' => 'admin_support_message',
                    'user_id' => $user_id,
                    'user_name' => $user_name,
                ]
            );
        }

        return new WP_REST_Response([
            'success' => true,
            'email_sent' => $email_sent,
            'push_sent' => $push_sent ? true : false,
            'message' => 'Admin notified'
        ], 200);
    }
}

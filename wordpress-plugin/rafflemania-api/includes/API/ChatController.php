<?php
namespace RaffleMania\API;

use RaffleMania\NotificationHelper;
use WP_REST_Controller;
use WP_REST_Server;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Chat Controller for Admin Support Chat
 * Handles sending push notifications when admin replies to users
 */
class ChatController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'chat';

    public function register_routes() {
        // Send notification for new support message
        register_rest_route($this->namespace, '/' . $this->rest_base . '/notify', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'send_notification'],
                'permission_callback' => [$this, 'admin_permissions_check'],
                'args' => [
                    'user_id' => [
                        'required' => true,
                        'type' => 'string',
                        'description' => 'The user ID to notify',
                    ],
                    'message' => [
                        'required' => true,
                        'type' => 'string',
                        'description' => 'The message text for the notification',
                    ],
                ],
            ],
        ]);

        // Batch notify multiple users
        register_rest_route($this->namespace, '/' . $this->rest_base . '/notify-batch', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'send_batch_notification'],
                'permission_callback' => [$this, 'admin_permissions_check'],
                'args' => [
                    'notifications' => [
                        'required' => true,
                        'type' => 'array',
                        'description' => 'Array of {user_id, message} objects',
                    ],
                ],
            ],
        ]);

        // Notify admin when user sends a message (public endpoint)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/notify-admin', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'notify_admin'],
                'permission_callback' => '__return_true', // Public endpoint
                'args' => [
                    'user_id' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                    'user_name' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                    'message' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Check if user has admin permissions
     */
    public function admin_permissions_check($request) {
        // Check for admin API key in header
        $api_key = $request->get_header('X-Admin-Key');
        $stored_key = get_option('rafflemania_admin_api_key');

        if (!empty($stored_key) && $api_key === $stored_key) {
            return true;
        }

        // Check support secret (for in-app admin chat)
        $support_secret = $request->get_header('X-Support-Secret');
        $expected_secret = get_option('rafflemania_support_secret', 'rafflemania-support-2024');
        if ($support_secret === $expected_secret) {
            return true;
        }

        // Or check if user is logged in as admin
        return current_user_can('manage_options');
    }

    /**
     * Send push notification for support chat message
     */
    public function send_notification($request) {
        $user_id = sanitize_text_field($request->get_param('user_id'));
        $message = sanitize_text_field($request->get_param('message'));

        if (empty($user_id) || empty($message)) {
            return new WP_Error(
                'missing_params',
                'user_id and message are required',
                ['status' => 400]
            );
        }

        $result = NotificationHelper::notify_support_message($user_id, $message);

        if ($result === false) {
            return new WP_Error(
                'notification_failed',
                'Failed to send push notification. Check OneSignal configuration.',
                ['status' => 500]
            );
        }

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Notification sent',
            'onesignal_response' => $result,
        ], 200);
    }

    /**
     * Send batch notifications
     */
    public function send_batch_notification($request) {
        $notifications = $request->get_param('notifications');

        if (!is_array($notifications) || empty($notifications)) {
            return new WP_Error(
                'invalid_params',
                'notifications must be a non-empty array',
                ['status' => 400]
            );
        }

        $results = [];
        $success_count = 0;
        $fail_count = 0;

        foreach ($notifications as $notification) {
            $user_id = sanitize_text_field($notification['user_id'] ?? '');
            $message = sanitize_text_field($notification['message'] ?? '');

            if (empty($user_id) || empty($message)) {
                $results[] = [
                    'user_id' => $user_id,
                    'success' => false,
                    'error' => 'Missing user_id or message',
                ];
                $fail_count++;
                continue;
            }

            $result = NotificationHelper::notify_support_message($user_id, $message);

            if ($result === false) {
                $results[] = [
                    'user_id' => $user_id,
                    'success' => false,
                    'error' => 'OneSignal request failed',
                ];
                $fail_count++;
            } else {
                $results[] = [
                    'user_id' => $user_id,
                    'success' => true,
                ];
                $success_count++;
            }
        }

        return new WP_REST_Response([
            'success' => $fail_count === 0,
            'total' => count($notifications),
            'success_count' => $success_count,
            'fail_count' => $fail_count,
            'results' => $results,
        ], 200);
    }

    /**
     * Notify admin via email when user sends a support message
     */
    public function notify_admin($request) {
        $user_id = sanitize_text_field($request->get_param('user_id'));
        $user_name = sanitize_text_field($request->get_param('user_name'));
        $message = sanitize_text_field($request->get_param('message'));

        if (empty($user_id) || empty($user_name) || empty($message)) {
            return new WP_Error(
                'missing_params',
                'user_id, user_name and message are required',
                ['status' => 400]
            );
        }

        // Admin emails to notify
        $admin_emails = [
            'steeven.russo94@gmail.com',
            'citrarodaniele90@gmail.com',
            'steward_russo94@hotmail.it',
        ];

        // Prepare email content
        require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/EmailHelper.php';
        $subject = "[RaffleMania] Nuovo messaggio da {$user_name}";

        $preview = strlen($message) > 200
            ? substr($message, 0, 200) . '...'
            : $message;

        $email_body = "<tr><td style='padding:16px 40px;'>
<h2 style='color:#1a1a1a;margin:0 0 10px;font-size:22px;font-weight:700;'>Nuovo messaggio di supporto</h2>
<p style='color:#555;font-size:16px;line-height:1.6;margin:0 0 8px;'>Da: <strong>" . esc_html($user_name) . "</strong></p>
<p style='color:#555;font-size:14px;margin:0 0 16px;'>ID Utente: {$user_id}</p>
<div style='background:#f9f9f9;border-left:4px solid #FF6B00;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:16px;'>
<p style='color:#333;font-size:16px;line-height:1.5;margin:0;'>" . esc_html($preview) . "</p>
</div>
<p style='color:#888;font-size:14px;margin:0;'>Rispondi dall'app RaffleMania (sezione Admin) o dal pannello WordPress.</p>
</td></tr>";

        // Send email to all admins
        $sent = false;
        foreach ($admin_emails as $email) {
            if (\RaffleMania\EmailHelper::send($email, $subject, $email_body)) {
                $sent = true;
            }
        }

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
            'success' => $sent || $push_sent,
            'message' => 'Admin notified',
            'email_sent' => $sent,
            'push_sent' => $push_sent ? true : false,
        ], 200);
    }
}

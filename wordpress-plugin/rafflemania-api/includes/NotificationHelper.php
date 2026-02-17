<?php
namespace RaffleMania;

/**
 * Push Notification Helper using OneSignal (Free tier)
 */
class NotificationHelper {

    /**
     * Get the notification icon URL from WordPress uploads
     */
    private static function get_icon_url() {
        return 'https://www.rafflemania.it/wp-content/uploads/2026/02/rafflemania-icon.png';
    }

    /**
     * Determine the correct Authorization header based on the API key format.
     * Organization API keys (start with "os_") use "Key" prefix.
     * REST API keys use "Basic" prefix.
     */
    private static function get_auth_header($api_key) {
        if (strpos($api_key, 'os_') === 0) {
            return 'Key ' . $api_key;
        }
        return 'Basic ' . $api_key;
    }

    /**
     * Send push notification to all users
     */
    public static function send_to_all($title, $message, $data = []) {
        $app_id = get_option('rafflemania_onesignal_app_id');
        $api_key = get_option('rafflemania_onesignal_api_key');

        if (empty($app_id) || empty($api_key)) {
            error_log('[RaffleMania OneSignal] ERROR: app_id or api_key not configured');
            return false;
        }

        $payload = [
            'app_id' => $app_id,
            'included_segments' => ['All'],
            'headings' => ['en' => $title, 'it' => $title],
            'contents' => ['en' => $message, 'it' => $message],
            'data' => $data
        ];

        return self::send_request($payload, $api_key);
    }

    /**
     * Send push notification to specific user by external_user_id
     */
    public static function send_to_user($user_id, $title, $message, $data = []) {
        $app_id = get_option('rafflemania_onesignal_app_id');
        $api_key = get_option('rafflemania_onesignal_api_key');

        if (empty($app_id) || empty($api_key)) {
            error_log('[RaffleMania OneSignal] ERROR: app_id or api_key not configured');
            return false;
        }

        $payload = [
            'app_id' => $app_id,
            'include_aliases' => ['external_id' => [(string)$user_id]],
            'target_channel' => 'push',
            'headings' => ['en' => $title, 'it' => $title],
            'contents' => ['en' => $message, 'it' => $message],
            'data' => $data
        ];

        return self::send_request($payload, $api_key);
    }

    /**
     * Send push notification to multiple users
     */
    public static function send_to_users($user_ids, $title, $message, $data = []) {
        $app_id = get_option('rafflemania_onesignal_app_id');
        $api_key = get_option('rafflemania_onesignal_api_key');

        if (empty($app_id) || empty($api_key)) {
            error_log('[RaffleMania OneSignal] ERROR: app_id or api_key not configured');
            return false;
        }

        $payload = [
            'app_id' => $app_id,
            'include_aliases' => ['external_id' => array_map('strval', $user_ids)],
            'target_channel' => 'push',
            'headings' => ['en' => $title, 'it' => $title],
            'contents' => ['en' => $message, 'it' => $message],
            'data' => $data
        ];

        return self::send_request($payload, $api_key);
    }

    /**
     * Send to all users excluding those with a specific tag set to 'disabled'.
     * Uses OneSignal filters with OR logic to include:
     *   - Users who have the tag set to something other than 'disabled'
     *   - Users who don't have the tag at all (default = enabled)
     */
    public static function send_to_all_excluding_tag($exclude_tag, $title, $message, $data = []) {
        $app_id = get_option('rafflemania_onesignal_app_id');
        $api_key = get_option('rafflemania_onesignal_api_key');

        if (empty($app_id) || empty($api_key)) {
            error_log('[RaffleMania OneSignal] ERROR: app_id or api_key not configured');
            return false;
        }

        // FIX: OneSignal's != filter does NOT include users without the tag.
        // We need OR logic: (tag != 'disabled') OR (tag not_exists)
        // This ensures users who never set the preference still receive the notification.
        $payload = [
            'app_id' => $app_id,
            'filters' => [
                ['field' => 'tag', 'key' => $exclude_tag, 'relation' => '!=', 'value' => 'disabled'],
                ['operator' => 'OR'],
                ['field' => 'tag', 'key' => $exclude_tag, 'relation' => 'not_exists'],
            ],
            'headings' => ['en' => $title, 'it' => $title],
            'contents' => ['en' => $message, 'it' => $message],
            'data' => $data
        ];

        return self::send_request($payload, $api_key);
    }

    /**
     * Notify extraction starting in 5 minutes (respects draw_reminders preference)
     */
    public static function notify_extraction_soon($prize_name) {
        return self::send_to_all_excluding_tag(
            'draw_reminders',
            'Estrazione imminente!',
            "L'estrazione per {$prize_name} iniziera' tra 5 minuti!",
            ['type' => 'extraction_soon', 'prize_name' => $prize_name]
        );
    }

    /**
     * Notify extraction completed - tells all users to check the app for results
     */
    public static function notify_extraction_completed($prize_name) {
        return self::send_to_all(
            'Estrazione avvenuta!',
            "L'estrazione per {$prize_name} e' avvenuta! Entra in app per vedere il risultato.",
            ['type' => 'extraction_completed', 'prize_name' => $prize_name]
        );
    }

    /**
     * Notify winner user that they won a prize
     */
    public static function notify_winner($user_id, $prize_name) {
        if (self::is_notification_disabled($user_id, 'winNotifications')) {
            return false;
        }
        return self::send_to_user(
            $user_id,
            'Hai vinto!',
            "Congratulazioni! Hai vinto {$prize_name}! Apri l'app per i dettagli.",
            ['type' => 'winner', 'prize_name' => $prize_name]
        );
    }

    /**
     * Notify new prize available
     */
    public static function notify_new_prize($prize_name) {
        return self::send_to_all(
            'Nuovo premio disponibile!',
            "E' disponibile un nuovo premio: {$prize_name}. Partecipa subito!",
            ['type' => 'new_prize', 'prize_name' => $prize_name]
        );
    }

    /**
     * Check if a user has disabled a specific notification type
     */
    private static function is_notification_disabled($user_id, $pref_key) {
        global $wpdb;
        $table = $wpdb->prefix . 'rafflemania_users';
        $prefs_json = $wpdb->get_var($wpdb->prepare(
            "SELECT notification_preferences FROM {$table} WHERE id = %d",
            $user_id
        ));

        if (empty($prefs_json)) {
            return false; // Default: notifications enabled
        }

        $prefs = json_decode($prefs_json, true);
        if (!is_array($prefs)) {
            return false;
        }

        return isset($prefs[$pref_key]) && $prefs[$pref_key] === false;
    }

    /**
     * Notify user of new support chat message
     */
    public static function notify_support_message($user_id, $message_text) {
        $preview = strlen($message_text) > 100
            ? substr($message_text, 0, 100) . '...'
            : $message_text;

        return self::send_to_user(
            $user_id,
            'Nuovo messaggio dal supporto',
            $preview,
            ['type' => 'support_chat', 'chatId' => (string)$user_id]
        );
    }

    /**
     * Send HTTP request to OneSignal API
     */
    private static function send_request($payload, $api_key) {
        // FIX: OneSignal requires 'data' to be a JSON object {}, not an array [].
        // An empty PHP array [] encodes as JSON [] (array), causing:
        // "Data must be a valid JSON object" error.
        // Cast to (object) so empty arrays become {} and associative arrays stay objects.
        if (isset($payload['data'])) {
            $payload['data'] = (object) $payload['data'];
        }

        $icon_url = self::get_icon_url();

        // Android notification icons
        $payload['large_icon'] = $icon_url;
        // small_icon must reference a drawable resource name (monochrome, transparent PNG).
        // 'ic_stat_onesignal_default' is OneSignal's built-in default.
        // To use a custom icon, add a monochrome drawable named 'ic_notification' in Android res.
        $payload['small_icon'] = 'ic_stat_onesignal_default';

        // iOS: rich media attachment (shows as thumbnail on the right of the notification)
        $payload['ios_attachments'] = ['logo' => $icon_url];

        // iOS: badge count increment
        $payload['ios_badgeType'] = 'Increase';
        $payload['ios_badgeCount'] = 1;

        // iOS: ensure delivery when app is closed/background
        $payload['content_available'] = true;
        $payload['mutable_content'] = true;

        // High priority for immediate delivery on both platforms
        $payload['priority'] = 10;

        $json_body = json_encode($payload);
        $auth_header = self::get_auth_header($api_key);

        error_log('[RaffleMania OneSignal] Sending notification with auth: ' . substr($auth_header, 0, 12) . '...');
        error_log('[RaffleMania OneSignal] Payload: ' . substr($json_body, 0, 800));

        $response = wp_remote_post('https://api.onesignal.com/notifications', [
            'headers' => [
                'Content-Type' => 'application/json; charset=utf-8',
                'Authorization' => $auth_header
            ],
            'body' => $json_body,
            'timeout' => 30
        ]);

        if (is_wp_error($response)) {
            error_log('[RaffleMania OneSignal] HTTP Error: ' . $response->get_error_message());
            return false;
        }

        $response_body = wp_remote_retrieve_body($response);
        $status_code = wp_remote_retrieve_response_code($response);
        error_log('[RaffleMania OneSignal] Response (HTTP ' . $status_code . '): ' . $response_body);

        // Check for HTTP-level errors
        if ($status_code < 200 || $status_code >= 300) {
            error_log('[RaffleMania OneSignal] ERROR: API returned HTTP ' . $status_code);

            // If 401, the auth format might be wrong - try the other format
            if ($status_code === 401) {
                error_log('[RaffleMania OneSignal] AUTH FAILED - trying alternate auth format...');
                $alt_auth = (strpos($auth_header, 'Basic ') === 0)
                    ? 'Key ' . $api_key
                    : 'Basic ' . $api_key;

                $retry_response = wp_remote_post('https://api.onesignal.com/notifications', [
                    'headers' => [
                        'Content-Type' => 'application/json; charset=utf-8',
                        'Authorization' => $alt_auth
                    ],
                    'body' => $json_body,
                    'timeout' => 30
                ]);

                if (!is_wp_error($retry_response)) {
                    $retry_status = wp_remote_retrieve_response_code($retry_response);
                    $retry_body = wp_remote_retrieve_body($retry_response);
                    error_log('[RaffleMania OneSignal] Retry with alt auth (HTTP ' . $retry_status . '): ' . $retry_body);

                    if ($retry_status >= 200 && $retry_status < 300) {
                        // Alt format worked - use the retry response
                        $response_body = $retry_body;
                        $status_code = $retry_status;
                        error_log('[RaffleMania OneSignal] SUCCESS with alternate auth format (' . substr($alt_auth, 0, 8) . '...). Consider updating your API key format in settings.');
                    }
                }
            }

            // Still failed after retry
            if ($status_code < 200 || $status_code >= 300) {
                return false;
            }
        }

        $body = json_decode($response_body, true);

        // Check for OneSignal API-level errors
        if (isset($body['errors']) && !empty($body['errors'])) {
            $errors_str = is_array($body['errors']) ? implode(', ', $body['errors']) : json_encode($body['errors']);
            error_log('[RaffleMania OneSignal] API ERRORS: ' . $errors_str);
            return false;
        }

        // OneSignal API v2 doesn't return recipients in the immediate response for segment-based sends.
        // Fetch the notification details to get the actual recipients count.
        if ($body && isset($body['id']) && !empty($body['id']) && !isset($body['recipients'])) {
            $app_id = $payload['app_id'] ?? '';
            $notif_id = $body['id'];
            usleep(1500000); // Wait 1.5s for OneSignal to process

            $detail_response = wp_remote_get(
                "https://api.onesignal.com/notifications/{$notif_id}?app_id={$app_id}",
                [
                    'headers' => [
                        'Authorization' => self::get_auth_header($api_key),
                    ],
                    'timeout' => 10,
                ]
            );

            if (!is_wp_error($detail_response)) {
                $detail_body = json_decode(wp_remote_retrieve_body($detail_response), true);
                if ($detail_body) {
                    $successful = (int)($detail_body['successful'] ?? 0);
                    $failed = (int)($detail_body['failed'] ?? 0);
                    $remaining = (int)($detail_body['remaining'] ?? 0);

                    $body['recipients'] = $successful;
                    if ($body['recipients'] == 0 && $remaining > 0) {
                        // Still queuing - use remaining as estimate
                        $body['recipients'] = $remaining;
                    }
                    error_log('[RaffleMania OneSignal] Delivery stats - successful: ' . $successful . ', failed: ' . $failed . ', remaining: ' . $remaining);
                }
            }
        }

        return $body;
    }
}

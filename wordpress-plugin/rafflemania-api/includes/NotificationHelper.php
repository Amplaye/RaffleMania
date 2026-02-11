<?php
namespace RaffleMania;

/**
 * Push Notification Helper using OneSignal (Free tier)
 */
class NotificationHelper {

    /**
     * Send push notification to all users
     */
    public static function send_to_all($title, $message, $data = []) {
        $app_id = get_option('rafflemania_onesignal_app_id');
        $api_key = get_option('rafflemania_onesignal_api_key');

        if (empty($app_id) || empty($api_key)) {
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
     * Send to all users excluding those with a specific tag set to 'disabled'
     * Uses OneSignal filters instead of included_segments
     */
    public static function send_to_all_excluding_tag($exclude_tag, $title, $message, $data = []) {
        $app_id = get_option('rafflemania_onesignal_app_id');
        $api_key = get_option('rafflemania_onesignal_api_key');

        if (empty($app_id) || empty($api_key)) {
            return false;
        }

        // Filter: tag != 'disabled' (includes users who never set the tag)
        $payload = [
            'app_id' => $app_id,
            'filters' => [
                ['field' => 'tag', 'key' => $exclude_tag, 'relation' => '!=', 'value' => 'disabled'],
            ],
            'headings' => ['en' => $title, 'it' => $title],
            'contents' => ['en' => $message, 'it' => $message],
            'data' => $data
        ];

        return self::send_request($payload, $api_key);
    }

    /**
     * Notify winner (checks user preference before sending)
     */
    public static function notify_winner($user_id, $prize_name) {
        // Check if user has disabled win notifications
        if (self::is_notification_disabled($user_id, 'win_notifications')) {
            return null; // User opted out
        }

        return self::send_to_user(
            $user_id,
            'Hai vinto!',
            "Congratulazioni! Hai vinto: {$prize_name}",
            ['type' => 'winner', 'prize_name' => $prize_name]
        );
    }

    /**
     * Notify extraction starting soon (respects draw_reminders preference)
     */
    public static function notify_extraction_soon($prize_name, $minutes = 5) {
        return self::send_to_all_excluding_tag(
            'draw_reminders',
            'Estrazione imminente!',
            "L'estrazione per {$prize_name} iniziera tra {$minutes} minuti!",
            ['type' => 'extraction_soon', 'prize_name' => $prize_name]
        );
    }

    /**
     * Notify extraction completed - tells all users to check the app for results
     */
    public static function notify_extraction_completed($prize_name) {
        return self::send_to_all_excluding_tag(
            'draw_reminders',
            'Estrazione completata!',
            "L'estrazione per {$prize_name} è terminata! Entra nell'app per verificare l'esito.",
            ['type' => 'extraction_completed', 'prize_name' => $prize_name]
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
        $icon_url = 'https://www.rafflemania.it/wp-content/uploads/2026/02/rafflemania-icon.png';

        // Android: large_icon shows as notification image, small_icon for status bar
        $payload['large_icon'] = $icon_url;
        $payload['small_icon'] = 'ic_launcher';

        // iOS: add icon as attachment for rich notification
        $payload['ios_attachments'] = ['icon' => $icon_url];

        $response = wp_remote_post('https://api.onesignal.com/notifications', [
            'headers' => [
                'Content-Type' => 'application/json',
                'Authorization' => 'Key ' . $api_key
            ],
            'body' => json_encode($payload),
            'timeout' => 30
        ]);

        if (is_wp_error($response)) {
            error_log('OneSignal Error: ' . $response->get_error_message());
            return false;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        return $body;
    }
}

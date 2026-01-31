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
            'include_external_user_ids' => [(string)$user_id],
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
            'include_external_user_ids' => array_map('strval', $user_ids),
            'headings' => ['en' => $title, 'it' => $title],
            'contents' => ['en' => $message, 'it' => $message],
            'data' => $data
        ];

        return self::send_request($payload, $api_key);
    }

    /**
     * Notify winner
     */
    public static function notify_winner($user_id, $prize_name) {
        return self::send_to_user(
            $user_id,
            'Hai vinto!',
            "Congratulazioni! Hai vinto: {$prize_name}",
            ['type' => 'winner', 'prize_name' => $prize_name]
        );
    }

    /**
     * Notify extraction starting soon
     */
    public static function notify_extraction_soon($prize_name, $minutes = 5) {
        return self::send_to_all(
            'Estrazione imminente!',
            "L'estrazione per {$prize_name} iniziera tra {$minutes} minuti!",
            ['type' => 'extraction_soon', 'prize_name' => $prize_name]
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
     * Send HTTP request to OneSignal API
     */
    private static function send_request($payload, $api_key) {
        $response = wp_remote_post('https://onesignal.com/api/v1/notifications', [
            'headers' => [
                'Content-Type' => 'application/json',
                'Authorization' => 'Basic ' . $api_key
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

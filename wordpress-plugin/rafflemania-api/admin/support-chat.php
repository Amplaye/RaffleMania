<?php
/**
 * Support Chat Admin Page
 * Allows admins to view and reply to user chat messages
 * @version 1.1.0 - 2026-02-02 - Auto-refresh
 */

if (!defined('ABSPATH')) exit;

// Handle form submission for sending messages
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['send_support_message'])) {
    check_admin_referer('send_support_message_nonce');

    $user_id = sanitize_text_field($_POST['user_id']);
    $user_name = sanitize_text_field($_POST['user_name']);
    $message = sanitize_textarea_field($_POST['message']);

    if (!empty($user_id) && !empty($message)) {
        // Send message to Firestore
        $firestore_result = send_message_to_firestore($user_id, $message);

        // Send push notification to user
        $notification_result = \RaffleMania\NotificationHelper::send_to_user(
            $user_id,
            'Supporto RaffleMania',
            strlen($message) > 50 ? substr($message, 0, 47) . '...' : $message,
            [
                'type' => 'support_message',
                'screen' => 'SupportChat'
            ]
        );

        if ($firestore_result) {
            echo '<div class="notice notice-success"><p>Messaggio inviato con successo!</p></div>';
        } else {
            echo '<div class="notice notice-warning"><p>Notifica push inviata, ma errore Firestore. Il messaggio potrebbe non apparire nella chat.</p></div>';
        }
    }
}

/**
 * Send message to Firestore using REST API
 */
function send_message_to_firestore($user_id, $message) {
    $project_id = get_option('rafflemania_firebase_project_id', '');
    $api_key = get_option('rafflemania_firebase_api_key', '');

    if (empty($project_id)) {
        return false;
    }

    $firestore_url = "https://firestore.googleapis.com/v1/projects/{$project_id}/databases/(default)/documents/chats/{$user_id}/messages";

    $message_data = [
        'fields' => [
            'text' => ['stringValue' => $message],
            'senderId' => ['stringValue' => 'support'],
            'senderName' => ['stringValue' => 'Supporto RaffleMania'],
            'senderType' => ['stringValue' => 'support'],
            'timestamp' => ['timestampValue' => gmdate('Y-m-d\TH:i:s\Z')],
            'read' => ['booleanValue' => false]
        ]
    ];

    $url = $firestore_url;
    if (!empty($api_key)) {
        $url .= '?key=' . $api_key;
    }

    $response = wp_remote_post($url, [
        'headers' => [
            'Content-Type' => 'application/json',
        ],
        'body' => json_encode($message_data),
        'timeout' => 30
    ]);

    if (is_wp_error($response)) {
        error_log('Firestore Error: ' . $response->get_error_message());
        return false;
    }

    $code = wp_remote_retrieve_response_code($response);

    // Also update the chat metadata
    if ($code === 200 || $code === 201) {
        update_chat_metadata($user_id, $message, $project_id, $api_key);
        return true;
    }

    error_log('Firestore Response Code: ' . $code);
    error_log('Firestore Response: ' . wp_remote_retrieve_body($response));
    return false;
}

/**
 * Update chat metadata in Firestore
 */
function update_chat_metadata($user_id, $message, $project_id, $api_key) {
    $firestore_url = "https://firestore.googleapis.com/v1/projects/{$project_id}/databases/(default)/documents/chats/{$user_id}";

    $metadata = [
        'fields' => [
            'lastMessage' => ['stringValue' => $message],
            'lastMessageTime' => ['timestampValue' => gmdate('Y-m-d\TH:i:s\Z')],
            'lastMessageBy' => ['stringValue' => 'support'],
            'hasUnreadFromSupport' => ['booleanValue' => true]
        ]
    ];

    $url = $firestore_url . '?updateMask.fieldPaths=lastMessage&updateMask.fieldPaths=lastMessageTime&updateMask.fieldPaths=lastMessageBy&updateMask.fieldPaths=hasUnreadFromSupport';
    if (!empty($api_key)) {
        $url .= '&key=' . $api_key;
    }

    wp_remote_request($url, [
        'method' => 'PATCH',
        'headers' => [
            'Content-Type' => 'application/json',
        ],
        'body' => json_encode($metadata),
        'timeout' => 30
    ]);
}

/**
 * Get active chats from Firestore
 */
function get_active_chats() {
    $project_id = get_option('rafflemania_firebase_project_id', '');
    $api_key = get_option('rafflemania_firebase_api_key', '');

    if (empty($project_id)) {
        return [];
    }

    $firestore_url = "https://firestore.googleapis.com/v1/projects/{$project_id}/databases/(default)/documents/chats";

    $url = $firestore_url;
    if (!empty($api_key)) {
        $url .= '?key=' . $api_key;
    }

    $response = wp_remote_get($url, ['timeout' => 30]);

    if (is_wp_error($response)) {
        return [];
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    $chats = [];

    if (isset($body['documents'])) {
        foreach ($body['documents'] as $doc) {
            $fields = $doc['fields'] ?? [];
            $path_parts = explode('/', $doc['name']);
            $chat_id = end($path_parts);

            $chats[] = [
                'user_id' => $chat_id,
                'user_name' => $fields['userName']['stringValue'] ?? 'Utente',
                'last_message' => $fields['lastMessage']['stringValue'] ?? '',
                'last_message_by' => $fields['lastMessageBy']['stringValue'] ?? '',
                'last_activity' => $fields['lastMessageTime']['timestampValue'] ?? $fields['lastActivity']['timestampValue'] ?? '',
                'has_unread' => ($fields['hasUnreadFromUser']['booleanValue'] ?? false)
            ];
        }
    }

    // Sort by last activity (newest first)
    usort($chats, function($a, $b) {
        return strcmp($b['last_activity'], $a['last_activity']);
    });

    return $chats;
}

/**
 * Get messages for a specific chat
 */
function get_chat_messages($user_id) {
    $project_id = get_option('rafflemania_firebase_project_id', '');
    $api_key = get_option('rafflemania_firebase_api_key', '');

    if (empty($project_id)) {
        return [];
    }

    $firestore_url = "https://firestore.googleapis.com/v1/projects/{$project_id}/databases/(default)/documents/chats/{$user_id}/messages?orderBy=timestamp";

    $url = $firestore_url;
    if (!empty($api_key)) {
        $url .= '&key=' . $api_key;
    }

    $response = wp_remote_get($url, ['timeout' => 30]);

    if (is_wp_error($response)) {
        return [];
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    $messages = [];

    if (isset($body['documents'])) {
        foreach ($body['documents'] as $doc) {
            $fields = $doc['fields'] ?? [];

            $messages[] = [
                'text' => $fields['text']['stringValue'] ?? '',
                'sender_type' => $fields['senderType']['stringValue'] ?? 'user',
                'sender_name' => $fields['senderName']['stringValue'] ?? '',
                'timestamp' => $fields['timestamp']['timestampValue'] ?? ''
            ];
        }
    }

    return $messages;
}

// Get selected chat
$selected_chat = isset($_GET['chat']) ? sanitize_text_field($_GET['chat']) : null;
$selected_user_name = isset($_GET['name']) ? sanitize_text_field($_GET['name']) : 'Utente';

// Get data
$chats = get_active_chats();
$messages = $selected_chat ? get_chat_messages($selected_chat) : [];
?>

<div class="wrap">
    <h1 style="display: flex; align-items: center; gap: 15px;">
        Supporto Chat
        <button type="button" id="refresh-btn" onclick="location.reload();" style="background: #0073aa; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 13px;">
            ↻ Aggiorna
        </button>
        <span id="auto-refresh-status" style="font-size: 12px; color: #666; font-weight: normal;"></span>
    </h1>

    <?php
    $firebase_configured = !empty(get_option('rafflemania_firebase_project_id', ''));
    if (!$firebase_configured): ?>
        <div class="notice notice-warning">
            <p><strong>Configura Firebase:</strong> Vai su <a href="<?php echo admin_url('admin.php?page=rafflemania-settings'); ?>">Impostazioni</a> e inserisci il Project ID di Firebase per abilitare la chat.</p>
        </div>
    <?php endif; ?>

    <div style="display: flex; gap: 20px; margin-top: 20px;">
        <!-- Chat List -->
        <div id="chat-list-container" style="width: 300px; background: #fff; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;">
            <div style="background: #FF6B00; color: white; padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                <span>Chat Attive (<?php echo count($chats); ?>)</span>
            </div>
            <div style="max-height: 500px; overflow-y: auto;">
                <?php if (empty($chats)): ?>
                    <div style="padding: 20px; text-align: center; color: #666;">
                        Nessuna chat attiva
                    </div>
                <?php else: ?>
                    <?php foreach ($chats as $chat): ?>
                        <a href="?page=rafflemania-support&chat=<?php echo urlencode($chat['user_id']); ?>&name=<?php echo urlencode($chat['user_name']); ?>"
                           style="display: block; padding: 15px; border-bottom: 1px solid #eee; text-decoration: none; color: inherit; <?php echo $selected_chat === $chat['user_id'] ? 'background: #fff3e6;' : ''; ?>">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: #333;"><?php echo esc_html($chat['user_name']); ?></strong>
                                <?php if ($chat['has_unread']): ?>
                                    <span style="background: #FF6B00; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">Nuovo</span>
                                <?php endif; ?>
                            </div>
                            <div style="font-size: 12px; color: #666; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                <?php echo $chat['last_message_by'] === 'support' ? '← ' : ''; ?>
                                <?php echo esc_html(substr($chat['last_message'], 0, 40)); ?>
                            </div>
                            <div style="font-size: 11px; color: #999; margin-top: 3px;">
                                <?php
                                if ($chat['last_activity']) {
                                    $date = new DateTime($chat['last_activity']);
                                    $date->setTimezone(new DateTimeZone('Europe/Rome'));
                                    echo $date->format('d/m/Y H:i');
                                }
                                ?>
                            </div>
                        </a>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <!-- Chat Messages -->
        <div style="flex: 1; background: #fff; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
            <?php if ($selected_chat): ?>
                <div style="background: #f5f5f5; padding: 15px; border-bottom: 1px solid #ddd;">
                    <strong><?php echo esc_html($selected_user_name); ?></strong>
                    <span style="color: #666; font-size: 12px; margin-left: 10px;">ID: <?php echo esc_html($selected_chat); ?></span>
                </div>

                <!-- Messages -->
                <div id="messages-container" style="flex: 1; padding: 15px; overflow-y: auto; max-height: 350px; background: #f9f9f9;">
                    <?php if (empty($messages)): ?>
                        <div style="text-align: center; color: #666; padding: 20px;">
                            Nessun messaggio
                        </div>
                    <?php else: ?>
                        <?php foreach ($messages as $msg): ?>
                            <div style="margin-bottom: 15px; <?php echo $msg['sender_type'] === 'support' ? 'text-align: right;' : ''; ?>">
                                <div style="display: inline-block; max-width: 70%; padding: 10px 15px; border-radius: 15px; <?php echo $msg['sender_type'] === 'support' ? 'background: #FF6B00; color: white; border-bottom-right-radius: 5px;' : 'background: #e0e0e0; color: #333; border-bottom-left-radius: 5px;'; ?>">
                                    <?php echo esc_html($msg['text']); ?>
                                </div>
                                <div style="font-size: 11px; color: #999; margin-top: 3px;">
                                    <?php
                                    if ($msg['timestamp']) {
                                        $date = new DateTime($msg['timestamp']);
                                        $date->setTimezone(new DateTimeZone('Europe/Rome'));
                                        echo $date->format('H:i');
                                    }
                                    ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>

                <!-- Reply Form -->
                <div style="padding: 15px; border-top: 1px solid #ddd; background: #fff;">
                    <form method="post" style="display: flex; gap: 10px;">
                        <?php wp_nonce_field('send_support_message_nonce'); ?>
                        <input type="hidden" name="user_id" value="<?php echo esc_attr($selected_chat); ?>">
                        <input type="hidden" name="user_name" value="<?php echo esc_attr($selected_user_name); ?>">
                        <textarea name="message" placeholder="Scrivi un messaggio..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; resize: none; min-height: 40px;" required></textarea>
                        <button type="submit" name="send_support_message" style="background: #FF6B00; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-weight: bold;">
                            Invia
                        </button>
                    </form>
                </div>
            <?php else: ?>
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #666;">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">✉</div>
                        <p>Seleziona una chat dalla lista</p>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<style>
    .wrap { max-width: 1200px; }
    textarea:focus, button:hover { outline: none; }
    button:hover { opacity: 0.9; }
    #refresh-btn:hover { background: #005a87 !important; }
</style>

<script>
// Auto-refresh every 30 seconds
let refreshInterval = 30;
let countdown = refreshInterval;

function updateCountdown() {
    document.getElementById('auto-refresh-status').textContent = 'Auto-refresh in ' + countdown + 's';
    countdown--;

    if (countdown < 0) {
        location.reload();
    }
}

// Start countdown
updateCountdown();
setInterval(updateCountdown, 1000);

// Scroll to bottom of messages
const messagesContainer = document.getElementById('messages-container');
if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
</script>

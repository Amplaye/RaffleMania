<?php
/**
 * Support Chat Admin Page
 * @version 2.0.0 - Admin panel upgrade with clear chat functionality
 */

if (!defined('ABSPATH')) exit;

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['send_support_message'])) {
        check_admin_referer('send_support_message_nonce');

        $user_id = sanitize_text_field($_POST['user_id']);
        $user_name = sanitize_text_field($_POST['user_name']);
        $message = sanitize_textarea_field($_POST['message']);

        if (!empty($user_id) && !empty($message)) {
            $firestore_result = send_chat_message_to_firestore($user_id, $message);

            $notification_result = \RaffleMania\NotificationHelper::send_to_user(
                $user_id,
                'Supporto RaffleMania',
                strlen($message) > 50 ? substr($message, 0, 47) . '...' : $message,
                ['type' => 'support_message', 'screen' => 'SupportChat']
            );

            if ($firestore_result) {
                $success_msg = 'Messaggio inviato con successo!';
            } else {
                $error_msg = 'Notifica push inviata, ma errore Firestore. Il messaggio potrebbe non apparire nella chat.';
            }
        }
    } elseif (isset($_POST['delete_chat'])) {
        check_admin_referer('delete_chat_nonce');
        $user_id = sanitize_text_field($_POST['chat_user_id']);
        if (!empty($user_id)) {
            $deleted = delete_firestore_chat($user_id);
            if ($deleted) {
                $success_msg = 'Chat eliminata con successo!';
            } else {
                $error_msg = 'Errore durante l\'eliminazione della chat.';
            }
        }
    } elseif (isset($_POST['delete_all_chats'])) {
        check_admin_referer('delete_all_chats_nonce');
        $chats_list = get_active_support_chats();
        $deleted_count = 0;
        foreach ($chats_list as $chat) {
            if (delete_firestore_chat($chat['user_id'])) {
                $deleted_count++;
            }
        }
        $success_msg = "{$deleted_count} chat eliminate con successo!";
    }
}

/**
 * Send message to Firestore using REST API
 */
function send_chat_message_to_firestore($user_id, $message) {
    $project_id = get_option('rafflemania_firebase_project_id', '');
    $api_key = get_option('rafflemania_firebase_api_key', '');

    if (empty($project_id)) return false;

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
    if (!empty($api_key)) $url .= '?key=' . $api_key;

    $response = wp_remote_post($url, [
        'headers' => ['Content-Type' => 'application/json'],
        'body' => json_encode($message_data),
        'timeout' => 30
    ]);

    if (is_wp_error($response)) return false;

    $code = wp_remote_retrieve_response_code($response);
    if ($code === 200 || $code === 201) {
        update_chat_metadata_firestore($user_id, $message);
        return true;
    }

    return false;
}

/**
 * Update chat metadata in Firestore
 */
function update_chat_metadata_firestore($user_id, $message) {
    $project_id = get_option('rafflemania_firebase_project_id', '');
    $api_key = get_option('rafflemania_firebase_api_key', '');

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
    if (!empty($api_key)) $url .= '&key=' . $api_key;

    wp_remote_request($url, [
        'method' => 'PATCH',
        'headers' => ['Content-Type' => 'application/json'],
        'body' => json_encode($metadata),
        'timeout' => 30
    ]);
}

/**
 * Delete a single chat and all its messages from Firestore
 */
function delete_firestore_chat($user_id) {
    $project_id = get_option('rafflemania_firebase_project_id', '');
    $api_key = get_option('rafflemania_firebase_api_key', '');

    if (empty($project_id)) return false;

    // First delete all messages in the subcollection
    $messages_url = "https://firestore.googleapis.com/v1/projects/{$project_id}/databases/(default)/documents/chats/{$user_id}/messages";
    if (!empty($api_key)) $messages_url .= '?key=' . $api_key;

    $response = wp_remote_get($messages_url, ['timeout' => 30]);
    if (!is_wp_error($response)) {
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (isset($body['documents'])) {
            foreach ($body['documents'] as $doc) {
                $doc_path = $doc['name'];
                $delete_url = "https://firestore.googleapis.com/v1/{$doc_path}";
                if (!empty($api_key)) $delete_url .= '?key=' . $api_key;
                wp_remote_request($delete_url, ['method' => 'DELETE', 'timeout' => 10]);
            }
        }
    }

    // Then delete the chat document itself
    $chat_url = "https://firestore.googleapis.com/v1/projects/{$project_id}/databases/(default)/documents/chats/{$user_id}";
    if (!empty($api_key)) $chat_url .= '?key=' . $api_key;

    $result = wp_remote_request($chat_url, ['method' => 'DELETE', 'timeout' => 30]);

    return !is_wp_error($result) && in_array(wp_remote_retrieve_response_code($result), [200, 204]);
}

/**
 * Get active chats from Firestore
 */
function get_active_support_chats() {
    $project_id = get_option('rafflemania_firebase_project_id', '');
    $api_key = get_option('rafflemania_firebase_api_key', '');

    if (empty($project_id)) return [];

    $url = "https://firestore.googleapis.com/v1/projects/{$project_id}/databases/(default)/documents/chats";
    if (!empty($api_key)) $url .= '?key=' . $api_key;

    $response = wp_remote_get($url, ['timeout' => 30]);
    if (is_wp_error($response)) return [];

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
                'has_unread' => ($fields['hasUnreadFromUser']['booleanValue'] ?? false),
                'message_count' => intval($fields['messageCount']['integerValue'] ?? 0)
            ];
        }
    }

    usort($chats, function($a, $b) {
        return strcmp($b['last_activity'], $a['last_activity']);
    });

    return $chats;
}

/**
 * Get messages for a specific chat
 */
function get_support_chat_messages($user_id) {
    $project_id = get_option('rafflemania_firebase_project_id', '');
    $api_key = get_option('rafflemania_firebase_api_key', '');

    if (empty($project_id)) return [];

    $url = "https://firestore.googleapis.com/v1/projects/{$project_id}/databases/(default)/documents/chats/{$user_id}/messages?orderBy=timestamp";
    if (!empty($api_key)) $url .= '&key=' . $api_key;

    $response = wp_remote_get($url, ['timeout' => 30]);
    if (is_wp_error($response)) return [];

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
$chats = get_active_support_chats();
$messages = $selected_chat ? get_support_chat_messages($selected_chat) : [];
$unread_count = count(array_filter($chats, function($c) { return $c['has_unread']; }));
?>

<div class="wrap rafflemania-chat-wrap">
    <h1 style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
        <span class="dashicons dashicons-format-chat" style="font-size: 30px; color: #FF6B00;"></span>
        Supporto Chat
        <?php if ($unread_count > 0): ?>
        <span style="background: #dc3545; color: white; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 700;"><?php echo $unread_count; ?> non letti</span>
        <?php endif; ?>
        <div style="margin-left: auto; display: flex; gap: 8px;">
            <button type="button" onclick="location.reload();" class="rafflemania-btn rafflemania-btn-primary">
                <span class="dashicons dashicons-update" style="font-size: 16px;"></span> Aggiorna
            </button>
            <?php if (!empty($chats)): ?>
            <form method="post" style="display:inline;" onsubmit="return confirm('ATTENZIONE: Eliminare TUTTE le chat? Questa azione e irreversibile!');">
                <?php wp_nonce_field('delete_all_chats_nonce'); ?>
                <button type="submit" name="delete_all_chats" class="rafflemania-btn rafflemania-btn-danger">
                    <span class="dashicons dashicons-trash" style="font-size: 16px;"></span> Pulisci Tutte
                </button>
            </form>
            <?php endif; ?>
        </div>
    </h1>

    <?php if (isset($success_msg)): ?>
    <div class="rafflemania-toast rafflemania-toast-success">
        <span class="dashicons dashicons-yes-alt"></span> <?php echo esc_html($success_msg); ?>
    </div>
    <?php endif; ?>
    <?php if (isset($error_msg)): ?>
    <div class="rafflemania-toast rafflemania-toast-error">
        <span class="dashicons dashicons-warning"></span> <?php echo esc_html($error_msg); ?>
    </div>
    <?php endif; ?>

    <?php
    $firebase_configured = !empty(get_option('rafflemania_firebase_project_id', ''));
    if (!$firebase_configured): ?>
        <div class="notice notice-warning">
            <p><strong>Configura Firebase:</strong> Vai su <a href="<?php echo admin_url('admin.php?page=rafflemania-settings'); ?>">Impostazioni</a> e inserisci il Project ID di Firebase per abilitare la chat.</p>
        </div>
    <?php endif; ?>

    <style>
        .rafflemania-chat-wrap { }

        .rafflemania-toast {
            position: fixed;
            top: 40px;
            right: 20px;
            z-index: 99999;
            padding: 14px 24px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            animation: slideIn 0.4s ease-out, fadeOut 0.4s ease-in 3.5s forwards;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .rafflemania-toast-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
        .rafflemania-toast-error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }

        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; visibility: hidden; } }

        .rafflemania-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
        }
        .rafflemania-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .rafflemania-btn-primary { background: #FF6B00; color: white; }
        .rafflemania-btn-danger { background: #dc3545; color: white; }
        .rafflemania-btn-secondary { background: #6c757d; color: white; }
        .rafflemania-btn-sm { padding: 4px 10px; font-size: 11px; }

        .chat-layout {
            display: flex;
            gap: 0;
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            overflow: hidden;
            height: 600px;
        }

        /* Sidebar */
        .chat-sidebar {
            width: 340px;
            border-right: 1px solid #e8e8e8;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
        }
        .chat-sidebar-header {
            background: linear-gradient(135deg, #FF6B00, #FF8C00);
            color: white;
            padding: 16px 20px;
            font-weight: 700;
            font-size: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .chat-sidebar-header .chat-count {
            background: rgba(255,255,255,0.25);
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 12px;
        }
        .chat-list {
            flex: 1;
            overflow-y: auto;
        }
        .chat-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 20px;
            border-bottom: 1px solid #f5f5f5;
            text-decoration: none;
            color: inherit;
            transition: background 0.15s;
            position: relative;
        }
        .chat-item:hover { background: #fafafa; }
        .chat-item.active { background: #fff5eb; border-left: 3px solid #FF6B00; }
        .chat-item-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #FF6B00;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 16px;
            flex-shrink: 0;
        }
        .chat-item-content { flex: 1; min-width: 0; }
        .chat-item-name {
            font-weight: 600;
            color: #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .chat-item-preview {
            font-size: 12px;
            color: #888;
            margin-top: 3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .chat-item-time {
            font-size: 11px;
            color: #bbb;
            margin-top: 4px;
        }
        .chat-item-badges {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        .unread-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #FF6B00;
            flex-shrink: 0;
        }
        .msg-count-badge {
            background: #f0f0f0;
            color: #666;
            padding: 1px 7px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
        }

        /* Chat area */
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .chat-main-header {
            padding: 14px 20px;
            background: #fafafa;
            border-bottom: 1px solid #e8e8e8;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .chat-main-header .chat-user-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .chat-main-header .chat-user-name { font-weight: 700; color: #333; }
        .chat-main-header .chat-user-id { font-size: 12px; color: #999; }

        .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #f9f9f9;
        }
        .chat-message {
            margin-bottom: 12px;
            display: flex;
        }
        .chat-message.from-support { justify-content: flex-end; }
        .chat-message .bubble {
            max-width: 70%;
            padding: 10px 16px;
            border-radius: 16px;
            font-size: 14px;
            line-height: 1.4;
            word-break: break-word;
        }
        .chat-message.from-user .bubble {
            background: #e8e8e8;
            color: #333;
            border-bottom-left-radius: 4px;
        }
        .chat-message.from-support .bubble {
            background: linear-gradient(135deg, #FF6B00, #FF8C00);
            color: white;
            border-bottom-right-radius: 4px;
        }
        .chat-message .msg-time {
            font-size: 10px;
            color: #bbb;
            margin-top: 4px;
        }
        .chat-message.from-support .msg-time { text-align: right; }

        .chat-input-area {
            padding: 16px 20px;
            border-top: 1px solid #e8e8e8;
            background: #fff;
        }
        .chat-input-form {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }
        .chat-input-form textarea {
            flex: 1;
            padding: 10px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 20px;
            resize: none;
            font-size: 14px;
            min-height: 42px;
            max-height: 120px;
            transition: border-color 0.2s;
            font-family: inherit;
        }
        .chat-input-form textarea:focus { border-color: #FF6B00; outline: none; }
        .chat-input-form button[type="submit"] {
            background: linear-gradient(135deg, #FF6B00, #FF8C00);
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 700;
            font-size: 14px;
            transition: all 0.2s;
            white-space: nowrap;
        }
        .chat-input-form button[type="submit"]:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,107,0,0.3); }

        .chat-empty-state {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
            text-align: center;
        }
        .chat-empty-state .dashicons { font-size: 48px; color: #ddd; }
        .chat-empty-state p { margin-top: 12px; font-size: 15px; }

        .chat-no-chats {
            padding: 40px 20px;
            text-align: center;
            color: #999;
        }
    </style>

    <div class="chat-layout">
        <!-- Sidebar -->
        <div class="chat-sidebar">
            <div class="chat-sidebar-header">
                <span>Chat</span>
                <span class="chat-count"><?php echo count($chats); ?> attive</span>
            </div>
            <div class="chat-list">
                <?php if (empty($chats)): ?>
                    <div class="chat-no-chats">
                        <span class="dashicons dashicons-format-chat" style="font-size: 32px; color: #ddd;"></span>
                        <p style="margin-top: 10px;">Nessuna chat attiva</p>
                    </div>
                <?php else: ?>
                    <?php foreach ($chats as $chat): ?>
                        <a href="?page=rafflemania-support&chat=<?php echo urlencode($chat['user_id']); ?>&name=<?php echo urlencode($chat['user_name']); ?>"
                           class="chat-item <?php echo $selected_chat === $chat['user_id'] ? 'active' : ''; ?>">
                            <div class="chat-item-avatar">
                                <?php echo strtoupper(substr($chat['user_name'], 0, 1)); ?>
                            </div>
                            <div class="chat-item-content">
                                <div class="chat-item-name">
                                    <span><?php echo esc_html($chat['user_name']); ?></span>
                                    <div class="chat-item-badges">
                                        <?php if ($chat['message_count'] > 0): ?>
                                        <span class="msg-count-badge"><?php echo $chat['message_count']; ?></span>
                                        <?php endif; ?>
                                        <?php if ($chat['has_unread']): ?>
                                        <span class="unread-dot"></span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                                <div class="chat-item-preview">
                                    <?php echo $chat['last_message_by'] === 'support' ? 'Tu: ' : ''; ?>
                                    <?php echo esc_html(substr($chat['last_message'], 0, 50)); ?>
                                </div>
                                <div class="chat-item-time">
                                    <?php
                                    if ($chat['last_activity']) {
                                        $date = new DateTime($chat['last_activity']);
                                        $date->setTimezone(new DateTimeZone('Europe/Rome'));
                                        $now = new DateTime('now', new DateTimeZone('Europe/Rome'));
                                        $diff = $now->diff($date);
                                        if ($diff->days === 0) {
                                            echo $date->format('H:i');
                                        } elseif ($diff->days === 1) {
                                            echo 'Ieri ' . $date->format('H:i');
                                        } else {
                                            echo $date->format('d/m/Y H:i');
                                        }
                                    }
                                    ?>
                                </div>
                            </div>
                        </a>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <!-- Chat Main -->
        <div class="chat-main">
            <?php if ($selected_chat): ?>
                <!-- Header -->
                <div class="chat-main-header">
                    <div class="chat-user-info">
                        <div class="chat-item-avatar" style="width: 36px; height: 36px; font-size: 14px;">
                            <?php echo strtoupper(substr($selected_user_name, 0, 1)); ?>
                        </div>
                        <div>
                            <div class="chat-user-name"><?php echo esc_html($selected_user_name); ?></div>
                            <div class="chat-user-id">ID: <?php echo esc_html($selected_chat); ?> &middot; <?php echo count($messages); ?> messaggi</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <a href="<?php echo admin_url('admin.php?page=rafflemania-users&user_id=' . $selected_chat); ?>" class="rafflemania-btn rafflemania-btn-secondary rafflemania-btn-sm">
                            <span class="dashicons dashicons-admin-users" style="font-size: 14px;"></span> Profilo
                        </a>
                        <form method="post" style="display:inline;" onsubmit="return confirm('Eliminare questa chat e tutti i suoi messaggi?');">
                            <?php wp_nonce_field('delete_chat_nonce'); ?>
                            <input type="hidden" name="chat_user_id" value="<?php echo esc_attr($selected_chat); ?>">
                            <button type="submit" name="delete_chat" class="rafflemania-btn rafflemania-btn-danger rafflemania-btn-sm">
                                <span class="dashicons dashicons-trash" style="font-size: 14px;"></span> Pulisci Chat
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Messages -->
                <div class="chat-messages" id="messages-container">
                    <?php if (empty($messages)): ?>
                        <div style="text-align: center; color: #999; padding: 40px;">Nessun messaggio</div>
                    <?php else: ?>
                        <?php foreach ($messages as $msg): ?>
                            <div class="chat-message <?php echo $msg['sender_type'] === 'support' ? 'from-support' : 'from-user'; ?>">
                                <div>
                                    <div class="bubble"><?php echo esc_html($msg['text']); ?></div>
                                    <div class="msg-time">
                                        <?php
                                        if ($msg['timestamp']) {
                                            $date = new DateTime($msg['timestamp']);
                                            $date->setTimezone(new DateTimeZone('Europe/Rome'));
                                            echo $date->format('H:i');
                                        }
                                        ?>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>

                <!-- Reply Form -->
                <div class="chat-input-area">
                    <form method="post" class="chat-input-form">
                        <?php wp_nonce_field('send_support_message_nonce'); ?>
                        <input type="hidden" name="user_id" value="<?php echo esc_attr($selected_chat); ?>">
                        <input type="hidden" name="user_name" value="<?php echo esc_attr($selected_user_name); ?>">
                        <textarea name="message" placeholder="Scrivi un messaggio..." required rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.form.submit();}"></textarea>
                        <button type="submit" name="send_support_message">Invia</button>
                    </form>
                </div>
            <?php else: ?>
                <div class="chat-empty-state">
                    <div>
                        <span class="dashicons dashicons-format-chat"></span>
                        <p>Seleziona una chat dalla lista</p>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<script>
// Scroll to bottom of messages
var mc = document.getElementById('messages-container');
if (mc) mc.scrollTop = mc.scrollHeight;

// Auto-refresh every 30s
var refreshSeconds = 30;
var countdown = refreshSeconds;

function tick() {
    countdown--;
    if (countdown <= 0) location.reload();
}

setInterval(tick, 1000);

// Auto-dismiss toasts
setTimeout(function() {
    document.querySelectorAll('.rafflemania-toast').forEach(function(t) { t.style.display = 'none'; });
}, 4000);
</script>

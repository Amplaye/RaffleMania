<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Winners API Controller
 */
class WinnersController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'winners';

    public function register_routes() {
        // Get recent winners
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_winners'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Get winners for a prize
        register_rest_route($this->namespace, '/' . $this->rest_base . '/prize/(?P<prize_id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_winners_for_prize'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Claim prize
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)/claim', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'claim_prize'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'shipping_address' => [
                        'required' => true,
                        'type' => 'object'
                    ]
                ]
            ]
        ]);

        // Get delivery status for a winning ticket (by user)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/delivery-status/(?P<ticket_id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_delivery_status'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Mark prize as delivered (admin only)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)/deliver', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'deliver_prize'],
                'permission_callback' => [$this, 'check_admin']
            ]
        ]);
    }

    public function get_winners(WP_REST_Request $request) {
        global $wpdb;
        $table_winners = $wpdb->prefix . 'rafflemania_winners';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $limit = $request->get_param('limit') ?: 20;

        $winners = $wpdb->get_results($wpdb->prepare(
            "SELECT w.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
                    u.username, u.avatar_url, u.avatar_color
             FROM {$table_winners} w
             LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
             LEFT JOIN {$table_users} u ON w.user_id = u.id
             ORDER BY w.won_at DESC
             LIMIT %d",
            $limit
        ));

        $formatted = array_map([$this, 'format_winner'], $winners);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'winners' => $formatted,
                'total' => count($formatted)
            ]
        ]);
    }

    public function get_winners_for_prize(WP_REST_Request $request) {
        global $wpdb;
        $table_winners = $wpdb->prefix . 'rafflemania_winners';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $prize_id = $request->get_param('prize_id');
        $limit = $request->get_param('limit') ?: 10;

        $winners = $wpdb->get_results($wpdb->prepare(
            "SELECT w.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
                    u.username, u.avatar_url, u.avatar_color
             FROM {$table_winners} w
             LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
             LEFT JOIN {$table_users} u ON w.user_id = u.id
             WHERE w.prize_id = %d
             ORDER BY w.won_at DESC
             LIMIT %d",
            $prize_id,
            $limit
        ));

        $formatted = array_map([$this, 'format_winner'], $winners);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'winners' => $formatted,
                'total' => count($formatted)
            ]
        ]);
    }

    public function claim_prize(WP_REST_Request $request) {
        global $wpdb;
        $table_winners = $wpdb->prefix . 'rafflemania_winners';

        $user_id = $request->get_attribute('user_id');
        $winner_id = $request->get_param('id');
        $shipping_address = $request->get_param('shipping_address');

        // Check if winner exists and belongs to user
        $winner = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_winners} WHERE id = %d AND user_id = %d",
            $winner_id,
            $user_id
        ));

        if (!$winner) {
            return new WP_Error('not_found', 'Vincita non trovata', ['status' => 404]);
        }

        if ($winner->claimed) {
            return new WP_Error('already_claimed', 'Premio già riscosso', ['status' => 400]);
        }

        // Validate address
        $required_fields = ['fullName', 'address', 'city', 'postalCode', 'country'];
        foreach ($required_fields as $field) {
            if (empty($shipping_address[$field])) {
                return new WP_Error('invalid_address', "Campo '{$field}' mancante", ['status' => 400]);
            }
        }

        // Update winner record
        $wpdb->update($table_winners, [
            'claimed' => 1,
            'claimed_at' => current_time('mysql'),
            'shipping_address' => json_encode($shipping_address)
        ], ['id' => $winner_id]);

        // Send notification to admin
        $admin_email = get_option('admin_email');
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $prize = $wpdb->get_row($wpdb->prepare(
            "SELECT name FROM {$table_prizes} WHERE id = %d",
            $winner->prize_id
        ));

        wp_mail(
            $admin_email,
            'RaffleMania - Nuovo premio da spedire',
            "Un utente ha riscosso un premio!\n\n" .
            "Premio: {$prize->name}\n" .
            "Indirizzo:\n" .
            "{$shipping_address['fullName']}\n" .
            "{$shipping_address['address']}\n" .
            "{$shipping_address['postalCode']} {$shipping_address['city']}\n" .
            "{$shipping_address['country']}\n" .
            (isset($shipping_address['phone']) ? "Tel: {$shipping_address['phone']}" : '')
        );

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Premio riscosso con successo! Riceverai il premio all\'indirizzo indicato.'
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

    /**
     * Get delivery status for a winning ticket
     */
    public function get_delivery_status(WP_REST_Request $request) {
        global $wpdb;
        $table_winners = $wpdb->prefix . 'rafflemania_winners';

        $user_id = $request->get_attribute('user_id');
        $ticket_id = $request->get_param('ticket_id');

        $winner = $wpdb->get_row($wpdb->prepare(
            "SELECT id, delivery_status, delivered_at, won_at FROM {$table_winners} WHERE ticket_id = %d AND user_id = %d",
            $ticket_id,
            $user_id
        ));

        if (!$winner) {
            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'deliveryStatus' => 'processing',
                    'deliveredAt' => null
                ]
            ]);
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'deliveryStatus' => $winner->delivery_status ?: 'processing',
                'deliveredAt' => $winner->delivered_at
            ]
        ]);
    }

    /**
     * Mark prize as delivered - admin only
     * Sends email to winner + push notification
     */
    public function deliver_prize(WP_REST_Request $request) {
        global $wpdb;
        $table_winners = $wpdb->prefix . 'rafflemania_winners';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $winner_id = $request->get_param('id');
        $voucher_code = sanitize_text_field($request->get_param('voucher_code') ?: '');
        $delivery_notes = sanitize_textarea_field($request->get_param('delivery_notes') ?: '');

        $winner = $wpdb->get_row($wpdb->prepare(
            "SELECT w.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
                    u.username, u.email
             FROM {$table_winners} w
             LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
             LEFT JOIN {$table_users} u ON w.user_id = u.id
             WHERE w.id = %d",
            $winner_id
        ));

        if (!$winner) {
            return new WP_Error('not_found', 'Vincita non trovata', ['status' => 404]);
        }

        if (isset($winner->delivery_status) && $winner->delivery_status === 'delivered') {
            return new WP_Error('already_delivered', 'Premio gia consegnato', ['status' => 400]);
        }

        $update_data = [
            'delivery_status' => 'delivered',
            'delivered_at' => current_time('mysql'),
            'delivery_email_sent' => 1,
        ];
        if (!empty($voucher_code)) $update_data['voucher_code'] = $voucher_code;
        if (!empty($delivery_notes)) $update_data['delivery_notes'] = $delivery_notes;
        $wpdb->update($table_winners, $update_data, ['id' => $winner_id]);

        $this->send_delivery_email($winner->email, $winner->username, $winner->prize_name, $winner->prize_value, $winner->prize_image, $voucher_code, $delivery_notes);

        \RaffleMania\NotificationHelper::send_to_user(
            $winner->user_id,
            'Premio Consegnato!',
            "Il tuo premio \"{$winner->prize_name}\" e stato consegnato alla tua email! Controlla la tua casella di posta.",
            ['type' => 'prize_delivered', 'prize_id' => (string)$winner->prize_id]
        );

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Premio consegnato con successo! Email e notifica inviate al vincitore.'
        ]);
    }

    /**
     * Send delivery confirmation email with logo, prize details, voucher code
     */
    private function send_delivery_email($email, $username, $prize_name, $prize_value, $prize_image = '', $voucher_code = '', $delivery_notes = '') {
        // Get logo from WordPress media library
        $logo_attachment = get_posts([
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'posts_per_page' => 1,
            's' => 'logo',
            'orderby' => 'date',
            'order' => 'DESC',
        ]);
        $logo_url = !empty($logo_attachment) ? wp_get_attachment_url($logo_attachment[0]->ID) : 'https://www.rafflemania.it/wp-content/uploads/2026/02/rafflemania-icon.png';

        $prize_value_formatted = number_format($prize_value, 2, ',', '.');
        $year = date('Y');

        $prize_image_html = '';
        if (!empty($prize_image)) {
            $prize_image_html = "<img src='" . esc_url($prize_image) . "' alt='" . esc_attr($prize_name) . "' style='max-width: 200px; max-height: 200px; margin: 0 auto 16px; display: block; border-radius: 12px;' />";
        }

        $voucher_section = '';
        if (!empty($voucher_code)) {
            $voucher_section = "<tr><td style='padding: 0 40px 16px;'><div style='background: #FFF8F0; border: 2px dashed #FF6B00; border-radius: 12px; padding: 20px; text-align: center;'><div style='font-size: 14px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;'>Il tuo codice</div><div style='font-size: 28px; font-weight: 700; color: #FF6B00; letter-spacing: 2px; font-family: Courier New, monospace; word-break: break-all;'>{$voucher_code}</div></div></td></tr>";
        }

        $notes_section = '';
        if (!empty($delivery_notes)) {
            $escaped_notes = nl2br(esc_html($delivery_notes));
            $notes_section = "<tr><td style='padding: 0 40px 16px;'><div style='background: #f0f7ff; border-left: 4px solid #4A90D9; border-radius: 0 8px 8px 0; padding: 16px 20px;'><div style='font-size: 15px; font-weight: 600; color: #4A90D9; margin-bottom: 6px;'>Istruzioni</div><div style='font-size: 16px; color: #333; line-height: 1.5;'>{$escaped_notes}</div></div></td></tr>";
        }

        $subject = "RaffleMania - Il tuo premio \"{$prize_name}\" e stato consegnato!";
        $message = "<!DOCTYPE html><html lang='it'><head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;'>
<table role='presentation' cellspacing='0' cellpadding='0' border='0' width='100%' style='background-color:#f4f4f4;'>
<tr><td align='center' style='padding:20px 10px;'>
<table role='presentation' cellspacing='0' cellpadding='0' border='0' width='600' style='max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;'>
<tr><td style='padding:32px 40px;text-align:center;'>
<img src='{$logo_url}' alt='RaffleMania' width='160' height='160' style='width:160px;height:160px;border-radius:20px;display:block;margin:0 auto;'/>
</td></tr>
<tr><td style='padding:16px 40px 0;'>
<h2 style='color:#1a1a1a;margin:0 0 10px;font-size:26px;font-weight:700;'>Ciao {$username}!</h2>
<p style='color:#555;font-size:18px;line-height:1.6;margin:0;'>Ottime notizie! Il tuo premio e stato <strong style='color:#FF6B00;'>consegnato con successo</strong>.</p>
</td></tr>
<tr><td style='padding:24px 40px;'>
<table role='presentation' cellspacing='0' cellpadding='0' border='0' width='100%' style='border:2px solid #FFD700;border-radius:16px;overflow:hidden;'>
<tr><td style='padding:24px;text-align:center;'>
{$prize_image_html}
<div style='font-size:24px;font-weight:700;color:#FF6B00;margin-bottom:6px;'>{$prize_name}</div>
<div style='font-size:18px;color:#888;margin-bottom:16px;'>Valore: &euro;{$prize_value_formatted}</div>
<table role='presentation' cellspacing='0' cellpadding='0' border='0' align='center'><tr><td style='background-color:#00B894;color:#ffffff;padding:12px 32px;border-radius:24px;font-weight:700;font-size:16px;text-transform:uppercase;'>&#10003; Consegnato</td></tr></table>
</td></tr></table>
</td></tr>
{$voucher_section}
{$notes_section}
<tr><td style='padding:0 40px 32px;'><div style='background:#f9f9f9;border-radius:12px;padding:20px;text-align:center;'><p style='color:#666;font-size:16px;line-height:1.5;margin:0;'>Hai domande sul tuo premio? Contatta il nostro supporto direttamente dall'app RaffleMania.</p></div></td></tr>
<tr><td style='background-color:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #eee;'>
<p style='color:#aaa;font-size:13px;margin:0;'>&copy; {$year} RaffleMania. Tutti i diritti riservati.</p>
</td></tr>
</table></td></tr></table>
</body></html>";

        $headers = [
            'Content-Type: text/html; charset=UTF-8',
            'From: RaffleMania <noreply@rafflemania.it>',
            'Reply-To: supporto@rafflemania.it',
            'X-Mailer: RaffleMania/1.0',
            'MIME-Version: 1.0',
        ];

        $result = wp_mail($email, $subject, $message, $headers);

        if (!$result) {
            error_log("[RaffleMania] Failed to send delivery email to {$email}");
        } else {
            error_log("[RaffleMania] Delivery email sent to {$email} for prize {$prize_name}");
        }

        return $result;
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

    private function format_winner($winner) {
        return [
            'id' => (int) $winner->id,
            'userId' => (string) $winner->user_id,
            'username' => $winner->username,
            'avatarUrl' => $winner->avatar_url,
            'avatarColor' => $winner->avatar_color,
            'prizeId' => (string) $winner->prize_id,
            'prizeName' => $winner->prize_name,
            'prizeImage' => $winner->prize_image,
            'prizeValue' => (float) $winner->prize_value,
            'claimed' => (bool) $winner->claimed,
            'claimedAt' => $winner->claimed_at,
            'wonAt' => $winner->won_at,
            'deliveryStatus' => $winner->delivery_status ?? 'processing',
            'deliveredAt' => $winner->delivered_at ?? null,
        ];
    }
}

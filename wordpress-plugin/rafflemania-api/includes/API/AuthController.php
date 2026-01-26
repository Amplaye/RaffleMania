<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Authentication API Controller
 */
class AuthController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'auth';

    public function register_routes() {
        // Register
        register_rest_route($this->namespace, '/' . $this->rest_base . '/register', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'register'],
                'permission_callback' => '__return_true',
                'args' => [
                    'email' => [
                        'required' => true,
                        'type' => 'string',
                        'format' => 'email',
                        'sanitize_callback' => 'sanitize_email'
                    ],
                    'username' => [
                        'required' => true,
                        'type' => 'string',
                        'sanitize_callback' => 'sanitize_user'
                    ],
                    'password' => [
                        'required' => true,
                        'type' => 'string',
                        'minLength' => 6
                    ],
                    'referral_code' => [
                        'required' => false,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Login
        register_rest_route($this->namespace, '/' . $this->rest_base . '/login', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'login'],
                'permission_callback' => '__return_true',
                'args' => [
                    'email' => [
                        'required' => true,
                        'type' => 'string',
                        'sanitize_callback' => 'sanitize_email'
                    ],
                    'password' => [
                        'required' => true,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Logout
        register_rest_route($this->namespace, '/' . $this->rest_base . '/logout', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'logout'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Refresh token
        register_rest_route($this->namespace, '/' . $this->rest_base . '/refresh', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'refresh_token'],
                'permission_callback' => '__return_true',
                'args' => [
                    'refresh_token' => [
                        'required' => true,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Forgot password
        register_rest_route($this->namespace, '/' . $this->rest_base . '/forgot-password', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'forgot_password'],
                'permission_callback' => '__return_true',
                'args' => [
                    'email' => [
                        'required' => true,
                        'type' => 'string',
                        'format' => 'email'
                    ]
                ]
            ]
        ]);

        // Verify token
        register_rest_route($this->namespace, '/' . $this->rest_base . '/verify', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'verify_token'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);
    }

    public function register(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $email = $request->get_param('email');
        $username = $request->get_param('username');
        $password = $request->get_param('password');
        $referral_code = $request->get_param('referral_code');

        // Check if email exists
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM {$table_users} WHERE email = %s",
            $email
        ));

        if ($existing) {
            return new WP_Error('email_exists', 'Email già registrata', ['status' => 400]);
        }

        // Check if username exists
        $existing_username = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM {$table_users} WHERE username = %s",
            $username
        ));

        if ($existing_username) {
            return new WP_Error('username_exists', 'Username già in uso', ['status' => 400]);
        }

        // Generate unique referral code for new user
        $new_referral_code = $this->generate_referral_code();

        // Hash password
        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        // Process referral if provided
        $referred_by = null;
        if ($referral_code) {
            $referrer = $wpdb->get_row($wpdb->prepare(
                "SELECT id, referral_code FROM {$table_users} WHERE referral_code = %s",
                $referral_code
            ));
            if ($referrer) {
                $referred_by = $referral_code;
            }
        }

        // Insert user
        $result = $wpdb->insert($table_users, [
            'email' => $email,
            'username' => $username,
            'password_hash' => $password_hash,
            'referral_code' => $new_referral_code,
            'referred_by' => $referred_by,
            'credits' => $referred_by ? 10 : 0, // Bonus credits if referred
            'xp' => 0,
            'level' => 1,
            'current_streak' => 0,
            'avatar_color' => '#FF6B00',
            'is_active' => 1
        ]);

        if (!$result) {
            return new WP_Error('registration_failed', 'Registrazione fallita', ['status' => 500]);
        }

        $user_id = $wpdb->insert_id;

        // If referred, give bonus to referrer too
        if ($referred_by && isset($referrer)) {
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_users} SET credits = credits + 10 WHERE id = %d",
                $referrer->id
            ));

            // Record referral
            $table_referrals = $wpdb->prefix . 'rafflemania_referrals';
            $wpdb->insert($table_referrals, [
                'referrer_user_id' => $referrer->id,
                'referred_user_id' => $user_id,
                'referral_code' => $referral_code,
                'bonus_given' => 1
            ]);
        }

        // Generate tokens
        $tokens = $this->generate_tokens($user_id);

        // Get user data
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Registrazione completata',
            'data' => [
                'user' => $this->format_user($user),
                'tokens' => $tokens
            ]
        ], 201);
    }

    public function login(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $email = $request->get_param('email');
        $password = $request->get_param('password');

        // Find user
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE email = %s AND is_active = 1",
            $email
        ));

        if (!$user) {
            return new WP_Error('invalid_credentials', 'Credenziali non valide', ['status' => 401]);
        }

        // Verify password
        if (!password_verify($password, $user->password_hash)) {
            return new WP_Error('invalid_credentials', 'Credenziali non valide', ['status' => 401]);
        }

        // Generate tokens
        $tokens = $this->generate_tokens($user->id);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'user' => $this->format_user($user),
                'tokens' => $tokens
            ]
        ]);
    }

    public function logout(WP_REST_Request $request) {
        // In a real implementation, you would invalidate the token
        return new WP_REST_Response([
            'success' => true,
            'message' => 'Logout effettuato'
        ]);
    }

    public function refresh_token(WP_REST_Request $request) {
        $refresh_token = $request->get_param('refresh_token');

        // Verify refresh token
        $payload = $this->verify_jwt($refresh_token, 'refresh');
        if (is_wp_error($payload)) {
            return $payload;
        }

        // Generate new tokens
        $tokens = $this->generate_tokens($payload['user_id']);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'tokens' => $tokens
            ]
        ]);
    }

    public function forgot_password(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $email = $request->get_param('email');

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT id, email, username FROM {$table_users} WHERE email = %s",
            $email
        ));

        if (!$user) {
            // Don't reveal if email exists
            return new WP_REST_Response([
                'success' => true,
                'message' => 'Se l\'email esiste, riceverai le istruzioni per il reset'
            ]);
        }

        // Generate reset token
        $reset_token = bin2hex(random_bytes(32));
        $reset_expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

        // Store reset token (you'd need a column for this)
        update_user_meta($user->id, 'rafflemania_reset_token', $reset_token);
        update_user_meta($user->id, 'rafflemania_reset_expiry', $reset_expiry);

        // Send email
        $reset_link = home_url('/reset-password?token=' . $reset_token);
        wp_mail(
            $email,
            'Reset Password - RaffleMania',
            "Ciao {$user->username},\n\nHai richiesto il reset della password.\n\nClicca qui: {$reset_link}\n\nIl link scade tra 1 ora."
        );

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Se l\'email esiste, riceverai le istruzioni per il reset'
        ]);
    }

    public function verify_token(WP_REST_Request $request) {
        $user_id = $request->get_attribute('user_id');

        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE id = %d AND is_active = 1",
            $user_id
        ));

        if (!$user) {
            return new WP_Error('user_not_found', 'Utente non trovato', ['status' => 404]);
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'user' => $this->format_user($user),
                'valid' => true
            ]
        ]);
    }

    public function check_auth(WP_REST_Request $request) {
        $auth_header = $request->get_header('Authorization');

        if (!$auth_header || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            return false;
        }

        $token = $matches[1];
        $payload = $this->verify_jwt($token, 'access');

        if (is_wp_error($payload)) {
            return false;
        }

        // Store user_id in request for later use
        $request->set_attribute('user_id', $payload['user_id']);
        return true;
    }

    private function generate_tokens($user_id) {
        $secret_key = $this->get_secret_key();

        // Access token (1 hour)
        $access_payload = [
            'user_id' => $user_id,
            'type' => 'access',
            'iat' => time(),
            'exp' => time() + (60 * 60) // 1 hour
        ];

        // Refresh token (30 days)
        $refresh_payload = [
            'user_id' => $user_id,
            'type' => 'refresh',
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24 * 30) // 30 days
        ];

        return [
            'access_token' => $this->create_jwt($access_payload, $secret_key),
            'refresh_token' => $this->create_jwt($refresh_payload, $secret_key . '_refresh'),
            'expires_in' => 3600
        ];
    }

    private function create_jwt($payload, $secret) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload_json = json_encode($payload);

        $base64_header = $this->base64url_encode($header);
        $base64_payload = $this->base64url_encode($payload_json);

        $signature = hash_hmac('sha256', $base64_header . '.' . $base64_payload, $secret, true);
        $base64_signature = $this->base64url_encode($signature);

        return $base64_header . '.' . $base64_payload . '.' . $base64_signature;
    }

    private function verify_jwt($token, $type = 'access') {
        $secret = $this->get_secret_key();
        if ($type === 'refresh') {
            $secret .= '_refresh';
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

        if ($payload['type'] !== $type) {
            return new WP_Error('invalid_token_type', 'Tipo di token non valido', ['status' => 401]);
        }

        return $payload;
    }

    private function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64url_decode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    private function get_secret_key() {
        $key = get_option('rafflemania_jwt_secret');
        if (!$key) {
            $key = bin2hex(random_bytes(32));
            update_option('rafflemania_jwt_secret', $key);
        }
        return $key;
    }

    private function generate_referral_code() {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = 'RAF';
        for ($i = 0; $i < 3; $i++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $code .= strtoupper(substr(base_convert(time(), 10, 36), -4));
        return $code;
    }

    private function format_user($user) {
        return [
            'id' => (int) $user->id,
            'email' => $user->email,
            'username' => $user->username,
            'avatarUrl' => $user->avatar_url,
            'avatarColor' => $user->avatar_color,
            'credits' => (int) $user->credits,
            'xp' => (int) $user->xp,
            'level' => (int) $user->level,
            'currentStreak' => (int) $user->current_streak,
            'lastStreakDate' => $user->last_streak_date,
            'referralCode' => $user->referral_code,
            'createdAt' => $user->created_at
        ];
    }
}

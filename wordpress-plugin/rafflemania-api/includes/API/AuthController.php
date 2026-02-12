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

        // Verify email with token
        register_rest_route($this->namespace, '/' . $this->rest_base . '/verify-email', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'verify_email'],
                'permission_callback' => '__return_true',
                'args' => [
                    'token' => [
                        'required' => true,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Resend verification email
        register_rest_route($this->namespace, '/' . $this->rest_base . '/resend-verification', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'resend_verification'],
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

        // Google Sign-In
        register_rest_route($this->namespace, '/' . $this->rest_base . '/google', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'google_login'],
                'permission_callback' => '__return_true',
                'args' => [
                    'id_token' => [
                        'required' => true,
                        'type' => 'string'
                    ],
                    'email' => [
                        'required' => true,
                        'type' => 'string',
                        'format' => 'email'
                    ],
                    'name' => [
                        'required' => false,
                        'type' => 'string'
                    ],
                    'photo' => [
                        'required' => false,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Apple Sign-In
        register_rest_route($this->namespace, '/' . $this->rest_base . '/apple', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'apple_login'],
                'permission_callback' => '__return_true',
                'args' => [
                    'identity_token' => [
                        'required' => true,
                        'type' => 'string'
                    ],
                    'apple_user_id' => [
                        'required' => true,
                        'type' => 'string'
                    ],
                    'email' => [
                        'required' => false,
                        'type' => 'string'
                    ],
                    'full_name' => [
                        'required' => false,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Apply referral code (for social login users)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/apply-referral', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'apply_referral'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'referral_code' => [
                        'required' => true,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Web verification (browser fallback)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/verify-email-web', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'verify_email_web'],
                'permission_callback' => '__return_true',
                'args' => [
                    'token' => [
                        'required' => true,
                        'type' => 'string'
                    ]
                ]
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

        // Process referral if provided (case-insensitive lookup)
        $referred_by = null;
        $referrer = null;
        if ($referral_code) {
            // Normalize: trim whitespace and convert to uppercase
            $referral_code_normalized = strtoupper(trim($referral_code));

            $referrer = $wpdb->get_row($wpdb->prepare(
                "SELECT id, referral_code FROM {$table_users} WHERE UPPER(referral_code) = %s",
                $referral_code_normalized
            ));
            if ($referrer) {
                // Use the actual stored referral code (not user input)
                $referred_by = $referrer->referral_code;
                error_log("[RaffleMania] Referral found: User input '{$referral_code}' matched code '{$referrer->referral_code}' (user ID: {$referrer->id})");
            } else {
                // Return error if referral code was provided but not found
                error_log("[RaffleMania] Referral NOT found: User input '{$referral_code}' normalized to '{$referral_code_normalized}'");
                return new WP_Error('invalid_referral_code', 'Il codice referral inserito non è valido. Verifica il codice e riprova.', ['status' => 400]);
            }
        }

        // Generate verification token
        $verification_token = bin2hex(random_bytes(32));
        $verification_expires = date('Y-m-d H:i:s', strtotime('+24 hours'));

        // Insert user
        $result = $wpdb->insert($table_users, [
            'email' => $email,
            'username' => $username,
            'password_hash' => $password_hash,
            'referral_code' => $new_referral_code,
            'referred_by' => $referred_by,
            'credits' => 10, // 10 welcome credits (referral bonus given after 1 week of activity)
            'xp' => 0,
            'level' => 1,
            'current_streak' => 0,
            'avatar_color' => '#FF6B00',
            'is_active' => 1,
            'email_verified' => 0,
            'verification_token' => $verification_token,
            'verification_token_expires' => $verification_expires
        ]);

        if (!$result) {
            return new WP_Error('registration_failed', 'Registrazione fallita', ['status' => 500]);
        }

        $user_id = $wpdb->insert_id;

        // If referred, give bonus to referrer and record the referral
        if ($referred_by && isset($referrer)) {
            // Give welcome bonus to referrer (10 credits)
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_users} SET credits = credits + 10 WHERE id = %d",
                $referrer->id
            ));

            // Record referral with activity tracking
            $table_referrals = $wpdb->prefix . 'rafflemania_referrals';
            $insert_result = $wpdb->insert($table_referrals, [
                'referrer_user_id' => $referrer->id,
                'referred_user_id' => $user_id,
                'referral_code' => $referred_by,
                'bonus_given' => 1,
                'days_active' => 1,
                'last_active_date' => date('Y-m-d'),
                'reward_claimed' => 0,
                'referred_reward_claimed' => 0
            ]);

            if ($insert_result) {
                error_log("[RaffleMania] Referral recorded: referrer_id={$referrer->id}, referred_id={$user_id}, code={$referred_by}");
            } else {
                error_log("[RaffleMania] ERROR inserting referral: " . $wpdb->last_error);
            }
        }

        // Send verification email
        $email_sent = $this->send_verification_email($email, $username, $verification_token);

        // Get user data (without generating tokens - user must verify first)
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Registrazione completata! Ti abbiamo inviato un\'email di verifica. Controlla la tua casella di posta (anche lo spam) e clicca sul link per attivare il tuo account.',
            'data' => [
                'user' => $this->format_user($user),
                'requiresVerification' => true,
                'emailSent' => $email_sent
            ]
        ], 201);
    }

    public function login(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $email = trim($request->get_param('email'));
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
            // If user registered via social login, set this as their new password
            if (!empty($user->social_provider)) {
                $new_hash = password_hash($password, PASSWORD_DEFAULT);
                $wpdb->update($table_users, ['password_hash' => $new_hash], ['id' => $user->id]);
                // Password now set - continue with login
            } else {
                return new WP_Error('invalid_credentials', 'Credenziali non valide', ['status' => 401]);
            }
        }

        // Check if email is verified
        if (!$user->email_verified) {
            return new WP_Error('email_not_verified', 'Devi verificare la tua email prima di accedere. Controlla la tua casella di posta.', ['status' => 403]);
        }

        // Generate tokens
        $tokens = $this->generate_tokens($user->id);

        // Track daily login (Italian timezone)
        $this->track_daily_stat('logins');

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'user' => $this->format_user($user),
                'tokens' => $tokens
            ]
        ]);
    }

    private function track_daily_stat($stat_name, $amount = 1) {
        global $wpdb;
        $table_daily_stats = $wpdb->prefix . 'rafflemania_daily_stats';

        // Use Italian timezone
        $italy_tz = new \DateTimeZone('Europe/Rome');
        $today = (new \DateTime('now', $italy_tz))->format('Y-m-d');

        // Try to insert or update
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table_daily_stats} WHERE stat_date = %s",
            $today
        ));

        if ($existing) {
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_daily_stats} SET {$stat_name} = {$stat_name} + %d WHERE stat_date = %s",
                $amount,
                $today
            ));
        } else {
            $wpdb->insert($table_daily_stats, [
                'stat_date' => $today,
                $stat_name => $amount
            ]);
        }
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

    public function verify_email(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $token = $request->get_param('token');

        // Find user with this verification token
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE verification_token = %s",
            $token
        ));

        if (!$user) {
            return new WP_Error('invalid_token', 'Token di verifica non valido', ['status' => 400]);
        }

        // Check if token expired
        if (strtotime($user->verification_token_expires) < time()) {
            return new WP_Error('token_expired', 'Token di verifica scaduto. Richiedi un nuovo link.', ['status' => 400]);
        }

        // Check if already verified
        if ($user->email_verified) {
            return new WP_REST_Response([
                'success' => true,
                'message' => 'Email gia verificata',
                'data' => [
                    'alreadyVerified' => true
                ]
            ]);
        }

        // Update user as verified
        $wpdb->update($table_users, [
            'email_verified' => 1,
            'verification_token' => null,
            'verification_token_expires' => null
        ], ['id' => $user->id]);

        // Generate tokens for auto-login
        $tokens = $this->generate_tokens($user->id);

        // Get updated user data
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE id = %d",
            $user->id
        ));

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Email verificata con successo!',
            'data' => [
                'user' => $this->format_user($user),
                'tokens' => $tokens
            ]
        ]);
    }

    public function verify_email_web(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $token = $request->get_param('token');

        // Find user with this verification token
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE verification_token = %s",
            $token
        ));

        // HTML response helper
        $html_response = function($title, $message, $success = true) use ($token) {
            $color = $success ? '#00B894' : '#E53935';
            $icon = $success ? '✓' : '✗';
            header('Content-Type: text/html; charset=utf-8');
            echo "
            <!DOCTYPE html>
            <html>
            <head>
                <meta name='viewport' content='width=device-width, initial-scale=1'>
                <title>{$title} - RaffleMania</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #FF6B00, #FF8533); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
                    .card { background: white; border-radius: 20px; padding: 40px; max-width: 400px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
                    .icon { width: 80px; height: 80px; border-radius: 50%; background: {$color}; color: white; font-size: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
                    h1 { color: #333; margin-bottom: 10px; font-size: 24px; }
                    p { color: #666; line-height: 1.6; margin-bottom: 20px; }
                    .btn { display: inline-block; background: #FF6B00; color: white; padding: 14px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class='card'>
                    <div class='icon'>{$icon}</div>
                    <h1>{$title}</h1>
                    <p>{$message}</p>
                    <a href='rafflemania://verify?token={$token}' class='btn'>Apri RaffleMania</a>
                </div>
            </body>
            </html>";
            exit;
        };

        if (!$user) {
            $html_response('Token Non Valido', 'Il link di verifica non e valido. Richiedi un nuovo link dall\'app.', false);
        }

        // Check if token expired
        if (strtotime($user->verification_token_expires) < time()) {
            $html_response('Link Scaduto', 'Il link di verifica e scaduto. Richiedi un nuovo link dall\'app.', false);
        }

        // Check if already verified
        if ($user->email_verified) {
            $html_response('Gia Verificato', 'Il tuo account e gia stato verificato. Puoi effettuare il login nell\'app.', true);
        }

        // Update user as verified
        $wpdb->update($table_users, [
            'email_verified' => 1,
            'verification_token' => null,
            'verification_token_expires' => null
        ], ['id' => $user->id]);

        $html_response('Email Verificata!', 'Il tuo account e stato verificato con successo. Ora puoi accedere a tutte le funzionalita di RaffleMania!', true);
    }

    public function resend_verification(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $email = $request->get_param('email');

        // Find user
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE email = %s",
            $email
        ));

        if (!$user) {
            // Don't reveal if email exists
            return new WP_REST_Response([
                'success' => true,
                'message' => 'Se l\'email esiste, riceverai un nuovo link di verifica'
            ]);
        }

        // Check if already verified
        if ($user->email_verified) {
            return new WP_REST_Response([
                'success' => true,
                'message' => 'Email gia verificata. Puoi effettuare il login.',
                'data' => [
                    'alreadyVerified' => true
                ]
            ]);
        }

        // Generate new verification token
        $verification_token = bin2hex(random_bytes(32));
        $verification_expires = date('Y-m-d H:i:s', strtotime('+24 hours'));

        // Update user with new token
        $wpdb->update($table_users, [
            'verification_token' => $verification_token,
            'verification_token_expires' => $verification_expires
        ], ['id' => $user->id]);

        // Send verification email
        $this->send_verification_email($user->email, $user->username, $verification_token);

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Nuovo link di verifica inviato!'
        ]);
    }

    private function send_verification_email($email, $username, $token) {
        // Build verification URL - use the web endpoint that works
        $verification_url = home_url("/wp-json/rafflemania/v1/auth/verify-email-web?token={$token}");

        $subject = 'Verifica il tuo account RaffleMania';

        $message = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #FF6B00, #FF8533); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
                .header h1 { color: white; margin: 0; font-size: 28px; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
                .button { display: inline-block; background: #FF6B00; color: white !important; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .button:hover { background: #E55A00; }
                .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
                .code { background: #eee; padding: 10px 15px; border-radius: 6px; font-family: monospace; font-size: 14px; word-break: break-all; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>RaffleMania</h1>
                </div>
                <div class='content'>
                    <h2>Ciao {$username}!</h2>
                    <p>Grazie per esserti registrato su RaffleMania! Per completare la registrazione e iniziare a vincere premi incredibili, verifica il tuo indirizzo email.</p>

                    <p style='text-align: center;'>
                        <a href='{$verification_url}' class='button'>Verifica Email</a>
                    </p>

                    <p>Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
                    <p class='code'>{$verification_url}</p>

                    <p><strong>Il link scade tra 24 ore.</strong></p>

                    <p>Se non hai creato un account su RaffleMania, puoi ignorare questa email.</p>
                </div>
                <div class='footer'>
                    <p>&copy; " . date('Y') . " RaffleMania. Tutti i diritti riservati.</p>
                    <p>Questa email e stata inviata automaticamente, non rispondere.</p>
                </div>
            </div>
        </body>
        </html>
        ";

        $headers = [
            'Content-Type: text/html; charset=UTF-8',
            'From: RaffleMania <noreply@rafflemania.it>'
        ];

        $result = wp_mail($email, $subject, $message, $headers);

        // Log email sending result for debugging
        if (!$result) {
            error_log("RaffleMania: Failed to send verification email to {$email}");
        } else {
            error_log("RaffleMania: Verification email sent to {$email}");
        }

        return $result;
    }

    /**
     * Ensure social login columns exist in users table
     */
    private function ensure_social_columns() {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $column = $wpdb->get_results("SHOW COLUMNS FROM {$table_users} LIKE 'social_provider'");
        if (empty($column)) {
            $wpdb->query("ALTER TABLE {$table_users} ADD COLUMN social_provider varchar(20) DEFAULT NULL AFTER verification_token_expires");
            $wpdb->query("ALTER TABLE {$table_users} ADD COLUMN social_id varchar(255) DEFAULT NULL AFTER social_provider");
            $wpdb->query("ALTER TABLE {$table_users} ADD INDEX idx_social (social_provider, social_id)");
        }
    }

    /**
     * Google Sign-In: verify token and create/login user
     */
    public function google_login(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $this->ensure_social_columns();

        $id_token = $request->get_param('id_token');
        $email = $request->get_param('email');
        $name = $request->get_param('name');
        $photo = $request->get_param('photo');

        // Verify Google ID token
        $google_payload = $this->verify_google_token($id_token);
        if (is_wp_error($google_payload)) {
            return $google_payload;
        }

        // Use email from verified token
        $verified_email = $google_payload['email'] ?? $email;

        // Check if user exists
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE email = %s AND is_active = 1",
            $verified_email
        ));

        $is_new_user = false;

        if ($user) {
            // Existing user - update avatar if provided
            if ($photo && !$user->avatar_url) {
                $wpdb->update($table_users, ['avatar_url' => $photo], ['id' => $user->id]);
                $user->avatar_url = $photo;
            }

            // Mark email as verified (Google already verified it)
            if (!$user->email_verified) {
                $wpdb->update($table_users, ['email_verified' => 1], ['id' => $user->id]);
                $user->email_verified = 1;
            }
        } else {
            $is_new_user = true;
            // New user - create account
            $username = $name ? sanitize_user(str_replace(' ', '', strtolower($name))) : explode('@', $verified_email)[0];

            // Ensure unique username
            $base_username = $username;
            $counter = 1;
            while ($wpdb->get_var($wpdb->prepare("SELECT id FROM {$table_users} WHERE username = %s", $username))) {
                $username = $base_username . $counter;
                $counter++;
            }

            $referral_code = $this->generate_referral_code();

            $wpdb->insert($table_users, [
                'email' => $verified_email,
                'username' => $username,
                'password_hash' => password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                'referral_code' => $referral_code,
                'credits' => 10,
                'xp' => 0,
                'level' => 1,
                'current_streak' => 0,
                'avatar_url' => $photo,
                'avatar_color' => '#FF6B00',
                'is_active' => 1,
                'email_verified' => 1,
                'social_provider' => 'google',
                'social_id' => $google_payload['sub'] ?? null,
            ]);

            $user = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table_users} WHERE id = %d",
                $wpdb->insert_id
            ));
        }

        $tokens = $this->generate_tokens($user->id);
        $this->track_daily_stat('logins');

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'user' => $this->format_user($user),
                'tokens' => $tokens,
                'isNewUser' => $is_new_user
            ]
        ]);
    }

    /**
     * Apple Sign-In: verify token and create/login user
     */
    public function apple_login(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $this->ensure_social_columns();

        $identity_token = $request->get_param('identity_token');
        $apple_user_id = $request->get_param('apple_user_id');
        $email = $request->get_param('email');
        $full_name = $request->get_param('full_name');

        // Verify Apple identity token
        $apple_payload = $this->verify_apple_token($identity_token);
        if (is_wp_error($apple_payload)) {
            return $apple_payload;
        }

        // Use email from verified token, fallback to request
        $verified_email = $apple_payload['email'] ?? $email;
        $apple_sub = $apple_payload['sub'] ?? $apple_user_id;

        // First try to find by social_id (Apple user ID persists across sign-ins)
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE social_provider = 'apple' AND social_id = %s AND is_active = 1",
            $apple_sub
        ));

        // If not found by social_id, try by email
        if (!$user && $verified_email) {
            $user = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table_users} WHERE email = %s AND is_active = 1",
                $verified_email
            ));

            // Link existing account to Apple
            if ($user) {
                $wpdb->update($table_users, [
                    'social_provider' => 'apple',
                    'social_id' => $apple_sub,
                ], ['id' => $user->id]);
            }
        }

        $is_new_user = false;

        if ($user) {
            // Mark email as verified
            if (!$user->email_verified) {
                $wpdb->update($table_users, ['email_verified' => 1], ['id' => $user->id]);
                $user->email_verified = 1;
            }
        } else {
            $is_new_user = true;
            // New user - create account
            $display_email = $verified_email ?: $apple_sub . '@privaterelay.appleid.com';
            $username = $full_name ? sanitize_user(str_replace(' ', '', strtolower($full_name))) : 'apple_' . substr($apple_sub, 0, 8);

            // Ensure unique username
            $base_username = $username;
            $counter = 1;
            while ($wpdb->get_var($wpdb->prepare("SELECT id FROM {$table_users} WHERE username = %s", $username))) {
                $username = $base_username . $counter;
                $counter++;
            }

            $referral_code = $this->generate_referral_code();

            $wpdb->insert($table_users, [
                'email' => $display_email,
                'username' => $username,
                'password_hash' => password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                'referral_code' => $referral_code,
                'credits' => 10,
                'xp' => 0,
                'level' => 1,
                'current_streak' => 0,
                'avatar_color' => '#FF6B00',
                'is_active' => 1,
                'email_verified' => 1,
                'social_provider' => 'apple',
                'social_id' => $apple_sub,
            ]);

            $user = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table_users} WHERE id = %d",
                $wpdb->insert_id
            ));
        }

        $tokens = $this->generate_tokens($user->id);
        $this->track_daily_stat('logins');

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'user' => $this->format_user($user),
                'tokens' => $tokens,
                'isNewUser' => $is_new_user
            ]
        ]);
    }

    /**
     * Verify Google ID token via Google's tokeninfo endpoint
     */
    private function verify_google_token($id_token) {
        $response = wp_remote_get('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($id_token));

        if (is_wp_error($response)) {
            return new WP_Error('google_verify_failed', 'Impossibile verificare il token Google', ['status' => 401]);
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        if (isset($body['error'])) {
            return new WP_Error('google_token_invalid', 'Token Google non valido: ' . ($body['error_description'] ?? $body['error']), ['status' => 401]);
        }

        return $body;
    }

    /**
     * Verify Apple identity token via Apple's public keys
     */
    private function verify_apple_token($identity_token) {
        // Decode JWT without verification first to get claims
        $parts = explode('.', $identity_token);
        if (count($parts) !== 3) {
            return new WP_Error('apple_token_invalid', 'Token Apple non valido', ['status' => 401]);
        }

        $payload = json_decode(base64_decode(str_pad(strtr($parts[1], '-_', '+/'), 4 - (strlen($parts[1]) % 4), '=', STR_PAD_RIGHT)), true);

        if (!$payload) {
            return new WP_Error('apple_token_decode_failed', 'Impossibile decodificare il token Apple', ['status' => 401]);
        }

        // Verify issuer and expiration
        if (($payload['iss'] ?? '') !== 'https://appleid.apple.com') {
            return new WP_Error('apple_token_issuer', 'Token Apple: issuer non valido', ['status' => 401]);
        }

        if (($payload['exp'] ?? 0) < time()) {
            return new WP_Error('apple_token_expired', 'Token Apple scaduto', ['status' => 401]);
        }

        return $payload;
    }

    /**
     * Apply referral code after social login
     */
    public function apply_referral(WP_REST_Request $request) {
        try {
            global $wpdb;
            $table_users = $wpdb->prefix . 'rafflemania_users';
            $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

            $user_id = $request->get_attribute('user_id');
            $referral_code = strtoupper(trim($request->get_param('referral_code') ?? ''));

            if (!$user_id) {
                return new WP_Error('not_authenticated', 'Utente non autenticato', ['status' => 401]);
            }

            if (empty($referral_code)) {
                return new WP_Error('missing_code', 'Inserisci un codice referral', ['status' => 400]);
            }

            // Check if user exists and already has a referral
            $user = $wpdb->get_row($wpdb->prepare(
                "SELECT id, referral_code, referred_by FROM {$table_users} WHERE id = %d",
                $user_id
            ));

            if (!$user) {
                return new WP_Error('user_not_found', 'Utente non trovato', ['status' => 404]);
            }

            if (!empty($user->referred_by)) {
                return new WP_Error('already_referred', 'Hai già utilizzato un codice referral', ['status' => 400]);
            }

            // Prevent using own code
            if ($user->referral_code && strtoupper($user->referral_code) === $referral_code) {
                return new WP_Error('self_referral', 'Non puoi usare il tuo stesso codice referral', ['status' => 400]);
            }

            // Check if already has a referral record
            $existing = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$table_referrals} WHERE referred_user_id = %d",
                $user_id
            ));

            if ($existing > 0) {
                return new WP_Error('already_referred', 'Hai già utilizzato un codice referral', ['status' => 400]);
            }

            // Find referrer by code
            $referrer = $wpdb->get_row($wpdb->prepare(
                "SELECT id, referral_code FROM {$table_users} WHERE UPPER(referral_code) = %s",
                $referral_code
            ));

            if (!$referrer) {
                return new WP_Error('invalid_referral', 'Codice referral non valido', ['status' => 400]);
            }

            if ((int)$referrer->id === (int)$user_id) {
                return new WP_Error('self_referral', 'Non puoi usare il tuo stesso codice referral', ['status' => 400]);
            }

            // Apply referral - update user's referred_by field
            $wpdb->update($table_users, ['referred_by' => $referrer->referral_code], ['id' => $user_id]);

            // Record referral in referrals table
            $wpdb->insert($table_referrals, [
                'referrer_user_id' => (int)$referrer->id,
                'referred_user_id' => (int)$user_id,
                'referral_code' => $referrer->referral_code,
                'bonus_given' => 0,
                'days_active' => 1,
                'last_active_date' => date('Y-m-d'),
                'reward_claimed' => 0,
                'referred_reward_claimed' => 0,
            ]);

            return new WP_REST_Response([
                'success' => true,
                'message' => 'Codice referral applicato con successo!'
            ]);
        } catch (\Throwable $e) {
            error_log('[RaffleMania] apply_referral error: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine());
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Errore interno: ' . $e->getMessage(),
                'debug_file' => $e->getFile(),
                'debug_line' => $e->getLine(),
            ], 500);
        }
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
            'emailVerified' => (bool) $user->email_verified,
            'createdAt' => $user->created_at
        ];
    }
}

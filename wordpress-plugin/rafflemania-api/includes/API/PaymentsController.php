<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Payments API Controller
 * Handles IAP verification (Apple/Google) and Stripe payments
 */
class PaymentsController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'payments';

    public function register_routes() {
        // Verify IAP receipt (Apple/Google)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/verify-iap', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'verify_iap'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'platform' => [
                        'required' => true,
                        'type' => 'string',
                        'enum' => ['apple', 'google'],
                    ],
                    'receipt_data' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                    'product_id' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                    'transaction_id' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                ],
            ],
        ]);

        // Create Stripe PaymentIntent
        register_rest_route($this->namespace, '/' . $this->rest_base . '/create-intent', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'create_stripe_intent'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'package_id' => [
                        'required' => true,
                        'type' => 'string',
                    ],
                ],
            ],
        ]);

        // Stripe webhook (public, signature verified)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/stripe-webhook', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'handle_stripe_webhook'],
                'permission_callback' => '__return_true',
            ],
        ]);

        // Payment history
        register_rest_route($this->namespace, '/' . $this->rest_base . '/history', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_payment_history'],
                'permission_callback' => [$this, 'check_auth'],
            ],
        ]);

        // Restore IAP purchases
        register_rest_route($this->namespace, '/' . $this->rest_base . '/restore', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'restore_purchases'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'platform' => [
                        'required' => true,
                        'type' => 'string',
                        'enum' => ['apple', 'google'],
                    ],
                    'receipts' => [
                        'required' => true,
                        'type' => 'array',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Verify IAP receipt and award credits
     */
    public function verify_iap(WP_REST_Request $request) {
        global $wpdb;
        $table_payments = $wpdb->prefix . 'rafflemania_payments';

        $user_id = $request->get_param('_auth_user_id');
        $platform = $request->get_param('platform');
        $receipt_data = $request->get_param('receipt_data');
        $product_id = $request->get_param('product_id');
        $transaction_id = $request->get_param('transaction_id');

        // Idempotency: check if transaction already processed
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id, status FROM {$table_payments} WHERE transaction_id = %s",
            $transaction_id
        ));

        if ($existing) {
            if ($existing->status === 'verified') {
                return new WP_REST_Response([
                    'success' => true,
                    'data' => ['already_processed' => true, 'payment_id' => (string)$existing->id],
                ]);
            }
            // If failed previously, allow retry
        }

        // Get package info from product_id
        $package = $this->get_package_by_product_id($product_id);
        if (!$package) {
            return new WP_Error('invalid_product', 'Prodotto non trovato', ['status' => 400]);
        }

        // Create pending payment record
        $payment_data = [
            'user_id' => $user_id,
            'package_id' => $package->id,
            'payment_method' => $platform === 'apple' ? 'apple_iap' : 'google_iap',
            'transaction_id' => $transaction_id,
            'receipt_data' => $receipt_data,
            'amount' => $package->price,
            'credits_awarded' => $package->credits,
            'status' => 'pending',
        ];

        if ($existing) {
            $wpdb->update($table_payments, $payment_data, ['id' => $existing->id]);
            $payment_id = $existing->id;
        } else {
            $wpdb->insert($table_payments, $payment_data);
            $payment_id = $wpdb->insert_id;
        }

        // Verify receipt with Apple/Google
        $verification_result = $platform === 'apple'
            ? $this->verify_apple_receipt($receipt_data, $product_id)
            : $this->verify_google_purchase($receipt_data, $product_id, $transaction_id);

        if ($verification_result['valid']) {
            // Award credits atomically
            $this->award_credits($user_id, $package->credits, $payment_id, $product_id);

            $wpdb->update($table_payments, [
                'status' => 'verified',
                'verified_at' => current_time('mysql'),
                'verification_response' => json_encode($verification_result['response']),
            ], ['id' => $payment_id]);

            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'payment_id' => (string)$payment_id,
                    'credits_awarded' => (int)$package->credits,
                ],
            ]);
        } else {
            $wpdb->update($table_payments, [
                'status' => 'failed',
                'verification_response' => json_encode($verification_result['response'] ?? ['error' => $verification_result['error']]),
            ], ['id' => $payment_id]);

            error_log('[RaffleMania Payments] IAP verification failed for user ' . $user_id . ': ' . ($verification_result['error'] ?? 'unknown'));

            return new WP_Error('verification_failed', 'Verifica pagamento fallita: ' . ($verification_result['error'] ?? 'errore sconosciuto'), ['status' => 400]);
        }
    }

    /**
     * Create Stripe PaymentIntent
     */
    public function create_stripe_intent(WP_REST_Request $request) {
        global $wpdb;

        $user_id = $request->get_param('_auth_user_id');
        $package_id = $request->get_param('package_id');

        // Get package
        $table_packages = $wpdb->prefix . 'rafflemania_shop_packages';
        $package = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_packages} WHERE id = %d AND is_active = 1",
            $package_id
        ));

        if (!$package) {
            return new WP_Error('package_not_found', 'Pacchetto non trovato', ['status' => 404]);
        }

        $stripe_secret = get_option('rafflemania_stripe_secret_key');
        if (empty($stripe_secret)) {
            return new WP_Error('stripe_not_configured', 'Stripe non configurato', ['status' => 500]);
        }

        // Get user email for Stripe
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT email, display_name FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        $amount_cents = (int)round($package->price * 100);

        // Create PaymentIntent via Stripe API
        $response = wp_remote_post('https://api.stripe.com/v1/payment_intents', [
            'headers' => [
                'Authorization' => 'Bearer ' . $stripe_secret,
                'Content-Type' => 'application/x-www-form-urlencoded',
            ],
            'body' => http_build_query([
                'amount' => $amount_cents,
                'currency' => 'eur',
                'metadata[user_id]' => $user_id,
                'metadata[package_id]' => $package_id,
                'metadata[credits]' => $package->credits,
                'receipt_email' => $user->email ?? '',
                'description' => 'RaffleMania - ' . $package->credits . ' crediti',
            ]),
        ]);

        if (is_wp_error($response)) {
            error_log('[RaffleMania Payments] Stripe API error: ' . $response->get_error_message());
            return new WP_Error('stripe_error', 'Errore creazione pagamento', ['status' => 500]);
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        if (isset($body['error'])) {
            error_log('[RaffleMania Payments] Stripe error: ' . json_encode($body['error']));
            return new WP_Error('stripe_error', $body['error']['message'] ?? 'Errore Stripe', ['status' => 400]);
        }

        // Create pending payment record
        $table_payments = $wpdb->prefix . 'rafflemania_payments';
        $wpdb->insert($table_payments, [
            'user_id' => $user_id,
            'package_id' => $package_id,
            'payment_method' => 'stripe',
            'transaction_id' => $body['id'],
            'amount' => $package->price,
            'credits_awarded' => $package->credits,
            'status' => 'pending',
        ]);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'client_secret' => $body['client_secret'],
                'payment_intent_id' => $body['id'],
                'publishable_key' => get_option('rafflemania_stripe_publishable_key'),
            ],
        ]);
    }

    /**
     * Handle Stripe webhook events
     */
    public function handle_stripe_webhook(WP_REST_Request $request) {
        $webhook_secret = get_option('rafflemania_stripe_webhook_secret');
        if (empty($webhook_secret)) {
            return new WP_REST_Response(['error' => 'Webhook not configured'], 500);
        }

        // Verify Stripe signature
        $payload = $request->get_body();
        $sig_header = $request->get_header('stripe-signature');

        if (!$this->verify_stripe_signature($payload, $sig_header, $webhook_secret)) {
            error_log('[RaffleMania Payments] Invalid Stripe webhook signature');
            return new WP_REST_Response(['error' => 'Invalid signature'], 400);
        }

        $event = json_decode($payload, true);
        $type = $event['type'] ?? '';

        global $wpdb;
        $table_payments = $wpdb->prefix . 'rafflemania_payments';

        switch ($type) {
            case 'payment_intent.succeeded':
                $intent = $event['data']['object'];
                $transaction_id = $intent['id'];
                $user_id = $intent['metadata']['user_id'] ?? null;
                $package_id = $intent['metadata']['package_id'] ?? null;
                $credits = (int)($intent['metadata']['credits'] ?? 0);

                if (!$user_id || !$credits) {
                    error_log('[RaffleMania Payments] Webhook missing metadata: ' . $transaction_id);
                    break;
                }

                // Find payment record
                $payment = $wpdb->get_row($wpdb->prepare(
                    "SELECT * FROM {$table_payments} WHERE transaction_id = %s",
                    $transaction_id
                ));

                if ($payment && $payment->status === 'verified') {
                    break; // Already processed
                }

                $payment_id = $payment ? $payment->id : null;

                if (!$payment) {
                    // Create payment record if webhook arrives before frontend
                    $wpdb->insert($table_payments, [
                        'user_id' => $user_id,
                        'package_id' => $package_id,
                        'payment_method' => 'stripe',
                        'transaction_id' => $transaction_id,
                        'amount' => $intent['amount'] / 100,
                        'credits_awarded' => $credits,
                        'status' => 'pending',
                    ]);
                    $payment_id = $wpdb->insert_id;
                }

                // Award credits
                $this->award_credits($user_id, $credits, $payment_id, 'stripe_' . $package_id);

                $wpdb->update($table_payments, [
                    'status' => 'verified',
                    'verified_at' => current_time('mysql'),
                    'verification_response' => json_encode(['stripe_event_id' => $event['id']]),
                ], ['id' => $payment_id]);

                error_log('[RaffleMania Payments] Stripe payment verified: ' . $transaction_id . ' for user ' . $user_id);
                break;

            case 'payment_intent.payment_failed':
                $intent = $event['data']['object'];
                $wpdb->update($table_payments, [
                    'status' => 'failed',
                    'verification_response' => json_encode([
                        'error' => $intent['last_payment_error']['message'] ?? 'Payment failed',
                    ]),
                ], ['transaction_id' => $intent['id']]);
                break;

            case 'charge.refunded':
                $charge = $event['data']['object'];
                $payment_intent_id = $charge['payment_intent'];

                $payment = $wpdb->get_row($wpdb->prepare(
                    "SELECT * FROM {$table_payments} WHERE transaction_id = %s AND status = 'verified'",
                    $payment_intent_id
                ));

                if ($payment) {
                    // Deduct credits
                    $table_users = $wpdb->prefix . 'rafflemania_users';
                    $wpdb->query($wpdb->prepare(
                        "UPDATE {$table_users} SET credits = GREATEST(credits - %d, 0) WHERE id = %d",
                        $payment->credits_awarded,
                        $payment->user_id
                    ));

                    $wpdb->update($table_payments, [
                        'status' => 'refunded',
                    ], ['id' => $payment->id]);

                    error_log('[RaffleMania Payments] Refund processed for payment ' . $payment->id);
                }
                break;
        }

        return new WP_REST_Response(['received' => true], 200);
    }

    /**
     * Get payment history for user
     */
    public function get_payment_history(WP_REST_Request $request) {
        global $wpdb;
        $table_payments = $wpdb->prefix . 'rafflemania_payments';

        $user_id = $request->get_param('_auth_user_id');

        $payments = $wpdb->get_results($wpdb->prepare(
            "SELECT id, package_id, payment_method, amount, credits_awarded, status, created_at, verified_at
             FROM {$table_payments}
             WHERE user_id = %d
             ORDER BY created_at DESC
             LIMIT 50",
            $user_id
        ));

        $formatted = array_map(function($p) {
            return [
                'id' => (string)$p->id,
                'packageId' => (string)$p->package_id,
                'paymentMethod' => $p->payment_method,
                'amount' => (float)$p->amount,
                'creditsAwarded' => (int)$p->credits_awarded,
                'status' => $p->status,
                'createdAt' => $p->created_at,
                'verifiedAt' => $p->verified_at,
            ];
        }, $payments);

        return new WP_REST_Response([
            'success' => true,
            'data' => $formatted,
        ]);
    }

    /**
     * Restore IAP purchases (required by Apple)
     */
    public function restore_purchases(WP_REST_Request $request) {
        $user_id = $request->get_param('_auth_user_id');
        $platform = $request->get_param('platform');
        $receipts = $request->get_param('receipts');

        $restored = 0;
        $errors = [];

        foreach ($receipts as $receipt) {
            $transaction_id = $receipt['transactionId'] ?? '';
            $product_id = $receipt['productId'] ?? '';
            $receipt_data = $receipt['receiptData'] ?? '';

            if (empty($transaction_id) || empty($product_id)) {
                continue;
            }

            // Check if already processed
            global $wpdb;
            $table_payments = $wpdb->prefix . 'rafflemania_payments';
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT id FROM {$table_payments} WHERE transaction_id = %s AND status = 'verified'",
                $transaction_id
            ));

            if ($existing) {
                $restored++; // Already restored
                continue;
            }

            // Verify and process
            $verification = $platform === 'apple'
                ? $this->verify_apple_receipt($receipt_data, $product_id)
                : $this->verify_google_purchase($receipt_data, $product_id, $transaction_id);

            if ($verification['valid']) {
                $package = $this->get_package_by_product_id($product_id);
                if ($package) {
                    $wpdb->insert($table_payments, [
                        'user_id' => $user_id,
                        'package_id' => $package->id,
                        'payment_method' => $platform === 'apple' ? 'apple_iap' : 'google_iap',
                        'transaction_id' => $transaction_id,
                        'receipt_data' => $receipt_data,
                        'amount' => $package->price,
                        'credits_awarded' => $package->credits,
                        'status' => 'verified',
                        'verified_at' => current_time('mysql'),
                        'verification_response' => json_encode($verification['response']),
                    ]);

                    $payment_id = $wpdb->insert_id;
                    $this->award_credits($user_id, $package->credits, $payment_id, $product_id);
                    $restored++;
                }
            } else {
                $errors[] = ['transactionId' => $transaction_id, 'error' => $verification['error'] ?? 'Verification failed'];
            }
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'restored' => $restored,
                'errors' => $errors,
            ],
        ]);
    }

    // ============================================
    // Private helper methods
    // ============================================

    /**
     * Verify Apple receipt with Apple servers
     */
    private function verify_apple_receipt($receipt_data, $product_id) {
        $shared_secret = get_option('rafflemania_apple_shared_secret', '');

        $payload = json_encode([
            'receipt-data' => $receipt_data,
            'password' => $shared_secret,
            'exclude-old-transactions' => true,
        ]);

        // Try production first, then sandbox
        $urls = [
            'https://buy.itunes.apple.com/verifyReceipt',
            'https://sandbox.itunes.apple.com/verifyReceipt',
        ];

        foreach ($urls as $url) {
            $response = wp_remote_post($url, [
                'headers' => ['Content-Type' => 'application/json'],
                'body' => $payload,
                'timeout' => 30,
            ]);

            if (is_wp_error($response)) {
                continue;
            }

            $body = json_decode(wp_remote_retrieve_body($response), true);
            $status = $body['status'] ?? -1;

            // Status 21007 = sandbox receipt sent to production, retry on sandbox
            if ($status === 21007) {
                continue;
            }

            if ($status === 0) {
                // Verify the product_id matches
                $in_app = $body['receipt']['in_app'] ?? [];
                $latest = $body['latest_receipt_info'] ?? $in_app;

                foreach ($latest as $item) {
                    if ($item['product_id'] === $product_id) {
                        return ['valid' => true, 'response' => $body];
                    }
                }

                return ['valid' => false, 'error' => 'Product ID mismatch', 'response' => $body];
            }

            return ['valid' => false, 'error' => 'Apple status: ' . $status, 'response' => $body];
        }

        return ['valid' => false, 'error' => 'Could not reach Apple servers'];
    }

    /**
     * Verify Google Play purchase
     */
    private function verify_google_purchase($purchase_token, $product_id, $transaction_id) {
        $service_account_json = get_option('rafflemania_google_service_account', '');
        if (empty($service_account_json)) {
            return ['valid' => false, 'error' => 'Google service account not configured'];
        }

        $service_account = json_decode($service_account_json, true);
        if (!$service_account) {
            return ['valid' => false, 'error' => 'Invalid service account JSON'];
        }

        // Get OAuth2 access token
        $access_token = $this->get_google_access_token($service_account);
        if (!$access_token) {
            return ['valid' => false, 'error' => 'Could not get Google access token'];
        }

        $package_name = 'com.rafflemaniaapp';
        $url = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{$package_name}/purchases/products/{$product_id}/tokens/{$purchase_token}";

        $response = wp_remote_get($url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_token,
            ],
            'timeout' => 30,
        ]);

        if (is_wp_error($response)) {
            return ['valid' => false, 'error' => 'Google API error: ' . $response->get_error_message()];
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        // purchaseState: 0 = purchased, 1 = canceled, 2 = pending
        if (isset($body['purchaseState']) && $body['purchaseState'] === 0) {
            // Acknowledge the purchase if not already
            if (($body['acknowledgementState'] ?? 0) === 0) {
                wp_remote_post($url . ':acknowledge', [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $access_token,
                        'Content-Type' => 'application/json',
                    ],
                    'body' => '{}',
                    'timeout' => 15,
                ]);
            }

            // Consume the purchase (consumable product)
            wp_remote_post($url . ':consume', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $access_token,
                    'Content-Type' => 'application/json',
                ],
                'body' => '{}',
                'timeout' => 15,
            ]);

            return ['valid' => true, 'response' => $body];
        }

        return ['valid' => false, 'error' => 'Purchase state: ' . ($body['purchaseState'] ?? 'unknown'), 'response' => $body];
    }

    /**
     * Get Google OAuth2 access token using service account
     */
    private function get_google_access_token($service_account) {
        $cached = get_transient('rafflemania_google_access_token');
        if ($cached) {
            return $cached;
        }

        $now = time();
        $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claim = base64_encode(json_encode([
            'iss' => $service_account['client_email'],
            'scope' => 'https://www.googleapis.com/auth/androidpublisher',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $signature_input = $header . '.' . $claim;
        $private_key = $service_account['private_key'];

        openssl_sign($signature_input, $signature, $private_key, 'SHA256');
        $jwt = $signature_input . '.' . base64_encode($signature);

        $response = wp_remote_post('https://oauth2.googleapis.com/token', [
            'body' => [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ],
            'timeout' => 15,
        ]);

        if (is_wp_error($response)) {
            return null;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        $token = $body['access_token'] ?? null;

        if ($token) {
            set_transient('rafflemania_google_access_token', $token, 3500);
        }

        return $token;
    }

    /**
     * Verify Stripe webhook signature
     */
    private function verify_stripe_signature($payload, $sig_header, $secret) {
        if (empty($sig_header)) {
            return false;
        }

        $elements = explode(',', $sig_header);
        $timestamp = null;
        $signatures = [];

        foreach ($elements as $element) {
            $parts = explode('=', $element, 2);
            if (count($parts) !== 2) continue;

            if ($parts[0] === 't') {
                $timestamp = $parts[1];
            } elseif ($parts[0] === 'v1') {
                $signatures[] = $parts[1];
            }
        }

        if (!$timestamp || empty($signatures)) {
            return false;
        }

        // Check timestamp (reject if older than 5 minutes)
        if (abs(time() - (int)$timestamp) > 300) {
            return false;
        }

        $signed_payload = $timestamp . '.' . $payload;
        $expected = hash_hmac('sha256', $signed_payload, $secret);

        foreach ($signatures as $sig) {
            if (hash_equals($expected, $sig)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Award credits to user (atomic operation)
     */
    private function award_credits($user_id, $credits, $payment_id, $reference) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_transactions = $wpdb->prefix . 'rafflemania_transactions';

        $wpdb->query('START TRANSACTION');

        try {
            // Lock user row and update credits
            $user = $wpdb->get_row($wpdb->prepare(
                "SELECT credits, xp, level FROM {$table_users} WHERE id = %d FOR UPDATE",
                $user_id
            ));

            if (!$user) {
                $wpdb->query('ROLLBACK');
                return false;
            }

            // Add XP for purchase
            $xp_reward = (int)get_option('rafflemania_xp_purchase_credits', 0);
            $new_xp = $user->xp + $xp_reward;
            $new_level = $this->calculate_level($new_xp);

            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_users} SET credits = credits + %d, xp = %d, level = %d WHERE id = %d",
                $credits,
                $new_xp,
                $new_level,
                $user_id
            ));

            // Record transaction
            $wpdb->insert($table_transactions, [
                'user_id' => $user_id,
                'type' => 'purchase',
                'amount' => $credits,
                'description' => 'Acquisto ' . $credits . ' crediti',
                'reference_id' => 'payment_' . $payment_id,
            ]);

            $wpdb->query('COMMIT');

            error_log('[RaffleMania Payments] Awarded ' . $credits . ' credits to user ' . $user_id . ' (payment ' . $payment_id . ')');
            return true;

        } catch (\Throwable $e) {
            $wpdb->query('ROLLBACK');
            error_log('[RaffleMania Payments] award_credits ROLLBACK: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get shop package by IAP product ID
     */
    private function get_package_by_product_id($product_id) {
        global $wpdb;
        $table_packages = $wpdb->prefix . 'rafflemania_shop_packages';

        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_packages} WHERE iap_product_id = %s AND is_active = 1",
            $product_id
        ));
    }

    private function calculate_level($xp) {
        global $wpdb;
        $table_levels = $wpdb->prefix . 'rafflemania_levels';
        $level = $wpdb->get_var($wpdb->prepare(
            "SELECT level FROM {$table_levels} WHERE min_xp <= %d AND is_active = 1 ORDER BY level DESC LIMIT 1",
            $xp
        ));
        return $level ? (int)$level : 1;
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

        $request->set_param('_auth_user_id', $payload['user_id']);
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
}

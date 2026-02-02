<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Users API Controller
 */
class UsersController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'users';

    public function register_routes() {
        // Get current user profile
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_profile'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Update profile
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me', [
            [
                'methods' => 'PUT',
                'callback' => [$this, 'update_profile'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Get streak info
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/streak', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_streak'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Claim daily streak
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/streak/claim', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'claim_streak'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Get level info
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/level', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_level'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Add XP
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/xp', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'add_xp'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'amount' => [
                        'required' => true,
                        'type' => 'integer'
                    ],
                    'source' => [
                        'required' => false,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Get credits
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/credits', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_credits'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Purchase credits
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/credits/purchase', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'purchase_credits'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'package_id' => [
                        'required' => true,
                        'type' => 'string'
                    ],
                    'receipt' => [
                        'required' => false,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Get referral info
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/referral', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_referral'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Use referral code
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/referral/use', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'use_referral'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'code' => [
                        'required' => true,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Update push token
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/push-token', [
            [
                'methods' => 'PUT',
                'callback' => [$this, 'update_push_token'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'token' => [
                        'required' => true,
                        'type' => 'string'
                    ]
                ]
            ]
        ]);

        // Get user wins
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/wins', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_wins'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Leaderboard
        register_rest_route($this->namespace, '/' . $this->rest_base . '/leaderboard', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_leaderboard'],
                'permission_callback' => '__return_true'
            ]
        ]);

        // Delete account permanently
        register_rest_route($this->namespace, '/' . $this->rest_base . '/me/delete', [
            [
                'methods' => 'DELETE',
                'callback' => [$this, 'delete_account'],
                'permission_callback' => [$this, 'check_auth'],
                'args' => [
                    'password' => [
                        'required' => true,
                        'type' => 'string',
                        'description' => 'Current password for confirmation'
                    ],
                    'confirm' => [
                        'required' => true,
                        'type' => 'boolean',
                        'description' => 'Must be true to confirm deletion'
                    ]
                ]
            ]
        ]);
    }

    public function get_profile(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_winners = $wpdb->prefix . 'rafflemania_winners';

        $user_id = $request->get_param('_auth_user_id');

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        if (!$user) {
            return new WP_Error('not_found', 'Utente non trovato', ['status' => 404]);
        }

        // Get wins count from winners table
        $wins_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table_winners} WHERE user_id = %d",
            $user_id
        ));

        $user_data = $this->format_user($user);
        $user_data['winsCount'] = (int) $wins_count;

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'user' => $user_data
            ]
        ]);
    }

    public function update_profile(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $user_id = $request->get_param('_auth_user_id');
        $params = $request->get_params();

        $allowed_fields = ['username', 'avatar_url', 'avatar_color'];
        $update_data = [];

        foreach ($allowed_fields as $field) {
            $camel_field = lcfirst(str_replace('_', '', ucwords($field, '_')));
            if (isset($params[$camel_field])) {
                $update_data[$field] = sanitize_text_field($params[$camel_field]);
            }
        }

        if (empty($update_data)) {
            return new WP_Error('no_data', 'Nessun dato da aggiornare', ['status' => 400]);
        }

        // Check username uniqueness if changing
        if (isset($update_data['username'])) {
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT id FROM {$table_users} WHERE username = %s AND id != %d",
                $update_data['username'],
                $user_id
            ));
            if ($existing) {
                return new WP_Error('username_taken', 'Username già in uso', ['status' => 400]);
            }
        }

        $wpdb->update($table_users, $update_data, ['id' => $user_id]);

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'user' => $this->format_user($user)
            ]
        ]);
    }

    public function get_streak(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $user_id = $request->get_param('_auth_user_id');

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT current_streak, last_streak_date FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        // Use Italian timezone (Europe/Rome) for date calculations
        $italy_tz = new \DateTimeZone('Europe/Rome');
        $today = (new \DateTime('now', $italy_tz))->format('Y-m-d');
        $can_claim = $user->last_streak_date !== $today;

        // Check if streak is broken
        if ($user->last_streak_date) {
            $last_date = new \DateTime($user->last_streak_date, $italy_tz);
            $current_date = new \DateTime($today, $italy_tz);
            $diff = $last_date->diff($current_date)->days;

            if ($diff > 1) {
                // Streak broken, reset
                $wpdb->update($table_users, ['current_streak' => 0], ['id' => $user_id]);
                $user->current_streak = 0;
            }
        }

        // Calculate next milestone
        $milestones = [7, 14, 30, 60, 90];
        $next_milestone = null;
        foreach ($milestones as $m) {
            if ($user->current_streak < $m) {
                $next_milestone = $m;
                break;
            }
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'currentStreak' => (int) $user->current_streak,
                'lastStreakDate' => $user->last_streak_date,
                'canClaimToday' => $can_claim,
                'nextMilestone' => $next_milestone,
                'daysUntilWeeklyBonus' => 7 - ($user->current_streak % 7)
            ]
        ]);
    }

    public function claim_streak(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_streaks = $wpdb->prefix . 'rafflemania_streaks';

        $user_id = $request->get_param('_auth_user_id');

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT current_streak, last_streak_date FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        // Use Italian timezone (Europe/Rome) for date calculations
        $italy_tz = new \DateTimeZone('Europe/Rome');
        $today = (new \DateTime('now', $italy_tz))->format('Y-m-d');

        // Check if already claimed today
        if ($user->last_streak_date === $today) {
            return new WP_Error('already_claimed', 'Streak già riscossa oggi', ['status' => 400]);
        }

        // Calculate new streak
        $new_streak = $user->current_streak + 1;
        if ($user->last_streak_date) {
            $last_date = new \DateTime($user->last_streak_date, $italy_tz);
            $current_date = new \DateTime($today, $italy_tz);
            $diff = $last_date->diff($current_date)->days;
            if ($diff > 1) {
                $new_streak = 1; // Reset if broken
            }
        }

        // Calculate rewards - get base XP from settings
        $base_xp = get_option('rafflemania_xp_daily_streak', 10);
        $xp_reward = $base_xp + ($new_streak * 2);
        $credits_reward = 0;
        $is_milestone = false;
        $is_weekly_bonus = ($new_streak % 7 === 0);

        // Milestone bonuses
        $milestones = [
            7 => ['xp' => 50, 'credits' => 5],
            14 => ['xp' => 100, 'credits' => 10],
            30 => ['xp' => 200, 'credits' => 20],
            60 => ['xp' => 400, 'credits' => 40],
            90 => ['xp' => 600, 'credits' => 60]
        ];

        if (isset($milestones[$new_streak])) {
            $is_milestone = true;
            $xp_reward += $milestones[$new_streak]['xp'];
            $credits_reward += $milestones[$new_streak]['credits'];
        }

        // Weekly bonus
        if ($is_weekly_bonus && !$is_milestone) {
            $xp_reward += 30;
            $credits_reward += 3;
        }

        // Update user
        $wpdb->query($wpdb->prepare(
            "UPDATE {$table_users}
             SET current_streak = %d,
                 last_streak_date = %s,
                 xp = xp + %d,
                 credits = credits + %d
             WHERE id = %d",
            $new_streak,
            $today,
            $xp_reward,
            $credits_reward,
            $user_id
        ));

        // Record streak claim
        $wpdb->insert($table_streaks, [
            'user_id' => $user_id,
            'streak_day' => $new_streak,
            'xp_earned' => $xp_reward,
            'credits_earned' => $credits_reward,
            'is_milestone' => $is_milestone ? 1 : 0,
            'is_weekly_bonus' => $is_weekly_bonus ? 1 : 0
        ]);

        // Check for level up
        $updated_user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        $new_level = $this->calculate_level($updated_user->xp);
        if ($new_level > $updated_user->level) {
            $wpdb->update($table_users, ['level' => $new_level], ['id' => $user_id]);
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'currentStreak' => $new_streak,
                'xpEarned' => $xp_reward,
                'creditsEarned' => $credits_reward,
                'isMilestone' => $is_milestone,
                'isWeeklyBonus' => $is_weekly_bonus,
                'milestoneDay' => $is_milestone ? $new_streak : null
            ]
        ]);
    }

    public function get_level(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $user_id = $request->get_param('_auth_user_id');

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT xp, level FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        $level_info = $this->get_level_info($user->level, $user->xp);

        return new WP_REST_Response([
            'success' => true,
            'data' => $level_info
        ]);
    }

    public function add_xp(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $user_id = $request->get_param('_auth_user_id');
        $amount = $request->get_param('amount');

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT xp, level FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        $new_xp = $user->xp + $amount;
        $new_level = $this->calculate_level($new_xp);
        $leveled_up = $new_level > $user->level;

        $wpdb->update($table_users, [
            'xp' => $new_xp,
            'level' => $new_level
        ], ['id' => $user_id]);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'xpAdded' => $amount,
                'totalXp' => $new_xp,
                'level' => $new_level,
                'leveledUp' => $leveled_up
            ]
        ]);
    }

    public function get_credits(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_transactions = $wpdb->prefix . 'rafflemania_transactions';

        $user_id = $request->get_param('_auth_user_id');

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT credits FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        // Get recent transactions
        $transactions = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table_transactions}
             WHERE user_id = %d
             ORDER BY created_at DESC
             LIMIT 20",
            $user_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'credits' => (int) $user->credits,
                'transactions' => array_map(function($t) {
                    return [
                        'id' => (int) $t->id,
                        'type' => $t->type,
                        'amount' => (int) $t->amount,
                        'description' => $t->description,
                        'createdAt' => $t->created_at
                    ];
                }, $transactions)
            ]
        ]);
    }

    public function purchase_credits(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_transactions = $wpdb->prefix . 'rafflemania_transactions';

        $user_id = $request->get_param('_auth_user_id');
        $package_id = $request->get_param('package_id');

        // Credit packages - aligned with mobile app
        $packages = [
            'credits_100' => ['credits' => 100, 'price' => 0.99],
            'credits_500' => ['credits' => 500, 'price' => 3.99],
            'credits_1000' => ['credits' => 1000, 'price' => 6.99],
            'credits_2500' => ['credits' => 2500, 'price' => 14.99],
        ];

        if (!isset($packages[$package_id])) {
            return new WP_Error('invalid_package', 'Pacchetto non valido', ['status' => 400]);
        }

        $package = $packages[$package_id];

        // In production, verify receipt with App Store / Google Play here
        // For now, just add credits

        $wpdb->query($wpdb->prepare(
            "UPDATE {$table_users} SET credits = credits + %d WHERE id = %d",
            $package['credits'],
            $user_id
        ));

        // Record transaction
        $wpdb->insert($table_transactions, [
            'user_id' => $user_id,
            'type' => 'purchase',
            'amount' => $package['credits'],
            'description' => 'Acquisto ' . $package['credits'] . ' crediti',
            'reference_id' => $package_id
        ]);

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT credits FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'creditsAdded' => $package['credits'],
                'totalCredits' => (int) $user->credits
            ]
        ]);
    }

    public function get_referral(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

        $user_id = $request->get_param('_auth_user_id');

        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT referral_code, referred_by FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        // Count referrals
        $referral_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table_referrals} WHERE referrer_user_id = %d",
            $user_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'referralCode' => $user->referral_code,
                'referredBy' => $user->referred_by,
                'totalReferrals' => (int) $referral_count,
                'bonusPerReferral' => 10 // Credits bonus
            ]
        ]);
    }

    public function use_referral(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';

        $user_id = $request->get_param('_auth_user_id');
        $code = strtoupper($request->get_param('code'));

        // Check if user already used a referral
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT referred_by FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        if ($user->referred_by) {
            return new WP_Error('already_referred', 'Hai già usato un codice referral', ['status' => 400]);
        }

        // Find referrer
        $referrer = $wpdb->get_row($wpdb->prepare(
            "SELECT id, referral_code FROM {$table_users} WHERE referral_code = %s",
            $code
        ));

        if (!$referrer) {
            return new WP_Error('invalid_code', 'Codice referral non valido', ['status' => 404]);
        }

        if ($referrer->id == $user_id) {
            return new WP_Error('self_referral', 'Non puoi usare il tuo codice', ['status' => 400]);
        }

        // Apply referral
        $bonus = 10;

        // Update referred user
        $wpdb->update($table_users, [
            'referred_by' => $code,
            'credits' => $wpdb->get_var($wpdb->prepare("SELECT credits FROM {$table_users} WHERE id = %d", $user_id)) + $bonus
        ], ['id' => $user_id]);

        // Bonus to referrer
        $wpdb->query($wpdb->prepare(
            "UPDATE {$table_users} SET credits = credits + %d WHERE id = %d",
            $bonus,
            $referrer->id
        ));

        // Record referral with activity tracking
        $wpdb->insert($table_referrals, [
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $user_id,
            'referral_code' => $code,
            'bonus_given' => 1,
            'days_active' => 1,
            'last_active_date' => date('Y-m-d'),
            'reward_claimed' => 0,
            'referred_reward_claimed' => 0
        ]);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'bonusCredits' => $bonus,
                'message' => 'Codice applicato con successo!'
            ]
        ]);
    }

    public function update_push_token(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $user_id = $request->get_param('_auth_user_id');
        $token = $request->get_param('token');

        $wpdb->update($table_users, ['push_token' => $token], ['id' => $user_id]);

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Push token aggiornato'
        ]);
    }

    public function get_wins(WP_REST_Request $request) {
        global $wpdb;
        $table_winners = $wpdb->prefix . 'rafflemania_winners';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $user_id = $request->get_param('_auth_user_id');

        $wins = $wpdb->get_results($wpdb->prepare(
            "SELECT w.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value
             FROM {$table_winners} w
             LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
             WHERE w.user_id = %d
             ORDER BY w.won_at DESC",
            $user_id
        ));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'wins' => array_map(function($w) {
                    return [
                        'id' => (int) $w->id,
                        'prizeId' => (string) $w->prize_id,
                        'prizeName' => $w->prize_name,
                        'prizeImage' => $w->prize_image,
                        'prizeValue' => (float) $w->prize_value,
                        'claimed' => (bool) $w->claimed,
                        'claimedAt' => $w->claimed_at,
                        'wonAt' => $w->won_at
                    ];
                }, $wins),
                'total' => count($wins)
            ]
        ]);
    }

    /**
     * Permanently delete user account and all associated data
     */
    public function delete_account(WP_REST_Request $request) {
        global $wpdb;

        $user_id = $request->get_param('_auth_user_id');
        $password = $request->get_param('password');
        $confirm = $request->get_param('confirm');

        // Verify confirmation
        if (!$confirm) {
            return new WP_Error('not_confirmed', 'Devi confermare l\'eliminazione dell\'account', ['status' => 400]);
        }

        // Get user and verify password
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT id, email, password_hash FROM {$table_users} WHERE id = %d",
            $user_id
        ));

        if (!$user) {
            return new WP_Error('user_not_found', 'Utente non trovato', ['status' => 404]);
        }

        // Verify password
        if (!password_verify($password, $user->password_hash)) {
            return new WP_Error('invalid_password', 'Password non corretta', ['status' => 401]);
        }

        // Begin deletion process - delete all related data
        $tables_to_clean = [
            'rafflemania_referrals' => ['referrer_user_id', 'referred_user_id'],
            'rafflemania_tickets' => ['user_id'],
            'rafflemania_transactions' => ['user_id'],
            'rafflemania_winners' => ['user_id'],
            'rafflemania_streaks' => ['user_id'],
            'rafflemania_notifications' => ['user_id'],
            'rafflemania_shipments' => ['user_id'],
        ];

        $deleted_counts = [];

        foreach ($tables_to_clean as $table_suffix => $columns) {
            $table_name = $wpdb->prefix . $table_suffix;

            // Check if table exists
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_name}'");
            if (!$table_exists) {
                continue;
            }

            foreach ($columns as $column) {
                $count = $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$table_name} WHERE {$column} = %d",
                    $user_id
                ));
                if (!isset($deleted_counts[$table_suffix])) {
                    $deleted_counts[$table_suffix] = 0;
                }
                $deleted_counts[$table_suffix] += $count;
            }
        }

        // Finally delete the user
        $user_deleted = $wpdb->delete($table_users, ['id' => $user_id]);

        if (!$user_deleted) {
            error_log("[RaffleMania] ERROR deleting user {$user_id}: " . $wpdb->last_error);
            return new WP_Error('deletion_failed', 'Errore durante l\'eliminazione dell\'account', ['status' => 500]);
        }

        error_log("[RaffleMania] Account deleted: user_id={$user_id}, email={$user->email}, deleted_data=" . json_encode($deleted_counts));

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Account eliminato permanentemente',
            'data' => [
                'deleted' => true
            ]
        ]);
    }

    public function get_leaderboard(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $type = $request->get_param('type') ?: 'xp';
        $limit = $request->get_param('limit') ?: 50;

        $order_by = $type === 'wins' ? 'wins_count' : 'xp';

        if ($type === 'wins') {
            $table_winners = $wpdb->prefix . 'rafflemania_winners';
            $users = $wpdb->get_results($wpdb->prepare(
                "SELECT u.id, u.username, u.avatar_url, u.avatar_color, u.level, u.xp,
                        COUNT(w.id) as wins_count
                 FROM {$table_users} u
                 LEFT JOIN {$table_winners} w ON u.id = w.user_id
                 WHERE u.is_active = 1
                 GROUP BY u.id
                 ORDER BY wins_count DESC, u.xp DESC
                 LIMIT %d",
                $limit
            ));
        } else {
            $users = $wpdb->get_results($wpdb->prepare(
                "SELECT id, username, avatar_url, avatar_color, level, xp
                 FROM {$table_users}
                 WHERE is_active = 1
                 ORDER BY xp DESC
                 LIMIT %d",
                $limit
            ));
        }

        $leaderboard = [];
        $rank = 1;
        foreach ($users as $u) {
            $leaderboard[] = [
                'rank' => $rank++,
                'userId' => (string) $u->id,
                'username' => $u->username,
                'avatarUrl' => $u->avatar_url,
                'avatarColor' => $u->avatar_color,
                'level' => (int) $u->level,
                'xp' => (int) $u->xp,
                'winsCount' => isset($u->wins_count) ? (int) $u->wins_count : 0
            ];
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'type' => $type,
                'leaderboard' => $leaderboard
            ]
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

    private function calculate_level($xp) {
        // Level thresholds
        $levels = [
            1 => 0,
            2 => 100,
            3 => 250,
            4 => 500,
            5 => 1000,
            6 => 2000,
            7 => 3500,
            8 => 5500,
            9 => 8000,
            10 => 11000,
            // Add more levels as needed
        ];

        $level = 1;
        foreach ($levels as $lvl => $threshold) {
            if ($xp >= $threshold) {
                $level = $lvl;
            }
        }

        return $level;
    }

    private function get_level_info($level, $xp) {
        $levels = [
            1 => ['min' => 0, 'max' => 100, 'name' => 'Principiante'],
            2 => ['min' => 100, 'max' => 250, 'name' => 'Apprendista'],
            3 => ['min' => 250, 'max' => 500, 'name' => 'Giocatore'],
            4 => ['min' => 500, 'max' => 1000, 'name' => 'Esperto'],
            5 => ['min' => 1000, 'max' => 2000, 'name' => 'Veterano'],
            6 => ['min' => 2000, 'max' => 3500, 'name' => 'Maestro'],
            7 => ['min' => 3500, 'max' => 5500, 'name' => 'Gran Maestro'],
            8 => ['min' => 5500, 'max' => 8000, 'name' => 'Campione'],
            9 => ['min' => 8000, 'max' => 11000, 'name' => 'Leggenda'],
            10 => ['min' => 11000, 'max' => 999999, 'name' => 'Divinità']
        ];

        $info = $levels[$level] ?? $levels[1];
        $xp_in_level = $xp - $info['min'];
        $xp_needed = $info['max'] - $info['min'];
        $progress = min(100, ($xp_in_level / $xp_needed) * 100);

        return [
            'level' => $level,
            'name' => $info['name'],
            'currentXp' => $xp,
            'xpInLevel' => $xp_in_level,
            'xpNeeded' => $xp_needed,
            'xpToNextLevel' => max(0, $info['max'] - $xp),
            'progress' => round($progress, 2)
        ];
    }

    private function format_user($user) {
        return [
            'id' => (string) $user->id,
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
            'watchedAds' => (int) ($user->watched_ads ?? 0),
            'createdAt' => $user->created_at
        ];
    }
}

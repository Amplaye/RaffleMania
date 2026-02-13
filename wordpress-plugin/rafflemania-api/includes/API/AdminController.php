<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use RaffleMania\NotificationHelper;

/**
 * Admin API Controller - Admin-only operations
 */
class AdminController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'admin';

    public function register_routes() {
        // Bulk reward
        register_rest_route($this->namespace, '/' . $this->rest_base . '/bulk-reward', [
            ['methods' => 'POST', 'callback' => [$this, 'bulk_reward'], 'permission_callback' => [$this, 'check_admin']]
        ]);

        // User-specific actions
        register_rest_route($this->namespace, '/' . $this->rest_base . '/user/(?P<id>\d+)/add-credits', [
            ['methods' => 'POST', 'callback' => [$this, 'add_credits'], 'permission_callback' => [$this, 'check_admin']]
        ]);
        register_rest_route($this->namespace, '/' . $this->rest_base . '/user/(?P<id>\d+)/add-xp', [
            ['methods' => 'POST', 'callback' => [$this, 'add_xp'], 'permission_callback' => [$this, 'check_admin']]
        ]);
        register_rest_route($this->namespace, '/' . $this->rest_base . '/user/(?P<id>\d+)/add-tickets', [
            ['methods' => 'POST', 'callback' => [$this, 'add_tickets'], 'permission_callback' => [$this, 'check_admin']]
        ]);
        register_rest_route($this->namespace, '/' . $this->rest_base . '/user/(?P<id>\d+)/reset-streak', [
            ['methods' => 'POST', 'callback' => [$this, 'reset_streak'], 'permission_callback' => [$this, 'check_admin']]
        ]);
        register_rest_route($this->namespace, '/' . $this->rest_base . '/user/(?P<id>\d+)/reset-password', [
            ['methods' => 'POST', 'callback' => [$this, 'reset_password'], 'permission_callback' => [$this, 'check_admin']]
        ]);
        register_rest_route($this->namespace, '/' . $this->rest_base . '/user/(?P<id>\d+)/verify-email', [
            ['methods' => 'POST', 'callback' => [$this, 'verify_email'], 'permission_callback' => [$this, 'check_admin']]
        ]);
        register_rest_route($this->namespace, '/' . $this->rest_base . '/user/(?P<id>\d+)/ban', [
            ['methods' => 'POST', 'callback' => [$this, 'toggle_ban'], 'permission_callback' => [$this, 'check_admin']]
        ]);
        register_rest_route($this->namespace, '/' . $this->rest_base . '/user/(?P<id>\d+)/full-profile', [
            ['methods' => 'GET', 'callback' => [$this, 'full_profile'], 'permission_callback' => [$this, 'check_admin']]
        ]);

        // Prize actions
        register_rest_route($this->namespace, '/' . $this->rest_base . '/prize/(?P<id>\d+)/force-timer', [
            ['methods' => 'POST', 'callback' => [$this, 'force_timer'], 'permission_callback' => [$this, 'check_admin']]
        ]);
        register_rest_route($this->namespace, '/' . $this->rest_base . '/prize/(?P<id>\d+)/force-extraction', [
            ['methods' => 'POST', 'callback' => [$this, 'force_extraction'], 'permission_callback' => [$this, 'check_admin']]
        ]);

        // Actions log
        register_rest_route($this->namespace, '/' . $this->rest_base . '/actions-log', [
            ['methods' => 'GET', 'callback' => [$this, 'get_actions_log'], 'permission_callback' => [$this, 'check_admin']]
        ]);
    }

    public function check_admin(WP_REST_Request $request) {
        $admin_key = $request->get_header('X-Admin-Key');
        $stored_key = get_option('rafflemania_admin_api_key', '');
        if (!empty($stored_key) && $admin_key === $stored_key) {
            return true;
        }
        return current_user_can('manage_options');
    }

    // === BULK REWARD ===
    public function bulk_reward(WP_REST_Request $request) {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';

        $reason = sanitize_text_field($request->get_param('reason'));
        $credits = (int) $request->get_param('credits_amount');
        $xp = (int) $request->get_param('xp_amount');
        $tickets = (int) $request->get_param('tickets_amount');
        $target = sanitize_text_field($request->get_param('target') ?: 'all');
        $send_push = (bool) $request->get_param('send_push');

        if (empty($reason)) {
            return new WP_REST_Response(['success' => false, 'message' => 'Motivo obbligatorio'], 400);
        }

        // Get target users
        $where = 'is_active = 1';
        if ($target === 'level_range') {
            $filter = $request->get_param('target_filter');
            $min = (int)($filter['min_level'] ?? 0);
            $max = (int)($filter['max_level'] ?? 10);
            $where .= $wpdb->prepare(' AND level >= %d AND level <= %d', $min, $max);
        }

        $recipients = 0;

        // Apply credits
        if ($credits > 0) {
            $recipients = $wpdb->query("UPDATE {$table_users} SET credits = credits + {$credits} WHERE {$where}");
        }

        // Apply XP
        if ($xp > 0) {
            $count = $wpdb->query("UPDATE {$table_users} SET xp = xp + {$xp} WHERE {$where}");
            $recipients = max($recipients, $count);

            // Recalculate levels
            $this->recalculate_all_levels();
        }

        // Log bulk reward
        $wpdb->insert($wpdb->prefix . 'rafflemania_bulk_rewards_log', [
            'reason' => $reason,
            'credits_amount' => $credits,
            'xp_amount' => $xp,
            'tickets_amount' => $tickets,
            'target' => $target,
            'target_filter' => json_encode($request->get_param('target_filter')),
            'recipients_count' => $recipients,
            'created_by' => get_current_user_id(),
        ]);

        // Send push notification
        if ($send_push && $recipients > 0) {
            require_once RAFFLEMANIA_PLUGIN_DIR . 'includes/NotificationHelper.php';
            $push_msg = "Hai ricevuto una ricompensa: ";
            $parts = [];
            if ($credits > 0) $parts[] = "{$credits} crediti";
            if ($xp > 0) $parts[] = "{$xp} XP";
            if ($tickets > 0) $parts[] = "{$tickets} biglietti";
            $push_msg .= implode(', ', $parts) . "!";

            NotificationHelper::send_to_all('Ricompensa ricevuta!', $push_msg);
        }

        $this->log_admin_action('bulk_reward', null, [
            'reason' => $reason, 'credits' => $credits, 'xp' => $xp, 'recipients' => $recipients
        ]);

        return new WP_REST_Response([
            'success' => true,
            'message' => "Ricompensa inviata a {$recipients} utenti",
            'data' => ['recipients' => $recipients]
        ], 200);
    }

    // === ADD CREDITS ===
    public function add_credits(WP_REST_Request $request) {
        global $wpdb;
        $user_id = (int) $request['id'];
        $amount = (int) $request->get_param('amount');
        $reason = sanitize_text_field($request->get_param('reason') ?: 'Admin');

        if ($amount <= 0) {
            return new WP_REST_Response(['success' => false, 'message' => 'Quantità non valida'], 400);
        }

        $table = $wpdb->prefix . 'rafflemania_users';
        $wpdb->query($wpdb->prepare("UPDATE {$table} SET credits = credits + %d WHERE id = %d", $amount, $user_id));

        // Log transaction
        $wpdb->insert($wpdb->prefix . 'rafflemania_transactions', [
            'user_id' => $user_id,
            'type' => 'bonus',
            'amount' => $amount,
            'description' => "Admin: {$reason}",
        ]);

        $this->log_admin_action('add_credits', $user_id, ['amount' => $amount, 'reason' => $reason]);

        $new_credits = $wpdb->get_var($wpdb->prepare("SELECT credits FROM {$table} WHERE id = %d", $user_id));

        return new WP_REST_Response([
            'success' => true,
            'message' => "{$amount} crediti aggiunti",
            'data' => ['new_credits' => (int)$new_credits]
        ], 200);
    }

    // === ADD XP ===
    public function add_xp(WP_REST_Request $request) {
        global $wpdb;
        $user_id = (int) $request['id'];
        $amount = (int) $request->get_param('amount');
        $reason = sanitize_text_field($request->get_param('reason') ?: 'Admin');

        if ($amount <= 0) {
            return new WP_REST_Response(['success' => false, 'message' => 'Quantità non valida'], 400);
        }

        $table = $wpdb->prefix . 'rafflemania_users';
        $wpdb->query($wpdb->prepare("UPDATE {$table} SET xp = xp + %d WHERE id = %d", $amount, $user_id));

        // Recalculate level
        $user = $wpdb->get_row($wpdb->prepare("SELECT xp FROM {$table} WHERE id = %d", $user_id));
        $new_level = $this->calculate_level((int)$user->xp);
        $wpdb->update($table, ['level' => $new_level], ['id' => $user_id]);

        $this->log_admin_action('add_xp', $user_id, ['amount' => $amount, 'reason' => $reason, 'new_level' => $new_level]);

        return new WP_REST_Response([
            'success' => true,
            'message' => "{$amount} XP aggiunti",
            'data' => ['new_xp' => (int)$user->xp, 'new_level' => $new_level]
        ], 200);
    }

    // === ADD TICKETS ===
    public function add_tickets(WP_REST_Request $request) {
        global $wpdb;
        $user_id = (int) $request['id'];
        $amount = (int) $request->get_param('amount');
        $prize_id = (int) $request->get_param('prize_id');

        if ($amount <= 0 || $prize_id <= 0) {
            return new WP_REST_Response(['success' => false, 'message' => 'Quantità e premio obbligatori'], 400);
        }

        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';

        // Get current max ticket number for this prize
        $max_ticket = $wpdb->get_var($wpdb->prepare(
            "SELECT MAX(ticket_number) FROM {$table_tickets} WHERE prize_id = %d",
            $prize_id
        ));
        $start_number = ($max_ticket ?: 0) + 1;

        for ($i = 0; $i < $amount; $i++) {
            $wpdb->insert($table_tickets, [
                'user_id' => $user_id,
                'prize_id' => $prize_id,
                'ticket_number' => $start_number + $i,
                'source' => 'bonus',
                'status' => 'active',
            ]);
        }

        $this->log_admin_action('add_tickets', $user_id, ['amount' => $amount, 'prize_id' => $prize_id]);

        return new WP_REST_Response([
            'success' => true,
            'message' => "{$amount} biglietti aggiunti",
        ], 200);
    }

    // === RESET STREAK ===
    public function reset_streak(WP_REST_Request $request) {
        global $wpdb;
        $user_id = (int) $request['id'];
        $value = (int) $request->get_param('value');

        $table = $wpdb->prefix . 'rafflemania_users';
        $wpdb->update($table, [
            'current_streak' => max(0, $value),
            'last_streak_date' => $value > 0 ? current_time('Y-m-d') : null,
        ], ['id' => $user_id]);

        $this->log_admin_action('reset_streak', $user_id, ['new_value' => $value]);

        return new WP_REST_Response(['success' => true, 'message' => 'Streak aggiornata'], 200);
    }

    // === RESET PASSWORD ===
    public function reset_password(WP_REST_Request $request) {
        global $wpdb;
        $user_id = (int) $request['id'];
        $table = $wpdb->prefix . 'rafflemania_users';

        $user = $wpdb->get_row($wpdb->prepare("SELECT email, username FROM {$table} WHERE id = %d", $user_id));
        if (!$user) {
            return new WP_REST_Response(['success' => false, 'message' => 'Utente non trovato'], 404);
        }

        // Generate random password
        $new_password = wp_generate_password(12, false);
        $hash = password_hash($new_password, PASSWORD_DEFAULT);
        $wpdb->update($table, ['password_hash' => $hash], ['id' => $user_id]);

        // Send email
        $subject = 'RaffleMania - Nuova Password';
        $message = "Ciao {$user->username},\n\nLa tua password è stata reimpostata.\n\nNuova password: {$new_password}\n\nTi consigliamo di cambiarla al primo accesso.\n\nRaffleMania Team";
        wp_mail($user->email, $subject, $message);

        $this->log_admin_action('reset_password', $user_id, []);

        return new WP_REST_Response(['success' => true, 'message' => 'Password resettata e email inviata'], 200);
    }

    // === VERIFY EMAIL ===
    public function verify_email(WP_REST_Request $request) {
        global $wpdb;
        $user_id = (int) $request['id'];
        $table = $wpdb->prefix . 'rafflemania_users';

        $wpdb->update($table, [
            'email_verified' => 1,
            'verification_token' => null,
            'verification_token_expires' => null,
        ], ['id' => $user_id]);

        $this->log_admin_action('verify_email', $user_id, []);

        return new WP_REST_Response(['success' => true, 'message' => 'Email verificata'], 200);
    }

    // === BAN/UNBAN ===
    public function toggle_ban(WP_REST_Request $request) {
        global $wpdb;
        $user_id = (int) $request['id'];
        $ban = (bool) $request->get_param('ban');
        $reason = sanitize_text_field($request->get_param('reason') ?: '');
        $table = $wpdb->prefix . 'rafflemania_users';

        $wpdb->update($table, [
            'is_banned' => $ban ? 1 : 0,
            'ban_reason' => $ban ? $reason : null,
            'is_active' => $ban ? 0 : 1,
        ], ['id' => $user_id]);

        $this->log_admin_action($ban ? 'ban_user' : 'unban_user', $user_id, ['reason' => $reason]);

        return new WP_REST_Response([
            'success' => true,
            'message' => $ban ? 'Utente bannato' : 'Utente sbannato'
        ], 200);
    }

    // === FULL PROFILE ===
    public function full_profile(WP_REST_Request $request) {
        global $wpdb;
        $user_id = (int) $request['id'];

        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_tickets = $wpdb->prefix . 'rafflemania_tickets';
        $table_winners = $wpdb->prefix . 'rafflemania_winners';
        $table_transactions = $wpdb->prefix . 'rafflemania_transactions';
        $table_streaks = $wpdb->prefix . 'rafflemania_streaks';
        $table_referrals = $wpdb->prefix . 'rafflemania_referrals';
        $table_admin_log = $wpdb->prefix . 'rafflemania_admin_actions_log';

        $user = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_users} WHERE id = %d", $user_id));
        if (!$user) {
            return new WP_REST_Response(['success' => false, 'message' => 'Utente non trovato'], 404);
        }

        $tickets_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_tickets} WHERE user_id = %d", $user_id));
        $wins_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_winners} WHERE user_id = %d", $user_id));
        $transactions = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$table_transactions} WHERE user_id = %d ORDER BY created_at DESC LIMIT 50", $user_id));
        $streaks = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$table_streaks} WHERE user_id = %d ORDER BY claimed_at DESC LIMIT 30", $user_id));
        $referrals = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$table_referrals} WHERE referrer_user_id = %d", $user_id));
        $admin_actions = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$table_admin_log} WHERE target_user_id = %d ORDER BY created_at DESC LIMIT 50", $user_id));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'user' => $user,
                'stats' => [
                    'total_tickets' => (int)$tickets_count,
                    'total_wins' => (int)$wins_count,
                    'total_referrals' => count($referrals),
                ],
                'transactions' => $transactions,
                'streaks' => $streaks,
                'referrals' => $referrals,
                'admin_actions' => $admin_actions,
            ]
        ], 200);
    }

    // === FORCE TIMER ===
    public function force_timer(WP_REST_Request $request) {
        global $wpdb;
        $prize_id = (int) $request['id'];
        $duration = (int) $request->get_param('duration');
        $table = $wpdb->prefix . 'rafflemania_prizes';

        if ($duration <= 0) $duration = 86400; // default 24h

        $now = current_time('mysql');
        $scheduled = date('Y-m-d H:i:s', strtotime($now) + $duration);

        $wpdb->update($table, [
            'timer_status' => 'countdown',
            'timer_started_at' => $now,
            'scheduled_at' => $scheduled,
            'timer_duration' => $duration,
        ], ['id' => $prize_id]);

        $this->log_admin_action('force_timer', null, ['prize_id' => $prize_id, 'duration' => $duration]);

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Timer avviato',
            'data' => ['scheduled_at' => $scheduled]
        ], 200);
    }

    // === FORCE EXTRACTION ===
    public function force_extraction(WP_REST_Request $request) {
        global $wpdb;
        $prize_id = (int) $request['id'];
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $prize = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table_prizes} WHERE id = %d", $prize_id));
        if (!$prize) {
            return new WP_REST_Response(['success' => false, 'message' => 'Premio non trovato'], 404);
        }

        // Force scheduled_at to now to trigger extraction on next cron
        $wpdb->update($table_prizes, [
            'timer_status' => 'countdown',
            'scheduled_at' => current_time('mysql'),
        ], ['id' => $prize_id]);

        $this->log_admin_action('force_extraction', null, ['prize_id' => $prize_id, 'prize_name' => $prize->name]);

        return new WP_REST_Response([
            'success' => true,
            'message' => "Estrazione forzata per {$prize->name}. Verrà eseguita entro 1 minuto."
        ], 200);
    }

    // === ACTIONS LOG ===
    public function get_actions_log(WP_REST_Request $request) {
        global $wpdb;
        $table = $wpdb->prefix . 'rafflemania_admin_actions_log';
        $page = max(1, (int) $request->get_param('page'));
        $per_page = min(100, max(10, (int) ($request->get_param('per_page') ?: 50)));
        $offset = ($page - 1) * $per_page;

        $total = $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
        $logs = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table} ORDER BY created_at DESC LIMIT %d OFFSET %d",
            $per_page, $offset
        ));

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'logs' => $logs,
                'total' => (int)$total,
                'page' => $page,
                'per_page' => $per_page,
            ]
        ], 200);
    }

    // === HELPER METHODS ===

    private function calculate_level($total_xp) {
        global $wpdb;
        $table = $wpdb->prefix . 'rafflemania_levels';
        $level = $wpdb->get_var($wpdb->prepare(
            "SELECT level FROM {$table} WHERE min_xp <= %d AND is_active = 1 ORDER BY min_xp DESC LIMIT 1",
            $total_xp
        ));
        return $level !== null ? (int)$level : 0;
    }

    private function recalculate_all_levels() {
        global $wpdb;
        $table_users = $wpdb->prefix . 'rafflemania_users';
        $table_levels = $wpdb->prefix . 'rafflemania_levels';

        $levels = $wpdb->get_results("SELECT level, min_xp FROM {$table_levels} WHERE is_active = 1 ORDER BY min_xp DESC");

        foreach ($levels as $l) {
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table_users} SET level = %d WHERE xp >= %d AND level < %d",
                $l->level, $l->min_xp, $l->level
            ));
        }
    }

    private function log_admin_action($action_type, $target_user_id, $details) {
        global $wpdb;
        $wpdb->insert($wpdb->prefix . 'rafflemania_admin_actions_log', [
            'admin_user_id' => get_current_user_id(),
            'action_type' => $action_type,
            'target_user_id' => $target_user_id,
            'details' => json_encode($details),
        ]);
    }
}

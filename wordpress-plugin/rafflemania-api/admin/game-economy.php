<?php
if (!defined('ABSPATH')) exit;

global $wpdb;

$levels_table   = $wpdb->prefix . 'rafflemania_levels';
$packages_table = $wpdb->prefix . 'rafflemania_shop_packages';

// ---------------------------------------------------------------------------
// POST handlers
// ---------------------------------------------------------------------------

$toast_message = '';
$toast_type    = '';

// --- Levels: Add ---
if (isset($_POST['action']) && $_POST['action'] === 'add_level') {
    if (!wp_verify_nonce($_POST['_wpnonce_level'], 'rafflemania_level_nonce')) {
        wp_die('Nonce non valido');
    }
    $wpdb->insert($levels_table, [
        'level'         => intval($_POST['level']),
        'name'          => sanitize_text_field($_POST['name']),
        'min_xp'        => intval($_POST['min_xp']),
        'max_xp'        => intval($_POST['max_xp']),
        'icon'          => sanitize_text_field($_POST['icon']),
        'color'         => sanitize_hex_color($_POST['color']),
        'credit_reward' => intval($_POST['credit_reward']),
        'sort_order'    => intval($_POST['sort_order']),
        'is_active'     => isset($_POST['is_active']) ? 1 : 0,
    ]);
    wp_cache_delete('rafflemania_levels_cache');
    $toast_message = 'Livello aggiunto con successo!';
    $toast_type    = 'success';
}

// --- Levels: Edit ---
if (isset($_POST['action']) && $_POST['action'] === 'edit_level') {
    if (!wp_verify_nonce($_POST['_wpnonce_level'], 'rafflemania_level_nonce')) {
        wp_die('Nonce non valido');
    }
    $wpdb->update($levels_table, [
        'level'         => intval($_POST['level']),
        'name'          => sanitize_text_field($_POST['name']),
        'min_xp'        => intval($_POST['min_xp']),
        'max_xp'        => intval($_POST['max_xp']),
        'icon'          => sanitize_text_field($_POST['icon']),
        'color'         => sanitize_hex_color($_POST['color']),
        'credit_reward' => intval($_POST['credit_reward']),
        'sort_order'    => intval($_POST['sort_order']),
        'is_active'     => isset($_POST['is_active']) ? 1 : 0,
    ], ['id' => intval($_POST['level_id'])]);
    wp_cache_delete('rafflemania_levels_cache');
    $toast_message = 'Livello aggiornato con successo!';
    $toast_type    = 'success';
}

// --- Levels: Delete ---
if (isset($_POST['action']) && $_POST['action'] === 'delete_level') {
    if (!wp_verify_nonce($_POST['_wpnonce_level'], 'rafflemania_level_nonce')) {
        wp_die('Nonce non valido');
    }
    $wpdb->delete($levels_table, ['id' => intval($_POST['level_id'])]);
    wp_cache_delete('rafflemania_levels_cache');
    $toast_message = 'Livello eliminato!';
    $toast_type    = 'success';
}

// --- Shop packages: Add ---
if (isset($_POST['action']) && $_POST['action'] === 'add_package') {
    if (!wp_verify_nonce($_POST['_wpnonce_package'], 'rafflemania_package_nonce')) {
        wp_die('Nonce non valido');
    }
    $wpdb->insert($packages_table, [
        'credits'        => intval($_POST['credits']),
        'price'          => floatval($_POST['price']),
        'discount_label' => sanitize_text_field($_POST['discount_label']),
        'badge'          => sanitize_text_field($_POST['badge']),
        'iap_product_id' => sanitize_text_field($_POST['iap_product_id']),
        'sort_order'     => intval($_POST['sort_order']),
        'is_active'      => isset($_POST['is_active']) ? 1 : 0,
    ]);
    wp_cache_delete('rafflemania_shop_packages_cache');
    $toast_message = 'Pacchetto aggiunto con successo!';
    $toast_type    = 'success';
}

// --- Shop packages: Edit ---
if (isset($_POST['action']) && $_POST['action'] === 'edit_package') {
    if (!wp_verify_nonce($_POST['_wpnonce_package'], 'rafflemania_package_nonce')) {
        wp_die('Nonce non valido');
    }
    $wpdb->update($packages_table, [
        'credits'        => intval($_POST['credits']),
        'price'          => floatval($_POST['price']),
        'discount_label' => sanitize_text_field($_POST['discount_label']),
        'badge'          => sanitize_text_field($_POST['badge']),
        'iap_product_id' => sanitize_text_field($_POST['iap_product_id']),
        'sort_order'     => intval($_POST['sort_order']),
        'is_active'      => isset($_POST['is_active']) ? 1 : 0,
    ], ['id' => intval($_POST['package_id'])]);
    wp_cache_delete('rafflemania_shop_packages_cache');
    $toast_message = 'Pacchetto aggiornato con successo!';
    $toast_type    = 'success';
}

// --- Shop packages: Delete ---
if (isset($_POST['action']) && $_POST['action'] === 'delete_package') {
    if (!wp_verify_nonce($_POST['_wpnonce_package'], 'rafflemania_package_nonce')) {
        wp_die('Nonce non valido');
    }
    $wpdb->delete($packages_table, ['id' => intval($_POST['package_id'])]);
    wp_cache_delete('rafflemania_shop_packages_cache');
    $toast_message = 'Pacchetto eliminato!';
    $toast_type    = 'success';
}

// --- Streak config ---
if (isset($_POST['action']) && $_POST['action'] === 'save_streak') {
    if (!wp_verify_nonce($_POST['_wpnonce_streak'], 'rafflemania_streak_nonce')) {
        wp_die('Nonce non valido');
    }
    $streak_config = [
        'daily_xp'            => intval($_POST['daily_xp']),
        'day_7_xp'            => intval($_POST['day_7_xp']),
        'day_7_credits'       => intval($_POST['day_7_credits']),
        'week_1_credits'      => intval($_POST['week_1_credits']),
        'week_2_credits'      => intval($_POST['week_2_credits']),
        'week_3_credits'      => intval($_POST['week_3_credits']),
        'week_4_credits'      => intval($_POST['week_4_credits']),
        'max_streak'          => intval($_POST['max_streak']),
        'recovery_cost_per_day' => intval($_POST['recovery_cost_per_day']),
    ];
    update_option('rafflemania_streak_config', wp_json_encode($streak_config));
    $toast_message = 'Configurazione streak salvata!';
    $toast_type    = 'success';
}

// --- Limits & XP ---
if (isset($_POST['action']) && $_POST['action'] === 'save_limits_xp') {
    if (!wp_verify_nonce($_POST['_wpnonce_limits'], 'rafflemania_limits_nonce')) {
        wp_die('Nonce non valido');
    }
    $daily_limits = [
        'max_tickets'       => intval($_POST['max_tickets']),
        'max_ads'           => intval($_POST['max_ads']),
        'cooldown_minutes'  => intval($_POST['cooldown_minutes']),
    ];
    // Preserve existing XP fields not shown in form
    $existing_xp = json_decode(get_option('rafflemania_xp_rewards', '{}'), true) ?: [];
    $xp_rewards = array_merge($existing_xp, [
        'watch_ad'         => intval($_POST['watch_ad']),
        'purchase_ticket'  => intval($_POST['purchase_ticket']),
    ]);
    update_option('rafflemania_daily_limits', wp_json_encode($daily_limits));
    update_option('rafflemania_xp_rewards', wp_json_encode($xp_rewards));
    $toast_message = 'Limiti e XP salvati!';
    $toast_type    = 'success';
}

// ---------------------------------------------------------------------------
// Read current data
// ---------------------------------------------------------------------------

$levels   = $wpdb->get_results("SELECT * FROM {$levels_table} ORDER BY sort_order ASC, level ASC", ARRAY_A);
$packages = $wpdb->get_results("SELECT * FROM {$packages_table} ORDER BY sort_order ASC, price ASC", ARRAY_A);

$streak_raw    = get_option('rafflemania_streak_config', '{}');
$streak_config = json_decode($streak_raw, true);
if (!is_array($streak_config)) $streak_config = [];

$limits_raw   = get_option('rafflemania_daily_limits', '{}');
$daily_limits = json_decode($limits_raw, true);
if (!is_array($daily_limits)) $daily_limits = [];

$xp_raw    = get_option('rafflemania_xp_rewards', '{}');
$xp_rewards = json_decode($xp_raw, true);
if (!is_array($xp_rewards)) $xp_rewards = [];

// Helper to get value safely
function rm_val($arr, $key, $default = '') {
    return isset($arr[$key]) ? $arr[$key] : $default;
}
?>

<style>
/* -----------------------------------------------------------------------
   RaffleMania Game Economy – Admin Styles
   ----------------------------------------------------------------------- */
:root {
    --rm-brand: #FF6B00;
    --rm-brand-hover: #E55D00;
    --rm-brand-light: #FFF3E8;
    --rm-success: #16A34A;
    --rm-danger: #DC2626;
    --rm-danger-hover: #B91C1C;
    --rm-gray-50: #F9FAFB;
    --rm-gray-100: #F3F4F6;
    --rm-gray-200: #E5E7EB;
    --rm-gray-300: #D1D5DB;
    --rm-gray-400: #9CA3AF;
    --rm-gray-500: #6B7280;
    --rm-gray-600: #4B5563;
    --rm-gray-700: #374151;
    --rm-gray-800: #1F2937;
    --rm-radius: 12px;
    --rm-shadow: 0 2px 8px rgba(0,0,0,0.08);
    --rm-shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
    --rm-transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Page wrapper */
.rm-economy-wrap {
    margin: 20px 20px 40px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
}

/* Page header */
.rm-page-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
}
.rm-page-header h1 {
    font-size: 28px;
    font-weight: 700;
    color: var(--rm-gray-800);
    margin: 0;
    line-height: 1.2;
}
.rm-page-header .rm-badge {
    background: var(--rm-brand);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

/* Card */
.rm-card {
    background: #fff;
    border-radius: var(--rm-radius);
    box-shadow: var(--rm-shadow);
    margin-bottom: 28px;
    overflow: hidden;
    transition: var(--rm-transition);
    border: 1px solid var(--rm-gray-200);
}
.rm-card:hover {
    box-shadow: var(--rm-shadow-lg);
}
.rm-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--rm-gray-200);
    background: var(--rm-gray-50);
}
.rm-card-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--rm-gray-800);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
}
.rm-card-header h2 .rm-icon {
    width: 32px;
    height: 32px;
    background: var(--rm-brand-light);
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--rm-brand);
    font-size: 16px;
    font-weight: 700;
}
.rm-card-body {
    padding: 24px;
}

/* Tables */
.rm-table-wrap {
    overflow-x: auto;
    margin: 0 -24px;
    padding: 0 24px;
}
table.rm-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
}
table.rm-table thead th {
    background: var(--rm-gray-50);
    color: var(--rm-gray-500);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 14px;
    text-align: left;
    border-bottom: 2px solid var(--rm-gray-200);
    white-space: nowrap;
}
table.rm-table tbody tr {
    transition: var(--rm-transition);
}
table.rm-table tbody tr:hover {
    background: var(--rm-brand-light);
}
table.rm-table tbody td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--rm-gray-100);
    color: var(--rm-gray-700);
    vertical-align: middle;
}
table.rm-table tbody tr:last-child td {
    border-bottom: none;
}
table.rm-table .rm-color-swatch {
    display: inline-block;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    vertical-align: middle;
    margin-right: 6px;
    border: 1px solid var(--rm-gray-200);
}
table.rm-table .rm-status-active {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    background: #DCFCE7;
    color: #166534;
}
table.rm-table .rm-status-inactive {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    background: var(--rm-gray-100);
    color: var(--rm-gray-500);
}

/* Inline edit row */
table.rm-table tbody tr.rm-edit-row {
    background: #FFFBF5;
}
table.rm-table tbody tr.rm-edit-row td {
    padding: 8px 14px;
}

/* Inputs inside tables */
.rm-inline-input {
    width: 100%;
    min-width: 60px;
    padding: 6px 10px;
    border: 1px solid var(--rm-gray-300);
    border-radius: 8px;
    font-size: 13px;
    transition: var(--rm-transition);
    background: #fff;
    color: var(--rm-gray-700);
    box-sizing: border-box;
}
.rm-inline-input:focus {
    outline: none;
    border-color: var(--rm-brand);
    box-shadow: 0 0 0 3px rgba(255,107,0,0.15);
}
.rm-inline-input[type="number"] {
    min-width: 70px;
}
.rm-inline-input[type="color"] {
    min-width: 44px;
    width: 44px;
    height: 34px;
    padding: 2px;
    cursor: pointer;
}
select.rm-inline-input {
    cursor: pointer;
    min-width: 110px;
}

/* Form grid for streak / limits cards */
.rm-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
}
.rm-form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.rm-form-group label {
    font-size: 12px;
    font-weight: 600;
    color: var(--rm-gray-500);
    text-transform: uppercase;
    letter-spacing: 0.3px;
}
.rm-form-group input {
    padding: 10px 14px;
    border: 1px solid var(--rm-gray-300);
    border-radius: 8px;
    font-size: 14px;
    transition: var(--rm-transition);
    color: var(--rm-gray-700);
}
.rm-form-group input:focus {
    outline: none;
    border-color: var(--rm-brand);
    box-shadow: 0 0 0 3px rgba(255,107,0,0.15);
}
.rm-form-group .rm-hint {
    font-size: 11px;
    color: var(--rm-gray-400);
    margin-top: 2px;
}

/* Section divider inside cards */
.rm-section-divider {
    border: none;
    border-top: 1px dashed var(--rm-gray-200);
    margin: 24px 0;
}

.rm-section-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--rm-gray-500);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 16px;
}

/* Buttons */
.rm-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: var(--rm-transition);
    text-decoration: none;
    line-height: 1.4;
    white-space: nowrap;
}
.rm-btn:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255,107,0,0.2);
}
.rm-btn-primary,
.rm-card .button-primary,
.rm-economy-wrap .button-primary {
    background: var(--rm-brand) !important;
    color: #fff !important;
    border: none !important;
    border-color: var(--rm-brand) !important;
    box-shadow: 0 2px 6px rgba(255,107,0,0.3) !important;
}
.rm-btn-primary:hover,
.rm-card .button-primary:hover,
.rm-economy-wrap .button-primary:hover {
    background: var(--rm-brand-hover) !important;
    box-shadow: 0 4px 12px rgba(255,107,0,0.35) !important;
    transform: translateY(-1px);
}
.rm-btn-sm {
    padding: 5px 12px;
    font-size: 12px;
    border-radius: 6px;
}
.rm-btn-success {
    background: var(--rm-success);
    color: #fff;
}
.rm-btn-success:hover {
    background: #15803D;
    transform: translateY(-1px);
}
.rm-btn-danger {
    background: var(--rm-danger);
    color: #fff;
}
.rm-btn-danger:hover {
    background: var(--rm-danger-hover);
    transform: translateY(-1px);
}
.rm-btn-ghost {
    background: transparent;
    color: var(--rm-gray-500);
    border: 1px solid var(--rm-gray-300);
}
.rm-btn-ghost:hover {
    background: var(--rm-gray-100);
    color: var(--rm-gray-700);
}
.rm-btn-icon {
    padding: 6px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--rm-gray-400);
    cursor: pointer;
    transition: var(--rm-transition);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.rm-btn-icon:hover {
    color: var(--rm-brand);
    background: var(--rm-brand-light);
}
.rm-btn-icon.rm-danger-icon:hover {
    color: var(--rm-danger);
    background: #FEF2F2;
}
.rm-actions-cell {
    display: flex;
    gap: 4px;
    align-items: center;
}

/* Add-new row */
.rm-add-row td {
    background: var(--rm-gray-50);
    border-top: 2px solid var(--rm-brand-light);
}

/* Toast notification */
.rm-toast-container {
    position: fixed;
    top: 40px;
    right: 24px;
    z-index: 999999;
    pointer-events: none;
}
.rm-toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 22px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    box-shadow: 0 8px 30px rgba(0,0,0,0.18);
    animation: rmToastIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards,
               rmToastOut 0.4s 3.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    max-width: 380px;
}
.rm-toast-success {
    background: var(--rm-success);
}
.rm-toast-error {
    background: var(--rm-danger);
}
.rm-toast-icon {
    font-size: 18px;
    flex-shrink: 0;
}
@keyframes rmToastIn {
    from { opacity: 0; transform: translateX(40px) scale(0.95); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes rmToastOut {
    from { opacity: 1; transform: translateX(0) scale(1); }
    to   { opacity: 0; transform: translateX(40px) scale(0.95); }
}

/* Checkbox toggle */
.rm-toggle {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
}
.rm-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}
.rm-toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: var(--rm-gray-300);
    border-radius: 22px;
    transition: var(--rm-transition);
}
.rm-toggle-slider::before {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    left: 3px;
    bottom: 3px;
    background: #fff;
    border-radius: 50%;
    transition: var(--rm-transition);
}
.rm-toggle input:checked + .rm-toggle-slider {
    background: var(--rm-brand);
}
.rm-toggle input:checked + .rm-toggle-slider::before {
    transform: translateX(18px);
}

/* Card footer */
.rm-card-footer {
    padding: 16px 24px;
    background: var(--rm-gray-50);
    border-top: 1px solid var(--rm-gray-200);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

/* Empty state */
.rm-empty {
    text-align: center;
    padding: 40px 20px;
    color: var(--rm-gray-400);
}
.rm-empty-icon {
    font-size: 40px;
    margin-bottom: 10px;
}
.rm-empty-text {
    font-size: 14px;
}

/* Responsive */
@media (max-width: 782px) {
    .rm-economy-wrap { margin: 10px 10px 30px 0; }
    .rm-card-body { padding: 16px; }
    .rm-form-grid { grid-template-columns: 1fr; }
    .rm-page-header h1 { font-size: 22px; }
    .rm-card-header { flex-direction: column; align-items: flex-start; gap: 10px; }
    table.rm-table { font-size: 12px; }
    table.rm-table thead th,
    table.rm-table tbody td { padding: 8px 8px; }
}

/* Confirmation dialog overlay */
.rm-confirm-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 999998;
    justify-content: center;
    align-items: center;
    animation: rmFadeIn 0.2s ease;
}
.rm-confirm-overlay.rm-active {
    display: flex;
}
.rm-confirm-box {
    background: #fff;
    border-radius: var(--rm-radius);
    box-shadow: var(--rm-shadow-lg);
    padding: 32px;
    max-width: 380px;
    width: 90%;
    text-align: center;
    animation: rmScaleIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.rm-confirm-box h3 {
    margin: 0 0 8px;
    font-size: 18px;
    color: var(--rm-gray-800);
}
.rm-confirm-box p {
    color: var(--rm-gray-500);
    font-size: 14px;
    margin: 0 0 24px;
}
.rm-confirm-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
}
@keyframes rmFadeIn {
    from { opacity: 0; } to { opacity: 1; }
}
@keyframes rmScaleIn {
    from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); }
}
</style>

<div class="rm-economy-wrap">

    <!-- Page Header -->
    <div class="rm-page-header">
        <h1>Economia di Gioco</h1>
        <span class="rm-badge">RaffleMania</span>
    </div>

    <?php if ($toast_message): ?>
    <div class="rm-toast-container">
        <div class="rm-toast rm-toast-<?php echo esc_attr($toast_type); ?>">
            <span class="rm-toast-icon"><?php echo $toast_type === 'success' ? '&#10003;' : '&#10007;'; ?></span>
            <span><?php echo esc_html($toast_message); ?></span>
        </div>
    </div>
    <?php endif; ?>

    <!-- Confirmation Dialog (shared) -->
    <div class="rm-confirm-overlay" id="rmConfirmOverlay">
        <div class="rm-confirm-box">
            <h3>Conferma eliminazione</h3>
            <p>Sei sicuro di voler eliminare questo elemento? Questa azione non pu&ograve; essere annullata.</p>
            <div class="rm-confirm-actions">
                <button type="button" class="rm-btn rm-btn-ghost" onclick="rmCancelDelete()">Annulla</button>
                <button type="button" class="rm-btn rm-btn-danger" id="rmConfirmBtn" onclick="rmConfirmDelete()">Elimina</button>
            </div>
        </div>
    </div>

    <!-- ===================================================================
         1. LIVELLI
         =================================================================== -->
    <div class="rm-card">
        <div class="rm-card-header">
            <h2>
                <span class="rm-icon">&#9733;</span>
                Livelli
            </h2>
            <button type="button" class="rm-btn rm-btn-primary rm-btn-sm" onclick="document.getElementById('rmAddLevelRow').style.display = document.getElementById('rmAddLevelRow').style.display === 'none' ? 'table-row' : 'none';">
                + Aggiungi Livello
            </button>
        </div>
        <div class="rm-card-body">
            <div class="rm-table-wrap">
                <table class="rm-table">
                    <thead>
                        <tr>
                            <th>Liv.</th>
                            <th>Nome</th>
                            <th>XP Min</th>
                            <th>XP Max</th>
                            <th>Icona</th>
                            <th>Colore</th>
                            <th>Crediti Premio</th>
                            <th>Ordine</th>
                            <th>Attivo</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($levels)): ?>
                        <tr>
                            <td colspan="10">
                                <div class="rm-empty">
                                    <div class="rm-empty-icon">&#127942;</div>
                                    <div class="rm-empty-text">Nessun livello configurato. Aggiungi il primo!</div>
                                </div>
                            </td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($levels as $lvl): ?>
                            <!-- Display row -->
                            <tr id="rm-level-view-<?php echo intval($lvl['id']); ?>">
                                <td><strong><?php echo esc_html($lvl['level']); ?></strong></td>
                                <td><?php echo esc_html($lvl['name']); ?></td>
                                <td><?php echo number_format(intval($lvl['min_xp'])); ?></td>
                                <td><?php echo number_format(intval($lvl['max_xp'])); ?></td>
                                <td><code><?php echo esc_html($lvl['icon']); ?></code></td>
                                <td>
                                    <span class="rm-color-swatch" style="background:<?php echo esc_attr($lvl['color']); ?>;"></span>
                                    <?php echo esc_html($lvl['color']); ?>
                                </td>
                                <td><?php echo number_format(intval($lvl['credit_reward'])); ?></td>
                                <td><?php echo intval($lvl['sort_order']); ?></td>
                                <td>
                                    <?php if (intval($lvl['is_active'])): ?>
                                        <span class="rm-status-active">Attivo</span>
                                    <?php else: ?>
                                        <span class="rm-status-inactive">Inattivo</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <div class="rm-actions-cell">
                                        <button type="button" class="rm-btn-icon" title="Modifica" onclick="rmToggleLevelEdit(<?php echo intval($lvl['id']); ?>)">&#9998;</button>
                                        <button type="button" class="rm-btn-icon rm-danger-icon" title="Elimina" onclick="rmRequestDelete('level', <?php echo intval($lvl['id']); ?>)">&#128465;</button>
                                    </div>
                                </td>
                            </tr>
                            <!-- Edit row (hidden) -->
                            <tr id="rm-level-edit-<?php echo intval($lvl['id']); ?>" class="rm-edit-row" style="display:none;">
                                <td colspan="10">
                                    <form method="post">
                                        <input type="hidden" name="action" value="edit_level" />
                                        <input type="hidden" name="level_id" value="<?php echo intval($lvl['id']); ?>" />
                                        <?php wp_nonce_field('rafflemania_level_nonce', '_wpnonce_level'); ?>
                                        <table style="width:100%;border:none;border-spacing:8px;">
                                            <tr>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">LIVELLO</label><br/>
                                                    <input type="number" name="level" class="rm-inline-input" value="<?php echo esc_attr($lvl['level']); ?>" min="0" required />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">NOME</label><br/>
                                                    <input type="text" name="name" class="rm-inline-input" value="<?php echo esc_attr($lvl['name']); ?>" required />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">XP MIN</label><br/>
                                                    <input type="number" name="min_xp" class="rm-inline-input" value="<?php echo esc_attr($lvl['min_xp']); ?>" min="0" required />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">XP MAX</label><br/>
                                                    <input type="number" name="max_xp" class="rm-inline-input" value="<?php echo esc_attr($lvl['max_xp']); ?>" min="0" required />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">ICONA</label><br/>
                                                    <input type="text" name="icon" class="rm-inline-input" value="<?php echo esc_attr($lvl['icon']); ?>" placeholder="trophy-outline" />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">COLORE</label><br/>
                                                    <input type="color" name="color" class="rm-inline-input" value="<?php echo esc_attr($lvl['color']); ?>" />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">CREDITI</label><br/>
                                                    <input type="number" name="credit_reward" class="rm-inline-input" value="<?php echo esc_attr($lvl['credit_reward']); ?>" min="0" required />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">ORDINE</label><br/>
                                                    <input type="number" name="sort_order" class="rm-inline-input" value="<?php echo esc_attr($lvl['sort_order']); ?>" min="0" />
                                                </td>
                                                <td style="border:none;padding:4px;vertical-align:bottom;">
                                                    <label class="rm-toggle" title="Attivo">
                                                        <input type="checkbox" name="is_active" value="1" <?php checked(intval($lvl['is_active']), 1); ?> />
                                                        <span class="rm-toggle-slider"></span>
                                                    </label>
                                                </td>
                                                <td style="border:none;padding:4px;vertical-align:bottom;">
                                                    <div class="rm-actions-cell">
                                                        <button type="submit" class="rm-btn rm-btn-success rm-btn-sm" title="Salva">&#10003;</button>
                                                        <button type="button" class="rm-btn rm-btn-ghost rm-btn-sm" title="Annulla" onclick="rmToggleLevelEdit(<?php echo intval($lvl['id']); ?>)">&#10007;</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </form>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>

                        <!-- Add new level row (hidden by default) -->
                        <tr id="rmAddLevelRow" class="rm-add-row" style="display:none;">
                            <td colspan="10">
                                <form method="post">
                                    <input type="hidden" name="action" value="add_level" />
                                    <?php wp_nonce_field('rafflemania_level_nonce', '_wpnonce_level'); ?>
                                    <table style="width:100%;border:none;border-spacing:8px;">
                                        <tr>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">LIVELLO</label><br/>
                                                <input type="number" name="level" class="rm-inline-input" placeholder="1" min="0" required />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">NOME</label><br/>
                                                <input type="text" name="name" class="rm-inline-input" placeholder="Principiante" required />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">XP MIN</label><br/>
                                                <input type="number" name="min_xp" class="rm-inline-input" placeholder="0" min="0" required />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">XP MAX</label><br/>
                                                <input type="number" name="max_xp" class="rm-inline-input" placeholder="100" min="0" required />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">ICONA</label><br/>
                                                <input type="text" name="icon" class="rm-inline-input" placeholder="trophy-outline" />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">COLORE</label><br/>
                                                <input type="color" name="color" class="rm-inline-input" value="#FF6B00" />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">CREDITI</label><br/>
                                                <input type="number" name="credit_reward" class="rm-inline-input" placeholder="10" min="0" required />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">ORDINE</label><br/>
                                                <input type="number" name="sort_order" class="rm-inline-input" value="0" min="0" />
                                            </td>
                                            <td style="border:none;padding:4px;vertical-align:bottom;">
                                                <label class="rm-toggle" title="Attivo">
                                                    <input type="checkbox" name="is_active" value="1" checked />
                                                    <span class="rm-toggle-slider"></span>
                                                </label>
                                            </td>
                                            <td style="border:none;padding:4px;vertical-align:bottom;">
                                                <button type="submit" class="rm-btn rm-btn-primary rm-btn-sm">Salva</button>
                                            </td>
                                        </tr>
                                    </table>
                                </form>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Delete form for levels (hidden) -->
    <form id="rmDeleteLevelForm" method="post" style="display:none;">
        <input type="hidden" name="action" value="delete_level" />
        <input type="hidden" name="level_id" id="rmDeleteLevelId" value="" />
        <?php wp_nonce_field('rafflemania_level_nonce', '_wpnonce_level'); ?>
    </form>

    <!-- ===================================================================
         2. PACCHETTI SHOP
         =================================================================== -->
    <div class="rm-card">
        <div class="rm-card-header">
            <h2>
                <span class="rm-icon">&#128176;</span>
                Pacchetti Shop
            </h2>
            <button type="button" class="rm-btn rm-btn-primary rm-btn-sm" onclick="document.getElementById('rmAddPkgRow').style.display = document.getElementById('rmAddPkgRow').style.display === 'none' ? 'table-row' : 'none';">
                + Aggiungi Pacchetto
            </button>
        </div>
        <div class="rm-card-body">
            <div class="rm-table-wrap">
                <table class="rm-table">
                    <thead>
                        <tr>
                            <th>Crediti</th>
                            <th>Prezzo &euro;</th>
                            <th>Etichetta Sconto</th>
                            <th>Badge</th>
                            <th>IAP Product ID</th>
                            <th>Ordine</th>
                            <th>Attivo</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($packages)): ?>
                        <tr>
                            <td colspan="8">
                                <div class="rm-empty">
                                    <div class="rm-empty-icon">&#128717;</div>
                                    <div class="rm-empty-text">Nessun pacchetto configurato. Aggiungi il primo!</div>
                                </div>
                            </td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($packages as $pkg): ?>
                            <!-- Display row -->
                            <tr id="rm-pkg-view-<?php echo intval($pkg['id']); ?>">
                                <td><strong><?php echo number_format(intval($pkg['credits'])); ?></strong></td>
                                <td>&euro; <?php echo esc_html(number_format(floatval($pkg['price']), 2, ',', '.')); ?></td>
                                <td><?php echo esc_html($pkg['discount_label']); ?></td>
                                <td>
                                    <?php
                                    $badge_labels = [
                                        'most_popular' => 'Pi&ugrave; Popolare',
                                        'best_value'   => 'Miglior Affare',
                                        'none'         => '&mdash;',
                                        ''             => '&mdash;',
                                    ];
                                    $badge_val = isset($pkg['badge']) ? $pkg['badge'] : '';
                                    echo isset($badge_labels[$badge_val]) ? $badge_labels[$badge_val] : esc_html($badge_val);
                                    ?>
                                </td>
                                <td><code><?php echo esc_html($pkg['iap_product_id']); ?></code></td>
                                <td><?php echo intval($pkg['sort_order']); ?></td>
                                <td>
                                    <?php if (intval($pkg['is_active'])): ?>
                                        <span class="rm-status-active">Attivo</span>
                                    <?php else: ?>
                                        <span class="rm-status-inactive">Inattivo</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <div class="rm-actions-cell">
                                        <button type="button" class="rm-btn-icon" title="Modifica" onclick="rmTogglePkgEdit(<?php echo intval($pkg['id']); ?>)">&#9998;</button>
                                        <button type="button" class="rm-btn-icon rm-danger-icon" title="Elimina" onclick="rmRequestDelete('package', <?php echo intval($pkg['id']); ?>)">&#128465;</button>
                                    </div>
                                </td>
                            </tr>
                            <!-- Edit row (hidden) -->
                            <tr id="rm-pkg-edit-<?php echo intval($pkg['id']); ?>" class="rm-edit-row" style="display:none;">
                                <td colspan="8">
                                    <form method="post">
                                        <input type="hidden" name="action" value="edit_package" />
                                        <input type="hidden" name="package_id" value="<?php echo intval($pkg['id']); ?>" />
                                        <?php wp_nonce_field('rafflemania_package_nonce', '_wpnonce_package'); ?>
                                        <table style="width:100%;border:none;border-spacing:8px;">
                                            <tr>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">CREDITI</label><br/>
                                                    <input type="number" name="credits" class="rm-inline-input" value="<?php echo esc_attr($pkg['credits']); ?>" min="0" required />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">PREZZO &euro;</label><br/>
                                                    <input type="number" name="price" class="rm-inline-input" step="0.01" min="0" value="<?php echo esc_attr($pkg['price']); ?>" required />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">ETICHETTA SCONTO</label><br/>
                                                    <input type="text" name="discount_label" class="rm-inline-input" value="<?php echo esc_attr($pkg['discount_label']); ?>" placeholder="-20%" />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">BADGE</label><br/>
                                                    <select name="badge" class="rm-inline-input">
                                                        <option value="none" <?php selected($pkg['badge'], 'none'); ?>>Nessuno</option>
                                                        <option value="most_popular" <?php selected($pkg['badge'], 'most_popular'); ?>>Pi&ugrave; Popolare</option>
                                                        <option value="best_value" <?php selected($pkg['badge'], 'best_value'); ?>>Miglior Affare</option>
                                                    </select>
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">IAP PRODUCT ID</label><br/>
                                                    <input type="text" name="iap_product_id" class="rm-inline-input" value="<?php echo esc_attr($pkg['iap_product_id']); ?>" />
                                                </td>
                                                <td style="border:none;padding:4px;">
                                                    <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">ORDINE</label><br/>
                                                    <input type="number" name="sort_order" class="rm-inline-input" value="<?php echo esc_attr($pkg['sort_order']); ?>" min="0" />
                                                </td>
                                                <td style="border:none;padding:4px;vertical-align:bottom;">
                                                    <label class="rm-toggle" title="Attivo">
                                                        <input type="checkbox" name="is_active" value="1" <?php checked(intval($pkg['is_active']), 1); ?> />
                                                        <span class="rm-toggle-slider"></span>
                                                    </label>
                                                </td>
                                                <td style="border:none;padding:4px;vertical-align:bottom;">
                                                    <div class="rm-actions-cell">
                                                        <button type="submit" class="rm-btn rm-btn-success rm-btn-sm" title="Salva">&#10003;</button>
                                                        <button type="button" class="rm-btn rm-btn-ghost rm-btn-sm" title="Annulla" onclick="rmTogglePkgEdit(<?php echo intval($pkg['id']); ?>)">&#10007;</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </form>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>

                        <!-- Add new package row -->
                        <tr id="rmAddPkgRow" class="rm-add-row" style="display:none;">
                            <td colspan="8">
                                <form method="post">
                                    <input type="hidden" name="action" value="add_package" />
                                    <?php wp_nonce_field('rafflemania_package_nonce', '_wpnonce_package'); ?>
                                    <table style="width:100%;border:none;border-spacing:8px;">
                                        <tr>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">CREDITI</label><br/>
                                                <input type="number" name="credits" class="rm-inline-input" placeholder="100" min="0" required />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">PREZZO &euro;</label><br/>
                                                <input type="number" name="price" class="rm-inline-input" step="0.01" min="0" placeholder="4.99" required />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">ETICHETTA SCONTO</label><br/>
                                                <input type="text" name="discount_label" class="rm-inline-input" placeholder="-20%" />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">BADGE</label><br/>
                                                <select name="badge" class="rm-inline-input">
                                                    <option value="none">Nessuno</option>
                                                    <option value="most_popular">Pi&ugrave; Popolare</option>
                                                    <option value="best_value">Miglior Affare</option>
                                                </select>
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">IAP PRODUCT ID</label><br/>
                                                <input type="text" name="iap_product_id" class="rm-inline-input" placeholder="com.app.credits100" />
                                            </td>
                                            <td style="border:none;padding:4px;">
                                                <label style="font-size:11px;color:var(--rm-gray-500);font-weight:600;">ORDINE</label><br/>
                                                <input type="number" name="sort_order" class="rm-inline-input" value="0" min="0" />
                                            </td>
                                            <td style="border:none;padding:4px;vertical-align:bottom;">
                                                <label class="rm-toggle" title="Attivo">
                                                    <input type="checkbox" name="is_active" value="1" checked />
                                                    <span class="rm-toggle-slider"></span>
                                                </label>
                                            </td>
                                            <td style="border:none;padding:4px;vertical-align:bottom;">
                                                <button type="submit" class="rm-btn rm-btn-primary rm-btn-sm">Salva</button>
                                            </td>
                                        </tr>
                                    </table>
                                </form>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Delete form for packages (hidden) -->
    <form id="rmDeletePackageForm" method="post" style="display:none;">
        <input type="hidden" name="action" value="delete_package" />
        <input type="hidden" name="package_id" id="rmDeletePackageId" value="" />
        <?php wp_nonce_field('rafflemania_package_nonce', '_wpnonce_package'); ?>
    </form>

    <!-- ===================================================================
         3. STREAK REWARDS
         =================================================================== -->
    <div class="rm-card">
        <div class="rm-card-header">
            <h2>
                <span class="rm-icon">&#128293;</span>
                Streak Rewards
            </h2>
        </div>
        <div class="rm-card-body">
            <form method="post">
                <input type="hidden" name="action" value="save_streak" />
                <?php wp_nonce_field('rafflemania_streak_nonce', '_wpnonce_streak'); ?>

                <div class="rm-section-title">Ricompense Giornaliere</div>
                <div class="rm-form-grid">
                    <div class="rm-form-group">
                        <label for="rm_daily_xp">XP Giornalieri</label>
                        <input type="number" id="rm_daily_xp" name="daily_xp" min="0" value="<?php echo esc_attr(rm_val($streak_config, 'daily_xp', 10)); ?>" />
                        <span class="rm-hint">XP ottenuti per ogni check-in giornaliero</span>
                    </div>
                    <div class="rm-form-group">
                        <label for="rm_day7_xp">XP Giorno 7</label>
                        <input type="number" id="rm_day7_xp" name="day_7_xp" min="0" value="<?php echo esc_attr(rm_val($streak_config, 'day_7_xp', 10)); ?>" />
                        <span class="rm-hint">Bonus XP al settimo giorno consecutivo</span>
                    </div>
                    <div class="rm-form-group">
                        <label for="rm_day7_credits">Crediti Giorno 7</label>
                        <input type="number" id="rm_day7_credits" name="day_7_credits" min="0" value="<?php echo esc_attr(rm_val($streak_config, 'day_7_credits', 1)); ?>" />
                        <span class="rm-hint">Bonus crediti al settimo giorno consecutivo</span>
                    </div>
                </div>

                <hr class="rm-section-divider" />

                <div class="rm-section-title">Bonus Settimanali (Crediti)</div>
                <div class="rm-form-grid">
                    <div class="rm-form-group">
                        <label for="rm_week1">Settimana 1</label>
                        <input type="number" id="rm_week1" name="week_1_credits" min="0" value="<?php echo esc_attr(rm_val($streak_config, 'week_1_credits', 1)); ?>" />
                    </div>
                    <div class="rm-form-group">
                        <label for="rm_week2">Settimana 2</label>
                        <input type="number" id="rm_week2" name="week_2_credits" min="0" value="<?php echo esc_attr(rm_val($streak_config, 'week_2_credits', 2)); ?>" />
                    </div>
                    <div class="rm-form-group">
                        <label for="rm_week3">Settimana 3</label>
                        <input type="number" id="rm_week3" name="week_3_credits" min="0" value="<?php echo esc_attr(rm_val($streak_config, 'week_3_credits', 3)); ?>" />
                    </div>
                    <div class="rm-form-group">
                        <label for="rm_week4">Settimana 4</label>
                        <input type="number" id="rm_week4" name="week_4_credits" min="0" value="<?php echo esc_attr(rm_val($streak_config, 'week_4_credits', 5)); ?>" />
                    </div>
                </div>

                <hr class="rm-section-divider" />

                <div class="rm-section-title">Parametri Streak</div>
                <div class="rm-form-grid">
                    <div class="rm-form-group">
                        <label for="rm_max_streak">Streak Massima (giorni)</label>
                        <input type="number" id="rm_max_streak" name="max_streak" min="1" value="<?php echo esc_attr(rm_val($streak_config, 'max_streak', 1000)); ?>" />
                        <span class="rm-hint">Numero massimo di giorni consecutivi conteggiati</span>
                    </div>
                    <div class="rm-form-group">
                        <label for="rm_recovery_cost">Costo Recupero / Giorno</label>
                        <input type="number" id="rm_recovery_cost" name="recovery_cost_per_day" min="0" value="<?php echo esc_attr(rm_val($streak_config, 'recovery_cost_per_day', 2)); ?>" />
                        <span class="rm-hint">Crediti necessari per recuperare un giorno perso</span>
                    </div>
                </div>

                <div class="rm-card-footer" style="margin: 24px -24px -24px; border-radius: 0 0 12px 12px;">
                    <button type="submit" class="rm-btn rm-btn-primary">Salva Configurazione Streak</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ===================================================================
         4. LIMITI E XP
         =================================================================== -->
    <div class="rm-card">
        <div class="rm-card-header">
            <h2>
                <span class="rm-icon">&#9889;</span>
                Limiti e XP
            </h2>
        </div>
        <div class="rm-card-body">
            <form method="post">
                <input type="hidden" name="action" value="save_limits_xp" />
                <?php wp_nonce_field('rafflemania_limits_nonce', '_wpnonce_limits'); ?>

                <div class="rm-section-title">Limiti Giornalieri</div>
                <div class="rm-form-grid">
                    <div class="rm-form-group">
                        <label for="rm_max_tickets">Max Ticket / Giorno</label>
                        <input type="number" id="rm_max_tickets" name="max_tickets" min="0" value="<?php echo esc_attr(rm_val($daily_limits, 'max_tickets', 60)); ?>" />
                        <span class="rm-hint">Numero massimo di ticket riscattabili al giorno</span>
                    </div>
                    <div class="rm-form-group">
                        <label for="rm_max_ads">Max Annunci / Giorno</label>
                        <input type="number" id="rm_max_ads" name="max_ads" min="0" value="<?php echo esc_attr(rm_val($daily_limits, 'max_ads', 72)); ?>" />
                        <span class="rm-hint">Numero massimo di annunci visualizzabili al giorno</span>
                    </div>
                    <div class="rm-form-group">
                        <label for="rm_cooldown">Cooldown (minuti)</label>
                        <input type="number" id="rm_cooldown" name="cooldown_minutes" min="0" value="<?php echo esc_attr(rm_val($daily_limits, 'cooldown_minutes', 20)); ?>" />
                        <span class="rm-hint">Tempo di attesa tra un&rsquo;azione e l&rsquo;altra</span>
                    </div>
                </div>

                <hr class="rm-section-divider" />

                <div class="rm-section-title">Ricompense XP</div>
                <div class="rm-form-grid">
                    <div class="rm-form-group">
                        <label for="rm_xp_ad">XP per Annuncio</label>
                        <input type="number" id="rm_xp_ad" name="watch_ad" min="0" value="<?php echo esc_attr(rm_val($xp_rewards, 'watch_ad', 3)); ?>" />
                        <span class="rm-hint">Punti esperienza ottenuti guardando un annuncio</span>
                    </div>
                    <div class="rm-form-group">
                        <label for="rm_xp_ticket">XP per Ticket</label>
                        <input type="number" id="rm_xp_ticket" name="purchase_ticket" min="0" value="<?php echo esc_attr(rm_val($xp_rewards, 'purchase_ticket', 2)); ?>" />
                        <span class="rm-hint">Punti esperienza ottenuti riscattando un ticket</span>
                    </div>
                </div>

                <div class="rm-card-footer" style="margin: 24px -24px -24px; border-radius: 0 0 12px 12px;">
                    <button type="submit" class="rm-btn rm-btn-primary">Salva Limiti e XP</button>
                </div>
            </form>
        </div>
    </div>

</div><!-- .rm-economy-wrap -->

<script>
(function() {
    'use strict';

    /* ----- Toggle inline edit rows for Levels ----- */
    window.rmToggleLevelEdit = function(id) {
        var viewRow = document.getElementById('rm-level-view-' + id);
        var editRow = document.getElementById('rm-level-edit-' + id);
        if (!viewRow || !editRow) return;
        var isHidden = editRow.style.display === 'none';
        viewRow.style.display = isHidden ? 'none' : '';
        editRow.style.display = isHidden ? 'table-row' : 'none';
    };

    /* ----- Toggle inline edit rows for Packages ----- */
    window.rmTogglePkgEdit = function(id) {
        var viewRow = document.getElementById('rm-pkg-view-' + id);
        var editRow = document.getElementById('rm-pkg-edit-' + id);
        if (!viewRow || !editRow) return;
        var isHidden = editRow.style.display === 'none';
        viewRow.style.display = isHidden ? 'none' : '';
        editRow.style.display = isHidden ? 'table-row' : 'none';
    };

    /* ----- Confirm delete ----- */
    var pendingDeleteType = null;
    var pendingDeleteId   = null;

    window.rmRequestDelete = function(type, id) {
        pendingDeleteType = type;
        pendingDeleteId   = id;
        document.getElementById('rmConfirmOverlay').classList.add('rm-active');
    };

    window.rmCancelDelete = function() {
        pendingDeleteType = null;
        pendingDeleteId   = null;
        document.getElementById('rmConfirmOverlay').classList.remove('rm-active');
    };

    window.rmConfirmDelete = function() {
        if (pendingDeleteType === 'level') {
            document.getElementById('rmDeleteLevelId').value = pendingDeleteId;
            document.getElementById('rmDeleteLevelForm').submit();
        } else if (pendingDeleteType === 'package') {
            document.getElementById('rmDeletePackageId').value = pendingDeleteId;
            document.getElementById('rmDeletePackageForm').submit();
        }
    };

    /* Close overlay on backdrop click */
    var overlay = document.getElementById('rmConfirmOverlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                rmCancelDelete();
            }
        });
    }

    /* ----- Auto-remove toast after animation ----- */
    var toast = document.querySelector('.rm-toast');
    if (toast) {
        setTimeout(function() {
            toast.parentElement.remove();
        }, 4200);
    }
})();
</script>

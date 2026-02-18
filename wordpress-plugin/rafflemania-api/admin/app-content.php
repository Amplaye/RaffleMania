<?php
if (!defined('ABSPATH')) exit;

// ─── Nonce & Save ───────────────────────────────────────────────────────────
$toast_message = '';
$toast_type    = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['rafflemania_app_content_nonce'])) {

    if ( ! wp_verify_nonce($_POST['rafflemania_app_content_nonce'], 'rafflemania_save_app_content')) {
        wp_die('Azione non autorizzata.');
    }

    // ── Section 1 – Passi Referral ──────────────────────────────────────────
    $referral_steps = array();
    if (!empty($_POST['step_icon']) && is_array($_POST['step_icon'])) {
        $icons        = array_map('sanitize_text_field', $_POST['step_icon']);
        $titles       = array_map('sanitize_text_field', $_POST['step_title']);
        $descriptions = array_map('sanitize_textarea_field', $_POST['step_description']);

        foreach ($icons as $i => $icon) {
            if ($icon === '' && $titles[$i] === '' && $descriptions[$i] === '') {
                continue; // skip completely empty rows
            }
            $referral_steps[] = array(
                'icon'        => $icon,
                'title'       => $titles[$i],
                'description' => $descriptions[$i],
            );
        }
    }

    $app_content = array(
        'referral_steps' => $referral_steps,
    );
    update_option('rafflemania_app_content', wp_json_encode($app_content));

    // ── Section 2 – Config Referral ─────────────────────────────────────────
    $referral_config = array(
        'days_required'    => absint($_POST['days_required'] ?? 0),
        'referrer_credits' => absint($_POST['referrer_credits'] ?? 0),
        'referred_credits' => absint($_POST['referred_credits'] ?? 0),
    );
    update_option('rafflemania_referral_config', wp_json_encode($referral_config));

    $toast_message = 'Impostazioni salvate con successo!';
    $toast_type    = 'success';
}

// ─── Load current data ──────────────────────────────────────────────────────
$raw_content     = get_option('rafflemania_app_content', '{}');
$app_content     = json_decode($raw_content, true);
if (!is_array($app_content)) {
    $app_content = array();
}

$referral_steps  = isset($app_content['referral_steps']) && is_array($app_content['referral_steps'])
    ? $app_content['referral_steps']
    : array(
        array('icon' => 'share-social-outline', 'title' => 'Condividi il link',   'description' => 'Invia il tuo link personale ad un amico.'),
        array('icon' => 'person-add-outline',   'title' => 'Amico si registra',   'description' => "Il tuo amico si iscrive tramite il tuo link."),
        array('icon' => 'time-outline',         'title' => 'Attendi la verifica', 'description' => "L'amico deve restare attivo per il periodo richiesto."),
        array('icon' => 'gift-outline',         'title' => 'Ottieni i crediti',   'description' => 'Entrambi ricevete crediti bonus!'),
    );

$raw_config      = get_option('rafflemania_referral_config', '{}');
$referral_config = json_decode($raw_config, true);
if (!is_array($referral_config)) {
    $referral_config = array();
}

$days_required    = isset($referral_config['days_required'])    ? absint($referral_config['days_required'])    : 7;
$referrer_credits = isset($referral_config['referrer_credits']) ? absint($referral_config['referrer_credits']) : 10;
$referred_credits = isset($referral_config['referred_credits']) ? absint($referral_config['referred_credits']) : 5;
?>

<style>
/* ─── Reset & base ───────────────────────────────────────────────────────── */
#rm-wrap *,
#rm-wrap *::before,
#rm-wrap *::after { box-sizing: border-box; }

#rm-wrap {
    margin: 30px 20px 60px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    color: #1e1e1e;
}

/* ─── Page header ────────────────────────────────────────────────────────── */
.rm-page-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 32px;
}
.rm-page-header .rm-logo {
    width: 44px;
    height: 44px;
    background: #FF6B00;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 22px;
    flex-shrink: 0;
}
.rm-page-header h1 {
    font-size: 26px;
    font-weight: 700;
    margin: 0;
    padding: 0;
    color: #1e1e1e;
}
.rm-page-header p {
    margin: 2px 0 0;
    color: #666;
    font-size: 14px;
}

/* ─── Cards ──────────────────────────────────────────────────────────────── */
.rm-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    padding: 28px 32px 32px;
    margin-bottom: 28px;
    transition: box-shadow 0.25s ease;
}
.rm-card:hover {
    box-shadow: 0 4px 20px rgba(0,0,0,0.10);
}
.rm-card-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 6px;
    color: #1e1e1e;
}
.rm-card-title .rm-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #FF6B00;
    flex-shrink: 0;
}
.rm-card-subtitle {
    font-size: 13px;
    color: #888;
    margin: 0 0 24px;
    padding-left: 20px;
}

/* ─── Form elements ──────────────────────────────────────────────────────── */
.rm-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #444;
    margin-bottom: 6px;
}
.rm-input,
.rm-textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    color: #1e1e1e;
    background: #fafafa;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    outline: none;
    font-family: inherit;
}
.rm-input:focus,
.rm-textarea:focus {
    border-color: #FF6B00;
    box-shadow: 0 0 0 3px rgba(255,107,0,0.12);
    background: #fff;
}
.rm-textarea {
    resize: vertical;
    min-height: 70px;
}

/* ─── Inline field grid (Config Referral) ────────────────────────────────── */
.rm-fields-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
}
.rm-field-group {
    margin-bottom: 20px;
}
.rm-field-group:last-child {
    margin-bottom: 0;
}

/* ─── Step cards (Passi Referral) ────────────────────────────────────────── */
.rm-steps-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
.rm-step-item {
    background: #f9f9fb;
    border: 1.5px solid #eee;
    border-radius: 10px;
    padding: 20px;
    position: relative;
    transition: border-color 0.2s ease, transform 0.2s ease;
    animation: rmSlideIn 0.3s ease;
}
.rm-step-item:hover {
    border-color: #FF6B00;
}
@keyframes rmSlideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
}
.rm-step-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}
.rm-step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #FF6B00;
    color: #fff;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
}
.rm-step-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}
.rm-step-fields .rm-field-full {
    grid-column: 1 / -1;
}

/* ─── Buttons ────────────────────────────────────────────────────────────── */
.rm-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
    font-family: inherit;
    line-height: 1.4;
}
.rm-btn:active {
    transform: scale(0.97);
}
.rm-btn-primary {
    background: #FF6B00;
    color: #fff;
    padding: 12px 32px;
    font-size: 15px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(255,107,0,0.25);
}
.rm-btn-primary:hover {
    background: #e65e00;
    box-shadow: 0 4px 16px rgba(255,107,0,0.30);
}
.rm-btn-secondary {
    background: #f0f0f0;
    color: #444;
}
.rm-btn-secondary:hover {
    background: #e4e4e4;
}
.rm-btn-danger {
    background: transparent;
    color: #d63031;
    padding: 6px 12px;
    font-size: 12px;
}
.rm-btn-danger:hover {
    background: rgba(214,48,49,0.08);
}
.rm-btn-add {
    background: rgba(255,107,0,0.08);
    color: #FF6B00;
    border: 1.5px dashed #FF6B00;
    width: 100%;
    justify-content: center;
    padding: 14px;
    border-radius: 10px;
    font-size: 14px;
}
.rm-btn-add:hover {
    background: rgba(255,107,0,0.14);
}

/* ─── Submit bar ─────────────────────────────────────────────────────────── */
.rm-submit-bar {
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
}

/* ─── Toast notification ─────────────────────────────────────────────────── */
.rm-toast {
    position: fixed;
    top: 40px;
    right: 40px;
    z-index: 999999;
    min-width: 300px;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    box-shadow: 0 8px 30px rgba(0,0,0,0.18);
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: 0;
    transform: translateX(40px);
    transition: opacity 0.4s ease, transform 0.4s ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.rm-toast.rm-visible {
    opacity: 1;
    transform: translateX(0);
}
.rm-toast.rm-hiding {
    opacity: 0;
    transform: translateX(40px);
}
.rm-toast-success {
    background: linear-gradient(135deg, #00b894, #00a381);
}
.rm-toast-error {
    background: linear-gradient(135deg, #d63031, #b71c1c);
}
.rm-toast-icon {
    font-size: 20px;
    flex-shrink: 0;
}
.rm-toast-close {
    margin-left: auto;
    background: rgba(255,255,255,0.25);
    border: none;
    color: #fff;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
    flex-shrink: 0;
}
.rm-toast-close:hover {
    background: rgba(255,255,255,0.40);
}

/* ─── Section divider inside card ────────────────────────────────────────── */
.rm-divider {
    border: none;
    border-top: 1px solid #eee;
    margin: 24px 0;
}

/* ─── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 600px) {
    #rm-wrap { margin: 16px 10px 40px; }
    .rm-card { padding: 20px 18px 24px; }
    .rm-step-fields { grid-template-columns: 1fr; }
    .rm-fields-row { grid-template-columns: 1fr; }
}
</style>

<div id="rm-wrap">

    <!-- Page header -->
    <div class="rm-page-header">
        <div class="rm-logo">R</div>
        <div>
            <h1>Contenuti App</h1>
            <p>Gestisci i contenuti e la configurazione referral dell'applicazione.</p>
        </div>
    </div>

    <form method="post" id="rm-main-form">
        <?php wp_nonce_field('rafflemania_save_app_content', 'rafflemania_app_content_nonce'); ?>

        <!-- ─────────────────────────────────────────────────────────────────
             CARD 1 — Passi Referral
        ────────────────────────────────────────────────────────────────── -->
        <div class="rm-card">
            <h2 class="rm-card-title"><span class="rm-dot"></span> Passi Referral</h2>
            <p class="rm-card-subtitle">Configura i passaggi mostrati nella sezione referral dell'app. Usa nomi icona di Ionicons.</p>

            <div class="rm-steps-list" id="rm-steps-list">
                <?php foreach ($referral_steps as $index => $step) : ?>
                    <div class="rm-step-item" data-index="<?php echo (int)$index; ?>">
                        <div class="rm-step-header">
                            <span class="rm-step-number"><?php echo (int)$index + 1; ?></span>
                            <button type="button" class="rm-btn rm-btn-danger rm-remove-step" title="Rimuovi passo">&times; Rimuovi</button>
                        </div>
                        <div class="rm-step-fields">
                            <div>
                                <label class="rm-label">Icona (Ionicons)</label>
                                <input type="text" name="step_icon[]" class="rm-input" value="<?php echo esc_attr($step['icon']); ?>" placeholder="es. share-social-outline">
                            </div>
                            <div>
                                <label class="rm-label">Titolo</label>
                                <input type="text" name="step_title[]" class="rm-input" value="<?php echo esc_attr($step['title']); ?>" placeholder="Titolo del passo">
                            </div>
                            <div class="rm-field-full">
                                <label class="rm-label">Descrizione</label>
                                <textarea name="step_description[]" class="rm-textarea" rows="2" placeholder="Descrizione del passo"><?php echo esc_textarea($step['description']); ?></textarea>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>

            <div style="margin-top: 16px;">
                <button type="button" class="rm-btn rm-btn-add" id="rm-add-step">+ Aggiungi Passo</button>
            </div>
        </div>


        <!-- ─────────────────────────────────────────────────────────────────
             CARD 2 — Config Referral
        ────────────────────────────────────────────────────────────────── -->
        <div class="rm-card">
            <h2 class="rm-card-title"><span class="rm-dot"></span> Configurazione Referral</h2>
            <p class="rm-card-subtitle">Parametri numerici del programma referral.</p>

            <div class="rm-fields-row">
                <div class="rm-field-group">
                    <label class="rm-label" for="rm-days-required">Giorni richiesti</label>
                    <input type="number" id="rm-days-required" name="days_required" class="rm-input" min="0" value="<?php echo esc_attr($days_required); ?>" placeholder="7">
                </div>
                <div class="rm-field-group">
                    <label class="rm-label" for="rm-referrer-credits">Crediti referente</label>
                    <input type="number" id="rm-referrer-credits" name="referrer_credits" class="rm-input" min="0" value="<?php echo esc_attr($referrer_credits); ?>" placeholder="10">
                </div>
                <div class="rm-field-group">
                    <label class="rm-label" for="rm-referred-credits">Crediti invitato</label>
                    <input type="number" id="rm-referred-credits" name="referred_credits" class="rm-input" min="0" value="<?php echo esc_attr($referred_credits); ?>" placeholder="5">
                </div>
            </div>
        </div>

        <!-- Submit -->
        <div class="rm-submit-bar">
            <button type="submit" class="rm-btn rm-btn-primary">Salva Impostazioni</button>
        </div>
    </form>

</div><!-- #rm-wrap -->


<!-- ─── Toast container (rendered outside wrap, positioned fixed) ────────── -->
<div id="rm-toast" class="rm-toast" role="alert" aria-live="assertive">
    <span class="rm-toast-icon" id="rm-toast-icon"></span>
    <span id="rm-toast-text"></span>
    <button type="button" class="rm-toast-close" id="rm-toast-close">&times;</button>
</div>


<script>
(function () {
    'use strict';

    /* ── Toast system ────────────────────────────────────────────────── */
    var toastEl    = document.getElementById('rm-toast');
    var toastText  = document.getElementById('rm-toast-text');
    var toastIcon  = document.getElementById('rm-toast-icon');
    var toastClose = document.getElementById('rm-toast-close');
    var toastTimer = null;

    function showToast(message, type) {
        if (!message) return;
        clearTimeout(toastTimer);

        toastEl.className = 'rm-toast rm-toast-' + (type || 'success');
        toastIcon.textContent = type === 'error' ? '\u2716' : '\u2714';
        toastText.textContent = message;

        // Trigger reflow then show
        void toastEl.offsetWidth;
        toastEl.classList.add('rm-visible');

        toastTimer = setTimeout(function () {
            hideToast();
        }, 4000);
    }

    function hideToast() {
        toastEl.classList.remove('rm-visible');
        toastEl.classList.add('rm-hiding');
        setTimeout(function () {
            toastEl.classList.remove('rm-hiding');
        }, 400);
    }

    toastClose.addEventListener('click', function () {
        clearTimeout(toastTimer);
        hideToast();
    });

    // Show PHP-generated toast
    <?php if ($toast_message) : ?>
        showToast(<?php echo wp_json_encode($toast_message); ?>, <?php echo wp_json_encode($toast_type); ?>);
    <?php endif; ?>


    /* ── Renumber helpers ─────────────────────────────────────────────── */
    function renumberSteps() {
        var items = document.querySelectorAll('#rm-steps-list .rm-step-item');
        items.forEach(function (item, i) {
            item.setAttribute('data-index', i);
            item.querySelector('.rm-step-number').textContent = i + 1;
        });
    }

    /* ── Add / Remove Steps ──────────────────────────────────────────── */
    document.getElementById('rm-add-step').addEventListener('click', function () {
        var list  = document.getElementById('rm-steps-list');
        var count = list.querySelectorAll('.rm-step-item').length;

        var html = ''
            + '<div class="rm-step-item" data-index="' + count + '">'
            + '  <div class="rm-step-header">'
            + '    <span class="rm-step-number">' + (count + 1) + '</span>'
            + '    <button type="button" class="rm-btn rm-btn-danger rm-remove-step" title="Rimuovi passo">&times; Rimuovi</button>'
            + '  </div>'
            + '  <div class="rm-step-fields">'
            + '    <div>'
            + '      <label class="rm-label">Icona (Ionicons)</label>'
            + '      <input type="text" name="step_icon[]" class="rm-input" placeholder="es. share-social-outline">'
            + '    </div>'
            + '    <div>'
            + '      <label class="rm-label">Titolo</label>'
            + '      <input type="text" name="step_title[]" class="rm-input" placeholder="Titolo del passo">'
            + '    </div>'
            + '    <div class="rm-field-full">'
            + '      <label class="rm-label">Descrizione</label>'
            + '      <textarea name="step_description[]" class="rm-textarea" rows="2" placeholder="Descrizione del passo"></textarea>'
            + '    </div>'
            + '  </div>'
            + '</div>';

        list.insertAdjacentHTML('beforeend', html);
    });

    document.getElementById('rm-steps-list').addEventListener('click', function (e) {
        var btn = e.target.closest('.rm-remove-step');
        if (!btn) return;

        var item = btn.closest('.rm-step-item');
        item.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        item.style.opacity = '0';
        item.style.transform = 'translateY(-8px)';
        setTimeout(function () {
            item.remove();
            renumberSteps();
        }, 250);
    });


})();
</script>

<?php
if (!defined('ABSPATH')) exit;

global $wpdb;
$table_shipments = $wpdb->prefix . 'rafflemania_shipments';
$table_winners = $wpdb->prefix . 'rafflemania_winners';
$table_prizes = $wpdb->prefix . 'rafflemania_prizes';
$table_users = $wpdb->prefix . 'rafflemania_users';

// Handle actions
$message = '';
$error = '';

// Create shipment for winner
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if (!wp_verify_nonce($_POST['_wpnonce'], 'rafflemania_shipment_action')) {
        $error = 'Errore di sicurezza. Ricarica la pagina.';
    } else {
        switch ($_POST['action']) {
            case 'create_shipment':
                $winner_id = intval($_POST['winner_id']);

                // Get winner details
                $winner = $wpdb->get_row($wpdb->prepare(
                    "SELECT w.*, u.id as uid FROM {$table_winners} w
                     LEFT JOIN {$table_users} u ON w.user_id = u.id
                     WHERE w.id = %d",
                    $winner_id
                ));

                if ($winner) {
                    // Check if shipment already exists
                    $existing = $wpdb->get_var($wpdb->prepare(
                        "SELECT id FROM {$table_shipments} WHERE winner_id = %d",
                        $winner_id
                    ));

                    if (!$existing) {
                        $wpdb->insert($table_shipments, [
                            'winner_id' => $winner_id,
                            'user_id' => $winner->user_id,
                            'prize_id' => $winner->prize_id,
                            'status' => 'pending'
                        ]);
                        $message = 'Spedizione creata con successo!';
                    } else {
                        $error = 'Spedizione già esistente per questo vincitore.';
                    }
                }
                break;

            case 'create_manual_shipment':
                $user_id = intval($_POST['user_id']);
                $prize_id = intval($_POST['prize_id']);
                $tracking_number = sanitize_text_field($_POST['tracking_number']);
                $carrier = sanitize_text_field($_POST['carrier']);
                $recipient_name = sanitize_text_field($_POST['recipient_name']);
                $recipient_address = sanitize_text_field($_POST['recipient_address']);
                $recipient_city = sanitize_text_field($_POST['recipient_city']);
                $recipient_postal = sanitize_text_field($_POST['recipient_postal']);
                $recipient_country = sanitize_text_field($_POST['recipient_country']);
                $recipient_phone = sanitize_text_field($_POST['recipient_phone']);
                $notes = sanitize_textarea_field($_POST['notes']);

                if ($user_id && $prize_id) {
                    $shipping_address = json_encode([
                        'fullName' => $recipient_name,
                        'address' => $recipient_address,
                        'city' => $recipient_city,
                        'postalCode' => $recipient_postal,
                        'country' => $recipient_country,
                        'phone' => $recipient_phone
                    ]);

                    $insert_data = [
                        'winner_id' => 0,
                        'user_id' => $user_id,
                        'prize_id' => $prize_id,
                        'tracking_number' => $tracking_number,
                        'carrier' => $carrier,
                        'status' => $tracking_number ? 'shipped' : 'pending',
                        'notes' => $notes
                    ];

                    if ($tracking_number) {
                        $insert_data['shipped_at'] = current_time('mysql');
                    }

                    $wpdb->insert($table_shipments, $insert_data);

                    // Update shipping address in a separate query since it's not in shipments table
                    // We'll store it in notes for manual shipments
                    if ($recipient_name) {
                        $wpdb->update($table_shipments, [
                            'notes' => ($notes ? $notes . "\n\n" : '') . "Indirizzo: " . $recipient_name . ", " . $recipient_address . ", " . $recipient_postal . " " . $recipient_city . ", " . $recipient_country . ($recipient_phone ? " - Tel: " . $recipient_phone : "")
                        ], ['id' => $wpdb->insert_id]);
                    }

                    $message = 'Spedizione manuale creata con successo!';
                } else {
                    $error = 'Seleziona utente e premio.';
                }
                break;

            case 'delete_shipment':
                $shipment_id = intval($_POST['shipment_id']);
                $wpdb->delete($table_shipments, ['id' => $shipment_id]);
                $message = 'Spedizione eliminata.';
                break;

            case 'update_shipment':
                $shipment_id = intval($_POST['shipment_id']);
                $tracking_number = sanitize_text_field($_POST['tracking_number']);
                $carrier = sanitize_text_field($_POST['carrier']);
                $status = sanitize_text_field($_POST['status']);
                $notes = sanitize_textarea_field($_POST['notes']);

                $update_data = [
                    'tracking_number' => $tracking_number,
                    'carrier' => $carrier,
                    'status' => $status,
                    'notes' => $notes
                ];

                if ($status === 'shipped' && empty($_POST['shipped_at'])) {
                    $update_data['shipped_at'] = current_time('mysql');
                }

                if ($status === 'delivered' && empty($_POST['delivered_at'])) {
                    $update_data['delivered_at'] = current_time('mysql');
                }

                $wpdb->update($table_shipments, $update_data, ['id' => $shipment_id]);
                $message = 'Spedizione aggiornata con successo!';
                break;
        }
    }
}

// Get all users for dropdown
$all_users = $wpdb->get_results("SELECT id, username, email FROM {$table_users} ORDER BY username ASC");

// Get all prizes for dropdown
$all_prizes = $wpdb->get_results("SELECT id, name FROM {$table_prizes} ORDER BY name ASC");

// Get all shipments
$shipments = $wpdb->get_results(
    "SELECT s.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
            u.username, u.email, w.shipping_address, w.won_at
     FROM {$table_shipments} s
     LEFT JOIN {$table_prizes} p ON s.prize_id = p.id
     LEFT JOIN {$table_users} u ON s.user_id = u.id
     LEFT JOIN {$table_winners} w ON s.winner_id = w.id
     ORDER BY s.created_at DESC"
);

// Get winners without shipment
$winners_pending = $wpdb->get_results(
    "SELECT w.*, p.name as prize_name, p.image_url as prize_image, u.username, u.email
     FROM {$table_winners} w
     LEFT JOIN {$table_prizes} p ON w.prize_id = p.id
     LEFT JOIN {$table_users} u ON w.user_id = u.id
     WHERE w.claimed = 1
     AND w.id NOT IN (SELECT winner_id FROM {$table_shipments})
     ORDER BY w.claimed_at DESC"
);

// Carriers list
$carriers = [
    'poste_italiane' => 'Poste Italiane',
    'dhl' => 'DHL',
    'ups' => 'UPS',
    'fedex' => 'FedEx',
    'gls' => 'GLS',
    'bartolini' => 'BRT (Bartolini)',
    'sda' => 'SDA',
    'tnt' => 'TNT',
    'amazon_logistics' => 'Amazon Logistics',
    'altro' => 'Altro'
];

$statuses = [
    'pending' => ['label' => 'In Attesa', 'color' => '#6c757d'],
    'shipped' => ['label' => 'Spedito', 'color' => '#007bff'],
    'in_transit' => ['label' => 'In Transito', 'color' => '#fd7e14'],
    'delivered' => ['label' => 'Consegnato', 'color' => '#28a745'],
    'returned' => ['label' => 'Reso', 'color' => '#dc3545']
];
?>

<div class="wrap">
    <h1>
        <span class="dashicons dashicons-car" style="font-size: 30px; margin-right: 10px;"></span>
        Spedizioni
    </h1>

    <?php if ($message): ?>
    <div class="notice notice-success is-dismissible"><p><?php echo esc_html($message); ?></p></div>
    <?php endif; ?>

    <?php if ($error): ?>
    <div class="notice notice-error is-dismissible"><p><?php echo esc_html($error); ?></p></div>
    <?php endif; ?>

    <style>
        .rafflemania-shipments-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 24px;
            margin-top: 24px;
        }
        .rafflemania-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 24px;
        }
        .rafflemania-card h2 {
            margin-top: 0;
            border-bottom: 2px solid #FF6B00;
            padding-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .rafflemania-table-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            overflow: hidden;
            margin-top: 24px;
        }
        .rafflemania-table {
            width: 100%;
            border-collapse: collapse;
        }
        .rafflemania-table th,
        .rafflemania-table td {
            padding: 14px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        .rafflemania-table th {
            background: #f9f9f9;
            font-weight: 600;
        }
        .rafflemania-table img {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 8px;
        }
        .rafflemania-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: white;
        }
        .rafflemania-form-row {
            margin-bottom: 16px;
        }
        .rafflemania-form-row label {
            display: block;
            font-weight: 600;
            margin-bottom: 6px;
        }
        .rafflemania-form-row input,
        .rafflemania-form-row select,
        .rafflemania-form-row textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
        }
        .rafflemania-pending-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #f9f9f9;
            border-radius: 8px;
            margin-bottom: 12px;
        }
        .rafflemania-pending-item img {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 8px;
        }
        .rafflemania-pending-info {
            flex: 1;
        }
        .rafflemania-tracking-link {
            background: #e7f3ff;
            padding: 8px 12px;
            border-radius: 6px;
            display: inline-block;
            margin-top: 4px;
        }
        .rafflemania-address-box {
            background: #f9f9f9;
            padding: 10px;
            border-radius: 6px;
            font-size: 12px;
        }
        .button-primary {
            background: #FF6B00 !important;
            border-color: #FF6B00 !important;
        }
        .button-primary:hover {
            background: #e55d00 !important;
            border-color: #e55d00 !important;
        }
        .modal-backdrop {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 99999;
        }
        .modal-content {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-close {
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
        }
        /* Searchable select styles */
        .searchable-select-container {
            position: relative;
        }
        .searchable-select-input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
        }
        .searchable-select-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 6px 6px;
            max-height: 250px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .searchable-select-dropdown.open {
            display: block;
        }
        .searchable-select-search {
            width: 100%;
            padding: 10px;
            border: none;
            border-bottom: 1px solid #eee;
            outline: none;
        }
        .searchable-select-option {
            padding: 10px 12px;
            cursor: pointer;
            border-bottom: 1px solid #f5f5f5;
        }
        .searchable-select-option:hover {
            background: #f0f0f0;
        }
        .searchable-select-option.selected {
            background: #FF6B00;
            color: white;
        }
        .searchable-select-option small {
            opacity: 0.7;
            display: block;
            font-size: 11px;
        }
        .searchable-select-no-results {
            padding: 10px 12px;
            color: #999;
            text-align: center;
        }
    </style>

    <!-- Manual Shipment Form -->
    <div class="rafflemania-card" style="margin-top: 24px;">
        <h2><span class="dashicons dashicons-plus-alt"></span> Nuova Spedizione Manuale</h2>
        <form method="post">
            <?php wp_nonce_field('rafflemania_shipment_action'); ?>
            <input type="hidden" name="action" value="create_manual_shipment">

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                <div class="rafflemania-form-row">
                    <label>Utente *</label>
                    <input type="hidden" name="user_id" id="selected_user_id" required>
                    <div class="searchable-select-container" id="userSelectContainer">
                        <input type="text" class="searchable-select-input" id="userSelectInput" placeholder="Cerca utente..." readonly>
                        <div class="searchable-select-dropdown" id="userSelectDropdown">
                            <input type="text" class="searchable-select-search" id="userSearchInput" placeholder="Digita per cercare...">
                            <div id="userOptionsList">
                                <?php foreach ($all_users as $user): ?>
                                <div class="searchable-select-option" data-value="<?php echo $user->id; ?>" data-search="<?php echo esc_attr(strtolower($user->username . ' ' . $user->email)); ?>">
                                    <strong><?php echo esc_html($user->username); ?></strong>
                                    <small><?php echo esc_html($user->email); ?></small>
                                </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="rafflemania-form-row">
                    <label>Premio *</label>
                    <select name="prize_id" required>
                        <option value="">Seleziona premio...</option>
                        <?php foreach ($all_prizes as $prize): ?>
                        <option value="<?php echo $prize->id; ?>"><?php echo esc_html($prize->name); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="rafflemania-form-row">
                    <label>Corriere</label>
                    <select name="carrier">
                        <option value="">Seleziona corriere...</option>
                        <?php foreach ($carriers as $key => $label): ?>
                        <option value="<?php echo esc_attr($key); ?>"><?php echo esc_html($label); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="rafflemania-form-row">
                    <label>Numero Tracking</label>
                    <input type="text" name="tracking_number" placeholder="Es: 1Z999AA10123456784">
                </div>
            </div>

            <h4 style="margin-top: 20px; margin-bottom: 10px;">Indirizzo Destinatario (opzionale)</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div class="rafflemania-form-row">
                    <label>Nome Completo</label>
                    <input type="text" name="recipient_name" placeholder="Mario Rossi">
                </div>
                <div class="rafflemania-form-row">
                    <label>Indirizzo</label>
                    <input type="text" name="recipient_address" placeholder="Via Roma 123">
                </div>
                <div class="rafflemania-form-row">
                    <label>CAP</label>
                    <input type="text" name="recipient_postal" placeholder="00100">
                </div>
                <div class="rafflemania-form-row">
                    <label>Citta</label>
                    <input type="text" name="recipient_city" placeholder="Roma">
                </div>
                <div class="rafflemania-form-row">
                    <label>Paese</label>
                    <input type="text" name="recipient_country" placeholder="Italia" value="Italia">
                </div>
                <div class="rafflemania-form-row">
                    <label>Telefono</label>
                    <input type="text" name="recipient_phone" placeholder="+39 333 1234567">
                </div>
            </div>

            <div class="rafflemania-form-row" style="margin-top: 16px;">
                <label>Note</label>
                <textarea name="notes" rows="2" placeholder="Note sulla spedizione..."></textarea>
            </div>

            <button type="submit" class="button button-primary">Crea Spedizione</button>
        </form>
    </div>

    <!-- Winners pending shipment creation -->
    <?php if (!empty($winners_pending)): ?>
    <div class="rafflemania-card" style="margin-top: 24px;">
        <h2><span class="dashicons dashicons-warning"></span> Vincitori in Attesa di Spedizione</h2>
        <p>Questi vincitori hanno riscosso il premio ma non hanno ancora una spedizione creata.</p>

        <?php foreach ($winners_pending as $winner): ?>
        <div class="rafflemania-pending-item">
            <?php if ($winner->prize_image): ?>
            <img src="<?php echo esc_url($winner->prize_image); ?>" alt="">
            <?php endif; ?>
            <div class="rafflemania-pending-info">
                <strong><?php echo esc_html($winner->prize_name); ?></strong><br>
                <small>Vincitore: <?php echo esc_html($winner->username); ?> (<?php echo esc_html($winner->email); ?>)</small><br>
                <small>Riscosso il: <?php echo date('d/m/Y H:i', strtotime($winner->claimed_at)); ?></small>
            </div>
            <form method="post" style="margin: 0;">
                <?php wp_nonce_field('rafflemania_shipment_action'); ?>
                <input type="hidden" name="action" value="create_shipment">
                <input type="hidden" name="winner_id" value="<?php echo $winner->id; ?>">
                <button type="submit" class="button button-primary">Crea Spedizione</button>
            </form>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <!-- Shipments list -->
    <div class="rafflemania-table-container">
        <table class="rafflemania-table">
            <thead>
                <tr>
                    <th>Premio</th>
                    <th>Destinatario</th>
                    <th>Indirizzo</th>
                    <th>Corriere / Tracking</th>
                    <th>Stato</th>
                    <th>Date</th>
                    <th>Azioni</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($shipments)): ?>
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">Nessuna spedizione ancora.</td>
                </tr>
                <?php else: ?>
                <?php foreach ($shipments as $shipment): ?>
                <?php $address = $shipment->shipping_address ? json_decode($shipment->shipping_address, true) : null; ?>
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <?php if ($shipment->prize_image): ?>
                            <img src="<?php echo esc_url($shipment->prize_image); ?>" alt="">
                            <?php endif; ?>
                            <strong><?php echo esc_html($shipment->prize_name); ?></strong>
                        </div>
                    </td>
                    <td>
                        <strong><?php echo esc_html($shipment->username); ?></strong><br>
                        <small><?php echo esc_html($shipment->email); ?></small>
                    </td>
                    <td>
                        <?php if ($address): ?>
                        <div class="rafflemania-address-box">
                            <?php echo esc_html($address['fullName'] ?? ''); ?><br>
                            <?php echo esc_html($address['address'] ?? ''); ?><br>
                            <?php echo esc_html(($address['postalCode'] ?? '') . ' ' . ($address['city'] ?? '')); ?><br>
                            <?php echo esc_html($address['country'] ?? ''); ?>
                            <?php if (!empty($address['phone'])): ?>
                            <br>Tel: <?php echo esc_html($address['phone']); ?>
                            <?php endif; ?>
                        </div>
                        <?php else: ?>
                        <span style="color: #999;">Non fornito</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php if ($shipment->carrier): ?>
                        <strong><?php echo esc_html($carriers[$shipment->carrier] ?? $shipment->carrier); ?></strong><br>
                        <?php endif; ?>
                        <?php if ($shipment->tracking_number): ?>
                        <div class="rafflemania-tracking-link">
                            <code><?php echo esc_html($shipment->tracking_number); ?></code>
                        </div>
                        <?php else: ?>
                        <span style="color: #999;">-</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <span class="rafflemania-badge" style="background: <?php echo $statuses[$shipment->status]['color']; ?>">
                            <?php echo $statuses[$shipment->status]['label']; ?>
                        </span>
                    </td>
                    <td>
                        <small>
                            Creata: <?php echo date('d/m/Y', strtotime($shipment->created_at)); ?><br>
                            <?php if ($shipment->shipped_at): ?>
                            Spedita: <?php echo date('d/m/Y', strtotime($shipment->shipped_at)); ?><br>
                            <?php endif; ?>
                            <?php if ($shipment->delivered_at): ?>
                            Consegnata: <?php echo date('d/m/Y', strtotime($shipment->delivered_at)); ?>
                            <?php endif; ?>
                        </small>
                    </td>
                    <td>
                        <button type="button" class="button" onclick="openEditModal(<?php echo htmlspecialchars(json_encode([
                            'id' => $shipment->id,
                            'tracking_number' => $shipment->tracking_number,
                            'carrier' => $shipment->carrier,
                            'status' => $shipment->status,
                            'notes' => $shipment->notes
                        ])); ?>)">
                            Modifica
                        </button>
                        <form method="post" style="display:inline; margin-left: 5px;" onsubmit="return confirm('Eliminare questa spedizione?');">
                            <?php wp_nonce_field('rafflemania_shipment_action'); ?>
                            <input type="hidden" name="action" value="delete_shipment">
                            <input type="hidden" name="shipment_id" value="<?php echo $shipment->id; ?>">
                            <button type="submit" class="button" style="color:#dc3545;">Elimina</button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Edit Modal -->
<div id="editModal" class="modal-backdrop">
    <div class="modal-content">
        <button type="button" class="modal-close" onclick="closeEditModal()">&times;</button>
        <h2>Modifica Spedizione</h2>

        <form method="post" id="editShipmentForm">
            <?php wp_nonce_field('rafflemania_shipment_action'); ?>
            <input type="hidden" name="action" value="update_shipment">
            <input type="hidden" name="shipment_id" id="edit_shipment_id">

            <div class="rafflemania-form-row">
                <label>Corriere</label>
                <select name="carrier" id="edit_carrier">
                    <option value="">Seleziona corriere...</option>
                    <?php foreach ($carriers as $key => $label): ?>
                    <option value="<?php echo esc_attr($key); ?>"><?php echo esc_html($label); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="rafflemania-form-row">
                <label>Numero Tracking</label>
                <input type="text" name="tracking_number" id="edit_tracking_number" placeholder="Es: 1Z999AA10123456784">
            </div>

            <div class="rafflemania-form-row">
                <label>Stato</label>
                <select name="status" id="edit_status">
                    <?php foreach ($statuses as $key => $data): ?>
                    <option value="<?php echo esc_attr($key); ?>"><?php echo esc_html($data['label']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="rafflemania-form-row">
                <label>Note (opzionale)</label>
                <textarea name="notes" id="edit_notes" rows="3" placeholder="Note interne sulla spedizione..."></textarea>
            </div>

            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="button" onclick="closeEditModal()">Annulla</button>
                <button type="submit" class="button button-primary">Salva</button>
            </div>
        </form>
    </div>
</div>

<script>
function openEditModal(data) {
    document.getElementById('edit_shipment_id').value = data.id;
    document.getElementById('edit_tracking_number').value = data.tracking_number || '';
    document.getElementById('edit_carrier').value = data.carrier || '';
    document.getElementById('edit_status').value = data.status || 'pending';
    document.getElementById('edit_notes').value = data.notes || '';
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Close modal on backdrop click
document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeEditModal();
    }
});

// Searchable User Select
(function() {
    const container = document.getElementById('userSelectContainer');
    const input = document.getElementById('userSelectInput');
    const dropdown = document.getElementById('userSelectDropdown');
    const searchInput = document.getElementById('userSearchInput');
    const optionsList = document.getElementById('userOptionsList');
    const hiddenInput = document.getElementById('selected_user_id');
    const options = optionsList.querySelectorAll('.searchable-select-option');

    // Open dropdown on click
    input.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.add('open');
        searchInput.focus();
        searchInput.value = '';
        filterOptions('');
    });

    // Filter options on search
    searchInput.addEventListener('input', function() {
        filterOptions(this.value.toLowerCase());
    });

    searchInput.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    function filterOptions(query) {
        let hasResults = false;
        options.forEach(function(option) {
            const searchText = option.getAttribute('data-search');
            if (searchText.includes(query)) {
                option.style.display = 'block';
                hasResults = true;
            } else {
                option.style.display = 'none';
            }
        });

        // Show/hide no results message
        let noResults = optionsList.querySelector('.searchable-select-no-results');
        if (!hasResults) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'searchable-select-no-results';
                noResults.textContent = 'Nessun utente trovato';
                optionsList.appendChild(noResults);
            }
            noResults.style.display = 'block';
        } else if (noResults) {
            noResults.style.display = 'none';
        }
    }

    // Select option
    options.forEach(function(option) {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const value = this.getAttribute('data-value');
            const username = this.querySelector('strong').textContent;
            const email = this.querySelector('small').textContent;

            hiddenInput.value = value;
            input.value = username + ' (' + email + ')';

            // Update selected state
            options.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');

            dropdown.classList.remove('open');
        });
    });

    // Close dropdown on outside click
    document.addEventListener('click', function(e) {
        if (!container.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            dropdown.classList.remove('open');
        }
    });
})();
</script>

<?php
namespace RaffleMania\API;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

class ShipmentsController extends WP_REST_Controller {

    protected $namespace = 'rafflemania/v1';
    protected $rest_base = 'shipments';

    public function register_routes() {
        // Get user's shipments
        register_rest_route($this->namespace, '/' . $this->rest_base, [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_user_shipments'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Get single shipment details
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_shipment'],
                'permission_callback' => [$this, 'check_auth']
            ]
        ]);

        // Track shipment by tracking number (public)
        register_rest_route($this->namespace, '/' . $this->rest_base . '/track/(?P<tracking>[a-zA-Z0-9]+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'track_shipment'],
                'permission_callback' => '__return_true'
            ]
        ]);
    }

    public function check_auth(WP_REST_Request $request) {
        $auth_header = $request->get_header('Authorization');

        if (empty($auth_header)) {
            return false;
        }

        $token = str_replace('Bearer ', '', $auth_header);

        try {
            $jwt_secret = get_option('rafflemania_jwt_secret');
            $parts = explode('.', $token);

            if (count($parts) !== 3) {
                return false;
            }

            $payload = json_decode(base64_decode($parts[1]), true);

            if (!$payload || !isset($payload['user_id']) || !isset($payload['exp'])) {
                return false;
            }

            if ($payload['exp'] < time()) {
                return false;
            }

            // Store user_id for later use
            $request->set_param('auth_user_id', $payload['user_id']);
            return true;

        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get all shipments for authenticated user
     */
    public function get_user_shipments(WP_REST_Request $request) {
        global $wpdb;
        $user_id = $request->get_param('auth_user_id');

        $table_shipments = $wpdb->prefix . 'rafflemania_shipments';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_winners = $wpdb->prefix . 'rafflemania_winners';

        $shipments = $wpdb->get_results($wpdb->prepare(
            "SELECT s.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
                    w.won_at, w.shipping_address
             FROM {$table_shipments} s
             LEFT JOIN {$table_prizes} p ON s.prize_id = p.id
             LEFT JOIN {$table_winners} w ON s.winner_id = w.id
             WHERE s.user_id = %d
             ORDER BY s.created_at DESC",
            $user_id
        ));

        $formatted_shipments = array_map(function($s) {
            return [
                'id' => (int)$s->id,
                'prize' => [
                    'id' => (int)$s->prize_id,
                    'name' => $s->prize_name,
                    'image' => $s->prize_image,
                    'value' => (float)$s->prize_value
                ],
                'tracking' => [
                    'number' => $s->tracking_number,
                    'carrier' => $s->carrier,
                    'carrier_name' => $this->get_carrier_name($s->carrier),
                    'tracking_url' => $this->get_tracking_url($s->carrier, $s->tracking_number)
                ],
                'status' => $s->status,
                'status_label' => $this->get_status_label($s->status),
                'shipping_address' => $s->shipping_address ? json_decode($s->shipping_address, true) : null,
                'dates' => [
                    'won_at' => $s->won_at,
                    'created_at' => $s->created_at,
                    'shipped_at' => $s->shipped_at,
                    'delivered_at' => $s->delivered_at
                ],
                'notes' => $s->notes
            ];
        }, $shipments);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'shipments' => $formatted_shipments,
                'total' => count($formatted_shipments)
            ]
        ], 200);
    }

    /**
     * Get single shipment details
     */
    public function get_shipment(WP_REST_Request $request) {
        global $wpdb;
        $user_id = $request->get_param('auth_user_id');
        $shipment_id = $request->get_param('id');

        $table_shipments = $wpdb->prefix . 'rafflemania_shipments';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';
        $table_winners = $wpdb->prefix . 'rafflemania_winners';

        $shipment = $wpdb->get_row($wpdb->prepare(
            "SELECT s.*, p.name as prize_name, p.image_url as prize_image, p.value as prize_value,
                    w.won_at, w.shipping_address
             FROM {$table_shipments} s
             LEFT JOIN {$table_prizes} p ON s.prize_id = p.id
             LEFT JOIN {$table_winners} w ON s.winner_id = w.id
             WHERE s.id = %d AND s.user_id = %d",
            $shipment_id,
            $user_id
        ));

        if (!$shipment) {
            return new WP_Error('not_found', 'Spedizione non trovata', ['status' => 404]);
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'shipment' => [
                    'id' => (int)$shipment->id,
                    'prize' => [
                        'id' => (int)$shipment->prize_id,
                        'name' => $shipment->prize_name,
                        'image' => $shipment->prize_image,
                        'value' => (float)$shipment->prize_value
                    ],
                    'tracking' => [
                        'number' => $shipment->tracking_number,
                        'carrier' => $shipment->carrier,
                        'carrier_name' => $this->get_carrier_name($shipment->carrier),
                        'tracking_url' => $this->get_tracking_url($shipment->carrier, $shipment->tracking_number)
                    ],
                    'status' => $shipment->status,
                    'status_label' => $this->get_status_label($shipment->status),
                    'shipping_address' => $shipment->shipping_address ? json_decode($shipment->shipping_address, true) : null,
                    'dates' => [
                        'won_at' => $shipment->won_at,
                        'created_at' => $shipment->created_at,
                        'shipped_at' => $shipment->shipped_at,
                        'delivered_at' => $shipment->delivered_at
                    ],
                    'notes' => $shipment->notes,
                    'timeline' => $this->get_timeline($shipment)
                ]
            ]
        ], 200);
    }

    /**
     * Track shipment by tracking number (public endpoint)
     */
    public function track_shipment(WP_REST_Request $request) {
        global $wpdb;
        $tracking_number = $request->get_param('tracking');

        $table_shipments = $wpdb->prefix . 'rafflemania_shipments';
        $table_prizes = $wpdb->prefix . 'rafflemania_prizes';

        $shipment = $wpdb->get_row($wpdb->prepare(
            "SELECT s.status, s.carrier, s.shipped_at, s.delivered_at, p.name as prize_name
             FROM {$table_shipments} s
             LEFT JOIN {$table_prizes} p ON s.prize_id = p.id
             WHERE s.tracking_number = %s",
            $tracking_number
        ));

        if (!$shipment) {
            return new WP_Error('not_found', 'Tracking non trovato', ['status' => 404]);
        }

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'tracking_number' => $tracking_number,
                'carrier' => $shipment->carrier,
                'carrier_name' => $this->get_carrier_name($shipment->carrier),
                'status' => $shipment->status,
                'status_label' => $this->get_status_label($shipment->status),
                'prize_name' => $shipment->prize_name,
                'shipped_at' => $shipment->shipped_at,
                'delivered_at' => $shipment->delivered_at,
                'tracking_url' => $this->get_tracking_url($shipment->carrier, $tracking_number)
            ]
        ], 200);
    }

    /**
     * Get carrier display name
     */
    private function get_carrier_name($carrier) {
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

        return $carriers[$carrier] ?? $carrier;
    }

    /**
     * Get tracking URL for carrier
     */
    private function get_tracking_url($carrier, $tracking_number) {
        if (empty($tracking_number)) {
            return null;
        }

        $urls = [
            'poste_italiane' => 'https://www.poste.it/cerca/index.html#/risultati-tracking-spedizione?tipoRicerca=shipmentTracking&codice=' . $tracking_number,
            'dhl' => 'https://www.dhl.com/it-it/home/tracciamento.html?tracking-id=' . $tracking_number,
            'ups' => 'https://www.ups.com/track?tracknum=' . $tracking_number,
            'fedex' => 'https://www.fedex.com/fedextrack/?trknbr=' . $tracking_number,
            'gls' => 'https://www.gls-italy.com/tracking/?ParcelNumber=' . $tracking_number,
            'bartolini' => 'https://www.brt.it/tracking?lingua=IT&wession=' . $tracking_number,
            'sda' => 'https://www.sda.it/wps/portal/Servizi_online/dettaglio-spedizione?locale=it&tression=' . $tracking_number,
            'tnt' => 'https://www.tnt.it/tracking/traccia.do?wession=' . $tracking_number,
            'amazon_logistics' => 'https://track.amazon.it/tracking/' . $tracking_number
        ];

        return $urls[$carrier] ?? null;
    }

    /**
     * Get status label in Italian
     */
    private function get_status_label($status) {
        $labels = [
            'pending' => 'In Attesa',
            'shipped' => 'Spedito',
            'in_transit' => 'In Transito',
            'delivered' => 'Consegnato',
            'returned' => 'Reso'
        ];

        return $labels[$status] ?? $status;
    }

    /**
     * Get shipment timeline
     */
    private function get_timeline($shipment) {
        $timeline = [];

        $timeline[] = [
            'status' => 'won',
            'label' => 'Premio Vinto',
            'date' => $shipment->won_at,
            'completed' => true
        ];

        $timeline[] = [
            'status' => 'pending',
            'label' => 'Spedizione Creata',
            'date' => $shipment->created_at,
            'completed' => true
        ];

        $timeline[] = [
            'status' => 'shipped',
            'label' => 'Spedito',
            'date' => $shipment->shipped_at,
            'completed' => in_array($shipment->status, ['shipped', 'in_transit', 'delivered'])
        ];

        $timeline[] = [
            'status' => 'in_transit',
            'label' => 'In Transito',
            'date' => null,
            'completed' => in_array($shipment->status, ['in_transit', 'delivered'])
        ];

        $timeline[] = [
            'status' => 'delivered',
            'label' => 'Consegnato',
            'date' => $shipment->delivered_at,
            'completed' => $shipment->status === 'delivered'
        ];

        return $timeline;
    }
}

<?php
namespace RaffleMania;

/**
 * Plugin Deactivator
 */
class Deactivator {

    public static function deactivate() {
        // Clear scheduled events
        wp_clear_scheduled_hook('rafflemania_check_extractions');

        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

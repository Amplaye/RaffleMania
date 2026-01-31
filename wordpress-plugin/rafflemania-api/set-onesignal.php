<?php
/**
 * Temporary script to set OneSignal credentials
 * Delete this file after running once
 */

// Load WordPress
require_once dirname(__FILE__) . '/../../../wp-load.php';

// Set OneSignal credentials
update_option('rafflemania_onesignal_app_id', '7d7f743b-3dac-472e-b05d-e4445842dc0a');
update_option('rafflemania_onesignal_api_key', 'os_v2_app_pv7xioz5vrds5mc54rcfqqw4bkxzup6urigeqjmhvn2eruwyfjq5ngf4bca4e4i7tivojkhzbicktscflgfvtayczrafmce6fx7hrda');

echo "OneSignal credentials saved successfully!\n";
echo "App ID: " . get_option('rafflemania_onesignal_app_id') . "\n";
echo "API Key: " . substr(get_option('rafflemania_onesignal_api_key'), 0, 30) . "...\n";
echo "\nIMPORTANT: Delete this file now for security!";

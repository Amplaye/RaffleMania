<?php
/**
 * Cache flush utility
 * Visit this URL to clear opcache: /wp-content/plugins/rafflemania-api/flush-cache.php
 */

// Clear OPcache if available
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "OPcache cleared!\n";
} else {
    echo "OPcache not available\n";
}

// Clear specific files from opcache
$files_to_clear = [
    __DIR__ . '/includes/API/PrizesController.php',
    __DIR__ . '/includes/API/SettingsController.php',
    __DIR__ . '/includes/Plugin.php',
];

foreach ($files_to_clear as $file) {
    if (function_exists('opcache_invalidate') && file_exists($file)) {
        opcache_invalidate($file, true);
        echo "Invalidated: $file\n";
    }
}

echo "\nDone! Refresh the API to see changes.\n";

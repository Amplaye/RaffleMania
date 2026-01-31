<?php
/**
 * Check include - DELETE AFTER USE
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/plain');

echo "Starting include test...\n\n";

$file = __DIR__ . '/wp-content/plugins/rafflemania-api/includes/API/UsersController.php';

if (!file_exists($file)) {
    echo "File not found: $file\n";
    exit;
}

echo "File exists, size: " . filesize($file) . " bytes\n";

// Read first 500 chars
echo "\nFirst 500 chars:\n";
echo substr(file_get_contents($file), 0, 500);

echo "\n\n--- Last 500 chars ---\n";
echo substr(file_get_contents($file), -500);

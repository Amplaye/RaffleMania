<?php
/**
 * Check syntax - DELETE AFTER USE
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/plain');

$file = __DIR__ . '/wp-content/plugins/rafflemania-api/includes/API/UsersController.php';

if (!file_exists($file)) {
    echo "File not found: $file\n";
    exit;
}

echo "Checking: $file\n";
echo "File size: " . filesize($file) . " bytes\n\n";

// Try to include it
try {
    // Use php -l equivalent
    $output = shell_exec("php -l " . escapeshellarg($file) . " 2>&1");
    echo "Syntax check: $output\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

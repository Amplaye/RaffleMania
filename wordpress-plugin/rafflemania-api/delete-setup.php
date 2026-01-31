<?php
// Self-deleting cleanup script
$target = dirname(__FILE__) . '/set-onesignal.php';
if (file_exists($target)) {
    unlink($target);
    echo "Deleted: set-onesignal.php\n";
} else {
    echo "File not found (already deleted)\n";
}
// Delete this script too
unlink(__FILE__);
echo "Cleanup complete!";

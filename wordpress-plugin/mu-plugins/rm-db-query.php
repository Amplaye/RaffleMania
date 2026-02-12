<?php
// Simplest possible mu-plugin test
// DELETE AFTER USE
if (isset($_GET['rm_db_check'])) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'mu-plugin works', 'time' => time()]);
    die();
}

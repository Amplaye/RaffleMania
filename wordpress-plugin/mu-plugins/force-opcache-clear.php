<?php
// Must-use plugin: Force opcache reset ONCE, then self-delete
if (function_exists('opcache_reset')) {
    opcache_reset();
}
// Self-delete after execution
@unlink(__FILE__);

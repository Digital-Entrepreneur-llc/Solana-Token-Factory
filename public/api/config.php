<?php
/**
 * Configuration file for Solana Token Factory API
 */

// Set headers for CORS
header("Access-Control-Allow-Origin: *"); // In production, restrict to your domain
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load database config from outside web root
$private_config_path = dirname(__DIR__, 1) . '/../private/db_config.php';
if (file_exists($private_config_path)) {
    require_once $private_config_path;
} else {
    // Fallback if private config not available (development only!)
    // IMPORTANT: Replace these with your actual database credentials
    define('DB_HOST', 'localhost');
    define('DB_USER', 'solanatokenfactory'); // Replace with your database username
    define('DB_PASS', 'ArmyArmy33!!'); // Replace with your database password 
    define('DB_NAME', 'solanatokenfactory');
}

// API Configuration
define('API_VERSION', '1.0');

// Rate limiting configuration
define('RATE_LIMIT_ENABLED', true);     // Set to false to disable rate limiting
define('RATE_LIMIT_MAX_REQUESTS', 30);  // Max requests per time window
define('RATE_LIMIT_WINDOW', 60);        // Time window in seconds (1 minute)

/**
 * Enhanced rate limiting function
 * Uses temporary files for simple persistence between requests
 */
function checkRateLimit() {
    if (!RATE_LIMIT_ENABLED) return;
    
    $ip = $_SERVER['REMOTE_ADDR'];
    
    // Skip rate limiting for localhost during development
    if ($ip === '127.0.0.1' || $ip === '::1') {
        return;
    }
    
    // Create a unique filename based on IP
    $filename = sys_get_temp_dir() . '/rate_limit_' . md5($ip) . '.txt';
    
    // Current timestamp
    $now = time();
    
    // Default timestamps array (empty)
    $timestamps = [];
    
    // Load existing timestamps if file exists
    if (file_exists($filename)) {
        $data = file_get_contents($filename);
        if ($data) {
            $timestamps = unserialize($data);
        }
    }
    
    // Remove timestamps outside our window
    $timestamps = array_filter($timestamps, function($timestamp) use ($now) {
        return ($now - $timestamp) < RATE_LIMIT_WINDOW;
    });
    
    // Add current timestamp
    $timestamps[] = $now;
    
    // Save updated timestamps
    file_put_contents($filename, serialize($timestamps));
    
    // Check if rate limit exceeded
    if (count($timestamps) > RATE_LIMIT_MAX_REQUESTS) {
        api_error('Rate limit exceeded. Please try again later.', 429);
    }
}

/**
 * Get database connection with proper UTF-8 encoding
 */
function get_db_connection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    // Set UTF-8 character set for proper encoding of special characters
    $conn->set_charset("utf8mb4");
    
    return $conn;
}

/**
 * Sanitize input to prevent SQL injection and other attacks
 */
function sanitize_input($conn, $input) {
    if (is_array($input)) {
        return array_map(function($item) use ($conn) {
            return sanitize_input($conn, $item);
        }, $input);
    }
    
    // Remove any HTML tags
    $input = strip_tags($input);
    
    // Escape special characters
    if ($conn instanceof mysqli) {
        $input = $conn->real_escape_string($input);
    }
    
    return $input;
}

/**
 * Validate Solana address
 */
function validate_solana_address($address) {
    // Solana addresses are base58 encoded and 32-44 characters
    return preg_match('/^[1-9A-HJ-NP-Za-km-z]{32,44}$/', $address);
}

/**
 * Handles API error response
 * @param string $message Error message
 * @param int $status HTTP status code
 */
function api_error($message, $status = 500) {
    http_response_code($status);
    echo json_encode([
        'success' => false,
        'error' => $message,
        'api_version' => API_VERSION
    ]);
    exit();
}
?> 
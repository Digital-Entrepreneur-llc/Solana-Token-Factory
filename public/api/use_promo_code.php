<?php
/**
 * Solana Token Factory - Promo Code Usage API
 * Marks a promo code as used by incrementing the uses_count
 */

// Include configuration
require_once('config.php');

// Configure CORS headers for security
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // In production, limit this to your domain
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_error('Only POST requests are allowed', 405); // Method Not Allowed
}

// Apply rate limiting
checkRateLimit();

// Get JSON data from request body
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

// Validate required fields
if (!isset($data['code']) || empty($data['code'])) {
    api_error('Promo code is required', 400); // Bad Request
}

try {
    // Get database connection
    $conn = get_db_connection();
    
    // Sanitize input
    $code = sanitize_input($conn, $data['code']);
    
    // Check if promo code exists, is active, and has not reached max uses
    $stmt = $conn->prepare("SELECT 
        id, 
        max_uses, 
        uses_count, 
        expiry_date 
        FROM promo_codes 
        WHERE code = ? AND is_active = 1");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        api_error('Invalid promo code', 400);
    }
    
    $promo = $result->fetch_assoc();
    
    // Check if code has expired
    if ($promo['expiry_date'] && strtotime($promo['expiry_date']) < time()) {
        api_error('Promo code has expired', 400);
    }
    
    // Check if code has reached max uses
    if ($promo['max_uses'] !== null && $promo['uses_count'] >= $promo['max_uses']) {
        api_error('Promo code has reached maximum uses', 400);
    }
    
    // Update uses_count
    $stmt = $conn->prepare("UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = ?");
    $stmt->bind_param("i", $promo['id']);
    $success = $stmt->execute();
    
    if (!$success) {
        throw new Exception($stmt->error);
    }
    
    // Success response
    echo json_encode([
        'success' => true,
        'message' => 'Promo code usage recorded',
        'code' => $code,
        'remainingUses' => $promo['max_uses'] !== null ? $promo['max_uses'] - $promo['uses_count'] - 1 : null,
        'api_version' => API_VERSION
    ]);
    
} catch (Exception $e) {
    // Error handling
    api_error('Error: ' . $e->getMessage());
} finally {
    // Close connection if it exists
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
?> 
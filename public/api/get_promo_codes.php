<?php
/**
 * Solana Token Factory - Promo Codes API
 * Fetches active promo codes from the MySQL database
 */

// Include configuration
require_once('config.php');

// Configure CORS headers for security
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // In production, limit this to your domain
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_error('Only GET requests are allowed', 405); // Method Not Allowed
}

// Apply rate limiting
checkRateLimit();

try {
    // Get database connection
    $conn = get_db_connection();
    
    // Get the promo code from the request if provided
    $code = isset($_GET['code']) ? sanitize_input($conn, $_GET['code']) : null;
    
    if ($code) {
        // Fetch a specific promo code
        $stmt = $conn->prepare("SELECT 
            code, 
            discount_percentage, 
            max_uses,
            uses_count,
            expiry_date,
            description,
            is_active
            FROM promo_codes 
            WHERE code = ? AND is_active = 1 
            AND (expiry_date IS NULL OR expiry_date > NOW())
            AND (max_uses IS NULL OR uses_count < max_uses)");
        $stmt->bind_param("s", $code);
    } else {
        // Fetch all active promo codes
        $stmt = $conn->prepare("SELECT 
            code, 
            discount_percentage, 
            max_uses,
            uses_count,
            expiry_date,
            description,
            is_active
            FROM promo_codes 
            WHERE is_active = 1 
            AND (expiry_date IS NULL OR expiry_date > NOW())
            AND (max_uses IS NULL OR uses_count < max_uses)");
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Fetch all promo codes
    $promoCodes = [];
    while ($row = $result->fetch_assoc()) {
        // Format the expiry date
        $expiryDate = $row['expiry_date'] ? date('c', strtotime($row['expiry_date'])) : null;
        
        // Add to promoCodes array
        $promoCodes[] = [
            'code' => $row['code'],
            'discountPercentage' => (int)$row['discount_percentage'],
            'maxUses' => $row['max_uses'] ? (int)$row['max_uses'] : null,
            'usesCount' => (int)$row['uses_count'],
            'expiryDate' => $expiryDate,
            'description' => $row['description'],
            'isActive' => (bool)$row['is_active']
        ];
    }
    
    // If a specific code was requested and not found, return an error
    if ($code && empty($promoCodes)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or expired promo code',
            'api_version' => API_VERSION
        ]);
        exit;
    }
    
    // Success response
    echo json_encode([
        'success' => true,
        'promoCodes' => $promoCodes,
        'count' => count($promoCodes),
        'api_version' => API_VERSION
    ]);
    
} catch (Exception $e) {
    // Error handling
    api_error('Database error: ' . $e->getMessage());
} finally {
    // Close connection if it exists
    if (isset($conn) && $conn) {
        $stmt->close();
        $conn->close();
    }
}
?> 
<?php
/**
 * Solana Token Factory - Token Retrieval API
 * Fetches recently created tokens from the MySQL database
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

// Special case for count endpoint
if (strpos($_SERVER['REQUEST_URI'], '/api/get_tokens.php/count') !== false) {
    try {
        $conn = get_db_connection();
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM tokens");
        $stmt->execute();
        $result = $stmt->get_result();
        $count = $result->fetch_assoc()['count'];
        
        echo json_encode([
            'success' => true,
            'count' => $count
        ]);
        
        // Close connection
        $stmt->close();
        $conn->close();
        exit;
    } catch (Exception $e) {
        api_error('Error getting count: ' . $e->getMessage());
    }
}

// Get limit parameter (default 5, max 50)
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
$limit = min(max(1, $limit), 50); // Ensure limit is between 1 and 50

try {
    // Get database connection
    $conn = get_db_connection();
    
    // Prepare and execute query with limit
    $stmt = $conn->prepare("SELECT 
        mint_address, 
        name, 
        symbol, 
        description, 
        image_url, 
        solscan_url, 
        explorer_url, 
        decimals, 
        supply, 
        creator_wallet, 
        has_mint_authority, 
        has_freeze_authority, 
        timestamp 
        FROM tokens 
        ORDER BY timestamp DESC 
        LIMIT ?");
    $stmt->bind_param("i", $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Fetch all tokens
    $tokens = [];
    while ($row = $result->fetch_assoc()) {
        // Validate mint address format
        if (!validate_solana_address($row['mint_address'])) {
            continue; // Skip invalid addresses
        }
        
        // Additional validation to prevent hydration errors
        // Skip tokens with malformed or incomplete data
        if (empty($row['name']) || empty($row['symbol'])) {
            continue; // Skip tokens with missing required fields
        }
        
        // If image_url is data:image format, convert to null to avoid rendering issues
        $imageUrl = $row['image_url'] ?? null;
        if ($imageUrl && strpos($imageUrl, 'data:') === 0 && strlen($imageUrl) > 1000) {
            $imageUrl = null; // Don't use extremely long data URLs that can cause rendering issues
        }
        
        // Sanitize timestamp to ensure it's a valid timestamp
        $timestamp = strtotime($row['timestamp']) ?? time();
        
        // Handle special characters in text fields that might cause hydration issues
        $name = htmlspecialchars($row['name'], ENT_QUOTES, 'UTF-8');
        $symbol = htmlspecialchars($row['symbol'], ENT_QUOTES, 'UTF-8');
        $description = isset($row['description']) ? htmlspecialchars($row['description'], ENT_QUOTES, 'UTF-8') : '';
        
        // Verify decimals is a valid integer to prevent type mismatch
        $decimals = is_numeric($row['decimals']) ? (int)$row['decimals'] : 9;
        
        // Ensure boolean fields are properly cast
        $hasMintAuthority = isset($row['has_mint_authority']) ? (bool)$row['has_mint_authority'] : false;
        $hasFreezeAuthority = isset($row['has_freeze_authority']) ? (bool)$row['has_freeze_authority'] : false;
        
        $tokens[] = [
            'mintAddress' => $row['mint_address'],
            'name' => $name,
            'symbol' => $symbol,
            'description' => $description,
            'imageUrl' => $imageUrl,
            'solscanUrl' => $row['solscan_url'] ?? "https://solscan.io/token/{$row['mint_address']}",
            'explorerUrl' => $row['explorer_url'] ?? "https://explorer.solana.com/address/{$row['mint_address']}",
            'decimals' => $decimals,
            'supply' => $row['supply'] ?? null,
            'creatorWallet' => $row['creator_wallet'] ?? null,
            'hasMintAuthority' => $hasMintAuthority,
            'hasFreezeAuthority' => $hasFreezeAuthority,
            'timestamp' => $timestamp * 1000, // Convert to JS timestamp
        ];
    }
    
    // Success response
    echo json_encode([
        'success' => true,
        'tokens' => $tokens,
        'count' => count($tokens),
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
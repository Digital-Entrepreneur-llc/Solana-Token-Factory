<?php
/**
 * Solana Token Factory - Token Storage API
 * Saves token creation data to the MySQL database
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

// Get JSON data from request body
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

// Validate required fields
if (!isset($data['mintAddress']) || empty($data['mintAddress'])) {
    api_error('Mint address is required', 400); // Bad Request
}

try {
    // Apply rate limiting
    checkRateLimit();

    // Create database connection
    $conn = get_db_connection();
    
    // Sanitize inputs to prevent SQL injection
    $mintAddress = sanitize_input($conn, $data['mintAddress']);
    $creatorWallet = sanitize_input($conn, $data['creatorWallet'] ?? '');
    $name = sanitize_input($conn, $data['name'] ?? '');
    $symbol = sanitize_input($conn, $data['symbol'] ?? '');
    $description = sanitize_input($conn, $data['description'] ?? '');
    $imageUrl = sanitize_input($conn, $data['imageUrl'] ?? '');
    $solscanUrl = sanitize_input($conn, $data['solscanUrl'] ?? '');
    $explorerUrl = sanitize_input($conn, $data['explorerUrl'] ?? '');
    $decimals = isset($data['decimals']) ? intval($data['decimals']) : 9;
    $supply = isset($data['supply']) ? sanitize_input($conn, $data['supply']) : null;
    $hasMintAuthority = isset($data['hasMintAuthority']) ? ($data['hasMintAuthority'] ? 1 : 0) : 0;
    $hasFreezeAuthority = isset($data['hasFreezeAuthority']) ? ($data['hasFreezeAuthority'] ? 1 : 0) : 0;
    $timestamp = sanitize_input($conn, $data['timestamp'] ?? date('Y-m-d H:i:s'));
    
    // For backward compatibility
    $ownerAddress = isset($data['ownerAddress']) && validate_solana_address($data['ownerAddress']) 
        ? sanitize_input($conn, $data['ownerAddress']) 
        : $creatorWallet; // Default to creator wallet if not specified
    
    // Check if token already exists
    $stmt = $conn->prepare("SELECT id FROM tokens WHERE mint_address = ?");
    $stmt->bind_param("s", $mintAddress);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Update existing token
        $stmt = $conn->prepare("UPDATE tokens SET 
            name = ?, 
            symbol = ?, 
            description = ?,
            image_url = ?, 
            solscan_url = ?,
            explorer_url = ?,
            decimals = ?,
            supply = ?,
            creator_wallet = ?,
            owner_address = ?, 
            has_mint_authority = ?,
            has_freeze_authority = ?,
            timestamp = ? 
            WHERE mint_address = ?");
            
        $stmt->bind_param("ssssssississs", 
            $name, 
            $symbol,
            $description,
            $imageUrl,
            $solscanUrl,
            $explorerUrl,
            $decimals,
            $supply,
            $creatorWallet,
            $ownerAddress,
            $hasMintAuthority,
            $hasFreezeAuthority,
            $timestamp,
            $mintAddress
        );
    } else {
        // Insert new token
        $stmt = $conn->prepare("INSERT INTO tokens (
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
            owner_address,
            has_mint_authority,
            has_freeze_authority,
            timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->bind_param("sssssssississs", 
            $mintAddress, 
            $name, 
            $symbol,
            $description,
            $imageUrl,
            $solscanUrl,
            $explorerUrl,
            $decimals,
            $supply,
            $creatorWallet,
            $ownerAddress,
            $hasMintAuthority,
            $hasFreezeAuthority,
            $timestamp
        );
    }
    
    $success = $stmt->execute();
    
    if (!$success) {
        throw new Exception($stmt->error);
    }
    
    // Success response
    echo json_encode([
        'success' => true,
        'message' => 'Token saved successfully',
        'mintAddress' => $mintAddress,
        'api_version' => API_VERSION
    ]);
    
} catch (Exception $e) {
    // Error handling
    api_error($e->getMessage());
} finally {
    // Close connection if it exists
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
?> 
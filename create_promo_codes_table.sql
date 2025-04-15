-- SQL command to create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    discount_percentage INT NOT NULL,
    max_uses INT NULL,
    uses_count INT DEFAULT 0,
    expiry_date DATETIME NULL,
    description VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample promo code (SOLANA20)
INSERT INTO promo_codes (code, discount_percentage, max_uses, expiry_date, description)
VALUES (
    'SOLANA20', 
    20, 
    20, 
    DATE_ADD(NOW(), INTERVAL 8 DAY), 
    '20% discount on token creation'
); 
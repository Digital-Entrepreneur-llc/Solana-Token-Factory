import { Buffer } from 'buffer';

/**
 * Creates the instruction data buffer for the CreateMetadataAccountV3 instruction.
 * This function writes the instruction discriminator along with the name, symbol,
 * URI (formatted to use an HTTPS gateway if needed), seller fee basis points,
 * and other null/default fields required by the metadata program.
 *
 * @param name - The token or NFT name.
 * @param symbol - The token or NFT symbol.
 * @param uri - The metadata URI (typically starts with "ipfs://").
 * @returns A Buffer containing the instruction data.
 */
export function createMetadataInstructionData(
  name: string,
  symbol: string,
  uri: string
): Buffer {
  // Ensure the URI uses an HTTPS gateway (for example, using Pinata)
  const formattedUri = uri.startsWith('ipfs://')
    ? uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
    : uri;
  
  // Define the instruction discriminator for CreateMetadataAccountV3.
  // In this case, 33 is the discriminator for the CreateMetadataAccountV3 instruction.
  const METADATA_INSTRUCTION = 33;
  
  // Allocate a buffer of sufficient size.
  const buffer = Buffer.alloc(1000); // Adjust size if needed.
  let offset = 0;

  // Write the instruction discriminator (1 byte)
  buffer.writeUInt8(METADATA_INSTRUCTION, offset);
  offset += 1;

  // Write the length of the name (4 bytes, little-endian) and then the name string.
  buffer.writeUInt32LE(name.length, offset);
  offset += 4;
  buffer.write(name, offset);
  offset += name.length;

  // Write the length of the symbol (4 bytes) and then the symbol string.
  buffer.writeUInt32LE(symbol.length, offset);
  offset += 4;
  buffer.write(symbol, offset);
  offset += symbol.length;

  // Write the length of the formatted URI (4 bytes) and then the URI string.
  buffer.writeUInt32LE(formattedUri.length, offset);
  offset += 4;
  buffer.write(formattedUri, offset);
  offset += formattedUri.length;

  // Write seller fee basis points (2 bytes) - here set to 0.
  buffer.writeUInt16LE(0, offset);
  offset += 2;

  // Write creators (null) - indicate 0 creators (1 byte)
  buffer.writeUInt8(0, offset);
  offset += 1;

  // Write collection (null) - indicate no collection (1 byte)
  buffer.writeUInt8(0, offset);
  offset += 1;

  // Write uses (null) - indicate no uses (1 byte)
  buffer.writeUInt8(0, offset);
  offset += 1;

  // Write the "is mutable" flag (1 byte) - set to true (1)
  buffer.writeUInt8(1, offset);
  offset += 1;

  // Write collection details (null) - indicate no collection details (1 byte)
  buffer.writeUInt8(0, offset);
  offset += 1;

  // Return the portion of the buffer that was used.
  return buffer.slice(0, offset);
}

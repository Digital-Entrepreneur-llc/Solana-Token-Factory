'use client';

import axios from 'axios';
import { useState } from 'react';

interface MetadataAttributes {
  trait_type: string;
  value: string | number;
}

interface TokenMetadataInput {
  name: string;
  symbol: string;
  description: string;
  image: File; // Using File type
  attributes?: MetadataAttributes[];
  collection?: {
    name: string;
    family?: string;
  };
  creators?: Array<{
    address: string;
    share: number;
  }>;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string; // This will be the IPFS URL
  attributes?: MetadataAttributes[];
  collection?: {
    name: string;
    family?: string;
  };
  properties: {
    files: Array<{
      uri: string;
      type: string;
    }>;
    category: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
}

interface PinataConfig {
  apiKey: string | undefined;
  apiSecret: string | undefined;
  jwt: string | undefined;
}

export const useIPFS = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    stage: 'image' | 'metadata' | 'complete' | null;
    progress: number;
  }>({ stage: null, progress: 0 });

  const pinataConfig: PinataConfig = {
    apiKey: process.env.NEXT_PUBLIC_PINATA_API_KEY,
    apiSecret: process.env.NEXT_PUBLIC_PINATA_API_SECRET,
    jwt: process.env.NEXT_PUBLIC_PINATA_JWT,
  };

  const PINATA_API = 'https://api.pinata.cloud/pinning';

  const getPinataHeaders = (contentType: string = 'application/json') => {
    if (pinataConfig.jwt) {
      return {
        'Content-Type': contentType,
        Authorization: `Bearer ${pinataConfig.jwt}`,
      };
    }
    
    if (pinataConfig.apiKey && pinataConfig.apiSecret) {
      return {
        'Content-Type': contentType,
        pinata_api_key: pinataConfig.apiKey,
        pinata_secret_api_key: pinataConfig.apiSecret,
      };
    }

    throw new Error('No Pinata credentials found');
  };

  const validatePinataConfig = () => {
    console.log('Validating Pinata config...');
    if (!pinataConfig.jwt && !(pinataConfig.apiKey && pinataConfig.apiSecret)) {
      console.error('Missing Pinata credentials:', {
        hasJWT: !!pinataConfig.jwt,
        hasAPIKey: !!pinataConfig.apiKey,
        hasSecret: !!pinataConfig.apiSecret
      });
      throw new Error('Pinata credentials not configured');
    }
    console.log('Pinata config validated successfully');
  };

  const uploadImage = async (
    file: File,
    options?: { name?: string; keyvalues?: Record<string, string> }
  ): Promise<string> => {
    try {
      validatePinataConfig();
      setUploadProgress({ stage: 'image', progress: 0 });
      setError(null);

      console.log('Preparing image upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      const formData = new FormData();
      formData.append('file', file);

      if (options) {
        const metadata = {
          name: options.name || file.name,
          keyvalues: options.keyvalues || {},
        };
        formData.append('pinataMetadata', JSON.stringify(metadata));
      }

      const res = await axios.post(
        `${PINATA_API}/pinFileToIPFS`,
        formData,
        {
          headers: {
            ...getPinataHeaders('multipart/form-data'),
            'Accept': 'application/json',
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress({ stage: 'image', progress });
          },
        }
      );

      console.log('Image upload successful:', res.data.IpfsHash);
      setUploadProgress({ stage: 'image', progress: 100 });
      return `ipfs://${res.data.IpfsHash}`;
    } catch (err) {
      console.error('Image upload failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image to IPFS';
      setError(errorMessage);
      throw err;
    }
  };

  const uploadMetadata = async (
    metadata: TokenMetadata,
    options?: { name?: string; keyvalues?: Record<string, string> }
  ): Promise<string> => {
    try {
      validatePinataConfig();
      setUploadProgress({ stage: 'metadata', progress: 0 });
      setError(null);

      const pinataBody = {
        pinataContent: metadata,
        pinataMetadata: options
          ? {
              name: options.name,
              keyvalues: options.keyvalues,
            }
          : undefined,
      };

      const res = await axios.post(
        `${PINATA_API}/pinJSONToIPFS`,
        pinataBody,
        {
          headers: getPinataHeaders(),
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress({ stage: 'metadata', progress });
          },
        }
      );

      setUploadProgress({ stage: 'metadata', progress: 100 });
      return `ipfs://${res.data.IpfsHash}`;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload metadata to IPFS';
      setError(errorMessage);
      throw err;
    }
  };

  const uploadTokenMetadata = async ({
    name,
    symbol,
    description,
    image,
    attributes = [],
    collection,
    creators = [],
  }: TokenMetadataInput): Promise<{ metadataUri: string; imageUri: string }> => {
    try {
      setIsUploading(true);
      setError(null);

      // 1. First upload the image
      console.log('Uploading image to IPFS...');
      const ipfsImageUri = await uploadImage(image, {
        name: `${name} Image`,
        keyvalues: { type: 'token-image' },
      });

      // 2. Create and upload the metadata with the image URI
      console.log('Creating and uploading metadata...');
      const gatewayImageUrl = ipfsImageUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      
      const metadata: TokenMetadata = {
        name,
        symbol,
        description,
        image: gatewayImageUrl,
        attributes,
        collection,
        properties: {
          files: [
            {
              uri: gatewayImageUrl,
              type: image.type,
            },
          ],
          category: 'image',
          creators: creators.length > 0 ? creators : undefined,
        },
      };

      const metadataUri = await uploadMetadata(metadata, {
        name: `${name} Metadata`,
        keyvalues: {
          type: 'token-metadata',
          symbol,
        },
      });

      setUploadProgress({ stage: 'complete', progress: 100 });
      
      // Return the gateway URL for imageUri instead of the ipfs:// protocol format
      return { 
        metadataUri, 
        imageUri: gatewayImageUrl 
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload token metadata';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadTokenMetadata,
    isUploading,
    error,
    uploadProgress,
  };
};

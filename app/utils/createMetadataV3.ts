'use client';

import { useIPFS } from '@hooks/useIPFS';
import { useState } from 'react';

interface CreateMetadataParams {
  name: string;
  symbol: string;
  description: string;
  image: File;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  creators?: Array<{
    address: string;
    share: number;
  }>;
  sellerFeeBasisPoints?: number; // Royalty in basis points (e.g., 250 = 2.5%)
  collection?: {
    name: string;
    family?: string;
  };
}

interface CreateMetadataResponse {
  imageUri: string;
  metadataUri: string;
  error?: string;
}

export const useCreateMetadata = () => {
  const { uploadTokenMetadata, isUploading, error, uploadProgress } = useIPFS();
  const [status, setStatus] = useState<string>('');

  const createMetadataV3 = async ({
    name,
    symbol,
    description,
    image,
    attributes = [],
    creators = [],
    sellerFeeBasisPoints = 0,
    collection,
  }: CreateMetadataParams): Promise<CreateMetadataResponse> => {
    try {
      setStatus('Initializing metadata creation...');

      // Validate required inputs
      if (!name || !symbol || !description || !image) {
        throw new Error('Missing required fields for metadata creation');
      }

      // Validate creator shares total to 100%
      if (creators.length > 0) {
        const totalShares = creators.reduce((sum, creator) => sum + creator.share, 0);
        if (totalShares !== 100) {
          throw new Error('Creator shares must total 100');
        }
      }

      // Validate seller fee basis points
      if (sellerFeeBasisPoints < 0 || sellerFeeBasisPoints > 10000) {
        throw new Error('Seller fee basis points must be between 0 and 10000');
      }

      setStatus('Uploading image and creating metadata...');
      const { metadataUri, imageUri } = await uploadTokenMetadata({
        name,
        symbol,
        description,
        image,
        attributes,
        creators,
        collection,
      });

      setStatus('Metadata creation complete!');

      return {
        imageUri,
        metadataUri,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create metadata';
      setStatus(`Error: ${errorMessage}`);
      return {
        imageUri: '',
        metadataUri: '',
        error: errorMessage,
      };
    }
  };

  return {
    createMetadataV3,
    isUploading,
    error,
    uploadProgress,
    status,
  };
};

/* 
// Example usage:

import { useCreateMetadata } from '@/utils/createMetadataV3';

const YourComponent = () => {
  const { createMetadataV3, isUploading, error, uploadProgress, status } = useCreateMetadata();

  const handleTokenCreation = async (imageFile: File) => {
    try {
      const { metadataUri, imageUri, error } = await createMetadataV3({
        name: "My NFT Collection",
        symbol: "MYNFT",
        description: "A unique collection of digital assets",
        image: imageFile,
        attributes: [
          { trait_type: "Rarity", value: "Legendary" },
          { trait_type: "Power", value: 100 }
        ],
        creators: [
          { address: "CREATOR_WALLET_ADDRESS", share: 100 }
        ],
        sellerFeeBasisPoints: 250, // 2.5% royalty
        collection: {
          name: "My Amazing Collection",
          family: "NFT Collection Series"
        }
      });

      if (error) {
        console.error('Failed to create metadata:', error);
        return;
      }

      // Successfully created metadata
      console.log('Image URI:', imageUri);
      console.log('Metadata URI:', metadataUri);
      
      // These URIs can now be used for minting your token
      
    } catch (err) {
      console.error('Error in token creation:', err);
    }
  };

  // You can use these states to update your UI
  if (isUploading) {
    if (uploadProgress.stage === 'image') {
      console.log(`Uploading image: ${uploadProgress.progress}%`);
    } else if (uploadProgress.stage === 'metadata') {
      console.log(`Uploading metadata: ${uploadProgress.progress}%`);
    }
  }

  // Display current status
  console.log('Current status:', status);

  return (
    // Your component JSX
  );
};
*/

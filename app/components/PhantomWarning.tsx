'use client';

import React from 'react';
import Image from 'next/image';

const PhantomWarning: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/2">
        <div className="bg-[#1B1B1B] rounded-xl p-4 border border-[#2A2A2A] h-full">
          <div className="mb-4">
            <span className="text-white/90 px-3 py-1.5 rounded-md inline-flex items-center gap-2 border border-[#ff6b6b]/30 bg-[#2A2A2A]">
              <Image 
                src="/phantom-icon.png"
                alt="Phantom"
                width={50}
                height={50}
                className="opacity-100"
              />
              <span className="font-medium">Important Phantom Security Notice</span>
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="bg-[#2A2A2A] rounded-lg p-4 border border-[#3A3A3A]">
              <span className="text-[#ff6b6b] font-medium block mb-2">
                Step 1: Request Blocked
              </span>
              <span className="text-white/90 block mb-1">
                Click &quot;Proceed anyway (unsafe)&quot;
              </span>
              <span className="text-white/60 block italic text-sm">
                Standard warning for new dApps
              </span>
            </div>

            <div className="bg-[#2A2A2A] rounded-lg p-4 border border-[#3A3A3A]">
              <span className="text-[#ff6b6b] font-medium block mb-2">
                Step 2: Confirmation
              </span>
              <span className="text-white/90 block mb-1">
                Click &quot;Confirm (unsafe)&quot;
              </span>
              <span className="text-white/60 block italic text-sm">
                Security verification step
              </span>
            </div>

            <div className="bg-[#2A2A2A] rounded-lg p-4 border border-[#3A3A3A]">
              <span className="text-[#ff6b6b] font-medium block mb-2">
                Step 3: Final Step
              </span>
              <span className="text-white/90 block mb-1">
                Check &quot;I understand&quot;
              </span>
              <span className="text-white/90 block">
                Click &quot;Yes, confirm (unsafe)&quot;
              </span>
            </div>

            <div className="bg-[#2A2A2A] rounded-lg p-4 border border-[#3A3A3A]">
              <span className="text-[#14F195] font-medium block mb-2">
                Platform Security
              </span>
              <div className="text-white/90 text-sm space-y-1.5">
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>100% On-chain transactions</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>No custody of user funds</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>Open-source code verification</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2 bg-[#2A2A2A] px-3 py-1.5 rounded-lg border border-[#3A3A3A]">
                <span className="text-[#14F195] inline-flex items-center gap-1">
                  ✓ Verified Security Check
                </span>
                <span className="text-white/50 text-sm">
                  Standard checks for new dApps
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2">
        <div className="bg-[#1B1B1B] rounded-xl p-4 border border-[#2A2A2A] h-full">
          <div className="mb-4">
            <span className="text-white/90 px-3 py-1.5 rounded-md inline-flex items-center gap-2 border border-[#14F195]/30 bg-[#2A2A2A]">
              <Image 
                src="/phantom-icon.png"
                alt="Phantom"
                width={50}
                height={50}
                className="opacity-100"
              />
              <span className="font-medium">Security Integration Progress</span>
            </span>
          </div>

          <div className="space-y-4">
            <div className="bg-[#2A2A2A] rounded-lg p-4 border border-[#3A3A3A]">
              <span className="text-[#14F195] font-medium block mb-2">
                Current Status
              </span>
              <span className="text-white/90 block">
                • Working with Blowfish for whitelisting approval
              </span>
              <span className="text-white/90 block">
                • Building additional portfolio projects
              </span>
            </div>

            <div className="bg-[#2A2A2A] rounded-lg p-4 border border-[#3A3A3A]">
              <span className="text-[#14F195] font-medium block mb-2">
                Timeline Updates
              </span>
              <div className="text-white/90 space-y-2 text-sm">
                <p>• Nov 8: Site Launch & Initial Contact</p>
                <p>• Nov 9: Provided Technical Documentation</p>
                <p>• Nov 10-11: Additional Verification Steps</p>
                <p>• Current: Expanding Project Portfolio</p>
              </div>
            </div>

            <div className="bg-[#2A2A2A] rounded-lg p-4 border border-[#3A3A3A]">
              <span className="text-[#14F195] font-medium block mb-2">
                Next Steps
              </span>
              <div className="text-white/90 space-y-2">
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>Building social presence on Twitter & Discord</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>Seeking established developer voucher</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>Creating additional open-source projects</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-2 bg-[#2A2A2A] px-3 py-1.5 rounded-lg border border-[#3A3A3A]">
              <span className="text-[#14F195] inline-flex items-center gap-1">
                ⟳ In Progress
              </span>
              <span className="text-white/50 text-sm">
                Security Integration
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhantomWarning;
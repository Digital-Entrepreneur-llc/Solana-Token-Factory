'use client';

import { RevokeMintAuthority } from './RevokeMintAuthority';

export const TokenActions = () => {
  return (
    <div className="space-y-6 w-full max-w-lg mx-auto">
      <RevokeMintAuthority />
      {/* Coming soon: RevokeFreezeAuthority */}
      {/* <RevokeFreezeAuthority /> */}
    </div>
  );
};

export default TokenActions;

'use client';

import { TokenCreator } from '@components/TokenCreator';
import { TokenActions } from '@components/TokenActions';
import { FAQ } from '@components/FAQ';
import { ArrowRight, Shield, Clock, Zap } from 'lucide-react';
import { BASE_TOKEN_FEE, AUTHORITY_REVOCATION_FEE, formatFee } from './config/fees';
import RecentTokens from '@components/RecentTokens';
import { Suspense } from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* Left Column */}
          <div className="flex flex-col items-center space-y-8">
            {/* Header */}
            <div className="max-w-lg w-full text-center mb-8">
              <h1 className="text-5xl font-bold mb-6 text-center bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text">
                Solana Token Factory
              </h1>
              <p className="text-xl text-body leading-relaxed">
                The perfect tool to create Solana SPL tokens.
                <br />
                Simple, user friendly, and fast.
              </p>
            </div>

            {/* Token Creator */}
            <Suspense fallback={<div className="w-full max-w-xl rounded-xl p-8 border border-[#343434] bg-[#1B1B1B]/90 text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-40 bg-[#343434] rounded mb-4"></div>
                <div className="h-4 w-60 bg-[#343434] rounded mb-8"></div>
                <div className="space-y-3 w-full max-w-md">
                  <div className="h-10 bg-[#343434] rounded"></div>
                  <div className="h-10 bg-[#343434] rounded"></div>
                  <div className="h-10 bg-[#343434] rounded"></div>
                </div>
              </div>
            </div>}>
              <TokenCreator />
            </Suspense>
            
            {/* Token Actions */}
            <TokenActions />
          </div>

          {/* Right Column - Instructions */}
          <div className="space-y-8 lg:pl-8">
            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { icon: Shield, text: "Secure & Audited" },
                { icon: Clock, text: "5 Minute Setup" },
                { icon: Zap, text: "Low Cost" },
                { icon: ArrowRight, text: "Easy to Use" }
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="surface-dark flex items-center gap-3">
                  <Icon className="w-5 h-5 text-success" />
                  <span className="text-white/80">{text}</span>
                </div>
              ))}
            </div>

            {/* Create Token Section */}
            <section className="surface">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text">
                Create Solana Token
              </h2>
              <div className="space-y-4">
                <p className="text-body leading-relaxed">
                  Effortlessly create your Solana SPL Token with our 7+1 step process – no coding required.
                </p>
                <p className="text-body leading-relaxed">
                  Customize your Solana Token exactly the way you envision it. Less than 5 minutes, at an affordable cost.
                </p>
              </div>
            </section>

            {/* How to Use Section */}
            <section className="surface">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text">
                How to use Solana Token Factory
              </h2>
              <ol className="space-y-3">
                {[
                  "Connect your Solana wallet.",
                  "Specify the desired name for your Token",
                  "Indicate the symbol (max 8 characters).",
                  "Select the decimals quantity (5 for utility Token, 9 for meme token).",
                  "Provide a brief description for your SPL Token.",
                  "Upload the image for your token (PNG).",
                  "Determine the Supply of your Token.",
                  "Click on create, accept the transaction and wait until your tokens ready."
                ].map((step, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-dark text-success text-sm">
                      {index + 1}
                    </span>
                    <span className="text-body">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 status-success p-3 rounded-lg">
                <p className="font-medium">
                  Token creation costs {formatFee(BASE_TOKEN_FEE)} SOL, providing full professional token creation on Solana.
                </p>
              </div>
            </section>

            {/* Authority Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="surface">
              <h2 className="text-xl font-bold mb-3 bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text">
                  Revoke Freeze Authority
                </h2>
                <div className="space-y-1">
                  <p className="text-body">Required to create a liquidity pool.</p>
                  <p className="text-body">Security enhancement: {formatFee(AUTHORITY_REVOCATION_FEE)} SOL</p>
                </div>
              </section>

              <section className="surface">
              <h2 className="text-xl font-bold mb-3 bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text">
                  Revoke Mint Authority
                </h2>
                <div className="space-y-1">
                  <p className="text-body">Prevents future supply increases.</p>
                  <p className="text-body">Security enhancement: {formatFee(AUTHORITY_REVOCATION_FEE)} SOL</p>
                </div>
              </section>
            </div>
            
            {/* Recently Created Tokens Section */}
            <RecentTokens />

            {/* Token Creation Process Section */}
            <section className="surface">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text">
                Simple Token Creation
              </h2>
              <div className="space-y-4">
                <p className="text-body leading-relaxed">
                  Once the creation process starts, it will only take a few seconds! Once complete, you will receive the total supply of the token in your wallet.
                </p>
                
                <p className="text-body leading-relaxed">
                  With our user-friendly platform, managing your tokens is simple and affordable. Using your wallet, you can easily create tokens, increase their supply, or freeze them as needed. Discover the ease of Solana Token creation with us.
                </p>
                
                <p className="text-body leading-relaxed">
                  You can choose to revoke mint authority later if you choose.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mb-20">
          <FAQ />
        </section>

        {/* Info Sections */}
        <div className="w-full max-w-7xl mx-auto space-y-12 mb-20">
          <section className="surface">
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text">
              Solana SPL Token Factory
            </h2>
            <div className="space-y-4 text-body leading-relaxed">
              <p>
                If you&apos;re seeking a convenient and effective method for generating SPL tokens on the Solana blockchain, our online SPL Token Factory offers an ideal solution. Our platform is user-friendly and intuitive, enabling users to tailor and launch their tokens within minutes.
              </p>
              <p>
                Our SPL token Factory eliminates the need for expertise in blockchain technology; anyone can effortlessly create and manage their tokens. Additionally, we prioritize high security and privacy for our users. All transactions and token information benefit from protection through our on-chain smart contract, ensuring the security of your assets throughout and after the process.
              </p>
              <p>
                Our goal is to provide users with a seamless and efficient experience in crafting SPL tokens on the Solana blockchain. Through our online factory, you can personalize your tokens with unique logos, descriptions, and issuance details, making them distinct and reflective of your brand or project.
              </p>
            </div>
          </section>

          <section className="surface">
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text">
              Why Create Solana Tokens using The Solana Factory
            </h2>
            <div className="space-y-4 text-body leading-relaxed">
              <p>
                Whether you&apos;re a seasoned developer or just starting out, our SPL Token Factory software is tailor-made for you. Experience the ease of quickly and securely generating tokens, saving valuable time and resources. What sets us apart is our unwavering commitment to exceptional support.
              </p>
              <p>
                Our dedicated team of experts is available 24/7 to address any inquiries or challenges you may encounter. Start your journey of creating and managing SPL tokens on Solana today with confidence, knowing that our reliable and secure online factory offers an unparalleled experience. You won&apos;t find a more user-friendly and efficient solution elsewhere!
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
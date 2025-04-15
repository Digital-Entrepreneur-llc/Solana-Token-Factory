'use client';

import { useEffect, useState } from 'react';
import { fetchPromoCodes, PromoCode } from '@/app/config/promoCodes';
import { Tag, Timer, X, Sparkles, Users } from 'lucide-react';

// Fallback promo code in case the API fails
const FALLBACK_PROMO: PromoCode = {
  code: 'SOLANA20',
  discountPercentage: 20,
  maxUses: 20,
  usesCount: 0,
  // Set expiry date to end of current month
  expiryDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  description: '20% discount on token creation'
};

const PromoBanner = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch promo code data
  useEffect(() => {
    const getPromoCodes = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching promo codes...');
        const codes = await fetchPromoCodes();
        console.log('Fetched promo codes:', codes);
        
        // Get the first promo code
        const firstCode = Object.values(codes)[0];
        
        if (firstCode) {
          console.log('Found promo code:', firstCode);
          setPromoCode(firstCode);
        } else {
          console.log('No promo codes found, using fallback');
          setPromoCode(FALLBACK_PROMO);
        }
      } catch (error) {
        console.error('Failed to fetch promo code:', error);
        // Use fallback if API fails
        setPromoCode(FALLBACK_PROMO);
      } finally {
        setIsLoading(false);
      }
    };
    
    getPromoCodes();
  }, []);
  
  // Calculate time remaining until expiry
  useEffect(() => {
    if (isLoading) return;
    
    if (!promoCode) {
      console.warn('No promo code available for countdown');
      return;
    }
    
    // Return early if no expiry date
    if (!promoCode.expiryDate) {
      console.warn('Promo code has no expiry date');
      return;
    }
    
    const calculateTimeLeft = () => {
      // Handle both Date object and string formats
      let expiryDate: Date;
      
      if (promoCode.expiryDate instanceof Date) {
        expiryDate = promoCode.expiryDate;
      } else if (typeof promoCode.expiryDate === 'string') {
        expiryDate = new Date(promoCode.expiryDate);
      } else {
        // Fallback to end of current month if unexpected type
        expiryDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        console.warn('Using fallback expiry date (end of month)');
      }
      
      console.log('Calculating time left until:', expiryDate.toISOString());
      const difference = expiryDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        console.log('Promo code expired');
        setIsVisible(false);
        return;
      }
      
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [promoCode, isLoading]);
  
  // Add an attention-grabbing animation every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Show loading state or nothing if not available
  if (isLoading) {
    console.log('Promo banner is loading...');
    return null;
  }
  
  // If user closed the banner or there's no promo code, don't show
  if (!isVisible || !promoCode) {
    console.log('Banner not visible due to:', !isVisible ? 'user closed' : 'no promo code');
    return null;
  }
  
  // Format remaining uses message
  const remainingUsesMessage = promoCode.maxUses 
    ? `Only ${promoCode.maxUses - (promoCode.usesCount || 0)} uses remaining!`
    : '';
  
  return (
    <div className={`w-full bg-gradient-to-r from-[#9945FF]/70 to-[#14F195]/70 py-3 relative overflow-hidden ${isAnimating ? 'animate-pulse' : ''}`}>
      {/* Dark overlay to reduce brightness */}
      <div className="absolute inset-0 bg-black/20"></div>
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute left-1/4 top-0 w-1 h-full bg-white/5 skew-x-12" />
        <div className="absolute right-1/4 top-0 w-1 h-full bg-white/5 skew-x-12" />
        
        {/* Sparkles */}
        <div className="absolute top-1 left-[20%] animate-float">
          <Sparkles className="w-4 h-4 text-yellow-300/70" />
        </div>
        <div className="absolute bottom-1 left-[70%] animate-float-delayed">
          <Sparkles className="w-3 h-3 text-yellow-300/70" />
        </div>
        <div className="absolute top-2 right-[30%] animate-float-slow">
          <Sparkles className="w-5 h-5 text-yellow-300/70" />
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          {/* Left side: Urgency message */}
          <div className="flex items-center bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Tag className="w-4 h-4 text-white mr-2" />
            <span className="text-white font-bold">
              LIMITED TIME OFFER! 🔥
            </span>
          </div>
          
          {/* Middle: Promo code */}
          <div className="flex items-center">
            <span className="text-white font-medium mr-2">
              SAVE {promoCode.discountPercentage}% with code:
            </span>
            <div className="relative">
              <code className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-md text-white font-bold border border-white/20 inline-block shadow-md">
                {promoCode.code}
              </code>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            </div>
          </div>
          
          {/* Limited uses */}
          {promoCode.maxUses && (
            <div className="flex items-center bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Users className="w-4 h-4 text-white mr-2" />
              <span className="text-white font-medium text-sm">
                {remainingUsesMessage}
              </span>
            </div>
          )}
          
          {/* Right side: Countdown */}
          <div className="flex items-center bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Timer className="w-4 h-4 text-white mr-2" />
            <span className="text-white mr-2 text-sm">Expires this month:</span>
            <div className="flex items-center gap-1 text-white font-mono">
              <div className="bg-[#9945FF]/40 rounded px-1.5 py-0.5 text-center min-w-[22px] shadow-sm">
                {timeLeft.days.toString().padStart(2, '0')}
              </div>
              <span>:</span>
              <div className="bg-[#9945FF]/40 rounded px-1.5 py-0.5 text-center min-w-[22px] shadow-sm">
                {timeLeft.hours.toString().padStart(2, '0')}
              </div>
              <span>:</span>
              <div className="bg-[#9945FF]/40 rounded px-1.5 py-0.5 text-center min-w-[22px] shadow-sm">
                {timeLeft.minutes.toString().padStart(2, '0')}
              </div>
              <span>:</span>
              <div className="bg-[#9945FF]/40 rounded px-1.5 py-0.5 text-center min-w-[22px] shadow-sm">
                {timeLeft.seconds.toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Close button */}
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors p-1 rounded-full bg-black/30 hover:bg-black/40"
        aria-label="Close promotion banner"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        
        @keyframes shimmer {
          to { background-position: -200% 0; }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float 3s ease-in-out 1s infinite;
        }
        
        .animate-float-slow {
          animation: float 4s ease-in-out 0.5s infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default PromoBanner; 
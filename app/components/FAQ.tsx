'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BASE_TOKEN_FEE, AUTHORITY_REVOCATION_FEE, formatFee } from '@/app/config/fees';

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

const faqs: FAQItem[] = [
  {
    question: "What is the Solana Token Factory?",
    answer:
      "The Solana Token Factory is an advanced Smart Contract empowering users to effortlessly generate customized SPL Tokens (Solana tokens), specifically tailored to their preferences in terms of supply, name, symbol, description, and image on the Solana Chain. Making tokens is super quick and cheap with our easy process.",
  },
  {
    question: "Is it Safe to Create Solana Tokens here?",
    answer:
      "Yes, our tool is completely safe. It is a dApp that creates your token, giving you and only you the mint and freeze Authority (the control of a SPL Token). Our dApp is audited and used by hundreds of users every month.",
  },
  {
    question: "How much time will the Solana Token Creator Take?",
    answer:
      "The time of your Token Creation depends on the TPS status of Solana. It usually takes just a few seconds, so do not worry. If you have any issues, please contact us.",
  },
  {
    question: "How much does it cost?",
    answer:
      `Token creation costs ${formatFee(BASE_TOKEN_FEE)} SOL, covering all essentials for professional token creation on Solana mainnet. Optional security enhancements like authority revocation cost ${formatFee(AUTHORITY_REVOCATION_FEE)} SOL each. These fees support ongoing platform development and ensure the highest security standards for your tokens.`,
  },
  {
    question: "Which wallet can I use?",
    answer: "You can use any Solana wallet such as Phantom, Solflare, Backpack, etc.",
  },
  {
    question: "How many tokens can I create for each decimal amount?",
    answer: (
      <div className="space-y-2">
        <p>Here is the max amount of tokens you can create for each decimal range:</p>
        <ul className="space-y-1 list-none pl-2">
          <li>0 to 4 - 1,844,674,407,370,955</li>
          <li>5 to 7 - 1,844,674,407,370</li>
          <li>8 - 184,467,440,737</li>
          <li>9 - 18,446,744,073</li>
        </ul>
      </div>
    ),
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleClick = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4">
      <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-[#4F6BFF] to-[#14F195] text-transparent bg-clip-text">
        Frequently Asked Questions
      </h2>
      <div className="space-y-2">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-[#1B1B1B]/90 rounded-lg overflow-hidden transition-all duration-200 ease-in-out"
          >
            <button
              onClick={() => handleClick(index)}
              className="w-full px-6 h-[52px] text-left flex items-center justify-between hover:bg-[#232323] transition-colors"
            >
              <span className="text-white/90">{faq.question}</span>
              <ChevronDown
                className={`w-4 h-4 text-white/50 transition-transform duration-200 ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 py-4 text-white/70 border-t border-[#343434]/30">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;

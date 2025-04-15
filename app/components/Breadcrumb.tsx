'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumb() {
  const pathname = usePathname();
  
  if (pathname === '/') return null;

  const pathSegments = pathname.split('/').filter(Boolean);
  
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return { href, label };
  });

  return (
    <>
      {/* Schema.org BreadcrumbList markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": breadcrumbItems.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@id": `https://solanatokenfactory.com${item.href}`,
              "name": item.label
            }
          }))
        })}
      </script>

      <div className="w-full bg-[#0B0B1E] border-b border-[#343434]/30 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center space-x-2 text-sm overflow-x-auto whitespace-nowrap">
            <li>
              <Link
                href="/"
                className="text-white/70 hover:text-white transition-colors flex items-center"
              >
                <Home className="w-4 h-4" />
              </Link>
            </li>
            
            {breadcrumbItems.map((item, index) => (
              <li key={item.href} className="flex items-center">
                <ChevronRight className="w-4 h-4 text-white/30 mx-2 flex-shrink-0" />
                <Link
                  href={item.href}
                  className={`${
                    index === breadcrumbItems.length - 1
                      ? 'text-[#14F195] pointer-events-none'
                      : 'text-white/70 hover:text-white'
                  } transition-colors`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
} 
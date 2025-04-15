const Footer = () => {
  return (
    <footer className="w-full bg-[#0B0B1E] border-t border-[#343434]/30 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-400">
          Need support? Contact us:{' '}
          <a
            href="mailto:support@solanatokenfactory.com"
            className="text-[#9945FF] hover:text-[#14F195] transition-colors"
          >
            support@solanatokenfactory.com
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

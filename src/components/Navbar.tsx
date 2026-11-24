import { useState } from 'react';
import { Phone, Menu, X } from 'lucide-react';
import { COMPANY_INFO } from '../types';

interface NavbarProps {
  onNavigate: (path: string, sectionId?: string) => void;
}

export function Navbar({ onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (path: string, sectionId?: string) => {
    setMobileOpen(false);
    onNavigate(path, sectionId);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleLink('/');
          }}
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#0B2545] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]"
        >
          <img
            src={COMPANY_INFO.logoUrl}
            alt="AGRO TRAD logo"
            className="h-9 w-auto object-contain shrink-0"
          />
          <span>{COMPANY_INFO.name}</span>
        </a>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600" aria-label="Main navigation">
          <a
            href="#catalog"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/', 'catalog');
            }}
            className="hover:text-[#0B2545] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Catalog
          </a>
          <a
            href="#categories"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/', 'categories');
            }}
            className="hover:text-[#0B2545] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Categories
          </a>
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/', 'about');
            }}
            className="hover:text-[#0B2545] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            About
          </a>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/', 'contact');
            }}
            className="hover:text-[#0B2545] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Contact
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={`tel:${COMPANY_INFO.phone}`}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            <span className="font-mono">{COMPANY_INFO.phone}</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center p-2.5 rounded-lg text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => handleLink('/', 'catalog')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => handleLink('/', 'categories')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Categories
          </button>
          <button
            type="button"
            onClick={() => handleLink('/', 'about')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            About Us
          </button>
          <button
            type="button"
            onClick={() => handleLink('/', 'contact')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Contact &amp; Offices
          </button>
          <div className="pt-2">
            <a
              href={`tel:${COMPANY_INFO.phone}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#EA580C] rounded-lg"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span>Call {COMPANY_INFO.phone}</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

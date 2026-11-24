import { Phone, MapPin, MessageCircle } from 'lucide-react';
import { COMPANY_INFO, DEFAULT_CATEGORIES } from '../types';

interface FooterProps {
  onNavigate: (path: string, sectionId?: string) => void;
  onSelectCategory?: (category: string) => void;
}

export function Footer({ onNavigate, onSelectCategory }: FooterProps) {
  return (
    <footer className="bg-[#071930] text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="inline-flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg">
              <img
                src={COMPANY_INFO.logoUrl}
                alt="AGRO TRAD logo"
                className="h-9 w-auto object-contain"
              />
              <span className="text-base font-bold text-[#0B2545] font-display tracking-tight">
                {COMPANY_INFO.name}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Imported dairy, poultry, and agricultural machinery supplier in Bangladesh. Sourcing verified farm equipment from China, Turkey, India, and Vietnam.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`tel:${COMPANY_INFO.phone}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-lg transition-colors"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="font-mono">{COMPANY_INFO.phone}</span>
              </a>
              <a
                href={`https://wa.me/${COMPANY_INFO.internationalPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Machinery Categories</h3>
            <ul className="space-y-2 text-sm">
              {DEFAULT_CATEGORIES.slice(0, 6).map((cat) => (
                <li key={cat.name}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectCategory) onSelectCategory(cat.name);
                      onNavigate('/', 'catalog');
                    }}
                    className="text-slate-400 hover:text-white transition-colors text-left"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Dhaka Office</h3>
            <div className="flex items-start gap-2.5 text-sm text-slate-400">
              <MapPin className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-slate-300">{COMPANY_INFO.dhakaOfficeEn}</p>
                <p className="mt-1.5 text-xs text-slate-400">{COMPANY_INFO.dhakaOfficeBn}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Bogura Office</h3>
            <div className="flex items-start gap-2.5 text-sm text-slate-400">
              <MapPin className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-slate-300">{COMPANY_INFO.boguraOfficeEn}</p>
                <p className="mt-1.5 text-xs text-slate-400">{COMPANY_INFO.boguraOfficeBn}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} {COMPANY_INFO.name}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('/', 'catalog')}
              className="hover:text-white transition-colors"
            >
              Machinery Catalog
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/', 'contact')}
              className="hover:text-white transition-colors"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

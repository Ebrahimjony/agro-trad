import { useState } from 'react';
import { Phone, MessageCircle, Video, Banknote, Copy, Check, X } from 'lucide-react';
import { COMPANY_INFO } from '../types';

interface ContactButtonsProps {
  productName?: string;
  productNumber?: string;
  onContactForPrice?: () => void;
  variant?: 'hero' | 'section' | 'detail';
}

export function ContactButtons({
  productName,
  productNumber,
  onContactForPrice,
  variant = 'section',
}: ContactButtonsProps) {
  const [showImoModal, setShowImoModal] = useState(false);
  const [showBkashModal, setShowBkashModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const waText = productNumber && productName
    ? `Hello AGRO TRAD, I would like to inquire about ${productName} (${productNumber}).`
    : 'Hello AGRO TRAD, I would like to know more about your dairy and agricultural machinery.';

  const waHref = `https://wa.me/${COMPANY_INFO.internationalPhone}?text=${encodeURIComponent(waText)}`;
  const telHref = `tel:${COMPANY_INFO.phone}`;

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(COMPANY_INFO.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const baseBtn =
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2';

  const isHero = variant === 'hero';

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={telHref}
          className={`${baseBtn} bg-[#EA580C] hover:bg-[#C2410C] text-white focus-visible:outline-[#EA580C]`}
        >
          <Phone className="w-4 h-4" aria-hidden="true" />
          <span>Call Now</span>
        </a>

        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseBtn} ${
            isHero
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:outline-emerald-500'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:outline-emerald-600'
          }`}
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={() => setShowImoModal(true)}
          className={`${baseBtn} ${
            isHero
              ? 'bg-white/10 hover:bg-white/20 text-white border border-white/25 focus-visible:outline-white'
              : 'bg-[#0B2545] hover:bg-[#133863] text-white focus-visible:outline-[#0B2545]'
          }`}
        >
          <Video className="w-4 h-4" aria-hidden="true" />
          <span>imo</span>
        </button>

        {onContactForPrice ? (
          <button
            type="button"
            onClick={onContactForPrice}
            className={`${baseBtn} ${
              isHero
                ? 'bg-white text-[#0B2545] hover:bg-slate-100 focus-visible:outline-white'
                : 'bg-white text-[#0B2545] border border-slate-300 hover:bg-slate-50 focus-visible:outline-[#0B2545]'
            }`}
          >
            <Banknote className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
            <span>Contact for Price</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowBkashModal(true)}
            className={`${baseBtn} ${
              isHero
                ? 'bg-white text-[#0B2545] hover:bg-slate-100 focus-visible:outline-white'
                : 'bg-white text-[#0B2545] border border-slate-300 hover:bg-slate-50 focus-visible:outline-[#0B2545]'
            }`}
          >
            <Banknote className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
            <span>bKash &amp; Price Info</span>
          </button>
        )}
      </div>

      {/* imo Quick Connect Dialog */}
      {showImoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="imo-dialog-title">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 id="imo-dialog-title" className="text-lg font-bold text-[#0B2545]">
                  Connect on imo
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Video call or message AGRO TRAD directly on imo for machine demonstrations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImoModal(false)}
                aria-label="Close imo dialog"
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4 mb-5">
              <div>
                <div className="text-xs font-medium text-slate-500">imo Number</div>
                <div className="text-xl font-mono font-semibold text-[#0B2545] mt-0.5">{COMPANY_INFO.phone}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#0B2545] text-white hover:bg-[#133863] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Number'}</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-3">
              <a
                href={telHref}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#EA580C] text-white hover:bg-[#C2410C]"
              >
                Call {COMPANY_INFO.phone}
              </a>
              <button
                type="button"
                onClick={() => setShowImoModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* bKash Contact Info Dialog */}
      {showBkashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="bkash-dialog-title">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 id="bkash-dialog-title" className="text-lg font-bold text-[#0B2545]">
                  bKash &amp; Direct Order Line
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Contact our sales team first to confirm machine availability, delivery terms, and booking details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBkashModal(false)}
                aria-label="Close bKash info dialog"
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4 mb-5">
              <div>
                <div className="text-xs font-medium text-slate-500">Official bKash / Phone</div>
                <div className="text-xl font-mono font-semibold text-[#0B2545] mt-0.5">{COMPANY_INFO.phone}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#0B2545] text-white hover:bg-[#133863] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Number'}</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Message on WhatsApp
              </a>
              <button
                type="button"
                onClick={() => setShowBkashModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

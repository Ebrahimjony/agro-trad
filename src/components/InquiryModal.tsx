import { useState, useEffect, FormEvent } from 'react';
import { X, CheckCircle2, Phone, MessageCircle, Loader2 } from 'lucide-react';
import { Product, Inquiry, COMPANY_INFO } from '../types';
import { submitInquiryToFirestore } from '../services/firestoreService';

interface InquiryModalProps {
  isOpen: boolean;
  product: Product | null;
  allProducts: Product[];
  onClose: () => void;
}

export function InquiryModal({ isOpen, product, allProducts, onClose }: InquiryModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedNumber, setSelectedNumber] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedInquiry, setSubmittedInquiry] = useState<Inquiry | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSubmittedInquiry(null);
      if (product) {
        setSelectedNumber(product.productNumber);
        setSelectedName(product.name);
      } else if (allProducts.length > 0) {
        setSelectedNumber(allProducts[0].productNumber);
        setSelectedName(allProducts[0].name);
      } else {
        setSelectedNumber('GENERAL-INQUIRY');
        setSelectedName('General Machinery Inquiry');
      }
      setQuantity(1);
      setMessage('');
    }
  }, [isOpen, product, allProducts]);

  if (!isOpen) return null;

  const handleProductSelect = (prodNum: string) => {
    setSelectedNumber(prodNum);
    const found = allProducts.find((p) => p.productNumber === prodNum);
    if (found) {
      setSelectedName(found.name);
    } else if (prodNum === 'GENERAL-INQUIRY') {
      setSelectedName('General Machinery Inquiry');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (customerName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[+\d\s()-]{6,20}$/.test(phoneNumber.trim())) {
      setError('Please enter a valid phone number.');
      return;
    }

    setSubmitting(true);

    try {
      const saved = await submitInquiryToFirestore({
        customerName,
        phoneNumber,
        productNumber: selectedNumber,
        productName: selectedName,
        quantity,
        address,
        message,
      });
      setSubmittedInquiry(saved);
      setCustomerName('');
      setPhoneNumber('');
      setAddress('');
      setMessage('');
    } catch (err) {
      setError((err as Error).message || 'Could not submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden my-8">
        <div className="bg-[#0B2545] text-white px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 id="inquiry-modal-title" className="text-lg font-bold font-display">
              Request Price &amp; Order Inquiry
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              No account needed. Submit your inquiry and our team will call you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inquiry modal"
            className="p-2 text-slate-300 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedInquiry ? (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-base font-bold text-emerald-950">Inquiry Submitted Successfully</h3>
                <p className="text-sm text-emerald-800 mt-1">
                  Reference <span className="font-mono font-semibold">{submittedInquiry.id}</span> has been recorded for{' '}
                  <span className="font-mono font-semibold">{submittedInquiry.productNumber}</span>.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Product Number</span>
                <span className="font-mono font-semibold text-[#0B2545]">{submittedInquiry.productNumber}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Machine</span>
                <span className="font-medium text-slate-900 text-right">{submittedInquiry.productName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Quantity</span>
                <span className="font-mono text-slate-900">{submittedInquiry.quantity}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${COMPANY_INFO.phone}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#EA580C] text-white hover:bg-[#C2410C]"
                >
                  <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Call {COMPANY_INFO.phone}</span>
                </a>
                <a
                  href={`https://wa.me/${COMPANY_INFO.internationalPhone}?text=${encodeURIComponent(
                    `Hello, I just submitted inquiry ${submittedInquiry.id} for ${submittedInquiry.productName} (${submittedInquiry.productNumber}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>WhatsApp</span>
                </a>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg" role="alert">
                {error}
              </div>
            )}

            {/* Linked Machine Info (Auto-filled) */}
            {product ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Product Number</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedNumber}
                    className="mt-1 w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-sm font-mono font-semibold text-[#0B2545]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-500">Product Name</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedName}
                    className="mt-1 w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-900"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="inquiry-machine-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Machine
                  </label>
                  <select
                    id="inquiry-machine-select"
                    value={selectedNumber}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-[#0B2545] focus:outline-none"
                  >
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.productNumber}>
                        {p.productNumber} — {p.name}
                      </option>
                    ))}
                    <option value="GENERAL-INQUIRY">GENERAL-INQUIRY — Other / Custom Requirement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product No.</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedNumber}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-semibold text-[#0B2545]"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inq-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="inq-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="inq-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number <span className="text-rose-600">*</span>
                </label>
                <input
                  id="inq-phone"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#0B2545] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="inq-qty" className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity <span className="text-rose-600">*</span>
                </label>
                <input
                  id="inq-qty"
                  type="number"
                  min={1}
                  max={999}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="inq-address" className="block text-xs font-semibold text-slate-700 mb-1">
                  Address (Optional)
                </label>
                <input
                  id="inq-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="District / Upazila / Farm location"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-[#0B2545] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inq-message" className="block text-xs font-semibold text-slate-700 mb-1">
                Message
              </label>
              <textarea
                id="inq-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about price, delivery to your district, or machine capacity..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 rounded-lg transition-colors min-h-[44px]"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>{submitting ? 'Submitting...' : 'Submit Inquiry'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { ArrowLeft, Globe, Phone, MessageCircle, FileText } from 'lucide-react';
import { Product, COMPANY_INFO } from '../types';
import { MachineImage } from './MachineImage';
import { ProductCard, StockIndicator, formatBdtPrice } from './ProductCard';
import { ContactButtons } from './ContactButtons';

interface ProductDetailsPageProps {
  productNumber: string;
  allProducts: Product[];
  onBack: () => void;
  onViewDetails: (productNumber: string) => void;
  onInquire: (product: Product) => void;
}

export function ProductDetailsPage({
  productNumber,
  allProducts,
  onBack,
  onViewDetails,
  onInquire,
}: ProductDetailsPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    setActiveImageIdx(0);

    const localMatch = allProducts.find(
      (p) => p.productNumber.toUpperCase() === productNumber.toUpperCase() || p.id === productNumber
    );
    if (localMatch) {
      setProduct(localMatch);
      setRelated(
        allProducts
          .filter((p) => p.id !== localMatch.id && p.category === localMatch.category)
          .slice(0, 3)
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(productNumber)}`)
      .then(async (res) => {
        const data = (await res.json()) as { product?: Product; related?: Product[]; error?: string };
        if (!res.ok || !data.product) {
          throw new Error(data.error || 'Machine not found.');
        }
        if (!cancelled) {
          setProduct(data.product);
          setRelated(data.related || []);
        }
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productNumber, allProducts]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
          <div className="lg:col-span-6 aspect-[4/3] bg-slate-200 rounded-xl" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-4 w-1/3 bg-slate-200 rounded" />
            <div className="h-8 w-3/4 bg-slate-200 rounded" />
            <div className="h-24 w-full bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-[#0B2545]">Machine Not Found</h1>
        <p className="mt-2 text-sm text-slate-600">{error || 'This product may have been removed.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2545] rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Catalog</span>
        </button>
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [''];
  const activeImage = images[activeImageIdx] || images[0];

  return (
    <main className="bg-[#F8FAFC] py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 mb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 font-semibold text-[#0B2545] hover:text-[#EA580C]"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>All Machinery</span>
          </button>
          <span aria-hidden="true">/</span>
          <span>{product.category}</span>
          <span aria-hidden="true">/</span>
          <span className="font-mono font-semibold text-[#0B2545]">{product.productNumber}</span>
        </div>

        {/* Main 2-Column Product Showcase */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left: Multi-Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="aspect-[4/3] bg-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              <MachineImage src={activeImage} alt={product.name} className="w-full h-full object-cover" />
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === activeImageIdx
                        ? 'border-[#EA580C]'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <MachineImage src={img} alt={`${product.name} view ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Contiguous Purchase & Inquiry Module */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-slate-500">
              <span className="font-mono font-semibold text-[#0B2545]">{product.productNumber}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{product.category}</span>
              <span aria-hidden="true">&middot;</span>
              <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                <Globe className="w-3.5 h-3.5 text-[#0B2545]" aria-hidden="true" />
                Origin: {product.originCountry}
              </span>
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-[#0B2545] leading-tight [text-wrap:balance]">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <div className="text-xs text-slate-500">Price</div>
                <div className="text-2xl sm:text-3xl font-bold text-[#0B2545] tabular-nums mt-0.5">
                  {formatBdtPrice(product.price, product.priceDisplay)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">Availability</div>
                <StockIndicator status={product.stockAvailability} />
              </div>
            </div>

            <div className="py-5 space-y-3 text-sm sm:text-base text-slate-700 leading-relaxed">
              <p className="font-medium text-slate-900">{product.shortDescription}</p>
              <p>{product.fullDescription}</p>
            </div>

            {/* Primary Order / Inquiry Actions */}
            <div className="mt-auto pt-5 border-t border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onInquire(product)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors min-h-[44px]"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span>Contact for Price / Order</span>
                </button>

                <a
                  href={`https://wa.me/${COMPANY_INFO.internationalPhone}?text=${encodeURIComponent(
                    `Hello AGRO TRAD, I want price & details for ${product.name} (${product.productNumber}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span>WhatsApp Inquiry</span>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <a href={`tel:${COMPANY_INFO.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#0B2545] font-medium">
                  <Phone className="w-3.5 h-3.5 text-[#EA580C]" aria-hidden="true" />
                  <span>Direct Call / imo / bKash: <span className="font-mono font-semibold text-[#0B2545]">{COMPANY_INFO.phone}</span></span>
                </a>
              </div>

              <div className="pt-2">
                <ContactButtons
                  productName={product.name}
                  productNumber={product.productNumber}
                  onContactForPrice={() => onInquire(product)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specifications Table */}
        <section className="mt-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-[#0B2545] mb-4">Technical Specifications</h2>
          {product.specifications.length === 0 ? (
            <p className="text-sm text-slate-600">
              Contact us at <span className="font-mono font-semibold">{COMPANY_INFO.phone}</span> for complete engineering sheet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 pr-4 text-left font-semibold text-slate-600 w-1/3">Product Number</th>
                    <td className="py-3 font-mono font-semibold text-[#0B2545]">{product.productNumber}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 pr-4 text-left font-semibold text-slate-600">Country of Origin</th>
                    <td className="py-3 text-slate-900">{product.originCountry}</td>
                  </tr>
                  {product.specifications.map((spec, idx) => (
                    <tr key={`${spec.label}-${idx}`} className="border-b border-slate-100 last:border-b-0">
                      <th className="py-3 pr-4 text-left font-semibold text-slate-600">{spec.label}</th>
                      <td className="py-3 text-slate-900 tabular-nums">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-[#0B2545] mb-5">Related Machinery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((rel) => (
                <ProductCard
                  key={rel.id}
                  product={rel}
                  onViewDetails={onViewDetails}
                  onInquire={onInquire}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

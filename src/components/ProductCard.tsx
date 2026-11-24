import { CheckCircle2, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Product } from '../types';
import { MachineImage } from './MachineImage';

interface ProductCardProps {
  product: Product;
  onViewDetails: (productNumber: string) => void;
  onInquire: (product: Product) => void;
}

export function formatBdtPrice(price: number | null, priceDisplay?: string): string {
  if (price !== null && price > 0) {
    return `৳ ${price.toLocaleString('en-BD')}`;
  }
  return priceDisplay || 'Contact for Price';
}

export function StockIndicator({ status }: { status: Product['stockAvailability'] }) {
  if (status === 'In Stock') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>In Stock</span>
      </span>
    );
  }
  if (status === 'Pre-Order') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Pre-Order</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700">
      <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Out of Stock</span>
    </span>
  );
}

export function ProductCard({ product, onViewDetails, onInquire }: ProductCardProps) {
  const primaryImage = product.images[0];

  return (
    <article className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <a
        href={`/product/${product.productNumber}`}
        onClick={(e) => {
          e.preventDefault();
          onViewDetails(product.productNumber);
        }}
        className="block aspect-[4/3] bg-slate-100 overflow-hidden"
      >
        <MachineImage
          src={primaryImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </a>

      <div className="p-5 flex-1 flex flex-col">
        {/* Clean unboxed metadata with typographic separators */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-mono font-semibold text-[#0B2545]">{product.productNumber}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{product.originCountry}</span>
          <span aria-hidden="true">&middot;</span>
          <span className="truncate max-w-[160px]">{product.category}</span>
        </div>

        <h3 className="mt-2 text-base font-semibold text-[#0B2545] leading-snug line-clamp-2">
          <a
            href={`/product/${product.productNumber}`}
            onClick={(e) => {
              e.preventDefault();
              onViewDetails(product.productNumber);
            }}
            className="hover:text-[#EA580C] transition-colors"
          >
            {product.name}
          </a>
        </h3>

        <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {product.shortDescription}
        </p>

        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-base font-bold text-[#0B2545] tabular-nums">
              {formatBdtPrice(product.price, product.priceDisplay)}
            </div>
            <div className="mt-0.5">
              <StockIndicator status={product.stockAvailability} />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onViewDetails(product.productNumber)}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#0B2545] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap min-h-[38px]"
            >
              <span>Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onInquire(product)}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors whitespace-nowrap min-h-[38px]"
            >
              Inquire
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

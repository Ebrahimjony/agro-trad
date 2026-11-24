import { useMemo } from 'react';
import {
  Search,
  MapPin,
  Phone,
  Check,
  Globe,
  Wrench,
  Eye,
  Truck,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { Product, Category, COMPANY_INFO, ORIGIN_COUNTRIES } from '../types';
import { ProductCard } from './ProductCard';
import { ContactButtons } from './ContactButtons';
import { MachineImage } from './MachineImage';

interface HomePageProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedCountry: string;
  onSelectCountry: (country: string) => void;
  onViewDetails: (productNumber: string) => void;
  onInquire: (product: Product | null) => void;
}

const HERO_IMAGE = '/src/assets/images/hero_dairy_machinery_1795506628697.jpg';

const IMPORT_COUNTRIES = [
  {
    name: 'China',
    focus: 'Silage Cutters, Auto Drinkers, Poultry Incubators & Combined Rice Mills',
  },
  {
    name: 'Turkey',
    focus: 'Commercial Stainless Milking Machines & Bulk Milk Cooling Tanks',
  },
  {
    name: 'India',
    focus: 'Electric Cream Separators, Heavy Straw Cutters & Dairy Processing Units',
  },
  {
    name: 'Vietnam',
    focus: 'High-Recovery Combined Rice Mills & Agricultural Grain Shellers',
  },
];

const WHY_CHOOSE_BANGLA = [
  'একই জায়গায় চীন, তুরস্ক, ভারত ও ভিয়েতনামের মেশিনের সংগ্রহ।',
  'ছোট খামার থেকে বড় ডেইরি ফার্ম, সব ধরনের চাহিদার মেশিন।',
  'কেনার আগে মেশিন দেখে ও বুঝে নেওয়ার সুযোগ।',
  'মেশিন সম্পর্কে সরাসরি পরামর্শ ও বিস্তারিত তথ্য।',
  'ঢাকা ও বগুড়া, দুই জায়গাতেই অফিস।',
];

const SERVICES = [
  {
    num: '01.',
    title: 'Direct Machinery Import & Supply',
    desc: 'Authentic dairy, poultry, and agricultural equipment sourced from verified factories in China, Turkey, India, and Vietnam.',
    icon: Globe,
  },
  {
    num: '02.',
    title: 'Pre-Purchase Inspection & Demo',
    desc: 'Inspect build quality, motor capacity, and operating mechanism at our Dhaka or Bogura offices before finalizing your purchase.',
    icon: Eye,
  },
  {
    num: '03.',
    title: 'Technical Guidance & Spare Parts',
    desc: 'Practical machine sizing advice based on herd or flock size, plus ongoing blade, liner, and spare component support.',
    icon: Wrench,
  },
  {
    num: '04.',
    title: 'Nationwide Delivery Coordination',
    desc: 'Reliable transport dispatch from Dhaka and Bogura hubs to farms and agro businesses across all 64 districts of Bangladesh.',
    icon: Truck,
  },
];

export function HomePage({
  products,
  categories,
  loading,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  selectedCountry,
  onSelectCountry,
  onViewDetails,
  onInquire,
}: HomePageProps) {
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (selectedCountry !== 'All' && p.originCountry !== selectedCountry) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.productNumber.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [products, selectedCategory, selectedCountry, searchQuery]);

  const hasActiveFilters =
    selectedCategory !== 'All' || selectedCountry !== 'All' || searchQuery.trim().length > 0;

  return (
    <main>
      {/* 1. Hero Section */}
      <section className="relative bg-[#071930] text-white overflow-hidden">
        <div className="absolute inset-0">
          <MachineImage
            src={HERO_IMAGE}
            alt="AGRO TRAD dairy and agricultural machinery showroom"
            className="w-full h-full object-cover opacity-45"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#071930]/95 via-[#0B2545]/85 to-[#0B2545]/55"
            aria-hidden="true"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-orange-300 mb-3">
              Dairy, Poultry &amp; Agricultural Machinery Supplier · Bangladesh
            </p>
            <h1
              className="font-display font-bold tracking-tight text-white leading-[1.12] [text-wrap:balance]"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)' }}
            >
              Quality Dairy &amp; Agricultural Machinery for Your Business
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl">
              AGRO TRAD provides domestic and imported machinery for farms and agricultural businesses. We supply modern equipment from China, Turkey, India, and Vietnam with transparent product specifications and hands-on support.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#catalog"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white transition-colors min-h-[44px]"
              >
                <span>Browse Machinery</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <ContactButtons variant="hero" onContactForPrice={() => onInquire(null)} />
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Trust Strip Below Hero */}
        <div className="relative border-t border-white/15 bg-[#071930]/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="text-xs text-slate-400">Import Origins</div>
              <div className="font-semibold text-white mt-0.5">China · Turkey · India · Vietnam</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Showrooms &amp; Offices</div>
              <div className="font-semibold text-white mt-0.5">Dhaka &amp; Bogura, Bangladesh</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Order &amp; Inquiry Line</div>
              <div className="font-mono font-semibold text-orange-300 mt-0.5">
                {COMPANY_INFO.phone} (Call · WhatsApp · imo)
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Customer Assurance</div>
              <div className="font-semibold text-white mt-0.5">Inspect Machine Before Buying</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Machinery Catalog & Categories Section */}
      <section id="catalog" className="py-16 lg:py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight">
                Featured Machinery &amp; Product Catalog
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                Search by machine name or unique product number (for example{' '}
                <span className="font-mono font-semibold text-[#0B2545]">MACH-1001</span>), or filter by category and import country.
              </p>
            </div>

            {/* Search & Origin Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search name or MACH-1001..."
                  aria-label="Search machinery by product name or product number"
                  className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B2545] focus:outline-none min-h-[44px]"
                />
              </div>

              <select
                value={selectedCountry}
                onChange={(e) => onSelectCountry(e.target.value)}
                aria-label="Filter by origin country"
                className="bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:border-[#0B2545] focus:outline-none min-h-[44px]"
              >
                <option value="All">All Origins</option>
                {ORIGIN_COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    Origin: {country}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Product Category Tabs */}
          <div id="categories" className="pt-6 pb-8">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="text-xs font-semibold text-slate-500 tracking-wide">Product Categories</h3>
              <span className="text-xs text-slate-500 tabular-nums">
                Showing {filteredProducts.length} of {products.length} machines
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectCategory('All')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                  selectedCategory === 'All'
                    ? 'bg-[#0B2545] text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                All Machinery
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.name)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                    selectedCategory === cat.name
                      ? 'bg-[#0B2545] text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-slate-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-1/2 bg-slate-200 rounded" />
                    <div className="h-5 w-3/4 bg-slate-200 rounded" />
                    <div className="h-4 w-full bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <h3 className="text-lg font-bold text-[#0B2545]">No matching machinery found</h3>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Try clearing your search filter or contact us directly at{' '}
                <span className="font-mono font-semibold text-[#0B2545]">{COMPANY_INFO.phone}</span> for custom machinery sourcing.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    onSelectCategory('All');
                    onSelectCountry('All');
                  }}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0B2545] rounded-lg hover:bg-[#133863]"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetails={onViewDetails}
                  onInquire={(p) => onInquire(p)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. About Us, Import Countries, Why Choose Us & Services */}
      <section id="about" className="py-16 lg:py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* About & Why Choose Us Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-6 space-y-5">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight">
                About AGRO TRAD
              </h2>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="text-lg font-bold text-[#0B2545]">{COMPANY_INFO.banglaName}</h3>
                <p className="text-base text-slate-800 leading-relaxed">
                  আপনার খামার ও কৃষি ব্যবসার জন্য প্রয়োজনীয় সব ধরনের দেশি-বিদেশি মেশিন এখন এক জায়গাতেই।
                </p>
                <p className="text-base text-slate-700 leading-relaxed">
                  আমরা চীন, তুরস্ক, ভারত ও ভিয়েতনাম থেকে আমদানিকৃত মানসম্পন্ন মেশিন সরবরাহ করি। ডেইরি ফার্ম, পোলট্রি ও কৃষিকাজে ব্যবহৃত আধুনিক যন্ত্রপাতি আমাদের কাছে পাবেন।
                </p>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                AGRO TRAD provides various types of domestic and imported machinery for farms and agricultural businesses. We supply modern equipment for dairy farms, poultry farms, and agricultural businesses with clear product specifications and professional customer support.
              </p>
            </div>

            <div className="lg:col-span-6 bg-[#0B2545] text-white rounded-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold font-display">Why Choose Us? (কেন আমাদের বেছে নেবেন?)</h3>
              <ul className="mt-5 space-y-3.5">
                {WHY_CHOOSE_BANGLA.map((reason) => (
                  <li key={reason} className="flex items-start gap-3 text-sm sm:text-base text-slate-100">
                    <span className="mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#EA580C] text-white shrink-0">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Imported Machinery Countries */}
          <div className="pt-8 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0B2545]">
                  Imported Machinery Countries
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Click any origin country to filter machinery imported from that region.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {IMPORT_COUNTRIES.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    onSelectCountry(c.name);
                    const el = document.getElementById('catalog');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-5 transition-colors"
                >
                  <div className="text-base font-bold text-[#0B2545] flex items-center justify-between">
                    <span>{c.name}</span>
                    <ArrowRight className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{c.focus}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Our Services */}
          <div className="pt-8 border-t border-slate-200">
            <h3 className="text-xl sm:text-2xl font-bold text-[#0B2545] mb-6">Our Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {SERVICES.map((srv) => (
                <div key={srv.num} className="border border-slate-200 rounded-xl p-5 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-sm font-semibold text-[#EA580C]">{srv.num}</span>
                    <srv.icon className="w-5 h-5 text-[#0B2545]" aria-hidden="true" />
                  </div>
                  <h4 className="text-base font-bold text-[#0B2545]">{srv.title}</h4>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{srv.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Contact Us & Office Locations */}
      <section id="contact" className="py-16 lg:py-20 bg-[#F8FAFC] border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Direct Contact Panel */}
            <div className="lg:col-span-5 bg-[#0B2545] text-white rounded-xl p-7 sm:p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display">Contact Us</h2>
                <p className="mt-2 text-base text-orange-300 font-medium">
                  অর্ডার ও বিস্তারিত জানতে কল করুন:
                </p>
                <a
                  href={`tel:${COMPANY_INFO.phone}`}
                  className="inline-flex items-center gap-2.5 mt-1 text-3xl font-mono font-bold text-white hover:text-orange-300 transition-colors"
                >
                  <Phone className="w-6 h-6 text-[#EA580C]" aria-hidden="true" />
                  <span>{COMPANY_INFO.phone}</span>
                </a>
              </div>

              <div className="pt-4 border-t border-white/15 space-y-1.5 text-sm text-slate-200">
                <div>
                  <span className="text-slate-400">WhatsApp &amp; imo:</span>{' '}
                  <span className="font-mono font-semibold text-white">{COMPANY_INFO.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400">bKash:</span>{' '}
                  <span className="font-mono font-semibold text-white">{COMPANY_INFO.phone}</span>
                </div>
              </div>

              <div className="pt-2">
                <ContactButtons variant="hero" onContactForPrice={() => onInquire(null)} />
              </div>
            </div>

            {/* Office Locations Cards */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <h3 className="text-2xl font-bold text-[#0B2545]">Our Office Locations</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Visit our Dhaka or Bogura showroom to inspect machinery before purchasing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                  <div className="flex items-center gap-2.5 text-[#0B2545]">
                    <MapPin className="w-5 h-5 text-[#EA580C] shrink-0" aria-hidden="true" />
                    <h4 className="text-lg font-bold">Dhaka Office (ঢাকা অফিস)</h4>
                  </div>
                  <p className="text-sm text-slate-800 font-medium leading-relaxed">
                    {COMPANY_INFO.dhakaOfficeBn}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {COMPANY_INFO.dhakaOfficeEn}
                  </p>
                  <div className="pt-2 text-xs font-mono font-semibold text-[#0B2545]">
                    Phone: {COMPANY_INFO.phone}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                  <div className="flex items-center gap-2.5 text-[#0B2545]">
                    <MapPin className="w-5 h-5 text-[#EA580C] shrink-0" aria-hidden="true" />
                    <h4 className="text-lg font-bold">Bogura Office (বগুড়া অফিস)</h4>
                  </div>
                  <p className="text-sm text-slate-800 font-medium leading-relaxed">
                    {COMPANY_INFO.boguraOfficeBn}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {COMPANY_INFO.boguraOfficeEn}
                  </p>
                  <div className="pt-2 text-xs font-mono font-semibold text-[#0B2545]">
                    Phone: {COMPANY_INFO.phone}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

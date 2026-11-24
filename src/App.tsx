import { useState, useEffect, useCallback } from 'react';
import { Product, Category } from './types';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { ProductDetailsPage } from './components/ProductDetailsPage';
import { AdminDashboard } from './components/AdminDashboard';
import { InquiryModal } from './components/InquiryModal';
import { ChatWidget } from './components/ChatWidget';
import { Footer } from './components/Footer';
import { subscribeToProducts, subscribeToCategories } from './services/firestoreService';

function getEffectivePath(): string {
  const path = window.location.pathname || '/';
  const hash = window.location.hash.toLowerCase();
  if (hash === '#admin' || hash === '#/admin') return '/admin';
  return path;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => getEffectivePath());
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [firestoreCategories, setFirestoreCategories] = useState<Category[]>([]);
  const [seedProducts, setSeedProducts] = useState<Product[]>([]);
  const [seedCategories, setSeedCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryProduct, setInquiryProduct] = useState<Product | null>(null);

  // Load initial fallback catalog from backend in case Firestore collection is still empty
  useEffect(() => {
    Promise.all([fetch('/api/products'), fetch('/api/categories')])
      .then(async ([prodRes, catRes]) => {
        const prodData = (await prodRes.json()) as { products?: Product[] };
        const catData = (await catRes.json()) as { categories?: Category[] };
        setSeedProducts(prodData.products || []);
        setSeedCategories(catData.categories || []);
      })
      .catch((err) => console.error('Starter catalog fetch failed:', err));
  }, []);

  // Subscribe to real-time Firestore products & categories
  useEffect(() => {
    let prodsLoaded = false;
    let catsLoaded = false;
    const markReady = () => {
      if (prodsLoaded && catsLoaded) setLoading(false);
    };

    const unsubProducts = subscribeToProducts(
      (list) => {
        setFirestoreProducts(list);
        prodsLoaded = true;
        markReady();
      },
      () => {
        prodsLoaded = true;
        markReady();
      }
    );

    const unsubCategories = subscribeToCategories(
      (list) => {
        setFirestoreCategories(list);
        catsLoaded = true;
        markReady();
      },
      () => {
        catsLoaded = true;
        markReady();
      }
    );

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  useEffect(() => {
    const syncPath = () => {
      setCurrentPath(getEffectivePath());
    };
    window.addEventListener('popstate', syncPath);
    window.addEventListener('hashchange', syncPath);
    return () => {
      window.removeEventListener('popstate', syncPath);
      window.removeEventListener('hashchange', syncPath);
    };
  }, []);

  const navigate = useCallback((path: string, sectionId?: string) => {
    if (window.location.pathname !== path || window.location.hash) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleOpenInquiry = (product: Product | null) => {
    setInquiryProduct(product);
    setInquiryOpen(true);
  };

  const products = firestoreProducts.length > 0 ? firestoreProducts : seedProducts;
  const categories = firestoreCategories.length > 0 ? firestoreCategories : seedCategories;

  const productDetailMatch = currentPath.match(/^\/product\/([^/]+)$/i);
  const activeProductNumber = productDetailMatch ? decodeURIComponent(productDetailMatch[1]) : undefined;
  const isAdminRoute = /^\/admin(\/|$)/i.test(currentPath);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <Navbar onNavigate={navigate} />

      <div className="flex-1">
        {isAdminRoute ? (
          <AdminDashboard
            seedProducts={seedProducts}
            seedCategories={seedCategories}
            onBackToSite={() => navigate('/')}
          />
        ) : productDetailMatch ? (
          <ProductDetailsPage
            productNumber={activeProductNumber!}
            allProducts={products}
            onBack={() => navigate('/', 'catalog')}
            onViewDetails={(prodNum) => navigate(`/product/${encodeURIComponent(prodNum)}`)}
            onInquire={(p) => handleOpenInquiry(p)}
          />
        ) : (
          <HomePage
            products={products}
            categories={categories}
            loading={loading && products.length === 0}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            onViewDetails={(prodNum) => navigate(`/product/${encodeURIComponent(prodNum)}`)}
            onInquire={handleOpenInquiry}
          />
        )}
      </div>

      {!isAdminRoute && (
        <>
          <Footer
            onNavigate={navigate}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
          />
          <ChatWidget activeProductNumber={activeProductNumber} />
        </>
      )}

      <InquiryModal
        isOpen={inquiryOpen}
        product={inquiryProduct}
        allProducts={products}
        onClose={() => setInquiryOpen(false)}
      />
    </div>
  );
}

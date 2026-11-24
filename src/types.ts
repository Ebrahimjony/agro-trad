export type StockStatus = 'In Stock' | 'Pre-Order' | 'Out of Stock';

export type OriginCountry = 'China' | 'Turkey' | 'India' | 'Vietnam' | 'Bangladesh';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  productNumber: string;
  name: string;
  category: string;
  price: number | null; // null or 0 means "Contact for Price"
  priceDisplay?: string;
  images: string[];
  shortDescription: string;
  fullDescription: string;
  specifications: ProductSpec[];
  originCountry: OriginCountry;
  stockAvailability: StockStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  customerName: string;
  phoneNumber: string;
  productNumber: string;
  productName: string;
  quantity: number;
  address: string;
  message: string;
  sheetSyncStatus: 'synced' | 'pending' | 'failed';
  sheetSyncMessage: string;
  createdAt: string;
}

export interface SheetsConfig {
  webhookUrl: string;
  spreadsheetId: string;
  sheetName: string;
  hasEnvWebhook: boolean;
  hasEnvServiceAccount: boolean;
}

export interface AdminOverview {
  totalProducts: number;
  inStockProducts: number;
  totalCategories: number;
  totalInquiries: number;
  syncedInquiries: number;
  storageMode: 'mongodb' | 'local-file';
}

export const DEFAULT_CATEGORIES: Array<{ name: string; description: string }> = [
  { name: 'Milking Machines', description: 'Single and double bucket stainless steel vacuum milking systems for dairy farms.' },
  { name: 'Auto Drinkers', description: 'Suspended bell drinkers and stainless nipple water line systems for poultry sheds.' },
  { name: 'Silage Machines', description: 'High-output silage choppers, balers, and fodder preservation equipment.' },
  { name: 'Cream Separator Machines', description: 'Electric stainless steel centrifugal milk cream separators for dairy processing.' },
  { name: 'Grass Cutting Machines', description: 'Heavy-duty electric and diesel green grass and Napier fodder cutters.' },
  { name: 'Straw Cutting Machines', description: 'Conveyor-fed dry straw choppers and roughage shredders for cattle feed.' },
  { name: 'Rice Mills', description: 'Commercial combined rice milling, hulling, and polishing machines.' },
  { name: 'Poultry Farm Equipment', description: 'Automated feeders, brooders, egg incubators, and shed climate equipment.' },
  { name: 'Dairy Farm Equipment', description: 'Milk chillers, pasteurizers, cans, and cattle barn management machinery.' },
  { name: 'Agricultural Machinery', description: 'Multi-crop threshers, corn shellers, power tillers, and irrigation tools.' },
  { name: 'Other Machinery', description: 'Specialized farm motors, feed pelletizers, and custom imported equipment.' },
];

export const ORIGIN_COUNTRIES: OriginCountry[] = ['China', 'Turkey', 'India', 'Vietnam', 'Bangladesh'];

export const COMPANY_INFO = {
  name: 'AGRO TRAD',
  banglaName: 'এগ্রো ট্রেড',
  logoUrl: '/assets/aistudio/WhatsApp_Image_2026-11-23_at_5.48.41_PM_fede345d.jpeg',
  phone: '01841916563',
  internationalPhone: '8801841916563',
  dhakaOfficeEn: 'Opposite Dhaka Airport, Naddapara Boishakhi Mor, Dhaka, Bangladesh.',
  dhakaOfficeBn: 'ঢাকা এয়ারপোর্টের বিপরীতে, নদ্দাপাড়া বৈশাখী মোড়, ঢাকা।',
  boguraOfficeEn: 'Shahjahanpur, Beside Fotki Bridge, Madrasa Market (2nd Floor), Bogura, Bangladesh.',
  boguraOfficeBn: 'শাহজাহানপুর, ফটকি ব্রিজ-এর পাশে, মাদ্রাসা মার্কেট (২য় তলা), বগুড়া।',
};

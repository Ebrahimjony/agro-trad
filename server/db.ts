import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient, Db } from 'mongodb';
import {
  Product,
  Category,
  Inquiry,
  DEFAULT_CATEGORIES,
  OriginCountry,
  StockStatus,
} from '../src/types';

interface StoreData {
  products: Product[];
  categories: Category[];
  inquiries: Inquiry[];
  settings: {
    adminCredentialHash?: string;
    sheetsWebhookUrl?: string;
    sheetsSpreadsheetId?: string;
    sheetsTabName?: string;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildSeedCategories(): Category[] {
  const now = new Date().toISOString();
  return DEFAULT_CATEGORIES.map((c, idx) => ({
    id: `cat-${idx + 1}`,
    name: c.name,
    slug: slugify(c.name),
    description: c.description,
    createdAt: now,
  }));
}

function buildSeedProducts(): Product[] {
  const now = new Date().toISOString();
  const imgMilking = '/src/assets/images/product_milking_machine_1795506628949.jpg';
  const imgSilage = '/src/assets/images/product_silage_cutter_1795506627721.jpg';
  const imgCream = '/src/assets/images/product_cream_separator_1795506628655.jpg';
  const imgPoultry = '/src/assets/images/product_poultry_drinker_1795506628686.jpg';
  const imgRice = '/src/assets/images/product_rice_mill_1795506629347.jpg';
  const imgStraw = '/src/assets/images/product_straw_cutter_1795506629132.jpg';

  return [
    {
      id: 'prod-1001',
      productNumber: 'MACH-1001',
      name: 'Double Bucket Stainless Steel Milking Machine',
      category: 'Milking Machines',
      price: 68500,
      images: [imgMilking, imgCream],
      shortDescription: 'Oil-free or oil-lubricated double 25L SS304 bucket milking unit for 15–25 dairy cows per hour.',
      fullDescription:
        'Imported from Turkey, this heavy-duty double bucket milking machine features food-grade 304 stainless steel milk cans, precision vacuum regulator, and gentle pulsator action designed to protect udder health while accelerating daily milking operations on commercial Bangladesh dairy farms.',
      specifications: [
        { label: 'Capacity', value: '2 x 25 Liter SS304 Buckets (16–22 Cows/Hr)' },
        { label: 'Motor Power', value: '0.75 HP / 0.55 kW Copper Winding' },
        { label: 'Voltage', value: '220V Single Phase, 50Hz' },
        { label: 'Vacuum Pump', value: 'Dry / Oil Rotary Vane 200 L/min' },
        { label: 'Pulsation Rate', value: '60 Cycles/Min (60:40 Ratio)' },
        { label: 'Chassis', value: 'Heavy Powder-Coated Frame with Caster Wheels' },
      ],
      originCountry: 'Turkey',
      stockAvailability: 'In Stock',
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-1002',
      productNumber: 'MACH-1002',
      name: '9ZP Heavy-Duty Silage & Napier Chaff Cutter',
      category: 'Silage Machines',
      price: 54000,
      images: [imgSilage, imgStraw],
      shortDescription: 'High-speed 1,800 kg/hr silage and green fodder chopper with safety clutch and steel blades.',
      fullDescription:
        'Built for commercial cattle farms and silage entrepreneurs, this imported silage chaff cutter processes Napier grass, maize stalks, and green fodder cleanly into uniform 10–25mm silage cuts ready for airtight pit or bag fermentation.',
      specifications: [
        { label: 'Output Capacity', value: '1,500 – 2,200 kg/hour' },
        { label: 'Motor Requirement', value: '3.0 HP Electric Motor / 220V' },
        { label: 'Blade Count', value: '4 High-Carbon Heat-Treated Steel Blades' },
        { label: 'Cut Length', value: '10 mm – 28 mm Adjustable Gear' },
        { label: 'Feed Hopper', value: 'Anti-Jam Wide Steel Chute with Guard' },
        { label: 'Mobility', value: '4 Heavy-Duty Lockable Wheels' },
      ],
      originCountry: 'China',
      stockAvailability: 'In Stock',
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-1003',
      productNumber: 'MACH-1003',
      name: 'Electric Dairy Cream Separator (165 L/Hr)',
      category: 'Cream Separator Machines',
      price: 32500,
      images: [imgCream, imgMilking],
      shortDescription: 'Stainless steel bowl centrifugal cream separator for pure ghee, butter, and skim milk production.',
      fullDescription:
        'Precision-balanced stainless steel disc bowl separator engineered for dairy processors and sweetmeat producers. Cleanly separates raw milk into rich cream and skim milk with minimal fat loss and effortless disassembly for sanitation.',
      specifications: [
        { label: 'Processing Speed', value: '165 Liters/Hour' },
        { label: 'Milk Tank Volume', value: '12 Liter SS304 Top Bowl' },
        { label: 'Bowl Speed', value: '10,500 RPM' },
        { label: 'Cream-to-Milk Ratio', value: '1:4 to 1:10 Adjustable' },
        { label: 'Motor Power', value: '80W Low-Noise Copper Motor (220V)' },
        { label: 'Contact Material', value: '100% Food-Grade Stainless Steel' },
      ],
      originCountry: 'India',
      stockAvailability: 'In Stock',
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-1004',
      productNumber: 'MACH-1004',
      name: 'Automatic Poultry Bell & Nipple Drinker Line Kit',
      category: 'Auto Drinkers',
      price: 18500,
      images: [imgPoultry],
      shortDescription: 'Complete pressure-regulated poultry drinker assembly with leak-free 360-degree stainless nipples and bell units.',
      fullDescription:
        'Designed for broiler, layer, and Sonali poultry sheds across Bangladesh. Keeps litter dry while delivering clean, constant-pressure water from day-old chicks through maturity. Includes pressure regulator, stainless water pipe, and virgin-grade bell drinkers.',
      specifications: [
        { label: 'Coverage', value: 'Up to 1,000 Birds per Starter Line' },
        { label: 'Nipple Trigger', value: '360° SS304 Dual-Seal Pin' },
        { label: 'Regulator', value: 'Dual-Stage Pressure Gauge & Flush Valve' },
        { label: 'Pipe Length', value: '3 Meter Modular Galvanized Support' },
        { label: 'Polymer Grade', value: 'UV-Stabilized Virgin Polypropylene' },
      ],
      originCountry: 'China',
      stockAvailability: 'In Stock',
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-1005',
      productNumber: 'MACH-1005',
      name: '6N40-9FC20 Combined Commercial Rice Mill & Crusher',
      category: 'Rice Mills',
      price: 46500,
      images: [imgRice],
      shortDescription: 'Dual-function paddy huller, white rice polisher, and grain/spice pulverizer for rural agro mills.',
      fullDescription:
        'Imported from Vietnam and China, this compact combined rice mill turns raw paddy into clean polished rice in a single pass while separating bran cleanly. Equipped with a secondary hammer mill chamber for crushing maize, wheat, and animal feed.',
      specifications: [
        { label: 'Rice Milling Output', value: '220 – 300 kg/hour' },
        { label: 'Crusher Output', value: '250 kg/hour (Maize / Wheat / Feed)' },
        { label: 'Motor Power', value: '3.0 kW / 4 HP Single Phase' },
        { label: 'Screen Sieves', value: 'Hexagonal Stainless Polish Screen' },
        { label: 'Recovery Rate', value: '68% – 72% Clean Whole Grain' },
      ],
      originCountry: 'Vietnam',
      stockAvailability: 'In Stock',
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-1006',
      productNumber: 'MACH-1006',
      name: 'Conveyor-Fed Industrial Straw & Roughage Cutter',
      category: 'Straw Cutting Machines',
      price: 89000,
      images: [imgStraw, imgSilage],
      shortDescription: 'Automated belt-conveyor straw chopper built for large dairy farms and commercial TMR feed mixing.',
      fullDescription:
        'Heavy-duty conveyor-fed dry paddy straw and wet fodder chopper featuring a balanced cast flywheel, dual feed rollers, and overload protection switch. Ideal for farms managing 30+ cattle.',
      specifications: [
        { label: 'Dry Straw Output', value: '1,200 kg/hour' },
        { label: 'Wet Fodder Output', value: '3,000 kg/hour' },
        { label: 'Motor Drive', value: '5.5 HP (220V/380V Option)' },
        { label: 'Conveyor Length', value: '1.8 Meter Chain-Slat Feed Bed' },
        { label: 'Blades', value: '6 Reversible Alloy Steel Knives' },
      ],
      originCountry: 'India',
      stockAvailability: 'In Stock',
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-1007',
      productNumber: 'MACH-1007',
      name: 'Portable High-Speed Green Grass Cutting Machine',
      category: 'Grass Cutting Machines',
      price: 26500,
      images: [imgSilage],
      shortDescription: 'Compact 2.2 kW electric grass cutter ideal for small-to-medium cattle and goat farms.',
      fullDescription:
        'Lightweight yet rugged electric grass cutting machine built for daily feeding of Napier, Pakchong, and maize greens. Low vibration, easy blade sharpening access, and single-phase household plug compatibility.',
      specifications: [
        { label: 'Capacity', value: '600 – 900 kg/hour' },
        { label: 'Motor Power', value: '2.2 kW (3 HP Peak), 220V' },
        { label: 'Rotor Speed', value: '2,800 RPM' },
        { label: 'Weight', value: '48 kg with Transport Wheels' },
      ],
      originCountry: 'China',
      stockAvailability: 'In Stock',
      featured: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-1008',
      productNumber: 'MACH-1008',
      name: '500-Egg Automatic Rotary Incubator & Hatcher',
      category: 'Poultry Farm Equipment',
      price: 42000,
      images: [imgPoultry],
      shortDescription: 'Digital temperature and humidity controlled automatic egg turning incubator for chicken, duck, and quail.',
      fullDescription:
        'Automated poultry hatchery cabinet with dual-fan thermal circulation, automatic 2-hour egg rotation, digital PID controller, and high-visibility inspection window.',
      specifications: [
        { label: 'Egg Capacity', value: '528 Chicken Eggs / 380 Duck Eggs' },
        { label: 'Turning Cycle', value: 'Automatic Every 120 Minutes' },
        { label: 'Temperature Accuracy', value: '±0.1°C Digital PID Control' },
        { label: 'Power', value: '180W Avg, 220V AC / 12V Backup Ready' },
      ],
      originCountry: 'China',
      stockAvailability: 'In Stock',
      featured: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-1009',
      productNumber: 'MACH-1009',
      name: '300L Milk Cooling & Chiller Tank (SS304)',
      category: 'Dairy Farm Equipment',
      price: null,
      priceDisplay: 'Contact for Price',
      images: [imgMilking, imgCream],
      shortDescription: 'Direct-expansion stainless steel bulk milk cooling tank for dairy collection centers.',
      fullDescription:
        'Imported Turkish bulk milk cooling tank engineered to rapidly cool raw milk from 35°C down to 4°C, preserving bacterial quality for dairy processors and collection hubs.',
      specifications: [
        { label: 'Tank Volume', value: '300 Liters (2-Milking Design)' },
        { label: 'Cooling Time', value: '35°C to 4°C in Under 2.5 Hours' },
        { label: 'Compressor', value: 'Hermetic Maneurop / Embraco Unit' },
        { label: 'Agitator', value: '24 RPM Stainless Paddle Mixer' },
      ],
      originCountry: 'Turkey',
      stockAvailability: 'Pre-Order',
      featured: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod-1010',
      productNumber: 'MACH-1010',
      name: 'Multi-Crop Corn Sheller & Thresher Unit',
      category: 'Agricultural Machinery',
      price: 38000,
      images: [imgRice],
      shortDescription: 'High-throughput maize shelling and grain cleaning machine for field and warehouse use.',
      fullDescription:
        'Heavy-gauge steel maize sheller with integrated blower fan that separates clean kernels from cobs and husk in one step without damaging seeds.',
      specifications: [
        { label: 'Output', value: '1,200 – 1,500 kg/hour' },
        { label: 'Power Option', value: '3 HP Electric Motor or 6.5 HP Diesel' },
        { label: 'Breakage Rate', value: '< 1.2%' },
      ],
      originCountry: 'Vietnam',
      stockAvailability: 'In Stock',
      featured: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

class DatabaseService {
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private mode: 'mongodb' | 'local-file' = 'local-file';
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const mongoUri = process.env.MONGODB_URI?.trim();
    if (mongoUri) {
      try {
        this.mongoClient = new MongoClient(mongoUri, {
          serverSelectionTimeoutMS: 5000,
        });
        await this.mongoClient.connect();
        this.mongoDb = this.mongoClient.db('egg_rotate_machineries');
        this.mode = 'mongodb';
        await this.ensureMongoSeed();
        this.initialized = true;
        console.log('Connected to MongoDB database: egg_rotate_machineries');
        return;
      } catch (err) {
        console.warn('MongoDB connection failed, falling back to local persistent store:', (err as Error).message);
        this.mongoClient = null;
        this.mongoDb = null;
        this.mode = 'local-file';
      }
    }

    this.ensureLocalStore();
    this.initialized = true;
  }

  getMode(): 'mongodb' | 'local-file' {
    return this.mode;
  }

  private ensureLocalStore(): void {
    if (!fs.existsSync(STORE_FILE)) {
      const initial: StoreData = {
        products: buildSeedProducts(),
        categories: buildSeedCategories(),
        inquiries: [],
        settings: {},
      };
      this.writeLocalStore(initial);
    }
  }

  private readLocalStore(): StoreData {
    this.ensureLocalStore();
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(raw) as StoreData;
  }

  private writeLocalStore(data: StoreData): void {
    const tmpFile = `${STORE_FILE}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STORE_FILE);
  }

  private async ensureMongoSeed(): Promise<void> {
    if (!this.mongoDb) return;
    const catCount = await this.mongoDb.collection('categories').countDocuments();
    if (catCount === 0) {
      await this.mongoDb.collection('categories').insertMany(buildSeedCategories());
    }
    const prodCount = await this.mongoDb.collection('products').countDocuments();
    if (prodCount === 0) {
      await this.mongoDb.collection('products').insertMany(buildSeedProducts());
    }
  }

  async getProducts(filters?: { search?: string; category?: string; country?: string }): Promise<Product[]> {
    await this.init();
    let list: Product[];
    if (this.mongoDb) {
      list = await this.mongoDb.collection<Product>('products').find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    } else {
      list = [...this.readLocalStore().products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    if (filters?.category && filters.category !== 'All') {
      list = list.filter((p) => p.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters?.country && filters.country !== 'All') {
      list = list.filter((p) => p.originCountry.toLowerCase() === filters.country!.toLowerCase());
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.productNumber.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q)
      );
    }
    return list;
  }

  async getProductByIdOrNumber(idOrNumber: string): Promise<Product | null> {
    await this.init();
    const key = idOrNumber.trim();
    if (this.mongoDb) {
      return await this.mongoDb.collection<Product>('products').findOne(
        { $or: [{ id: key }, { productNumber: key.toUpperCase() }] },
        { projection: { _id: 0 } }
      );
    }
    const store = this.readLocalStore();
    return (
      store.products.find(
        (p) => p.id === key || p.productNumber.toUpperCase() === key.toUpperCase()
      ) || null
    );
  }

  async generateNextProductNumber(): Promise<string> {
    const products = await this.getProducts();
    let maxNum = 1000;
    for (const p of products) {
      const match = p.productNumber.match(/MACH-(\d+)/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!Number.isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
    return `MACH-${maxNum + 1}`;
  }

  async createProduct(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    await this.init();
    const existing = await this.getProducts();
    const desiredNumber = (input.productNumber || (await this.generateNextProductNumber())).trim().toUpperCase();
    if (existing.some((p) => p.productNumber.toUpperCase() === desiredNumber)) {
      throw new Error(`Product number ${desiredNumber} already exists. Please use a unique product number.`);
    }

    const now = new Date().toISOString();
    const product: Product = {
      ...input,
      id: `prod-${crypto.randomUUID().slice(0, 8)}`,
      productNumber: desiredNumber,
      createdAt: now,
      updatedAt: now,
    };

    if (this.mongoDb) {
      await this.mongoDb.collection('products').insertOne({ ...product });
    } else {
      const store = this.readLocalStore();
      store.products.unshift(product);
      this.writeLocalStore(store);
    }
    return product;
  }

  async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product | null> {
    await this.init();
    const all = await this.getProducts();
    const target = all.find((p) => p.id === id);
    if (!target) return null;

    if (updates.productNumber) {
      const normNum = updates.productNumber.trim().toUpperCase();
      if (all.some((p) => p.id !== id && p.productNumber.toUpperCase() === normNum)) {
        throw new Error(`Product number ${normNum} is already assigned to another machine.`);
      }
      updates.productNumber = normNum;
    }

    const updated: Product = {
      ...target,
      ...updates,
      id: target.id,
      createdAt: target.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (this.mongoDb) {
      await this.mongoDb.collection('products').updateOne({ id }, { $set: updated });
    } else {
      const store = this.readLocalStore();
      const idx = store.products.findIndex((p) => p.id === id);
      if (idx !== -1) {
        store.products[idx] = updated;
        this.writeLocalStore(store);
      }
    }
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    await this.init();
    if (this.mongoDb) {
      const res = await this.mongoDb.collection('products').deleteOne({ id });
      return res.deletedCount > 0;
    }
    const store = this.readLocalStore();
    const prevLen = store.products.length;
    store.products = store.products.filter((p) => p.id !== id);
    if (store.products.length === prevLen) return false;
    this.writeLocalStore(store);
    return true;
  }

  async getCategories(): Promise<Category[]> {
    await this.init();
    if (this.mongoDb) {
      return await this.mongoDb.collection<Category>('categories').find({}, { projection: { _id: 0 } }).toArray();
    }
    return this.readLocalStore().categories;
  }

  async createCategory(name: string, description: string): Promise<Category> {
    await this.init();
    const trimmed = name.trim();
    const existing = await this.getCategories();
    if (existing.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Category "${trimmed}" already exists.`);
    }
    const cat: Category = {
      id: `cat-${crypto.randomUUID().slice(0, 8)}`,
      name: trimmed,
      slug: slugify(trimmed),
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    if (this.mongoDb) {
      await this.mongoDb.collection('categories').insertOne({ ...cat });
    } else {
      const store = this.readLocalStore();
      store.categories.push(cat);
      this.writeLocalStore(store);
    }
    return cat;
  }

  async updateCategory(id: string, name: string, description: string): Promise<Category | null> {
    await this.init();
    const categories = await this.getCategories();
    const current = categories.find((c) => c.id === id);
    if (!current) return null;

    const trimmedName = name.trim();
    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error(`Category "${trimmedName}" already exists.`);
    }

    const updated: Category = {
      ...current,
      name: trimmedName,
      slug: slugify(trimmedName),
      description: description.trim(),
    };

    if (this.mongoDb) {
      await this.mongoDb.collection('categories').updateOne({ id }, { $set: updated });
      if (current.name !== trimmedName) {
        await this.mongoDb.collection('products').updateMany({ category: current.name }, { $set: { category: trimmedName } });
      }
    } else {
      const store = this.readLocalStore();
      const idx = store.categories.findIndex((c) => c.id === id);
      if (idx !== -1) store.categories[idx] = updated;
      if (current.name !== trimmedName) {
        store.products = store.products.map((p) =>
          p.category === current.name ? { ...p, category: trimmedName } : p
        );
      }
      this.writeLocalStore(store);
    }
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    await this.init();
    const categories = await this.getCategories();
    const target = categories.find((c) => c.id === id);
    if (!target) return false;

    const products = await this.getProducts();
    if (products.some((p) => p.category === target.name)) {
      throw new Error(`Cannot delete "${target.name}" while products are assigned to it. Reassign those products first.`);
    }

    if (this.mongoDb) {
      const res = await this.mongoDb.collection('categories').deleteOne({ id });
      return res.deletedCount > 0;
    }
    const store = this.readLocalStore();
    store.categories = store.categories.filter((c) => c.id !== id);
    this.writeLocalStore(store);
    return true;
  }

  async getInquiries(): Promise<Inquiry[]> {
    await this.init();
    if (this.mongoDb) {
      return await this.mongoDb.collection<Inquiry>('inquiries').find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    }
    return [...this.readLocalStore().inquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createInquiry(inquiry: Inquiry): Promise<Inquiry> {
    await this.init();
    if (this.mongoDb) {
      await this.mongoDb.collection('inquiries').insertOne({ ...inquiry });
    } else {
      const store = this.readLocalStore();
      store.inquiries.unshift(inquiry);
      this.writeLocalStore(store);
    }
    return inquiry;
  }

  async updateInquirySync(id: string, status: 'synced' | 'pending' | 'failed', message: string): Promise<Inquiry | null> {
    await this.init();
    if (this.mongoDb) {
      await this.mongoDb.collection('inquiries').updateOne(
        { id },
        { $set: { sheetSyncStatus: status, sheetSyncMessage: message } }
      );
      return await this.mongoDb.collection<Inquiry>('inquiries').findOne({ id }, { projection: { _id: 0 } });
    }
    const store = this.readLocalStore();
    const idx = store.inquiries.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    store.inquiries[idx] = { ...store.inquiries[idx], sheetSyncStatus: status, sheetSyncMessage: message };
    this.writeLocalStore(store);
    return store.inquiries[idx];
  }

  async getSettings(): Promise<StoreData['settings']> {
    await this.init();
    if (this.mongoDb) {
      const doc = await this.mongoDb.collection('settings').findOne({ key: 'global' }, { projection: { _id: 0 } });
      return (doc as unknown as StoreData['settings']) || {};
    }
    return this.readLocalStore().settings || {};
  }

  async updateSettings(patch: Partial<StoreData['settings']>): Promise<StoreData['settings']> {
    await this.init();
    if (this.mongoDb) {
      const current = await this.getSettings();
      const next = { ...current, ...patch, key: 'global' };
      await this.mongoDb.collection('settings').updateOne({ key: 'global' }, { $set: next }, { upsert: true });
      return next;
    }
    const store = this.readLocalStore();
    store.settings = { ...(store.settings || {}), ...patch };
    this.writeLocalStore(store);
    return store.settings;
  }
}

export const db = new DatabaseService();
export type { OriginCountry, StockStatus };

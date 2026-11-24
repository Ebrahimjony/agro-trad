import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db, UPLOADS_DIR } from './server/db';
import {
  getAuthStatus,
  hashPassword,
  requireAdmin,
  signAdminToken,
  verifyPasswordHash,
  verifyPlaintextConstantTime,
} from './server/auth';
import {
  getEffectiveSheetsConfig,
  pushInquiryToGoogleSheets,
  validateAppsScriptUrl,
} from './server/sheets';
import { Inquiry, OriginCountry, ProductSpec, StockStatus } from './src/types';

const ALLOWED_ORIGINS: OriginCountry[] = ['China', 'Turkey', 'India', 'Vietnam', 'Bangladesh'];
const ALLOWED_STOCK: StockStatus[] = ['In Stock', 'Pre-Order', 'Out of Stock'];

function sanitizeImageList(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      if (s.startsWith('/src/assets/images/') || s.startsWith('/uploads/')) return true;
      try {
        const parsed = new URL(s);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    });
}

function sanitizeSpecs(specs: unknown): ProductSpec[] {
  if (!Array.isArray(specs)) return [];
  return specs
    .filter((s): s is { label?: unknown; value?: unknown } => typeof s === 'object' && s !== null)
    .map((s) => ({
      label: typeof s.label === 'string' ? s.label.trim().slice(0, 120) : '',
      value: typeof s.value === 'string' ? s.value.trim().slice(0, 300) : '',
    }))
    .filter((s) => s.label.length > 0 && s.value.length > 0);
}

async function startServer() {
  await db.init();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, storage: db.getMode() });
  });

  // Public Catalog Routes
  app.get('/api/products', async (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const country = typeof req.query.country === 'string' ? req.query.country : undefined;
      const products = await db.getProducts({ search, category, country });
      res.json({ products });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/products/:idOrNumber', async (req, res) => {
    try {
      const product = await db.getProductByIdOrNumber(req.params.idOrNumber);
      if (!product) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      const allInCategory = await db.getProducts({ category: product.category });
      const related = allInCategory.filter((p) => p.id !== product.id).slice(0, 3);
      res.json({ product, related });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/categories', async (_req, res) => {
    try {
      const categories = await db.getCategories();
      res.json({ categories });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Public Customer Inquiry Route (No Customer Login Required)
  app.post('/api/inquiries', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
      const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
      const productNumber = typeof body.productNumber === 'string' ? body.productNumber.trim().toUpperCase() : '';
      const productName = typeof body.productName === 'string' ? body.productName.trim() : '';
      const address = typeof body.address === 'string' ? body.address.trim() : '';
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      const rawQty = Number(body.quantity);
      const quantity = Number.isFinite(rawQty) && rawQty >= 1 ? Math.floor(rawQty) : 1;

      if (customerName.length < 2) {
        res.status(400).json({ error: 'Please enter your full name.' });
        return;
      }
      if (!/^[+\d\s()-]{6,20}$/.test(phoneNumber)) {
        res.status(400).json({ error: 'Please enter a valid phone number.' });
        return;
      }
      if (!productNumber || !productName) {
        res.status(400).json({ error: 'Product number and product name are required.' });
        return;
      }

      const inquiry: Inquiry = {
        id: `INQ-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        customerName: customerName.slice(0, 120),
        phoneNumber: phoneNumber.slice(0, 30),
        productNumber: productNumber.slice(0, 40),
        productName: productName.slice(0, 200),
        quantity,
        address: address.slice(0, 300),
        message: message.slice(0, 1000),
        sheetSyncStatus: 'pending',
        sheetSyncMessage: 'Queued for Google Sheets sync.',
        createdAt: new Date().toISOString(),
      };

      await db.createInquiry(inquiry);
      const syncResult = await pushInquiryToGoogleSheets(inquiry);
      const finalInquiry =
        (await db.updateInquirySync(inquiry.id, syncResult.status, syncResult.message)) || inquiry;

      res.status(201).json({
        inquiry: finalInquiry,
        message: 'Your inquiry has been submitted successfully. Our team will contact you shortly.',
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Forward a Firestore-saved customer inquiry to Google Sheets (when configured)
  app.post('/api/inquiries/forward-sheet', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const id = typeof body.id === 'string' ? body.id.trim().slice(0, 60) : '';
      const customerName = typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 120) : '';
      const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim().slice(0, 30) : '';
      const productNumber = typeof body.productNumber === 'string' ? body.productNumber.trim().slice(0, 40) : '';
      const productName = typeof body.productName === 'string' ? body.productName.trim().slice(0, 200) : '';
      const quantity = Math.max(1, Math.floor(Number(body.quantity) || 1));
      const address = typeof body.address === 'string' ? body.address.trim().slice(0, 300) : '';
      const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
      const createdAt = typeof body.createdAt === 'string' ? body.createdAt : new Date().toISOString();

      if (!id || !customerName || !phoneNumber || !productNumber) {
        res.status(400).json({ error: 'Missing required inquiry fields.' });
        return;
      }

      const inquiry: Inquiry = {
        id,
        customerName,
        phoneNumber,
        productNumber,
        productName,
        quantity,
        address,
        message,
        sheetSyncStatus: 'pending',
        sheetSyncMessage: '',
        createdAt,
      };
      const syncResult = await pushInquiryToGoogleSheets(inquiry);
      res.json(syncResult);
    } catch (err) {
      res.status(500).json({ status: 'failed', message: (err as Error).message });
    }
  });

  // Admin Authentication Routes
  app.get('/api/admin/auth-status', async (_req, res) => {
    try {
      const status = await getAuthStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/setup', async (req, res) => {
    try {
      const status = await getAuthStatus();
      if (!status.setupRequired) {
        res.status(403).json({ error: 'Admin password is already configured.' });
        return;
      }
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }
      const hashed = hashPassword(password);
      await db.updateSettings({ adminCredentialHash: hashed });
      const token = signAdminToken();
      res.json({ token });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/login', async (req, res) => {
    try {
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!password) {
        res.status(400).json({ error: 'Password is required.' });
        return;
      }

      const envPass = process.env.ADMIN_PASSWORD?.trim();
      if (envPass) {
        if (!verifyPlaintextConstantTime(password, envPass)) {
          res.status(401).json({ error: 'Invalid admin password.' });
          return;
        }
        res.json({ token: signAdminToken() });
        return;
      }

      const settings = await db.getSettings();
      if (!settings.adminCredentialHash) {
        res.status(400).json({ error: 'First-run admin setup is required.' });
        return;
      }

      if (!verifyPasswordHash(password, settings.adminCredentialHash)) {
        res.status(401).json({ error: 'Invalid admin password.' });
        return;
      }

      res.json({ token: signAdminToken() });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Protected Admin Routes
  app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
    try {
      const [products, categories, inquiries] = await Promise.all([
        db.getProducts(),
        db.getCategories(),
        db.getInquiries(),
      ]);
      res.json({
        totalProducts: products.length,
        inStockProducts: products.filter((p) => p.stockAvailability === 'In Stock').length,
        totalCategories: categories.length,
        totalInquiries: inquiries.length,
        syncedInquiries: inquiries.filter((i) => i.sheetSyncStatus === 'synced').length,
        storageMode: db.getMode(),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/admin/next-product-number', requireAdmin, async (_req, res) => {
    try {
      const nextNumber = await db.generateNextProductNumber();
      res.json({ productNumber: nextNumber });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/upload', requireAdmin, async (req, res) => {
    try {
      const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
      const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) {
        res.status(400).json({ error: 'Invalid image format. Only PNG, JPG, and WebP are allowed.' });
        return;
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        res.status(400).json({ error: 'Image size must be 5 MB or less.' });
        return;
      }

      const filename = `mach-${crypto.randomUUID()}.${ext}`;
      const targetPath = path.resolve(UPLOADS_DIR, filename);
      if (!targetPath.startsWith(path.resolve(UPLOADS_DIR) + path.sep)) {
        res.status(400).json({ error: 'Invalid upload path.' });
        return;
      }
      fs.writeFileSync(targetPath, buffer);
      res.status(201).json({ url: `/uploads/${filename}` });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const category = typeof body.category === 'string' ? body.category.trim() : '';
      const shortDescription = typeof body.shortDescription === 'string' ? body.shortDescription.trim() : '';
      const fullDescription = typeof body.fullDescription === 'string' ? body.fullDescription.trim() : '';
      const productNumber = typeof body.productNumber === 'string' ? body.productNumber.trim().toUpperCase() : '';
      const originCountry = ALLOWED_ORIGINS.includes(body.originCountry as OriginCountry)
        ? (body.originCountry as OriginCountry)
        : 'China';
      const stockAvailability = ALLOWED_STOCK.includes(body.stockAvailability as StockStatus)
        ? (body.stockAvailability as StockStatus)
        : 'In Stock';

      if (!name || !category || !shortDescription) {
        res.status(400).json({ error: 'Product name, category, and short description are required.' });
        return;
      }

      const rawPrice = body.price === null || body.price === '' || body.price === undefined ? null : Number(body.price);
      const price = rawPrice !== null && Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : null;

      const product = await db.createProduct({
        productNumber,
        name,
        category,
        price,
        priceDisplay: typeof body.priceDisplay === 'string' ? body.priceDisplay.trim() : undefined,
        images: sanitizeImageList(body.images),
        shortDescription,
        fullDescription: fullDescription || shortDescription,
        specifications: sanitizeSpecs(body.specifications),
        originCountry,
        stockAvailability,
        featured: Boolean(body.featured),
      });

      res.status(201).json({ product });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const patch: Record<string, unknown> = {};

      if (typeof body.name === 'string') patch.name = body.name.trim();
      if (typeof body.productNumber === 'string') patch.productNumber = body.productNumber.trim().toUpperCase();
      if (typeof body.category === 'string') patch.category = body.category.trim();
      if (typeof body.shortDescription === 'string') patch.shortDescription = body.shortDescription.trim();
      if (typeof body.fullDescription === 'string') patch.fullDescription = body.fullDescription.trim();
      if (typeof body.priceDisplay === 'string') patch.priceDisplay = body.priceDisplay.trim();
      if (body.price !== undefined) {
        const rawPrice = body.price === null || body.price === '' ? null : Number(body.price);
        patch.price = rawPrice !== null && Number.isFinite(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : null;
      }
      if (body.images !== undefined) patch.images = sanitizeImageList(body.images);
      if (body.specifications !== undefined) patch.specifications = sanitizeSpecs(body.specifications);
      if (ALLOWED_ORIGINS.includes(body.originCountry as OriginCountry)) patch.originCountry = body.originCountry;
      if (ALLOWED_STOCK.includes(body.stockAvailability as StockStatus)) patch.stockAvailability = body.stockAvailability;
      if (body.featured !== undefined) patch.featured = Boolean(body.featured);

      const updated = await db.updateProduct(req.params.id, patch);
      if (!updated) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({ product: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const ok = await db.deleteProduct(req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Admin Categories Routes
  app.get('/api/admin/categories', requireAdmin, async (_req, res) => {
    try {
      const [categories, products] = await Promise.all([db.getCategories(), db.getProducts()]);
      const enriched = categories.map((cat) => ({
        ...cat,
        productCount: products.filter((p) => p.category === cat.name).length,
      }));
      res.json({ categories: enriched });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
      if (!name) {
        res.status(400).json({ error: 'Category name is required.' });
        return;
      }
      const category = await db.createCategory(name, description);
      res.status(201).json({ category });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
      if (!name) {
        res.status(400).json({ error: 'Category name is required.' });
        return;
      }
      const category = await db.updateCategory(req.params.id, name, description);
      if (!category) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }
      res.json({ category });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    try {
      const ok = await db.deleteCategory(req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Admin Inquiries & Google Sheets Routes
  app.get('/api/admin/inquiries', requireAdmin, async (_req, res) => {
    try {
      const inquiries = await db.getInquiries();
      res.json({ inquiries });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/inquiries/:id/retry-sheet', requireAdmin, async (req, res) => {
    try {
      const inquiries = await db.getInquiries();
      const target = inquiries.find((i) => i.id === req.params.id);
      if (!target) {
        res.status(404).json({ error: 'Inquiry not found.' });
        return;
      }
      const syncResult = await pushInquiryToGoogleSheets(target);
      const updated = await db.updateInquirySync(target.id, syncResult.status, syncResult.message);
      res.json({ inquiry: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/admin/inquiries/export', requireAdmin, async (_req, res) => {
    try {
      const inquiries = await db.getInquiries();
      const header = ['Timestamp', 'Inquiry ID', 'Product Number', 'Product Name', 'Customer Name', 'Phone Number', 'Quantity', 'Address', 'Message', 'Google Sheets Status'];
      const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      const rows = inquiries.map((i) =>
        [
          i.createdAt,
          i.id,
          i.productNumber,
          i.productName,
          i.customerName,
          i.phoneNumber,
          i.quantity,
          i.address,
          i.message,
          i.sheetSyncStatus,
        ]
          .map(escapeCsv)
          .join(',')
      );
      const csv = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="agro-trad-inquiries.csv"');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/admin/sheets-config', requireAdmin, async (_req, res) => {
    try {
      const config = await getEffectiveSheetsConfig();
      res.json({ config });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put('/api/admin/sheets-config', requireAdmin, async (req, res) => {
    try {
      const webhookUrlRaw = typeof req.body?.webhookUrl === 'string' ? req.body.webhookUrl : '';
      const spreadsheetId = typeof req.body?.spreadsheetId === 'string' ? req.body.spreadsheetId.trim() : '';
      const sheetName = typeof req.body?.sheetName === 'string' ? req.body.sheetName.trim() : 'Inquiries';

      const validatedWebhook = validateAppsScriptUrl(webhookUrlRaw);
      await db.updateSettings({
        sheetsWebhookUrl: validatedWebhook,
        sheetsSpreadsheetId: spreadsheetId,
        sheetsTabName: sheetName || 'Inquiries',
      });
      const config = await getEffectiveSheetsConfig();
      res.json({ config });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/sheets-test', requireAdmin, async (_req, res) => {
    try {
      const sampleInquiry: Inquiry = {
        id: 'TEST-CONNECTION',
        customerName: 'Admin Connection Check',
        phoneNumber: '01841916563',
        productNumber: 'MACH-1001',
        productName: 'Google Sheets Sync Verification',
        quantity: 1,
        address: 'Dhaka Office',
        message: 'Automated test entry from AGRO TRAD Admin Dashboard.',
        sheetSyncStatus: 'pending',
        sheetSyncMessage: '',
        createdAt: new Date().toISOString(),
      };
      const result = await pushInquiryToGoogleSheets(sampleInquiry);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite Dev Middleware or Production Static Assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AGRO TRAD server listening on http://localhost:${PORT}`);
  });
}

startServer();

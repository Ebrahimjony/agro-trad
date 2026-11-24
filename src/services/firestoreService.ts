import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Product,
  Category,
  Inquiry,
  ProductSpec,
  OriginCountry,
  StockStatus,
} from '../types';

export interface ChatThread {
  id: string;
  visitorName: string;
  productNumber: string;
  lastMessage: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderRole: 'customer' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function safeId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand}`.slice(0, 120);
}

function mapDocToProduct(data: Record<string, unknown>, id: string): Product {
  return {
    id: typeof data.id === 'string' ? data.id : id,
    productNumber: String(data.productNumber || ''),
    name: String(data.name || ''),
    category: String(data.category || ''),
    price: typeof data.price === 'number' ? data.price : null,
    priceDisplay: typeof data.priceDisplay === 'string' ? data.priceDisplay : undefined,
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    shortDescription: String(data.shortDescription || ''),
    fullDescription: String(data.fullDescription || ''),
    specifications: Array.isArray(data.specifications) ? (data.specifications as ProductSpec[]) : [],
    originCountry: (data.originCountry as OriginCountry) || 'China',
    stockAvailability: (data.stockAvailability as StockStatus) || 'In Stock',
    featured: Boolean(data.featured),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function mapDocToCategory(data: Record<string, unknown>, id: string): Category {
  return {
    id: typeof data.id === 'string' ? data.id : id,
    name: String(data.name || ''),
    slug: String(data.slug || ''),
    description: String(data.description || ''),
    createdAt: toIsoString(data.createdAt),
  };
}

function mapDocToInquiry(data: Record<string, unknown>, id: string): Inquiry {
  return {
    id: typeof data.id === 'string' ? data.id : id,
    customerName: String(data.customerName || ''),
    phoneNumber: String(data.phoneNumber || ''),
    productNumber: String(data.productNumber || ''),
    productName: String(data.productName || ''),
    quantity: Number(data.quantity || 1),
    address: String(data.address || ''),
    message: String(data.message || ''),
    sheetSyncStatus: (data.sheetSyncStatus as Inquiry['sheetSyncStatus']) || 'pending',
    sheetSyncMessage: String(data.sheetSyncMessage || ''),
    createdAt: toIsoString(data.createdAt),
  };
}

// Products Real-time Subscription
export function subscribeToProducts(
  onData: (products: Product[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => mapDocToProduct(d.data(), d.id));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  );
}

// Categories Real-time Subscription
export function subscribeToCategories(
  onData: (categories: Category[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, 'categories'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => mapDocToCategory(d.data(), d.id));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'categories');
    }
  );
}

// Generate Next Unique Product Number
export async function getNextProductNumberFromFirestore(): Promise<string> {
  try {
    const snap = await getDocs(collection(db, 'products'));
    let maxNum = 1000;
    snap.forEach((docSnap) => {
      const num = String(docSnap.data().productNumber || '');
      const match = num.match(/MACH-(\d+)/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!Number.isNaN(parsed) && parsed > maxNum) maxNum = parsed;
      }
    });
    return `MACH-${maxNum + 1}`;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'products');
  }
}

// Create Product in Firestore (Admin)
export async function createProductInFirestore(input: {
  productNumber: string;
  name: string;
  category: string;
  price: number | null;
  priceDisplay?: string;
  images: string[];
  shortDescription: string;
  fullDescription: string;
  specifications: ProductSpec[];
  originCountry: OriginCountry;
  stockAvailability: StockStatus;
  featured: boolean;
}): Promise<Product> {
  const id = safeId('prod');
  const productNumber = input.productNumber.trim().toUpperCase().slice(0, 40);
  const path = `products/${id}`;

  try {
    const existingSnap = await getDocs(collection(db, 'products'));
    const duplicate = existingSnap.docs.some(
      (d) => String(d.data().productNumber || '').toUpperCase() === productNumber
    );
    if (duplicate) {
      throw new Error(`Product number ${productNumber} already exists.`);
    }

    const sanitizedImages = input.images
      .map((s) => s.trim().slice(0, 1000))
      .filter(Boolean)
      .slice(0, 10);

    const sanitizedSpecs = input.specifications
      .map((s) => ({
        label: s.label.trim().slice(0, 120),
        value: s.value.trim().slice(0, 300),
      }))
      .filter((s) => s.label && s.value)
      .slice(0, 30);

    const payload: Record<string, unknown> = {
      id,
      productNumber,
      name: input.name.trim().slice(0, 200),
      category: input.category.trim().slice(0, 100),
      price: input.price !== null && input.price > 0 ? Math.round(input.price) : null,
      images: sanitizedImages,
      shortDescription: input.shortDescription.trim().slice(0, 500),
      fullDescription: (input.fullDescription || input.shortDescription).trim().slice(0, 5000),
      specifications: sanitizedSpecs,
      originCountry: input.originCountry,
      stockAvailability: input.stockAvailability,
      featured: Boolean(input.featured),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.priceDisplay) {
      payload.priceDisplay = input.priceDisplay.trim().slice(0, 80);
    }

    await setDoc(doc(db, 'products', id), payload);
    return mapDocToProduct(
      {
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      id
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) throw error;
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Update Product in Firestore (Admin)
export async function updateProductInFirestore(
  id: string,
  input: {
    productNumber: string;
    name: string;
    category: string;
    price: number | null;
    priceDisplay?: string;
    images: string[];
    shortDescription: string;
    fullDescription: string;
    specifications: ProductSpec[];
    originCountry: OriginCountry;
    stockAvailability: StockStatus;
    featured: boolean;
  }
): Promise<void> {
  const path = `products/${id}`;
  const productNumber = input.productNumber.trim().toUpperCase().slice(0, 40);

  try {
    const existingSnap = await getDocs(collection(db, 'products'));
    const duplicate = existingSnap.docs.some(
      (d) => d.id !== id && String(d.data().productNumber || '').toUpperCase() === productNumber
    );
    if (duplicate) {
      throw new Error(`Product number ${productNumber} is already assigned to another machine.`);
    }

    const sanitizedImages = input.images
      .map((s) => s.trim().slice(0, 1000))
      .filter(Boolean)
      .slice(0, 10);

    const sanitizedSpecs = input.specifications
      .map((s) => ({
        label: s.label.trim().slice(0, 120),
        value: s.value.trim().slice(0, 300),
      }))
      .filter((s) => s.label && s.value)
      .slice(0, 30);

    const updates: Record<string, unknown> = {
      productNumber,
      name: input.name.trim().slice(0, 200),
      category: input.category.trim().slice(0, 100),
      price: input.price !== null && input.price > 0 ? Math.round(input.price) : null,
      images: sanitizedImages,
      shortDescription: input.shortDescription.trim().slice(0, 500),
      fullDescription: (input.fullDescription || input.shortDescription).trim().slice(0, 5000),
      specifications: sanitizedSpecs,
      originCountry: input.originCountry,
      stockAvailability: input.stockAvailability,
      featured: Boolean(input.featured),
      updatedAt: serverTimestamp(),
    };
    if (input.priceDisplay !== undefined) {
      updates.priceDisplay = input.priceDisplay.trim().slice(0, 80);
    }

    await updateDoc(doc(db, 'products', id), updates);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already assigned')) throw error;
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete Product in Firestore (Admin)
export async function deleteProductInFirestore(id: string): Promise<void> {
  const path = `products/${id}`;
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Category CRUD in Firestore (Admin)
export async function createCategoryInFirestore(name: string, description: string): Promise<void> {
  const trimmed = name.trim().slice(0, 100);
  const id = safeId('cat');
  const path = `categories/${id}`;
  try {
    const existingSnap = await getDocs(collection(db, 'categories'));
    if (existingSnap.docs.some((d) => String(d.data().name || '').toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Category "${trimmed}" already exists.`);
    }
    await setDoc(doc(db, 'categories', id), {
      id,
      name: trimmed,
      slug: slugify(trimmed) || id,
      description: description.trim().slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) throw error;
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCategoryInFirestore(
  id: string,
  oldName: string,
  name: string,
  description: string
): Promise<void> {
  const trimmed = name.trim().slice(0, 100);
  const path = `categories/${id}`;
  try {
    await updateDoc(doc(db, 'categories', id), {
      name: trimmed,
      slug: slugify(trimmed) || id,
      description: description.trim().slice(0, 500),
    });

    if (oldName !== trimmed) {
      const prodSnap = await getDocs(collection(db, 'products'));
      const batch = writeBatch(db);
      let hasUpdates = false;
      prodSnap.forEach((pDoc) => {
        if (pDoc.data().category === oldName) {
          batch.update(pDoc.ref, { category: trimmed, updatedAt: serverTimestamp() });
          hasUpdates = true;
        }
      });
      if (hasUpdates) await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategoryInFirestore(id: string, categoryName: string): Promise<void> {
  const path = `categories/${id}`;
  try {
    const prodSnap = await getDocs(collection(db, 'products'));
    if (prodSnap.docs.some((d) => d.data().category === categoryName)) {
      throw new Error(`Cannot delete "${categoryName}" while products are assigned to it.`);
    }
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot delete')) throw error;
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Seed Initial Catalog & Categories to Firestore (Admin)
export async function seedInitialDataToFirestore(
  starterProducts: Product[],
  starterCategories: Category[]
): Promise<{ addedProducts: number; addedCategories: number }> {
  try {
    const [existingCats, existingProds] = await Promise.all([
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'products')),
    ]);

    const batch = writeBatch(db);
    let addedCategories = 0;
    let addedProducts = 0;

    if (existingCats.empty) {
      starterCategories.forEach((cat) => {
        const ref = doc(db, 'categories', cat.id);
        batch.set(ref, {
          id: cat.id,
          name: cat.name.slice(0, 100),
          slug: (cat.slug || slugify(cat.name)).slice(0, 120),
          description: cat.description.slice(0, 500),
          createdAt: serverTimestamp(),
        });
        addedCategories++;
      });
    }

    if (existingProds.empty) {
      starterProducts.forEach((p) => {
        const ref = doc(db, 'products', p.id);
        const payload: Record<string, unknown> = {
          id: p.id,
          productNumber: p.productNumber.slice(0, 40),
          name: p.name.slice(0, 200),
          category: p.category.slice(0, 100),
          price: p.price !== null && p.price > 0 ? Math.round(p.price) : null,
          images: p.images.slice(0, 10),
          shortDescription: p.shortDescription.slice(0, 500),
          fullDescription: p.fullDescription.slice(0, 5000),
          specifications: p.specifications.slice(0, 30),
          originCountry: p.originCountry,
          stockAvailability: p.stockAvailability,
          featured: Boolean(p.featured),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (p.priceDisplay) payload.priceDisplay = p.priceDisplay.slice(0, 80);
        batch.set(ref, payload);
        addedProducts++;
      });
    }

    if (addedCategories > 0 || addedProducts > 0) {
      await batch.commit();
    }

    return { addedProducts, addedCategories };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'products/categories');
  }
}

// Customer Inquiry Submission to Firestore (No Customer Login Required)
export async function submitInquiryToFirestore(input: {
  customerName: string;
  phoneNumber: string;
  productNumber: string;
  productName: string;
  quantity: number;
  address: string;
  message: string;
}): Promise<Inquiry> {
  const id = `INQ-${safeId('AT').slice(3, 11).toUpperCase()}`;
  const path = `inquiries/${id}`;

  const payload = {
    id,
    customerName: input.customerName.trim().slice(0, 120),
    phoneNumber: input.phoneNumber.trim().slice(0, 30),
    productNumber: input.productNumber.trim().toUpperCase().slice(0, 40),
    productName: input.productName.trim().slice(0, 200),
    quantity: Math.min(999, Math.max(1, Math.floor(Number(input.quantity) || 1))),
    address: input.address.trim().slice(0, 300),
    message: input.message.trim().slice(0, 1000),
    sheetSyncStatus: 'pending' as const,
    sheetSyncMessage: 'Saved in Firebase Firestore. Ready for Google Sheets sync.',
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'inquiries', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  // Forward to backend Google Sheets integration if configured
  let sheetSyncStatus: Inquiry['sheetSyncStatus'] = 'pending';
  let sheetSyncMessage = payload.sheetSyncMessage;
  try {
    const res = await fetch('/api/inquiries/forward-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        customerName: payload.customerName,
        phoneNumber: payload.phoneNumber,
        productNumber: payload.productNumber,
        productName: payload.productName,
        quantity: payload.quantity,
        address: payload.address,
        message: payload.message,
        createdAt: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      const sheetRes = (await res.json()) as { status?: Inquiry['sheetSyncStatus']; message?: string };
      if (sheetRes.status) sheetSyncStatus = sheetRes.status;
      if (sheetRes.message) sheetSyncMessage = sheetRes.message;
    }
  } catch {
    // Firestore save succeeded; Google Sheets forward can be retried from Admin
  }

  return {
    id,
    customerName: payload.customerName,
    phoneNumber: payload.phoneNumber,
    productNumber: payload.productNumber,
    productName: payload.productName,
    quantity: payload.quantity,
    address: payload.address,
    message: payload.message,
    sheetSyncStatus,
    sheetSyncMessage,
    createdAt: new Date().toISOString(),
  };
}

// Inquiries Real-time Subscription (Admin Only)
export function subscribeToInquiries(
  onData: (inquiries: Inquiry[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => mapDocToInquiry(d.data(), d.id));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'inquiries');
    }
  );
}

export async function updateInquirySheetStatusInFirestore(
  id: string,
  sheetSyncStatus: Inquiry['sheetSyncStatus'],
  sheetSyncMessage: string
): Promise<void> {
  const path = `inquiries/${id}`;
  try {
    await updateDoc(doc(db, 'inquiries', id), {
      sheetSyncStatus,
      sheetSyncMessage: sheetSyncMessage.slice(0, 300),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Customer Support Chat (Firestore Real-time)
export async function sendChatMessageToFirestore(input: {
  chatId: string;
  visitorName: string;
  productNumber: string;
  senderRole: 'customer' | 'admin';
  senderName: string;
  text: string;
}): Promise<void> {
  const chatRef = doc(db, 'chats', input.chatId);
  const messageId = safeId('msg');
  const msgRef = doc(db, 'chats', input.chatId, 'messages', messageId);
  const cleanText = input.text.trim().slice(0, 1000);
  if (!cleanText) return;

  try {
    const chatSnap = await getDoc(chatRef);
    const batch = writeBatch(db);

    if (!chatSnap.exists()) {
      batch.set(chatRef, {
        id: input.chatId,
        visitorName: input.visitorName.trim().slice(0, 100) || 'Customer',
        productNumber: input.productNumber.trim().slice(0, 40),
        lastMessage: cleanText.slice(0, 500),
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(chatRef, {
        lastMessage: cleanText.slice(0, 500),
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(msgRef, {
      id: messageId,
      senderRole: input.senderRole,
      senderName: input.senderName.trim().slice(0, 100) || 'User',
      text: cleanText,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chats/${input.chatId}/messages/${messageId}`);
  }
}

export function subscribeToChatMessages(
  chatId: string,
  onData: (messages: ChatMessage[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = `chats/${chatId}/messages`;
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: typeof data.id === 'string' ? data.id : d.id,
          senderRole: (data.senderRole === 'admin' ? 'admin' : 'customer') as 'customer' | 'admin',
          senderName: String(data.senderName || ''),
          text: String(data.text || ''),
          createdAt: toIsoString(data.createdAt),
        };
      });
      onData(msgs);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToAllChats(
  onData: (threads: ChatThread[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const threads = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: typeof data.id === 'string' ? data.id : d.id,
          visitorName: String(data.visitorName || 'Customer'),
          productNumber: String(data.productNumber || ''),
          lastMessage: String(data.lastMessage || ''),
          status: (data.status === 'closed' ? 'closed' : 'open') as 'open' | 'closed',
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      onData(threads);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'chats');
    }
  );
}

export async function updateChatStatusInFirestore(chatId: string, status: 'open' | 'closed'): Promise<void> {
  const path = `chats/${chatId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Quick inline update for Stock Availability or Featured flag (Admin)
export async function quickUpdateProductFieldsInFirestore(
  id: string,
  fields: { stockAvailability?: StockStatus; featured?: boolean }
): Promise<void> {
  const path = `products/${id}`;
  try {
    await updateDoc(doc(db, 'products', id), {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export interface AdminRecord {
  uid: string;
  email: string;
  createdAt: string;
}

export function subscribeToAdmins(
  onData: (admins: AdminRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, 'admins'),
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: typeof data.uid === 'string' ? data.uid : d.id,
          email: String(data.email || ''),
          createdAt: toIsoString(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function addAdminInFirestore(uid: string, email: string): Promise<void> {
  const cleanUid = uid.trim().slice(0, 128);
  const cleanEmail = email.trim().slice(0, 200);
  if (!cleanUid || !/^[a-zA-Z0-9_\-]+$/.test(cleanUid)) {
    throw new Error('Valid Firebase User UID is required (letters, numbers, _ or -).');
  }
  const path = `admins/${cleanUid}`;
  try {
    await setDoc(doc(db, 'admins', cleanUid), {
      uid: cleanUid,
      email: cleanEmail,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeAdminInFirestore(uid: string): Promise<void> {
  const path = `admins/${uid}`;
  try {
    await deleteDoc(doc(db, 'admins', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}


import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  FileSpreadsheet,
  MessageSquare,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  LogOut,
  ArrowLeft,
  Upload,
  RefreshCw,
  Download,
  Copy,
  Check,
  X,
  Send,
  Loader2,
  Search,
  Database,
  Star,
} from 'lucide-react';
import {
  Product,
  Category,
  Inquiry,
  SheetsConfig,
  ORIGIN_COUNTRIES,
  OriginCountry,
  StockStatus,
  ProductSpec,
} from '../types';
import {
  db,
  ADMIN_EMAILS,
  isPrimaryAdminEmail,
  signInWithGoogle,
  signInWithEmail,
  registerAdminWithEmail,
  resendAdminVerificationEmail,
  reloadFirebaseUser,
  sendAdminPasswordReset,
  signOutFirebase,
  subscribeToAuth,
} from '../firebase';
import {
  ChatThread,
  ChatMessage,
  AdminRecord,
  subscribeToProducts,
  subscribeToCategories,
  subscribeToInquiries,
  subscribeToAllChats,
  subscribeToChatMessages,
  subscribeToAdmins,
  getNextProductNumberFromFirestore,
  createProductInFirestore,
  updateProductInFirestore,
  deleteProductInFirestore,
  quickUpdateProductFieldsInFirestore,
  createCategoryInFirestore,
  updateCategoryInFirestore,
  deleteCategoryInFirestore,
  seedInitialDataToFirestore,
  updateInquirySheetStatusInFirestore,
  sendChatMessageToFirestore,
  updateChatStatusInFirestore,
  addAdminInFirestore,
  removeAdminInFirestore,
} from '../services/firestoreService';
import { MachineImage } from './MachineImage';
import { formatBdtPrice } from './ProductCard';

interface AdminDashboardProps {
  seedProducts: Product[];
  seedCategories: Category[];
  onBackToSite: () => void;
}

type AdminTab = 'overview' | 'products' | 'categories' | 'inquiries' | 'chat' | 'access';

const STUDIO_GALLERY_IMAGES = [
  { label: 'Milking Machine', url: '/src/assets/images/product_milking_machine_1795506628949.jpg' },
  { label: 'Silage Cutter', url: '/src/assets/images/product_silage_cutter_1795506627721.jpg' },
  { label: 'Cream Separator', url: '/src/assets/images/product_cream_separator_1795506628655.jpg' },
  { label: 'Poultry Drinker', url: '/src/assets/images/product_poultry_drinker_1795506628686.jpg' },
  { label: 'Rice Mill', url: '/src/assets/images/product_rice_mill_1795506629347.jpg' },
  { label: 'Straw Cutter', url: '/src/assets/images/product_straw_cutter_1795506629132.jpg' },
];

const APPS_SCRIPT_SNIPPET = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp", "Inquiry ID", "Product Number", "Product Name",
      "Customer Name", "Phone Number", "Quantity", "Address", "Message"
    ]);
  }
  sheet.appendRow([
    data.timestamp, data.inquiryId, data.productNumber, data.productName,
    data.customerName, data.phoneNumber, data.quantity, data.address, data.message
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export function AdminDashboard({
  seedProducts,
  seedCategories,
  onBackToSite,
}: AdminDashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isDelegatedAdmin, setIsDelegatedAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'activate'>('signin');

  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [prodsLoaded, setProdsLoaded] = useState(false);
  const [catsLoaded, setCatsLoaded] = useState(false);
  const autoSeedAttempted = useRef(false);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [sheetsConfig, setSheetsConfig] = useState<SheetsConfig | null>(null);
  const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Products filtering & editor state
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [deleteTargetProduct, setDeleteTargetProduct] = useState<Product | null>(null);

  // Product Form fields
  const [formProductNumber, setFormProductNumber] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formOrigin, setFormOrigin] = useState<OriginCountry>('China');
  const [formStock, setFormStock] = useState<StockStatus>('In Stock');
  const [formFeatured, setFormFeatured] = useState(true);
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formFullDesc, setFormFullDesc] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formImageUrlInput, setFormImageUrlInput] = useState('');
  const [formSpecs, setFormSpecs] = useState<ProductSpec[]>([{ label: '', value: '' }]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category Form state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Admin Access Form state
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Google Sheets form state
  const [webhookInput, setWebhookInput] = useState('');
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState('');
  const [sheetNameInput, setSheetNameInput] = useState('Inquiries');
  const [savingSheets, setSavingSheets] = useState(false);
  const [testingSheets, setTestingSheets] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    return subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.emailVerified && !isPrimaryAdminEmail(currentUser.email)) {
        try {
          const snap = await getDoc(doc(db, 'admins', currentUser.uid));
          setIsDelegatedAdmin(snap.exists());
        } catch {
          setIsDelegatedAdmin(false);
        }
      } else {
        setIsDelegatedAdmin(false);
      }
      setAuthReady(true);
    });
  }, []);

  const isPrimaryOwner = Boolean(
    user && user.emailVerified && isPrimaryAdminEmail(user.email)
  );
  const isAuthorizedAdmin = isPrimaryOwner || (Boolean(user?.emailVerified) && isDelegatedAdmin);

  useEffect(() => {
    if (!isAuthorizedAdmin) return;

    const unsubProds = subscribeToProducts(
      (list) => {
        setProducts(list);
        setProdsLoaded(true);
      },
      (err) => setActionBanner({ type: 'error', text: (err as Error).message })
    );
    const unsubCats = subscribeToCategories(
      (list) => {
        setCategories(list);
        setCatsLoaded(true);
      },
      (err) => setActionBanner({ type: 'error', text: (err as Error).message })
    );
    const unsubInqs = subscribeToInquiries(
      (list) => setInquiries(list),
      (err) => setActionBanner({ type: 'error', text: (err as Error).message })
    );
    const unsubChats = subscribeToAllChats(
      (list) => setChats(list),
      (err) => setActionBanner({ type: 'error', text: (err as Error).message })
    );
    const unsubAdmins = subscribeToAdmins((list) => setAdmins(list));

    user
      ?.getIdToken()
      .then((idToken) =>
        fetch('/api/admin/sheets-config', {
          headers: { Authorization: `Bearer ${idToken}` },
        })
      )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { config?: SheetsConfig } | null) => {
        if (data?.config) {
          setSheetsConfig(data.config);
          setWebhookInput(data.config.webhookUrl || '');
          setSpreadsheetIdInput(data.config.spreadsheetId || '');
          setSheetNameInput(data.config.sheetName || 'Inquiries');
        }
      })
      .catch(() => {});

    return () => {
      unsubProds();
      unsubCats();
      unsubInqs();
      unsubChats();
      unsubAdmins();
    };
  }, [isAuthorizedAdmin, user]);

  // Auto-seed starter catalog into Firestore on first admin login if Firestore is empty
  useEffect(() => {
    if (
      isAuthorizedAdmin &&
      prodsLoaded &&
      catsLoaded &&
      !autoSeedAttempted.current &&
      (products.length === 0 || categories.length === 0) &&
      (seedProducts.length > 0 || seedCategories.length > 0)
    ) {
      autoSeedAttempted.current = true;
      seedInitialDataToFirestore(seedProducts, seedCategories)
        .then((res) => {
          if (res.addedProducts > 0 || res.addedCategories > 0) {
            setActionBanner({
              type: 'success',
              text: `Synced ${res.addedProducts} machinery products and ${res.addedCategories} categories into Firebase Firestore.`,
            });
          }
        })
        .catch(() => {});
    }
  }, [isAuthorizedAdmin, prodsLoaded, catsLoaded, products.length, categories.length, seedProducts, seedCategories]);

  useEffect(() => {
    if (!isAuthorizedAdmin || !selectedChatId) {
      setChatMessages([]);
      return;
    }
    return subscribeToChatMessages(
      selectedChatId,
      (msgs) => setChatMessages(msgs),
      (err) => setActionBanner({ type: 'error', text: (err as Error).message })
    );
  }, [isAuthorizedAdmin, selectedChatId]);

  const formatFirebaseAuthError = (err: unknown): string => {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
    if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
      return 'Email/Password sign-in is not enabled yet in Firebase Console. Enable it under Firebase Console -> Authentication -> Sign-in method -> Email/Password, OR click "Sign in with Google" below.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. If this is your first time using Email/Password, switch to "First-Time Activation" or use "Sign in with Google".';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This email already has an account. Switch to "Sign In" and enter your password.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters.';
    }
    return err instanceof Error ? err.message : 'Authentication failed.';
  };

  const handleEmailAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      const signedInUser =
        authMode === 'activate'
          ? await registerAdminWithEmail(loginEmail, loginPassword)
          : await signInWithEmail(loginEmail, loginPassword);

      if (authMode === 'activate' && !signedInUser.emailVerified) {
        setAuthNotice(
          `Account activated for ${signedInUser.email}. Please open the verification link sent to your inbox, then click "I Verified My Email".`
        );
      } else if (!isPrimaryAdminEmail(signedInUser.email)) {
        const snap = await getDoc(doc(db, 'admins', signedInUser.uid)).catch(() => null);
        if (!snap?.exists()) {
          setAuthError(
            `Signed in as ${signedInUser.email} (UID: ${signedInUser.uid}), which is not authorized.`
          );
        } else {
          setIsDelegatedAdmin(true);
        }
      }
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRefreshVerification = async () => {
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      const refreshed = await reloadFirebaseUser();
      if (refreshed) {
        setUser({ ...refreshed } as User);
        if (!refreshed.emailVerified) {
          setAuthError('Email is still marked unverified. Please click the link sent to your inbox first.');
        }
      }
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      await resendAdminVerificationEmail(user);
      setAuthNotice(`Verification link re-sent to ${user.email}.`);
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!loginEmail.trim()) {
      setAuthError('Enter your admin email address above to receive a password reset link.');
      return;
    }
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      await sendAdminPasswordReset(loginEmail);
      setAuthNotice(`Password reset link sent to ${loginEmail.trim()}.`);
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      const signedInUser = await signInWithGoogle();
      if (!isPrimaryAdminEmail(signedInUser.email)) {
        const snap = await getDoc(doc(db, 'admins', signedInUser.uid)).catch(() => null);
        if (!snap?.exists()) {
          setAuthError(
            `Signed in as ${signedInUser.email} (UID: ${signedInUser.uid}), which is not authorized. Please sign in with ${ADMIN_EMAILS.join(' or ')} or ask a primary admin to add your UID.`
          );
        } else {
          setIsDelegatedAdmin(true);
        }
      }
    } catch (err) {
      setAuthError((err as Error).message || 'Google sign-in failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSeedFirestore = async () => {
    if (seedProducts.length === 0 && seedCategories.length === 0) return;
    setSeeding(true);
    setActionBanner(null);
    try {
      const res = await seedInitialDataToFirestore(seedProducts, seedCategories);
      setActionBanner({
        type: 'success',
        text: `Imported ${res.addedProducts} machines and ${res.addedCategories} categories to Firebase Firestore.`,
      });
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setSeeding(false);
    }
  };

  const openNewProductForm = async () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(categories[0]?.name || seedCategories[0]?.name || 'Milking Machines');
    setFormPrice('');
    setFormOrigin('China');
    setFormStock('In Stock');
    setFormFeatured(true);
    setFormShortDesc('');
    setFormFullDesc('');
    setFormImages([STUDIO_GALLERY_IMAGES[0].url]);
    setFormImageUrlInput('');
    setFormSpecs([
      { label: 'Capacity', value: '' },
      { label: 'Motor Power', value: '' },
    ]);
    setShowProductForm(true);

    try {
      const nextNum = await getNextProductNumberFromFirestore();
      setFormProductNumber(nextNum);
    } catch {
      setFormProductNumber('MACH-1001');
    }
  };

  const openEditProductForm = (product: Product) => {
    setEditingProduct(product);
    setFormProductNumber(product.productNumber);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price ? String(product.price) : '');
    setFormOrigin(product.originCountry);
    setFormStock(product.stockAvailability);
    setFormFeatured(product.featured);
    setFormShortDesc(product.shortDescription);
    setFormFullDesc(product.fullDescription);
    setFormImages([...product.images]);
    setFormImageUrlInput('');
    setFormSpecs(product.specifications.length > 0 ? [...product.specifications] : [{ label: '', value: '' }]);
    setShowProductForm(true);
  };

  const handleImageFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploadingImage(true);
    try {
      const idToken = await user.getIdToken();
      for (const file of Array.from(files)) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Failed to read image file.'));
          reader.readAsDataURL(file);
        });
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ dataUrl }),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error || 'Upload failed.');
        }
        setFormImages((prev) => [...prev, data.url!]);
      }
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setActionBanner(null);

    try {
      const payload = {
        productNumber: formProductNumber.trim().toUpperCase(),
        name: formName.trim(),
        category: formCategory,
        price: formPrice.trim() ? Number(formPrice) : null,
        originCountry: formOrigin,
        stockAvailability: formStock,
        featured: formFeatured,
        shortDescription: formShortDesc.trim(),
        fullDescription: formFullDesc.trim() || formShortDesc.trim(),
        images: formImages,
        specifications: formSpecs.filter((s) => s.label.trim() && s.value.trim()),
      };

      if (editingProduct) {
        await updateProductInFirestore(editingProduct.id, payload);
        setActionBanner({
          type: 'success',
          text: `${payload.productNumber} (${payload.name}) updated successfully.`,
        });
      } else {
        await createProductInFirestore(payload);
        setActionBanner({
          type: 'success',
          text: `${payload.productNumber} (${payload.name}) added successfully.`,
        });
      }
      setShowProductForm(false);
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleQuickStockChange = async (product: Product, stockAvailability: StockStatus) => {
    try {
      await quickUpdateProductFieldsInFirestore(product.id, { stockAvailability });
      setActionBanner({
        type: 'success',
        text: `${product.productNumber} status changed to "${stockAvailability}".`,
      });
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    }
  };

  const handleQuickFeaturedToggle = async (product: Product) => {
    try {
      await quickUpdateProductFieldsInFirestore(product.id, { featured: !product.featured });
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deleteTargetProduct) return;
    try {
      await deleteProductInFirestore(deleteTargetProduct.id);
      setActionBanner({
        type: 'success',
        text: `Deleted ${deleteTargetProduct.productNumber} (${deleteTargetProduct.name}).`,
      });
      setDeleteTargetProduct(null);
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    }
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSavingCategory(true);
    try {
      if (editingCategory) {
        await updateCategoryInFirestore(editingCategory.id, editingCategory.name, catName, catDesc);
      } else {
        await createCategoryInFirestore(catName, catDesc);
      }
      setEditingCategory(null);
      setCatName('');
      setCatDesc('');
      setActionBanner({ type: 'success', text: 'Category saved.' });
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    try {
      await deleteCategoryInFirestore(cat.id, cat.name);
      setActionBanner({ type: 'success', text: `Category "${cat.name}" deleted.` });
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    }
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setSavingAdmin(true);
    try {
      await addAdminInFirestore(newAdminUid, newAdminEmail);
      setNewAdminUid('');
      setNewAdminEmail('');
      setActionBanner({ type: 'success', text: 'Authorized admin added.' });
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleSaveSheetsConfig = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingSheets(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/sheets-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          webhookUrl: webhookInput,
          spreadsheetId: spreadsheetIdInput,
          sheetName: sheetNameInput,
        }),
      });
      const data = (await res.json()) as { config?: SheetsConfig; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to save Google Sheets settings.');
      if (data.config) setSheetsConfig(data.config);
      setActionBanner({ type: 'success', text: 'Google Sheets configuration saved.' });
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setSavingSheets(false);
    }
  };

  const handleTestSheets = async () => {
    if (!user) return;
    setTestingSheets(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/sheets-test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = (await res.json()) as { status: string; message: string };
      setActionBanner({
        type: data.status === 'synced' ? 'success' : 'error',
        text: data.message,
      });
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setTestingSheets(false);
    }
  };

  const handleRetryInquirySync = async (inq: Inquiry) => {
    try {
      const res = await fetch('/api/inquiries/forward-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inq),
      });
      const result = (await res.json()) as { status?: Inquiry['sheetSyncStatus']; message?: string };
      await updateInquirySheetStatusInFirestore(
        inq.id,
        result.status || 'failed',
        result.message || 'Attempted sync.'
      );
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    }
  };

  const handleDownloadCsv = () => {
    const header = [
      'Timestamp',
      'Inquiry ID',
      'Product Number',
      'Product Name',
      'Customer Name',
      'Phone Number',
      'Quantity',
      'Address',
      'Message',
      'Google Sheets Status',
    ];
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
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agro-trad-inquiries.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSendAdminReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !adminReplyText.trim()) return;
    const thread = chats.find((c) => c.id === selectedChatId);
    if (!thread) return;
    setSendingReply(true);
    try {
      await sendChatMessageToFirestore({
        chatId: selectedChatId,
        visitorName: thread.visitorName,
        productNumber: thread.productNumber,
        senderRole: 'admin',
        senderName: 'AGRO TRAD Admin',
        text: adminReplyText,
      });
      setAdminReplyText('');
    } catch (err) {
      setActionBanner({ type: 'error', text: (err as Error).message });
    } finally {
      setSendingReply(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" />
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-7 shadow-sm space-y-5">
          <div>
            <h1 className="text-xl font-bold text-[#0B2545]">AGRO TRAD Admin Panel</h1>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your authorized admin account to add, update, or delete products and manage store operations.
            </p>
          </div>

          {authError && (
            <div className="p-3 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg" role="alert">
              {authError}
            </div>
          )}

          {authNotice && (
            <div className="p-3 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg" role="status">
              {authNotice}
            </div>
          )}

          {user && !user.emailVerified && isPrimaryAdminEmail(user.email) && (
            <div className="p-3.5 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg space-y-2.5">
              <p className="font-medium">
                Email verification required for <span className="font-mono font-semibold">{user.email}</span>.
              </p>
              <p className="text-xs text-amber-800">
                Open the verification link sent to your Gmail inbox, then refresh below—or click &ldquo;Sign in with Google&rdquo; for instant verified access.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRefreshVerification}
                  disabled={authLoading}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#0B2545] text-white rounded-md"
                >
                  I Verified My Email
                </button>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={authLoading}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-amber-300 text-amber-900 rounded-md"
                >
                  Resend Link
                </button>
                <button
                  type="button"
                  onClick={() => signOutFirebase()}
                  className="px-2 py-1.5 text-xs font-semibold text-slate-600 underline"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {user && !isAuthorizedAdmin && !(!user.emailVerified && isPrimaryAdminEmail(user.email)) && (
            <div className="p-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <p>
                Signed in as <span className="font-mono font-semibold">{user.email}</span> (UID:{' '}
                <span className="font-mono text-xs">{user.uid}</span>). Only authorized admin accounts can control products.
              </p>
              <button
                type="button"
                onClick={() => signOutFirebase()}
                className="text-xs font-semibold text-[#0B2545] underline"
              >
                Sign out and switch account
              </button>
            </div>
          )}

          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setAuthError('');
              }}
              className={`flex-1 py-2 rounded-md transition-colors ${
                authMode === 'signin' ? 'bg-white text-[#0B2545] shadow-xs' : 'text-slate-600'
              }`}
            >
              Email Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('activate');
                setAuthError('');
              }}
              className={`flex-1 py-2 rounded-md transition-colors ${
                authMode === 'activate' ? 'bg-white text-[#0B2545] shadow-xs' : 'text-slate-600'
              }`}
            >
              First-Time Activation
            </button>
          </div>

          <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="admin-email-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Email
              </label>
              <input
                id="admin-email-input"
                type="email"
                required
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="admin-password-input" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-[11px] font-medium text-[#EA580C] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="admin-password-input"
                type="password"
                required
                minLength={6}
                autoComplete={authMode === 'activate' ? 'new-password' : 'current-password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-[#0B2545] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B2545] hover:bg-[#133863] text-white rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            >
              {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{authMode === 'activate' ? 'Activate Email Admin' : 'Sign In with Email'}</span>
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium">Or</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authLoading}
            className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 shadow-xs transition-colors min-h-[44px]"
          >
            {authLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>

          <button
            type="button"
            onClick={onBackToSite}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0B2545]"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Return to Storefront</span>
          </button>
        </div>
      </div>
    );
  }

  const filteredAdminProducts = products.filter((p) => {
    if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
    if (!productSearch.trim()) return true;
    const q = productSearch.trim().toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.productNumber.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const syncedCount = inquiries.filter((i) => i.sheetSyncStatus === 'synced').length;
  const inStockCount = products.filter((p) => p.stockAvailability === 'In Stock').length;
  const activeThread = chats.find((c) => c.id === selectedChatId) || null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-[#0B2545] text-white shrink-0 flex flex-col justify-between">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-400 mb-3">AGRO TRAD Admin Control</div>
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products' ? 'bg-[#EA580C] text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Package className="w-4 h-4" aria-hidden="true" />
              <span>Products ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview' ? 'bg-[#EA580C] text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'categories' ? 'bg-[#EA580C] text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <FolderTree className="w-4 h-4" aria-hidden="true" />
              <span>Categories</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inquiries')}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'inquiries' ? 'bg-[#EA580C] text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
              <span>Inquiries ({inquiries.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'chat' ? 'bg-[#EA580C] text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>Customer Chat ({chats.length})</span>
            </button>

            {isPrimaryOwner && (
              <button
                type="button"
                onClick={() => setActiveTab('access')}
                className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'access' ? 'bg-[#EA580C] text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Admin Access</span>
              </button>
            )}
          </nav>
        </div>

        <div className="hidden lg:block p-5 border-t border-white/10 space-y-2">
          <div className="text-xs text-slate-400 truncate px-2">{user?.email}</div>
          <button
            type="button"
            onClick={onBackToSite}
            className="w-full inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Storefront</span>
          </button>
          <button
            type="button"
            onClick={() => signOutFirebase()}
            className="w-full inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-300 hover:text-white hover:bg-rose-500/20 rounded-lg"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm font-medium text-slate-600">
            Admin Panel <span aria-hidden="true">/</span>{' '}
            <span className="font-semibold text-[#0B2545] capitalize">{activeTab}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(products.length === 0 || categories.length === 0) && (
              <button
                type="button"
                onClick={handleSeedFirestore}
                disabled={seeding}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B2545] bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
              >
                <Database className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{seeding ? 'Importing...' : 'Import Starter Catalog'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={openNewProductForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors whitespace-nowrap min-h-[38px]"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add New Product</span>
            </button>
            <button
              type="button"
              onClick={() => signOutFirebase()}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {actionBanner && (
            <div
              className={`p-3.5 rounded-lg border text-sm flex items-center justify-between gap-4 ${
                actionBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
              role="status"
            >
              <span>{actionBanner.text}</span>
              <button type="button" onClick={() => setActionBanner(null)} aria-label="Dismiss notification">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Total Products</div>
                  <div className="mt-2 text-2xl font-bold font-mono text-[#0B2545] tabular-nums">
                    {products.length}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">In Stock Ready</div>
                  <div className="mt-2 text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                    {inStockCount}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Product Categories</div>
                  <div className="mt-2 text-2xl font-bold font-mono text-[#0B2545] tabular-nums">
                    {categories.length}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">Inquiries &amp; Chats</div>
                  <div className="mt-2 text-2xl font-bold font-mono text-[#EA580C] tabular-nums">
                    {inquiries.length} / {chats.length}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 tabular-nums">
                    {syncedCount} synced to Google Sheets
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#0B2545]">Recent Customer Inquiries</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inquiries')}
                    className="text-xs font-semibold text-[#EA580C] hover:underline"
                  >
                    Manage All Inquiries
                  </button>
                </div>
                {inquiries.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No customer inquiries submitted yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Product No.</th>
                          <th className="py-3 px-4 font-semibold">Machine</th>
                          <th className="py-3 px-4 font-semibold">Customer</th>
                          <th className="py-3 px-4 font-semibold">Phone</th>
                          <th className="py-3 px-4 font-semibold text-right">Qty</th>
                          <th className="py-3 px-4 font-semibold">Sheets Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inquiries.slice(0, 6).map((inq) => (
                          <tr key={inq.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-semibold text-[#0B2545]">{inq.productNumber}</td>
                            <td className="py-3 px-4 text-slate-900 max-w-[220px] truncate">{inq.productName}</td>
                            <td className="py-3 px-4 text-slate-700">{inq.customerName}</td>
                            <td className="py-3 px-4 font-mono text-slate-700">{inq.phoneNumber}</td>
                            <td className="py-3 px-4 font-mono text-right">{inq.quantity}</td>
                            <td className="py-3 px-4 text-xs font-medium capitalize">
                              <span
                                className={
                                  inq.sheetSyncStatus === 'synced'
                                    ? 'text-emerald-700'
                                    : inq.sheetSyncStatus === 'failed'
                                    ? 'text-rose-700'
                                    : 'text-amber-700'
                                }
                              >
                                {inq.sheetSyncStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-[#0B2545]">
                    Manage Machinery Products ({filteredAdminProducts.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add new machines, update prices/specs/stock, or delete products. Changes sync live to the website.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter products by category"
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#0B2545] focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <div className="relative sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      type="search"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search name or MACH-..."
                      className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {filteredAdminProducts.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 space-y-3">
                  <p>{products.length === 0 ? 'No products in Firestore yet.' : 'No matching products found.'}</p>
                  {products.length === 0 && seedProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSeedFirestore}
                      disabled={seeding}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0B2545] rounded-lg"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Import Starter Catalog ({seedProducts.length} Machines)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Product No.</th>
                        <th className="py-3 px-4 font-semibold">Machine</th>
                        <th className="py-3 px-4 font-semibold">Category</th>
                        <th className="py-3 px-4 font-semibold text-right">Price</th>
                        <th className="py-3 px-4 font-semibold">Stock Control</th>
                        <th className="py-3 px-4 font-semibold text-center">Featured</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAdminProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-semibold text-[#0B2545] whitespace-nowrap">
                            {p.productNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-9 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                <MachineImage src={p.images[0]} alt={p.name} />
                              </div>
                              <div>
                                <div className="font-medium text-slate-900 line-clamp-1">{p.name}</div>
                                <div className="text-xs text-slate-500">{p.originCountry}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{p.category}</td>
                          <td className="py-3 px-4 text-right font-semibold text-[#0B2545] tabular-nums whitespace-nowrap">
                            {formatBdtPrice(p.price, p.priceDisplay)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <select
                              value={p.stockAvailability}
                              onChange={(e) => handleQuickStockChange(p, e.target.value as StockStatus)}
                              aria-label={`Change stock for ${p.productNumber}`}
                              className={`text-xs font-semibold border rounded-md px-2 py-1 bg-white focus:outline-none ${
                                p.stockAvailability === 'In Stock'
                                  ? 'border-emerald-300 text-emerald-800'
                                  : p.stockAvailability === 'Pre-Order'
                                  ? 'border-amber-300 text-amber-800'
                                  : 'border-rose-300 text-rose-800'
                              }`}
                            >
                              <option value="In Stock">In Stock</option>
                              <option value="Pre-Order">Pre-Order</option>
                              <option value="Out of Stock">Out of Stock</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleQuickFeaturedToggle(p)}
                              aria-label={p.featured ? 'Unfeature product' : 'Feature product'}
                              className={`p-1.5 rounded-md transition-colors ${
                                p.featured ? 'text-[#EA580C] bg-orange-50' : 'text-slate-300 hover:text-slate-500'
                              }`}
                            >
                              <Star className={`w-4 h-4 ${p.featured ? 'fill-current' : ''}`} />
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditProductForm(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0B2545] bg-slate-100 hover:bg-slate-200 rounded-md"
                              >
                                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Update</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTargetProduct(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleSaveCategory}
                className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-[#0B2545]">
                  {editingCategory ? `Edit "${editingCategory.name}"` : 'Add Product Category'}
                </h2>
                <div>
                  <label htmlFor="cat-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Category Name
                  </label>
                  <input
                    id="cat-name"
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Feed Pellet Machines"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="cat-desc" className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="cat-desc"
                    rows={3}
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Short overview of machinery in this category"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingCategory}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133863] rounded-lg"
                  >
                    {savingCategory ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
                  </button>
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setCatName('');
                        setCatDesc('');
                      }}
                      className="px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-bold text-[#0B2545]">Active Categories ({categories.length})</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {categories.map((cat) => {
                    const count = products.filter((p) => p.category === cat.name).length;
                    return (
                      <div key={cat.id} className="px-6 py-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-[#0B2545] text-sm">
                            {cat.name}{' '}
                            <span className="text-xs font-mono text-slate-500">({count} items)</span>
                          </div>
                          {cat.description && <p className="text-xs text-slate-600 mt-0.5">{cat.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(cat);
                              setCatName(cat.name);
                              setCatDesc(cat.description);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-[#0B2545] bg-slate-100 hover:bg-slate-200 rounded-md"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* INQUIRIES & GOOGLE SHEETS TAB */}
          {activeTab === 'inquiries' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-[#0B2545]">Google Sheets Inquiry Sync</h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Customer inquiries are stored in Firebase Firestore and forwarded through the backend to your Google Sheet.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestSheets}
                    disabled={testingSheets}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B2545] border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingSheets ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>Test Sheet Connection</span>
                  </button>
                </div>

                <form onSubmit={handleSaveSheetsConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="sheets-webhook" className="block text-xs font-semibold text-slate-700 mb-1">
                      Google Apps Script Web App URL (https://script.google.com/...)
                    </label>
                    <input
                      id="sheets-webhook"
                      type="url"
                      value={webhookInput}
                      onChange={(e) => setWebhookInput(e.target.value)}
                      disabled={sheetsConfig?.hasEnvWebhook}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-[#0B2545] focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="sheets-tab" className="block text-xs font-semibold text-slate-700 mb-1">
                      Sheet Tab Name
                    </label>
                    <input
                      id="sheets-tab"
                      type="text"
                      value={sheetNameInput}
                      onChange={(e) => setSheetNameInput(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-[#0B2545] focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-4 pt-1">
                    <span className="text-xs text-slate-500">
                      {sheetsConfig?.hasEnvServiceAccount
                        ? 'Google Sheets API Service Account configured via server environment.'
                        : 'Paste your deployed Google Apps Script Web App URL above to enable automatic row appends.'}
                    </span>
                    <button
                      type="submit"
                      disabled={savingSheets}
                      className="px-4 py-2 text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133863] rounded-lg"
                    >
                      {savingSheets ? 'Saving...' : 'Save Sheets Settings'}
                    </button>
                  </div>
                </form>

                <details className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <summary className="text-xs font-semibold text-[#0B2545] cursor-pointer">
                    View Ready-to-Paste Google Apps Script Code (doPost)
                  </summary>
                  <div className="mt-3 relative">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
                        setCopiedSnippet(true);
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md mb-2"
                    >
                      {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet ? 'Copied Script' : 'Copy Apps Script'}</span>
                    </button>
                    <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                      {APPS_SCRIPT_SNIPPET}
                    </pre>
                  </div>
                </details>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  <h2 className="text-base font-bold text-[#0B2545]">Customer Inquiries ({inquiries.length})</h2>
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B2545] bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Download CSV</span>
                  </button>
                </div>

                {inquiries.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No inquiries recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Date</th>
                          <th className="py-3 px-4 font-semibold">Product No.</th>
                          <th className="py-3 px-4 font-semibold">Machine</th>
                          <th className="py-3 px-4 font-semibold">Customer &amp; Phone</th>
                          <th className="py-3 px-4 font-semibold text-right">Qty</th>
                          <th className="py-3 px-4 font-semibold">Address / Message</th>
                          <th className="py-3 px-4 font-semibold">Google Sheets</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inquiries.map((inq) => (
                          <tr key={inq.id} className="hover:bg-slate-50 align-top">
                            <td className="py-3 px-4 text-xs text-slate-500 font-mono whitespace-nowrap">
                              {new Date(inq.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-[#0B2545] whitespace-nowrap">
                              {inq.productNumber}
                            </td>
                            <td className="py-3 px-4 text-slate-900 max-w-[180px]">{inq.productName}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">{inq.customerName}</div>
                              <div className="text-xs font-mono text-slate-600">{inq.phoneNumber}</div>
                            </td>
                            <td className="py-3 px-4 font-mono text-right">{inq.quantity}</td>
                            <td className="py-3 px-4 text-xs text-slate-600 max-w-[240px]">
                              {inq.address && <div className="font-medium text-slate-800">{inq.address}</div>}
                              {inq.message && <div className="mt-0.5">{inq.message}</div>}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <div
                                className={`font-semibold capitalize ${
                                  inq.sheetSyncStatus === 'synced'
                                    ? 'text-emerald-700'
                                    : inq.sheetSyncStatus === 'failed'
                                    ? 'text-rose-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {inq.sheetSyncStatus}
                              </div>
                              {inq.sheetSyncStatus !== 'synced' && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryInquirySync(inq)}
                                  className="mt-1 text-xs font-semibold text-[#EA580C] hover:underline"
                                >
                                  Retry Sync
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CUSTOMER CHAT TAB */}
          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-xl overflow-hidden min-h-[520px]">
              <div className="lg:col-span-4 border-r border-slate-200 divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
                <div className="px-4 py-3 bg-slate-50 text-xs font-semibold text-slate-600">
                  Live Customer Chats ({chats.length})
                </div>
                {chats.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">
                    No customer chat messages yet.
                  </div>
                ) : (
                  chats.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedChatId(thread.id)}
                      className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors ${
                        selectedChatId === thread.id ? 'bg-slate-100' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-[#0B2545] truncate">
                          {thread.visitorName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {thread.status}
                        </span>
                      </div>
                      {thread.productNumber && (
                        <div className="text-[11px] font-mono text-[#EA580C] mt-0.5">
                          {thread.productNumber}
                        </div>
                      )}
                      <p className="text-xs text-slate-600 line-clamp-1 mt-1">{thread.lastMessage}</p>
                    </button>
                  ))
                )}
              </div>

              <div className="lg:col-span-8 flex flex-col">
                {!activeThread ? (
                  <div className="flex-1 flex items-center justify-center p-8 text-sm text-slate-500">
                    Select a customer conversation on the left to view messages and reply live.
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-sm text-[#0B2545]">{activeThread.visitorName}</div>
                        <div className="text-xs text-slate-500">
                          {activeThread.productNumber ? `Machine: ${activeThread.productNumber}` : 'General Inquiry'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateChatStatusInFirestore(
                            activeThread.id,
                            activeThread.status === 'open' ? 'closed' : 'open'
                          )
                        }
                        className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                      >
                        {activeThread.status === 'open' ? 'Mark Closed' : 'Reopen Chat'}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50 max-h-[420px]">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.senderRole === 'admin' ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[11px] text-slate-500 mb-0.5">
                            {msg.senderName}
                          </span>
                          <div
                            className={`px-3.5 py-2 rounded-lg text-sm max-w-[80%] ${
                              msg.senderRole === 'admin'
                                ? 'bg-[#0B2545] text-white'
                                : 'bg-white border border-slate-200 text-slate-900'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendAdminReply} className="p-4 border-t border-slate-200 flex items-center gap-2">
                      <input
                        type="text"
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        placeholder="Type reply to customer..."
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-[#0B2545] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={sendingReply}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg"
                      >
                        <Send className="w-4 h-4" />
                        <span>Reply</span>
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ADMIN ACCESS CONTROL TAB */}
          {activeTab === 'access' && isPrimaryOwner && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleAddAdmin}
                className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-[#0B2545]">Authorize Additional Admin</h2>
                <p className="text-xs text-slate-600">
                  Primary owners (<span className="font-mono font-semibold">{ADMIN_EMAILS.join(', ')}</span>) control all access. You can grant admin panel control to another staff member using their Firebase User UID.
                </p>
                <div>
                  <label htmlFor="admin-uid" className="block text-xs font-semibold text-slate-700 mb-1">
                    Firebase User UID <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="admin-uid"
                    type="text"
                    required
                    value={newAdminUid}
                    onChange={(e) => setNewAdminUid(e.target.value)}
                    placeholder="Paste user UID"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="admin-email-note" className="block text-xs font-semibold text-slate-700 mb-1">
                    Staff Email / Label
                  </label>
                  <input
                    id="admin-email-note"
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="manager@example.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133863] rounded-lg"
                >
                  {savingAdmin ? 'Adding...' : 'Grant Admin Access'}
                </button>
              </form>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-bold text-[#0B2545]">Authorized Administrators</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {ADMIN_EMAILS.map((ownerEmail) => (
                    <div key={ownerEmail} className="px-6 py-4 flex items-center justify-between gap-4 bg-slate-50/60">
                      <div>
                        <div className="font-semibold text-sm text-[#0B2545]">{ownerEmail}</div>
                        <div className="text-xs text-slate-500">Primary Owner (Full Control)</div>
                      </div>
                    </div>
                  ))}
                  {admins.map((adm) => (
                    <div key={adm.uid} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-sm text-[#0B2545]">{adm.email || 'Authorized Admin'}</div>
                        <div className="text-xs font-mono text-slate-500">UID: {adm.uid}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAdminInFirestore(adm.uid)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showProductForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-form-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden my-8">
            <div className="bg-[#0B2545] text-white px-6 py-4 flex items-center justify-between">
              <h2 id="product-form-title" className="text-lg font-bold">
                {editingProduct ? `Update ${editingProduct.productNumber}` : 'Add New Machinery Product'}
              </h2>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                aria-label="Close product form"
                className="p-1.5 text-slate-300 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="pf-number" className="block text-xs font-semibold text-slate-700 mb-1">
                    Product Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="pf-number"
                    type="text"
                    required
                    value={formProductNumber}
                    onChange={(e) => setFormProductNumber(e.target.value.toUpperCase())}
                    placeholder="MACH-1011"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-semibold text-[#0B2545] focus:border-[#0B2545] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="pf-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Product Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="pf-name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Single Bucket Stainless Milking Machine"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-[#0B2545] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="pf-category" className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="pf-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#0B2545] focus:outline-none"
                  >
                    {(categories.length > 0 ? categories : seedCategories).map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="pf-origin" className="block text-xs font-semibold text-slate-700 mb-1">
                    Origin Country
                  </label>
                  <select
                    id="pf-origin"
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value as OriginCountry)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#0B2545] focus:outline-none"
                  >
                    {ORIGIN_COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="pf-stock" className="block text-xs font-semibold text-slate-700 mb-1">
                    Availability
                  </label>
                  <select
                    id="pf-stock"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value as StockStatus)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#0B2545] focus:outline-none"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Pre-Order">Pre-Order</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label htmlFor="pf-price" className="block text-xs font-semibold text-slate-700 mb-1">
                    Price in BDT (Leave blank for &ldquo;Contact for Price&rdquo;)
                  </label>
                  <input
                    id="pf-price"
                    type="number"
                    min={0}
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 54000"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-[#0B2545] focus:outline-none"
                  />
                </div>

                <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-700 pb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-4 h-4 accent-[#EA580C]"
                  />
                  <span>Feature on Homepage</span>
                </label>
              </div>

              <div>
                <label htmlFor="pf-short" className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Description <span className="text-rose-600">*</span>
                </label>
                <input
                  id="pf-short"
                  type="text"
                  required
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  placeholder="Concise 1-sentence machine summary"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="pf-full" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Description
                </label>
                <textarea
                  id="pf-full"
                  rows={3}
                  value={formFullDesc}
                  onChange={(e) => setFormFullDesc(e.target.value)}
                  placeholder="Detailed farm application, construction materials, and warranty/support info"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-[#0B2545] focus:outline-none"
                />
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Product Images ({formImages.length})
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#0B2545] rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Images'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={handleImageFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Built-in Studio Machinery Quick Gallery */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 mr-1">Quick Add Photo:</span>
                  {STUDIO_GALLERY_IMAGES.map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() =>
                        setFormImages((prev) => (prev.includes(item.url) ? prev : [...prev, item.url]))
                      }
                      className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                    >
                      + {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formImageUrlInput}
                    onChange={(e) => setFormImageUrlInput(e.target.value)}
                    placeholder="Or paste image URL (/src/assets/... or https://...)"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:border-[#0B2545] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (formImageUrlInput.trim()) {
                        setFormImages((prev) => [...prev, formImageUrlInput.trim()]);
                        setFormImageUrlInput('');
                      }
                    }}
                    className="px-3 py-2 text-xs font-semibold bg-[#0B2545] text-white rounded-lg"
                  >
                    Add URL
                  </button>
                </div>

                {formImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {formImages.map((img, idx) => (
                      <div key={`${img}-${idx}`} className="relative border border-slate-200 rounded-lg overflow-hidden aspect-[4/3] bg-slate-50">
                        <MachineImage src={img} alt={`Preview ${idx + 1}`} />
                        <button
                          type="button"
                          onClick={() => setFormImages((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label="Remove image"
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2.5 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Technical Specifications</label>
                  <button
                    type="button"
                    onClick={() => setFormSpecs((prev) => [...prev, { label: '', value: '' }])}
                    className="text-xs font-semibold text-[#EA580C] hover:underline"
                  >
                    + Add Specification Row
                  </button>
                </div>

                {formSpecs.map((spec, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={spec.label}
                      onChange={(e) =>
                        setFormSpecs((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, label: e.target.value } : row))
                        )
                      }
                      placeholder="Spec (e.g. Motor Power)"
                      className="col-span-5 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#0B2545] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) =>
                        setFormSpecs((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, value: e.target.value } : row))
                        )
                      }
                      placeholder="Value (e.g. 3.0 HP / 220V)"
                      className="col-span-6 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#0B2545] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setFormSpecs((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove specification row"
                      className="col-span-1 flex justify-center text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg"
                >
                  {savingProduct ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {deleteTargetProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 id="delete-confirm-title" className="text-lg font-bold text-[#0B2545]">
              Delete Machinery Product?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-mono font-semibold text-[#0B2545]">
                {deleteTargetProduct.productNumber}
              </span>{' '}
              ({deleteTargetProduct.name})? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetProduct(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  ShoppingBag, 
  Leaf, 
  Truck, 
  ShieldCheck, 
  Phone, 
  Facebook, 
  Instagram,
  Home,
  ArrowRight,
  MapPin,
  Mail,
  Plus,
  Minus,
  Edit,
  Trash2,
  X,
  LogOut,
  Settings,
  Image as ImageIcon,
  Star,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Wallet,
  CheckCircle2,
  Clock,
  Youtube,
  Twitter,
  MessageCircle,
  Search,
  Hash,
  CheckSquare,
  Crop,
  Maximize2,
  RefreshCw,
  User as UserIcon,
  Link as LinkIcon,
  Navigation,
  PhoneCall,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useCallback } from 'react';
import heroImage1 from './assets/images/regenerated_image_1777706568728.png';
import heroImage2 from './assets/images/regenerated_image_1777706574310.png';
import Papa from 'papaparse';
import Cropper, { Area, Point } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { 
  db, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  where,
  getDocs,
  checkIsAdmin,
  handleFirestoreError,
  OperationType,
  User
} from './lib/firebase';

const WHATSAPP_NUMBER = "8801848005511"; // Updated with user provided number

const CATEGORIES = [
  { id: 'all', name: 'সব পণ্য' },
  { id: 'honey', name: 'মধু' },
  { id: 'oil-ghee', name: 'তেল ও ঘি' },
  { id: 'fruits', name: 'ফল' },
  { id: 'package', name: 'প্যাকেজ ফুড' },
  { id: 'others', name: 'অন্যান্য' }
];

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category?: string;
  stock: boolean;
  certifications?: string[];
  createdAt?: any;
}

interface CartItem extends Product {
  quantity: number;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

interface Coupon {
  id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  expiry?: any;
  active: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPolicy, setShowPolicy] = useState<'return' | 'payment' | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);

  const [loading, setLoading] = useState(true);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);
  const [checkingOutProduct, setCheckingOutProduct] = useState<Product | null>(null);
  const [showCartCheckout, setShowCartCheckout] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [adminTab, setAdminTab] = useState<'products' | 'orders' | 'coupons' | 'design'>('products');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>({
    logo: '/logo.png',
    heroImages: [
      heroImage1,
      heroImage2,
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1000&auto=format&fit=crop'
    ],
    heroTitle: 'মাঠের তাজা বিশুদ্ধতা সরাসরি আপনার হাতে।',
    heroSubtitle: 'আমরা সরাসরি বিশ্বস্ত কৃষকদের থেকে শতভাগ প্রাকৃতিক এবং রাসায়নিক মুক্ত খাবার সংগ্রহ করি। সেরা মানের গ্যারান্টি সহ পৌঁছে দিই সারাবাংলাদেশে।',
    heroBadge: 'প্রকৃতি হতে আপনার ঘরে'
  });
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Detail Modal & Reviews State
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Manage body scroll locking when modals are open
  useEffect(() => {
    const isModalOpen = viewingProduct || checkingOutProduct || showCartCheckout || showAdmin || showCart || showTracking;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [viewingProduct, checkingOutProduct, showCartCheckout, showAdmin, showCart, showTracking]);

  // Admin Form State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageToAdjust, setImageToAdjust] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageAdjustQueue, setImageAdjustQueue] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'products' | 'account'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filtering State
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const CERTIFICATIONS = [
    'USDA Organic',
    'EU Organic',
    'Non-GMO',
    'Fair Trade',
    'GMP Certified',
    'ISO Certified'
  ];

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setPriceRange([0, 10000]);
    setInStockOnly(false);
    setSelectedCertifications([]);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    
    const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    const matchesStock = !inStockOnly || p.stock;
    const matchesCertifications = selectedCertifications.length === 0 || 
                                 (p.certifications && selectedCertifications.every(c => p.certifications?.includes(c)));
    
    return matchesSearch && matchesCategory && matchesPrice && matchesStock && matchesCertifications;
  });

  const handleLocalFirestoreError = useCallback((err: any, type: OperationType, path: string) => {
    const msg = err?.message || String(err);
    const isQuota = msg.toLowerCase().includes('quota') || 
                    msg.toLowerCase().includes('মেমরি লিমিট') ||
                    msg.toLowerCase().includes('limit exceeded');
    
    if (isQuota) {
      setQuotaExceeded(true);
      // For quota errors, we log but don't re-throw to avoid unhandled promise rejections in console
      handleFirestoreError(err, type, path, false);
    } else {
      handleFirestoreError(err, type, path, true);
    }
  }, []);

  const optimizeImage = async (file: File) => {
    const options = {
      maxSizeMB: 0.1, // Max 100KB for better performance
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/webp' as any // Convert to WebP
    };
    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Compression error:", error);
      return file;
    }
  };

  const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Helper to suggest different image sizes based on device
   * If using a service like Cloudinary or Vercel Image Optimization, 
   * this would return a different URL.
   */
  const getOptimizedUrl = (url: string, width: number) => {
    if (!url) return '';
    // Example for Vercel: return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
    // For now, since we use base64 or direct URLs, we return the original.
    return url;
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const adminStatus = await checkIsAdmin(user.uid, user.email, user.emailVerified);
          setIsAdmin(adminStatus);
        } catch (err) {
          console.error("Admin check failed", err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      prods.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || Date.now();
        return timeB - timeA;
      });
      setProducts(prods);
    }, (error) => {
      handleLocalFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setSiteSettings((prev: any) => ({ ...prev, ...docSnap.data() }));
      }
    }, (err) => handleLocalFirestoreError(err, OperationType.GET, 'settings/general'));

    return () => {
      unsubscribeProducts();
      unsubscribeSettings();
    };
  }, [handleLocalFirestoreError]);

  useEffect(() => {
    if (!isAdmin) return;

    const ordersQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQ, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleLocalFirestoreError(err, OperationType.LIST, 'orders'));

    const couponsQ = query(collection(db, 'coupons'), orderBy('code', 'asc'));
    const unsubscribeCoupons = onSnapshot(couponsQ, (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon)));
    }, (err) => handleLocalFirestoreError(err, OperationType.LIST, 'coupons'));

    return () => {
      unsubscribeOrders();
      unsubscribeCoupons();
    };
  }, [isAdmin, handleLocalFirestoreError]);

  useEffect(() => {
    if (!user) {
      setUserOrders([]);
      return;
    }

    const userOrdersQ = query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeUserOrders = onSnapshot(userOrdersQ, (snapshot) => {
      setUserOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleLocalFirestoreError(err, OperationType.LIST, 'orders (user)'));

    return () => unsubscribeUserOrders();
  }, [user, handleLocalFirestoreError]);

  // Handle deep linking for shared products, categories and pages
  useEffect(() => {
    if (products.length > 0 || siteSettings) {
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('product');
      const categoryId = params.get('category');
      const pageId = params.get('page');

      let handled = false;

      if (productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
          setViewingProduct(product);
          handled = true;
        }
      } else if (categoryId) {
        const category = CATEGORIES.find(c => c.id === categoryId);
        if (category) {
          setSelectedCategory(category.id);
          // Also set view to landing if it was elsewhere
          setActiveView('products');
          handled = true;
        }
      } else if (pageId) {
        if (pageId === 'about') {
          setShowAbout(true);
          handled = true;
        } else if (pageId === 'return-policy') {
          setShowPolicy('return');
          handled = true;
        } else if (pageId === 'payment-policy') {
          setShowPolicy('payment');
          handled = true;
        }
      }

      if (handled) {
        // Clean up URL without reload if desired, or keep it for bookmarking
        // For SEO, keeping it might be better if we want crawlers to see it,
        // but since we're using query params, crawlers might preferred cleaned URLs.
        // However, if we clean it immediately, the crawler might not "see" the state.
        // Let's NOT clean it if we want it to be bookmarkable/crawlable.
        // window.history.replaceState({}, '', window.location.origin + window.location.pathname);
      }
    }
  }, [products, siteSettings]);

  useEffect(() => {
    if (siteSettings.heroImages && siteSettings.heroImages.length > 1) {
      const timer = setInterval(() => {
        setCurrentHeroSlide(prev => (prev + 1) % siteSettings.heroImages.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [siteSettings.heroImages]);

  const saveSiteSettings = async () => {
    try {
      setIsSavingSettings(true);
      
      // Checking for document size roughly (Firestore limit is 1MB)
      let settingsSize = 0;
      try {
        // Calculate size of strings and arrays of strings only to avoid circularity issues
        Object.values(siteSettings).forEach(val => {
          if (typeof val === 'string') settingsSize += val.length;
          else if (Array.isArray(val)) {
            val.forEach(item => {
              if (typeof item === 'string') settingsSize += item.length;
            });
          } else if (val && typeof val === 'object') {
            // For other objects, we skip deep calculation to avoid circularity
            settingsSize += 100; 
          }
        });
      } catch (e) {
        console.warn("Error calculating settings size:", e);
        settingsSize = 500000; // Safe fallback
      }
      
      if (settingsSize > 1000000) {
        throw new Error("হিরো ইমেজ সংখ্যা বা সাইজ বেশি হওয়ার কারণে সেভ করা যাচ্ছে না। দয়া করে কিছু ছবি ডিলিট করুন।");
      }

      await setDoc(doc(db, 'settings', 'general'), siteSettings);
      alert("সেটিংস সফলভাবে সেভ হয়েছে!");
    } catch (err: any) {
      console.error("Failed to save settings", err);
      if (err.message && err.message.includes('exceeds the maximum allowed size')) {
        alert("ভুল: ছবিগুলোর সাইজ বেশি হয়ে গেছে। দয়া করে কম রেজুলেশন বা কম সংখ্যক ছবি দিন।");
      } else {
        alert(err.message || "সেভ করতে সমস্যা হয়েছে।");
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const validateCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponInput.toUpperCase()), where('active', '==', true));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setCouponError("সঠিক কুপন কোড দিন।");
        setAppliedCoupon(null);
      } else {
        const couponData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Coupon;
        setAppliedCoupon(couponData);
        setCouponInput('');
      }
    } catch (err) {
      setCouponError("কুপন যাচাইকরণ ব্যর্থ হয়েছে।");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const trackPixelEvent = (event: string, data?: any) => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', event, data);
    }
  };

  const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Using lower quality (0.5) to ensure we stay within Firestore 1MB limit for site settings
        resolve(canvas.toDataURL('image/jpeg', 0.5)); 
      };
    });
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    const total = checkingOutProduct ? checkingOutProduct.price : cartTotal;
    if (appliedCoupon.type === 'fixed') return appliedCoupon.value;
    return Math.round((total * appliedCoupon.value) / 100);
  };

  const isOrganic = (category?: string) => {
    return ['honey', 'oil-ghee', 'fruits'].includes(category || '');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setShowCart(true);
    trackPixelEvent('AddToCart', { content_ids: [product.id], content_name: product.name, value: product.price, currency: 'BDT' });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const trackOrder = async () => {
    if (!trackingId.trim()) return;
    setIsSearchingOrder(true);
    setTrackingResult(null);
    try {
      const docRef = doc(db, 'orders', trackingId.trim());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTrackingResult({ id: docSnap.id, ...docSnap.data() });
      } else {
        setTrackingResult('not-found');
      }
    } catch (err) {
      console.error(err);
      setTrackingResult('error');
    } finally {
      setIsSearchingOrder(false);
    }
  };

  useEffect(() => {
    if (!viewingProduct) {
      setReviews([]);
      return;
    }

    const q = query(
      collection(db, `products/${viewingProduct.id}/reviews`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      const revs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(revs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `products/${viewingProduct.id}/reviews`);
    });

    return () => unsubscribeReviews();
  }, [viewingProduct]);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed error object:", error);
      let message = "লগইন করা সম্ভব হয়নি।";
      
      if (error.code === 'auth/popup-blocked') {
        message = "পপআপ ব্লক করা হয়েছে! অনুগ্রহ করে আপনার ব্রাউজারের পপআপ সেটিং চেক করুন।";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "এই ডোমেইনটি (Domain) Firebase-এ অনুমোদিত নয়। অনুগ্রহ করে Firebase Console-এ গিয়ে এই ডোমেইনটি 'Authorized Domains' লিস্টে যোগ করুন।";
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        message = "লগইন প্রসেসটি বাতিল করা হয়েছে।";
      } else if (error.message) {
        message += "\nত্রুটি: " + error.message;
      }
      
      alert(message);
    }
  };

  const logout = () => signOut(auth);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Set canvas dimensions to the cropped area size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Final resize/compression
    const finalCanvas = document.createElement('canvas');
    const MAX_SIZE = 600;
    let width = canvas.width;
    let height = canvas.height;

    if (width > height) {
      if (width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
      }
    } else {
      if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
      }
    }

    finalCanvas.width = width;
    finalCanvas.height = height;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx?.drawImage(canvas, 0, 0, width, height);

    // WebP output
    return finalCanvas.toDataURL('image/webp', 0.8);
  };

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleAdjustFinish = async () => {
    if (!imageToAdjust || !croppedAreaPixels) return;

    try {
      setImageUploading(true);
      const croppedImage = await getCroppedImg(imageToAdjust, croppedAreaPixels);
      
      setEditingProduct(prev => {
        const currentImages = prev?.images || (prev?.image ? [prev.image] : []);
        const updatedImages = [...currentImages, croppedImage].slice(0, 5);
        return { 
          ...prev, 
          image: updatedImages[0], 
          images: updatedImages 
        };
      });

      // Move to next image in queue or close
      const nextQueue = [...imageAdjustQueue];
      const nextImage = nextQueue.shift();
      setImageAdjustQueue(nextQueue);
      
      if (nextImage) {
        setImageToAdjust(nextImage);
      } else {
        setImageToAdjust(null);
      }
    } catch (err) {
      console.error("Adjustment failed", err);
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImageUploading(true);
    const newImageQueue: string[] = [];
    
    try {
      for (const file of Array.from(files) as File[]) {
        // Optimize image before reading
        const optimizedFile = await optimizeImage(file);
        const dataUrl = await fileToBase64(optimizedFile);
        newImageQueue.push(dataUrl);
      }

      if (imageToAdjust) {
        setImageAdjustQueue(prev => [...prev, ...newImageQueue]);
      } else {
        const first = newImageQueue.shift();
        setImageToAdjust(first || null);
        setImageAdjustQueue(newImageQueue);
      }
    } catch (err) {
      console.error("Image upload/optimization failed", err);
      alert("ছবি আপলোড বা অপ্টিমাইজেশনে সমস্যা হয়েছে।");
    } finally {
      setImageUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setEditingProduct(prev => {
      if (!prev?.images) return prev;
      const updated = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: updated,
        image: updated[0] || ''
      };
    });
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price || !editingProduct?.image) {
      alert("দয়া করে নাম, মূল্য এবং অন্তত একটি ছবি দিন।");
      return;
    }

    try {
      const data = {
        ...editingProduct,
        price: Number(editingProduct.price),
        originalPrice: editingProduct.originalPrice ? Number(editingProduct.originalPrice) : null,
        stock: editingProduct.stock ?? true,
        updatedAt: serverTimestamp(),
      };

      if (editingProduct.id) {
        const { id, ...updateData } = data;
        await updateDoc(doc(db, 'products', id), updateData);
        alert("পণ্য সফলভাবে আপডেট করা হয়েছে!");
      } else {
        await addDoc(collection(db, 'products'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        alert("নতুন পণ্য সফলভাবে যোগ করা হয়েছে!");
      }
      setEditingProduct(null);
    } catch (error) {
      handleLocalFirestoreError(error, editingProduct.id ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setDeletingProductId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
      setDeletingOrderId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'coupons', id));
      setDeletingCouponId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `coupons/${id}`);
    }
  };

  const saveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;
    try {
      if (editingCoupon.id) {
        await setDoc(doc(db, 'coupons', editingCoupon.id), {
          ...editingCoupon,
          active: editingCoupon.active !== false,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'coupons'), {
          ...editingCoupon,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setEditingCoupon(null);
    } catch (error) {
      handleFirestoreError(error, editingCoupon.id ? OperationType.UPDATE : OperationType.CREATE, `coupons/${editingCoupon.id || ''}`);
    }
  };

  const openWhatsApp = (productName?: string) => {
    const text = productName 
      ? `আমি "${productName}" অর্ডার করতে চাই।` 
      : "আমি আপনাদের পণ্য সম্পর্কে জানতে চাই।";
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !viewingProduct) return;
    if (submittingReview) return;

    setSubmittingReview(true);
    try {
      await addDoc(collection(db, `products/${viewingProduct.id}/reviews`), {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: serverTimestamp(),
      });
      setNewReview({ rating: 5, comment: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${viewingProduct.id}/reviews`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'cod' as 'bkash' | 'nagad' | 'cod',
    transactionId: ''
  });
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data && data.display_name) {
            setCheckoutForm(prev => ({ ...prev, address: data.display_name }));
          } else {
            setCheckoutForm(prev => ({ ...prev, address: `Lat: ${latitude}, Lon: ${longitude}` }));
          }
        } catch (error) {
          console.error("Error fetching address:", error);
          setCheckoutForm(prev => ({ ...prev, address: `Lat: ${latitude}, Lon: ${longitude}` }));
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert(error.code === 1 ? "Location access denied. Please enable location permissions." : "Location unavailable.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleSocialShare = (platform: 'facebook' | 'twitter' | 'whatsapp', product: Product) => {
    const url = window.location.origin + `?product=${product.id}`;
    const text = encodeURIComponent(`${product.name} - Shadhin Bazar Organic Food. মূল্য: ৳${product.price}`);
    const shareUrl = encodeURIComponent(url);

    let finalUrl = '';
    switch (platform) {
      case 'facebook':
        finalUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
        break;
      case 'twitter':
        finalUrl = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`;
        break;
      case 'whatsapp':
        finalUrl = `https://wa.me/?text=${text}%20${shareUrl}`;
        break;
    }
    
    window.open(finalUrl, '_blank', 'noreferrer,noopener');
    trackPixelEvent('Share', { platform, product_name: product.name });
  };

  const handleShare = async (product: Product) => {
    const shareData = {
      title: product.name,
      text: `${product.name} - Shadhin Bazar Organic Food. মূল্য: ৳${product.price}`,
      url: window.location.href + `?product=${product.id}`
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Share failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        alert('Product link copied to clipboard!');
      } catch (err) {
        console.error('Clipboard failed:', err);
      }
    }
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkingOutProduct && cart.length === 0) return;
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      alert("সবগুলো তথ্য সঠিকভাবে পূরণ করুন।");
      return;
    }

    const items = checkingOutProduct 
      ? [{ ...checkingOutProduct, quantity: 1 }] 
      : cart;
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = calculateDiscount();
    const finalAmount = subtotal - discount;

    setIsPlacingOrder(true);
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...checkoutForm,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal,
        discountAmount: discount,
        totalAmount: finalAmount,
        userId: user?.uid || null,
        status: 'pending',
        createdAt: serverTimestamp(),
        couponCode: appliedCoupon?.code || null
      });

      // Meta Pixel Purchase Event
      trackPixelEvent('Purchase', {
        value: finalAmount,
        currency: 'BDT',
        content_name: items.map(item => item.name).join(', '),
        content_ids: items.map(item => item.id),
        content_type: 'product'
      });
      
      alert(`আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে! \n\nআপনার অর্ডার আইডি: ${docRef.id}\n\nআমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।`);
      setCheckingOutProduct(null);
      setCart([]);
      setViewingProduct(null);
      setAppliedCoupon(null);
      setCheckoutForm({ name: '', phone: '', address: '', paymentMethod: 'cod', transactionId: '' });
      setShowCart(false);
      setShowCartCheckout(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!viewingProduct || !confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, `products/${viewingProduct.id}/reviews`, reviewId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${viewingProduct.id}/reviews/${reviewId}`);
    }
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkUploading(true);
    setBulkError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          const data = results.data as any[];
          
          if (data.length === 0) {
            setBulkError("ফাইলটি খালি অথবা ভুল ফরম্যাটে আছে।");
            setBulkUploading(false);
            return;
          }

          data.forEach((row) => {
            const productRef = doc(collection(db, 'products'));
            batch.set(productRef, {
              name: row.name?.toString() || 'Unnamed Product',
              description: row.description?.toString() || '',
              price: Number(row.price) || 0,
              originalPrice: row.originalPrice ? Number(row.originalPrice) : null,
              image: row.image?.toString() || 'https://images.unsplash.com/photo-1584362917165-526a963579e8?auto=format&fit=crop&q=80',
              category: row.category?.toString() || 'others',
              stock: (row.stock === 'true' || row.stock === '1' || row.stock === true),
              certifications: row.certifications ? row.certifications.toString().split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0) : [],
              createdAt: serverTimestamp()
            });
          });

          await batch.commit();
          alert(`${data.length}টি পণ্য সফলভাবে আপলোড করা হয়েছে!`);
          event.target.value = ''; // Reset input
        } catch (error) {
          console.error("Bulk upload failed", error);
          setBulkError("বাল্ক আপলোড ব্যর্থ হয়েছে। অনুগ্রহ করে ফাইল ফরম্যাট চেক করুন।");
        } finally {
          setBulkUploading(false);
        }
      },
      error: (error) => {
        console.error("CSV Parsing failed", error);
        setBulkError("CSV ফাইলটি পড়া সম্ভব হয়নি।");
        setBulkUploading(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-forest"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-white selection:bg-forest/10 selection:text-forest overflow-x-hidden no-scrollbar">
      <AnimatePresence>
        {viewingProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center overflow-hidden"
            onClick={() => setViewingProduct(null)}
          >
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-white w-full max-w-4xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-y-auto min-h-[50vh] max-h-[92vh] md:max-h-[90vh] no-scrollbar relative flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative">
                <button 
                  onClick={() => setViewingProduct(null)}
                  className="absolute top-4 right-4 md:top-6 md:right-6 z-20 bg-white/90 backdrop-blur p-2.5 rounded-full text-slate-900 hover:bg-white transition-all shadow-xl border border-slate-100"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div className="grid md:grid-cols-2">
                  <div className="bg-slate-50 flex flex-col">
                    {/* Top Thumbnail Gallery for mobile/desktop */}
                    {viewingProduct.images && viewingProduct.images.length > 1 && (
                      <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar bg-white border-b border-slate-100">
                        {viewingProduct.images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveImageIndex(i)}
                            className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                              i === activeImageIndex ? 'border-forest ring-2 ring-forest/20' : 'border-slate-100'
                            }`}
                          >
                            <img loading="lazy" src={img} className="w-full h-full object-cover" alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div 
                      className="aspect-[4/3] md:aspect-square bg-slate-100 relative group/viewer overflow-hidden cursor-zoom-in"
                      onClick={() => setShowLightbox(true)}
                    >
                      <img 
                        loading="lazy"
                        src={viewingProduct.images && viewingProduct.images.length > 0 ? viewingProduct.images[activeImageIndex] : viewingProduct.image} 
                        alt={viewingProduct.name} 
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                      />
                      
                      <div className="absolute inset-0 bg-black/0 group-hover/viewer:bg-black/20 transition-all flex items-center justify-center">
                        <Maximize2 className="w-10 h-10 text-white opacity-0 group-hover/viewer:opacity-100 scale-50 group-hover/viewer:scale-100 transition-all duration-300 shadow-xl" />
                      </div>
                      
                      {viewingProduct.images && viewingProduct.images.length > 1 && (
                        <>
                          <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2 z-10">
                            {viewingProduct.images.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setActiveImageIndex(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === activeImageIndex ? 'bg-forest w-6' : 'bg-white/50'}`}
                              />
                            ))}
                          </div>
                        <button 
                          onClick={() => setActiveImageIndex(prev => (prev > 0 ? prev - 1 : viewingProduct.images!.length - 1))}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover/viewer:opacity-100 transition-opacity"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => setActiveImageIndex(prev => (prev < viewingProduct.images!.length - 1 ? prev + 1 : 0))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover/viewer:opacity-100 transition-opacity"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}
                    </div>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col max-h-[80vh] overflow-y-auto no-scrollbar">
                    <div className="mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="space-y-1">
                          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{viewingProduct.name}</h2>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-lime/20 text-forest text-[10px] font-bold rounded-full uppercase tracking-wider">
                              {CATEGORIES.find(c => c.id === viewingProduct.category)?.name || 'অন্যান্য'}
                            </span>
                            <div className="flex items-center gap-1.5 ml-1">
                               <div className={`w-1.5 h-1.5 rounded-full ${viewingProduct.stock ? 'bg-forest' : 'bg-red-500'}`}></div>
                               <span className={`text-[10px] font-bold uppercase tracking-wider ${viewingProduct.stock ? 'text-forest' : 'text-red-500'}`}>
                                 {viewingProduct.stock ? 'স্টক এ আছে' : 'আউট অফ স্টক'}
                               </span>
                            </div>
                          </div>
                          {viewingProduct.certifications && viewingProduct.certifications.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {viewingProduct.certifications.map(cert => (
                                <span key={cert} className="flex items-center gap-1 px-2 py-0.5 bg-forest/5 text-forest text-[9px] font-black rounded-md border border-forest/10 uppercase tracking-tighter">
                                  <ShieldCheck className="w-2.5 h-2.5" /> {cert}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-start sm:items-end">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-black text-forest">৳{viewingProduct.price}</span>
                            {viewingProduct.originalPrice && viewingProduct.originalPrice > viewingProduct.price && (
                              <span className="text-lg text-slate-400 line-through">৳{viewingProduct.originalPrice}</span>
                            )}
                          </div>
                          {viewingProduct.originalPrice && viewingProduct.originalPrice > viewingProduct.price && (
                            <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                              {Math.round(((viewingProduct.originalPrice - viewingProduct.price) / viewingProduct.originalPrice) * 100)}% ছাড়
                            </span>
                          )}
                        </div>
                      </div>

                       {/* Primary Order Action */}
                       <div className="space-y-3 mb-10">
                         <div className="flex flex-col sm:flex-row gap-3">
                           <button 
                             onClick={() => {
                               setCheckingOutProduct(viewingProduct);
                               trackPixelEvent('InitiateCheckout', {
                                 content_name: viewingProduct.name,
                                 content_ids: [viewingProduct.id],
                                 content_type: 'product',
                                 value: viewingProduct.price,
                                 currency: 'BDT'
                               });
                             }}
                             disabled={!viewingProduct.stock}
                             className="flex-1 py-5 bg-forest hover:bg-[#23451e] text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-[0_15px_30px_-5px_rgba(33,65,30,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale group"
                           >
                             <ShoppingBag className="w-7 h-7 text-lime group-hover:animate-bounce" />
                             সরাসরি অর্ডার
                           </button>
                           
                           <button 
                             onClick={() => {
                               addToCart(viewingProduct);
                             }}
                             disabled={!viewingProduct.stock}
                             className="flex-1 py-5 bg-lime/10 hover:bg-lime/20 text-forest rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 border-2 border-lime/20 active:scale-[0.98] transition-all disabled:opacity-50 group"
                           >
                             <Plus className="w-7 h-7 text-forest group-hover:rotate-90 transition-transform" />
                             কার্টে যোগ করুন
                           </button>
                         </div>

                        <div className="grid grid-cols-1 gap-3">
                          <a 
                            href={`https://wa.me/8801848005511?text=সালাম, আমি এই পণ্যটি সম্পর্কে জানতে চাই: ${viewingProduct.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackPixelEvent('Contact', { 
                              content_name: viewingProduct.name,
                              content_ids: [viewingProduct.id]
                            })}
                            className="py-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#075E54] rounded-[1.5rem] font-black flex items-center justify-center gap-3 border-2 border-[#25D366]/20 transition-all active:scale-95 group"
                          >
                            <svg className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            হোয়াটসঅ্যাপে ইনবক্স করুন
                          </a>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                           <a 
                            href="tel:01848005511"
                            className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-sm sm:text-base border border-slate-200/50"
                          >
                            <PhoneCall className="w-5 h-5 text-forest" />
                             সরাসরি কল
                          </a>
                          <button 
                            onClick={() => handleShare(viewingProduct)}
                            className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 text-sm sm:text-base border border-slate-200/50"
                          >
                            <Share2 className="w-5 h-5 text-forest" />
                            শেয়ার
                          </button>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">সোশ্যাল মিডিয়ায় শেয়ার করুন</p>
                          <div className="flex justify-center gap-6">
                            <button 
                              onClick={() => handleSocialShare('facebook', viewingProduct)} 
                              className="w-12 h-12 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center hover:bg-[#1877F2]/20 transition-all shadow-sm border border-[#1877F2]/10 active:scale-90"
                              title="Facebook"
                            >
                              <Facebook className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleSocialShare('twitter', viewingProduct)} 
                              className="w-12 h-12 bg-slate-900/10 text-slate-900 rounded-full flex items-center justify-center hover:bg-slate-900/20 transition-all shadow-sm border border-slate-900/10 active:scale-90"
                              title="Twitter"
                            >
                              <Twitter className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleSocialShare('whatsapp', viewingProduct)} 
                              className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center hover:bg-[#25D366]/20 transition-all shadow-sm border border-[#25D366]/10 active:scale-90"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group mb-8">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                          পণ্যের বিবরণ
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-base sm:text-lg font-medium">
                          {viewingProduct.description || "১০০% খাঁটি ও প্রাকৃতিক উপাদান সরাসরি মাঠ থেকে সংগৃহীত। এতে কোনো কৃত্রিম রং বা প্রিজারভেটিভ ব্যবহার করা হয়নি। নিরাপদ ও পুষ্টিকর খাবার আমাদের অঙ্গীকার।"}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-8 mt-auto">
                      <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2">
                        রিভিউ ও রেটিং 
                        <span className="text-sm font-normal text-slate-400">({reviews.length})</span>
                      </h3>

                      {/* Review List */}
                      <div className="space-y-6 mb-8">
                        {reviews.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-400 text-sm">এই পণ্যে এখনো কোনো রিভিউ নেই। প্রথম রিভিউটি দিন!</p>
                          </div>
                        ) : (
                          reviews.map(review => (
                            <div key={review.id} className="group relative">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-800 text-sm">{review.userName}</span>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star 
                                      key={star} 
                                      className={`w-3 h-3 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} 
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-slate-600 text-sm leading-relaxed">{review.comment}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] text-slate-400 italic">
                                  {review.createdAt?.toDate?.() ? review.createdAt.toDate().toLocaleDateString('bn-BD') : 'এখন মাত্র'}
                                </span>
                                {(isAdmin || user?.uid === review.userId) && (
                                  <button 
                                    onClick={() => deleteReview(review.id)}
                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                    title="মুছে ফেলুন"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Review */}
                      {user ? (
                        <form onSubmit={submitReview} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <h4 className="font-bold text-sm text-slate-900 mb-4">আপনার মূল্যবান মতামত দিন</h4>
                          <div className="flex items-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewReview({...newReview, rating: star})}
                                className="transition-transform active:scale-110"
                              >
                                <Star className={`w-6 h-6 ${star <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 hover:text-yellow-200'}`} />
                              </button>
                            ))}
                          </div>
                          <textarea 
                            required
                            placeholder="আপনার অভিজ্ঞতা শেয়ার করুন..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-forest outline-none text-sm min-h-[100px] bg-white"
                            value={newReview.comment}
                            onChange={e => setNewReview({...newReview, comment: e.target.value})}
                          />
                          <button 
                            type="submit"
                            disabled={submittingReview}
                            className="w-full mt-4 py-3 bg-forest text-white rounded-xl font-bold text-sm shadow-md hover:bg-[#23451e] transition-all disabled:opacity-50"
                          >
                            {submittingReview ? "পাঠানো হচ্ছে..." : "রিভিউ জমা দিন"}
                          </button>
                        </form>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-slate-500 text-sm mb-3">রিভিউ দিতে লগইন করুন</p>
                          <button onClick={login} className="text-forest font-bold text-sm hover:underline">লগইন করুন</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Product Image Lightbox */}
      <AnimatePresence>
        {showLightbox && viewingProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center backdrop-blur-md"
            onClick={() => setShowLightbox(false)}
          >
            <button 
              onClick={() => setShowLightbox(false)}
              className="absolute top-8 right-8 z-[210] p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all shadow-2xl backdrop-blur-md border border-white/10 group"
            >
              <X className="w-8 h-8 group-hover:scale-110 transition-transform" />
            </button>

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center p-4 sm:p-12 md:p-20"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <motion.img 
                  key={activeImageIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  src={viewingProduct.images && viewingProduct.images.length > 0 ? viewingProduct.images[activeImageIndex] : viewingProduct.image} 
                  alt={viewingProduct.name} 
                  className="max-w-full max-h-[80vh] sm:max-h-full object-contain rounded-xl shadow-2xl" 
                  loading="lazy"
                  decoding="async"
                />

                {viewingProduct.images && viewingProduct.images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(prev => (prev > 0 ? prev - 1 : viewingProduct.images!.length - 1));
                      }}
                      className="absolute left-0 sm:-left-16 md:-left-24 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/10 group shadow-2xl"
                    >
                      <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(prev => (prev < viewingProduct.images!.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-0 sm:-right-16 md:-right-24 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/10 group shadow-2xl"
                    >
                      <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Lightbox Thumbnails */}
                    <div className="absolute -bottom-8 sm:-bottom-16 md:-bottom-24 left-1/2 -translate-x-1/2 flex gap-3 p-2 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 overflow-x-auto no-scrollbar max-w-[90vw]">
                      {viewingProduct.images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImageIndex(i)}
                          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                            i === activeImageIndex ? 'border-lime ring-4 ring-lime/20' : 'border-white/20 opacity-50 hover:opacity-100'
                          }`}
                        >
                          <img loading="lazy" src={img} className="w-full h-full object-cover" alt="" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {deletingProductId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeletingProductId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                এই পণ্যটি মুছে ফেলতে চাচ্ছেন? মুছে ফেলার পর তথ্যটি আর পুনরুদ্ধার করা যাবে না।
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingProductId(null)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                >
                  বাতিল
                </button>
                <button 
                  onClick={() => deleteProduct(deletingProductId)}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 transition-all"
                >
                  হ্যাঁ, মুছুন
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {deletingOrderId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeletingOrderId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">অর্ডার ডিলিট করুন?</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                আপনি কি নিশ্চিতভাবে এই অর্ডারটি মুছে ফেলতে চাচ্ছেন?
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingOrderId(null)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                >
                  বাতিল
                </button>
                <button 
                  onClick={() => deleteOrder(deletingOrderId)}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 transition-all"
                >
                  হ্যাঁ, মুছুন
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {deletingCouponId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeletingCouponId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">কুপন ডিলিট করুন?</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                আপনি কি নিশ্চিতভাবে এই কুপনটি মুছে ফেলতে চাচ্ছেন?
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingCouponId(null)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                >
                  বাতিল
                </button>
                <button 
                  onClick={() => deleteCoupon(deletingCouponId)}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 transition-all"
                >
                  হ্যাঁ, মুছুন
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {(checkingOutProduct || showCartCheckout) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center overflow-hidden"
            onClick={() => {
              setCheckingOutProduct(null);
              setShowCartCheckout(false);
            }}
          >
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative max-h-[92vh] md:max-h-[90vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-forest p-5 md:p-8 text-white sticky top-0 z-10 shrink-0">
                <button 
                  onClick={() => {
                    setCheckingOutProduct(null);
                    setShowCartCheckout(false);
                  }}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div className="pr-12">
                  <h3 className="text-xl md:text-2xl font-bold mb-1">অর্ডার কনফার্ম করুন</h3>
                  <p className="text-lime/90 text-xs md:text-sm">আপনার তথ্যগুলো নির্ভুলভাবে দিন।</p>
                </div>
              </div>

              <form onSubmit={placeOrder} className="p-5 md:p-8 space-y-4 md:space-y-6 flex-1 overflow-y-auto no-scrollbar pb-32 md:pb-8">
                {checkingOutProduct ? (
                  <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                    <img loading="lazy" src={checkingOutProduct.image} alt={checkingOutProduct.name} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-xl shadow-sm" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">{checkingOutProduct.name}</h4>
                      <p className="text-forest font-black text-sm sm:text-base">৳{checkingOutProduct.price}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 mb-2 overflow-hidden">
                    <div className="p-3 bg-slate-100/50 border-b border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase">কার্ট আইটেমস ({cart.length})</p>
                    </div>
                    <div className="max-h-32 overflow-y-auto p-3 space-y-2">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700 line-clamp-1 flex-1">{item.name} x {item.quantity}</span>
                          <span className="font-bold text-slate-900 ml-2">৳{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">সাব-টোটাল</span>
                      <span className="text-sm font-black text-forest">৳{cartTotal}</span>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">কুপন কোড (থাকলে দিন)</label>
                  <div className="flex gap-2">
                    <input 
                      placeholder="ENTER CODE"
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-forest outline-none font-mono uppercase text-xs sm:text-sm"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={validateCoupon}
                      disabled={isValidatingCoupon || !couponInput}
                      className="px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] sm:text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                      {isValidatingCoupon ? "অপেক্ষা করুন..." : "প্রয়োগ"}
                    </button>
                  </div>
                  {couponError && <p className="text-[10px] text-red-500 font-bold mt-1">{couponError}</p>}
                  {appliedCoupon && (
                    <div className="mt-2 flex items-center justify-between bg-forest/10 px-3 py-2 rounded-lg">
                      <span className="text-[10px] sm:text-xs font-bold text-forest flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> কুপন "{appliedCoupon.code}" সফল!
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setAppliedCoupon(null)}
                        className="text-[10px] text-red-500 font-bold hover:underline"
                      >
                        বাতিল
                      </button>
                    </div>
                  )}
                </div>

                {appliedCoupon && (
                  <div className="space-y-1 pt-1 sm:pt-2">
                    <div className="flex justify-between text-xs sm:text-sm text-slate-500">
                      <span>সাব-টোটাল:</span>
                      <span>৳{checkingOutProduct.price}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm text-red-500 font-bold">
                      <span>ডিসকাউন্ট:</span>
                      <span>- ৳{calculateDiscount()}</span>
                    </div>
                    <div className="flex justify-between text-base sm:text-lg font-black text-forest border-t border-slate-100 pt-2 mt-1 sm:mt-2">
                      <span>মোট দেয়:</span>
                      <span>৳{checkingOutProduct.price - calculateDiscount()}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                       <UserIcon className="w-4 h-4 text-forest" /> নাম (Name) *
                    </label>
                    <input 
                      required
                      placeholder="আপনার পূর্ণ নাম লিখুন"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-forest focus:ring-0 outline-none transition-all text-base font-medium"
                      value={checkoutForm.name}
                      onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})}
                    />
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                       <Phone className="w-4 h-4 text-forest" /> মোবাইল নম্বর *
                    </label>
                    <input 
                      required
                      type="tel"
                      placeholder="আপনার ১১ ডিজিটের মোবাইল নম্বর"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-forest focus:ring-0 outline-none transition-all text-base font-medium"
                      value={checkoutForm.phone}
                      onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})}
                    />
                  </div>

                  {/* Address Input */}
                  <div>
                    <div className="flex justify-between items-end mb-1.5">
                      <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                         <MapPin className="w-4 h-4 text-forest" /> পূর্ণ ঠিকানা (Full Address) *
                      </label>
                      <button 
                        type="button"
                        onClick={handleUseLocation}
                        disabled={isLocating}
                        className="text-[10px] font-bold text-forest bg-lime/10 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-lime/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isLocating ? (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Navigation className="w-2.5 h-2.5" />
                        )}
                        {isLocating ? 'খুঁজছি...' : 'লোকেশন অটো সেট করুন'}
                      </button>
                    </div>
                    <textarea 
                      required
                      rows={3}
                      placeholder="বাসা নং, রোড নং, গ্রাম/মহল্লা বিস্তারিত লিখুন"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-forest focus:ring-0 outline-none transition-all text-base font-medium resize-none shadow-inner"
                      value={checkoutForm.address}
                      onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})}
                    />
                  </div>

                  {/* Hidden/Optional Payment Section for "Advanced" users but focusing on COD by default */}
                  {(checkingOutProduct ? isOrganic(checkingOutProduct.category) : cart.some(item => isOrganic(item.category))) && (
                    <div className="pt-4 mt-2 border-t border-dashed border-slate-200">
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <p className="text-[10px] sm:text-xs text-amber-800 font-bold mb-2 flex items-center gap-2">
                          <Clock className="w-3 h-3" /> অর্গানিক আইটেম নোটিশ
                        </p>
                        <p className="text-[10px] leading-relaxed text-amber-700 mb-3">
                          অর্গানিক আইটেমের জন্য আমাদের <span className="font-bold underline select-all">01848005511</span> নম্বরে পেমেন্ট করে TrxID দিন। বাকি আইটেমে ক্যাশ অন ডেলিভারি পাবেন।
                        </p>
                        <input 
                          placeholder="পেমেন্ট করলে TrxID দিন (ঐচ্ছিক)"
                          className="w-full px-4 py-2 bg-white border border-amber-200 rounded-xl outline-none font-mono uppercase text-xs"
                          value={checkoutForm.transactionId}
                          onChange={e => setCheckoutForm({...checkoutForm, transactionId: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Footer for Form */}
                <div className="fixed md:relative bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100 md:border-none md:p-0 md:bg-transparent z-20">
                  <button 
                    disabled={isPlacingOrder}
                    type="submit"
                    className="w-full py-4 bg-forest hover:bg-[#1e3d1a] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {isPlacingOrder ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
                        অর্ডার নিশ্চিত করুন
                      </>
                    )}
                  </button>
                  <p className="text-center text-[9px] md:text-[10px] text-slate-400 mt-3 md:mt-4 font-bold uppercase tracking-widest hidden md:block">
                    ১০০% খাঁটি ও নিরাপদ ডেলিভারির নিশ্চয়তা
                  </p>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Policy, About, & Tracking Modals */}
      <AnimatePresence>
        {showAbout && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAbout(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 sm:p-10 md:p-12 overflow-y-auto max-h-[90vh] relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-forest/10 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-forest" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">আমাদের সম্পর্কে</h3>
                </div>
                <button onClick={() => setShowAbout(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="prose prose-slate max-w-none text-slate-600 space-y-4 sm:space-y-6 leading-relaxed text-sm sm:text-base">
                <p className="text-base sm:text-lg font-bold text-slate-800 italic">"প্রকৃতির বিশুদ্ধতা আপনার হাতের নাগালে"</p>
                <p>
                  <span className="font-extrabold text-forest">স্বাধীন বাজার (Shadhin Bazar)</span> মূলত একটি স্বাস্থ্যসম্মত খাদ্যপণ্য সরবরাহকারী প্রতিষ্ঠান। আমরা বিশ্বাস করি, সুস্থ জীবনের মূল ভিত্তি হলো বিশুদ্ধ ও প্রাকৃতিক খাবার। বর্তমানের ভেজাল মিশ্রিত খাবারের যুগে আমরা আপনাকে দিচ্ছি সরাসরি প্রকৃতি থেকে সংগৃহীত সেরা মানের অর্গানিক পণ্য।
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-forest font-black text-xs sm:text-sm mb-1 uppercase tracking-wider">আমাদের লক্ষ্য</p>
                    <p className="text-xs text-slate-600">সুস্থ সমাজ গড়তে প্রতিটি ঘরে বিশুদ্ধ খাবার পৌঁছে দেওয়া।</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-forest font-black text-xs sm:text-sm mb-1 uppercase tracking-wider">কেন আমরা?</p>
                    <p className="text-xs text-slate-600">কোনো কেমিক্যাল বা প্রিজারভেটিভ ছাড়া ১০০% গ্যারান্টিযুক্ত পণ্য।</p>
                  </div>
                </div>
                <p>
                  আমাদের সংগ্রহে রয়েছে খাঁটি মধু, ঘানি ভাঙ্গা সরিষার তেল, দেশি ঘি এবং রাসায়নিকমুক্ত মৌসুমী ফল। প্রতিটি আইটেম আমরা কঠোর মান নিয়ন্ত্রণের মাধ্যমে আপনাদের কাছে পৌঁছে দিই।
                </p>
              </div>
              <button 
                onClick={() => setShowAbout(false)}
                className="w-full mt-8 sm:mt-10 py-3 sm:py-4 bg-forest text-white rounded-2xl font-bold shadow-lg hover:bg-[#23451e] transition-all active:scale-[0.98]"
              >
                বন্ধ করুন
              </button>
            </motion.div>
          </motion.div>
        )}

        {showTracking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
            onClick={() => { setShowTracking(false); setTrackingResult(null); setTrackingId(''); }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 sm:p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-forest/10 rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5 text-forest" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">অর্ডার ট্র্যাকিং</h3>
                </div>
                <button onClick={() => { setShowTracking(false); setTrackingResult(null); setTrackingId(''); }} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">আপনার অর্ডার আইডি দিন</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input 
                      placeholder="Order ID"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-forest outline-none font-mono text-sm uppercase"
                      value={trackingId}
                      onChange={e => setTrackingId(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && trackOrder()}
                    />
                  </div>
                  <button 
                    onClick={trackOrder}
                    disabled={isSearchingOrder || !trackingId}
                    className="p-3 bg-forest text-white rounded-xl hover:bg-[#23451e] transition-all disabled:opacity-50 shadow-lg active:scale-95"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isSearchingOrder && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-slate-400 font-bold">অর্ডার খোঁজা হচ্ছে...</p>
                </div>
              )}

              {trackingResult === 'not-found' && (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-center">
                  <p className="text-sm text-orange-600 font-bold">দুঃখিত! এই আইডিতে কোনো অর্ডার পাওয়া যায়নি। সঠিক আইডি দিয়ে আবার চেষ্টা করুন।</p>
                </div>
              )}

              {trackingResult && trackingResult !== 'not-found' && trackingResult !== 'error' && (
                <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">{trackingResult.productName}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {trackingResult.id.slice(-8)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                      trackingResult.status === 'completed' ? 'bg-forest/10 text-forest' : 
                      trackingResult.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                      'bg-orange-50 text-orange-500'
                    }`}>
                      {trackingResult.status === 'completed' ? 'সম্পন্ন' : trackingResult.status === 'cancelled' ? 'বাতিল' : 'অপেক্ষমান'}
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-slate-200">
                    <div className="flex justify-between text-[11px] sm:text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">টাকার পরিমাণ:</span>
                      <span className="text-slate-900 font-bold">৳{trackingResult.totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-[11px] sm:text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">পেমেন্ট মেথড:</span>
                      <span className="text-slate-900 font-bold capitalize">{trackingResult.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between text-[11px] sm:text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">অর্ডার সময়:</span>
                      <span className="text-slate-900 font-bold text-right">
                        {trackingResult.createdAt?.toDate?.() ? trackingResult.createdAt.toDate().toLocaleString('bn-BD', { dateStyle: 'medium' }) : 'অজানা'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row gap-2">
                    <button 
                      onClick={() => window.open(`tel:01848005511`)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition-all"
                    >
                      <Phone className="w-3 h-3" /> কল করুন
                    </button>
                    <button 
                      onClick={() => window.open(`https://wa.me/8801848005511?text=${encodeURIComponent(`আমার অর্ডার স্ট্যাটাস জানতে চাই। আইডি: ${trackingResult.id}`)}`, "_blank")}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-xs font-bold hover:bg-[#128C7E] transition-all"
                    >
                      <Phone className="w-3 h-3 fill-current" /> হোয়াটসঅ্যাপ
                    </button>
                  </div>
                </div>
              )}

              {trackingResult === 'error' && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
                  <p className="text-sm text-red-500 font-bold">কিছু একটা ভুল হয়েছে। দয়া করে আবার চেষ্টা করুন।</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {showOrders && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowOrders(false)}
          >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-8 max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-forest/10 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-forest" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900">অর্ডার হিস্ট্রি</h3>
                      <p className="text-xs text-slate-500">পূর্ববর্তী অর্ডারগুলো দেখুন</p>
                    </div>
                  </div>
                  <button onClick={() => setShowOrders(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                  {userOrders.length === 0 ? (
                    <div className="text-center py-16 sm:py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium">আপনি এখনো কোনো অর্ডার করেননি।</p>
                      <button 
                        onClick={() => setShowOrders(false)}
                        className="mt-4 text-forest font-bold text-sm hover:underline"
                      >
                        এখনই শপিং শুরু করুন
                      </button>
                    </div>
                  ) : (
                    userOrders.map((order) => (
                      <div key={order.id} className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm hover:border-forest transition-all group">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-3">
                          <div className="flex gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic text-white text-xs shrink-0 ${order.paymentMethod === 'bkash' ? 'bg-pink-500' : 'bg-orange-500'}`}>
                              {order.paymentMethod === 'bkash' ? 'b' : 'n'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">{order.productName}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {order.id.slice(-8)}</p>
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                            <div className="text-base sm:text-lg font-black text-forest">৳{order.totalAmount}</div>
                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              order.status === 'completed' ? 'bg-forest/10 text-forest' : 
                              order.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                              'bg-orange-50 text-orange-500'
                            }`}>
                              {order.status === 'completed' ? 'সম্পন্ন' : order.status === 'cancelled' ? 'বাতিল' : 'অপেক্ষমান'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-50 gap-2">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                            <span className="text-slate-400 font-bold uppercase tracking-wider">পেমেন্ট: <span className="text-slate-900">{order.paymentMethod}</span></span>
                            <span className="text-slate-400 font-bold uppercase tracking-wider">তারিখ: <span className="text-slate-900">{order.createdAt?.toDate?.() ? order.createdAt.toDate().toLocaleDateString('bn-BD') : 'অজানা'}</span></span>
                          </div>
                          <button 
                            onClick={() => {
                              setTrackingId(order.id);
                              trackOrder();
                              setShowTracking(true);
                              setShowOrders(false);
                            }}
                            className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 hover:bg-forest hover:text-white text-slate-600 rounded-lg text-[10px] font-bold transition-all"
                          >
                            বিস্তারিত ট্র্যাকিং
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-100 flex gap-3">
                  <button 
                    onClick={() => window.open(`tel:01848005511`)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    <Phone className="w-3 h-3" /> হেল্পলাইন
                  </button>
                  <button 
                    onClick={() => setShowOrders(false)}
                    className="flex-1 py-3 bg-forest text-white rounded-xl font-bold text-xs shadow-lg hover:bg-[#23451e] transition-all"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </motion.div>
          </motion.div>
        )}

        {showPolicy && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowPolicy(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 md:p-12"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900">
                  {showPolicy === 'return' ? 'রিটার্ন ও রিফান্ড পলিসি' : 'পেমেন্ট পলিসি'}
                </h3>
                <button onClick={() => setShowPolicy(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
                {showPolicy === 'return' ? (
                  <>
                    <p className="font-bold text-slate-800">১. রিটার্ন শর্তাবলী:</p>
                    <p>পণ্য রিসিভ করার সময় যদি প্যাকেজিংয়ে কোনো সমস্যা থাকে বা পণ্যটি ভুল হয়, তবে ডেলিভারি ম্যানের সামনেই রিটার্ন করুন। পচনশীল পণ্যের ক্ষেত্রে পরবর্তীতে অভিযোগ গ্রহণযোগ্য নাও হতে পারে।</p>
                    
                    <p className="font-bold text-slate-800">২. রিফান্ড প্রক্রিয়া:</p>
                    <p>যদি অর্ডারের বিপরীতে অগ্রিম পেমেন্ট করা থাকে এবং পণ্যটি অসম্পূর্ণ বা ভুল হয়, তবে ৩-৫ কার্যদিবসের মধ্যে আপনার পেমেন্ট রিফান্ড করে দেওয়া হবে।</p>
                    
                    <p className="font-bold text-slate-800">৩. কাস্টমার সাপোর্ট:</p>
                    <p>যেকোনো সমস্যার জন্য সরাসরি আমাদের হোয়াটসঅ্যাপ নম্বরে (+৮৮০১৮৪৮০০৫৫১১) অথবা ইমেইল (shadhinorganic@gmail.com) ঠিকানায় যোগাযোগ করুন।</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-800">১. অর্গানিক ফুড পেমেন্ট:</p>
                    <p className="bg-red-50 p-4 border border-red-100 rounded-xl text-red-600">
                      মধূ, তেল, ঘি এবং ফলের মতো অর্গানিক পণ্যগুলোর ক্ষেত্রে ১০০% অগ্রিম পেমেন্ট প্রযোজ্য। কাস্টমার ভুল অর্ডার করলে বা অর্ডার রিসিভ না করলে এই পচনশীল পণ্যগুলো নষ্ট হয়ে যায়, যা আমরা এড়াতে চাই।
                    </p>
                    
                    <p className="font-bold text-slate-800">২. অন্যান্য ক্যাটাগরি:</p>
                    <p>অর্গানিক ফুড ব্যতীত অন্যান্য ক্যাটাগরির পণ্যের ক্ষেত্রে আপনি "Cash on Delivery" সুবিধা পাবেন। তবে চাইলে অগ্রিম পেমেন্টও করতে পারেন।</p>
                    
                    <p className="font-bold text-slate-800">৩. পেমেন্ট মেথড:</p>
                    <p>আমরা বিকাশ (bKash) এবং নগদ (Nagad) এর মাধ্যমে পার্সোনাল নাম্বারে (০১৮৪৮০০৫৫১১) "Send Money" গ্রহণ করি। ট্রানজ্যাকশন সম্পন্ন করার পর অবশ্যই ট্রানজ্যাকশন আইডি সংগ্রহ করে আমাদের দিন।</p>
                  </>
                )}
              </div>

              <button 
                onClick={() => setShowPolicy(null)}
                className="w-full mt-10 py-4 bg-forest text-white rounded-2xl font-bold shadow-lg hover:bg-[#23451e] transition-all"
              >
                ঠিক আছে
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Floating Action Button (FAB) */}
      {isAdmin && !showAdmin && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setShowAdmin(true);
            setEditingProduct({}); // Automatically open add product form
          }}
          className="fixed bottom-8 right-8 z-[90] bg-forest text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:bg-[#23451e] transition-all"
          title="নতুন পণ্য যোগ করুন"
        >
          <Plus className="w-8 h-8" />
        </motion.button>
      )}

      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {showAdmin && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-forest text-white gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold">অ্যাডমিন ড্যাশবোর্ড</h2>
                    <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
                      <button 
                        onClick={() => setAdminTab('products')}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${adminTab === 'products' ? 'bg-white text-forest shadow-lg' : 'text-white/60 hover:text-white'}`}
                      >
                        পণ্যসমূহ
                      </button>
                      <button 
                        onClick={() => setAdminTab('orders')}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${adminTab === 'orders' ? 'bg-white text-forest shadow-lg' : 'text-white/60 hover:text-white'}`}
                      >
                        অর্ডার ({orders.length})
                      </button>
                      <button 
                        onClick={() => setAdminTab('design')}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${adminTab === 'design' ? 'bg-white text-forest shadow-lg' : 'text-white/60 hover:text-white'}`}
                      >
                        ডিজাইন
                      </button>
                      <button 
                        onClick={() => setAdminTab('coupons')}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${adminTab === 'coupons' ? 'bg-white text-forest shadow-lg' : 'text-white/60 hover:text-white'}`}
                      >
                        কুপন ({coupons.length})
                      </button>
                    </div>
                  </div>
                  <p className="text-white/70 text-[10px] sm:text-xs truncate">{user?.email}</p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {(adminTab === 'products' || adminTab === 'coupons') && !editingProduct && !editingCoupon && (
                    <button 
                      onClick={() => adminTab === 'products' ? setEditingProduct({}) : setEditingCoupon({})}
                      className="bg-white text-forest p-2 rounded-full hover:bg-lime transition-all"
                    >
                      <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  )}
                  <button 
                    onClick={() => setShowAdmin(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-all"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
                {adminTab === 'products' ? (
                  <>
                    {!editingProduct && (
                      <div className="mb-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">বাল্ক আপলোড (CSV)</h3>
                            <p className="text-sm text-slate-500">CSV ফাইলের মাধ্যমে একসাথে অনেক পণ্য যোগ করুন।</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer font-bold transition-all text-sm">
                              <Plus className="w-4 h-4" />
                              ফাইল সিলেক্ট করুন
                              <input 
                                type="file" 
                                accept=".csv" 
                                className="hidden" 
                                onChange={handleBulkUpload}
                                disabled={bulkUploading}
                              />
                            </label>
                            {bulkUploading && <span className="text-xs text-forest animate-pulse font-bold">আপলোড হচ্ছে...</span>}
                          </div>
                        </div>
                        {bulkError && <p className="mt-2 text-xs text-red-500 font-medium">{bulkError}</p>}
                        <details className="mt-4">
                          <summary className="text-xs font-bold text-forest cursor-pointer hover:underline">CSV ফরম্যাট নিয়মাবলী</summary>
                          <div className="mt-2 p-4 bg-slate-50 rounded-xl text-[10px] font-mono text-slate-600 overflow-x-auto">
                            <p className="mb-1 text-forest font-bold">প্রয়োজনীয় কলামসমূহ:</p>
                            <p className="mb-2">name, description, price, originalPrice, image, category, stock, certifications</p>
                            <p className="mb-1 text-forest font-bold">উদাহরণ:</p>
                            <code>"কালোজিরা মধু","খাঁটি কালোজিরা ফুল থেকে সংগৃহীত",850,950,"imageUrl","honey",true,"USDA Organic, EU Organic"</code>
                            <p className="mt-2 text-slate-400 italic">* category এর জন্য honey, oil-ghee, fruits, others ব্যবহার করুন।</p>
                          </div>
                        </details>
                      </div>
                    )}

                    {editingProduct ? (
                      <form onSubmit={saveProduct} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
                        <h3 className="text-xl font-bold mb-6 text-slate-900">
                          {editingProduct.id ? "পণ্য এডিট করুন" : "নতুন পণ্য যোগ করুন"}
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">পণ্যের নাম *</label>
                            <input 
                              required
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-forest outline-none"
                              value={editingProduct.name || ''}
                              onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">পণ্যের ছবি সমুহ (একবারে সর্বোচ্চ ৫টি) *</label>
                            
                            {/* Prominent Multi-upload button */}
                            {(editingProduct.images?.length || 0) < 5 ? (
                              <label className="w-full mb-4 flex flex-col items-center justify-center py-6 px-4 bg-lime/10 border-2 border-dashed border-lime/50 rounded-2xl cursor-pointer hover:bg-lime/20 hover:border-forest transition-all group">
                                <div className="flex items-center gap-3 mb-1 text-forest">
                                  <ImageIcon className="w-6 h-6" />
                                  <span className="font-black text-sm">একসাথে অনেক ছবি আপলোড করুন</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                  {editingProduct.images?.length ? `${5 - editingProduct.images.length}টি বাকি আছে` : 'গ্যালারি থেকে ছবি সিলেক্ট করুন'}
                                </p>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  multiple
                                  className="hidden" 
                                  onChange={handleImageUpload}
                                />
                              </label>
                            ) : (
                              <div className="w-full mb-4 py-4 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center">
                                <p className="text-xs font-bold text-slate-400">সর্বোচ্চ ৫টি ছবি যোগ করা হয়েছে</p>
                              </div>
                            )}

                            <div className="grid grid-cols-5 gap-2 mb-3">
                              {(editingProduct.images || (editingProduct.image ? [editingProduct.image] : [])).map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-100 group shadow-sm bg-slate-50">
                                  <img loading="lazy" src={img} className="w-full h-full object-cover" alt="" />
                                  <button 
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  {idx === 0 && <span className="absolute bottom-1 left-1 px-1 py-0.5 bg-forest text-[8px] text-white font-bold rounded">Main</span>}
                                </div>
                              ))}
                              {(editingProduct.images?.length || 0) < 5 && (
                                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-forest hover:bg-slate-50 transition-all group">
                                  <Plus className="w-5 h-5 text-slate-300 group-hover:text-forest" />
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple
                                    className="hidden" 
                                    onChange={handleImageUpload}
                                  />
                                </label>
                              )}
                            </div>
                            {imageUploading && (
                              <div className="text-xs text-forest animate-pulse font-bold mb-2 flex items-center gap-2">
                                <RefreshCw className="w-3 h-3 animate-spin" /> প্রোসেসিং হচ্ছে...
                              </div>
                            )}
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <LinkIcon className="w-3 h-3" />
                              </div>
                              <input 
                                className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-forest outline-none font-mono text-[10px]"
                                placeholder="অথবা সরাসরি প্রথম ছবির ইউআরএল দিন..."
                                value={editingProduct.image || ''}
                                onChange={e => {
                                  const newImages = [...(editingProduct.images || [])];
                                  if (newImages.length === 0) newImages.push(e.target.value);
                                  else newImages[0] = e.target.value;
                                  setEditingProduct({...editingProduct, image: e.target.value, images: newImages});
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">বর্তমান মূল্য (৳) *</label>
                              <input 
                                required
                                type="number"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-forest outline-none"
                                value={editingProduct.price || ''}
                                onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">আগের মূল্য (৳)</label>
                              <input 
                                type="number"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-forest outline-none"
                                value={editingProduct.originalPrice || ''}
                                onChange={e => setEditingProduct({...editingProduct, originalPrice: Number(e.target.value)})}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">বিবরণ</label>
                            <textarea 
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-forest outline-none"
                              rows={3}
                              value={editingProduct.description || ''}
                              onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">ক্যাটাগরি *</label>
                              <select 
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-forest outline-none bg-white"
                                value={editingProduct.category || ''}
                                onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                              >
                                <option value="">নির্বাচন করুন</option>
                                {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2 pt-2 sm:pt-6">
                              <input 
                                type="checkbox"
                                id="stock"
                                checked={editingProduct.stock !== false}
                                onChange={e => setEditingProduct({...editingProduct, stock: e.target.checked})}
                                className="w-5 h-5 accent-forest"
                              />
                              <label htmlFor="stock" className="text-sm font-bold text-slate-700">স্টক এ আছে</label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">অর্গানিক সার্টিফিকেটসমূহ</label>
                            <div className="flex flex-wrap gap-2">
                              {CERTIFICATIONS.map(cert => (
                                <button
                                  key={cert}
                                  type="button"
                                  onClick={() => {
                                    const currentCertifications = editingProduct.certifications || [];
                                    if (currentCertifications.includes(cert)) {
                                      setEditingProduct({...editingProduct, certifications: currentCertifications.filter(c => c !== cert)});
                                    } else {
                                      setEditingProduct({...editingProduct, certifications: [...currentCertifications, cert]});
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                    (editingProduct.certifications || []).includes(cert)
                                      ? 'bg-forest border-forest text-white shadow-md'
                                      : 'bg-white border-slate-200 text-slate-500 hover:border-forest hover:text-forest'
                                  }`}
                                >
                                  {cert}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                          <button 
                            type="submit"
                            className="flex-1 bg-forest hover:bg-[#23451e] text-white py-4 rounded-xl font-bold shadow-lg"
                          >
                            সেভ করুন
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingProduct(null)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-bold"
                          >
                            বাতিল
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid gap-3">
                        {products.length === 0 && (
                          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">কোনো পণ্য পাওয়া যায়নি। নতুন পণ্য যোগ করুন।</p>
                          </div>
                        )}
                        {products.map(prod => (
                          <div key={prod.id} className="bg-white p-3 sm:p-4 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-sm border border-slate-100 hover:border-forest transition-colors">
                            <img loading="lazy" src={prod.image} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-800 text-sm sm:text-base truncate">{prod.name}</h4>
                              <p className="text-forest font-black text-xs sm:text-base">৳{prod.price}</p>
                            </div>
                            <div className="flex gap-1 sm:gap-2">
                              <button 
                                onClick={() => setEditingProduct(prod)}
                                className="p-1.5 sm:p-2 text-slate-400 hover:text-forest hover:bg-forest/10 rounded-lg transition-all"
                              >
                                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <button 
                                onClick={() => setDeletingProductId(prod.id)}
                                className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : adminTab === 'orders' ? (
                  /* Orders Management Interface */
                  <div className="space-y-6">
                    {orders.length === 0 ? (
                      <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="font-bold text-slate-400">কোনো অর্ডার পাওয়া যায়নি</p>
                      </div>
                    ) : (
                      orders.map(order => (
                        <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-wrap justify-between gap-4 mb-4">
                            <div className="flex gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic text-white shadow-lg ${order.paymentMethod === 'bkash' ? 'bg-pink-500' : 'bg-orange-500'}`}>
                                {order.paymentMethod === 'bkash' ? 'b' : 'n'}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{order.productName}</h4>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">ID: {order.id.slice(-8)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-black text-forest">৳{order.totalAmount}</div>
                              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                order.status === 'completed' ? 'bg-forest/10 text-forest' : 
                                order.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                                'bg-orange-50 text-orange-500'
                              }`}>
                                {order.status === 'completed' ? 'সম্পন্ন' : order.status === 'cancelled' ? 'বাতিল' : 'অপেক্ষমান'}
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-8 py-6 border-y border-slate-50 my-4">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">কাস্টমার তথ্য</p>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <UserIcon className="w-4 h-4 text-slate-300" />
                                  <span className="font-bold text-slate-800">{order.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-slate-300" />
                                  <a href={`tel:${order.phone}`} className="text-forest hover:underline">{order.phone}</a>
                                </div>
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-slate-300 mt-1" />
                                  <span className="text-sm text-slate-600 leading-relaxed">{order.address}</span>
                                </div>
                              </div>
                            </div>
                            <div className="md:border-l md:pl-8 border-slate-50">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">পেমেন্ট ও স্ট্যাটাস</p>
                              <div className="space-y-3">
                                <div className="p-3 bg-slate-50 rounded-xl">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-slate-500">TrxID:</span>
                                    <span className="font-mono font-bold text-forest uppercase">{order.transactionId}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">সময়:</span>
                                    <span className="text-xs text-slate-900 font-medium">
                                      {order.createdAt?.toDate?.() ? order.createdAt.toDate().toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' }) : 'অজানা'}
                                    </span>
                                  </div>
                                </div>
                                
                                <select 
                                  value={order.status}
                                  onChange={async (e) => {
                                    try {
                                      await updateDoc(doc(db, 'orders', order.id), { status: e.target.value });
                                    } catch (err) { console.error(err); }
                                  }}
                                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold bg-white focus:ring-2 focus:ring-forest outline-none transition-all"
                                >
                                  <option value="pending">অপেক্ষমান (Pending)</option>
                                  <option value="completed">সম্পন্ন (Completed)</option>
                                  <option value="cancelled">বাতিল (Cancelled)</option>
                                </select>
                                
                                <button 
                                  onClick={() => {
                                    const text = `অর্ডার কনফার্মেশন:\nআইডি: ${order.id.slice(-8)}\nপণ্য: ${order.productName}\nনাম: ${order.name}\nপেমেন্ট: ${order.paymentMethod}`;
                                    window.open(`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, "_blank");
                                  }}
                                  className="w-full flex items-center justify-center gap-2 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl text-xs font-bold transition-all"
                                >
                                  <Phone className="w-3 h-3 fill-current" />
                                  হোয়াটসঅ্যাপে যোগাযোগ
                                </button>

                                <button 
                                  onClick={() => setDeletingOrderId(order.id)}
                                  className="w-full flex items-center justify-center gap-2 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-xs font-bold transition-all group"
                                >
                                  <Trash2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                  অর্ডারটি মুছে ফেলুন
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : adminTab === 'design' ? (
                  /* Design Tab Interface */
                  <div className="max-w-2xl mx-auto space-y-8">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-forest" /> জেনারেল ডিজাইন সেটিংস
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">ওয়েবসাইট লোগো</label>
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200">
                              <img loading="lazy" src={siteSettings.logo} alt="Logo Preview" className="w-full h-full object-contain" />
                            </div>
                            <label className="flex-1 cursor-pointer group">
                              <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-2xl group-hover:border-forest transition-all">
                                <Plus className="w-4 h-4 text-slate-400 group-hover:text-forest" />
                                <span className="text-xs font-bold text-slate-500 group-hover:text-forest">লোগো পরিবর্তন করুন</span>
                              </div>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const optimized = await optimizeImage(file);
                                    const base64 = await fileToBase64(optimized);
                                    setSiteSettings(prev => ({...prev, logo: base64}));
                                  }
                                }} 
                              />
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">হিরো স্লাইডার ইমেজেস (একাধিক)</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                            {siteSettings.heroImages?.map((url: string, index: number) => (
                              <div key={index} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group">
                                <img loading="lazy" src={url} className="w-full h-full object-cover" alt={`Slide ${index}`} />
                                <button 
                                  onClick={() => {
                                    const newImages = [...siteSettings.heroImages];
                                    newImages.splice(index, 1);
                                    setSiteSettings({...siteSettings, heroImages: newImages});
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            
                            <label className="cursor-pointer aspect-video border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-forest hover:bg-forest/5 transition-all group">
                              <Plus className="w-5 h-5 text-slate-400 group-hover:text-forest" />
                               <span className="text-[10px] font-bold text-slate-400 group-hover:text-forest">নতুন ছবি</span>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const optimized = await optimizeImage(file);
                                    const base64 = await fileToBase64(optimized);
                                    setSiteSettings(prev => ({
                                      ...prev, 
                                      heroImages: [...(prev.heroImages || []), base64]
                                    }));
                                  }
                                  e.target.value = '';
                                }} 
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">হিরো ব্যাজ টেক্সট</label>
                            <input 
                              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-forest text-sm font-medium"
                              value={siteSettings.heroBadge}
                              onChange={e => setSiteSettings({...siteSettings, heroBadge: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">হিরো মেইন টাইটেল</label>
                            <input 
                              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-forest text-sm font-bold"
                              value={siteSettings.heroTitle}
                              onChange={e => setSiteSettings({...siteSettings, heroTitle: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">হিরো সাব-টাইটেল</label>
                            <textarea 
                              rows={3}
                              className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-forest text-sm"
                              value={siteSettings.heroSubtitle}
                              onChange={e => setSiteSettings({...siteSettings, heroSubtitle: e.target.value})}
                            />
                          </div>
                        </div>

                        <button 
                          onClick={saveSiteSettings}
                          disabled={isSavingSettings}
                          className="w-full py-4 bg-forest text-white rounded-2xl font-bold shadow-lg hover:bg-[#23451e] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSavingSettings ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <CheckSquare className="w-5 h-5" />
                          )}
                          সেভ করুন
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Coupon Management Interface */
                  <div className="space-y-4">
                    {editingCoupon ? (
                      <form onSubmit={saveCoupon} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-slate-900">{editingCoupon.id ? 'কুপন এডিট করুন' : 'নতুন কুপন যোগ করুন'}</h4>
                          <button type="button" onClick={() => setEditingCoupon(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                            <X className="w-5 h-5 text-slate-400" />
                          </button>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">কুপন কোড</label>
                            <input 
                              required
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-forest text-sm font-mono font-bold uppercase transition-all"
                              value={editingCoupon.code || ''}
                              placeholder="OFF50"
                              onChange={e => setEditingCoupon({...editingCoupon, code: e.target.value.toUpperCase()})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">ডিসকাউন্ট এর ধরণ</label>
                            <select 
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-forest text-sm font-bold transition-all bg-white"
                              value={editingCoupon.type || 'fixed'}
                              onChange={e => setEditingCoupon({...editingCoupon, type: e.target.value as any})}
                            >
                              <option value="fixed">ফিক্সড টাকা (Fixed)</option>
                              <option value="percent">শতকরা (Percent %)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">ডিসকাউন্ট ভ্যালু</label>
                            <input 
                              required
                              type="number"
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-forest text-sm font-bold transition-all"
                              value={editingCoupon.value || ''}
                              placeholder="0"
                              onChange={e => setEditingCoupon({...editingCoupon, value: Number(e.target.value)})}
                            />
                          </div>
                          <div className="flex items-center gap-3 pt-4">
                            <input 
                              type="checkbox"
                              id="couponActive"
                              className="w-5 h-5 accent-forest"
                              checked={editingCoupon.active !== false}
                              onChange={e => setEditingCoupon({...editingCoupon, active: e.target.checked})}
                            />
                            <label htmlFor="couponActive" className="text-sm font-bold text-slate-700">সক্রিয় (Active)</label>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 pt-4">
                          <button type="submit" className="flex-1 py-4 bg-forest text-white rounded-2xl font-bold shadow-lg hover:bg-[#23451e] transition-all">
                            সেভ করুন
                          </button>
                          <button type="button" onClick={() => setEditingCoupon(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                            বাতিল
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                              <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">কুপন লিস্ট</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">মোট কুপন: {coupons.length}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid gap-3">
                          {coupons.map(cp => (
                            <div key={cp.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:border-forest transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="text-xl font-mono font-black text-slate-900 select-all">{cp.code}</div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-forest">
                                    {cp.type === 'percent' ? `${cp.value}% ডিসকাউন্ট` : `৳${cp.value} ডিসকাউন্ট`}
                                  </span>
                                  <span className={`text-[10px] font-bold ${cp.active ? 'text-lime' : 'text-slate-400'}`}>
                                    {cp.active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setEditingCoupon(cp)}
                                  className="p-2 text-slate-400 hover:text-forest hover:bg-forest/10 rounded-xl transition-all"
                                  title="এডিট করুন"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setDeletingCouponId(cp.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  title="ডিলিট করুন"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {coupons.length === 0 && (
                            <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                              <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                              <p className="text-slate-400 font-bold">কোনো কুপন কোড নেই</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/80 backdrop-blur-lg border-t border-slate-100 px-6 py-3 flex justify-between items-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => {
            setActiveView('home');
            window.scrollTo(0, 0);
          }}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === 'home' ? 'text-forest' : 'text-slate-400'}`}
        >
          <Home className={`w-5 h-5 ${activeView === 'home' ? 'fill-forest/20' : ''}`} />
          <span className="text-[10px] font-bold">হোম</span>
          {activeView === 'home' && <motion.div layoutId="bottomNavDot" className="w-1 h-1 bg-forest rounded-full" />}
        </button>
        <button 
          onClick={() => {
            setActiveView('products');
            window.scrollTo(0, 0);
          }}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === 'products' ? 'text-forest' : 'text-slate-400'}`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-bold">পণ্যসমূহ</span>
          {activeView === 'products' && <motion.div layoutId="bottomNavDot" className="w-1 h-1 bg-forest rounded-full" />}
        </button>
        <button 
          onClick={() => setShowCart(true)}
          className="relative flex flex-col items-center gap-1 text-slate-400 active:scale-95 transition-all"
        >
          <div className="bg-forest text-white p-3 rounded-2xl -mt-8 shadow-lg shadow-forest/20">
            <ShoppingBag className="w-6 h-6" />
          </div>
          {cart.length > 0 && (
            <span className="absolute -top-10 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
          <span className="text-[10px] font-bold">কার্ট</span>
        </button>
        <button 
          onClick={() => {
            if (user) {
              setActiveView('account');
              window.scrollTo(0, 0);
            } else {
              login();
            }
          }}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === 'account' ? 'text-forest' : 'text-slate-400'}`}
        >
          {user ? (
            <div className={`w-5 h-5 rounded-full overflow-hidden border ${activeView === 'account' ? 'border-forest' : 'border-slate-300'}`}>
              {user.photoURL ? (
                <img loading="lazy" src={user.photoURL} className="w-full h-full object-cover" alt="User" />
              ) : (
                <UserIcon className="w-full h-full p-0.5" />
              )}
            </div>
          ) : (
            <UserIcon className="w-5 h-5" />
          )}
          <span className="text-[10px] font-bold">{user ? 'প্রোফাইল' : 'লগইন'}</span>
          {activeView === 'account' && <motion.div layoutId="bottomNavDot" className="w-1 h-1 bg-forest rounded-full" />}
        </button>
      </div>

      {quotaExceeded && (
        <div className="bg-red-600 text-white py-4 px-6 text-center text-sm font-bold z-[200] sticky top-0 border-b border-white/20 shadow-2xl flex items-center justify-center gap-3">
          <span className="bg-white text-red-600 px-2 py-0.5 rounded-full text-[10px]">FIX REQUIRED</span>
          ⚠️ আজকের জন্য আমাদের ব্যবহারের সীমা (Quota) শেষ। আগামীকাল আবার সচল হবে।
        </div>
      )}
      
      {loading && products.length === 0 && quotaExceeded && (
        <div className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-8 animate-pulse">
            <X className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4">সার্ভার লিমিট শেষ!</h1>
          <p className="text-slate-600 max-w-md mx-auto leading-relaxed mb-8">
            দুঃখিত! আজকের জন্য আমাদের মেমরি লিমিট (Quota) শেষ হয়ে গেছে। 
            আগামীকাল আবার সচল হবে। অনুগ্রহ করে আগামীকাল আবার চেষ্টা করুন।
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] font-bold hover:bg-slate-800 transition-all flex items-center gap-3"
          >
            <RefreshCw className="w-5 h-5" /> আবার চেষ্টা করুন
          </button>
        </div>
      )}

      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-20">
              <div 
                className="flex items-center gap-2 sm:gap-3 cursor-pointer"
                onClick={() => {
                  setActiveView('home');
                  window.scrollTo(0, 0);
                }}
              >
                <div className="overflow-hidden w-8 h-8 sm:w-16 sm:h-16 flex items-center justify-center">
                  <img 
                    loading="lazy"
                    src={siteSettings.logo} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="bg-forest p-1 rounded-full border-2 border-lime w-8 h-8 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A3D16E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C10 14.5 10.5 19 12 21"/></svg></div>';
                      }
                    }} 
                  />
                </div>
                <div className="flex flex-col -space-y-0.5 sm:-space-y-1">
                  <span className="text-lg sm:text-2xl font-bold text-forest tracking-tight leading-none">স্বাধীন বাজার</span>
                  <span className="text-[7px] sm:text-[10px] text-forest/70 font-semibold tracking-[0.05em] sm:tracking-widest uppercase">প্রকৃতি হতে আপনার ঘরে</span>
                </div>
              </div>
            
              <div className="flex items-center space-x-1 sm:space-x-4 md:space-x-8 text-slate-600 font-medium">
                <div className="hidden md:flex items-center space-x-8">
                  <button onClick={() => setActiveView('home')} className={`hover:text-forest transition-colors font-bold ${activeView === 'home' ? 'text-forest underline underline-offset-8 decoration-2' : ''}`}>হোম</button>
                  <button onClick={() => setActiveView('products')} className={`hover:text-forest transition-colors font-bold ${activeView === 'products' ? 'text-forest underline underline-offset-8 decoration-2' : ''}`}>পণ্যসমূহ</button>
                </div>
                
                <button 
                  onClick={() => setShowCart(true)}
                  className="relative p-2 hover:bg-slate-100 rounded-full transition-all group"
                >
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-hover:text-forest" />
                  {cart.length > 0 && (
                    <span className="absolute top-0 right-0 bg-forest text-white text-[9px] sm:text-[10px] font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1 sm:gap-2">
                  {user && isAdmin && (
                     <button 
                       onClick={() => setShowAdmin(!showAdmin)}
                       className="flex items-center gap-1 text-forest bg-lime/10 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg border border-lime/20"
                     >
                       <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin-slow" />
                       <span className="text-[9px] font-bold sm:text-sm">অ্যাডমিন</span>
                     </button>
                  )}
                  
                  {user ? (
                     <button 
                       onClick={() => setActiveView('account')}
                       className={`flex items-center gap-1 sm:gap-1.5 font-bold transition-all ${activeView === 'account' ? 'text-forest' : 'text-slate-600 hover:text-forest'}`}
                     >
                       <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${activeView === 'account' ? 'bg-forest text-white' : 'bg-forest/10 text-forest'}`}>
                         <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                       </div>
                       <span className="hidden lg:inline text-sm text-slate-700">আমার</span>
                     </button>
                  ) : (
                     <button onClick={login} className="text-forest font-bold hover:underline text-xs sm:text-base px-2">লগইন</button>
                  )}
                </div>
              </div>

            <button 
              onClick={() => openWhatsApp()}
              className="hidden sm:flex items-center gap-2 bg-forest hover:bg-[#1e3d1a] text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Phone className="w-4 h-4 text-lime fill-lime" />
              অর্ডার করুন
            </button>
          </div>
        </div>
      </nav>

      <main className="min-h-screen pb-24 md:pb-20">
        <AnimatePresence mode="wait">
          {activeView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Section */}
              <section className="relative py-8 md:py-20 overflow-hidden bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                      className="text-center lg:text-left"
                    >
                      <span className="inline-block px-3 py-1 bg-lime/20 text-forest rounded-full text-[10px] sm:text-xs font-bold mb-4 md:mb-6">
                        {siteSettings.heroBadge}
                      </span>
                      <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-4 md:mb-6">
                        {siteSettings.heroTitle}
                      </h1>
                      <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-6 md:mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
                        {siteSettings.heroSubtitle}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center lg:justify-start">
                        <button 
                          onClick={() => setActiveView('products')}
                          className="bg-forest hover:bg-emerald-700 text-white px-6 py-3.5 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg flex items-center justify-center gap-2 group transition-all"
                        >
                          পণ্য দেখুন 
                          <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 sm:bg-transparent rounded-xl">
                           <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-forest" />
                           <span className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-tighter">১০০% বিশুদ্ধতার নিশ্চয়তা</span>
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="relative px-2 sm:px-0"
                    >
                      <div className="absolute inset-0 bg-lime/20 rounded-[1.5rem] md:rounded-[2rem] transform rotate-2 md:rotate-3 -z-10"></div>
                      <div className="relative rounded-[1.5rem] md:rounded-[2rem] shadow-xl md:shadow-2xl overflow-hidden aspect-[4/3] border-[4px] md:border-8 border-white bg-slate-50">
                        <AnimatePresence mode="wait">
                          <motion.img 
                            key={currentHeroSlide}
                            src={siteSettings.heroImages?.[currentHeroSlide] || siteSettings.heroImage || heroImage1} 
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.8 }}
                            alt="Organic Farming" 
                            className="w-full h-full object-cover"
                            loading="eager"
                            decoding="async"
                          />
                        </AnimatePresence>
                        
                        {siteSettings.heroImages && siteSettings.heroImages.length > 1 && (
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 sm:gap-2 z-10">
                            {siteSettings.heroImages.map((_: any, idx: number) => (
                              <button 
                                key={idx}
                                onClick={() => setCurrentHeroSlide(idx)}
                                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${currentHeroSlide === idx ? 'w-6 sm:w-8 bg-forest shadow-md' : 'w-1.5 sm:w-2 bg-white/60 hover:bg-white'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Sourcing Categories Section - Moved Up */}
              <section className="py-12 md:py-20 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-8 md:mb-16">
                    <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-4">আমাদের বিশেষত্ব</h2>
                    <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto italic">"প্রকৃতি হতে আপনার ঘরে" — সরাসরি মাঠ আর বন থেকে সংগৃহীত।</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                    {[
                      { title: "খাঁটি মধু", icon: <div className="bg-amber-100 p-3 md:p-4 rounded-full"><Leaf className="w-6 h-6 md:w-8 md:h-8 text-amber-600" /></div>, desc: "সুন্দরবনের প্রাকৃতিক মধু" },
                      { title: "তজা ফল", icon: <div className="bg-orange-100 p-3 md:p-4 rounded-full"><Leaf className="w-6 h-6 md:w-8 md:h-8 text-orange-600" /></div>, desc: "রাসায়নিক মুক্ত আম ও ফল" },
                      { title: "প্রাকৃতিক মাছ", icon: <div className="bg-blue-100 p-3 md:p-4 rounded-full"><Leaf className="w-8 h-8 text-blue-600" /></div>, desc: "নদী ও বিলের দেশি মাছ" },
                      { title: "খাঁটি তেল ও ঘি", icon: <div className="bg-yellow-100 p-3 md:p-4 rounded-full"><Leaf className="w-8 h-8 text-yellow-600" /></div>, desc: "ঘানি ভাঙা সরিষার তেল" }
                    ].map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="text-center group"
                      >
                        <div className="flex justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                        <h3 className="font-bold text-base md:text-xl text-slate-900">{item.title}</h3>
                        <p className="text-[10px] md:text-sm text-slate-500">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Popular Products Preview */}

              <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between items-end mb-12">
                    <div>
                      <h2 className="text-3xl font-extrabold text-slate-900 mb-2">জনপ্রিয় পণ্যসমূহ</h2>
                      <p className="text-slate-500">সবচেয়ে বেশি পছন্দের সেরা মানের পণ্যগুলো বেছে নিন।</p>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveView('products');
                        window.scrollTo(0, 0);
                      }}
                      className="hidden sm:flex items-center gap-2 bg-white text-forest border border-forest/20 px-6 py-3 rounded-xl font-bold hover:bg-forest hover:text-white transition-all shadow-sm"
                    >
                      সব পণ্য দেখুন <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
                    {products.slice(0, 8).map((product) => (
                      <motion.div 
                        key={product.id}
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group"
                      >
                         <div className="relative aspect-square overflow-hidden cursor-pointer" onClick={() => setViewingProduct(product)}>
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                              loading="lazy" 
                              decoding="async"
                            />
                            {product.originalPrice && product.originalPrice > product.price && (
                              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">অফার!</div>
                            )}
                         </div>
                         <div className="p-4">
                            <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate mb-1">{product.name}</h3>
                            <div className="flex items-center justify-between mt-2">
                               <div className="flex flex-col">
                                  {product.originalPrice && product.originalPrice > product.price && (
                                    <span className="text-[10px] text-slate-400 line-through">৳{product.originalPrice}</span>
                                  )}
                                  <span className="text-forest font-black text-lg">৳{product.price}</span>
                               </div>
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   addToCart(product);
                                 }} 
                                 disabled={!product.stock}
                                 className="p-2 bg-forest/10 text-forest rounded-xl hover:bg-forest hover:text-white transition-all disabled:opacity-50"
                               >
                                 <Plus className="w-5 h-5" />
                               </button>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-12 text-center sm:hidden">
                    <button 
                      onClick={() => {
                        setActiveView('products');
                        window.scrollTo(0, 0);
                      }}
                      className="w-full bg-forest text-white py-4 rounded-xl font-bold"
                    >
                      সব পণ্য দেখুন
                    </button>
                  </div>
                </div>
              </section>

              {/* Trust Badges */}
              <section className="bg-white py-12 border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
                    {[
                      { icon: <ShieldCheck className="w-10 h-10 text-forest" />, title: '১০০% বিশুদ্ধ', desc: 'রাসায়নিক মুক্ত গ্যারান্টি' },
                      { icon: <Truck className="w-10 h-10 text-forest" />, title: 'সারা দেশে ডেলিভারি', desc: '২৪-৭২ ঘণ্টার মধ্যে হোম ডেলিভারি' },
                      { icon: <Leaf className="w-10 h-10 text-forest" />, title: 'সরাসরি কৃষক থেকে', desc: 'মাঠের তাজা পণ্য আপনার ঘরে' }
                    ].map((badge, i) => (
                      <div key={i} className="flex flex-col md:flex-row items-center gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="bg-white p-3 rounded-full shadow-sm">{badge.icon}</div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">{badge.title}</h3>
                          <p className="text-sm text-slate-500">{badge.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeView === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="py-12 bg-slate-50 min-h-screen"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Search Bar & Categories Container */}
                <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-12">
                   <div className="flex flex-col gap-8">
                      <div className="relative max-w-2xl mx-auto w-full">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                           <Search className="w-5 h-5" />
                         </div>
                         <input 
                           type="text" 
                           placeholder="পণ্যের নাম দিয়ে খুঁজুন..."
                           className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-forest transition-all"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                         />
                      </div>
                      
                      <div className="relative">
                        <div className="flex overflow-x-auto pb-4 gap-2 md:gap-3 no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center">
                          {CATEGORIES.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`px-5 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold transition-all whitespace-nowrap text-xs md:text-sm flex-shrink-0 ${
                                selectedCategory === cat.id 
                                  ? 'bg-forest text-white shadow-lg scale-105' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-transparent'
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                        <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none sm:hidden" />
                      </div>

                        <div className="flex flex-col items-center gap-4">
                          <div className="flex gap-4">
                            <button 
                              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                              className="flex items-center gap-2 text-forest font-bold hover:underline py-2"
                            >
                              {showAdvancedFilters ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                              {showAdvancedFilters ? 'ফিল্টার বন্ধ করুন' : 'উন্নত ফিল্টার'}
                            </button>
                            {(searchQuery || selectedCategory !== 'all' || inStockOnly || selectedCertifications.length > 0 || priceRange[0] > 0 || priceRange[1] < 10000) && (
                              <button 
                                onClick={resetFilters}
                                className="flex items-center gap-2 text-red-500 font-bold hover:underline py-2"
                              >
                                <RefreshCw className="w-4 h-4" /> ফিল্টার মুছুন
                              </button>
                            )}
                          </div>

                        <AnimatePresence>
                          {showAdvancedFilters && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="w-full overflow-hidden"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100">
                                {/* Price Range */}
                                <div className="space-y-4">
                                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-forest" /> প্রাইস রেঞ্জ (৳)
                                  </h4>
                                  <div className="flex items-center gap-4">
                                    <input 
                                      type="number"
                                      placeholder="মিন"
                                      value={priceRange[0]}
                                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input 
                                      type="number"
                                      placeholder="ম্যাক্স"
                                      value={priceRange[1]}
                                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                                    />
                                  </div>
                                </div>

                                {/* Stock Availability */}
                                <div className="space-y-4">
                                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-forest" /> স্টক প্রাপ্যতা
                                  </h4>
                                  <div 
                                    onClick={() => setInStockOnly(!inStockOnly)}
                                    className="flex items-center gap-3 cursor-pointer group"
                                  >
                                    <div 
                                      className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center ${inStockOnly ? 'bg-forest border-forest' : 'border-slate-300'}`}
                                    >
                                      {inStockOnly && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className="text-sm font-medium text-slate-600 group-hover:text-forest transition-colors">শুধুমাত্র স্টক থাকা পণ্য</span>
                                  </div>
                                </div>

                                {/* Certifications */}
                                <div className="space-y-4">
                                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-forest" /> অর্গানিক সার্টিফিকেট
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {CERTIFICATIONS.map(cert => (
                                      <button
                                        key={cert}
                                        onClick={() => {
                                          if (selectedCertifications.includes(cert)) {
                                            setSelectedCertifications(selectedCertifications.filter(c => c !== cert));
                                          } else {
                                            setSelectedCertifications([...selectedCertifications, cert]);
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                          selectedCertifications.includes(cert)
                                            ? 'bg-forest border-forest text-white'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-forest hover:text-forest'
                                        }`}
                                      >
                                        {cert}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-8 flex justify-center">
                                <button 
                                  onClick={() => {
                                    setPriceRange([0, 10000]);
                                    setInStockOnly(false);
                                    setSelectedCertifications([]);
                                    setSelectedCategory('all');
                                    setSearchQuery('');
                                  }}
                                  className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors uppercase tracking-widest"
                                >
                                  ফিল্টার রিসেট করুন
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                   </div>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-8">
                  {filteredProducts.map((product) => (
                    <motion.div 
                      key={product.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white rounded-[1.5rem] md:rounded-3xl overflow-hidden shadow-sm border border-slate-100 group"
                    >
                       <div className="relative aspect-square overflow-hidden cursor-pointer group/card" onClick={() => setViewingProduct(product)}>
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                            loading="lazy" 
                            decoding="async"
                          />
                          <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10 hidden md:flex flex-col gap-2 opacity-0 group-hover/card:opacity-100 transition-all duration-300">
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleSocialShare('whatsapp', product); }}
                               className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-[#25D366] shadow-md border border-slate-100 active:scale-90"
                             >
                               <MessageCircle className="w-5 h-5" />
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleShare(product); }}
                               className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-700 hover:text-forest shadow-md border border-slate-100 active:scale-90"
                             >
                               <Share2 className="w-5 h-5" />
                             </button>
                          </div>
                          <button 
                             onClick={(e) => { e.stopPropagation(); handleShare(product); }}
                             className="md:hidden absolute top-2 right-2 z-10 w-7 h-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-700 shadow-sm border border-slate-100"
                          >
                             <Share2 className="w-3.5 h-3.5" />
                          </button>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-red-500 text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold shadow-lg">অফার!</div>
                          )}
                          {!product.stock && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                              <span className="bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[9px] md:text-xs font-bold text-slate-900 shadow-xl uppercase tracking-widest">স্টক আউট</span>
                            </div>
                          )}
                       </div>
                       <div className="p-3 md:p-6">
                          <h3 className="font-bold text-slate-900 text-xs md:text-xl truncate mb-1 md:mb-2">{product.name}</h3>
                          <div className="flex items-center justify-between">
                             <div className="flex flex-col">
                                {product.originalPrice && product.originalPrice > product.price && (
                                  <span className="text-[10px] md:text-xs text-slate-400 line-through">৳{product.originalPrice}</span>
                                )}
                                <span className="text-forest text-base md:text-2xl font-black">৳{product.price}</span>
                             </div>
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 addToCart(product);
                               }} 
                               disabled={!product.stock}
                               className="p-1.5 md:p-4 bg-forest/10 text-forest rounded-lg md:rounded-2xl hover:bg-forest hover:text-white transition-all disabled:opacity-50 disabled:grayscale"
                             >
                               <Plus className="w-4 h-4 md:w-6 md:h-6" />
                             </button>
                          </div>
                       </div>
                    </motion.div>
                  ))}
                </div>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                    <ShoppingBag className="w-20 h-20 text-slate-200 mx-auto mb-6" />
                    <p className="text-xl text-slate-500 font-bold">দুঃখিত, কোনো পণ্য পাওয়া যায়নি!</p>
                    <button onClick={() => setSearchQuery('')} className="mt-4 text-forest font-bold hover:underline">রিসেট করুন</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="py-12 bg-slate-50 min-h-screen"
            >
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                 {/* Profile Card */}
                 <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 mb-8 flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-24 h-24 bg-forest/10 rounded-full flex items-center justify-center text-forest border-4 border-white shadow-xl">
                         {user?.photoURL ? (
                           <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full rounded-full object-cover" loading="lazy" />
                         ) : (
                           <UserIcon className="w-12 h-12" />
                         )}
                      </div>
                      <div>
                         <h2 className="text-3xl font-black text-slate-900">{user?.displayName || 'ব্যবহারকারী'}</h2>
                         <p className="text-slate-500 font-bold">{user?.email}</p>
                         <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4">
                           <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                             <CheckCircle2 className="w-3.5 h-3.5 text-forest" /> ভেরিফাইড
                           </div>
                           <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                             <ShoppingBag className="w-3.5 h-3.5 text-forest" /> {userOrders.length} অর্ডার
                           </div>
                         </div>
                      </div>
                    </div>
                    <button onClick={logout} className="px-8 py-3 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                       <LogOut className="w-4 h-4" /> লগআউট 
                    </button>
                 </div>

                 {/* Order History */}
                 <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-2xl font-black text-slate-900">অর্ডার হিস্ট্রি</h3>
                       <button onClick={() => setShowTracking(true)} className="text-forest font-bold hover:underline">ট্র্যাক অর্ডার</button>
                    </div>
                    
                    {userOrders.length === 0 ? (
                      <div className="py-20 text-center">
                         <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <ShoppingBag className="w-10 h-10 text-slate-200" />
                         </div>
                         <p className="text-slate-500 font-bold">আপনি এখনো কোনো অর্ডার করেননি।</p>
                         <button onClick={() => setActiveView('products')} className="mt-6 bg-forest text-white px-8 py-3 rounded-xl font-bold">কেনাকাটা শুরু করুন</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {userOrders.map(order => (
                          <div key={order.id} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:border-forest/20 transition-all group">
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                   <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-forest shadow-sm group-hover:scale-110 transition-transform">
                                      <ShoppingBag className="w-7 h-7" />
                                   </div>
                                   <div>
                                      <h4 className="font-bold text-slate-900 text-lg">{order.productName || 'অর্ডার সংগ্রহ'}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white px-2 py-0.5 rounded">ID: {order.id.slice(-8)}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">{order.createdAt?.toDate?.().toLocaleDateString('bn-BD')}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-none border-slate-100">
                                   <span className="text-xl sm:text-2xl font-black text-forest">৳{order.totalAmount}</span>
                                   <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                                     order.status === 'completed' ? 'bg-forest text-white' : 
                                     order.status === 'cancelled' ? 'bg-red-500 text-white' : 'bg-orange-400 text-white'
                                   }`}>
                                     {order.status === 'completed' ? 'সম্পন্ন' : order.status === 'cancelled' ? 'বাতিল' : 'অপেক্ষমান'}
                                   </div>
                                </div>
                             </div>
                             {order.items && (
                               <div className="mt-6 pt-6 border-t border-slate-100/50 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-300">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">অর্ডার আইটেমস</div>
                                  <div className="flex flex-wrap gap-2">
                                     {order.items.map((item, id) => (
                                       <div key={id} className="bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm text-xs font-bold text-slate-600">
                                          {item.name} × {item.quantity}
                                       </div>
                                     ))}
                                  </div>
                               </div>
                             )}
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>


      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-12 border-b border-slate-800 pb-12 mb-12">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white p-1 rounded-full overflow-hidden w-12 h-12 flex items-center justify-center border-2 border-forest">
                  <img loading="lazy" src="/logo.png" alt="Shadhin Bazar Logo" className="w-full h-full object-contain" onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D5A27" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-forest"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C10 14.5 10.5 19 12 21"/></svg>';
                  }} />
                </div>
                <div className="flex flex-col -space-y-1">
                  <span className="text-2xl font-bold text-white tracking-tight">স্বাধীন বাজার</span>
                  <span className="text-[10px] text-forest font-semibold tracking-widest uppercase">প্রকৃতি হতে আপনার ঘরে</span>
                </div>
              </div>
              <p className="max-w-sm mb-6 leading-relaxed">
                আমরা বিশ্বাস করি সুস্থ জীবন মানেই বিশুদ্ধ খাবার। আমাদের প্রতিটি পণ্য আপনার এবং আপনার পরিবারের সুস্বাস্থ্য নিশ্চিত করবে ইনশাআল্লাহ।
              </p>
              <div className="flex gap-4">
                <a href="https://www.facebook.com/shadhinorganic" target="_blank" rel="noopener noreferrer" className="bg-slate-800 p-3 rounded-full hover:bg-forest transition-colors text-white">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://www.instagram.com/shadhinorganic" target="_blank" rel="noopener noreferrer" className="bg-slate-800 p-3 rounded-full hover:bg-forest transition-colors text-white">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://www.youtube.com/@shadhinorganic" target="_blank" rel="noopener noreferrer" className="bg-slate-800 p-3 rounded-full hover:bg-forest transition-colors text-white">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold text-lg mb-6">কুইক লিঙ্ক</h4>
              <ul className="space-y-4">
                <li><button onClick={() => setShowAbout(true)} className="hover:text-forest transition-colors">আমাদের সম্পর্কে</button></li>
                <li><button onClick={() => setShowPolicy('return')} className="hover:text-forest transition-colors">রিটার্ন পলিসি</button></li>
                <li><button onClick={() => setShowTracking(true)} className="hover:text-forest transition-colors">অর্ডার ট্র্যাকিং</button></li>
                {user && <li><button onClick={() => setShowOrders(true)} className="hover:text-forest transition-colors">অর্ডার হিস্ট্রি</button></li>}
                <li><button onClick={() => setShowPolicy('payment')} className="hover:text-forest transition-colors">পেমেন্ট পলিসি</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-6">যোগাযোগ করুন</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-forest shrink-0" />
                  <span>ঢাকা, বাংলাদেশ</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-forest shrink-0" />
                  <span>+৮৮০১৮৪৮০০৫৫১১</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-forest shrink-0" />
                  <span>shadhinorganic@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:row items-center justify-between gap-4 text-sm text-slate-500 text-center md:text-left mt-12 border-t border-slate-800 pt-8">
            <p>© 2026 স্বাধীন বাজার। সকল স্বত্ব সংরক্ষিত।</p>
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2">
                  <button onClick={() => setShowOrders(true)} className="flex items-center gap-2 hover:text-white transition-colors">
                    <ShoppingBag className="w-4 h-4" />
                    আমার অর্ডারসমূহ
                  </button>
                  <button onClick={logout} className="flex items-center gap-2 hover:text-white transition-colors">
                    <LogOut className="w-4 h-4" />
                    লগআউট ({user.email?.split('@')[0]})
                  </button>
                  {!isAdmin && (
                    <button 
                      onClick={() => alert(`আপনি বর্তমানে '${user.email}' হিসেবে লগইন করেছেন। আপনাকে অ্যাডমিন হিসেবে স্বীকৃতি দেওয়া হচ্ছে না।`)}
                      className="text-xs text-orange-400 hover:underline"
                    >
                      অ্যাডমিন সমস্যা?
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={login} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Settings className="w-4 h-4" />
                  অ্যাডমিন লগইন
                </button>
              )}
              {/* Removed redundant copyright text */}
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {imageToAdjust && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black flex flex-col"
          >
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
              <div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar max-w-[50%]">
                {[
                  { name: '1:1', val: 1 },
                  { name: '4:3', val: 4/3 },
                  { name: '3:4', val: 3/4 },
                  { name: '16:9', val: 16/9 },
                  { name: 'ফ্রি', val: undefined }
                ].map(opt => (
                  <button
                    key={opt.name}
                    onClick={() => setAspect(opt.val)}
                    className={`px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${aspect === opt.val ? 'bg-forest text-white' : 'text-slate-400 hover:text-white bg-white/5'}`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setImageToAdjust(null);
                    setImageAdjustQueue([]);
                  }}
                  className="px-3 sm:px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  বাতিল
                </button>
                <button 
                  onClick={handleAdjustFinish}
                  disabled={imageUploading}
                  className="px-4 sm:px-6 py-2 bg-forest text-white rounded-xl text-xs font-bold shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {imageUploading ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" /> আপলোড...
                    </>
                  ) : 'প্রয়োগ করুন'}
                </button>
              </div>
            </div>
            
            <div className="relative flex-1 bg-black">
              <Cropper
                image={imageToAdjust}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-6 bg-slate-900 border-t border-slate-800 space-y-4">
              <div className="flex items-center gap-4 max-w-lg mx-auto">
                <Minus className="w-4 h-4 text-slate-500" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-forest h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <Plus className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-center text-[10px] text-slate-500 font-medium italic">
                ছবির যেকোনো অংশ ড্র্যাগ করুন এবং উপরে সাইজ সিলেক্ট করুন
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[200] overflow-hidden flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full md:w-screen md:max-w-md h-full flex flex-col"
            >
              <div className="h-full flex flex-col bg-white shadow-2xl relative overflow-hidden">
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                       <div className="bg-forest/10 p-2 rounded-xl">
                          <ShoppingBag className="w-5 h-5 text-forest" />
                       </div>
                       <h2 className="text-lg md:text-xl font-bold text-slate-900">শপিং কার্ট</h2>
                    </div>
                    <button
                      onClick={() => setShowCart(false)}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-all border border-slate-100"
                    >
                       <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-10">
                    <div className="flow-root min-h-full">
                      {cart.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                          <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-500 font-bold">আপনার কার্টটি বর্তমানে খালি!</p>
                          <button 
                            onClick={() => setShowCart(false)}
                            className="mt-4 text-forest font-bold hover:underline"
                          >
                            এখনই শপিং শুরু করুন
                          </button>
                        </div>
                      ) : (
                        <ul className="-my-6 divide-y divide-slate-100">
                          {cart.map((item) => (
                            <li key={item.id} className="py-6 flex gap-4">
                              <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-100">
                                <img loading="lazy" src={item.image} alt={item.name} className="h-full w-full object-cover" />
                              </div>

                              <div className="flex flex-1 flex-col">
                                <div>
                                  <div className="flex justify-between text-base font-bold text-slate-900 gap-2">
                                    <h3 className="line-clamp-1">{item.name}</h3>
                                    <p className="ml-4 shrink-0">৳{item.price * item.quantity}</p>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">প্রতিটি: ৳{item.price}</p>
                                </div>
                                <div className="flex flex-1 items-end justify-between text-sm">
                                  <div className="flex items-center border border-slate-200 rounded-lg p-1 bg-slate-50">
                                    <button 
                                      onClick={() => updateCartQuantity(item.id, -1)}
                                      className="p-1 hover:bg-white rounded-md text-slate-500 transition-colors"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="px-3 font-bold text-slate-700">{item.quantity}</span>
                                    <button 
                                      onClick={() => updateCartQuantity(item.id, 1)}
                                      className="p-1 hover:bg-white rounded-md text-slate-500 transition-colors"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="font-bold text-red-500 hover:text-red-600 transition-colors"
                                  >
                                    মুছে ফেলুন
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {cart.length > 0 && (
                  <div className="border-t border-slate-100 p-5 md:p-8 bg-white/80 backdrop-blur-md sticky bottom-0 z-20 shrink-0 shadow-[-20px_0_40px_rgba(0,0,0,0.05)]">
                      <div className="flex justify-between items-center text-base font-bold text-slate-900 mb-2">
                        <p className="text-slate-500">মোট পরিমাণ</p>
                        <p className="text-forest text-2xl font-black">৳{cartTotal}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 mb-6 font-medium italic border-l-2 border-forest/30 pl-3">
                        শপিং ব্যাগ এর মোট টাকা। ডেলিভারি চার্জ চেকআউটে যুক্ত হবে।
                      </p>
                      <button
                        onClick={() => {
                          setCheckingOutProduct(null); 
                          setShowCart(false);
                          setShowCartCheckout(true);
                        }}
                        className="w-full py-4.5 bg-forest hover:bg-[#1e3d1a] text-white rounded-2xl font-bold shadow-xl shadow-forest/20 active:scale-[0.98] transition-all text-lg flex items-center justify-center gap-3"
                      >
                        অর্ডার করতে এগিয়ে যান
                        <ArrowRight className="w-5 h-5" />
                      </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm">
        <div className="bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-[2rem] shadow-2xl border border-white/10 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-forest/20 to-transparent pointer-events-none" />
          
          <button 
            onClick={() => { setActiveView('home'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center gap-1 transition-all relative ${activeView === 'home' ? 'text-lime scale-110' : 'text-slate-400 hover:text-white'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold">হোম</span>
            {activeView === 'home' && <motion.div layoutId="nav-glow" className="absolute -bottom-1 w-1 h-1 bg-lime rounded-full" />}
          </button>
          
          <button 
            onClick={() => { setActiveView('products'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center gap-1 transition-all relative ${activeView === 'products' ? 'text-lime scale-110' : 'text-slate-400 hover:text-white'}`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-bold">খুঁজুন</span>
            {activeView === 'products' && <motion.div layoutId="nav-glow" className="absolute -bottom-1 w-1 h-1 bg-lime rounded-full" />}
          </button>
          
          <div className="relative -mt-10">
            <button 
              onClick={() => setShowCart(true)}
              className="bg-forest p-4 rounded-full shadow-lg shadow-forest/40 border-4 border-slate-900 active:scale-90 transition-all relative"
            >
              <ShoppingBag className="w-6 h-6 text-white" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
          
          <button 
            onClick={() => { setActiveView('account'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center gap-1 transition-all relative ${activeView === 'account' ? 'text-lime scale-110' : 'text-slate-400 hover:text-white'}`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">আমার</span>
            {activeView === 'account' && <motion.div layoutId="nav-glow" className="absolute -bottom-1 w-1 h-1 bg-lime rounded-full" />}
          </button>

          <button 
            onClick={() => openWhatsApp()}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-all"
          >
            <Phone className="w-5 h-5" />
            <span className="text-[10px] font-bold">সাপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Floating Call Button - Desktop Only */}
      <motion.div 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="hidden md:block fixed bottom-6 right-6 z-40"
      >
        <a 
          href="tel:01848005511"
          className="w-14 h-14 bg-forest text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-4 border-white"
          title="সরাসরি কল করুন"
        >
          <PhoneCall className="w-6 h-6" />
        </a>
      </motion.div>
    </div>
  );
}

import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { removeDemoSeedData } from '../services/demoDataCleanup.js';
import { recordDailySnapshot } from '../services/analyticsService.js';

dotenv.config();

const SEED_PRODUCTS = [
  // --- APPLE IPHONE SERIES ---
  {
    customId: "iphone-17-pro-max",
    name: "Apple iPhone 17 Pro Max",
    brand: "Apple",
    series: "iPhone 17 Series",
    category: "iphone",
    price: 549000,
    originalPrice: 579000,
    costPrice: 420000,
    rating: 5.0,
    reviewCount: 38,
    stock: 12,
    featured: true,
    isSale: false,
    isNewProduct: true,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=900&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1695048133221-65e128148b3b?q=80&w=900&auto=format&fit=crop"
    ],
    storageOptions: ["256GB", "512GB", "1TB", "2TB"],
    colors: [
      { name: "Cosmic Orange", hex: "#E86F3B" },
      { name: "Deep Space Titanium", hex: "#1C1D1F" },
      { name: "Platinum White", hex: "#F3F4F6" }
    ],
    description: "The vanguard of next-generation mobile silicon. Engineered with the 2nm Apple A19 Pro silicon, full unibody aerospace titanium chassis, anti-reflective scratch-resistant diamond shield, and pro studio camera array.",
    sku: "APL-IP17PM-256",
    specifications: {
      "Display": "6.9-inch Super Retina XDR OLED with 120Hz ProMotion 3000 nits",
      "Chipset": "Apple A19 Pro (2nm) with 6-core GPU & next-gen Neural Engine",
      "Camera": "48MP Quad Fusion + 48MP Ultra-Wide + 48MP 10x Periscope Optical Zoom",
      "Battery": "Up to 36 hours video playback, 45W MagSafe fast charging",
      "Durability": "Aerospace Grade Titanium with Sapphire Crystal back glass"
    }
  },
  {
    customId: "iphone-16-pro-max",
    name: "Apple iPhone 16 Pro Max",
    brand: "Apple",
    series: "iPhone 16 Series",
    category: "iphone",
    price: 489000,
    originalPrice: 519000,
    costPrice: 380000,
    rating: 4.9,
    reviewCount: 142,
    stock: 14,
    featured: true,
    isSale: true,
    isNewProduct: true,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=900&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1695048133221-65e128148b3b?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=900&auto=format&fit=crop"
    ],
    storageOptions: ["256GB", "512GB", "1TB"],
    colors: [
      { name: "Desert Titanium", hex: "#C3B091" },
      { name: "Natural Titanium", hex: "#9A9895" },
      { name: "White Titanium", hex: "#F2F2F2" },
      { name: "Black Titanium", hex: "#2B2B2D" }
    ],
    description: "The crown jewel of mobile engineering. Featuring an expansive 6.9-inch Super Retina XDR OLED display with thinner borders, Apple Intelligence integration, Camera Control tactile button, 4K 120 fps Dolby Vision, and the class-leading A18 Pro silicon.",
    sku: "APL-IP16PM-256",
    specifications: {
      "Display": "6.9-inch Super Retina XDR with ProMotion 120Hz & Always-On",
      "Chipset": "Apple A18 Pro (3nm) with 6-core GPU & 16-core Neural Engine",
      "Camera": "48MP Fusion + 48MP Ultra Wide + 12MP 5x Telephoto periscope",
      "Battery": "Up to 33 hours video playback, MagSafe wireless fast charging",
      "Durability": "Grade 5 Titanium frame with next-gen Ceramic Shield"
    }
  },
  {
    customId: "iphone-16-pro",
    name: "Apple iPhone 16 Pro",
    brand: "Apple",
    series: "iPhone 16 Series",
    category: "iphone",
    price: 435000,
    originalPrice: 455000,
    costPrice: 340000,
    rating: 4.8,
    reviewCount: 98,
    stock: 9,
    featured: true,
    isSale: false,
    isNewProduct: true,
    image: "https://images.unsplash.com/photo-1695048133221-65e128148b3b?q=80&w=900&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1695048133221-65e128148b3b?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=900&auto=format&fit=crop"
    ],
    storageOptions: ["128GB", "256GB", "512GB", "1TB"],
    colors: [
      { name: "Natural Titanium", hex: "#9A9895" },
      { name: "Desert Titanium", hex: "#C3B091" },
      { name: "White Titanium", hex: "#F2F2F2" },
      { name: "Black Titanium", hex: "#2B2B2D" }
    ],
    description: "Compact pro performance without compromise. Equipped with the powerful A18 Pro chip, 5x telephoto zoom optical lens, studio-grade 4-microphone array, and Camera Control.",
    sku: "APL-IP16P-128",
    specifications: {
      "Display": "6.3-inch Super Retina XDR OLED with ProMotion 120Hz",
      "Chipset": "Apple A18 Pro (3nm)",
      "Camera": "48MP Main + 48MP Ultra Wide + 12MP 5x Telephoto",
      "Battery": "Up to 27 hours video playback",
      "Weight": "199 grams"
    }
  },
  {
    customId: "iphone-16",
    name: "Apple iPhone 16",
    brand: "Apple",
    series: "iPhone 16 Series",
    category: "iphone",
    price: 339000,
    originalPrice: 355000,
    costPrice: 260000,
    rating: 4.8,
    reviewCount: 86,
    stock: 18,
    featured: false,
    isSale: true,
    isNewProduct: true,
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=900&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=900&auto=format&fit=crop"
    ],
    storageOptions: ["128GB", "256GB", "512GB"],
    colors: [
      { name: "Ultramarine", hex: "#4B6CB7" },
      { name: "Teal", hex: "#00828A" },
      { name: "Pink", hex: "#E8A3B8" },
      { name: "White", hex: "#F5F5F7" },
      { name: "Black", hex: "#1C1C1E" }
    ],
    description: "Meet the iPhone 16. With the all-new Action Button, dedicated Camera Control key, vibrant color-infused back glass, and the mighty A18 processor built from the ground up for Apple Intelligence.",
    sku: "APL-IP16-128",
    specifications: {
      "Display": "6.1-inch Super Retina XDR with Dynamic Island",
      "Chipset": "Apple A18 Bionic (3nm)",
      "Camera": "48MP Fusion with 2x Telephoto + 12MP Ultra Wide with Macro",
      "Battery": "Up to 22 hours video playback"
    }
  },
  {
    customId: "iphone-15-pro-max",
    name: "Apple iPhone 15 Pro Max",
    brand: "Apple",
    series: "iPhone 15 Series",
    category: "iphone",
    price: 410000,
    originalPrice: 440000,
    costPrice: 320000,
    rating: 4.9,
    reviewCount: 310,
    stock: 8,
    featured: true,
    isSale: true,
    isNewProduct: false,
    image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=900&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=900&auto=format&fit=crop"
    ],
    storageOptions: ["256GB", "512GB", "1TB"],
    colors: [
      { name: "Natural Titanium", hex: "#9A9895" },
      { name: "Blue Titanium", hex: "#2C394B" },
      { name: "White Titanium", hex: "#F2F2F2" }
    ],
    description: "Forged in titanium and featuring the groundbreaking A17 Pro chip, customizable Action button, USB-C 10Gbps connectivity, and 5x optical telephoto lens.",
    sku: "APL-IP15PM-256",
    specifications: {
      "Display": "6.7-inch Super Retina XDR OLED ProMotion 120Hz",
      "Chipset": "Apple A17 Pro (3nm)",
      "Camera": "48MP Main + 12MP Ultra Wide + 12MP 5x Telephoto",
      "Connector": "USB-C with USB 3 speeds up to 10Gbps"
    }
  },
  {
    customId: "iphone-15",
    name: "Apple iPhone 15",
    brand: "Apple",
    series: "iPhone 15 Series",
    category: "iphone",
    price: 285000,
    originalPrice: 310000,
    costPrice: 220000,
    rating: 4.7,
    reviewCount: 195,
    stock: 15,
    featured: false,
    isSale: false,
    isNewProduct: false,
    image: "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?q=80&w=900&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?q=80&w=900&auto=format&fit=crop"
    ],
    storageOptions: ["128GB", "256GB"],
    colors: [
      { name: "Black", hex: "#1C1C1E" },
      { name: "Blue", hex: "#D4E2EB" },
      { name: "Green", hex: "#DCE5D8" },
      { name: "Yellow", hex: "#F8F0D5" }
    ],
    description: "Dynamic Island brings you alerts and Live Activities. A 48MP main camera takes photos with super-high resolution. Powered by the proven A16 Bionic with universal USB-C.",
    sku: "APL-IP15-128",
    specifications: {
      "Display": "6.1-inch Super Retina XDR with Dynamic Island",
      "Chipset": "Apple A16 Bionic",
      "Camera": "48MP Main + 12MP Ultra Wide",
      "Connector": "USB-C"
    }
  },
  {
    customId: "iphone-14",
    name: "Apple iPhone 14",
    brand: "Apple",
    series: "iPhone 14 Series",
    category: "iphone",
    price: 235000,
    originalPrice: 255000,
    costPrice: 180000,
    rating: 4.7,
    reviewCount: 240,
    stock: 7,
    featured: false,
    isSale: true,
    isNewProduct: false,
    image: "https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?q=80&w=900&auto=format&fit=crop",
    gallery: ["https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?q=80&w=900&auto=format&fit=crop"],
    storageOptions: ["128GB", "256GB"],
    colors: [
      { name: "Midnight", hex: "#1A2228" },
      { name: "Starlight", hex: "#FAF6F2" },
      { name: "Blue", hex: "#A0B8CD" }
    ],
    description: "Incredible all-day battery life, vital safety features like Crash Detection, and sharp photos in any lighting conditions with the dual-camera system.",
    sku: "APL-IP14-128",
    specifications: {
      "Display": "6.1-inch Super Retina XDR display",
      "Chipset": "A15 Bionic with 5-core GPU",
      "Camera": "Advanced dual 12MP camera system"
    }
  },
  {
    customId: "iphone-13",
    name: "Apple iPhone 13",
    brand: "Apple",
    series: "iPhone 13 Series",
    category: "iphone",
    price: 195000,
    originalPrice: 215000,
    costPrice: 150000,
    rating: 4.8,
    reviewCount: 380,
    stock: 10,
    featured: false,
    isSale: false,
    isNewProduct: false,
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=900&auto=format&fit=crop",
    gallery: ["https://images.unsplash.com/photo-1592750475338-74b7b21085ab?q=80&w=900&auto=format&fit=crop"],
    storageOptions: ["128GB", "256GB"],
    colors: [
      { name: "Midnight", hex: "#1B2228" },
      { name: "Starlight", hex: "#F9F6EF" }
    ],
    description: "The most balanced flagship value. Vivid Super Retina XDR display, cinematic mode for shallow depth-of-field video, and durable Ceramic Shield protection.",
    sku: "APL-IP13-128",
    specifications: {
      "Display": "6.1-inch Super Retina XDR OLED",
      "Chipset": "Apple A15 Bionic",
      "Camera": "Dual 12MP wide and ultra wide cameras"
    }
  },

  // --- SAMSUNG GALAXY SERIES ---
  {
    customId: "samsung-galaxy-s25-ultra",
    name: "Samsung Galaxy S25 Ultra 5G",
    brand: "Samsung",
    series: "Galaxy S Series",
    category: "samsung",
    price: 499000,
    originalPrice: 529000,
    costPrice: 390000,
    rating: 5.0,
    reviewCount: 45,
    stock: 11,
    featured: true,
    isSale: false,
    isNewProduct: true,
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=900&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=900&auto=format&fit=crop"
    ],
    storageOptions: ["256GB", "512GB", "1TB"],
    colors: [
      { name: "Titanium Silver Blue", hex: "#6C7A89" },
      { name: "Titanium Black", hex: "#1F2022" },
      { name: "Titanium Gray", hex: "#7E7F83" }
    ],
    description: "The pinnacle of Android craftsmanship. Armed with Snapdragon 8 Elite For Galaxy, integrated S Pen stylus, revolutionary 200MP Quad-Telephoto sensor, and Galaxy AI 2.0.",
    sku: "SAM-S25U-256",
    specifications: {
      "Display": "6.86-inch Dynamic AMOLED 2X 120Hz LTPO 3200 nits",
      "Processor": "Snapdragon 8 Elite for Galaxy (3nm)",
      "Camera": "200MP Main + 50MP Ultra Wide + 50MP 5x Periscope + 10MP 3x Telephoto",
      "Battery": "5,000 mAh with 45W Super Fast Charging 2.0",
      "Stylus": "Embedded Bluetooth S Pen with Air Actions"
    }
  },
  {
    customId: "samsung-galaxy-s24-ultra",
    name: "Samsung Galaxy S24 Ultra 5G",
    brand: "Samsung",
    series: "Galaxy S Series",
    category: "samsung",
    price: 445000,
    originalPrice: 479000,
    costPrice: 350000,
    rating: 4.9,
    reviewCount: 185,
    stock: 12,
    featured: true,
    isSale: true,
    isNewProduct: false,
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=900&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=900&auto=format&fit=crop"
    ],
    storageOptions: ["256GB", "512GB", "1TB"],
    colors: [
      { name: "Titanium Gray", hex: "#8A8985" },
      { name: "Titanium Black", hex: "#222223" },
      { name: "Titanium Yellow", hex: "#E9DCAC" }
    ],
    description: "Titanium frame, flat Corning Gorilla Armor anti-reflective display, Live Translate voice calls, Circle to Search with Google, and unparalleled 100x Space Zoom.",
    sku: "SAM-S24U-256",
    specifications: {
      "Display": "6.8-inch Dynamic AMOLED 2X, 120Hz, 2600 nits with Gorilla Armor",
      "Processor": "Snapdragon 8 Gen 3 for Galaxy (4nm)",
      "Camera": "200MP Main + 50MP 5x Periscope + 12MP Ultra Wide + 10MP 3x",
      "Battery": "5,000 mAh, 45W wired charging"
    }
  },
  {
    customId: "samsung-galaxy-z-fold-6",
    name: "Samsung Galaxy Z Fold 6 5G",
    brand: "Samsung",
    series: "Galaxy Z Fold Series",
    category: "samsung",
    price: 520000,
    originalPrice: 550000,
    costPrice: 410000,
    rating: 4.9,
    reviewCount: 64,
    stock: 6,
    featured: true,
    isSale: false,
    isNewProduct: true,
    image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=900&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=900&auto=format&fit=crop"
    ],
    storageOptions: ["256GB", "512GB"],
    colors: [
      { name: "Silver Shadow", hex: "#C0C2C4" },
      { name: "Navy", hex: "#1C2938" },
      { name: "Pink", hex: "#F3D5D7" }
    ],
    description: "Thinner, lighter, and more durable with enhanced Armor Aluminum and dual-rail hinge. Seamless multitasking across an immersive 7.6-inch foldable workspace.",
    sku: "SAM-ZF6-256",
    specifications: {
      "Main Display": "7.6-inch Foldable Dynamic AMOLED 2X 120Hz LTPO",
      "Cover Display": "6.3-inch Dynamic AMOLED 2X 120Hz",
      "Processor": "Snapdragon 8 Gen 3 for Galaxy",
      "Camera": "50MP Wide + 12MP Ultra Wide + 10MP 3x Telephoto"
    }
  },
  {
    customId: "samsung-galaxy-z-flip-6",
    name: "Samsung Galaxy Z Flip 6 5G",
    brand: "Samsung",
    series: "Galaxy Z Flip Series",
    category: "samsung",
    price: 335000,
    originalPrice: 355000,
    costPrice: 260000,
    rating: 4.8,
    reviewCount: 78,
    stock: 9,
    featured: false,
    isSale: true,
    isNewProduct: true,
    image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=900&auto=format&fit=crop",
    gallery: ["https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=900&auto=format&fit=crop"],
    storageOptions: ["256GB", "512GB"],
    colors: [
      { name: "Mint", hex: "#D2E8DA" },
      { name: "Blue", hex: "#C5D8EA" },
      { name: "Silver Shadow", hex: "#B8B9BB" }
    ],
    description: "Compact pocket statement with 50MP pro sensor camera, enlarged 3.4-inch FlexWindow, and vapor chamber cooling for the first time in a Flip phone.",
    sku: "SAM-ZFL6-256",
    specifications: {
      "Main Display": "6.7-inch Dynamic AMOLED 2X 120Hz",
      "FlexWindow": "3.4-inch Super AMOLED 60Hz",
      "Processor": "Snapdragon 8 Gen 3 for Galaxy",
      "Battery": "4,000 mAh"
    }
  },
  {
    customId: "samsung-galaxy-s24",
    name: "Samsung Galaxy S24 5G",
    brand: "Samsung",
    series: "Galaxy S Series",
    category: "samsung",
    price: 275000,
    originalPrice: 295000,
    costPrice: 210000,
    rating: 4.8,
    reviewCount: 110,
    stock: 14,
    featured: false,
    isSale: false,
    isNewProduct: false,
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=900&auto=format&fit=crop",
    gallery: ["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=900&auto=format&fit=crop"],
    storageOptions: ["128GB", "256GB"],
    colors: [
      { name: "Onyx Black", hex: "#1C1C1E" },
      { name: "Marble Gray", hex: "#E1E2E4" },
      { name: "Cobalt Violet", hex: "#4B4453" }
    ],
    description: "Sleek satin aluminum finish, FHD+ Dynamic AMOLED 2X 120Hz display with thin uniform bezels, Galaxy AI photo editing, and triple-lens camera versatility.",
    sku: "SAM-S24-128",
    specifications: {
      "Display": "6.2-inch Dynamic AMOLED 2X FHD+ 120Hz",
      "Processor": "Exynos 2400 / Snapdragon 8 Gen 3",
      "Camera": "50MP Wide + 12MP Ultra Wide + 10MP 3x Telephoto"
    }
  },
  {
    customId: "samsung-galaxy-a55",
    name: "Samsung Galaxy A55 5G",
    brand: "Samsung",
    series: "Galaxy A Series",
    category: "samsung",
    price: 139000,
    originalPrice: 149000,
    costPrice: 105000,
    rating: 4.7,
    reviewCount: 220,
    stock: 22,
    featured: false,
    isSale: true,
    isNewProduct: false,
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=900&auto=format&fit=crop",
    gallery: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=900&auto=format&fit=crop"],
    storageOptions: ["128GB", "256GB"],
    colors: [
      { name: "Awesome Iceblue", hex: "#D5E4EC" },
      { name: "Awesome Navy", hex: "#1C2430" },
      { name: "Awesome Lilac", hex: "#E3D7E8" }
    ],
    description: "Premium metal frame and Corning Gorilla Glass Victus+ durability. 50MP big-pixel sensor with Nightography, Knox Vault security, and 2-day 5,000mAh battery life.",
    sku: "SAM-A55-128",
    specifications: {
      "Display": "6.6-inch Super AMOLED 120Hz 1000 nits",
      "Processor": "Samsung Exynos 1480 (4nm) with AMD Xclipse GPU",
      "Camera": "50MP OIS + 12MP Ultra Wide + 5MP Macro",
      "Battery": "5,000 mAh with 25W Fast Charging"
    }
  },

  // --- ACCESSORIES & AUDIO ---
  {
    customId: "apple-watch-ultra-2",
    name: "Apple Watch Ultra 2 (GPS + Cellular)",
    brand: "Apple",
    series: "Apple Watch",
    category: "apple-watch",
    price: 275000,
    originalPrice: 295000,
    costPrice: 215000,
    rating: 4.9,
    reviewCount: 76,
    stock: 8,
    featured: true,
    isSale: false,
    isNewProduct: true,
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=900&auto=format&fit=crop",
    gallery: ["https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=900&auto=format&fit=crop"],
    storageOptions: ["49mm Titanium"],
    colors: [
      { name: "Black Titanium", hex: "#222223" },
      { name: "Natural Titanium", hex: "#9A9895" }
    ],
    description: "The most rugged and capable Apple Watch. Built with lightweight aerospace titanium, dual-frequency precision GPS, up to 72 hours of battery life in Low Power Mode, and 3000 nits brightness.",
    sku: "APL-AWU2-49",
    specifications: {
      "Case": "49mm Aerospace-grade Titanium",
      "Display": "Always-On Retina display up to 3000 nits",
      "Water Resistance": "100m water resistant, high-speed water sports & recreational dive to 40m"
    }
  },
  {
    customId: "airpods-pro-2-usbc",
    name: "Apple AirPods Pro 2 (USB-C)",
    brand: "Apple",
    series: "Audio",
    category: "audio",
    price: 78000,
    originalPrice: 85000,
    costPrice: 58000,
    rating: 4.9,
    reviewCount: 312,
    stock: 25,
    featured: true,
    isSale: true,
    isNewProduct: false,
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=900&auto=format&fit=crop",
    gallery: ["https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=900&auto=format&fit=crop"],
    storageOptions: ["MagSafe Case (USB-C)"],
    colors: [{ name: "White", hex: "#FFFFFF" }],
    description: "Active Noise Cancellation up to 2x more effective than previous generation. Transparency mode, Adaptive Audio, Personalized Spatial Audio with dynamic head tracking, and lossless audio support.",
    sku: "APL-APP2-USBC",
    specifications: {
      "Audio": "Custom high-excursion Apple driver & custom high dynamic range amplifier",
      "Chip": "Apple H2 headphone chip, Apple U1 chip in MagSafe charging case",
      "Battery": "Up to 6 hours listening time with ANC on, up to 30 hours with case"
    }
  },
  {
    customId: "samsung-galaxy-buds-3-pro",
    name: "Samsung Galaxy Buds 3 Pro",
    brand: "Samsung",
    series: "Audio",
    category: "audio",
    price: 68000,
    originalPrice: 75000,
    costPrice: 50000,
    rating: 4.8,
    reviewCount: 89,
    stock: 16,
    featured: false,
    isSale: true,
    isNewProduct: true,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=900&auto=format&fit=crop",
    gallery: ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=900&auto=format&fit=crop"],
    storageOptions: ["Standard"],
    colors: [
      { name: "Silver", hex: "#C0C2C4" },
      { name: "White", hex: "#FFFFFF" }
    ],
    description: "Iconic blade design with Blade Lights, Hi-Fi 24-bit 96kHz audio codec, enhanced 2-way speakers with planar tweeter, and adaptive noise control.",
    sku: "SAM-B3P-SLV",
    specifications: {
      "Audio": "Enhanced 2-way speaker (10.5mm Dynamic + 6.1mm Planar)",
      "Codec": "Samsung Seamless Codec Ultra High Quality up to 24bit/96kHz",
      "Water Resistance": "IP57 rating"
    }
  }
];

const SEED_COUPONS = [
  {
    code: "BLUEBELLS10",
    discountType: "percentage",
    value: 10,
    minSpend: 50000,
    status: "active",
    description: "10% off on flagship smartphones and accessories above Rs. 50,000",
    expiresAt: new Date("2026-12-31")
  },
  {
    code: "GALAXY5000",
    discountType: "fixed",
    value: 5000,
    minSpend: 100000,
    status: "active",
    description: "Flat Rs. 5,000 instant reduction on purchases over Rs. 100,000",
    expiresAt: new Date("2026-11-30")
  },
  {
    code: "FREESHIP",
    discountType: "fixed",
    value: 1500,
    minSpend: 10000,
    status: "active",
    description: "Free express shipping coupon for orders above Rs. 10,000",
    expiresAt: new Date("2026-12-31")
  }
];

export async function seedDatabase() {
  console.log('[Seed] Connecting to MongoDB...');
  await connectDB();

  await removeDemoSeedData();

  // 1. Seed or update Admin User
  const adminEmail = process.env.ADMIN_EMAIL || (process.env.NODE_ENV === 'production' ? '' : 'admin@bluebells.pk');
  const adminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'adminpass');
  if (!adminEmail.trim() || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured before production seeding.');
  }
  const normalizedAdminEmail = adminEmail.toLowerCase().trim();

  let adminUser = await User.findOne({ email: normalizedAdminEmail }).select('+password');
  if (!adminUser) {
    adminUser = await User.create({
      name: 'BlueBells Master Admin',
      email: normalizedAdminEmail,
      password: adminPassword,
      role: 'admin',
      status: 'active',
      phone: '03005902425',
      address: 'Shop # 33, Sattagadai Plaza, 32 The Mall, Peshawar Cantt.',
      city: 'Peshawar'
    });
    console.log(`[Seed] Created Master Administrator account: ${normalizedAdminEmail}`);
  } else {
    adminUser.role = 'admin';
    adminUser.status = 'active';
    // Preserve existing admin password if already set
    if (!adminUser.password) {
      adminUser.password = adminPassword;
    }
    await adminUser.save();
    console.log(`[Seed] Administrator account verified: ${normalizedAdminEmail}`);
  }

  // 2. Seed Products idempotently
  console.log('[Seed] Seeding Apple & Samsung product catalog...');

  for (const prodData of SEED_PRODUCTS) {
    await Product.findOneAndUpdate(
      { customId: prodData.customId },
      { $set: prodData },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }
  console.log(`[Seed] Seeded ${SEED_PRODUCTS.length} catalog products successfully.`);

  // 3. Seed Coupons idempotently
  console.log('[Seed] Seeding promotional coupons...');
  for (const couponData of SEED_COUPONS) {
    await Coupon.findOneAndUpdate(
      { code: couponData.code },
      { $set: couponData },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }
  console.log(`[Seed] Seeded ${SEED_COUPONS.length} active coupons.`);

  // 4. Calculate initial DailyAnalytics snapshots
  await recordDailySnapshot();
  console.log('[Seed] Daily Analytics snapshot reconciled and updated.');
  console.log('[Seed] Database seeding completed successfully! ✨');
}

// Direct execution from command line
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed] Seeding failed with error:', err);
      await disconnectDB();
      process.exit(1);
    });
}

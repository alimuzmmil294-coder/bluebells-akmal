import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  ShieldCheck,
  Truck,
  CreditCard,
  Headphones,
  Sparkles,
  Zap,
  CheckCircle2,
  X
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/categories';
import ProductGrid from '../components/ProductGrid';
import CategoryCard from '../components/CategoryCard';
import Modal from '../components/Modal';
import HeroCarousel from '../components/HeroCarousel';
import HeroMarquee from '../components/HeroMarquee';

export default function Home() {
  const { products, productsLoading } = useStore();
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Filter featured & bestselling
  const featuredProducts = products.filter((p) => p.featured).slice(0, 4);
  const bestSellers = products.filter((p) => p.category === 'iphone' || p.category === 'samsung').slice(0, 4);
  const accessories = products.filter((p) => p.category === 'accessories' || p.category === 'audio').slice(0, 4);

  return (
    <div>
      {/* 1. Ultra-Smooth Dark-Blue Gradient Hero Carousel */}
      <HeroCarousel />

      {/* 2. Animated Bottom Feature Ticker / Infinite Marquee */}
      <HeroMarquee />

      {/* 3. Popular Categories */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="badge badge-yellow" style={{ marginBottom: '8px' }}>Explore Catalog</span>
              <h2 className="section-title">Popular Categories</h2>
              <p className="section-subtitle">Discover premium devices engineered to redefine modern mobile computing.</p>
            </div>
            <Link to="/shop" className="btn btn-outline" style={{ gap: '8px' }}>
              <span>View All Categories</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="category-grid">
            {CATEGORIES.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Featured Flagships Section */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="badge badge-new" style={{ marginBottom: '8px' }}>Handpicked Flagships</span>
              <h2 className="section-title">Featured Devices</h2>
              <p className="section-subtitle">Top-tier hardware praised for performance, camera fidelity, and enduring luxury.</p>
            </div>
            <Link to="/shop?sort=featured" className="btn btn-primary" style={{ gap: '8px' }}>
              <span>Explore Featured</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <ProductGrid products={featuredProducts} loading={productsLoading} />
        </div>
      </section>

      {/* 5. Separate iPhone and Samsung Promotional Banners */}
      <section className="section">
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '28px'
            }}
            className="promo-grid"
          >
            {/* iPhone Banner */}
            <div
              style={{
                backgroundColor: '#171717',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-xl)',
                padding: '44px 36px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '360px'
              }}
            >
              <div style={{ position: 'relative', zIndex: 2, maxWidth: '320px' }}>
                <span className="badge badge-yellow" style={{ marginBottom: '12px' }}>Apple Flagship</span>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '12px' }}>
                  iPhone 16 Pro Max
                </h3>
                <p style={{ color: '#D1D5DB', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '24px' }}>
                  Grade 5 titanium enclosure, Camera Control, 4K 120 fps video, and the monstrous A18 Pro silicon.
                </p>
                <Link to="/iphone" className="btn btn-primary" style={{ gap: '8px' }}>
                  <span>Shop iPhone Collection</span>
                  <ArrowRight size={16} />
                </Link>
              </div>

              <img
                src="https://images.unsplash.com/photo-1695048133221-65e128148b3b?q=80&w=800&auto=format&fit=crop"
                alt="Apple iPhone"
                style={{
                  position: 'absolute',
                  right: '-40px',
                  bottom: '-20px',
                  width: '280px',
                  height: 'auto',
                  objectFit: 'contain',
                  opacity: 0.85
                }}
              />
            </div>

            {/* Samsung Banner */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '2px solid var(--primary-blue)',
                borderRadius: 'var(--radius-xl)',
                padding: '44px 36px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '360px'
              }}
            >
              <div style={{ position: 'relative', zIndex: 2, maxWidth: '320px' }}>
                <span className="badge badge-new" style={{ marginBottom: '12px' }}>Galaxy AI Powerhouse</span>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Galaxy S24 Ultra
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '24px' }}>
                  Built-in S Pen, 200MP camera matrix, Corning Gorilla Armor anti-glare screen, and live generative AI.
                </p>
                <Link to="/samsung" className="btn btn-dark" style={{ gap: '8px' }}>
                  <span>Shop Samsung Galaxy</span>
                  <ArrowRight size={16} />
                </Link>
              </div>

              <img
                src="https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=800&auto=format&fit=crop"
                alt="Samsung Galaxy"
                style={{
                  position: 'absolute',
                  right: '-30px',
                  bottom: '-10px',
                  width: '280px',
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6. Best-Selling Smartphones Section */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="badge badge-yellow" style={{ marginBottom: '8px' }}>Customer Favorites</span>
              <h2 className="section-title">Best-Selling Smartphones</h2>
              <p className="section-subtitle">The top chosen flagships nationwide with unmatched client satisfaction.</p>
            </div>
            <Link to="/shop" className="btn btn-outline" style={{ gap: '8px' }}>
              <span>View All Phones</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <ProductGrid products={bestSellers} loading={productsLoading} />
        </div>
      </section>

      {/* 7. Accessories Promotional Section */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <span className="badge badge-gray" style={{ marginBottom: '8px' }}>Ecosystem Essentials</span>
              <h2 className="section-title">Earbuds, Watches &amp; Power</h2>
              <p className="section-subtitle">Complete your setup with MagSafe charging, wireless audio, and durable protective accessories.</p>
            </div>
            <Link to="/shop?category=accessories" className="btn btn-primary" style={{ gap: '8px' }}>
              <span>Shop All Accessories</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <ProductGrid products={accessories} loading={productsLoading} />
        </div>
      </section>

      {/* 8. Customer Benefits / Why BlueBells */}
      <section style={{ backgroundColor: 'var(--blue-navy)', color: '#FFFFFF', padding: '80px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 56px auto' }}>
            <span className="badge badge-yellow" style={{ marginBottom: '12px' }}>The BlueBells Standard</span>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '16px' }}>
              Why Pakistan Chooses BlueBells
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '1.05rem', lineHeight: 1.6 }}>
              We are not just another retailer. We are dedicated connoisseurs committed to authentic luxury mobile experiences.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '32px'
            }}
            className="benefits-grid"
          >
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-lg)', padding: '32px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)' }}>
                <ShieldCheck size={24} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px' }}>100% PTA Approved</h3>
              <p style={{ color: '#94A3B8', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Every single phone in our inventory has official PTA tax duties cleared. Enjoy permanent, uninterrupted dual-SIM &amp; eSIM functionality across all Pakistani network operators.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-lg)', padding: '32px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)' }}>
                <Truck size={24} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px' }}>Tamper-Evident Courier</h3>
              <p style={{ color: '#94A3B8', fontSize: '0.92rem', lineHeight: 1.6 }}>
                High-value orders are dispatched in custom sealed magnetic packaging with direct serial tracking. You inspect the sealed package before taking final handover.
              </p>
            </div>

            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-lg)', padding: '32px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)' }}>
                <CheckCircle2 size={24} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px' }}>Official Apple &amp; Samsung Care</h3>
              <p style={{ color: '#94A3B8', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Direct factory warranty claim assistance through certified Apple Authorized Service Providers and Samsung authorized repair pavilions nationwide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demonstration Modal */}
      <Modal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        title="Experience BlueBells Store Experience"
        maxWidth="720px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '56.25%',
              backgroundColor: '#171717',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden'
            }}
          >
            <iframe
              src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0"
              title="BlueBells Brand Showcase"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Welcome to BlueBells. We provide premier smartphone consultation, sealed packaging unboxing, and premium nationwide insured shipping for high-end flagship smartphones.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setVideoModalOpen(false)} className="btn btn-primary btn-sm">
              Done Watching
            </button>
          </div>
        </div>
      </Modal>

      {/* Responsive adjustments */}
      <style>{`
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .trust-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .promo-grid { grid-template-columns: 1fr !important; }
          .benefits-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .trust-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

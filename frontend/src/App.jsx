import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import PageLoader from './components/PageLoader';

// Layouts
const StoreLayout = lazy(() => import('./layouts/StoreLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

// Public Pages
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const IPhone = lazy(() => import('./pages/IPhone'));
const Samsung = lazy(() => import('./pages/Samsung'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const Login = lazy(() => import('./pages/Login'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Account = lazy(() => import('./pages/Account'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminCoupons = lazy(() => import('./pages/admin/Coupons'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const adminContent = document.querySelector('.admin-main');
    if (adminContent) adminContent.scrollTop = 0;
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <StoreProvider>
      <CartProvider>
        <WishlistProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader message="Loading BlueBells..." />}>
              <Routes>
                {/* Main Storefront Layout & Routes */}
                <Route path="/" element={<StoreLayout />}>
                  <Route index element={<Home />} />
                  <Route path="shop" element={<Shop />} />
                  <Route path="iphone" element={<IPhone />} />
                  <Route path="samsung" element={<Samsung />} />
                  <Route path="product/:id" element={<ProductDetails />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="order-confirmation/:orderId" element={<OrderConfirmation />} />
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Login />} />
                  <Route path="about" element={<About />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="account" element={<Account />} />
                </Route>

                {/* Dedicated Admin Portal Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* 404 Catch All */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </WishlistProvider>
      </CartProvider>
    </StoreProvider>
  );
}

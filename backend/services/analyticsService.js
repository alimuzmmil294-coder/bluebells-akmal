import Order from '../models/Order.js';
import Product from '../models/Product.js';
import DailyAnalytics from '../models/DailyAnalytics.js';

export async function getDashboardMetrics() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Six months ago (start of month 5 months before current month)
  const startOfSixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  startOfSixMonthsAgo.setHours(0, 0, 0, 0);

  // Execute database queries and native aggregation pipelines concurrently
  const [
    totalProducts,
    lowStockProducts,
    outOfStockProducts,
    recentOrdersList,
    [aggregationResults]
  ] = await Promise.all([
    Product.countDocuments({ active: true }),
    Product.countDocuments({ active: true, stock: { $gt: 0, $lte: 5 } }),
    Product.countDocuments({ active: true, stock: { $lte: 0 } }),
    Order.find({}).sort({ createdAt: -1 }).limit(6).lean(),
    Order.aggregate([
      {
        $facet: {
          // 1. Status breakdown across all orders
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          // 2. Qualifying orders totals
          qualifyingTotals: [
            {
              $match: {
                status: { $nin: ['Cancelled', 'Refunded'] }
              }
            },
            {
              $project: {
                grandTotal: { $ifNull: ['$grandTotal', 0] },
                totalCost: { $ifNull: ['$totalCost', 0] },
                itemsQuantity: {
                  $reduce: {
                    input: { $ifNull: ['$items', []] },
                    initialValue: 0,
                    in: { $add: ['$$value', { $ifNull: ['$$this.quantity', 0] }] }
                  }
                }
              }
            },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$grandTotal' },
                totalCostOfGoods: { $sum: '$totalCost' },
                totalProductsSold: { $sum: '$itemsQuantity' },
                qualifyingOrderCount: { $sum: 1 }
              }
            }
          ],
          // 3. Today's qualifying orders
          todayTotals: [
            {
              $match: {
                status: { $nin: ['Cancelled', 'Refunded'] },
                createdAt: { $gte: startOfToday }
              }
            },
            {
              $project: {
                grandTotal: { $ifNull: ['$grandTotal', 0] },
                itemsQuantity: {
                  $reduce: {
                    input: { $ifNull: ['$items', []] },
                    initialValue: 0,
                    in: { $add: ['$$value', { $ifNull: ['$$this.quantity', 0] }] }
                  }
                }
              }
            },
            {
              $group: {
                _id: null,
                todaySales: { $sum: '$grandTotal' },
                productsSoldToday: { $sum: '$itemsQuantity' }
              }
            }
          ],
          // 4. Monthly totals for the last 6 months
          monthlyTotals: [
            {
              $match: {
                status: { $nin: ['Cancelled', 'Refunded'] },
                createdAt: { $gte: startOfSixMonthsAgo }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                amount: { $sum: '$grandTotal' },
                orders: { $sum: 1 }
              }
            }
          ],
          // 5. Best selling products (top 5 by units sold)
          bestSellingProducts: [
            {
              $match: {
                status: { $nin: ['Cancelled', 'Refunded'] }
              }
            },
            { $unwind: '$items' },
            {
              $group: {
                _id: {
                  $ifNull: [
                    '$items.productId',
                    { $toString: '$items.product' }
                  ]
                },
                name: { $first: '$items.name' },
                brand: { $first: '$items.brand' },
                category: { $first: '$items.category' },
                image: { $first: '$items.image' },
                unitsSold: { $sum: { $ifNull: ['$items.quantity', 0] } },
                revenue: {
                  $sum: {
                    $multiply: [
                      { $ifNull: ['$items.price', 0] },
                      { $ifNull: ['$items.quantity', 0] }
                    ]
                  }
                }
              }
            },
            { $sort: { unitsSold: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                id: '$_id',
                name: 1,
                brand: 1,
                category: 1,
                image: 1,
                unitsSold: 1,
                revenue: 1
              }
            }
          ],
          // 6. Category and brand sales breakdown
          itemSales: [
            {
              $match: {
                status: { $nin: ['Cancelled', 'Refunded'] }
              }
            },
            { $unwind: '$items' },
            {
              $group: {
                _id: {
                  category: { $toLower: { $ifNull: ['$items.category', 'iphone'] } },
                  brand: { $toLower: { $ifNull: ['$items.brand', 'other'] } }
                },
                brandName: { $first: { $ifNull: ['$items.brand', 'Other'] } },
                revenue: {
                  $sum: {
                    $multiply: [
                      { $ifNull: ['$items.price', 0] },
                      { $ifNull: ['$items.quantity', 0] }
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ])
  ]);

  const statusCounts = aggregationResults?.statusCounts || [];
  const statusMap = new Map(statusCounts.map((s) => [s._id, s.count]));
  const totalOrders = statusCounts.reduce((sum, s) => sum + s.count, 0);

  const pendingCount = (statusMap.get('Processing') || 0) + (statusMap.get('Pending') || 0);
  const shippedCount = statusMap.get('Shipped') || 0;
  const deliveredCount = statusMap.get('Delivered') || 0;
  const cancelledCount = statusMap.get('Cancelled') || 0;

  const qualifying = aggregationResults?.qualifyingTotals?.[0] || {};
  const totalRevenue = qualifying.totalRevenue || 0;
  const totalCostOfGoods = qualifying.totalCostOfGoods || 0;
  const totalProductsSold = qualifying.totalProductsSold || 0;
  const qualifyingOrderCount = qualifying.qualifyingOrderCount || 0;
  const grossProfit = totalRevenue - totalCostOfGoods;

  const today = aggregationResults?.todayTotals?.[0] || {};
  const todaySales = today.todaySales || 0;
  const productsSoldToday = today.productsSoldToday || 0;

  const bestSellingProducts = aggregationResults?.bestSellingProducts || [];

  // Monthly breakdown for visual charts (last 6 months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTotals = aggregationResults?.monthlyTotals || [];
  const monthlyData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mIndex = d.getMonth();
    const y = d.getFullYear();
    const mName = monthNames[mIndex];

    const match = monthlyTotals.find(
      (m) => m._id && m._id.year === y && m._id.month === mIndex + 1
    );

    const mSales = match?.amount || 0;
    const mOrders = match?.orders || 0;

    monthlyData.push({
      month: i === 0 ? `${mName} (Current)` : mName,
      amount: mSales,
      orders: mOrders
    });
  }

  // Calculate chart heights (proportional 15 to 100)
  const maxMonthlySales = Math.max(...monthlyData.map((m) => m.amount), 1);
  monthlyData.forEach((m) => {
    m.height = Math.max(15, Math.round((m.amount / maxMonthlySales) * 100));
  });

  // Category and Brand breakdown
  const categoryRevenue = {
    iphone: 0,
    samsung: 0,
    'apple-watch': 0,
    audio: 0,
    accessories: 0
  };
  const brandRevenue = new Map();

  for (const entry of aggregationResults?.itemSales || []) {
    const cat = (entry._id?.category || 'iphone').toLowerCase();
    const rev = entry.revenue || 0;

    if (categoryRevenue[cat] !== undefined) {
      categoryRevenue[cat] += rev;
    } else {
      categoryRevenue.accessories += rev;
    }

    const brandKey = (entry._id?.brand || 'other').trim().toLowerCase() || 'other';
    const brandName = entry.brandName || 'Other';
    const existingBrand = brandRevenue.get(brandKey);
    brandRevenue.set(brandKey, {
      key: brandKey,
      name: existingBrand?.name || brandName,
      amount: (existingBrand?.amount || 0) + rev
    });
  }

  const totalCatRevenue = Object.values(categoryRevenue).reduce((a, b) => a + b, 0) || 1;
  const totalBrandRevenue = [...brandRevenue.values()].reduce((total, brand) => total + brand.amount, 0) || 1;
  const brandColors = ['#171717', '#FFC928', '#6B7280', '#2563EB', '#10B981'];
  const brandShare = [...brandRevenue.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((brand, index) => ({
      ...brand,
      share: Math.round((brand.amount / totalBrandRevenue) * 100),
      color: brandColors[index % brandColors.length]
    }));

  const categoryShare = [
    { key: 'iphone', name: 'Apple iPhone', amount: categoryRevenue.iphone, share: Math.round((categoryRevenue.iphone / totalCatRevenue) * 100), color: '#171717' },
    { key: 'samsung', name: 'Samsung Galaxy', amount: categoryRevenue.samsung, share: Math.round((categoryRevenue.samsung / totalCatRevenue) * 100), color: '#FFC928' },
    { key: 'apple-watch', name: 'Apple Watch', amount: categoryRevenue['apple-watch'], share: Math.round((categoryRevenue['apple-watch'] / totalCatRevenue) * 100), color: '#6B7280' },
    { key: 'audio', name: 'Audio & Buds', amount: categoryRevenue.audio, share: Math.round((categoryRevenue.audio / totalCatRevenue) * 100), color: '#2563EB' },
    { key: 'accessories', name: 'Accessories', amount: categoryRevenue.accessories, share: Math.round((categoryRevenue.accessories / totalCatRevenue) * 100), color: '#10B981' }
  ];

  return {
    todaySales,
    totalRevenue,
    totalOrders,
    pendingOrders: pendingCount,
    shippedOrders: shippedCount,
    completedOrders: deliveredCount,
    cancelledOrders: cancelledCount,
    productsSoldToday,
    totalProductsSold,
    totalProductsInInventory: totalProducts,
    lowStockProducts,
    outOfStockProducts,
    grossProfit,
    averageOrderValue: qualifyingOrderCount > 0 ? Math.round(totalRevenue / qualifyingOrderCount) : 0,
    recentOrders: recentOrdersList.map((order) => ({
      ...order,
      id: order.orderNumber
    })),
    bestSellingProducts,
    monthlyData,
    categoryShare,
    brandShare,
    lastUpdated: new Date()
  };
}

export async function recordDailySnapshot(targetDate = new Date()) {
  const dateStr = targetDate.toISOString().split('T')[0];
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).lean();

  const qualifyingOrders = orders.filter((o) => o.status !== 'Cancelled' && o.status !== 'Refunded');
  const cancelledOrRefunded = orders.filter((o) => o.status === 'Cancelled' || o.status === 'Refunded');

  const grossSales = qualifyingOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const discounts = qualifyingOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const shipping = qualifyingOrders.reduce((sum, o) => sum + (o.shippingFee || 0), 0);
  const netRevenue = qualifyingOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const cost = qualifyingOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
  const productsSold = qualifyingOrders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
  }, 0);

  const refundTotal = cancelledOrRefunded.reduce((sum, o) => sum + (o.refundAmount || o.grandTotal || 0), 0);

  return DailyAnalytics.findOneAndUpdate(
    { date: dateStr, period: 'daily' },
    {
      date: dateStr,
      period: 'daily',
      orderCount: qualifyingOrders.length,
      productsSoldCount: productsSold,
      grossSales,
      discounts,
      shippingCollected: shipping,
      netRevenue,
      costOfGoodsSold: cost,
      grossProfit: netRevenue - cost,
      refundCount: cancelledOrRefunded.length,
      refundTotal,
      lastCalculatedAt: new Date()
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

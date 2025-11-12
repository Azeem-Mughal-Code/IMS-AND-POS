import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from './common/Card';
import { Product, Sale } from '../types';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
}

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

export const Dashboard: React.FC<DashboardProps> = ({ products, sales }) => {
  const stats = useMemo(() => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCogs = sales.reduce((sum, sale) => sum + sale.cogs, 0);
    const totalProfit = totalSales - totalCogs;
    const lowStockItems = products.filter(p => p.stock <= p.lowStockThreshold).length;

    return { totalSales, totalCogs, totalProfit, lowStockItems };
  }, [sales, products]);

  const salesData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dailySales = sales
        .filter(sale => sale.date.startsWith(date))
        .reduce((sum, sale) => sum + sale.total, 0);
      return {
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Sales: dailySales,
      };
    });
  }, [sales]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Total Sales" value={formatCurrency(stats.totalSales)} color="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
        <Card title="Total Profit" value={formatCurrency(stats.totalProfit)} color="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} />
        <Card title="Total COGS" value={formatCurrency(stats.totalCogs)} color="bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10m16-10v10M9 9h6m-6 4h6m-6 4h6" /></svg>} />
        <Card title="Low Stock Items" value={stats.lowStockItems} color="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Sales Overview (Last 7 Days)</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="name" stroke="#A0AEC0" />
              <YAxis stroke="#A0AEC0" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: 'none' }}
                labelStyle={{ color: '#E2E8F0' }}
                formatter={(value: number) => [formatCurrency(value), 'Sales']}
              />
              <Legend wrapperStyle={{ color: '#E2E8F0' }} />
              <Line type="monotone" dataKey="Sales" stroke="#4299E1" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

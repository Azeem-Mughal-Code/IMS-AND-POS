import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card } from './common/Card';
import { useAppContext } from './context/AppContext';
import { BellIcon } from './Icons';
import { Modal } from './common/Modal';
import { NotificationsPanel } from './common/NotificationsPanel';

type TimeRange = 'today' | 'weekly' | 'monthly' | 'yearly' | 'all';

const TimeRangeButton: React.FC<{
    label: string;
    range: TimeRange;
    currentTimeRange: TimeRange;
    setTimeRange: (range: TimeRange) => void;
}> = ({ label, range, currentTimeRange, setTimeRange }) => (
    <button
        onClick={() => setTimeRange(range)}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            currentTimeRange === range
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
    >
        {label}
    </button>
);

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

const toLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const Dashboard: React.FC = () => {
  const { products, sales, currency, isIntegerCurrency, notifications } = useAppContext();
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: isIntegerCurrency ? 0 : 2,
    maximumFractionDigits: isIntegerCurrency ? 0 : 2,
  }).format(amount);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (timeRange) {
        case 'today':
            return sales.filter(sale => new Date(sale.date) >= today);
        case 'weekly': {
            const startOfWeek = getStartOfWeek(now);
            return sales.filter(sale => new Date(sale.date) >= startOfWeek);
        }
        case 'monthly': {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return sales.filter(sale => new Date(sale.date) >= startOfMonth);
        }
        case 'yearly': {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            return sales.filter(sale => new Date(sale.date) >= startOfYear);
        }
        case 'all':
        default:
            return sales;
    }
  }, [sales, timeRange]);
  
  const stats = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCogs = filteredSales.reduce((sum, sale) => sum + sale.cogs, 0);
    const totalProfit = totalSales - totalCogs;
    const lowStockItems = products.filter(p => p.stock <= p.lowStockThreshold).length;

    return { totalSales, totalCogs, totalProfit, lowStockItems };
  }, [filteredSales, products]);

  const { chartData, chartTitle } = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
        case 'today': {
            const data = Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, Sales: 0 }));
            filteredSales.forEach(sale => {
                const hour = new Date(sale.date).getHours();
                data[hour].Sales += sale.total;
            });
            return { chartData: data, chartTitle: 'Today' };
        }
        case 'weekly': {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const startOfWeek = getStartOfWeek(now);
            
            const data = dayNames.map((name, i) => {
                const d = new Date(startOfWeek);
                d.setDate(d.getDate() + i);
                return { 
                    name, 
                    Sales: 0,
                    dateKey: toLocalDateKey(d)
                };
            });

            const salesByDay: { [key: string]: number } = {};
            filteredSales.forEach(sale => {
                const key = toLocalDateKey(new Date(sale.date));
                if (salesByDay[key] === undefined) salesByDay[key] = 0;
                salesByDay[key] += sale.total;
            });

            data.forEach(day => {
                if (salesByDay[day.dateKey]) {
                    day.Sales = salesByDay[day.dateKey];
                }
            });
            return { chartData: data, chartTitle: 'This Week' };
        }
        case 'monthly': {
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const data = Array.from({ length: daysInMonth }, (_, i) => ({
                name: `${i + 1}`,
                Sales: 0
            }));
            filteredSales.forEach(sale => {
                const dayOfMonth = new Date(sale.date).getDate();
                if(data[dayOfMonth - 1]) data[dayOfMonth - 1].Sales += sale.total;
            });
            return { chartData: data, chartTitle: 'This Month' };
        }
        case 'yearly': {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const data = monthNames.map(m => ({ name: m, Sales: 0 }));
            filteredSales.forEach(sale => {
                const month = new Date(sale.date).getMonth();
                data[month].Sales += sale.total;
            });
            return { chartData: data, chartTitle: 'This Year' };
        }
        case 'all': {
            if (filteredSales.length === 0) {
                return { chartData: [], chartTitle: 'All Time' };
            }
            const salesByMonth: { [key: string]: number } = {};
            filteredSales.forEach(sale => {
                const d = new Date(sale.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (salesByMonth[key] === undefined) salesByMonth[key] = 0;
                salesByMonth[key] += sale.total;
            });
            const data = Object.keys(salesByMonth).sort().map(key => {
                const [year, month] = key.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return {
                    name: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    Sales: salesByMonth[key]
                };
            });
            return { chartData: data, chartTitle: 'All Time' };
        }
        default:
            return { chartData: [], chartTitle: ''};
    }
  }, [filteredSales, timeRange]);
  
  const ChartComponent = timeRange === 'today' ? BarChart : LineChart;
  const ChartElement = timeRange === 'today' ? Bar : Line;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Notifications"
            >
              <BellIcon className="h-7 w-7" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
        </div>
        <div className="flex-shrink-0 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto">
            <div className="flex items-center space-x-1">
                <TimeRangeButton label="Today" range="today" currentTimeRange={timeRange} setTimeRange={setTimeRange} />
                <TimeRangeButton label="Week" range="weekly" currentTimeRange={timeRange} setTimeRange={setTimeRange} />
                <TimeRangeButton label="Month" range="monthly" currentTimeRange={timeRange} setTimeRange={setTimeRange} />
                <TimeRangeButton label="Year" range="yearly" currentTimeRange={timeRange} setTimeRange={setTimeRange} />
                <TimeRangeButton label="All Time" range="all" currentTimeRange={timeRange} setTimeRange={setTimeRange} />
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Total Sales" value={formatCurrency(stats.totalSales)} color="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
        <Card title="Total Profit" value={formatCurrency(stats.totalProfit)} color="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} />
        <Card title="Total COGS" value={formatCurrency(stats.totalCogs)} color="bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10m16-10v10M9 9h6m-6 4h6m-6 4h6" /></svg>} />
        <Card title="Low Stock Items" value={stats.lowStockItems} color="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Sales Overview ({chartTitle})</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <ChartComponent data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="name" stroke="#A0AEC0" />
              <YAxis stroke="#A0AEC0" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: 'none' }}
                labelStyle={{ color: '#E2E8F0' }}
                formatter={(value: number) => [formatCurrency(value), 'Sales']}
              />
              <Legend wrapperStyle={{ color: '#E2E8F0' }} />
              <ChartElement 
                type="monotone" 
                dataKey="Sales" 
                stroke="#4299E1" 
                fill="#4299E1"
                strokeWidth={2} 
                activeDot={{ r: 8 }} 
              />
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </div>
       <Modal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} title="Notifications" size="md">
        <NotificationsPanel onClose={() => setIsNotificationsOpen(false)} />
      </Modal>
    </div>
  );
};
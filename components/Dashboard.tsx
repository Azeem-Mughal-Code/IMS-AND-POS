
import React, { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card } from './common/Card';
import { BellIcon } from './Icons';
import { Modal } from './common/Modal';
import { NotificationsPanel } from './common/NotificationsPanel';
import { useProducts } from './context/ProductContext';
import { useSales } from './context/SalesContext';
import { useUIState } from './context/UIStateContext';
import { useSettings } from './context/SettingsContext';

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

const yAxisTickFormatter = (value: number) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
    return value.toString();
};

export const Dashboard: React.FC = () => {
  const { products } = useProducts();
  const { sales } = useSales();
  const { notifications } = useUIState();
  const { formatCurrency, formatDateTime, includeTaxInProfit } = useSettings();
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);

  // Ensure chart only renders after mount to prevent width(-1) error
  useEffect(() => {
      const timer = setTimeout(() => {
          setIsChartReady(true);
      }, 100); // Increased delay slightly to ensure layout paint
      return () => clearTimeout(timer);
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

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
    // Helper to safely parse numbers, handling undefined/null/NaN
    const safeNum = (n: any) => {
        const num = parseFloat(n);
        return isNaN(num) ? 0 : num;
    };

    const result = filteredSales.reduce((acc, sale) => {
        const saleTotal = safeNum(sale.total);
        
        // Calculate COGS: Use stored value, fallback to summing items if 0/missing
        let saleCogs = safeNum(sale.cogs);
        // If COGS is 0 but there are items, try to calculate from item cost prices
        if (saleCogs === 0 && sale.items && sale.items.length > 0) {
             saleCogs = sale.items.reduce((itemSum, item) => {
                 return itemSum + (safeNum(item.costPrice) * safeNum(item.quantity));
             }, 0);
        }

        // Calculate Profit with dynamic setting
        // Profit = (Total - Tax) - COGS if includeTaxInProfit is false
        // Profit = Total - COGS if includeTaxInProfit is true
        const saleTax = safeNum(sale.tax);
        const revenue = saleTotal - (includeTaxInProfit ? 0 : saleTax);
        const saleProfit = revenue - saleCogs;

        return {
            totalSales: acc.totalSales + saleTotal,
            totalCogs: acc.totalCogs + saleCogs,
            totalProfit: acc.totalProfit + saleProfit
        };
    }, { totalSales: 0, totalCogs: 0, totalProfit: 0 });

    const lowStockItems = products.filter(p => p.stock <= p.lowStockThreshold).length;

    return { ...result, lowStockItems };
  }, [filteredSales, products, includeTaxInProfit]);

  const { chartData, chartTitle } = useMemo(() => {
    const now = new Date();
    const safeAdd = (current: number, addition: any) => current + (parseFloat(addition) || 0);

    // Helper to calculate adjusted profit ensuring consistency with stats
    const getAdjustedProfit = (sale: any) => {
        const safeNum = (n: any) => {
            const num = parseFloat(n);
            return isNaN(num) ? 0 : num;
        };
        const saleTotal = safeNum(sale.total);
        let saleCogs = safeNum(sale.cogs);
        // If COGS is 0 but there are items, try to calculate from item cost prices
        if (saleCogs === 0 && sale.items && sale.items.length > 0) {
             saleCogs = sale.items.reduce((itemSum: number, item: any) => {
                 return itemSum + (safeNum(item.costPrice) * safeNum(item.quantity));
             }, 0);
        }
        
        const saleTax = safeNum(sale.tax);
        const revenue = saleTotal - (includeTaxInProfit ? 0 : saleTax);
        return revenue - saleCogs;
    };

    switch (timeRange) {
        case 'today': {
            const data = Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, Sales: 0, Profit: 0 }));
            filteredSales.forEach(sale => {
                const hour = new Date(sale.date).getHours();
                if (data[hour]) {
                    data[hour].Sales = safeAdd(data[hour].Sales, sale.total);
                    data[hour].Profit = safeAdd(data[hour].Profit, getAdjustedProfit(sale));
                }
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
                    Profit: 0,
                    dateKey: toLocalDateKey(d)
                };
            });

            const salesByDay: { [key: string]: number } = {};
            const profitByDay: { [key: string]: number } = {};
            filteredSales.forEach(sale => {
                const key = toLocalDateKey(new Date(sale.date));
                salesByDay[key] = safeAdd(salesByDay[key] || 0, sale.total);
                profitByDay[key] = safeAdd(profitByDay[key] || 0, getAdjustedProfit(sale));
            });

            data.forEach(day => {
                if (salesByDay[day.dateKey]) {
                    day.Sales = salesByDay[day.dateKey];
                    day.Profit = profitByDay[day.dateKey];
                }
            });
            return { chartData: data, chartTitle: 'This Week' };
        }
        case 'monthly': {
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const data = Array.from({ length: daysInMonth }, (_, i) => ({
                name: `${i + 1}`,
                Sales: 0,
                Profit: 0
            }));
            filteredSales.forEach(sale => {
                const dayOfMonth = new Date(sale.date).getDate();
                if(data[dayOfMonth - 1]) {
                    data[dayOfMonth - 1].Sales = safeAdd(data[dayOfMonth - 1].Sales, sale.total);
                    data[dayOfMonth - 1].Profit = safeAdd(data[dayOfMonth - 1].Profit, getAdjustedProfit(sale));
                }
            });
            return { chartData: data, chartTitle: 'This Month' };
        }
        case 'yearly': {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const data = monthNames.map(m => ({ name: m, Sales: 0, Profit: 0 }));
            filteredSales.forEach(sale => {
                const month = new Date(sale.date).getMonth();
                if (data[month]) {
                    data[month].Sales = safeAdd(data[month].Sales, sale.total);
                    data[month].Profit = safeAdd(data[month].Profit, getAdjustedProfit(sale));
                }
            });
            return { chartData: data, chartTitle: 'This Year' };
        }
        case 'all': {
            if (filteredSales.length === 0) {
                return { chartData: [], chartTitle: 'All Time' };
            }
            const salesByMonth: { [key: string]: number } = {};
            const profitByMonth: { [key: string]: number } = {};
            filteredSales.forEach(sale => {
                const d = new Date(sale.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                salesByMonth[key] = safeAdd(salesByMonth[key] || 0, sale.total);
                profitByMonth[key] = safeAdd(profitByMonth[key] || 0, getAdjustedProfit(sale));
            });
            const data = Object.keys(salesByMonth).sort().map(key => {
                const [year, month] = key.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return {
                    name: formatDateTime(date, { month: 'short', year: '2-digit', hour: undefined, minute: undefined }),
                    Sales: salesByMonth[key],
                    Profit: profitByMonth[key]
                };
            });
            return { chartData: data, chartTitle: 'All Time' };
        }
        default:
            return { chartData: [], chartTitle: ''};
    }
  }, [filteredSales, timeRange, formatDateTime, includeTaxInProfit]);
  
  // Common Chart Props
  const commonAxisProps = {
      stroke: "#A0AEC0",
      fontSize: 12,
      tickLine: false,
      axisLine: false,
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="bg-slate-800/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-700">
                  <p className="text-gray-200 font-semibold mb-2">{label}</p>
                  {payload.map((entry: any) => (
                      <div key={entry.name} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-gray-300">{entry.name}:</span>
                          <span className="font-mono font-medium text-white">{formatCurrency(entry.value)}</span>
                      </div>
                  ))}
              </div>
          );
      }
      return null;
  };

  const renderChart = () => {
      if (timeRange === 'today') {
          return (
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" {...commonAxisProps} />
                <YAxis tickFormatter={yAxisTickFormatter} {...commonAxisProps} />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Legend wrapperStyle={{ paddingTop: '10px', color: '#E2E8F0' }} />
                <Bar dataKey="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sales" maxBarSize={50} isAnimationActive={false} activeBar={false} />
                <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" maxBarSize={50} isAnimationActive={false} activeBar={false} />
            </BarChart>
          );
      }
      return (
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" vertical={false} opacity={0.3} />
            <XAxis dataKey="name" {...commonAxisProps} />
            <YAxis tickFormatter={yAxisTickFormatter} {...commonAxisProps} />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Legend wrapperStyle={{ paddingTop: '10px', color: '#E2E8F0' }} />
            <Line 
                type="monotone" 
                dataKey="Sales" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={false} 
                name="Sales" 
                isAnimationActive={false}
            />
            <Line 
                type="monotone" 
                dataKey="Profit" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={false} 
                name="Profit" 
                isAnimationActive={false}
            />
        </LineChart>
      );
  };

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
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Sales & Profit Overview ({chartTitle})</h2>
        <div className="w-full h-[300px]" style={{ width: '100%', height: 300 }}>
          {isChartReady ? (
            <ResponsiveContainer width="99%" height="100%" minWidth={0}>
              {renderChart()}
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">Loading Chart...</div>
          )}
        </div>
      </div>
       <Modal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} title="Notifications" size="md">
        <NotificationsPanel onClose={() => setIsNotificationsOpen(false)} />
      </Modal>
    </div>
  );
};

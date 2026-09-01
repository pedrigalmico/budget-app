import { useState, useMemo } from 'react';
import { useAppState } from '../hooks/useAppState';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Income } from '../types';
import { groupLotsIntoPositions, getOpenPositions } from '../utils/investmentUtils';

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16'  // lime
];

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

// Custom label component for inside labels
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: CustomLabelProps) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: '8px', fontWeight: 'bold' }}
    >
      {`${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  );
};

type ReportTab = 'expenses' | 'investments';

export default function Reports() {
  const { state, formatMoney } = useAppState();
  const now = new Date();
  const [activeTab, setActiveTab] = useState<ReportTab>('expenses');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Generate available years (5 years back from current year)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);
  }, []);

  // Generate month names
  const monthNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      new Date(2000, i).toLocaleString('default', { month: 'long' })
    );
  }, []);

  // Calculate monthly income with memoization
  const monthlyIncome = useMemo(() => {
    return state.incomes
      .filter((income: Income) => {
        const incomeDate = new Date(income.date);
        return incomeDate.getMonth() === selectedMonth &&
               incomeDate.getFullYear() === selectedYear;
      })
      .reduce((total: number, income: Income) => total + income.amount, 0);
  }, [state.incomes, selectedMonth, selectedYear]);

  // Calculate monthly expenses with memoization
  const monthlyExpenses = useMemo(() => {
    return state.expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === selectedMonth &&
               expenseDate.getFullYear() === selectedYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  }, [state.expenses, selectedMonth, selectedYear]);

  // Calculate remaining budget
  const remainingBudget = monthlyIncome - monthlyExpenses;
  const budgetUsedPercentage = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;

  // Calculate expenses by category with memoization
  const categoryData = useMemo(() => {
    const categoryExpenses = state.expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === selectedMonth &&
               expenseDate.getFullYear() === selectedYear;
      })
      .reduce((acc, expense) => {
        const category = expense.category;
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += expense.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(categoryExpenses)
      .map(([name, value]) => ({
        name,
        value,
        percentage: monthlyExpenses > 0 ? (value / monthlyExpenses) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value); // Sort by value in descending order
  }, [state.expenses, selectedMonth, selectedYear, monthlyExpenses]);

  // Compute positions from lots — closed ones hold nothing, so they stay out
  // of the allocation and value totals
  const positions = useMemo(() => {
    return getOpenPositions(
      groupLotsIntoPositions(state.investments, state.priceCache, state.settings.usdToSarRate, state.settings.currency)
    );
  }, [state.investments, state.priceCache, state.settings.usdToSarRate, state.settings.currency]);

  // Investment calculations
  const totalInvested = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.totalInvested, 0);
  }, [positions]);

  const totalCurrentValue = useMemo(() => {
    return positions.reduce((sum, pos) => sum + (pos.currentValue ?? pos.totalInvested), 0);
  }, [positions]);

  const totalReturn = totalCurrentValue - totalInvested;
  const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  // Investment data grouped by category for pie chart
  const investmentCategoryData = useMemo(() => {
    const categoryMap: Record<string, { invested: number; currentValue: number }> = {};

    for (const pos of positions) {
      if (!categoryMap[pos.category]) {
        categoryMap[pos.category] = { invested: 0, currentValue: 0 };
      }
      categoryMap[pos.category].invested += pos.totalInvested;
      categoryMap[pos.category].currentValue += pos.currentValue ?? pos.totalInvested;
    }

    return Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        value: data.currentValue,
        invested: data.invested,
        returnAmount: data.currentValue - data.invested,
        returnPercentage: data.invested > 0 ? ((data.currentValue - data.invested) / data.invested) * 100 : 0,
        percentage: totalCurrentValue > 0 ? (data.currentValue / totalCurrentValue) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [positions, totalCurrentValue]);

  return (
    <div className="space-y-6 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Reports</h1>
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-surface-200 text-sm rounded-lg px-3 py-1.5 border-none focus:ring-2 focus:ring-blue-500 text-ink-50"
            >
              {monthNames.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-surface-200 text-sm rounded-lg px-3 py-1.5 border-none focus:ring-2 focus:ring-blue-500 text-ink-50"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-surface-200 rounded-lg p-1 mb-4">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'expenses'
                ? 'bg-blue-600 text-white'
                : 'text-ink-300 hover:text-ink-100'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('investments')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'investments'
                ? 'bg-blue-600 text-white'
                : 'text-ink-300 hover:text-ink-100'
            }`}
          >
            Investments
          </button>
        </div>

        {/* Expenses Report */}
        {activeTab === 'expenses' && (
          <>
            {/* Spending Summary */}
            <div className="bg-surface-100 rounded-lg p-4 mb-4">
              <h2 className="text-base font-medium mb-3 text-ink-50">Spending Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-surface-200 p-3 rounded-lg">
                  <h3 className="text-xs text-ink-300">Monthly Income</h3>
                  <p className="text-sm font-bold text-ink-50">{state.settings.currency} {formatMoney(monthlyIncome)}</p>
                </div>
                <div className="bg-surface-200 p-3 rounded-lg">
                  <h3 className="text-xs text-ink-300">Monthly Expenses</h3>
                  <p className="text-sm font-bold text-ink-50">{state.settings.currency} {formatMoney(monthlyExpenses)}</p>
                </div>
                <div className="bg-surface-200 p-3 rounded-lg">
                  <h3 className="text-xs text-ink-300">Remaining Budget</h3>
                  <p className={`text-sm font-bold ${remainingBudget < 0 ? 'text-red-500' : 'text-ink-50'}`}>
                    {state.settings.currency} {formatMoney(remainingBudget)}
                  </p>
                </div>
                <div className="bg-surface-200 p-3 rounded-lg">
                  <h3 className="text-xs text-ink-300">Budget Used</h3>
                  <p className={`text-sm font-bold ${budgetUsedPercentage > 100 ? 'text-red-500' : 'text-ink-50'}`}>
                    {(budgetUsedPercentage ?? 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-surface-100 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-medium text-ink-50">Category Breakdown</h2>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={130}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', fontSize: '8px' }}
                      itemStyle={{ fontSize: '9px', color: '#ffffff' }}
                      labelStyle={{ color: '#ffffff' }}
                      formatter={(value: number) => [`${state.settings.currency} ${formatMoney(value)}`]}
                    />
                    <Legend
                      formatter={(value) => <span className="text-ink-200">{value}</span>}
                      wrapperStyle={{ fontSize: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category List */}
              <div className="mt-4">
                <h3 className="text-base font-medium mb-2 text-ink-50">Detailed Breakdown</h3>
                <div className="space-y-2">
                  {categoryData.map((category, index) => (
                    <div key={category.name} className="flex justify-between items-center p-2.5 bg-surface-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-ink-200 text-sm">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-ink-50 text-sm">{state.settings.currency} {formatMoney(category.value)}</div>
                        <div className="text-xs text-ink-300">{(category.percentage ?? 0).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Investments Report */}
        {activeTab === 'investments' && (
          <>
            {/* Investment Summary */}
            <div className="bg-surface-100 rounded-lg p-4 mb-4">
              <h2 className="text-base font-medium mb-3 text-ink-50">Investment Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-surface-200 p-3 rounded-lg">
                  <h3 className="text-xs text-ink-300">Total Invested</h3>
                  <p className="text-sm font-bold text-ink-50">{state.settings.currency} {formatMoney(totalInvested)}</p>
                </div>
                <div className="bg-surface-200 p-3 rounded-lg">
                  <h3 className="text-xs text-ink-300">Current Value</h3>
                  <p className="text-sm font-bold text-ink-50">{state.settings.currency} {formatMoney(totalCurrentValue)}</p>
                </div>
                <div className="bg-surface-200 p-3 rounded-lg">
                  <h3 className="text-xs text-ink-300">Total Return</h3>
                  <p className={`text-sm font-bold ${totalReturn < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {totalReturn >= 0 ? '+' : ''}{state.settings.currency} {formatMoney(totalReturn)}
                  </p>
                </div>
                <div className="bg-surface-200 p-3 rounded-lg">
                  <h3 className="text-xs text-ink-300">Return %</h3>
                  <p className={`text-sm font-bold ${totalReturnPercentage < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {totalReturnPercentage >= 0 ? '+' : ''}{(totalReturnPercentage ?? 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Investment Category Breakdown */}
            <div className="bg-surface-100 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-medium text-ink-50">Portfolio Allocation</h2>
              </div>

              {investmentCategoryData.length > 0 ? (
                <>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={investmentCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={130}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {investmentCategoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none', fontSize: '8px' }}
                          itemStyle={{ fontSize: '9px', color: '#ffffff' }}
                          labelStyle={{ color: '#ffffff' }}
                          formatter={(value: number) => [`${state.settings.currency} ${formatMoney(value)}`, 'Value']}
                        />
                        <Legend
                          formatter={(value) => <span className="text-ink-200">{value}</span>}
                          wrapperStyle={{ fontSize: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Investment Category List */}
                  <div className="mt-4">
                    <h3 className="text-base font-medium mb-2 text-ink-50">Detailed Breakdown</h3>
                    <div className="space-y-2">
                      {investmentCategoryData.map((category, index) => (
                        <div key={category.name} className="flex justify-between items-center p-2.5 bg-surface-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-ink-200 text-sm">{category.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-ink-50 text-sm">{state.settings.currency} {formatMoney(category.value)}</div>
                            <div className={`text-xs ${category.returnAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {category.returnAmount >= 0 ? '+' : ''}{(category.returnPercentage ?? 0).toFixed(1)}% ({state.settings.currency} {formatMoney(category.returnAmount)})
                            </div>
                            <div className="text-xs text-ink-300">{(category.percentage ?? 0).toFixed(1)}% of portfolio</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-ink-400 py-8">
                  No investments yet. Add investments to see your portfolio breakdown.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

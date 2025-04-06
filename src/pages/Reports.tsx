import React, { useState, useMemo } from 'react';
import { useAppState } from '../hooks/useAppState';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Income } from '../types';

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

const formatNumber = (num: number): string => {
  const absNum = Math.abs(num);
  let formattedNum: string;
  
  if (absNum >= 1000000000) {
    formattedNum = (absNum / 1000000000).toFixed(1) + 'B';
  } else if (absNum >= 1000000) {
    formattedNum = (absNum / 1000000).toFixed(1) + 'M';
  } else if (absNum >= 1000) {
    formattedNum = (absNum / 1000).toFixed(1) + 'k';
  } else {
    formattedNum = absNum.toFixed(0);
  }
  
  return num < 0 ? `-${formattedNum}` : formattedNum;
};

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
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Reports() {
  const { state } = useAppState();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Generate available years (5 years back from current year)
  const availableYears = useMemo(() => {
    const currentYear = now.getFullYear();
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

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Monthly Reports</h1>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-gray-800 text-sm rounded-lg px-3 py-1.5 border-none focus:ring-2 focus:ring-blue-500 text-gray-100"
          >
            {monthNames.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-800 text-sm rounded-lg px-3 py-1.5 border-none focus:ring-2 focus:ring-blue-500 text-gray-100"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Spending Summary */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <h2 className="text-base font-medium mb-3 text-gray-100">Spending Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gray-800 p-3 rounded-lg">
            <h3 className="text-xs text-gray-400">Monthly Income</h3>
            <p className="text-sm font-bold text-gray-100">{state.settings.currency}{formatNumber(monthlyIncome)}</p>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <h3 className="text-xs text-gray-400">Monthly Expenses</h3>
            <p className="text-sm font-bold text-gray-100">{state.settings.currency}{formatNumber(monthlyExpenses)}</p>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <h3 className="text-xs text-gray-400">Remaining Budget</h3>
            <p className={`text-sm font-bold ${remainingBudget < 0 ? 'text-red-500' : 'text-gray-100'}`}>
              {state.settings.currency}{formatNumber(remainingBudget)}
            </p>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <h3 className="text-xs text-gray-400">Budget Used</h3>
            <p className={`text-sm font-bold ${budgetUsedPercentage > 100 ? 'text-red-500' : 'text-gray-100'}`}>
              {budgetUsedPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-medium text-gray-100">Category Breakdown</h2>
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
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', fontSize: '8px' }} 
                itemStyle={{ fontSize: '9px', color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Legend 
                formatter={(value) => <span className="text-gray-300">{value}</span>}
                wrapperStyle={{ fontSize: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category List */}
        <div className="mt-4">
          <h3 className="text-base font-medium mb-2 text-gray-100">Detailed Breakdown</h3>
          <div className="space-y-2">
            {categoryData.map((category, index) => (
              <div key={category.name} className="flex justify-between items-center p-2.5 bg-gray-800 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-gray-300 text-sm">{category.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-100 text-sm">{state.settings.currency}{formatNumber(category.value)}</div>
                  <div className="text-xs text-gray-400">{category.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 
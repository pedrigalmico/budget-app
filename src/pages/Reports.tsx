import React, { useState } from 'react';
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
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toFixed(0);
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

  // Get current month and year
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate monthly income
  const monthlyIncome = state.incomes
    .filter((income: Income) => {
      const incomeDate = new Date(income.date);
      return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
    })
    .reduce((total: number, income: Income) => total + income.amount, 0);

  // Calculate monthly expenses
  const monthlyExpenses = state.expenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    })
    .reduce((total, expense) => total + expense.amount, 0);

  // Calculate remaining budget
  const remainingBudget = monthlyIncome - monthlyExpenses;
  const budgetUsedPercentage = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;

  // Calculate expenses by category
  const categoryExpenses = state.expenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    })
    .reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += expense.amount;
      return acc;
    }, {} as Record<string, number>);

  // Convert to array for charts
  const categoryData = Object.entries(categoryExpenses).map(([name, value]) => ({
    name,
    value,
    percentage: (value / monthlyExpenses) * 100
  }));

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-100">Monthly Reports</h1>

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
            <p className="text-sm font-bold text-gray-100">{state.settings.currency}{formatNumber(remainingBudget)}</p>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <h3 className="text-xs text-gray-400">Budget Used</h3>
            <p className="text-sm font-bold text-gray-100">{budgetUsedPercentage.toFixed(1)}%</p>
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
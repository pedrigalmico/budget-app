import React, { useState, useMemo } from 'react';
import { useAppState } from '../hooks/useAppState';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaMoneyBillWave, FaChartLine, FaPiggyBank, FaWallet, FaBullseye, FaArrowRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

type ViewType = 'month' | 'ytd' | 'year';
type Category = 'income' | 'expenses' | 'investments' | 'goals';
type DataPoint = {
  date: string;
  income: number;
  expenses: number;
  investments: number;
  goals: number;
};

const categoryConfig = {
  income: { color: '#10B981', icon: <FaMoneyBillWave className="text-emerald-500" size={20} /> },
  expenses: { color: '#EF4444', icon: <FaWallet className="text-red-500" size={20} /> },
  investments: { color: '#6366F1', icon: <FaChartLine className="text-indigo-500" size={20} /> },
  goals: { color: '#F59E0B', icon: <FaBullseye className="text-amber-500" size={20} /> }
} as const;

// Type for accessing categoryConfig
type CategoryConfigKey = keyof typeof categoryConfig;

export default function Home() {
  const { state, formatMoney } = useAppState();
  const navigate = useNavigate();
  const [viewType, setViewType] = useState<ViewType>('ytd');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(['income', 'expenses', 'investments', 'goals']);

  // Generate available years (5 years back from current year)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);
  }, []);

  // Calculate current month's totals
  const currentMonthIncome = useMemo(() => {
    return state.incomes
      .filter(income => {
        const date = new Date(income.date);
        return date.getMonth() === new Date().getMonth() && 
               date.getFullYear() === new Date().getFullYear();
      })
      .reduce((sum, income) => sum + income.amount, 0);
  }, [state.incomes]);

  const currentMonthExpenses = useMemo(() => {
    return state.expenses
      .filter(expense => {
        const date = new Date(expense.date);
        return date.getMonth() === new Date().getMonth() && 
               date.getFullYear() === new Date().getFullYear();
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [state.expenses]);

  const totalInvestments = useMemo(() => {
    return state.investments.reduce((sum, investment) => sum + (investment.currentValue || investment.amount), 0);
  }, [state.investments]);

  const totalGoals = useMemo(() => {
    return state.goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
  }, [state.goals]);

  // Format Y-axis values
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000)}M`;
    if (value >= 1000) return `${(value / 1000)}k`;
    return value.toString();
  };

  // Prepare chart data based on view type
  const chartData = useMemo(() => {
    const data: DataPoint[] = [];
    const now = new Date();
    const year = viewType === 'year' ? selectedYear : now.getFullYear();

    if (viewType === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentMonth = now.toISOString().slice(0, 7);

      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${day}`;
        const dayStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;

        const dayIncome = state.incomes
          .filter(income => income.date.startsWith(dayStr))
          .reduce((sum, income) => sum + income.amount, 0);

        const dayExpenses = state.expenses
          .filter(expense => expense.date.startsWith(dayStr))
          .reduce((sum, expense) => sum + expense.amount, 0);

        const dayInvestments = state.investments
          .filter(inv => inv.date.startsWith(dayStr))
          .reduce((sum, inv) => sum + (inv.currentValue || inv.amount), 0);

        const dayGoals = state.goals
          .filter(goal => goal.date.startsWith(dayStr))
          .reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);

        data.push({
          date,
          income: dayIncome,
          expenses: dayExpenses,
          investments: dayInvestments,
          goals: dayGoals
        });
      }
    } else if (viewType === 'ytd' || viewType === 'year') {
      const months = viewType === 'ytd' ? now.getMonth() + 1 : 12;

      for (let month = 0; month < months; month++) {
        const date = new Date(year, month);
        const monthStr = date.toLocaleString('default', { month: 'short' });
        const monthPrefix = `${year}-${(month + 1).toString().padStart(2, '0')}`;

        const monthIncome = state.incomes
          .filter(income => income.date.startsWith(monthPrefix))
          .reduce((sum, income) => sum + income.amount, 0);

        const monthExpenses = state.expenses
          .filter(expense => expense.date.startsWith(monthPrefix))
          .reduce((sum, expense) => sum + expense.amount, 0);

        const monthInvestments = state.investments
          .filter(inv => inv.date.startsWith(monthPrefix))
          .reduce((sum, inv) => sum + (inv.currentValue || inv.amount), 0);

        const monthGoals = state.goals
          .filter(goal => goal.date.startsWith(monthPrefix))
          .reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);

        data.push({
          date: monthStr,
          income: monthIncome,
          expenses: monthExpenses,
          investments: monthInvestments,
          goals: monthGoals
        });
      }
    }

    return data;
  }, [state.incomes, state.expenses, state.investments, state.goals, viewType, selectedYear]);

  // Generate insights
  const getInsights = () => {
    const insights = [];
    
    // Highest expense category this month
    const expensesByCategory = state.expenses
      .filter(expense => {
        const date = new Date(expense.date);
        return date.getMonth() === new Date().getMonth() && 
               date.getFullYear() === new Date().getFullYear();
      })
      .reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);
    
    const highestExpenseCategory = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (highestExpenseCategory) {
      insights.push({
        icon: <FaWallet className="text-red-500" size={20} />,
        text: `Your highest expense category this month is ${highestExpenseCategory[0]} at ${state.settings.currency}${formatMoney(highestExpenseCategory[1])}.`
      });
    }

    // Most progressed goal
    const mostProgressedGoal = state.goals
      .map(goal => ({
        ...goal,
        progress: ((goal.currentAmount || 0) / goal.targetAmount) * 100
      }))
      .sort((a, b) => b.progress - a.progress)[0];

    if (mostProgressedGoal) {
      insights.push({
        icon: <FaPiggyBank className="text-amber-500" size={20} />,
        text: `You're ${mostProgressedGoal.progress.toFixed(1)}% of the way to your "${mostProgressedGoal.name}" goal!`
      });
    }

    // Investment growth/decline
    const totalInvestmentGrowth = state.investments.reduce((sum, investment) => {
      if (investment.currentValue && investment.amount) {
        return sum + (investment.currentValue - investment.amount);
      }
      return sum;
    }, 0);

    if (totalInvestmentGrowth !== 0) {
      insights.push({
        icon: <FaChartLine className={totalInvestmentGrowth > 0 ? "text-emerald-500" : "text-red-500"} size={20} />,
        text: `Your investments have ${totalInvestmentGrowth > 0 ? 'grown' : 'declined'} by ${state.settings.currency}${formatMoney(Math.abs(totalInvestmentGrowth))}.`
      });
    }

    // Monthly savings rate
    if (currentMonthIncome > 0) {
      const savingsRate = ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100;
      if (!isNaN(savingsRate)) {
        insights.push({
          icon: <FaMoneyBillWave className="text-emerald-500" size={20} />,
          text: `Your savings rate this month is ${savingsRate.toFixed(1)}%.`
        });
      }
    }

    return insights;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome Back, MiKai</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/income')}
          className="relative card min-h-[100px] flex flex-col justify-between text-left transition-all hover:scale-105 hover:shadow-lg active:scale-100 border border-transparent hover:border-emerald-500/50 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FaArrowRight className="absolute top-3 right-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0" size={16} />
          <div className="relative">
            <div className="flex items-center gap-2">
              {categoryConfig.income.icon}
              <h3 className="font-semibold">Income</h3>
            </div>
            <div>
              <p className="text-lg font-bold">{state.settings.currency}{formatMoney(currentMonthIncome)}</p>
              <p className="text-sm text-gray-400">This Month</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/expenses')}
          className="relative card min-h-[100px] flex flex-col justify-between text-left transition-all hover:scale-105 hover:shadow-lg active:scale-100 border border-transparent hover:border-red-500/50 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FaArrowRight className="absolute top-3 right-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0" size={16} />
          <div className="relative">
            <div className="flex items-center gap-2">
              {categoryConfig.expenses.icon}
              <h3 className="font-semibold">Expenses</h3>
            </div>
            <div>
              <p className="text-lg font-bold">{state.settings.currency}{formatMoney(currentMonthExpenses)}</p>
              <p className="text-sm text-gray-400">
                {state.settings.monthlySpendingLimit > 0 
                  ? `${((currentMonthExpenses / state.settings.monthlySpendingLimit) * 100).toFixed(1)}% of limit`
                  : 'No limit set'}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/investments')}
          className="relative card min-h-[100px] flex flex-col justify-between text-left transition-all hover:scale-105 hover:shadow-lg active:scale-100 border border-transparent hover:border-indigo-500/50 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FaArrowRight className="absolute top-3 right-3 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0" size={16} />
          <div className="relative">
            <div className="flex items-center gap-2">
              {categoryConfig.investments.icon}
              <h3 className="font-semibold">Investments</h3>
            </div>
            <div>
              <p className="text-lg font-bold">{state.settings.currency}{formatMoney(totalInvestments)}</p>
              <p className="text-sm text-gray-400">Total Value</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/goals')}
          className="relative card min-h-[100px] flex flex-col justify-between text-left transition-all hover:scale-105 hover:shadow-lg active:scale-100 border border-transparent hover:border-amber-500/50 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FaArrowRight className="absolute top-3 right-3 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0" size={16} />
          <div className="relative">
            <div className="flex items-center gap-2">
              {categoryConfig.goals.icon}
              <h3 className="font-semibold">Goals</h3>
            </div>
            <div>
              <p className="text-lg font-bold">{state.settings.currency}{formatMoney(totalGoals)}</p>
              <p className="text-sm text-gray-400">Total Progress</p>
            </div>
          </div>
        </button>
      </div>

      {/* Graph Controls */}
      <div>
        <div className="flex justify-start items-center gap-2 mb-4">
          <button
            onClick={() => setViewType('month')}
            className={`px-3 py-1 rounded-full text-sm ${
              viewType === 'month' ? 'bg-blue-500' : 'bg-gray-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewType('ytd')}
            className={`px-3 py-1 rounded-full text-sm ${
              viewType === 'ytd' ? 'bg-blue-500' : 'bg-gray-700'
            }`}
          >
            YTD
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewType('year')}
              className={`px-3 py-1 rounded-full text-sm ${
                viewType === 'year' ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              Year
            </button>
            {viewType === 'year' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-gray-700 text-sm rounded-full px-3 py-1 border-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {Object.entries(categoryConfig).map(([category, config]) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategories(prev =>
                  prev.includes(category as Category)
                    ? prev.filter(c => c !== category)
                    : [...prev, category as Category]
                );
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedCategories.includes(category as Category)
                  ? `bg-blue-500 bg-${config.color} text-${config.color}`
                  : 'bg-gray-700'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div className="card p-0">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const categoryKey = name === "Savings Goals" ? "goals" :
                                    name.toLowerCase() as CategoryConfigKey;
                  return [
                    `${state.settings.currency} ${formatMoney(value)}`,
                    <span key={name} style={{ color: categoryConfig[categoryKey].color }}>
                      {name}
                    </span>
                  ];
                }}
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '0.375rem',
                  padding: '0.5rem'
                }}
                itemStyle={{ color: '#F3F4F6' }}
                labelStyle={{ color: '#9CA3AF', marginBottom: '0.25rem' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={24}
                iconType="circle"
                wrapperStyle={{
                  fontSize: '11px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingLeft: '60px'
                }}
              />
              
              {selectedCategories.includes('income') && (
                <Line 
                  name="Income"
                  type="monotone" 
                  dataKey="income" 
                  stroke={categoryConfig.income.color}
                  strokeWidth={2}
                  dot={{ fill: categoryConfig.income.color, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {selectedCategories.includes('expenses') && (
                <Line 
                  name="Expenses"
                  type="monotone" 
                  dataKey="expenses" 
                  stroke={categoryConfig.expenses.color}
                  strokeWidth={2}
                  dot={{ fill: categoryConfig.expenses.color, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {selectedCategories.includes('investments') && (
                <Line 
                  name="Investments"
                  type="monotone" 
                  dataKey="investments" 
                  stroke={categoryConfig.investments.color}
                  strokeWidth={2}
                  dot={{ fill: categoryConfig.investments.color, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {selectedCategories.includes('goals') && (
                <Line 
                  name="Savings Goals"
                  type="monotone" 
                  dataKey="goals" 
                  stroke={categoryConfig.goals.color}
                  strokeWidth={2}
                  dot={{ fill: categoryConfig.goals.color, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Insights</h2>
        <div className="space-y-3">
          {getInsights().map((insight, index) => (
            <div key={index} className="card flex items-start gap-3">
              <div className="mt-1">{insight.icon}</div>
              <p>{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
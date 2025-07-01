import { useState, useMemo } from 'react';
import { useAppState } from '../hooks/useAppState';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Income, Expense, Goal, Contribution } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PERIODS = ['Month', 'YTD', 'Year', 'Custom'] as const;
type Period = typeof PERIODS[number];

export default function Savings() {
  const { state } = useAppState();
  const [period, setPeriod] = useState<Period>('YTD');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [customFrom, setCustomFrom] = useState<string>(`${now.getFullYear()}-01`);
  const [customTo, setCustomTo] = useState<string>(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  // Helper: get all months in current year
  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i: number) =>
      new Date(now.getFullYear(), i, 1).toLocaleString('default', { month: 'short' })
    ), [now]
  );

  // Helper: get all years in data
  const years = useMemo(() => {
    const allYears = [
      ...state.incomes.map((i: Income) => new Date(i.date).getFullYear()),
      ...state.expenses.map((e: Expense) => new Date(e.date).getFullYear()),
      ...state.goals.flatMap((g: Goal) => (g.contributions || []).map((c: Contribution) => new Date(c.date).getFullYear())),
    ];
    return Array.from(new Set(allYears)).sort();
  }, [state]);

  // Calculate savings data for graph
  const savingsData = useMemo(() => {
    if (period === 'Month') {
      return [];
    } else if (period === 'Year') {
      // Show savings for each year
      return years.map((year: number) => {
        const income = state.incomes.filter(
          (inc: Income) => new Date(inc.date).getFullYear() === year
        ).reduce((sum: number, inc: Income) => sum + inc.amount, 0);
        const expenses = state.expenses.filter(
          (exp: Expense) => new Date(exp.date).getFullYear() === year
        ).reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
        const contributions = state.goals.flatMap((g: Goal) => g.contributions || []).filter(
          (c: Contribution) => new Date(c.date).getFullYear() === year
        ).reduce((sum: number, c: Contribution) => sum + c.amount, 0);
        return income - expenses - contributions;
      });
    } else if (period === 'Custom') {
      // Show savings for each month in custom range
      const from = new Date(customFrom + '-01');
      const to = new Date(customTo + '-01');
      const monthsInRange = [];
      let d = new Date(from);
      while (d <= to) {
        monthsInRange.push({ year: d.getFullYear(), month: d.getMonth() });
        d.setMonth(d.getMonth() + 1);
      }
      return monthsInRange.map(({ year, month }) => {
        const income = state.incomes.filter(
          (inc: Income) => new Date(inc.date).getFullYear() === year && new Date(inc.date).getMonth() === month
        ).reduce((sum: number, inc: Income) => sum + inc.amount, 0);
        const expenses = state.expenses.filter(
          (exp: Expense) => new Date(exp.date).getFullYear() === year && new Date(exp.date).getMonth() === month
        ).reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
        const contributions = state.goals.flatMap((g: Goal) => g.contributions || []).filter(
          (c: Contribution) => new Date(c.date).getFullYear() === year && new Date(c.date).getMonth() === month
        ).reduce((sum: number, c: Contribution) => sum + c.amount, 0);
        return income - expenses - contributions;
      });
    } else {
      // YTD: savings for each month up to now in current year
      return months.map((_, i: number) => {
        if (i > now.getMonth()) return null;
        const month = i;
        const year = now.getFullYear();
        const income = state.incomes.filter(
          (inc: Income) => new Date(inc.date).getFullYear() === year && new Date(inc.date).getMonth() === month
        ).reduce((sum: number, inc: Income) => sum + inc.amount, 0);
        const expenses = state.expenses.filter(
          (exp: Expense) => new Date(exp.date).getFullYear() === year && new Date(exp.date).getMonth() === month
        ).reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
        const contributions = state.goals.flatMap((g: Goal) => g.contributions || []).filter(
          (c: Contribution) => new Date(c.date).getFullYear() === year && new Date(c.date).getMonth() === month
        ).reduce((sum: number, c: Contribution) => sum + c.amount, 0);
        return income - expenses - contributions;
      });
    }
  }, [period, state, months, years, now, customFrom, customTo]);

  // Labels for graph
  const labels = useMemo(() => {
    if (period === 'Year') return years;
    if (period === 'Custom') {
      const from = new Date(customFrom + '-01');
      const to = new Date(customTo + '-01');
      const monthsInRange = [];
      let d = new Date(from);
      while (d <= to) {
        monthsInRange.push(`${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`);
        d.setMonth(d.getMonth() + 1);
      }
      return monthsInRange;
    }
    return months;
  }, [period, months, years, customFrom, customTo]);

  // Calculate total savings for selected month
  const [year, month] = selectedMonth.split('-').map(Number);
  const totalIncome = state.incomes.filter((inc: Income) => {
    const d = new Date(inc.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  }).reduce((sum: number, inc: Income) => sum + inc.amount, 0);
  const totalExpenses = state.expenses.filter((exp: Expense) => {
    const d = new Date(exp.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  }).reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
  const totalContributions = state.goals.flatMap((g: Goal) => g.contributions || []).filter((c: Contribution) => {
    const d = new Date(c.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  }).reduce((sum: number, c: Contribution) => sum + c.amount, 0);
  const totalSavings = totalIncome - totalExpenses - totalContributions;

  // Calculate total savings for YTD, Year, Custom
  let rangeLabel = '';
  let rangeTotal = 0;
  if (period === 'YTD') {
    const y = now.getFullYear();
    const m = now.getMonth();
    const incomes = state.incomes.filter((inc: Income) => {
      const d = new Date(inc.date);
      return d.getFullYear() === y && d.getMonth() <= m;
    });
    const expenses = state.expenses.filter((exp: Expense) => {
      const d = new Date(exp.date);
      return d.getFullYear() === y && d.getMonth() <= m;
    });
    const contributions = state.goals.flatMap((g: Goal) => g.contributions || []).filter((c: Contribution) => {
      const d = new Date(c.date);
      return d.getFullYear() === y && d.getMonth() <= m;
    });
    rangeTotal = incomes.reduce((sum: number, i: Income) => sum + i.amount, 0) - expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0) - contributions.reduce((sum: number, c: Contribution) => sum + c.amount, 0);
    rangeLabel = `Total Savings for Jan–${now.toLocaleString('default', { month: 'short' })} ${y}`;
  } else if (period === 'Year') {
    const y = now.getFullYear();
    const incomes = state.incomes.filter((inc: Income) => new Date(inc.date).getFullYear() === y);
    const expenses = state.expenses.filter((exp: Expense) => new Date(exp.date).getFullYear() === y);
    const contributions = state.goals.flatMap((g: Goal) => g.contributions || []).filter((c: Contribution) => new Date(c.date).getFullYear() === y);
    rangeTotal = incomes.reduce((sum: number, i: Income) => sum + i.amount, 0) - expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0) - contributions.reduce((sum: number, c: Contribution) => sum + c.amount, 0);
    rangeLabel = `Total Savings for ${y}`;
  } else if (period === 'Custom') {
    const from = new Date(customFrom + '-01');
    const to = new Date(customTo + '-01');
    const incomes = state.incomes.filter((inc: Income) => {
      const d = new Date(inc.date);
      return d >= from && d <= to;
    });
    const expenses = state.expenses.filter((exp: Expense) => {
      const d = new Date(exp.date);
      return d >= from && d <= to;
    });
    const contributions = state.goals.flatMap((g: Goal) => g.contributions || []).filter((c: Contribution) => {
      const d = new Date(c.date);
      return d >= from && d <= to;
    });
    rangeTotal = incomes.reduce((sum: number, i: Income) => sum + i.amount, 0) - expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0) - contributions.reduce((sum: number, c: Contribution) => sum + c.amount, 0);
    rangeLabel = `Total Savings for Custom Range`;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Savings</h1>
        <div className="w-10"></div>
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-4 mb-4">
          {PERIODS.map(p => (
            <button
              key={p}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${period === p ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
        {/* Month Filter */}
        {period === 'Month' && (
          <div className="mb-4">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="input"
            />
          </div>
        )}
        {/* Custom Date Range Filter */}
        {period === 'Custom' && (
          <div className="flex gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">From</label>
              <input
                type="month"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="input"
                max={customTo}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">To</label>
              <input
                type="month"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="input"
                min={customFrom}
              />
            </div>
          </div>
        )}
        {/* Total Savings Card */}
        {(period === 'Month') && (
          <div className="card mb-4">
            <h2 className="text-lg text-gray-400">Total Savings for {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <div className={`text-3xl font-bold ${totalSavings >= 0 ? 'text-green-500' : 'text-red-500'}`}>SAR {totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        )}
        {(period === 'YTD' || period === 'Year' || period === 'Custom') && (
          <div className="card mb-4">
            <h2 className="text-lg text-gray-400">{rangeLabel}</h2>
            <div className={`text-3xl font-bold ${rangeTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>SAR {rangeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        )}
        {/* Graph for YTD, Year, Custom */}
        {(period === 'YTD' || period === 'Year' || period === 'Custom') && (
          <div className="card p-4">
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: 'Savings',
                    data: savingsData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.2)',
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#3b82f6',
                    tension: 0.4,
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: true, labels: { color: '#fff' } },
                  title: { display: false },
                },
                scales: {
                  x: { ticks: { color: '#fff' }, grid: { color: '#444' } },
                  y: {
                    ticks: {
                      color: '#fff',
                      callback: function(value) {
                        if (typeof value === 'number') {
                          if (Math.abs(value) >= 1000) {
                            return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
                          }
                          return value;
                        }
                        return value;
                      }
                    },
                    grid: { color: '#444' }
                  },
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
} 
import React from 'react';
import { useLocation } from 'react-router-dom';
import { FaHome, FaDollarSign, FaArrowUp, FaBullseye, FaChartBar, FaChartPie, FaCog } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/', icon: FaHome },
    { name: 'Expenses', href: '/expenses', icon: FaDollarSign },
    { name: 'Income', href: '/income', icon: FaArrowUp },
    { name: 'Goals', href: '/goals', icon: FaBullseye },
    { name: 'Investments', href: '/investments', icon: FaChartBar },
    { name: 'Reports', href: '/reports', icon: FaChartPie },
    { name: 'Settings', href: '/settings', icon: FaCog },
  ];

  // ... rest of the code ...

  return (
    <nav>
      <ul>
        {navigation.map((item) => (
          <li key={item.name}>
            <NavLink to={item.href} className={({ isActive }) => isActive ? 'active' : ''}>
              {item.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
} 
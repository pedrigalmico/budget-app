import React from 'react';
import { useLocation } from 'react-router-dom';
import { FaHome, FaDollarSign, FaArrowUp, FaBullseye, FaChartBar, FaChartPie, FaCog } from 'react-icons/fa';

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
} 
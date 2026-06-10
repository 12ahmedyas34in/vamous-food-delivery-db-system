// frontend/src/components/layout/AppLayout.jsx
//
// Shared layout for authenticated pages. Renders the Header and provides
// a content area with proper top-padding to account for the fixed header.

import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../Header';

const AppLayout = () => {
  return (
    <>
      <Header />
      <main className="pt-16">
        <Outlet />
      </main>
    </>
  );
};

export default AppLayout;

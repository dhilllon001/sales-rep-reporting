import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Shell.jsx'
import ReportsHub from './pages/ReportsHub.jsx'
import SalesRepDashboard from './pages/SalesRepDashboard.jsx'
import SalesRepDetail from './pages/SalesRepDetail.jsx'
import { ReportingScopeProvider } from './context/ReportingScopeContext.jsx'

function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className="pm-main-scroll" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="pm-screen">
            <Routes>
              <Route path="/reports" element={<ReportsHub />}>
                <Route index element={<Navigate to="sales-rep/dashboard" replace />} />
                <Route path="sales-rep/dashboard" element={<SalesRepDashboard />} />
                <Route path="sales-rep/rep-detail" element={<SalesRepDetail />} />
              </Route>
              <Route path="*" element={<Navigate to="/reports/sales-rep/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ReportingScopeProvider>
      <AppLayout />
    </ReportingScopeProvider>
  )
}

import React from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './components/Shell.jsx'
import ReportsHub from './pages/ReportsHub.jsx'
import SalesRepDashboard from './pages/SalesRepDashboard.jsx'
import SalesRepDetail from './pages/SalesRepDetail.jsx'
import { ReportingScopeProvider } from './context/ReportingScopeContext.jsx'

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const inReports = location.pathname.startsWith('/reports')
  const activeView = inReports ? 'reports' : ''

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar activeView={activeView} onNav={() => navigate('/reports/sales-rep/dashboard')} />
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

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import MapPage from '@/pages/MapPage'
import DetailPage from '@/pages/DetailPage'
import SamplingPage from '@/pages/SamplingPage'
import AlertsPage from '@/pages/AlertsPage'
import PatrolPage from '@/pages/PatrolPage'
import ReportsPage from '@/pages/ReportsPage'
import { useStore } from '@/store'

function AppLayout() {
  const alerts = useStore((s) => s.alerts)
  const unresolvedCount = alerts.filter((a) => a.status !== 'resolved').length

  return (
    <Layout notificationCount={unresolvedCount}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/detail" element={<DetailPage />} />
        <Route path="/sampling" element={<SamplingPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/patrol" element={<PatrolPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}

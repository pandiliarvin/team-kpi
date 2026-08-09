import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Dashboard from "./pages/Dashboard";
import KPIManagement from "./pages/KPIManagement";
import MonthlyKPIScores from "./pages/MonthlyKPIScores";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

function App() {
  return (
    <Routes>

      {/* Login */}
      <Route path="/" element={<Login />} />
	  
	  {/* Reset password */}
	  <Route
		  path="/reset-password"
		  element={<ResetPassword />}
		/>
		
		{/* Update password */}
		<Route
		  path="/update-password"
		  element={<UpdatePassword />}
		/>

      {/* Protected Application */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >

        {/* Dashboard */}
        <Route 
          path="/dashboard" 
          element={<Dashboard />} 
        />

        {/* KPI Management */}
        <Route 
          path="/kpis" 
          element={<KPIManagement />} 
        />

        {/* Monthly KPI Scores */}
        <Route
          path="/monthly-scores"
          element={<MonthlyKPIScores />}
        />

      </Route>

    </Routes>
  );
}

export default App;
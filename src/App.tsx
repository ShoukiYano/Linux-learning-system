import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';
import { Demo } from './pages/Demo';
import { Dashboard } from './pages/Dashboard';
import { MissionList } from './pages/MissionList';
import { MissionRunner } from './pages/MissionRunner';
import { Dictionary } from './pages/Dictionary';
import { Profile } from './pages/Profile';
import { Leaderboard } from './pages/Leaderboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Admin } from './pages/Admin';
import { AdminCommandEditor } from './pages/AdminCommandEditor';
import { AdminLearningPathEditor } from './pages/AdminLearningPathEditor';
import { AdminHelpEditor } from './pages/AdminHelpEditor';
import { AdminQAManager } from './pages/AdminQAManager';
import { AdminMaintenance } from './pages/AdminMaintenance';
import { HelpCenter } from './pages/HelpCenter';
import { Community } from './pages/Community';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/demo" element={<Demo />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/missions" element={<MissionList />} />
          <Route path="/missions/:id" element={<MissionRunner />} />
          <Route path="/dictionary" element={<Dictionary />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/missions" element={<Admin />} />
          <Route path="/admin/commands" element={<AdminCommandEditor />} />
          <Route path="/admin/learning-paths" element={<AdminLearningPathEditor />} />
          <Route path="/admin/help" element={<AdminHelpEditor />} />
          <Route path="/admin/qa" element={<AdminQAManager />} />
          <Route path="/admin/maintenance" element={<AdminMaintenance />} />
          
          {/* Public Pages */}
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/community" element={<Community />} />
          
          {/* Fallbacks */}
          <Route path="/ranking" element={<Leaderboard />} />
          <Route path="/settings" element={<Profile />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;

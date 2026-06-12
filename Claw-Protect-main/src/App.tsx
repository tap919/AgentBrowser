/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Overview } from './components/dashboard/Overview';
import { CommandCenter } from './components/dashboard/CommandCenter';
import { Analytics } from './components/dashboard/Analytics';
import { GitHubIntegration } from './components/dashboard/GitHubIntegration';
import { SetupWizard } from './components/dashboard/SetupWizard';
import { ThreatHunt } from './components/dashboard/ThreatHunt';
import { VulnScanner } from './components/dashboard/VulnScanner';
import { PlaybookManager } from './components/dashboard/PlaybookManager';
import { CyberWiki } from './components/dashboard/CyberWiki';
import { BrainInterface } from './components/agent/BrainInterface';
import { EndpointStatus } from './components/protection/EndpointStatus';
import { NetworkDefense } from './components/protection/NetworkDefense';
import { DataProtection } from './components/protection/DataProtection';
import { IdentityAccess } from './components/protection/IdentityAccess';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { Login } from './components/auth/Login';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSetup, setShowSetup] = useState(false);
  const { user, loading, isAuthReady } = useAuth();

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Initializing System...</p>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <SetupWizard
        onComplete={(config) => {
          console.log('Setup completed:', config);
          setShowSetup(false);
        }}
      />
    );
  }

  if (!user) {
    return <Login onOpenSetup={() => setShowSetup(true)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'command':
        return <CommandCenter />;
      case 'analytics':
        return <Analytics />;
      case 'github':
        return <GitHubIntegration />;
      case 'brain':
        return <BrainInterface />;
      case 'threathunt':
        return <ThreatHunt />;
      case 'vulnscanner':
        return <VulnScanner />;
      case 'playbooks':
        return <PlaybookManager />;
      case 'cyberwiki':
        return <CyberWiki />;
      case 'endpoint':
        return <EndpointStatus />;
      case 'network':
        return <NetworkDefense />;
      case 'dlp':
        return <DataProtection />;
      case 'identity':
        return <IdentityAccess />;
      default:
        return <Overview />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}



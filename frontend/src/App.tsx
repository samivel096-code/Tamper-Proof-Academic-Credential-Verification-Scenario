import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Sidebar, NavTab } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { UploadVerification } from "./pages/UploadVerification";
import { DocumentReview } from "./pages/DocumentReview";
import { History } from "./pages/History";
import { TemplateManagement } from "./pages/TemplateManagement";
import { BulkProcessing } from "./pages/BulkProcessing";

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [activeVerificationId, setActiveVerificationId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-xs text-blue-400 font-mono animate-pulse">
          Initializing Secure Screening Environment...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const navigateToReview = (verificationId: number) => {
    setActiveVerificationId(verificationId);
    setCurrentTab("review");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentTab={currentTab} onTabChange={(tab) => setCurrentTab(tab)} />

        <main className="flex-1 overflow-y-auto">
          {currentTab === "dashboard" && (
            <Dashboard
              onNavigateReview={navigateToReview}
              onNavigateUpload={() => setCurrentTab("upload")}
            />
          )}

          {currentTab === "upload" && (
            <UploadVerification onNavigateReview={navigateToReview} />
          )}

          {currentTab === "review" && (
            <DocumentReview
              verificationId={activeVerificationId || 1}
              onBack={() => setCurrentTab("dashboard")}
            />
          )}

          {currentTab === "bulk" && (
            <BulkProcessing onNavigateReview={navigateToReview} />
          )}

          {currentTab === "history" && (
            <History onNavigateReview={navigateToReview} />
          )}

          {currentTab === "templates" && <TemplateManagement />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}


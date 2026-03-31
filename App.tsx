import React, { useState } from 'react';
import Navbar from './components/Navbar';
import SalesForm from './components/SalesForm';
import PlannerDashboard from './components/PlannerDashboard'; // Keeping for read-only view
import SettingsForm from './components/SettingsForm';

type ViewState = 'list' | 'create' | 'settings';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('list');

  const handleSalesComplete = () => {
    alert("Job Order Saved!");
    setView('list'); 
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Navbar setView={setView} />
      
      <main className="py-6">
        {/* Settings View */}
        {view === 'settings' && (
            <SettingsForm onBack={() => setView('list')} />
        )}

        {/* Sales Portal Views */}
        {view !== 'settings' && (
            <div className="max-w-7xl mx-auto px-4">
                {view === 'list' && (
                    <div className="text-center py-20">
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">Job Order Portal</h1>
                        <p className="text-gray-600 mb-8">Create and manage job orders.</p>
                        <button onClick={() => setView('create')} className="bg-brand-600 text-white px-8 py-3 rounded-lg text-lg font-bold shadow-lg hover:bg-brand-700 transition">
                            + Create New Job Order
                        </button>
                        <div className="mt-12 text-left">
                            <h3 className="text-xl font-bold text-gray-700 mb-4 text-center">Recent Orders</h3>
                             {/* Reusing planner dashboard for read-only view */}
                            <PlannerDashboard onSelectOrder={() => {}} /> 
                        </div>
                    </div>
                )}
                
                {view === 'create' && (
                    <SalesForm onComplete={handleSalesComplete} />
                )}
            </div>
        )}
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm">
        Created by Muhammad Nur Idham Bin Razali
      </footer>
    </div>
  );
};

export default App;

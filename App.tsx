import React, { useState } from 'react';
import Navbar from './components/Navbar';
import SalesForm from './components/SalesForm';
import PlannerDashboard from './components/PlannerDashboard';
import PlannerForm from './components/PlannerForm';

type ViewState = 'list' | 'create' | 'plan';
type Role = 'sales' | 'planner';

const App: React.FC = () => {
  const [role, setRole] = useState<Role>('sales');
  const [view, setView] = useState<ViewState>('list');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleSalesComplete = () => {
    alert("Job Order submitted to Planner!");
    // Ideally redirect to list or reset form
    setView('list'); 
  };

  const handleSelectOrder = (id: string) => {
    setSelectedOrderId(id);
    setView('plan');
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Navbar currentRole={role} setRole={setRole} setView={setView} />
      
      <main className="py-6">
        {/* Intro / Welcome when list is empty for specific roles could go here */}
        
        {role === 'sales' && (
            <div className="max-w-7xl mx-auto px-4">
                {view === 'list' && (
                    <div className="text-center py-20">
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">Sales Portal</h1>
                        <p className="text-gray-600 mb-8">Create new job orders for the production planning team.</p>
                        <button onClick={() => setView('create')} className="bg-brand-600 text-white px-8 py-3 rounded-lg text-lg font-bold shadow-lg hover:bg-brand-700 transition">
                            + Create New Job Order
                        </button>
                        <div className="mt-12 text-left">
                            <h3 className="text-xl font-bold text-gray-700 mb-4 text-center">Recent Orders (View Only)</h3>
                             {/* Reusing planner dashboard for read-only view in sales */}
                            <PlannerDashboard onSelectOrder={() => {}} /> 
                        </div>
                    </div>
                )}
                
                {view === 'create' && (
                    <SalesForm onComplete={handleSalesComplete} />
                )}
            </div>
        )}

        {role === 'planner' && (
            <div className="max-w-7xl mx-auto px-4">
                {view === 'list' && (
                    <PlannerDashboard onSelectOrder={handleSelectOrder} />
                )}

                {view === 'plan' && selectedOrderId && (
                    <PlannerForm orderId={selectedOrderId} onClose={() => setView('list')} />
                )}
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
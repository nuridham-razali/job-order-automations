
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Save, Mail, CheckCircle } from 'lucide-react';

interface SettingsFormProps {
  onBack: () => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const settings = StorageService.getSettings();
    if (settings.plannerEmail) {
        setEmail(settings.plannerEmail);
    }
  }, []);

  const handleSave = () => {
    StorageService.saveSettings({ plannerEmail: email });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto my-8 px-4">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-800">System Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Configure automated notifications for the Job Order workflow.</p>
        </div>
        
        <div className="p-6 space-y-6">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Planner Notification Email
                </label>
                <p className="text-xs text-gray-500 mb-3">
                    When a Sales Executive saves a new Job Order, an email notification will be sent to this address to alert the planning department.
                </p>
                <div className="flex gap-4">
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="planner@halagel.com"
                        className="flex-1 border rounded-md p-2 border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                    />
                </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
                <button onClick={onBack} className="text-gray-600 hover:text-gray-800 text-sm font-medium">
                    Cancel
                </button>
                <button 
                    onClick={handleSave} 
                    className={`px-6 py-2 rounded-md font-bold text-white flex items-center transition-colors ${
                        isSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-600 hover:bg-brand-700'
                    }`}
                >
                    {isSaved ? (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2" /> Saved
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" /> Save Settings
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsForm;


import { JobOrder, AppSettings } from '../types';

// TODO: PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
// If this URL is left as the placeholder, the app will automatically fall back to using
// browser LocalStorage, allowing you to test the full workflow immediately.
const API_URL = 'https://script.google.com/macros/library/d/1necCYyS8pO85DHS00OAItMos9uUhtiuGpzHFdJGaBNtDR5xa_RYazqrv/2';
const LOCAL_STORAGE_KEY = 'halagel_orders';
const SETTINGS_KEY = 'halagel_settings';

export const StorageService = {
  /**
   * Fetch all orders from Google Sheets or LocalStorage
   */
  getAllOrders: async (): Promise<JobOrder[]> => {
    // If API URL is not configured, use LocalStorage
    if (API_URL.includes('PASTE_YOUR')) {
        console.warn("API URL not set. Using LocalStorage for demonstration.");
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to parse local storage", e);
            return [];
        }
    }

    try {
      const response = await fetch(`${API_URL}?action=get`);
      const data = await response.json();
      
      if (!Array.isArray(data)) return [];
      
      return data as JobOrder[];
    } catch (e) {
      console.error("Failed to load orders from API", e);
      return [];
    }
  },

  /**
   * Find specific order (now async)
   */
  getOrderById: async (id: string): Promise<JobOrder | undefined> => {
    const orders = await StorageService.getAllOrders();
    return orders.find(o => o.id === id);
  },

  /**
   * Send new order to Google Sheets or LocalStorage
   */
  createOrder: async (order: JobOrder): Promise<void> => {
    // LocalStorage Fallback
    if (API_URL.includes('PASTE_YOUR')) {
        const orders = await StorageService.getAllOrders();
        orders.push(order);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders));
        // Minimal delay for responsiveness
        await new Promise(resolve => setTimeout(resolve, 50));
        return;
    }

    try {
      await fetch(API_URL, {
        method: 'POST',
        // CORS mode 'no-cors' is opaque (we won't see response), 
        // but 'text/plain' content type avoids preflight OPTIONS check issues with GAS
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'create',
          data: order
        })
      });
    } catch (e) {
      console.error("Failed to create order", e);
      throw e;
    }
  },

  /**
   * Update existing order in Google Sheets or LocalStorage
   */
  updateOrder: async (updatedOrder: JobOrder): Promise<void> => {
    // LocalStorage Fallback
    if (API_URL.includes('PASTE_YOUR')) {
        const orders = await StorageService.getAllOrders();
        const index = orders.findIndex(o => o.id === updatedOrder.id);
        if (index !== -1) {
            orders[index] = updatedOrder;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders));
        }
        // Minimal delay for responsiveness
        await new Promise(resolve => setTimeout(resolve, 50));
        return;
    }

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'update',
          data: updatedOrder
        })
      });
    } catch (e) {
      console.error("Failed to update order", e);
      throw e;
    }
  },

  // --- Settings & Notifications ---

  getSettings: (): AppSettings => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? JSON.parse(stored) : { plannerEmail: '' };
    } catch (e) {
      return { plannerEmail: '' };
    }
  },

  saveSettings: (settings: AppSettings): void => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  notifyPlanner: async (order: JobOrder): Promise<boolean> => {
    const settings = StorageService.getSettings();
    if (!settings.plannerEmail) {
        console.log("No planner email configured. Skipping notification.");
        return false;
    }

    console.log(`Sending notification to Planner (${settings.plannerEmail}) for Order ${order.poNumber}...`);

    // If using Google Apps Script API
    if (!API_URL.includes('PASTE_YOUR')) {
        try {
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'notify',
                    email: settings.plannerEmail,
                    orderId: order.id,
                    poNumber: order.poNumber,
                    customer: order.customerName
                })
            });
            return true;
        } catch (e) {
            console.error("Failed to send notification via API", e);
            return false;
        }
    } else {
        // Mock notification for LocalStorage mode
        // In a real browser-only environment, we can't send emails without a 3rd party service.
        // We simulate a delay.
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log("Notification 'sent' (simulated).");
        return true;
    }
  },

  // Helper for generating ID
  generateId: (): string => {
    return Math.random().toString(36).substr(2, 9);
  }
};

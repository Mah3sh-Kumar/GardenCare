import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DataService } from '../services/dataService';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const alerts = await DataService.getAlerts();
      setNotifications(alerts);
      setUnreadCount(alerts.length);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await DataService.markAlertAsRead(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const clearAllAlerts = useCallback(async () => {
    try {
      await DataService.clearAllAlerts();
      setNotifications([]);
      setUnreadCount(0);
      return true;
    } catch (err) {
      console.error('Error clearing all alerts:', err);
      throw err;
    }
  }, []);

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  // Load notifications when user changes
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Set up real-time subscription for alerts
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time alerts subscription for user:', user.id);
    
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New alert received:', payload.new);
          const newAlert = payload.new;
          setNotifications(prev => [newAlert, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Alert deleted:', payload.old);
          const deletedAlert = payload.old;
          setNotifications(prev => prev.filter(n => n.id !== deletedAlert.id));
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Alert updated:', payload.new);
          const updatedAlert = payload.new;
          setNotifications(prev => 
            prev.map(n => n.id === updatedAlert.id ? updatedAlert : n)
          );
        }
      )
      .subscribe((status) => {
        console.log('Alerts subscription status:', status);
      });

    return () => {
      console.log('Cleaning up alerts subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Remove the polling since we now have real-time updates
  // useEffect(() => {
  //   if (!user) return;
  //   const interval = setInterval(loadNotifications, 30000);
  //   return () => clearInterval(interval);
  // }, [user, loadNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    clearAllAlerts,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
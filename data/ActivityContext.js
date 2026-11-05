import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { api } from './api';
const Context = createContext({
  counts: {},
  beginRead: async () => 0,
  markRead: async () => {},
  refresh: async () => {},
});
export const useActivity = () => useContext(Context);
export function ActivityProvider({ user, children }) {
  const [counts, setCounts] = useState({});
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setCounts((await api('/notifications')).counts);
    } catch {
      /* Keep existing badges while offline. */
    }
  }, [user?.id]);
  useEffect(() => {
    setCounts({});
    if (!user) return;
    refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, 20000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [refresh]);
  const beginRead = async section => (await api('/notifications')).cursors[section];
  const markRead = async (section, cursor) => {
    try {
      await api('/notifications/read', 'POST', { section, cursor });
      await refresh();
    } catch {
      /* Try again when the screen is opened next time. */
    }
  };
  return (
    <Context.Provider value={{ counts, refresh, beginRead, markRead }}>{children}</Context.Provider>
  );
}

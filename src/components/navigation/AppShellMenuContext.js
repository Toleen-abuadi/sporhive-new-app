import { createContext, useContext, useMemo } from 'react';

const AppShellMenuContext = createContext(null);

export function AppShellMenuProvider({ children, openMenu, closeMenu }) {
  const value = useMemo(
    () => ({
      hasMenu: typeof openMenu === 'function',
      openMenu,
      closeMenu,
    }),
    [closeMenu, openMenu]
  );

  return <AppShellMenuContext.Provider value={value}>{children}</AppShellMenuContext.Provider>;
}

export function useAppShellMenu() {
  return useContext(AppShellMenuContext);
}

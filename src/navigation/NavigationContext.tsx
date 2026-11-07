import React, { createContext, useContext } from 'react';
import {
  RootTab,
  ShellTab,
  ViewStack,
  VisibleRoute,
} from './viewStack';

export interface NavigationContextValue {
  stack: ViewStack;
  activeScreen: ShellTab;
  currentTab: RootTab;
  visibleRoute: VisibleRoute;
  goToTab: (tab: ShellTab) => void;
  openSpecies: (speciesId: string) => void;
  openPreparation: () => void;
  openSettings: () => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export const useAppNavigation = (): NavigationContextValue | null => {
  return useContext(NavigationContext);
};

interface NavigationProviderProps {
  value: NavigationContextValue;
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ value, children }) => {
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

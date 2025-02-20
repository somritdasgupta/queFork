import React, { createContext, useContext, useReducer } from "react";
import { Tab } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface TabState {
  tabs: Tab[];
  activeTab: string | null;
}

type TabAction =
  | { type: "ADD_TAB"; payload?: Partial<Tab> }
  | { type: "REMOVE_TAB"; payload: string }
  | { type: "UPDATE_TAB"; payload: { id: string; updates: Partial<Tab> } }
  | { type: "SET_ACTIVE_TAB"; payload: string }
  | { type: "DUPLICATE_TAB"; payload: string };

const TabContext = createContext<
  | {
      state: TabState;
      dispatch: React.Dispatch<TabAction>;
    }
  | undefined
>(undefined);

function tabReducer(state: TabState, action: TabAction): TabState {
  switch (action.type) {
    case "ADD_TAB": {
      const newTab: Tab = {
        id: uuidv4(),
        title: "New Request",
        type: "rest",
        active: true,
        lastAccessed: Date.now(),
        state: {
          method: "GET",
          url: "",
          headers: [
            { key: "", value: "", enabled: true, type: "", showSecrets: false },
          ],
          params: [
            { key: "", value: "", enabled: true, type: "", showSecrets: false },
          ],
          body: { type: "none", content: "" },
          auth: { type: "none" },
          isWebSocketMode: false,
        },
        ...action.payload,
      };

      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTab: newTab.id,
      };
    }

    case "REMOVE_TAB": {
      const newTabs = state.tabs.filter((tab) => tab.id !== action.payload);
      const newActiveTab =
        state.activeTab === action.payload
          ? newTabs[newTabs.length - 1]?.id || null
          : state.activeTab;

      return {
        ...state,
        tabs: newTabs,
        activeTab: newActiveTab,
      };
    }

    case "UPDATE_TAB": {
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === action.payload.id
            ? { ...tab, ...action.payload.updates }
            : tab
        ),
      };
    }

    case "SET_ACTIVE_TAB": {
      return {
        ...state,
        activeTab: action.payload,
        tabs: state.tabs.map((tab) => ({
          ...tab,
          active: tab.id === action.payload,
          lastAccessed:
            tab.id === action.payload ? Date.now() : tab.lastAccessed,
        })),
      };
    }

    case "DUPLICATE_TAB": {
      const tabToDuplicate = state.tabs.find(
        (tab) => tab.id === action.payload
      );
      if (!tabToDuplicate) return state;

      const newTab: Tab = {
        ...tabToDuplicate,
        id: uuidv4(),
        title: `${tabToDuplicate.title} (Copy)`,
        active: true,
        lastAccessed: Date.now(),
      };

      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTab: newTab.id,
      };
    }

    default:
      return state;
  }
}

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(tabReducer, {
    tabs: [],
    activeTab: null,
  });

  return (
    <TabContext.Provider value={{ state, dispatch }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabContext() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error("useTabContext must be used within a TabProvider");
  }
  return context;
}

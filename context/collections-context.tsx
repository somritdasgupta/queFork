"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Collection, SavedRequest } from '@/types';
import { toast } from 'sonner';

interface CollectionsContextType {
  collections: Collection[];
  updateCollections: (collections: Collection[]) => void;
  addRequest: (collectionId: string, request: Partial<SavedRequest>) => void;
  deleteRequest: (collectionId: string, requestId: string) => void;
  deleteCollection: (collectionId: string) => void;
  createCollection: (collection: Partial<Collection>) => void;
}

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export function CollectionsProvider({ children }: { children: React.ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);

  // Load collections from localStorage on mount
  useEffect(() => {
    try {
      const savedCollections = localStorage.getItem('collections');
      if (savedCollections) {
        setCollections(JSON.parse(savedCollections));
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  }, []);

  // Save collections to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('collections', JSON.stringify(collections));
    } catch (error) {
      console.error('Failed to save collections:', error);
    }
  }, [collections]);

  const updateCollections = useCallback((newCollections: Collection[]) => {
    setCollections(newCollections);
  }, []);

  const addRequest = useCallback((collectionId: string, request: Partial<SavedRequest>) => {
    setCollections(prev => prev.map(collection => {
      if (collection.id === collectionId) {
        return {
          ...collection,
          requests: [...(collection.requests || []), {
            ...request,
            id: request.id || crypto.randomUUID(),
            timestamp: Date.now(),
          } as SavedRequest],
          lastModified: new Date().toISOString(),
        };
      }
      return collection;
    }));
  }, []);

  const deleteRequest = useCallback((collectionId: string, requestId: string) => {
    setCollections(prev => prev.map(collection => {
      if (collection.id === collectionId) {
        return {
          ...collection,
          requests: collection.requests.filter(r => r.id !== requestId),
          lastModified: new Date().toISOString(),
        };
      }
      return collection;
    }));
  }, []);

  const deleteCollection = useCallback((collectionId: string) => {
    setCollections(prev => prev.filter(c => c.id !== collectionId));
  }, []);

  const createCollection = useCallback((collection: Partial<Collection>) => {
    setCollections(prev => [...prev, {
      ...collection,
      id: collection.id || crypto.randomUUID(),
      requests: collection.requests || [],
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    } as Collection]);
  }, []);

  return (
    <CollectionsContext.Provider value={{
      collections,
      updateCollections,
      addRequest,
      deleteRequest,
      deleteCollection,
      createCollection,
    }}>
      {children}
    </CollectionsContext.Provider>
  );
}

export const useCollections = () => {
  const context = useContext(CollectionsContext);
  if (context === undefined) {
    throw new Error('useCollections must be used within a CollectionsProvider');
  }
  return context;
};

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  getPortfolioItems,
  addPortfolioItem,
  removePortfolioItem,
  type PortfolioItem,
} from '@/lib/api/portfolioApi';

export type PortfolioItemType = 'urban_renewal' | 'housing_lottery' | 'tender_result';

export function usePortfolio() {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getPortfolioItems();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isSaved = useCallback(
    (itemType: string, sourceId: string) =>
      items.some((i) => i.item_type === itemType && i.source_id === sourceId),
    [items]
  );

  const add = useCallback(
    async (
      itemType: string,
      sourceId: string,
      snapshot?: Record<string, unknown> | null
    ): Promise<boolean> => {
      if (!user) return false;
      try {
        const added = await addPortfolioItem(itemType, sourceId, snapshot);
        setItems((prev) => [added, ...prev]);
        return true;
      } catch {
        return false;
      }
    },
    [user]
  );

  const remove = useCallback(
    async (itemType: string, sourceId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        await removePortfolioItem(itemType, sourceId);
        setItems((prev) => prev.filter((i) => !(i.item_type === itemType && i.source_id === sourceId)));
        return true;
      } catch {
        return false;
      }
    },
    [user]
  );

  const toggle = useCallback(
    async (
      itemType: string,
      sourceId: string,
      snapshot?: Record<string, unknown> | null
    ): Promise<boolean> => {
      if (!user) return false;
      const saved = isSaved(itemType, sourceId);
      if (saved) return remove(itemType, sourceId);
      return add(itemType, sourceId, snapshot);
    },
    [user, isSaved, add, remove]
  );

  return {
    items,
    loading,
    refresh,
    isSaved,
    add,
    remove,
    toggle,
  };
}

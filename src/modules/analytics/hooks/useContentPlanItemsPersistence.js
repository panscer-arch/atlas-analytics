import { useEffect, useRef, useState } from "react";
import { CONTENT_PLAN_STORAGE_KEY } from "../data/contentPlanData";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import { normalizeItems, readStoredItems } from "../utils/contentPlanStorage";

export default function useContentPlanItemsPersistence() {
  const [items, setItems] = useState(readStoredItems);
  const [saveState, setSaveState] = useState("idle");
  const localTouchedRef = useRef(false);
  const saveTimerRef = useRef(null);
  const saveVersionRef = useRef(0);
  const pendingServerSaveRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(CONTENT_PLAN_STORAGE_KEY).then((savedItems) => {
      if (isMounted && Array.isArray(savedItems) && !localTouchedRef.current) setItems(normalizeItems(savedItems));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function flushPendingSave({ updateBadge = true } = {}) {
      const pendingItems = pendingServerSaveRef.current;
      if (!pendingItems) return;
      pendingServerSaveRef.current = null;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveServerContent(CONTENT_PLAN_STORAGE_KEY, pendingItems).then((ok) => {
        pendingServerSaveRef.current = ok ? null : pendingItems;
        if (updateBadge) setSaveState(ok ? "saved" : "local");
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flushPendingSave();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flushPendingSave);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      flushPendingSave({ updateBadge: false });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flushPendingSave);
    };
  }, []);

  function persist(nextItems) {
    localTouchedRef.current = true;
    setSaveState("saving");
    try {
      window.localStorage.setItem(CONTENT_PLAN_STORAGE_KEY, JSON.stringify(nextItems));
    } catch {
      // Локальное сохранение не должно блокировать редактирование.
    }

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    const saveVersion = saveVersionRef.current + 1;
    saveVersionRef.current = saveVersion;
    pendingServerSaveRef.current = nextItems;

    saveTimerRef.current = window.setTimeout(() => {
      saveServerContent(CONTENT_PLAN_STORAGE_KEY, nextItems).then((ok) => {
        if (saveVersionRef.current === saveVersion) {
          pendingServerSaveRef.current = ok ? null : nextItems;
          setSaveState(ok ? "saved" : "local");
        }
      });
    }, 450);
  }

  function retryServerSave() {
    const pendingItems = pendingServerSaveRef.current || items;
    if (!pendingItems) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    pendingServerSaveRef.current = pendingItems;
    const saveVersion = saveVersionRef.current + 1;
    saveVersionRef.current = saveVersion;
    setSaveState("saving");
    saveServerContent(CONTENT_PLAN_STORAGE_KEY, pendingItems).then((ok) => {
      if (saveVersionRef.current !== saveVersion) return;
      pendingServerSaveRef.current = ok ? null : pendingItems;
      setSaveState(ok ? "saved" : "local");
    });
  }

  function updateItems(updater) {
    setItems((current) => {
      const next = updater(current);
      persist(next);
      return next;
    });
  }

  return {
    items,
    retryServerSave,
    saveState,
    updateItems,
  };
}

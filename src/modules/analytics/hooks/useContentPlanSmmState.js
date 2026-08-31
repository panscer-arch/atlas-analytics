import { useEffect, useMemo, useRef, useState } from "react";
import {
  SMM_APPROVAL_STORAGE_KEY,
  SMM_APPROVAL_ROWS,
  SMM_FACEBOOK_TOPICS,
  SMM_ROWS_STORAGE_KEY,
  SMM_THEME_STORAGE_KEY,
  SMM_TOPIC_SECTIONS,
} from "../data/contentPlanData";
import {
  createEmptySmmRow,
  readSmmApprovals,
  readSmmRows,
  readSmmTheme,
} from "../utils/contentPlanStorage";
import { loadServerContentResult, saveServerContent } from "../services/contentStore";
import { hydrateSharedContent } from "../utils/sharedContentMigration";

function persistSmmRows(nextRows) {
  try {
    window.localStorage.setItem(SMM_ROWS_STORAGE_KEY, JSON.stringify(nextRows));
  } catch {
    // Таблица остается в состоянии страницы, даже если localStorage недоступен.
  }
}

export default function useContentPlanSmmState() {
  const [rows, setRows] = useState(readSmmRows);
  const [approvals, setApprovals] = useState(readSmmApprovals);
  const [theme, setTheme] = useState(readSmmTheme);
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState("saving");
  const rowsAtMountRef = useRef(rows);
  const approvalsAtMountRef = useRef(approvals);
  const saveTimersRef = useRef({});
  const pendingSavesRef = useRef({});

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      loadServerContentResult(SMM_ROWS_STORAGE_KEY),
      loadServerContentResult(SMM_APPROVAL_STORAGE_KEY),
    ]).then(async ([rowsResult, approvalsResult]) => {
      const validRowsResult = {
        ...rowsResult,
        exists: rowsResult.exists && Array.isArray(rowsResult.value),
      };
      const validApprovalsResult = {
        ...approvalsResult,
        exists: approvalsResult.exists
          && approvalsResult.value
          && typeof approvalsResult.value === "object"
          && !Array.isArray(approvalsResult.value),
      };
      const [hydratedRows, hydratedApprovals] = await Promise.all([
        hydrateSharedContent({
          serverResult: validRowsResult,
          localValue: rowsAtMountRef.current,
          defaultValue: SMM_APPROVAL_ROWS,
          save: (value) => saveServerContent(SMM_ROWS_STORAGE_KEY, value),
        }),
        hydrateSharedContent({
          serverResult: validApprovalsResult,
          localValue: approvalsAtMountRef.current,
          defaultValue: {},
          save: (value) => saveServerContent(SMM_APPROVAL_STORAGE_KEY, value),
        }),
      ]);
      if (!isMounted) return;

      setRows(hydratedRows.value);
      setApprovals(hydratedApprovals.value);
      persistSmmRows(hydratedRows.value);
      try {
        window.localStorage.setItem(SMM_APPROVAL_STORAGE_KEY, JSON.stringify(hydratedApprovals.value));
      } catch {
        // Серверная версия уже доступна в состоянии страницы.
      }
      const hasFailure = [hydratedRows, hydratedApprovals].some((item) => (
        item.source === "local-offline" || item.migration === "failed"
      ));
      setSaveState(hasFailure ? "local" : "saved");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function flushPendingSaves() {
      Object.entries(pendingSavesRef.current).forEach(([key, value]) => {
        saveServerContent(key, value, { keepalive: true });
      });
    }

    window.addEventListener("pagehide", flushPendingSaves);
    return () => {
      flushPendingSaves();
      Object.values(saveTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("pagehide", flushPendingSaves);
    };
  }, []);

  function scheduleServerSave(key, value) {
    setSaveState("saving");
    pendingSavesRef.current[key] = value;
    window.clearTimeout(saveTimersRef.current[key]);
    saveTimersRef.current[key] = window.setTimeout(() => {
      saveServerContent(key, value).then((saved) => {
        if (pendingSavesRef.current[key] !== value) return;
        if (saved) delete pendingSavesRef.current[key];
        setSaveState(saved ? "saved" : "local");
      });
    }, 450);
  }

  const stats = useMemo(() => {
    const blocks = SMM_TOPIC_SECTIONS.reduce((sum, section) => sum + section.blocks.length, 0);
    const plannedPosts = SMM_TOPIC_SECTIONS.reduce((sum, section) => (
      sum + section.blocks.reduce((blockSum, block) => blockSum + block.posts.length, 0)
    ), 0);
    const facebookTopics = SMM_FACEBOOK_TOPICS.reduce((sum, block) => sum + block.posts.length, 0);
    const ok = Object.values(approvals).filter((status) => status === "ok").length;
    const notOk = Object.values(approvals).filter((status) => status === "not-ok").length;

    return {
      blocks,
      facebookTopics,
      plannedPosts,
      productionRows: rows.length,
      ok,
      notOk,
      pending: Math.max(rows.length - ok - notOk, 0),
    };
  }, [approvals, rows.length]);

  function updateRow(rowId, field, value) {
    setRows((current) => {
      const next = current.map((row) => (row.id === rowId ? { ...row, [field]: value } : row));
      persistSmmRows(next);
      scheduleServerSave(SMM_ROWS_STORAGE_KEY, next);
      return next;
    });
  }

  function addRow() {
    setRows((current) => {
      const next = [...current, createEmptySmmRow()];
      persistSmmRows(next);
      scheduleServerSave(SMM_ROWS_STORAGE_KEY, next);
      return next;
    });
  }

  function updateTheme(nextTheme) {
    setTheme(nextTheme);
    try {
      window.localStorage.setItem(SMM_THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Тема меняется в текущей сессии, даже если localStorage недоступен.
    }
  }

  function updateApproval(blockId, status) {
    setApprovals((current) => {
      const next = { ...current, [blockId]: status };
      try {
        window.localStorage.setItem(SMM_APPROVAL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Согласование остается в состоянии страницы, даже если localStorage недоступен.
      }
      scheduleServerSave(SMM_APPROVAL_STORAGE_KEY, next);
      return next;
    });
  }

  return {
    approvals,
    isEditing,
    rows,
    saveState,
    stats,
    theme,
    addRow,
    toggleEditing: () => setIsEditing((current) => !current),
    updateApproval,
    updateRow,
    updateTheme,
  };
}

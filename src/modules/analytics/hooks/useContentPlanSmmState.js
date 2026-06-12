import { useMemo, useState } from "react";
import {
  SMM_APPROVAL_STORAGE_KEY,
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
      return next;
    });
  }

  function addRow() {
    setRows((current) => {
      const next = [...current, createEmptySmmRow()];
      persistSmmRows(next);
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
      return next;
    });
  }

  return {
    approvals,
    isEditing,
    rows,
    stats,
    theme,
    addRow,
    toggleEditing: () => setIsEditing((current) => !current),
    updateApproval,
    updateRow,
    updateTheme,
  };
}

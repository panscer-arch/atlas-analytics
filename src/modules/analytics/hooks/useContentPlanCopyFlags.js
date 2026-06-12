import { useEffect, useRef, useState } from "react";

function clearTimer(timerRef) {
  if (timerRef.current) window.clearTimeout(timerRef.current);
}

function useTimedValue(initialValue) {
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef(null);

  function mark(nextValue, resetValue = initialValue, timeout = 1800) {
    setValue(nextValue);
    clearTimer(timerRef);
    timerRef.current = window.setTimeout(() => setValue(resetValue), timeout);
  }

  useEffect(() => () => clearTimer(timerRef), []);

  return [value, mark];
}

function useTimedBoolean(timeout = 1800) {
  const [value, markValue] = useTimedValue(false);
  return [value, () => markValue(true, false, timeout)];
}

export default function useContentPlanCopyFlags() {
  const [copiedItemId, markItemCopied] = useTimedValue("");
  const [copiedBriefItemId, markBriefCopied] = useTimedValue("");
  const [copiedPackageItemId, markPackageCopied] = useTimedValue("");
  const [copiedDayKey, markDayCopied] = useTimedValue("");
  const [copiedSlice, markSliceCopied] = useTimedBoolean();
  const [copiedAudit, markAuditCopied] = useTimedBoolean(3000);
  const [copiedPublishedReport, markPublishedReportCopied] = useTimedBoolean(2200);
  const [copiedTaskList, markTaskListCopied] = useTimedBoolean();
  const [copiedRevisionSlice, markRevisionSliceCopied] = useTimedBoolean(2200);
  const [copiedRevisionItemId, markRevisionCopied] = useTimedValue("");
  const [copiedLinkItemId, markItemLinkCopied] = useTimedValue("");
  const [shiftedDateItemId, markDateShifted] = useTimedValue("");

  return {
    flags: {
      copiedAudit,
      copiedBriefItemId,
      copiedDayKey,
      copiedItemId,
      copiedLinkItemId,
      copiedPackageItemId,
      copiedPublishedReport,
      copiedRevisionItemId,
      copiedRevisionSlice,
      copiedSlice,
      copiedTaskList,
      shiftedDateItemId,
    },
    mark: {
      markAuditCopied,
      markBriefCopied,
      markDateShifted,
      markDayCopied,
      markItemCopied,
      markItemLinkCopied,
      markPackageCopied,
      markPublishedReportCopied,
      markRevisionCopied,
      markRevisionSliceCopied,
      markSliceCopied,
      markTaskListCopied,
    },
  };
}

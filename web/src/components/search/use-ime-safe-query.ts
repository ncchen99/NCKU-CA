"use client";

import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, CompositionEvent, KeyboardEvent } from "react";

/**
 * 注音／倉頡等輸入法組字期間（例如輸入框暫時出現「ㄅㄠˇ」），
 * 只更新輸入框顯示、不觸發搜尋；選字完成後才更新查詢字串。
 */
export function useImeSafeQuery(initialValue = "") {
  const [value, setValue] = useState(initialValue);
  const [query, setQuery] = useState(initialValue);
  const composingRef = useRef(false);

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValue(next);
    if (!composingRef.current) setQuery(next);
  }, []);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback((event: CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    setQuery(event.currentTarget.value);
  }, []);

  const reset = useCallback((next = "") => {
    composingRef.current = false;
    setValue(next);
    setQuery(next);
  }, []);

  return {
    value,
    query,
    reset,
    inputProps: { value, onChange, onCompositionStart, onCompositionEnd },
  };
}

/** 輸入法選字時按下的 Enter／方向鍵不應觸發搜尋結果的鍵盤操作 */
export function isImeKeyEvent(event: KeyboardEvent<HTMLElement>): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

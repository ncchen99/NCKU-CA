import { ZH_FOLD_PAIRS } from "./zh-fold-map";

/**
 * 搜尋用文字正規化（逐字元、長度不變）：
 * - 全形英數符號 → 半形（Ｎ Ｃ Ａ １１４ → nca 114）
 * - 英文大小寫折疊
 * - 繁簡／臺灣異體字折疊（選舉 ⇄ 选举、臺 ⇄ 台、裡 ⇄ 裏）
 *
 * 因為每個 UTF-16 code unit 都只對應到一個 code unit，正規化後的字串
 * 與原文索引位置一致，可以直接用來在原文上標示命中範圍。
 */

let foldTable: Uint16Array | null = null;

function getFoldTable(): Uint16Array {
  if (foldTable) return foldTable;

  const table = new Uint16Array(0x10000);
  for (let code = 0; code < table.length; code += 1) {
    table[code] = code;
  }

  // 全形 ASCII（！～）→ 半形；全形空白 → 半形空白
  for (let code = 0xff01; code <= 0xff5e; code += 1) {
    table[code] = code - 0xfee0;
  }
  table[0x3000] = 0x20;

  // 拉丁、希臘、西里爾字母大小寫折疊（只接受一對一的轉換）
  for (let code = 0; code < 0x2000; code += 1) {
    const source = table[code];
    const lower = String.fromCharCode(source).toLowerCase();
    if (lower.length === 1) {
      table[code] = lower.charCodeAt(0);
    }
  }
  for (let code = 0xff21; code <= 0xff3a; code += 1) {
    table[code] = table[code - 0xfee0];
  }

  for (let i = 0; i + 1 < ZH_FOLD_PAIRS.length; i += 2) {
    table[ZH_FOLD_PAIRS.charCodeAt(i)] = ZH_FOLD_PAIRS.charCodeAt(i + 1);
  }

  foldTable = table;
  return table;
}

const CHUNK_SIZE = 4096;

export function normalizeForSearch(input: string): string {
  if (!input) return "";
  const table = getFoldTable();
  const codes = new Uint16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    codes[i] = table[input.charCodeAt(i)];
  }

  let output = "";
  for (let i = 0; i < codes.length; i += CHUNK_SIZE) {
    output += String.fromCharCode(...codes.subarray(i, i + CHUNK_SIZE));
  }
  return output;
}

const HAN_REGEX = /\p{Script=Han}/u;

export function containsHan(value: string): boolean {
  return HAN_REGEX.test(value);
}

/**
 * 產生全站搜尋使用的「繁簡／異體字折疊表」
 *
 * 搜尋時會把索引內容與使用者輸入都折疊成同一種字形再比對，
 * 讓「選舉」「选举」、「臺南」「台南」、「裡」「裏」都能互相搜到。
 * 字典來源為 OpenCC（Apache-2.0），只取「單字對單字」的對應，
 * 確保折疊前後字串長度不變，搜尋結果才能精準標示命中位置。
 *
 * 使用方式:
 *   cd web && npm run search:zh-fold-map
 *
 * 輸出: web/src/lib/search/zh-fold-map.ts
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");
const DICT_DIR = resolve(PROJECT_ROOT, "web", "node_modules", "opencc-js", "dist", "esm-lib", "dict");
const OUTPUT_PATH = resolve(PROJECT_ROOT, "web", "src", "lib", "search", "zh-fold-map.ts");

async function loadDict(name: string): Promise<Map<string, string>> {
    const mod = (await import(pathToFileURL(resolve(DICT_DIR, `${name}.js`)).href)) as { default: string };
    const map = new Map<string, string>();
    for (const entry of mod.default.split("|")) {
        const [from, to] = entry.split(" ");
        if (!from || !to) continue;
        map.set(from, to);
    }
    return map;
}

function isSingleCodeUnit(value: string): boolean {
    return value.length === 1;
}

async function main() {
    // 臺灣異體字 → OpenCC 標準繁體（例：裡→裏、著→着、為→爲）
    const twVariantsRev = await loadDict("TWVariantsRev");
    // CJK 相容字 → 統一表意文字
    const compat = await loadDict("CJK_Compatibility_Ideographs");
    // 繁體 → 簡體（例：選→选、臺→台、裏→里）
    const tsCharacters = await loadDict("TSCharacters");

    const lookup = (map: Map<string, string>, ch: string) => map.get(ch) ?? ch;
    const step = (ch: string) => lookup(tsCharacters, lookup(twVariantsRev, lookup(compat, ch)));

    const fold = (ch: string): string => {
        let current = ch;
        // 反覆套用直到不再變化，確保 fold(fold(x)) === fold(x)
        for (let i = 0; i < 8; i += 1) {
            const next = step(current);
            if (next === current) break;
            current = next;
        }
        return current;
    };

    const sources = new Set<string>([
        ...twVariantsRev.keys(),
        ...compat.keys(),
        ...tsCharacters.keys(),
    ]);

    const pairs: Array<[string, string]> = [];
    for (const source of sources) {
        const target = fold(source);
        if (target === source) continue;
        if (!isSingleCodeUnit(source) || !isSingleCodeUnit(target)) continue;
        pairs.push([source, target]);
    }

    pairs.sort((a, b) => a[0].charCodeAt(0) - b[0].charCodeAt(0));

    const encoded = pairs.map(([from, to]) => `${from}${to}`).join("");
    const output = `/**
 * 自動產生，請勿手動修改。產生方式：cd web && npm run search:zh-fold-map
 *
 * 搜尋用繁簡／異體字折疊表：每兩個字元為一組 [原字, 折疊後字]。
 * 資料來源：OpenCC（https://github.com/BYVoid/OpenCC，Apache-2.0）
 * TWVariantsRev + CJK_Compatibility_Ideographs + TSCharacters，僅保留單字對單字的對應。
 */
export const ZH_FOLD_PAIRS =
  "${encoded}";
`;

    writeFileSync(OUTPUT_PATH, output, "utf8");
    console.log(`✅ 已輸出 ${pairs.length} 組對應到 ${OUTPUT_PATH}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

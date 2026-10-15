import { normalizeForSearch } from "./normalize";
import type { SearchDocument } from "./types";

/**
 * 全站搜尋引擎（純前端、零外部服務）。
 *
 * 中文沒有空白分詞，因此採用：
 * 1. 查詢端以 Intl.Segmenter（瀏覽器內建 ICU 詞典）斷詞，例如「保證金退還」→「保證金」「退還」；
 *    連續的單字片段（字典不認得的縮寫，例如「社博」「場協」）會合併回一個詞。
 * 2. 文件端不斷詞，直接做子字串比對，避免查詢與文件斷詞不一致而漏找。
 * 3. 以 BM25 計分，標題／標籤權重較高，整段連續命中再加分。
 * 4. 若沒有結果完全符合，改用二字詞（bigram）覆蓋率做「部分符合」的寬鬆搜尋。
 */

export type HighlightRange = [start: number, end: number];

export interface SearchSnippet {
  text: string;
  ranges: HighlightRange[];
}

export interface SearchHit {
  document: SearchDocument;
  score: number;
  titleRanges: HighlightRange[];
  snippet: SearchSnippet | null;
}

export interface SearchResult {
  hits: SearchHit[];
  /** 沒有完全符合的結果，以下為部分符合 */
  partial: boolean;
  terms: string[];
}

interface PreparedDocument {
  doc: SearchDocument;
  title: string;
  tags: string;
  /** 標籤與別名逐一正規化，用來判斷「完全等於某個標籤」 */
  tagSet: Set<string>;
  parent: string;
  text: string;
  time: number;
  length: number;
}

export interface PreparedSearchIndex {
  docs: PreparedDocument[];
  avgLength: number;
}

interface QueryPhrase {
  normalized: string;
  terms: string[];
}

export interface ParsedQuery {
  phrases: QueryPhrase[];
  terms: string[];
}

const MAX_QUERY_LENGTH = 100;
const SNIPPET_LENGTH = 110;
const SNIPPET_LEAD = 24;

const FIELD_WEIGHT = { title: 10, tags: 6, parent: 1.5, text: 1 } as const;
const BM25_K1 = 1.2;
const BM25_B = 0.4;
const RECENCY_WEIGHT = 0.25;
const RECENCY_HALF_LIFE_DAYS = 120;
const RELAXED_MIN_COVERAGE = 0.5;

/** 單字虛詞：與其他詞一起出現時忽略，避免「的」「與」等字讓結果失準。 */
const STOPWORD_SOURCE =
  "的 了 和 與 及 或 之 在 是 有 也 並 等 跟 把 被 對 從 向 以 於 為 嗎 呢 吧 啊 喔 我 你 他 她 要 想 請 問 "
  + "如何 怎麼 怎樣 什麼 哪裡 哪些 可以 請問 我要 我想 想要 要怎麼 我們 你們 他們 相關";

let stopwords: Set<string> | null = null;

function getStopwords(): Set<string> {
  if (!stopwords) {
    stopwords = new Set(STOPWORD_SOURCE.split(/\s+/).filter(Boolean).map(normalizeForSearch));
  }
  return stopwords;
}

const SEPARATOR_REGEX = /[\s\p{P}\p{S}]+/u;
/** 條號（第十七條、第17條、17條、第二章之一）視為一個詞，不再斷開 */
const ARTICLE_NUMBER_REGEX = /^第?[\d零〇一二三四五六七八九十百千兩]+[條章節款項點](之[\d零〇一二三四五六七八九十]+)?$/u;
const SINGLE_HAN_REGEX = /^\p{Script=Han}$/u;
const SINGLE_LATIN_REGEX = /^[a-z]$/;

type WordSegmenter = { segment: (input: string) => Iterable<{ segment: string; isWordLike?: boolean }> };

let segmenter: WordSegmenter | null | undefined;

function getSegmenter(): WordSegmenter | null {
  if (segmenter !== undefined) return segmenter;
  try {
    segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl
      ? new Intl.Segmenter("zh-TW", { granularity: "word" })
      : null;
  } catch {
    segmenter = null;
  }
  return segmenter;
}

function segmentWords(chunk: string): string[] {
  if (ARTICLE_NUMBER_REGEX.test(chunk)) return [chunk];
  const seg = getSegmenter();
  if (!seg) return [chunk];
  const words: string[] = [];
  for (const part of seg.segment(chunk)) {
    if (part.isWordLike === false) continue;
    const word = part.segment.trim();
    if (word) words.push(word);
  }
  return words.length > 0 ? words : [chunk];
}

/** 連續的單一漢字片段合併成一個詞（「社|博」→「社博」）。 */
function mergeSingleHanRuns(words: string[]): string[] {
  const merged: string[] = [];
  let run = "";
  for (const word of words) {
    if (SINGLE_HAN_REGEX.test(word)) {
      run += word;
      continue;
    }
    if (run) {
      merged.push(run);
      run = "";
    }
    merged.push(word);
  }
  if (run) merged.push(run);
  return merged;
}

export function parseSearchQuery(input: string): ParsedQuery {
  const stop = getStopwords();
  const chunks = input
    .slice(0, MAX_QUERY_LENGTH)
    .split(SEPARATOR_REGEX)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const phrases: QueryPhrase[] = [];
  for (const chunk of chunks) {
    const words = segmentWords(chunk)
      .map(normalizeForSearch)
      .filter((word) => !stop.has(word));
    const terms = mergeSingleHanRuns(words);
    const normalized = normalizeForSearch(chunk);
    if (terms.length === 0) {
      // 整段都是虛詞（例如只搜「我們」），仍以原詞搜尋
      phrases.push({ normalized, terms: [normalized] });
    } else {
      phrases.push({ normalized, terms });
    }
  }

  let terms = Array.from(new Set(phrases.flatMap((phrase) => phrase.terms)));
  if (terms.length > 1) {
    const meaningful = terms.filter((term) => !SINGLE_LATIN_REGEX.test(term));
    if (meaningful.length > 0) terms = meaningful;
  }
  const termSet = new Set(terms);
  for (const phrase of phrases) {
    phrase.terms = phrase.terms.filter((term) => termSet.has(term));
  }

  return { phrases: phrases.filter((phrase) => phrase.terms.length > 0), terms };
}

function parseDate(value?: string): number {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

export function prepareSearchIndex(documents: SearchDocument[]): PreparedSearchIndex {
  const docs = documents.map((doc): PreparedDocument => {
    const tagList = [...(doc.tags ?? []), ...(doc.keywords ?? "").split(/\s+/)]
      .map((tag) => normalizeForSearch(tag.trim()))
      .filter(Boolean);
    return {
      doc,
      title: normalizeForSearch(doc.title),
      tags: tagList.join(" \u0000 "),
      tagSet: new Set(tagList),
      parent: normalizeForSearch(doc.parent ?? ""),
      text: normalizeForSearch(doc.text),
      time: parseDate(doc.date),
      length: doc.title.length + doc.text.length,
    };
  });
  const totalLength = docs.reduce((sum, doc) => sum + doc.length, 0);
  return { docs, avgLength: docs.length > 0 ? Math.max(1, totalLength / docs.length) : 1 };
}

function countOccurrences(haystack: string, needle: string, cap = 50): number {
  if (!needle || haystack.length < needle.length) return 0;
  let count = 0;
  let from = 0;
  while (count < cap) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) break;
    count += 1;
    from = index + needle.length;
  }
  return count;
}

interface TermFrequency {
  title: number;
  tags: number;
  parent: number;
  text: number;
}

function termFrequency(doc: PreparedDocument, term: string): TermFrequency {
  return {
    title: countOccurrences(doc.title, term),
    tags: countOccurrences(doc.tags, term),
    parent: countOccurrences(doc.parent, term),
    text: countOccurrences(doc.text, term),
  };
}

function weightedFrequency(tf: TermFrequency): number {
  return tf.title * FIELD_WEIGHT.title
    + tf.tags * FIELD_WEIGHT.tags
    + tf.parent * FIELD_WEIGHT.parent
    + tf.text * FIELD_WEIGHT.text;
}

function inverseDocumentFrequency(totalDocs: number, docFrequency: number): number {
  return Math.log(1 + (totalDocs - docFrequency + 0.5) / (docFrequency + 0.5));
}

function bm25(weightedTf: number, idf: number, length: number, avgLength: number): number {
  if (weightedTf <= 0) return 0;
  const norm = 1 - BM25_B + BM25_B * (length / avgLength);
  return idf * ((weightedTf * (BM25_K1 + 1)) / (weightedTf + BM25_K1 * norm));
}

function recencyBoost(time: number, now: number): number {
  if (!time) return 1;
  const ageDays = Math.max(0, (now - time) / 86_400_000);
  return 1 + RECENCY_WEIGHT * Math.exp(-ageDays / RECENCY_HALF_LIFE_DAYS);
}

function findRanges(haystack: string, needles: string[]): HighlightRange[] {
  const ranges: HighlightRange[] = [];
  for (const needle of needles) {
    if (!needle) continue;
    let from = 0;
    while (from <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, from);
      if (index === -1) break;
      ranges.push([index, index + needle.length]);
      from = index + needle.length;
    }
  }
  return mergeRanges(ranges);
}

function mergeRanges(ranges: HighlightRange[]): HighlightRange[] {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: HighlightRange[] = [sorted[0]];
  for (const range of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }
  return merged;
}

function buildSnippet(doc: PreparedDocument, anchors: string[], highlightTerms: string[]): SearchSnippet | null {
  const original = doc.doc.text;
  if (!original) return null;

  let anchor = -1;
  for (const candidate of anchors) {
    const index = doc.text.indexOf(candidate);
    if (index !== -1) {
      anchor = index;
      break;
    }
  }

  let start = anchor === -1 ? 0 : Math.max(0, anchor - SNIPPET_LEAD);
  let end = Math.min(original.length, start + SNIPPET_LENGTH);
  start = Math.max(0, Math.min(start, end - SNIPPET_LENGTH));
  end = Math.min(original.length, Math.max(end, start + SNIPPET_LENGTH));

  const prefix = start > 0 ? "…" : "";
  const suffix = end < original.length ? "…" : "";
  const windowText = doc.text.slice(start, end);
  const ranges = findRanges(windowText, highlightTerms).map(
    ([from, to]): HighlightRange => [from + prefix.length, to + prefix.length],
  );

  return {
    text: `${prefix}${original.slice(start, end)}${suffix}`,
    ranges,
  };
}

function sortHits(hits: Array<SearchHit & { time: number }>): SearchHit[] {
  return hits
    .sort((a, b) =>
      b.score - a.score
      || b.time - a.time
      || a.document.title.length - b.document.title.length)
    .map(({ document, score, titleRanges, snippet }) => ({ document, score, titleRanges, snippet }));
}

function strictSearch(index: PreparedSearchIndex, query: ParsedQuery, now: number): SearchHit[] {
  const { docs, avgLength } = index;
  const { terms, phrases } = query;
  const frequencies = docs.map((doc) => terms.map((term) => termFrequency(doc, term)));
  const docFrequency = terms.map((_, termIndex) =>
    frequencies.reduce((count, tfs) => (weightedFrequency(tfs[termIndex]) > 0 ? count + 1 : count), 0));
  const idf = docFrequency.map((df) => inverseDocumentFrequency(docs.length, df));
  const idfByTerm = new Map(terms.map((term, i) => [term, idf[i]]));

  const fullQuery = phrases.map((phrase) => phrase.normalized).join("");
  const anchors = [
    ...phrases.map((phrase) => phrase.normalized).sort((a, b) => b.length - a.length),
    ...[...terms].sort((a, b) => (idfByTerm.get(b) ?? 0) - (idfByTerm.get(a) ?? 0)),
  ];

  const hits: Array<SearchHit & { time: number }> = [];
  docs.forEach((doc, docIndex) => {
    const tfs = frequencies[docIndex];
    if (tfs.some((tf) => weightedFrequency(tf) === 0)) return;

    let score = 0;
    tfs.forEach((tf, termIndex) => {
      score += bm25(weightedFrequency(tf), idf[termIndex], doc.length, avgLength);
    });

    for (const phrase of phrases) {
      const phraseIdf = phrase.terms.reduce((sum, term) => sum + (idfByTerm.get(term) ?? 0), 0);
      // 完全等於某個標籤／條號別名（例如搜尋「社博」而文章標籤就是「社博」）
      if (doc.tagSet.has(phrase.normalized)) score += phraseIdf;
      if (phrase.terms.length < 2 && phrase.normalized === phrase.terms[0]) continue;
      if (doc.title.includes(phrase.normalized)) {
        score += 1.5 * phraseIdf;
      } else if (doc.tags.includes(phrase.normalized) || doc.text.includes(phrase.normalized)) {
        score += 0.6 * phraseIdf;
      }
    }

    if (doc.title === fullQuery) {
      score *= 1.6;
    } else if (doc.title.startsWith(fullQuery)) {
      score *= 1.2;
    }

    score *= recencyBoost(doc.time, now);

    hits.push({
      document: doc.doc,
      score,
      titleRanges: findRanges(doc.title, terms),
      snippet: buildSnippet(doc, anchors, terms),
      time: doc.time,
    });
  });

  return sortHits(hits);
}

/** 把詞拆成二字詞（漢字）供寬鬆比對；非漢字詞維持原樣。 */
function toRelaxedUnits(terms: string[]): string[] {
  const units = new Set<string>();
  for (const term of terms) {
    const chars = Array.from(term);
    const isHan = chars.every((ch) => SINGLE_HAN_REGEX.test(ch));
    if (!isHan || chars.length <= 2) {
      units.add(term);
      continue;
    }
    for (let i = 0; i + 1 < chars.length; i += 1) {
      units.add(chars[i] + chars[i + 1]);
    }
  }
  return Array.from(units);
}

function relaxedSearch(index: PreparedSearchIndex, query: ParsedQuery, now: number): SearchHit[] {
  const units = toRelaxedUnits(query.terms);
  if (units.length < 2) return [];

  const { docs, avgLength } = index;
  const frequencies = docs.map((doc) => units.map((unit) => termFrequency(doc, unit)));
  const idf = units.map((_, unitIndex) => {
    const df = frequencies.reduce((count, tfs) => (weightedFrequency(tfs[unitIndex]) > 0 ? count + 1 : count), 0);
    return inverseDocumentFrequency(docs.length, df);
  });
  const totalIdf = idf.reduce((sum, value) => sum + value, 0) || 1;

  const hits: Array<SearchHit & { time: number }> = [];
  docs.forEach((doc, docIndex) => {
    const tfs = frequencies[docIndex];
    let matchedIdf = 0;
    let score = 0;
    const matchedUnits: string[] = [];
    tfs.forEach((tf, unitIndex) => {
      const weighted = weightedFrequency(tf);
      if (weighted === 0) return;
      matchedIdf += idf[unitIndex];
      matchedUnits.push(units[unitIndex]);
      score += bm25(weighted, idf[unitIndex], doc.length, avgLength);
    });

    const coverage = matchedIdf / totalIdf;
    if (coverage < RELAXED_MIN_COVERAGE) return;

    hits.push({
      document: doc.doc,
      score: score * coverage * coverage * recencyBoost(doc.time, now),
      titleRanges: findRanges(doc.title, matchedUnits),
      snippet: buildSnippet(doc, matchedUnits, matchedUnits),
      time: doc.time,
    });
  });

  return sortHits(hits);
}

export function searchIndex(
  index: PreparedSearchIndex,
  input: string,
  options: { now?: number } = {},
): SearchResult {
  const query = parseSearchQuery(input);
  if (query.terms.length === 0 || index.docs.length === 0) {
    return { hits: [], partial: false, terms: query.terms };
  }

  const now = options.now ?? Date.now();
  const strict = strictSearch(index, query, now);
  if (strict.length > 0) {
    return { hits: strict, partial: false, terms: query.terms };
  }

  return { hits: relaxedSearch(index, query, now), partial: true, terms: query.terms };
}

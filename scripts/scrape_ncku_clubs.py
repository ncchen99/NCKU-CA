#!/usr/bin/env python3
"""
Scrape NCKU club data from https://sys.activity-osa.ncku.edu.tw/index.php?c=club0408

Features:
- User handles login manually in a launched browser window.
- Script resumes after user confirms login is complete.
- Fetches all 8 requested categories (A-H) by default.
- Pulls per-club detail from the "檢視" AJAX endpoint.
- Outputs normalized YAML for later import.

Dependencies:
    pip install requests beautifulsoup4 pyyaml playwright
    playwright install chromium
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import yaml
from bs4 import BeautifulSoup

BASE_URL = "https://sys.activity-osa.ncku.edu.tw/index.php?c=club0408"
DETAIL_URL = "https://sys.activity-osa.ncku.edu.tw/index.php?c=club0408&m=get_details"

# User requested 8 categories: six major types + 自治組織 + 系學會
CATEGORY_MAP = {
    "A": "系學會",
    "B": "綜合性",
    "C": "學藝性",
    "D": "康樂性",
    "E": "體能性",
    "F": "服務性",
    "G": "聯誼性",
    "H": "自治組織",
}

# Optional category in platform (not included by default)
INSTITUTE_CATEGORY = {"I": "所學會"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def bootstrap_session_with_manual_login(skip_login: bool) -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }
    )

    if skip_login:
        print("[INFO] Skip manual login (--skip-login).")
        return session

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "playwright is required for manual login flow. "
            "Install with: pip install playwright && playwright install chromium"
        ) from exc

    print("[INFO] Opening browser for manual login...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        page.goto(BASE_URL, wait_until="domcontentloaded")
        print("[ACTION] Please login manually in the browser window.")
        input("[ACTION] After login is complete, press Enter here to continue...")

        cookies = context.cookies()
        for c in cookies:
            domain = c.get("domain")
            if not domain:
                continue
            session.cookies.set(
                name=c["name"],
                value=c["value"],
                domain=domain,
                path=c.get("path", "/"),
            )

        context.close()
        browser.close()

    print(f"[INFO] Imported {len(session.cookies)} cookies into requests session.")
    return session


def fetch_category_rows(
    session: requests.Session,
    category_code: str,
    timeout: int,
) -> list[dict[str, Any]]:
    resp = session.post(BASE_URL, data={"club_cat": category_code}, timeout=timeout)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    table = soup.select_one("div.grid_data_div table.grid_data")
    if table is None:
        raise RuntimeError(f"No list table found for category {category_code}.")

    rows: list[dict[str, Any]] = []
    for tr in table.select("tbody tr"):
        tds = tr.find_all("td")
        if len(tds) < 5:
            continue

        view_btn = tr.select_one("button[name='view']")
        platform_id = (view_btn.get("value", "") if view_btn else "").strip()
        if not platform_id:
            continue

        rows.append(
            {
                "row_no": tds[0].get_text(strip=True),
                "name_c": tds[1].get_text(strip=True),
                "name_e": tds[2].get_text(strip=True),
                "status": tds[3].get_text(strip=True),
                "platform_id": platform_id,
            }
        )
    return rows


def fetch_details(
    session: requests.Session,
    club_id: str,
    timeout: int,
) -> dict[str, Any]:
    resp = session.post(DETAIL_URL, data={"id": club_id}, timeout=timeout)
    resp.raise_for_status()
    payload = resp.json()
    if not payload.get("success"):
        raise RuntimeError(f"Detail endpoint failed for club id {club_id}: {payload}")
    return payload.get("data", {}) or {}


def normalize_club_record(
    category_code: str,
    category_name: str,
    list_row: dict[str, Any],
    detail: dict[str, Any],
) -> dict[str, Any]:
    platform_id = list_row["platform_id"]
    name_c = detail.get("name_c") or list_row["name_c"]
    name_e = detail.get("name_e") or list_row["name_e"]

    return {
        "id": f"ncku-{platform_id.lower()}",
        "platform_id": platform_id,
        "name": name_c or None,
        "name_en": name_e or None,
        "category": category_name,
        "category_code": category_code,
        "status": list_row.get("status") or None,
        "email": detail.get("email") or None,
        "president_name": detail.get("leader_name_c") or None,
        "president_name_en": detail.get("leader_name_e") or None,
        "advisor_name": detail.get("name") or None,
        "goal": detail.get("goal") or None,
        "description": detail.get("introduce") or None,
        "regular_activity_time": detail.get("acttime") or None,
        "main_activity_location": detail.get("actplace") or None,
        "website_url": detail.get("url") or None,
        "import_source": "yaml_import",
        "raw_data": {
            "list_row": list_row,
            "detail": detail,
        },
    }


def scrape(
    session: requests.Session,
    categories: dict[str, str],
    timeout: int,
) -> list[dict[str, Any]]:
    all_records: list[dict[str, Any]] = []
    total = 0

    for code, name in categories.items():
        print(f"[INFO] Scraping category {code} ({name})...")
        rows = fetch_category_rows(session=session, category_code=code, timeout=timeout)
        print(f"[INFO] Found {len(rows)} clubs in category {code}.")

        for row in rows:
            detail = fetch_details(session=session, club_id=row["platform_id"], timeout=timeout)
            record = normalize_club_record(
                category_code=code,
                category_name=name,
                list_row=row,
                detail=detail,
            )
            all_records.append(record)
            total += 1
            if total % 20 == 0:
                print(f"[INFO] Processed {total} clubs...")

    return all_records


def write_yaml(
    output_path: Path,
    clubs: list[dict[str, Any]],
    categories: dict[str, str],
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "meta": {
            "source": BASE_URL,
            "source_name": "NCKU Student Club Platform",
            "scraped_at": now_iso(),
            "total_clubs": len(clubs),
            "categories": [{"code": k, "name": v} for k, v in categories.items()],
            "schema_version": "1.0.0",
        },
        "clubs": clubs,
    }
    with output_path.open("w", encoding="utf-8") as f:
        yaml.safe_dump(payload, f, allow_unicode=True, sort_keys=False)

    print(f"[DONE] YAML written: {output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape NCKU club data and export YAML."
    )
    parser.add_argument(
        "--output",
        default="data/ncku-clubs.yaml",
        help="Output YAML file path (default: data/ncku-clubs.yaml)",
    )
    parser.add_argument(
        "--skip-login",
        action="store_true",
        help="Skip browser-based manual login and scrape directly.",
    )
    parser.add_argument(
        "--include-institute",
        action="store_true",
        help="Also include category I (所學會).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="HTTP timeout seconds (default: 30).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    categories = dict(CATEGORY_MAP)
    if args.include_institute:
        categories.update(INSTITUTE_CATEGORY)

    session = bootstrap_session_with_manual_login(skip_login=args.skip_login)
    clubs = scrape(session=session, categories=categories, timeout=args.timeout)
    write_yaml(output_path=Path(args.output), clubs=clubs, categories=categories)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
展示层 CPT 质量校验器（checker）

用法：
    python3 display_checker.py [--verbose] [--quiet] <cpt_path>

    --verbose  每个 PASS 也打印细节
    --quiet    只打印 FAIL 条目（适用于 CI / 自动工具）
    默认        概要输出，errors 和 warnings 分开展示

与 display_writer.py 的关系：
    写手写完 CPT 后自动调用本脚本；
    也可以单独使用，用于手动审查任意 CPT 文件的质量。
"""

from __future__ import annotations

import argparse
import os
import sys
import xml.etree.ElementTree as ET

# 把 scripts/ 目录加入 path，使 "import display" 能找到 scripts/display/__init__.py
_script_dir  = os.path.dirname(os.path.abspath(__file__))      # ...scripts/display/
_scripts_dir = os.path.dirname(_script_dir)                   # ...scripts/
sys.path.insert(0, _scripts_dir)

from display.rules import collect_rules, run_all, extract_js_from_cpt


def main():
    ap = argparse.ArgumentParser(prog="display_checker.py",
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cpt_path", nargs="?", help="目标 CPT 文件路径（省略时配合 --list-rules 使用）")
    ap.add_argument("--list-rules", action="store_true",
        help="列出全部可用规则（name / severity / description）")
    ap.add_argument("--verbose", action="store_true",
        help="PASS 的规则也打印详细信息")
    ap.add_argument("--quiet", action="store_true",
        help="只汇报 FAIL 条目（CI 用）")
    ap.add_argument("--strict", action="store_true",
        help="warnings 同样计为 error")
    args = ap.parse_args()

    # ── --list-rules：直接打印规则清单后退出 ─────────────────────
    if args.list_rules:
        all_meta = {rd["name"]: rd for rd in collect_rules()}
        print(f"\n{'─'*64}")
        print(f"共 {len(all_meta)} 条规则\n")
        ERROR   = "\033[31m";  WARN = "\033[33m"
        RESET   = "\033[0m";   BOLD = "\033[1m"
        for name, meta in sorted(all_meta.items()):
            col = ERROR if meta["severity"] == "error" else WARN
            sym = "✗"  if meta["severity"] == "error" else "⚠"
            print(f"  {col}{sym}{RESET}  {BOLD}{name:<40}{RESET}  {meta['description']}")
        print(f"\n{'─'*64}")
        print(f"ERROR = 拒上线（quality gate 失败则文件永不生成）")
        print(f"WARN  = 提示（不阻止，但请关注）")
        sys.exit(0)

    if not args.cpt_path:
        ap.print_help(); sys.exit(0)

    # ── 注册命名空间后解析 CPT ─────────────────────────────────
    try:
        for _, (pfx, uri) in enumerate(ET.iterparse(args.cpt_path, events=["start-ns"])):
            ET.register_namespace(pfx or "", uri)
        cpt_tree = ET.parse(args.cpt_path)
    except ET.ParseError as e:
        fatal(f"XML 解析失败：{e}")

    cpt_root = cpt_tree.getroot()
    js_text  = extract_js_from_cpt(cpt_root)

    # ── 运行全集规则 ───────────────────────────────────────────
    all_results = run_all(js_text, cpt_root)   # {rule_name: [Finding, ...]}
    all_rules_meta = {rd["name"]: rd for rd in collect_rules()}   # 名字→元信息的字典

    errors:   list[tuple[str, object]] = []
    warnings: list[tuple[str, object]] = []

    for rule_name, findings in all_results.items():
        meta    = all_rules_meta.get(rule_name, {})
        severity = meta.get("severity", "warning")
        if severity == "error":
            errors.extend((rule_name, f) for f in findings)
        else:
            warnings.extend((rule_name, f) for f in findings)

    has_failure = bool(errors) or (args.strict and bool(warnings))

    RESET  = "\033[0m";  RED    = "\033[31m";  GREEN  = "\033[32m"
    YELLOW = "\033[33m";  CYAN   = "\033[36m";  BOLD   = "\033[1m"

    SEP = "─" * 64

    def fmt_loc(line):
        return f":{line}" if (line is not None) else ""

    def fmt_lines(msg, indent_len=12):
        words = msg.split()
        lines_l = []; cur = ""
        for w in words:
            nxt = (cur + " " + w).strip()
            if len(nxt) <= 70:
                cur = nxt
            else:
                if cur: lines_l.append(cur)
                cur = w
        if cur: lines_l.append(cur)
        return lines_l or [msg]

    # ── 彩色输出 ───────────────────────────────────────────────
    if not args.quiet:
        print(f"\n{BOLD}[ 展示层 CPT 质量校验 ]{RESET}  {os.path.basename(args.cpt_path)}")
        print(SEP)

    # ERRORS
    if errors:
        if args.quiet:
            for rn, f in errors:
                loc = f"L{f.line}" if (f.line is not None) else "?"
                print(f"{RED}FAIL{RESET}  {CYAN}{rn}{RESET}  {loc}  {f.message}")
        else:
            print(f"\n{RED}{BOLD}✗ ERRORS ({len(errors)}){RESET}")
            for rn, f in errors:
                print(f"\n  {RED}✗{RESET}  {BOLD}{rn}{RESET}{RED}{fmt_loc(f.line)}{RESET}")
                for ln in fmt_lines(f.message):
                    print(f"       {ln}")
    elif not args.quiet:
        print(f"{GREEN}✓  无 ERROR{RESET}")

    # WARNINGS
    if warnings and not args.quiet:
        print(f"\n{YELLOW}{BOLD}⚠ WARNINGS ({len(warnings)}){RESET}")
        for rn, f in warnings:
            print(f"  {YELLOW}⚠{RESET}  {rn}{fmt_loc(f.line)}  {f.message}")

    # SUMMARY
    if not args.quiet:
        errored = {rn for rn, _ in errors}
        warned  = {rn for rn, _ in warnings}
        all_rns = set(all_results)
        passed  = len(all_rns) - len(errored) - len(warned)

        print(f"\n{SEP}")
        print(f"总计 {len(all_rns)} 条规则   {GREEN}PASS {passed}{RESET}   "
              f"{RED}FAIL {len(errored)}{RESET}   "
              f"{'(warn-as-err) ' if args.strict else ''}"
              f"{YELLOW}~WARN {len(warned)}{RESET}")

    # VERBOSE: list all passes
    if args.verbose and not has_failure and not args.quiet:
        error_names  = {rn for rn, _ in errors}
        warn_names   = {rn for rn, _ in warnings}
        pass_names   = set(all_results) - error_names - warn_names
        print(f"\n{CYAN}--verbose: {len(pass_names)} 条无违规{RESET}")
        for rn in pass_names:
            fs = all_results[rn]
            if not fs:
                meta = all_rules_meta.get(rn, {})
                print(f"  {GREEN}✓{RESET}  {rn}  {meta.get('description','')}")

    sys.exit(1 if has_failure else 0)


def fatal(msg: str):
    print(f"FATAL: {msg}", file=sys.stderr)
    sys.exit(2)


if __name__ == "__main__":
    main()
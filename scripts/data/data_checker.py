#!/usr/bin/env python3
"""
数据层 CPT 质量门检查工具

检查规则（预留扩展）：
    - XML 格式校验
    - TableData 结构完整性
    - 参数完整性
    - SQL 语法安全（禁止危险关键词）

用法：
    python3 data_checker.py [--quiet] cpt_file

exit 0 = 通过，exit 1 = 失败
"""

from __future__ import annotations

import argparse
import os
import sys
import re

from lxml import etree


# ══════════════════════════════════════════════════════════════
# 检查规则
# ══════════════════════════════════════════════════════════════

class Checker:
    def __init__(self, path: str):
        self.path = path
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def check(self) -> bool:
        """执行所有检查，返回是否通过"""
        self._check_xml_valid()
        self._check_table_data_map()
        self._check_table_data_nodes()
        self._check_parameters()
        self._check_sql_safety()

        return len(self.errors) == 0

    def _check_xml_valid(self):
        """XML 格式校验"""
        try:
            parser = etree.XMLParser(remove_blank_text=False)
            etree.parse(self.path, parser)
        except etree.XMLSyntaxError as e:
            self.errors.append(f"XML 格式错误：{e}")

    def _check_table_data_map(self):
        """检查 TableDataMap 存在"""
        tree = etree.parse(self.path)
        root = tree.getroot()
        tdm = root.find("TableDataMap")
        if tdm is None:
            self.errors.append("缺少 TableDataMap 节点")

    def _check_table_data_nodes(self):
        """检查 TableData 节点结构"""
        tree = etree.parse(self.path)
        root = tree.getroot()
        tdm = root.find("TableDataMap")
        if tdm is None:
            return

        for td in tdm.findall("TableData"):
            name = td.get("name", "(无名称)")
            # 检查必需子节点
            for child in ["Parameters", "Connection", "Query"]:
                if td.find(child) is None:
                    self.errors.append(f"数据集 '{name}' 缺少 {child} 节点")

    def _check_parameters(self):
        """检查参数完整性"""
        tree = etree.parse(self.path)
        root = tree.getroot()
        tdm = root.find("TableDataMap")
        if tdm is None:
            return

        for td in tdm.findall("TableData"):
            name = td.get("name", "(无名称)")
            params = td.find("Parameters")
            if params is None:
                continue

            for p in params.findall("Parameter"):
                attr = p.find("Attributes")
                if attr is None or not attr.get("name"):
                    self.errors.append(f"数据集 '{name}' 存在无名称参数")

    def _check_sql_safety(self):
        """SQL 安全检查（禁止危险关键词）"""
        dangerous = [
            r"\bDROP\b", r"\bDELETE\b", r"\bTRUNCATE\b",
            r"\bINSERT\b(?!\s+INTO\s+)",  # INSERT 后面不是 INTO
            r"\bALTER\b", r"\bCREATE\b",
        ]

        tree = etree.parse(self.path)
        root = tree.getroot()
        tdm = root.find("TableDataMap")
        if tdm is None:
            return

        for td in tdm.findall("TableData"):
            name = td.get("name", "(无名称)")
            query = td.find("Query")
            if query is None or not query.text:
                continue

            sql = query.text
            for pattern in dangerous:
                if re.search(pattern, sql, re.IGNORECASE):
                    self.warnings.append(
                        f"数据集 '{name}' SQL 包含潜在危险关键词：{pattern}"
                    )


# ══════════════════════════════════════════════════════════════
# 输出格式化
# ══════════════════════════════════════════════════════════════

def _format_results(checker: Checker, quiet: bool):
    """格式化输出检查结果"""
    if checker.errors:
        print("\n✗ FAIL:", file=sys.stderr)
        for e in checker.errors:
            print(f"    - {e}", file=sys.stderr)

    if checker.warnings:
        print("\n⚠ WARN:", file=sys.stderr)
        for w in checker.warnings:
            print(f"    - {w}", file=sys.stderr)

    if not checker.errors and not checker.warnings:
        if not quiet:
            print("  ✅ 所有检查通过")
        return True

    return len(checker.errors) == 0


# ══════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════

def main():
    ap = argparse.ArgumentParser(prog="data_checker.py",
                                 description=__doc__)
    ap.add_argument("cpt_file", help="要检查的 CPT 文件路径")
    ap.add_argument("--quiet", "-q", action="store_true",
                    help="安静模式（只返回 exit code）")

    args = ap.parse_args()

    if not os.path.exists(args.cpt_file):
        print(f"FATAL: 文件不存在：{args.cpt_file}", file=sys.stderr)
        sys.exit(1)

    checker = Checker(args.cpt_file)
    passed = checker.check()

    if not args.quiet:
        _format_results(checker, args.quiet)

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
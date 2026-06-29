"""
Rule: js_mobile_no_table
━━━━━━━━━━━━━━━━━━━━━━━━━
检查移动端 cpt 是否使用了 antdMobile.Table（不存在）。

antd-mobile v5 中没有 Table 组件。移动端 375px 宽度不适合多列表格，
应该用：
  - List          基础卡片列表（最常用）
  - IndexBar      按字母/分类分组列表（通讯录式）
  - Grid          网格布局
  - InfiniteScroll  无限滚动
  - PullToRefresh   下拉刷新

触发：dev_zone 中出现 antdMobile.Table / { Table } = antdMobile
修复：改用 List 渲染每一行为卡片
"""

from __future__ import annotations

import re

rule_name  = "js_mobile_no_table"
rule_desc  = (
    "禁止使用 antdMobile.Table（不存在）。"
    "移动端数据展示用 List / IndexBar / Grid。"
)
rule_level = "warning"


def _split_dev_zone(full_js: str) -> str:
    s_re = re.compile(r'/\*\s*={3,}\s*DEVELOPER\s+ZONE\s+BEGIN', re.IGNORECASE)
    e_re = re.compile(r'/\*\s*={3,}\s*DEVELOPER\s+ZONE\s+END',   re.IGNORECASE)
    s = s_re.search(full_js); e = e_re.search(full_js)
    if s and e:
        return full_js[s.end():e.start()]
    return full_js


def check(js_text: str, cpt_tree) -> list[tuple[int | None, str]]:
    findings: list[tuple[int | None, str]] = []
    dev_zone = _split_dev_zone(js_text)
    if not dev_zone.strip():
        return findings

    destruct_re = re.compile(
        r'(?:var|let|const)\s*\{[^}]*?\bTable\b[^}]*\}\s*=\s*antdMobile\b'
    )
    direct_re = re.compile(r'\bantdMobile\.Table\b')

    offset = js_text.index(dev_zone) if dev_zone in js_text else 0

    for m in destruct_re.finditer(dev_zone):
        line = js_text[:offset + m.start()].count('\n') + 1
        findings.append((
            line,
            "antd-mobile v5 中没有 Table 组件。"
            "移动端数据展示请用 List（卡片列表）、IndexBar（按字母分组）、"
            "或 Grid（网格）。配合 InfiniteScroll / PullToRefresh 实现长列表。"
        ))

    for m in direct_re.finditer(dev_zone):
        line = js_text[:offset + m.start()].count('\n') + 1
        findings.append((
            line,
            "antdMobile.Table 不存在。"
            "改用 antdMobile.List 渲染卡片列表。"
        ))

    return findings

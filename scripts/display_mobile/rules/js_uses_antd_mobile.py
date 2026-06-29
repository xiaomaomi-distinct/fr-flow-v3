"""
Rule: js_uses_antd_mobile
━━━━━━━━━━━━━━━━━━━━━━━━━
检查移动端 cpt 业务代码是否误用了 PC 端 antd 组件库。

移动端 cpt 应该用 antd-mobile（全局变量 antdMobile），不是 antd。
两者 API、组件命名、样式系统都不同，混用会导致运行时报错或样式异常。

触发：dev_zone 中出现 `antd.` 或 `antd[` 或 `var { ... } = antd`
修复：把 antd 改成 antdMobile，并对照 antd-mobile 文档调整 API
"""

from __future__ import annotations

import re

rule_name  = "js_uses_antd_mobile"
rule_desc  = (
    "禁止在移动端业务代码中使用 PC 端 antd 全局变量。"
    "应使用 antdMobile（antd-mobile v5）。"
)
rule_level = "error"

# 排除 antdMobile / antd-mobile（字符串）等场景
# 匹配：`antd.X`、`antd[...]`、`= antd;`、`= antd,`、`= antd}`
_BAD_ANTD_RE = re.compile(
    r'\bantd(?!Mobile|-mobile|_)'                       # antd 后面不能跟 Mobile/-mobile/_
    r'\s*(?:\.\w+|\[\s*["\']\w+|\s*[;,)}])'             # 后面接 .xxx 或 ["xxx 或 紧跟分号/逗号/括号
)


def _split_dev_zone(full_js: str) -> str:
    """提取 DEVELOPER ZONE 部分，避免误报骨架代码中的合法注释"""
    s_re = re.compile(r'/\*\s*={3,}\s*DEVELOPER\s+ZONE\s+BEGIN', re.IGNORECASE)
    e_re = re.compile(r'/\*\s*={3,}\s*DEVELOPER\s+ZONE\s+END',   re.IGNORECASE)
    s = s_re.search(full_js); e = e_re.search(full_js)
    if s and e:
        return full_js[s.end():e.start()]
    return full_js  # 找不到标记就全文检查


def check(js_text: str, cpt_tree) -> list[tuple[int | None, str]]:
    findings: list[tuple[int | None, str]] = []
    dev_zone = _split_dev_zone(js_text)
    if not dev_zone.strip():
        return findings

    # dev_zone 起始位置（用于计算行号）
    offset = js_text.index(dev_zone) if dev_zone in js_text else 0

    for m in _BAD_ANTD_RE.finditer(dev_zone):
        abs_pos = offset + m.start()
        line = js_text[:abs_pos].count('\n') + 1
        findings.append((
            line,
            f"误用 PC 端 antd 全局变量：{m.group(0)!r}。"
            "移动端 cpt 必须使用 antdMobile（antd-mobile v5），"
            "不要使用 antd（antd 是 PC 端的，移动端骨架未加载）。"
            "示例：var {{ Button, NavBar, Popup }} = antdMobile;"
        ))

    return findings

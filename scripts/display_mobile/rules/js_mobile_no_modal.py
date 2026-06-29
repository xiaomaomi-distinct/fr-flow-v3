"""
Rule: js_mobile_no_modal
━━━━━━━━━━━━━━━━━━━━━━━━━
检查移动端 cpt 是否使用了 antdMobile.Modal（不存在/不推荐）。

antd-mobile v5 中没有 Modal 组件，应该用：
  - Popup       从底部/侧边滑出的容器（推荐）
  - Dialog      居中确认型弹窗
  - ActionSheet 底部动作菜单

触发：dev_zone 中出现 antdMobile.Modal / { Modal } = antdMobile
修复：根据用途选择 Popup / Dialog / ActionSheet
"""

from __future__ import annotations

import re

rule_name  = "js_mobile_no_modal"
rule_desc  = (
    "禁止使用 antdMobile.Modal（不存在）。"
    "用 Popup（容器型）/ Dialog（确认型）/ ActionSheet（菜单型）替代。"
)
rule_level = "warning"

_BAD_MODAL_RE = re.compile(
    r'antdMobile\.Modal\b'                              # antdMobile.Modal
    r'|=\s*antdMobile\s*[;,)}]?\s*[\n]*[\s\S]{0,200}?\bModal\b'   # 解构里 Modal
)


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

    # 解构形式 `var { Modal } = antdMobile;`
    destruct_re = re.compile(
        r'(?:var|let|const)\s*\{[^}]*?\bModal\b[^}]*\}\s*=\s*antdMobile\b'
    )
    direct_re = re.compile(r'\bantdMobile\.Modal\b')

    offset = js_text.index(dev_zone) if dev_zone in js_text else 0

    for m in destruct_re.finditer(dev_zone):
        line = js_text[:offset + m.start()].count('\n') + 1
        findings.append((
            line,
            "antd-mobile v5 中没有 Modal 组件。"
            "请根据用途替换为：Popup（容器型，从底部弹出）、"
            "Dialog（居中确认）、ActionSheet（底部菜单）。"
        ))

    for m in direct_re.finditer(dev_zone):
        line = js_text[:offset + m.start()].count('\n') + 1
        findings.append((
            line,
            "antdMobile.Modal 不存在。"
            "改用 antdMobile.Popup / Dialog / ActionSheet。"
        ))

    return findings

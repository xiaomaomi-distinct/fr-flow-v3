#!/usr/bin/env python3
"""
Rule: js_no_unicode_escape
━━━━━━━━━━━━━━━━━━━━━━━━━━━
检测 mjs/CPT <Content> 中残留的 Unicode Escape（\\uXXXX）序列。

三层防御的最后一道闸门：
  Layer 1  display_writer    — remove_comments() 在去注释时将字符串内
                               \\uXXXX 解码为原生汉字，已集成到同一步骤
  Layer 2  node --check      — JS 引擎语法校验
  Layer 3  本检测器           — 抓漏网之鱼：
                                 ① 字面量内残留（writer 失手）
                                 ② 代码标识符区出现（罕见，疑似笔误）

两者均视为 ERROR，一律阻断落盘。

输入：完整 JS 源码（CPT Content CDATA 经提取后的纯文本）
返回：(行号 | None, 提示文案) 列表，空列表 = 通过
"""

from __future__ import annotations

import re

# ── 协议字段（与 display_checker.py 约定一致）──────────────────────────────────
rule_name  = "js_no_unicode_escape"
rule_desc  = (
    "检测 JS 源码（mjs 或 CPT Content）中残留的 Unicode Escape（\\uXXXX）序列。"
    "要求直接书写中文字面量，display_writer 在必要时统一解码。"
    "Severity=ERROR，违反则拒绝落盘。"
)
rule_level = "error"

# ── 正则常数 ───────────────────────────────────────────────────────────────────
_RE_U = re.compile(r'\\u[0-9a-fA-F]{4}')


# ── 检查核心 ───────────────────────────────────────────────────────────────────

def check(js_text: str, cpt_tree=None) -> list[tuple[int | None, str]]:
    """
    单趟 char-FSM，在非字符串区域内扫出 ``\\uXXXX``。

    状态转移图：
      CODE ──( ') ──▶ SINGLE_Q ──(') ──▶ CODE
      CODE ──( ") ──▶ DOUBLE_Q ──(") ──▶ CODE
      CODE ──( `) ──▶ BACK_TICK ──(`) ──▶ CODE
      *STRING* ──(\\ ) ──▶ ESC ──(next) ──▶ 原字符串状态
      任意字符串状态在行末仍未闭合 → 强制切回 CODE（防跨行单引号破坏整片扫描）

    对每一帧在 CODE 区遇到的 '\\'，前瞻五个字符：
      若恰为 uXXXX 模式则记录，否则作为普通转义字符放行。
    """

    findings: list[tuple[int | None, str]] = []

    class S:
        CODE      = 0
        SINGLE_Q  = 1
        DOUBLE_Q  = 2
        BACK_TICK = 3
        ESC       = 4

    state       = S.CODE
    prior_state = S.CODE   # ESC 后恢复用的上一状态
    lineno      = 1
    i           = 0
    n           = len(js_text)

    while i < n:
        ch = js_text[i]

        if ch == '\n':
            # 未闭合的单行字符串遇到换行即终止，合规 mjs 不会出现跨行单引号字面量
            if state in (S.SINGLE_Q, S.DOUBLE_Q):
                state = S.CODE
            lineno += 1
            i += 1
            continue

        # ── 普通代码区 ────────────────────────────────────────────
        if state == S.CODE:
            if ch == "'":
                state = S.SINGLE_Q
            elif ch == '"':
                state = S.DOUBLE_Q
            elif ch == '`':
                state = S.BACK_TICK
            elif ch == '\\':
                # 前瞻检查：这个反斜杠是否开启了 \\uXXXX
                if i + 5 < n and js_text[i + 1] == 'u':
                    tail = js_text[i + 2:i + 6]
                    if re.fullmatch(r'[0-9a-fA-F]{4}', tail):
                        findings.append((lineno, _hint(js_text[i:i + 6])))
                        i += 6          # 整块 \\uXXXX 已消耗，指针跳至其右边界之后
                        continue
            i += 1
            continue

        # ── 反斜杠进入转义状态 ────────────────────────────────────
        if state == S.ESC:
            prior_state, state = state, prior_state   # pop 并恢复
            i += 1
            continue

        # ── 字符串内部 ──────────────────────────────────────────────
        if ch == '\\':
            prior_state = state
            state = S.ESC
        elif state == S.SINGLE_Q and ch == "'":
            state = S.CODE
        elif state == S.DOUBLE_Q and ch == '"':
            state = S.CODE
        elif state == S.BACK_TICK and ch == '`':
            state = S.CODE

        i += 1

    return _dedup(findings)


def _dedup(results: list[tuple[int | None, str]]) -> list[tuple[int | None, str]]:
    """按 (行号, 前60字) 去重，保持原始顺序"""
    seen: set[tuple[int | None, str]] = set()
    out: list[tuple[int | None, str]] = []
    for item in results:
        key = (item[0], item[1][:60])
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def _hint(seq: str) -> str:
    """
    为单个 \\uXXXX 构造友好提示。
    能解码出 CJK 字符就给「汉字」对照，其余给通用指引。
    """
    try:
        cp = int(seq[2:], 16)
        # CJK 常用字 + CJK 符号区
        if 0x4E00 <= cp <= 0x9FFF or 0x3000 <= cp <= 0x303F:
            char = chr(cp)
            return (
                f"发现 Unicode Escape '{seq}'（=「{char}」）在代码标识符区域，"
                f"疑似残存的未解码序列。display_writer 应已自动将字符串内 "
                f"Escape 解码，此处报警表示 mjs 源文件的字符串可能存在语法缺陷"
                f"（如未闭合引号、多行字符串跨行）导致 writer 无法识别为字面量。"
            )
    except (ValueError, OverflowError):
        pass
    return (
        f"发现未解码的 Unicode Escape 序列 '{seq}'。"
        f"建议直接在 mjs 中写入中文原文，display_writer 会妥善处理其余转换。"
    )


# ── 旧 Rule 类兼容层 ────────────────────────────────────────────────────────────
try:
    from . import Rule as _Rule

    class JsNoUnicodeEscapeRule(_Rule):
        name        = rule_name
        description = rule_desc
        severity    = "error"

        def check(self, js_text: str, cpt_tree=None) -> list:
            return check(js_text, cpt_tree)

except ImportError:
    pass

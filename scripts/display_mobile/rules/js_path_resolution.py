"""
js_path_resolution

检查展示层 CPT 中 PATH 路径基础设施的状态，确保两件事：

1. `var PATH = {...}` 在 mjs 的外层框架区正确定义（WARN: 缺失则提示）
2. 开发者代码区中不存在 `var PATH =`、`let PATH =`、`const PATH =`
   或裸露的 `PATH = {...}` 再赋值（WARN：PATH 被遮盖，静默失效）

PATH 结构（必须完整）：
    currentDir      — 当前模板目录，通过 reportName 反推
    apiBase         — API 基础路径，通过 servletURL 计算
    getDataTemplate — 同模块下 data 层模板路径，自动化数据接口查找
    getTemplatePath — 同目录模板路径
"""

from __future__ import annotations

import re

# ── Rule contract（new self-contained protocol）───────────────────────────────
rule_name  = "js_path_resolution"
rule_desc  = (
    "检查 PATH 路径基础设施：确保 mjs 外层框架区中的 PATH 定义完好且未被开发区遮盖，"
    "若开发者区重写了 PATH，getDataTemplate/currentDir 等将全部静默失效。"
)
rule_level = "warning"


# 检测 developer zone 是否试图重新声明或赋值 PATH
_SHADOW_VAR_PATTERN  = re.compile(r'\b(var|let|const)\s+PATH\s*=')
_SHADOW_BARE_ASSIGN  = re.compile(r'\bPATH\s*=\s*\{')    # 裸露赋值（不带 var/let/const）

# 用于估算 PREAMBLE 结束的标志
_PREAMBLE_END_MARKERS = re.compile(
    r'/\\*\\s*====\\s*(?:PREAMBLE|帆软固定结构)'  # 遇到下一个段头注释就算 pre 结束
)


def _split_preamble_and_body(full_js: str) -> tuple[str, str, str]:
    """
    把 display_writer 组装的完整 JS 按三个注释标记分为三段：
    PREAMBLE   ← 含 "==== 帆软固定结构"
    DEV_ZONE   ← 夹在 "==== ████ 开发者代码区" 之间（START/END）
    POSTAMBLE  ← 含 "==== ████ 开发者代码区 END"
    返回 (preamble, dev_zone, postamble)
    """
    # 移动版（base_cpt_page_mobile.cpt）的英文标记，优先匹配
    frm_start_re = re.compile(r'/\*\s*={3,}\s*DEVELOPER\s+ZONE\s+BEGIN', re.IGNORECASE)
    frm_end_re   = re.compile(r'/\*\s*={3,}\s*DEVELOPER\s+ZONE\s+END',   re.IGNORECASE)
    s2 = frm_start_re.search(full_js)
    e2 = frm_end_re.search(full_js)
    if s2 and e2:
        nl_after = full_js.find('\n', s2.end())
        sa = nl_after + 1 if nl_after != -1 else s2.end()
        ez = full_js[sa:e2.start()].strip('\n')
        return full_js[:s2.start()], ez, full_js[e2.end():]

    # 找 developer zone 起始（PC 版 writer 输出有明确的边界标记）
    devs_start_marker_re = re.compile(
        r'/\*\s*={3,}\s*[█░■]+\s*开发者代码区\s+(?:START|（ BEGIN)',
        re.IGNORECASE
    )
    devs_end_marker_re = re.compile(
        r'/\*\s*={3,}\s*[█░■]+\s*开发者代码区\s+END',
        re.IGNORECASE
    )

    start_match = devs_start_marker_re.search(full_js)
    end_match   = devs_end_marker_re.search(full_js)

    if start_match and end_match:
        # 从标记行之后的下ー个换行开始算真正的开发都代码
        sa_raw = start_match.end()
        # 跳过标记行自身（找下一个物理行开始）
        nl_after = full_js.find('\n', sa_raw)
        sa = nl_after + 1 if nl_after != -1 else sa_raw

        # dev_zone = 两标记之间的区域（不包含两端标记行）
        ez = full_js[sa:end_match.start()].strip('\n')  # 去首尾多余换行

        return full_js[:start_match.start()], ez, full_js[end_match.end():]

    # 回退：尝试旧版模板格式（用 PREAMBLE / DEVEL ZONE 分隔）
    deprec_marker = "======== DEVEL"
    idx = full_js.find(deprec_marker)
    if idx != -1:
        return full_js[:idx], full_js[idx:], ""

    # 极端回退：找最后一个 "var PATH" 的声明块结束位置
    path_idx = full_js.find("var PATH = ")
    if path_idx != -1:
        # 找声明块的右花括号配对：从 { 往后找匹配的 }
        depth, brace_end = 0, None
        for i, ch in enumerate(full_js[path_idx + 10:], path_idx + 10):
            if ch == '{':  depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    brace_end = i + 1
                    break
        if brace_end:
            return full_js[:brace_end], full_js[brace_end:], ""
        return full_js[:path_idx + 10], full_js[path_idx + 10:], ""

    # 分不出来：返回全量为空，让 caller 走最大容忍路径
    return "", full_js, ""
    """
    分离 PREAMBLE 和 DEVELOPER BODY。
    heuristics：以 "/* ===== DEVEL" 注释的出现位置为分界。
    如果找不到分界线，假设全为 body（即PREAMBLE = ""，危险状态→提示缺失）。
    """
    markers = [
        "===== DEVEL",      # 新版 writer 输出格式
        "===== ████ 开发者",  # 可能的不同格式
    ]
    for marker in markers:
        idx = full_js.find(marker)
        if idx != -1:
            return full_js[:idx], full_js[idx:]

    # 回退：旧模板/未格式化输出，以第一个 "var PATH =" 出现位置估计
    path_idx = full_js.find("var PATH")
    if path_idx != -1:
        nl = full_js.find('\n', path_idx + 1)
        # 找这个 var PATH 声明块的结束（下一个 "};" 之后）
        brace_end = full_js.find('};', nl) + 2
        return full_js[:brace_end], full_js[brace_end:]

    # 实在分不开：当 body 处理（提示缺失）
    return "", full_js


def check(js_text: str, cpt_tree) -> list[tuple[int | None, str]]:
    findings: list[tuple[int | None, str]] = []

    pre, dev_zone, _ = _split_preamble_and_body(js_text)

    # ── Check 1：外层框架区 PATH 完整性 ──────────────────────────
    pre_has_path_def = bool(re.search(r'\bvar\s+PATH\s*=\s*\{', pre))
    required_members = ["currentDir", "apiBase", "getDataTemplate", "getTemplatePath"]

    if not pre_has_path_def:
        findings.append((
            None,
            "PATH 基础设施缺失：mjs 外层框架区中未找到 'var PATH = {' 定义。"
            "PATH 提供 currentDir / apiBase / getDataTemplate 等路径工具，"
            "必须在外层声明（参考 shared/KNOWLEDGE/starter.mjs）。"
            "如有路径需求，请使用已有的 PATH.currentDir / PATH.getDataTemplate，"
            "不要重新声明，而是直接调用。"
        ))
        return findings    # 无法继续检查 dev zone，先退出

    missing_members = [m for m in required_members if m not in pre]
    if missing_members:
        findings.append((
            None,
            f"PATH 定义不完整，缺少成员：{', '.join(missing_members)}。"
            f"完整 PATH 须含 currentDir、apiBase、getDataTemplate、getTemplatePath。"
            f"请对照 shared/KNOWLEDGE/starter.mjs 的外层框架区补全。"
        ))

    # ── Check 2：dev_zone 中是否有遮盖 PATH 的企图（严重 → WARN） ─
    shadow_var  = list(_SHADOW_VAR_PATTERN.finditer(dev_zone))
    shadow_bare  = list(_SHADOW_BARE_ASSIGN.finditer(dev_zone))
    all_shadow  = sorted(shadow_var + shadow_bare, key=lambda m: m.start())

    if all_shadow:
        # 算出每处在 dev_zone 中的行号（以 full text 为基准再加 offset 补偿）
        evidence_lines = []
        # dev_zone 起始位置在整个 js_text 中的偏移量
        dev_offset = js_text.index(dev_zone) if dev_zone in js_text else 0
        for m in all_shadow[:3]:   # 只取前 3 条，太多就用 "等多处"
            abs_pos = dev_offset + m.start()
            ln_approx = js_text[:abs_pos].count('\n') + 1
            evidence_lines.append(f"L{ln_approx}: {m.group(0)!r}")

        note = " 等多出" if len(all_shadow) > 3 else ""
        findings.append((
            None,
            "PATH 被遮盖（Shadow）[严重]：在 mjs 开发者业务区检测到 " +
            f"对 PATH 的重新声明。证据：{', '.join(evidence_lines)}{note}。"
            "遮盖会导致 getDataTemplate / currentDir 等全部静默失效，"
            "数据接口调用将失败而难以定位。修复：在 mjs 的【开发者业务区】中删除"
            " 'var PATH =' / 'let PATH =' 等重新声明行，直接使用已有的"
            " PATH.currentDir / PATH.getDataTemplate。"
        ))

    # ── Check 3：有 PATH 定义但从未在 dev_zone 中使用（建设性提示） ─
    path_usages = re.findall(r'\bPATH\.\w+', dev_zone)
    if dev_zone.strip() and not path_usages:
        findings.append((
            None,
            "【提示】mjs 开发者业务区尚未调用 PATH 工具。PATH 已在外层框架区正确定义：\n"
            "  PATH.currentDir         — 当前页面目录（用于相对路径构造）\n"
            "  PATH.apiBase            — 同源 API 代理（代替写死 URL）\n"
            "  PATH.getDataTemplate(n) — data 层模板路径（n = '_data'）\n"
            "  PATH.getTemplatePath(n) — 同目录模板路径（n = 'form.cpt'）\n"
            "调用示例：var ds = PATH.getDataTemplate('_data.cpt');\n"
            "建议使用它而非硬编码路径，使模板可在任意目录结构下正常工作。"
        ))

    return findings


# ── Backward compat（Rule class protocol）─────────────────────────────────────
try:
    from . import Rule as _Rule

    class JsPathResolutionRule(_Rule):
        name        = rule_name
        description = rule_desc
        severity    = "warning"

        def check(self, js_text: str, cpt_tree) -> list:
            return check(js_text, cpt_tree)

except ImportError:
    pass
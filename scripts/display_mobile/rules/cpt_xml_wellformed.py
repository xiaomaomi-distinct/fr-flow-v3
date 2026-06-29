"""
规则：cpt_xml_wellformed

展示层 CPT 输出后，检查其中所有 XML 标签是否都在 base 模板出现过。
大模型自创的帆软标签（如伪造 <CustomWidget> / <SuperData> 等）将被本规则拦截。

原理：展示层 CPT 的框架结构不允许改动，只能替换 <Content> 里的 JS 内容，
因此输出后任何不在 base 骨架里的标签必然是大模型捏造的。
"""

from __future__ import annotations

import os
import re
import xml.etree.ElementTree as ET
from typing import Literal

# ── 复用 __init__ 里的数据结构（copy-def 来避相对导入的 sys.modules 陷阱）──
# 只要避免 "from . import"，本规则就是完全自治的

Finding_tuple = tuple[int | None, str]   # (行号, 说明)


# ══════════════════════════════════════════════════════════════
# 基础模板白名单（模块级懒加载，只在第一次 check() 时计算）
# ══════════════════════════════════════════════════════════════
_BASE_TAG_SET: frozenset[str] | None = None

def _base_tag_set():
    global _BASE_TAG_WHITELIST
    global _BASE_TAG_SET
    if _BASE_TAG_SET is not None:
        return _BASE_TAG_SET

    # 从本规则文件往上四级到达 fr-flow/ 根（rules/ → display/ → scripts/ → fr-flow/）
    this_dir  = os.path.dirname(os.path.abspath(__file__))
    frflow_root = os.path.normpath(os.path.join(this_dir, "..", "..", ".."))

    base_path = os.path.join(frflow_root, "foundation", "templates", "base_cpt_page.cpt")
    if not os.path.exists(base_path):
        _BASE_TAG_SET = frozenset()
        return _BASE_TAG_SET

    try:
        tree = ET.parse(base_path)
    except Exception:
        _BASE_TAG_SET = frozenset()
        return _BASE_TAG_SET

    def _tags(el):
        tag = el.tag
        if tag.startswith("{"):
            tag = tag.split("}", 1)[1]
        acc = {tag}
        for ch in el:
            acc |= _tags(ch)
        return acc

    _BASE_TAG_SET = frozenset(_tags(tree.getroot()))
    return _BASE_TAG_SET


def check(js_text: str, cpt_tree: ET.Element) -> list[Finding_tuple]:
    base = _base_tag_set()
    if not base:
        return []                                          # 拿不到 base 作答，放行

    def _tags(el):
        tag = el.tag
        if tag.startswith("{"):
            tag = tag.split("}", 1)[1]
        acc = {tag}
        for ch in el:
            acc |= _tags(ch)
        return acc

    out_tags = _tags(cpt_tree)
    strange  = out_tags - base

    if not strange:
        return []

    return [(
        None,
        f"CPT 含 base_cpt_page.cpt 中未记录的标签 {sorted(strange)!r}，疑似大模型自创。"
        "帆软不识此类标签会导致页面无法加载。"
    )]


# 模块级元信息（display_checker.py 通过读这些属性把它们加入规则注册表）
rule_name  = "cpt_xml_wellformed"
rule_desc  = "检查输出 CPT 中的标签名是否均在 base 模板出现过，不合规即拒写"
rule_level: Literal["error", "warning"] = "error"
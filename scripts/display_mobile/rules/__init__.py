"""
展示层 CPT 质量规则 — 自动发现注册中心

每条规则实现 inherit_from Rule，命名为 js_*.py 或 cpt_*.py，
放进本目录即自动被发现，无需手动注册。

用法：
    from . import collect_rules
    rules = collect_rules()
    for rule in rules:
        findings = rule.check(js_text, cpt_tree)
"""

from __future__ import annotations

import pkgutil
import importlib
import importlib.util
import os
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Literal


# ══════════════════════════════════════════════════════════════
# 基础数据类型
# ══════════════════════════════════════════════════════════════

@dataclass
class Finding:
    """一次违规记录"""
    line: int | None          # 出事行号（None 表示整篇或无法定位）
    message: str              # 人类可读描述，含「为何违规」+「大致修复方向」
    rule: str = ""            # 自动填充
    column: int | None = None  # 可选，精确到列


@dataclass
class Rule:
    """规则基类 — 每条规则在 check() 里返回 []（无违规）或 Finding 列表"""
    name: str                                  # 机械名（小写加下划线）
    description: str                           # 一句话说明，什么场景触发
    severity: Literal["error", "warning"]     # error = 拒上线；warning = 仅提示

    # 基类属性，下沉后子类不应该覆写以下字段
    findings: list[Finding] = field(default_factory=list)
    _checked: bool = False

    def check(self, js_text: str, cpt_tree: ET.Element) -> list[Finding]:
        raise NotImplementedError(f"{self.name}: subclass must implement check()")

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "severity": self.severity,
        }


# ══════════════════════════════════════════════════════════════
# 自动发现
# ══════════════════════════════════════════════════════════════

# 规则脚本所在目录（相对于本 __init__.py 的位置）
_RULES_DIR = os.path.dirname(__file__)


def _iter_rule_modules():
    """遍历 rules/ 目录，动态导入各规则模块，自动建立父包链"""

    # 预先注入父包链，使各 rule 文件的 "from . import XXX" 能找到父包
    _disp_pkg  = sys.modules.setdefault("display_mobile", type(sys)("display_mobile"))
    _disp_pkg.__path__ = [os.path.dirname(_RULES_DIR)]

    _rules_pkg = sys.modules.setdefault("display_mobile.rules", type(sys)("display_mobile.rules"))
    _rules_pkg.__path__ = [_RULES_DIR]
    _rules_pkg.__package__ = "display_mobile"
    _rules_pkg.__file__ = __file__

    for fname in sorted(os.listdir(_RULES_DIR)):
        if not (fname.endswith(".py") and not fname.startswith("_")):
            continue
        if fname == "__init__.py":
            continue

        short_name = fname[:-3]
        full_name  = f"display_mobile.rules.{short_name}"
        fpath      = os.path.join(_RULES_DIR, fname)

        spec = importlib.util.spec_from_file_location(full_name, fpath)
        if spec and spec.loader:
            # 把模块也放进 sys.modules，这样后续任何 import 都走缓存，不再重复加载
            module = importlib.util.module_from_spec(spec)
            sys.modules[full_name] = module
            spec.loader.exec_module(module)
            yield short_name, module
        else:
            continue


def collect_rules() -> list[dict]:
    """
    扫描 rules/ 目录，按以下顺序发现规则（后者覆盖前者）：
      1. 旧协议  — exports a Rule instance/namedtuple  (兼容)
      2. 新协议  — exports rule_name + check + rule_desc + rule_level

    返回的每条规则都是 dict（统一格式）：
      { name, description, severity, check(js_text, cpt_tree) -> [(lineno, msg)] }
    """
    rules: list[dict] = []
    seen_names: set[str] = set()

    for mod_name, module in _iter_rule_modules():
        # ── 协议 2：新自治模块（module-level 常量 + check 函数）───────────
        name_attr  = getattr(module, "rule_name",  None)
        check_fn   = getattr(module, "check",       None)
        desc_attr  = getattr(module, "rule_desc",   "")
        lvl_attr   = getattr(module, "rule_level",  "warning")

        if name_attr and callable(check_fn):
            if name_attr not in seen_names:
                seen_names.add(name_attr)
                rules.append(dict(
                    name        = name_attr,
                    description = desc_attr,
                    severity    = lvl_attr,
                    check       = check_fn,
                ))
            # 也跳过旧协议的检查
            continue

        # ── 协议 1（旧兼容）—— Rule 实例或 Rule 子类 ────────────────────
        for attr_name in dir(module):
            val = getattr(module, attr_name, None)
            if isinstance(val, Rule):
                obj = val
            elif isinstance(val, type) and issubclass(val, Rule) and val is not Rule:
                try: obj = val()
                except Exception: continue
            else:
                continue

            if obj.name not in seen_names:
                seen_names.add(obj.name)
                rules.append(dict(
                    name        = obj.name,
                    description = obj.description,
                    severity    = obj.severity,
                    check       = obj.check,
                ))

    rules.sort(key=lambda r: r["name"])
    return rules


def run_all(js_text: str, cpt_tree: ET.Element) -> dict[str, list[Finding]]:
    """
    运行全集，返回 {rule_name: [Finding, ...]}。
    所有规则都会被执行，即使是 error 也会继续跑完（不短路）。
    """
    results: dict[str, list[Finding]] = {}
    for rd in collect_rules():
        raw_findings: list[tuple[int | None, str]] = rd["check"](js_text, cpt_tree)
        findings = [
            Finding(line=f[0], message=f[1], rule=rd["name"])
            for f in raw_findings
        ]
        results[rd["name"]] = findings
    return results


# ══════════════════════════════════════════════════════════════
# 公共工具（规则文件中经常会用到）
# ══════════════════════════════════════════════════════════════

# 标准命名空间（前缀 → URI，帆软 11.x 专用）
FINEREPORT_NS = "urn:fine-report"


def tag_name(element: ET.Element) -> str:
    """去掉命名空间前缀，返回纯净的标签名"""
    if "}" in element.tag:
        return element.tag.split("}", 1)[1]
    return element.tag


def all_tag_names(tree: ET.Element) -> set[str]:
    """递归收集整棵树的所有标签名（去 namespace）"""
    names: set[str] = {tag_name(tree)}
    for child in tree.iter():
        names.add(tag_name(child))
    return names


def _strip_ns(tag: str) -> str:
    return tag.split("}", 1)[1] if "}" in tag else tag


def _find_child(parent: ET.Element, local_name: str) -> ET.Element | None:
    for child in parent:
        if _strip_ns(child.tag) == local_name:
            return child
    return None


def extract_js_from_cpt(cpt_tree: ET.Element) -> str:
    """
    从已解析的 CPT 树中提取 afterload Listener 的 JS 内容。
    处理有/无 CDATA 包裹，返回 JS 文本（可能为空）。
    """
    # 先找到 afterload Listener（属性匹配不走 ElementPath谓语）
    listener = None
    for el in cpt_tree.iter():
        if _strip_ns(el.tag) == "Listener" and el.get("event") == "afterload":
            listener = el
            break
    if listener is None:
        return ""

    javascript = _find_child(listener, "JavaScript")
    if javascript is None:
        return ""

    content = _find_child(javascript, "Content")
    if content is None:
        return ""

    raw = (content.text or "").strip()
    if not raw:
        return ""

    # 处理 CDATA 包裹（写入管线会在字节层补包，会有这种情况）
    if raw.startswith("<![CDATA["):
        s = raw.index("<![CDATA[") + 9
        e = raw.rindex("]]>")
        return raw[s:e].strip("\n")
    return raw


def strip_comments_and_strings(text: str) -> str:
    """
    去除 JS 里的注释和字符串字面量（为中文检测等做准备）。
    不完美，但对中文序列检测够用。
    """
    # 单行注释
    text = re.sub(r"//[^\n]*", "", text)
    # 多行注释
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    # 三种引号字符串
    for _q in ['"', "'", "`"]:
        buf = ""
        i = 0
        while i < len(text):
            if text[i] == _q:
                buf += _q
                i += 1
                while i < len(text):
                    if text[i] == "\\" and i + 1 < len(text):
                        buf += text[i:i + 2]
                        i += 2
                    elif text[i] == _q:
                        buf += _q
                        i += 1
                        break
                    else:
                        buf += text[i]
                        i += 1
                continue
            buf += text[i]
            i += 1
        text = buf
    return text
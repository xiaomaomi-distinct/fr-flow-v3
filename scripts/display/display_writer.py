#!/usr/bin/env python3
"""
展示层 CPT 发版工具（支持 JSX）

工具链流程：
    1. 检测输入文件类型
    2. .jsx → esbuild 编译 → .mjs
    3. 去除 .mjs 中所有注释（保留字符串）
    4. 语法检查（node --check）
    5. 注入 base_cpt_page.cpt 骨架
    6. 质量门检查
    7. 落盘

用法：
    # JSX 方式（推荐）
    python3 display_writer.py --jsx pages/my_page.jsx --output page.cpt

    # 传统 mjs 方式
    python3 display_writer.py --input pages/my_page.mjs --output page.cpt

成功 exit 0，失败 exit 1。
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

from lxml import etree


# ══════════════════════════════════════════════════════════════
# 路径常量
# ══════════════════════════════════════════════════════════════

_DISPLAY_DIR   = os.path.dirname(os.path.abspath(__file__))
_SCRIPTS_DIR   = os.path.dirname(_DISPLAY_DIR)
_ROOT_DIR      = os.path.dirname(_SCRIPTS_DIR)
_BASE_TEMPLATE = os.path.join(_ROOT_DIR, "foundation", "templates",
                              "base_cpt_page.cpt")
_CHECKER_CLI   = os.path.join(_DISPLAY_DIR, "display_checker.py")


# ══════════════════════════════════════════════════════════════
# 内部工具
# ══════════════════════════════════════════════════════════════

def _die(msg: str):
    print(f"\n✗ FATAL: {msg}\n", file=sys.stderr)
    sys.exit(1)


def _info(msg: str):
    print(f"  ▶ {msg}")


def _ok(msg: str):
    print(f"  ✅ {msg}")


def _warn(msg: str):
    print(f"  ⚠  {msg}", file=sys.stderr)


# ══════════════════════════════════════════════════════════════
# JSX 编译
# ══════════════════════════════════════════════════════════════

def compile_jsx_to_mjs(jsx_path: str) -> str:
    """
    使用 esbuild 将 .jsx 文件编译为 .mjs（IIFE 格式，直接执行）
    返回生成的 .mjs 文件路径
    """
    mjs_path = os.path.splitext(jsx_path)[0] + ".mjs"

    _info(f"编译 JSX → mjs：{os.path.basename(jsx_path)}")

    esbuild_bin = shutil.which("esbuild") or shutil.which("esbuild.cmd")
    if not esbuild_bin:
        _die("找不到 esbuild，请执行 npm install -g esbuild")

    cmd = [
        esbuild_bin,
        jsx_path,
        "--bundle",
        f"--outfile={mjs_path}",
        "--format=iife",
        "--jsx=transform",
        "--charset=utf8",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        _die(f"JSX 编译失败：\n{result.stderr}")

    if not os.path.exists(mjs_path):
        _die(f"JSX 编译成功但输出文件不存在：{mjs_path}")

    _ok(f"编译完成：{os.path.basename(mjs_path)}")
    return mjs_path


# ══════════════════════════════════════════════════════════════
# 语法检查
# ══════════════════════════════════════════════════════════════

def _node_check(js_text: str) -> tuple[int, str]:
    """node --check 语法检查，成功=(0,'')，失败=(code, stderr)。"""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".js", delete=False, encoding="utf-8"
    ) as tf:
        tf.write(js_text)
        tmp = tf.name
    try:
        r = subprocess.run(["node", "--check", tmp],
                           capture_output=True, text=True, timeout=30)
        return r.returncode, r.stderr
    finally:
        try: os.unlink(tmp)
        except OSError: pass


# ══════════════════════════════════════════════════════════════
# 注释清除（保留字符串，不动代码结构）
# ══════════════════════════════════════════════════════════════

_SINGLE_STRING_RE = re.compile(
    r"' (?: [^'\\] | \\. )* '",
    re.DOTALL | re.VERBOSE
)
_DOUBLE_STRING_RE = re.compile(
    r'" (?: [^"\\] | \\. )* "',
    re.DOTALL | re.VERBOSE
)
_TICK_STRING_RE = re.compile(
    r'` (?: [^`\\] | \\. )* `',
    re.DOTALL | re.VERBOSE
)
_MULTILINE_COMMENT_RE = re.compile(r'/\*.*?\*/', re.DOTALL)
_SINGLELINE_COMMENT_RE = re.compile(r'//[^\n]*')

_UNICODE_ESCAPE_IN_STRING_RE = re.compile(
    r"""(?<!\\) \\u([0-9a-fA-F]{4})""",
)


def remove_comments(js: str) -> str:
    """
    去掉全文件所有注释，同时在同一轮 "挖-清-填" 过程中
    将字符串字面量内的 \\uXXXX Unicode Escape 解码为原生 UTF-8 字符。
    """
    strings: dict[str, str] = {}

    def _stash(match: re.Match) -> str:
        key = f"_MJS_S{len(strings):06d}_"
        strings[key] = match.group(0)
        return key

    s = _SINGLE_STRING_RE.sub(_stash, js)
    s = _DOUBLE_STRING_RE.sub(_stash, s)
    s = _TICK_STRING_RE.sub(_stash, s)

    s = _MULTILINE_COMMENT_RE.sub('', s)
    s = _SINGLELINE_COMMENT_RE.sub('', s)

    def _decode_one(m: re.Match) -> str:
        try:
            return chr(int(m.group(1), 16))
        except (ValueError, OverflowError):
            return m.group(0)

    for key, val in strings.items():
        decoded = _UNICODE_ESCAPE_IN_STRING_RE.sub(_decode_one, val)
        s = s.replace(key, decoded, 1)

    return s


# ══════════════════════════════════════════════════════════════
# Hook 解构转换（兼容帆软环境）
# ══════════════════════════════════════════════════════════════

_HOOKS_DESTRUCT_RE = re.compile(
    r'const\s*\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*(React|antd)\.useState\(([\s\S]*?)\);',
    re.MULTILINE
)


def transform_hooks_destructuring(js: str) -> str:
    """
    将 React.useState / antd.useState 的解构赋值转换为两步赋值，
    解决帆软填报预览环境下批量更新失效的问题。

    转换前：
        const [value, setValue] = React.useState('');
        const [count, setCount] = antd.useState(0);

    转换后：
        var _hook_001 = React.useState('');
        var value = _hook_001[0];
        var setValue = _hook_001[1];
        var _hook_002 = antd.useState(0);
        var count = _hook_002[0];
        var setCount = _hook_002[1];
    """
    _info("转换 React.useState / antd.useState 解构赋值（帆软环境兼容）……")

    counter = [0]

    def _replacer(match) -> str:
        var_a = match.group(1)
        var_b = match.group(2)
        hook_prefix = match.group(3)  # React 或 antd
        init_expr = match.group(4).strip()
        counter[0] += 1
        tmp = f"_hook_{counter[0]:03d}_"
        return (
            f"var {tmp} = {hook_prefix}.useState({init_expr});"
            f"var {var_a} = {tmp}[0];"
            f"var {var_b} = {tmp}[1];"
        )

    result = _HOOKS_DESTRUCT_RE.sub(_replacer, js)

    _ok(f"Hook 解构转换完成（{counter[0]} 处）")
    return result


# ══════════════════════════════════════════════════════════════
# 主体逻辑
# ══════════════════════════════════════════════════════════════

def write(output_path: str, mjs_path: str, *, skip_check: bool = False):
    """
    把开发者提供的 .mjs 文件发版为 CPT：
      1. 读取 .mjs
      2. remove_comments() → 纯代码，无注释
      3. transform_hooks_destructuring() → Hook 解构转两步赋值
      4. node --check → 语法门
      5. 注入 base_cpt_page.cpt 骨架，包 CDATA
      6. 质量门检查
      7. 原子落盘
    """

    # ── 1. 读取源文件 ───────────────────────────────────────
    _info(f"读取 .mjs 源文件：{mjs_path}")
    try:
        raw = open(mjs_path, encoding="utf-8").read()
    except OSError as e:
        _die(f"无法读取 --input 文件：{e}")

    if not raw.strip():
        _die(".mjs 文件为空，请确保至少有业务代码。")

    if raw.startswith("﻿"):
        raw = raw.lstrip("﻿")

    _ok(f"读取完成：{len(raw):,} 字符")

    # ── 2. 去掉注释 ─────────────────────────────────────────
    _info("清除全文件注释（保留字符串字面量）……")
    clean = remove_comments(raw)
    _ok(f"注释清除完成：{len(raw):,} → {len(clean):,} 字符")

    # ── 3. Hook 解构转换 ─────────────────────────────────────
    clean = transform_hooks_destructuring(clean)

    # ── 4. 语法检查 ─────────────────────────────────────────
    if not skip_check:
        _info("JS 语法检查（node --check）……")
        rc, stderr = _node_check(clean)
        if rc != 0:
            errors = _unique_first_lines(stderr)
            _die("语法错误，发版已拒绝。请修复以下问题：\n    " +
                 "\n    ".join(errors[:5]))
        _ok("语法检查通过（全文件结构）")
    else:
        _warn("跳过语法检查（--skip-check）")

    # ── 4. 注入骨架 ─────────────────────────────────────────
    _info(f"读取骨架模板：{_BASE_TEMPLATE}")
    if not os.path.exists(_BASE_TEMPLATE):
        _die(f"骨架模板不存在：{_BASE_TEMPLATE}，请联系技能维护。")

    # 用 lxml 解析，获取原始 XML 声明
    parser = etree.XMLParser(remove_blank_text=False)
    tree = etree.parse(_BASE_TEMPLATE, parser)
    root = tree.getroot()

    # 注册命名空间（保持原有命名空间不变）
    for event, elem in etree.iterparse(_BASE_TEMPLATE, events=["start-ns"]):
        ns_prefix, ns_uri = elem
        etree.register_namespace(ns_prefix if ns_prefix else '', ns_uri)

    # XPath 定位 <Content> 节点
    # 骨架模板无命名空间，直接用路径
    content_nodes = root.xpath(".//Listener[@event='afterload']/JavaScript/Content")
    if not content_nodes:
        _die("骨架模板中找不到 <Listener event='afterload'>/<JavaScript>/<Content> 节点")

    content_elem = content_nodes[0]

    # 清除占位内容（可能是 CDATA 段或纯文本）
    for child in list(content_elem):
        content_elem.remove(child)
    content_elem.text = None

    # 填入干净代码，稍后包 CDATA
    content_elem.text = clean
    _ok("已写入 <Content>（注释已清除，整体注入）")

    # ── 5. 序列化 XML ───────────────────────────────────────
    raw_bytes = etree.tostring(root, encoding="UTF-8", xml_declaration=True)
    raw_str = raw_bytes.decode("utf-8") if isinstance(raw_bytes, bytes) else raw_str

    # 字节层手动包 CDATA（lxml 的 CDATA 模式不支持文本节点混合）
    ct_open  = "<Content>"
    ct_close = "</Content>"
    try:
        pos_a = raw_str.index(ct_open) + len(ct_open)
        pos_z = raw_str.index(ct_close)
    except ValueError as e:
        _die(f"<Content> 节点异常，无法定位插入点：{e}")

    new_block = "<![CDATA[\n" + clean + "\n]]>"
    new_str   = raw_str[:pos_a] + new_block + raw_str[pos_z:]

    # ── 6. 写临时文件 ───────────────────────────────────────
    output_tmp = output_path + ".tmp"
    with open(output_tmp, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(new_str)
    _info(f"临时文件已写：{output_tmp}")

    # ── 7. 质量门 ───────────────────────────────────────────
    if os.path.exists(_CHECKER_CLI) and not skip_check:
        _info("进入 quality gate（display_checker）……")
        rc = subprocess.run(
            [sys.executable, _CHECKER_CLI, "--quiet", output_tmp],
            capture_output=False,
        ).returncode
        if rc != 0:
            os.unlink(output_tmp)
            _die(f"quality gate 失败（exit {rc}），输出文件未生成。"
                 " 查看上方 FAIL 条目，修复后重新运行。")
        _ok("quality gate 通过")
    elif skip_check:
        _warn("跳过 quality gate（--skip-check）")
    else:
        _warn("display_checker.py 不存在，跳过质量门")

    # ── 8. 原子落盘 ────────────────────────────────────────
    try:
        os.replace(output_tmp, output_path)
    except OSError as e:
        _die(f"无法写入输出文件 {output_path}：{e}")

    size_kib = os.path.getsize(output_path) / 1024
    _ok(f"CPT 已落盘：{output_path}（约 {size_kib:.1f} KiB）")


def _unique_first_lines(stderr: str, max_count: int = 5) -> list[str]:
    seen, lines = set(), []
    for ln in stderr.strip().splitlines():
        stripped = ln.strip()
        if not stripped or stripped in seen:
            continue
        core = stripped.split(":error:", 1)[-1].split(":warning:", 1)[-1].strip()
        if core not in seen:
            seen.add(core)
            lines.append(stripped)
        if len(lines) >= max_count:
            break
    return lines or [stderr.strip().splitlines()[0]]


# ══════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════

def main():
    ap = argparse.ArgumentParser(prog="display_writer.py",
                                 description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)

    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--input", "-i",
                       help="JavaScript 源文件（.mjs，传统方式）")
    group.add_argument("--jsx", "-x",
                       help="JSX 源文件（.jsx，自动编译后发版）")

    ap.add_argument("--output", "-o", required=True,
                    help="输出 CPT 文件路径")
    ap.add_argument("--skip-check", action="store_true",
                    help="跳过语法检查和质量门（慎用）")

    args = ap.parse_args()

    # 确定 .mjs 路径
    if args.jsx:
        if not os.path.exists(args.jsx):
            _die(f"JSX 文件不存在：{args.jsx}")
        mjs_path = compile_jsx_to_mjs(args.jsx)
    else:
        if not os.path.exists(args.input):
            _die(f"mjs 文件不存在：{args.input}")
        mjs_path = args.input

    if not os.path.exists(_BASE_TEMPLATE):
        print(f"FATAL: 骨架模板不存在：{_BASE_TEMPLATE}", file=sys.stderr)
        sys.exit(1)

    write(args.output, mjs_path, skip_check=args.skip_check)
    sys.exit(0)


if __name__ == "__main__":
    main()
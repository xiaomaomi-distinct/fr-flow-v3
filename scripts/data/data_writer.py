#!/usr/bin/env python3
"""
数据层 CPT 发版工具

工具链流程：
    1. 读取 dev_task.json 中的 datasets 定义
    2. 解析 base_cpt_data.cpt 骨架
    3. 定位 TableDataMap，清空示例数据集
    4. 按 datasets 生成 TableData XML，装配到 TableDataMap
    5. 序列化 XML，落盘

用法：
    python3 data_writer.py --task dev_task.json --output data/equipment_data.cpt

成功 exit 0，失败 exit 1。
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys

from lxml import etree


# ══════════════════════════════════════════════════════════════
# 路径常量
# ══════════════════════════════════════════════════════════════

_DATA_DIR   = os.path.dirname(os.path.abspath(__file__))
_SCRIPTS_DIR = os.path.dirname(_DATA_DIR)
_ROOT_DIR    = os.path.dirname(_SCRIPTS_DIR)
_BASE_TEMPLATE = os.path.join(_ROOT_DIR, "foundation", "templates",
                              "base_cpt_data.cpt")
_CHECKER_CLI   = os.path.join(_DATA_DIR, "data_checker.py")


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
# 参数类型映射
# ══════════════════════════════════════════════════════════════

def param_type_to_xml(param_type: str) -> tuple[str, str]:
    """
    将参数类型映射为 XML 属性和默认值

    param_type: "formula" | "string" | "integer" | "double"
    returns: (t_attr, 示例默认值)
    """
    mapping = {
        "formula": (' t="XMLable" class="com.fr.base.Formula"', '=$fine_username'),
        "string":  ('', ''),
        "integer":(' t="I"', '0'),
        "double":  (' t="D"', '0.0'),
    }
    return mapping.get(param_type.lower(), ('', ''))


# ══════════════════════════════════════════════════════════════
# TableData 生成（基于 lxml Element + CDATA，根除序列化丢失 CDATA 问题）
# ══════════════════════════════════════════════════════════════

def _cdata(text: str) -> etree.CDATA:
    """CDATA 文本节点工厂"""
    return etree.CDATA(text)


def _parse_t_attr(t_attr: str) -> dict:
    """将 ' t="I"' 或 ' t="XMLable" class="com.fr.base.Formula"' 解析为 dict"""
    attrs = {}
    for part in t_attr.strip().split():
        if '=' in part:
            k, v = part.split('=', 1)
            attrs[k] = v.strip('"')
    return attrs


def build_table_data(name: str, sql: str, params: list,
                     db_name: str = "common_db") -> etree.Element:
    """生成完整 TableData Element（CDATA 安全）"""
    td = etree.Element("TableData", attrib={
        "name": name,
        "class": "com.fr.data.impl.DBTableData",
    })

    # Desensitizations
    desens = etree.SubElement(td, "Desensitizations")
    desens.set("desensitizeOpen", "false")

    # Parameters
    params_elem = etree.SubElement(td, "Parameters")
    for p in params:
        ptype = p.get("type", "string")
        default = p.get("default", "")
        t_attr, fallback = param_type_to_xml(ptype)
        if not default and fallback:
            default = fallback

        param_elem = etree.SubElement(params_elem, "Parameter")
        attr_elem = etree.SubElement(param_elem, "Attributes")
        attr_elem.set("name", p["name"])

        o_elem = etree.SubElement(param_elem, "O")
        for k, v in _parse_t_attr(t_attr).items():
            o_elem.set(k, v)
        o_elem.text = _cdata(default)

    # Attributes
    attrs = etree.SubElement(td, "Attributes")
    attrs.set("maxMemRowCount", "-1")

    # Connection
    conn = etree.SubElement(td, "Connection", attrib={
        "class": "com.fr.data.impl.NameDatabaseConnection",
    })
    dbname = etree.SubElement(conn, "DatabaseName")
    dbname.text = _cdata(db_name)

    # Query
    query = etree.SubElement(td, "Query")
    query.text = _cdata(sql.strip())

    # PageQuery
    pagequery = etree.SubElement(td, "PageQuery")
    pagequery.text = _cdata("")

    return td


# ══════════════════════════════════════════════════════════════
# 主体逻辑
# ══════════════════════════════════════════════════════════════

def write(output_path: str, task_path: str, *,
          db_name: str = "common_db",
          skip_check: bool = False):
    """
    把 dev_task.json 中的 datasets 写入 base_cpt_data.cpt 骨架
    """

    # ── 1. 读取 dev_task.json ─────────────────────────────────
    _info(f"读取任务单：{task_path}")
    try:
        with open(task_path, encoding="utf-8") as f:
            task = json.load(f)
    except OSError as e:
        _die(f"无法读取任务单：{e}")
    except json.JSONDecodeError as e:
        _die(f"任务单 JSON 格式错误：{e}")

    datasets = task.get("database", {}).get("datasets", [])
    task_db = task.get("database", {}).get("db_name", "")
    if task_db and db_name == "common_db":
        db_name = task_db
    if not datasets:
        _warn("任务单中没有找到 datasets 定义")

    _ok(f"读取完成：{len(datasets)} 个数据集")

    # ── 2. 解析骨架 ───────────────────────────────────────────
    _info(f"读取骨架模板：{_BASE_TEMPLATE}")
    if not os.path.exists(_BASE_TEMPLATE):
        _die(f"骨架模板不存在：{_BASE_TEMPLATE}")

    parser = etree.XMLParser(remove_blank_text=False)
    tree = etree.parse(_BASE_TEMPLATE, parser)
    root = tree.getroot()

    # 注册命名空间（保持原有命名空间不变）
    for event, elem in etree.iterparse(_BASE_TEMPLATE, events=["start-ns"]):
        ns_prefix, ns_uri = elem
        etree.register_namespace(ns_prefix if ns_prefix else '', ns_uri)

    # ── 3. 定位 TableDataMap ──────────────────────────────────
    table_data_map = root.find("TableDataMap")
    if table_data_map is None:
        _die("骨架模板中找不到 TableDataMap 节点")

    # 清空示例 TableData
    for child in list(table_data_map):
        table_data_map.remove(child)
    _info("已清空 TableDataMap 下所有 TableData")

    # ── 4. 生成并装配 datasets ───────────────────────────────
    for ds in datasets:
        name = ds.get("name")
        sql = ds.get("sql", "")
        params = ds.get("params", [])

        if not name:
            _warn("跳过无名称的数据集")
            continue

        _info(f"生成数据集：{name}")

        # 生成 TableData Element（优先用数据集自身的 db_connection，否则用 CLI --db-name）
        ds_elem = build_table_data(
            name=name,
            sql=sql,
            params=params,
            db_name=ds.get("db_connection", db_name),
        )

        table_data_map.append(ds_elem)
        _ok(f"已添加：{name}")

    # ── 5. 序列化 XML ──────────────────────────────────────────
    _info("序列化 XML……")
    raw_bytes = etree.tostring(root, encoding="UTF-8", xml_declaration=True)
    xml_str = raw_bytes.decode("utf-8")

    _ok(f"XML 序列化完成：{len(xml_str):,} 字符")

    # ── 6. 写临时文件 ─────────────────────────────────────────
    output_tmp = output_path + ".tmp"
    with open(output_tmp, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(xml_str)
    _info(f"临时文件已写：{output_tmp}")

    # ── 7. 质量门 ─────────────────────────────────────────────
    if os.path.exists(_CHECKER_CLI) and not skip_check:
        _info("进入 quality gate（data_checker）……")
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
        _warn("data_checker.py 不存在，跳过质量门")

    # ── 8. 原子落盘 ──────────────────────────────────────────
    try:
        os.replace(output_tmp, output_path)
    except OSError as e:
        _die(f"无法写入输出文件 {output_path}：{e}")

    size_kib = os.path.getsize(output_path) / 1024
    _ok(f"CPT 已落盘：{output_path}（约 {size_kib:.1f} KiB）")


# ══════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════

def main():
    ap = argparse.ArgumentParser(prog="data_writer.py",
                                 description=__doc__)

    ap.add_argument("--task", "-t", required=True,
                    help="dev_task.json 路径")
    ap.add_argument("--output", "-o", required=True,
                    help="输出 CPT 文件路径")
    ap.add_argument("--db-name", "-d", default="common_db",
                    help="数据库名称（默认 common_db）")
    ap.add_argument("--skip-check", action="store_true",
                    help="跳过质量门检查（慎用）")

    args = ap.parse_args()

    write(args.output, args.task,
          db_name=args.db_name,
          skip_check=args.skip_check)
    sys.exit(0)


if __name__ == "__main__":
    main()
#!/usr/bin/env node
/**
 * =====================================================
 * 权限守卫脚本
 * 用于 PreToolUse Hook，保护技能文件不被修改
 *
 * 保护策略：
 * - fr-flow-plugin/ 目录下的 skills/, shared/, foundation/, hooks/, scripts/
 *   以及 fr-flow.conf 只读
 * - 允许操作：projects/、帆软真实部署目录（从 .fr.yaml 动态读取）、*.fr.yaml
 *
 * 用法：在 settings.json 中配置 PreToolUse Hook 调用此脚本
 * 输入：通过 stdin 接收工具调用信息（JSON格式）
 * 输出：JSON 格式的决策结果
 * =====================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ========== 动态加载帆软部署路径（来自 .fr.yaml） ==========

const HOME_YAML = path.join(process.env.HOME || '/home/' + (process.env.USER || 'mobile'), '.fr.yaml');
// 技能包根目录（hooks/ 的父目录）
const WORKSPACE_YAML = path.join(
    path.dirname(path.dirname(__filename)),  // hooks/ → fr-flow-v3/
    '.fr.yaml');

let _frReportlets = [];

/** 尝试解析 YAML 中 paths.finereport_reportlets（纯手工，不依赖第三方库） */
function readReportletsPaths() {
    for (const yamlPath of [HOME_YAML, WORKSPACE_YAML]) {
        try {
            if (!fs.existsSync(yamlPath)) continue;
            const text = fs.readFileSync(yamlPath, 'utf8');
            // 匹配 "finereport_reportlets: /real/path" 这类行（支持引号和无引号）
            const m = text.match(/^[^#\n]*finereport_reportlets\s*[=:]\s*['"]?([^'"'\n]+?)['"]?\s*$/m);
            if (m && m[1] && fs.existsSync(path.dirname(m[1]))) {
                // 目标：path.dirname(m[1])，因为配置值通常是 .../reportlets/project/
                _frReportlets.push(path.normalize(m[1]));
            }
        } catch (_) { /* non-fatal */ }
    }
    if (_frReportlets.length === 0) {
        console.error('[PermissionGuard] WARN: 未找到 finereport_reportlets 配置，白名单可能不完整');
    } else {
        console.error('[PermissionGuard] finereport_reportlets paths:', _frReportlets.join(', '));
    }
}

readReportletsPaths();

// ========== 保护路径定义（黑名单） ==========

const PROTECTED_PATTERNS = [
    'skills/',
    'shared/',
    'foundation/',
    'hooks/',
    'scripts/',
    'roles/',
    'fr-flow.conf',
    '.fr.yaml.example'
];

// 白名单只需要 projects/（静态），帆软部署路径由上面动态加载
/**
 * 静态允许的路径段（fallback，当 .fr.yaml 不可用时使用）。
 *
 * projects   — 项目工作目录（凡名含 projects/ 的路径）
 * reportlets — 帆软 Tomcat 标准部署目录名（conf/server.xml 中 WEB-INF/reportlets）
 * wuhan      — 本单位帆软服务器的顶层目录（经验证，该路径下不含敏感个人文件）
 *
 * 白名单段不做黑名单二次检查，即使 'scripts/' 也是先放行再看是否在黑名单。
 * 但由于检查顺序是"白名单优先"，白名单命中的路径绝不会到达黑名单检查。
 */
const STATIC_ALLOWED_SEGMENTS = ['projects', 'reportlets', 'wuhan'];

// ========== 辅助函数 ==========

/** 段级匹配：路径的任意一层目录分量等于 dirName 即命中 */
function hasDirSegment(filePath, dirName) {
    if (!dirName) return false;
    const segs = filePath.split('/').filter(Boolean);
    return segs.some(seg => seg === dirName);
}

/**
 * 黑名单检查：段级匹配 + 精确文件名
 * 防止脚本目录名污染（如 scripts/ 不误伤 scripts_templates/）
 */
function isProtected(filePath) {
    const np = path.normalize(filePath);
    const segs = np.split('/').filter(Boolean);

    for (const p of PROTECTED_PATTERNS) {
        if (p.endsWith('/')) {
            if (segs.some(seg => seg === p.replace(/\/$/, ''))) return true;
        } else {
            if (np.endsWith(p) || np.includes('/' + p)) return true;
        }
    }
    return false;
}

/**
 * 白名单检查：
 *   1. projects/ 目录（段级）
 *   2. finereport_reportlets 下属的任意深层子目录（动态，来自 .fr.yaml）
 *   3. *.fr.yaml 用户配置文件
 *
 * 白名单通过即放行，完全不会进入黑名单检查，从而避免 scripts/ 被误拦
 */
function isAllowed(filePath) {
    const np = path.normalize(filePath);

    // 静态允许段（projects）
    if (STATIC_ALLOWED_SEGMENTS.some(d => hasDirSegment(np, d))) return true;

    // 动态帆软部署路径：路径必须是 .fr.yaml 中配置的路径或其下层
    for (const rp of _frReportlets) {
        if (rp && (np === rp || np.startsWith(rp + '/') || np.startsWith(rp + path.sep))) {
            return true;
        }
    }

    // 允许 *.fr.yaml
    if (/\.fr\.yaml$/.test(np)) return true;

    return false;
}

function outputResult(allow, reason) {
    const res = {
        systemMessage: allow ? '' : reason,
        continue: allow,
        stopReason: allow ? '' : reason,
        suppressOutput: false
    };
    if (!allow) {
        res.hookSpecificOutput = {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: reason
        };
    }
    console.log(JSON.stringify(res));
}

// ========== 主函数 ==========
function main() {
    let input = '';
    process.stdin.on('data', chunk => { input += chunk; });
    process.stdin.on('end', () => {
        try {
            const data = JSON.parse(input);
            const toolName = data.tool_name || '';
            const ti = data.tool_input || {};

            let fp = ti.file_path || ti.path || ti.notebook_path || '';
            if (toolName === 'Bash' && ti.directory) fp = ti.directory;
            if (!fp) { outputResult(true, ''); return; }
            if (!path.isAbsolute(fp)) fp = path.resolve(process.cwd(), fp);
            if (!['Write', 'Edit', 'Delete', 'Bash'].includes(toolName)) {
                outputResult(true, ''); return;
            }

            // ★★★ 白名单优先：允许目录直接放行，不再被黑名单误拦 ★★★
            if (isAllowed(fp)) { outputResult(true, ''); return; }

            if (isProtected(fp)) {
                console.error('[PermissionGuard] PROTECTED -> ' + fp + ': DENIED');
                outputResult(false, '[权限拒绝] 技能文件受保护，禁止修改: ' + path.basename(fp));
                return;
            }

            console.error('[PermissionGuard] UNKNOWN -> ' + fp + ': DENIED');
            outputResult(false, '[权限拒绝] 路径不在白名单内，只允许 projects/ 或 finereport_reportlets/ 目录');
            return;
        } catch (e) {
            console.error('[PermissionGuard] Parse error: ' + e.message);
            outputResult(true, '');
        }
    });
}

main();

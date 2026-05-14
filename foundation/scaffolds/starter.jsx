/*
  JSX 起步模板

  用法：
    1. 复制此文件到项目 pages 目录，改名为 {module}_page.jsx
    2. 用 JSX 语法编写页面组件
    3. 运行 display_writer.py 发布：
       python3 display_writer.py --jsx pages/my_page.jsx --output page.cpt

  重要：
    - 不要修改此文件的外层结构
    - 只能在"开发者业务区"内编写代码

  框架已自动处理：
    - React 挂载点创建（app-root div）
    - 帆软框架 CSS 隔离（隐藏 .content-container, .reportPane 等容器）
    - IIFE 封装由 esbuild --format=iife 自动完成
*/

var PATH = {
    currentDir: (function() {
        var name = FR.remoteEvaluate("=reportName");
        return name.substring(0, name.lastIndexOf('/') + 1);
    })(),
    apiBase: (function() {
        var servletURL = FR.remoteEvaluate("=servletURL");
        var parts = servletURL.split('/');
        return '/' + parts[1] + '/' + parts[2];
    })(),
    getDataTemplate: function(filename) {
        return this.currentDir.replace('/pages/', '/data/') + filename;
    },
    getTemplatePath: function(filename) {
        return this.currentDir + filename;
    }
};

var hideStyle = document.createElement('style');
hideStyle.innerHTML =
    '.fr-report{position:absolute!important;left:-9999px!important;visibility:hidden!important}' +
    '.content-container,.fr-content,.reportPane{height:0!important;overflow:hidden!important;pointer-events:none!important}' +
    'body>.textbox-container,body>#textboxContainer,body>.widget-container{display:none!important}';
document.head.appendChild(hideStyle);
document.body.setAttribute('style',
    'margin:0;padding:0;min-height:100vh;box-sizing:border-box;overflow-y:auto;');

/* ===== DEVELOPER ZONE（在这里编写业务代码） ===== */

// 创建React挂载点
var appRoot = document.createElement('div');
appRoot.id = 'app-root';
document.body.insertBefore(appRoot, document.body.firstChild);

function App() {
    const [value, setValue] = React.useState('');

    return (
        <div style={{ padding: '24px' }}>
            <h2>Hello, FineReport!</h2>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(<App />);
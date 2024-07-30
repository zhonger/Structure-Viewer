"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const getNonce_1 = require("./getNonce");
const fs = require("fs");
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('structureViewer.open', () => {
        StructureViewerPanel.createOrShow(context.extensionUri);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('structureViewer.openFile', (uri) => {
        StructureViewerPanel.createOrShow(context.extensionUri, uri);
    }));
}
exports.activate = activate;
class StructureViewerPanel {
    static createOrShow(extensionUri, uri) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (StructureViewerPanel.currentPanel) {
            StructureViewerPanel.currentPanel._panel.reveal(column);
            if (uri) {
                StructureViewerPanel.currentPanel._loadFile(uri);
            }
            return;
        }
        const panel = vscode.window.createWebviewPanel(StructureViewerPanel.viewType, 'Structure Viewer', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media')
            ]
        });
        StructureViewerPanel.currentPanel = new StructureViewerPanel(panel, extensionUri);
        if (uri) {
            StructureViewerPanel.currentPanel._loadFile(uri);
        }
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    dispose() {
        StructureViewerPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Structure Viewer';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'script.js'));
        const nglUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'ngl.min.js'));
        const nonce = (0, getNonce_1.getNonce)();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NGL CIF Visualization</title>
    <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; 
                 style-src ${webview.cspSource}; 
                 script-src 'nonce-${nonce}' ${webview.cspSource};
                 connect-src 'nonce-${nonce}' ${webview.cspSource} blob:;
                 img-src ${webview.cspSource} blob: data:;
                 media-src ${webview.cspSource} blob:;">
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <div id="controls-container">
        <select id="representation-selector">
            <option value="ball+stick">Ball + Stick</option>
            <option value="spacefill">Spacefill</option>
            <option value="line">Line</option>
            <option value="licorice">Licorice</option>
            <option value="cartoon">Cartoon</option>
            <option value="ribbon">Ribbon</option>
            <option value="trace">Trace</option>
            <option value="surface">Surface</option>
        </select>
        <button id="reset-center-button">Reset Center</button>
    </div>
    <div id="viewport"></div>
    <script src="${nglUri}" nonce="${nonce}"></script>
    <script src="${scriptUri}" nonce="${nonce}"></script>
</body>
</html>`;
    }
    _loadFile(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = uri.fsPath;
            const fileContent = yield fs.promises.readFile(filePath, 'utf-8');
            this._panel.webview.postMessage({ command: 'loadFile', content: fileContent });
        });
    }
}
StructureViewerPanel.viewType = 'structureViewer';
//# sourceMappingURL=extension.js.map
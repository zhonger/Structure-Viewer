import * as vscode from 'vscode';
import { getNonce } from './getNonce';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('structureViewer.open', () => {
      StructureViewerPanel.createOrShow(context.extensionUri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('structureViewer.openFile', (uri: vscode.Uri) => {
      StructureViewerPanel.createOrShow(context.extensionUri, uri);
    })
  );
}

class StructureViewerPanel {
  public static currentPanel: StructureViewerPanel | undefined;
  public static readonly viewType = 'structureViewer';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, uri?: vscode.Uri) {
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

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public dispose() {
    StructureViewerPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.title = 'Structure Viewer';
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'script.js'));
    const nglUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'ngl.min.js'));
    const nonce = getNonce();

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

  private async _loadFile(uri: vscode.Uri) {
    const filePath = uri.fsPath;
    const extension = filePath.split('.').pop()?.toLowerCase();
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');

    let message;
    if (extension === 'xyz' || extension === 'extxyz') {
      message = { command: 'loadXYZ', content: fileContent };
    } else if (extension === 'cif') {
      message = { command: 'loadCIF', content: fileContent };
    }

    this._panel.webview.postMessage(message);
  }
}

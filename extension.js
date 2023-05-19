"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionOfIB = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const { exec } = require('child_process');
const vscode = require('vscode');
const process = require('process');
const fs = require('fs');
const path = require('path');
const envfile = require('envfile');
const rootPath =
	vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
		? vscode.workspace.workspaceFolders[0].uri.fsPath
		: undefined;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {

	let config = vscode.workspace.getConfiguration('PieVscodeExt');
	let workspaceWorking = config.workspaceWorking && config.workspaceWorking.length > 0 ? config.workspaceWorking : undefined;

	if (workspaceWorking) {
		if (workspaceWorking !== rootPath) {
			vscode.commands.executeCommand('setContext', 'PieVscodeExt.supported', false);
		}
	};

	vscode.commands.executeCommand('setContext', 'PieVscodeExt.supported', true);

	let CollectionIB = new CollectionOfIB()
	vscode.window.registerTreeDataProvider('CollectionOfIB', CollectionIB);
	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.refreshBases', () => CollectionIB.refresh()));

	let tasksArray = ["build", "load", "dump", "up_version", "up_build", "build_at", "dump_at", "old_dump", "form_code_validate"];

	tasksArray.forEach(function (entrypoint) {
		context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.' + entrypoint, function () {
			let task = new vscode.Task(
				{
					type: 'pie',
					task: entrypoint
				},
				vscode.TaskScope.Workspace,
				'pie ' + entrypoint,
				'pie',
				new vscode.ShellExecution('pie ' + entrypoint)
			);
			vscode.tasks.executeTask(task);
		}));
	})

	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.setCurrentBase', function (IBCollection) {
		setCurrentDatabase(IBCollection.name);
	}));

}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

function pathExists(p) {
	try {
		fs.accessSync(p);
	} catch (err) {
		return false;
	}

	return true;
}

function setCurrentDatabase(name) {

	const pathenv = path.join(rootPath, '.env');

	if (!pathExists(pathenv)) {
		fs.writeFileSync(pathenv, "")
	}

	let parsedFile = envfile.parse(fs.readFileSync(pathenv).toString());
	parsedFile.PIE_IB_NAME = name;
	fs.writeFileSync(pathenv, envfile.stringify(parsedFile))
}

class CollectionOfIB {

	_onDidChangeTreeData = new vscode.EventEmitter();
	onDidChangeTreeData = this._onDidChangeTreeData.event;


	refresh() {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element) {
		return element;
	}

	getChildren(element) {
		return Promise.resolve(
			this.getIBCollection()
		);
	}

	getIBCollection() {
		const toDep = (name, path) => {
			return new IBCollection(name, path);
		};
		const config = vscode.workspace.getConfiguration('PieVscodeExt');

		const CollectionOfIB = config.CollectionOfIB
			? Object.keys(config.CollectionOfIB).map(dep => toDep(dep, config.CollectionOfIB[dep]))
			: [];
		return CollectionOfIB;
	}
}

exports.CollectionOfIB = CollectionOfIB;
class IBCollection extends vscode.TreeItem {
	constructor(name, path) {
		super(name);
		this.name = name;
		this.path = path;
		this.tooltip = `${this.name}`;
		this.description = `${this.path}`;
	}
}
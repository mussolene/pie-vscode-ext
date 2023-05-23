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
	let pathPieFile = path.join(rootPath, 'piefile.py');

	if (workspaceWorking) {
		if (workspaceWorking !== rootPath) {
			vscode.commands.executeCommand('setContext', 'PieVscodeExt.supported', false);
		}
	};

	vscode.commands.executeCommand('setContext', 'PieVscodeExt.supported', true);
	if (!pathExists(pathPieFile)) {
		vscode.commands.executeCommand('setContext', 'PieVscodeExt.supported', false);
	}

	let CollectionIB = new CollectionOfIB()
	vscode.window.registerTreeDataProvider('CollectionOfIB', CollectionIB);
	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.refreshBases', () => CollectionIB.refresh()));

	let regex = /^\s*def\s+(\w+)\s*\(/mg;
	let matcher = [...fs.readFileSync(pathPieFile).toString().matchAll(regex)];

	let pie_function = []
	matcher.forEach(m => { pie_function.push(m[1]) })

	pie_function.forEach(function (entrypoint) {
		vscode.commands.executeCommand('setContext', 'PieVscodeExt.Use' + entrypoint, true);
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

	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.setCurrentBaseAndLaunch', function (IBCollection) {
		setCurrentDatabase(IBCollection.name);
		vscode.commands.executeCommand('pie-vscode.load');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.start1C', function (IBCollection) {
		let executeble = path.join(process.env.PROGRAMFILES, "1cv8", "common", "1CEstart.exe");

		let task = new vscode.Task(
			{
				type: executeble,
				task: " ENTERPRISE /IBName " + IBCollection.name
			},
			vscode.TaskScope.Workspace,
			"1cestart",
			" ENTERPRISE /IBName " + IBCollection.name,
			new vscode.ProcessExecution(executeble, ["ENTERPRISE", "/IBName", IBCollection.name])
		);
		vscode.tasks.executeTask(task);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.startDesigner', function (IBCollection) {
		let executeble = path.join(process.env.PROGRAMFILES, "1cv8", "common", "1CEstart.exe");

		let task = new vscode.Task(
			{
				type: executeble,
				task: " DESIGNER /IBName " + IBCollection.name
			},
			vscode.TaskScope.Workspace,
			"1cestart",
			" DESIGNER /IBName " + IBCollection.name,
			new vscode.ProcessExecution(executeble, ["DESIGNER", "/IBName", IBCollection.name])
		);
		vscode.tasks.executeTask(task);
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

function parseINIString(data) {
	let regex = {
		section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
		param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
		comment: /^\s*;.*$/
	};
	let value = {};
	let lines = data.split(/[\r\n]+/);
	let section = null;
	lines.forEach(function (line) {
		if (regex.comment.test(line)) {
			return;
		} else if (regex.param.test(line)) {
			let match = line.match(regex.param);
			if (section) {
				value[section][match[1]] = match[2];
			} else {
				value[match[1]] = match[2];
			}
		} else if (regex.section.test(line)) {
			let match = line.match(regex.section);
			value[match[1]] = {};
			section = match[1];
		} else if (line.length == 0 && section) {
			section = null;
		};
	});
	return value;
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
		if (element) {
			return Promise.resolve(
				this.getIBCollection(String(element.path + '/').replace('//', '/') + element.name)
			);
		} else {
			return Promise.resolve(
				this.getIBCollection('/')
			);
		};
	}

	getIBCollection(folder) {
		const toIB = (name, ib) => {
			if (!ib.Connect) {
				return new IBCollection(name, ib.Folder, "", vscode.TreeItemCollapsibleState.Collapsed);
			} else {
				return new IBCollection(name, ib.Folder, ib.Connect, vscode.TreeItemCollapsibleState.None)
			}
		};

		let pathib = path.join(process.env.APPDATA, "1C", "1CEStart", "ibases.v8i");
		let pathcfg = path.join(process.env.APPDATA, "1C", "1CEStart", "1CEStart.cfg");
		let parsedFile_pathib = parseINIString(fs.readFileSync(pathib).toString());
		let parsedFile_pathcfg = parseINIString(fs.readFileSync(pathcfg, { encoding: 'utf16le' }).toString());
		let CommonInfoBase = parsedFile_pathcfg.CommonInfoBases ? parseINIString(fs.readFileSync(parsedFile_pathcfg.CommonInfoBases).toString()) : {};

		let SortedBase = {};

		Object.keys(CommonInfoBase).sort().forEach(ib => { SortedBase[ib] = CommonInfoBase[ib] });
		Object.keys(parsedFile_pathib).sort().forEach(ib => { SortedBase[ib] = parsedFile_pathib[ib] });

		const CollectionOfIB2 = SortedBase
			? Object.keys(SortedBase).map(ib => toIB(ib, SortedBase[ib]))
			: [];

		let filterbase = CollectionOfIB2.filter(ib => { return ib.path == folder });

		return filterbase;
	}
}

exports.CollectionOfIB = CollectionOfIB;
class IBCollection extends vscode.TreeItem {
	constructor(name, path, description, collapsibleState) {
		super(name, collapsibleState);
		this.name = name;
		this.path = path;
		this.tooltip = `${this.name}`;
		this.description = description;
		this.collapsibleState = collapsibleState;
	}
}
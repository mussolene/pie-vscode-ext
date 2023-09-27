"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionOfIB = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const process = require('process');
const fs = require('fs');
const path = require('path');
const https = require('https')
const envfile = require('envfile');
const { log } = require('console');
const FS_REGEX = /\\/g;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {
	vscode.commands.executeCommand('setContext', 'PieVscodeExt.supported', true);

	let CollectionIB = new CollectionOfIB()
	let CollectionModules = new CollectionOfModules()
	vscode.window.registerTreeDataProvider('CollectionOfIB', CollectionIB);
	vscode.window.registerTreeDataProvider('CollectionOfModules', CollectionModules);
	let pkgJson = context.extension.packageJSON;
	pkgJson.contributes.menus["scm/title"].forEach(v => {
		context.subscriptions.push(vscode.commands.registerCommand(v.command, (arg) => commandexec(arg.rootUri.fsPath.replace(FS_REGEX, "/"), v.command.replace("pie-vscode.", ""))));
	})

	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.refreshBases', () => CollectionIB.refresh()));
	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.refreshModules', () => CollectionModules.refresh()));
	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.setCurrentBase', IBCollection => commandSetCurrentBase(IBCollection)));
	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.close1C', commandClose1C));
	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.setCurrentBaseAndLaunch', IBCollection => commandSetCurrentBaseAndLaunch(IBCollection)));
	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.downloadModule', ModuleCollection => commandDownloadModule(ModuleCollection)));
	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.start1C', IBCollection => commandStart1C(IBCollection)));
	context.subscriptions.push(vscode.commands.registerCommand('pie-vscode.startDesigner', IBCollection => commandStartDesigner(IBCollection)));

}
// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

function commandStartDesigner(IBCollection) {
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
}

function commandStart1C(IBCollection) {
	let executeble = path.join(process.env.PROGRAMFILES, "1cv8", "common", "1CEstart.exe");

	let configs = []
	let pathconfig = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath.replace(FS_REGEX, '/'), "tools", 'diadoc-config')
	const fs = require('fs');
	fs.readdirSync(pathconfig).forEach(file => {
		configs.push(file);
	});

	vscode.window.showQuickPick(configs).then(scopePath => {
		let execparam = ["ENTERPRISE", "/IBName", IBCollection.name]
		if (scopePath) {
			execparam = ["ENTERPRISE", "/IBName", IBCollection.name, "/C", "diadoc-config=" + path.join(pathconfig, scopePath)];
		}
		let task = new vscode.Task(
			{
				type: executeble,
				task: " ENTERPRISE /IBName " + IBCollection.name
			},
			vscode.TaskScope.Workspace,
			"1cestart",
			" ENTERPRISE /IBName " + IBCollection.name,
			new vscode.ProcessExecution(executeble, execparam)
		);
		vscode.tasks.executeTask(task);
	});


}

function commandDownloadModule(ModuleCollection) {
	const options = {
		canSelectMany: false,
		openLabel: 'Choose folder',
		canSelectFolders: true,
		canSelectFiles: false
	};
	vscode.window.showOpenDialog(options).then(fl => {
		if (fl[0]) {
			let title = 'Downloading ... ' + ModuleCollection.name;
			let promise = vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: title,
					cancellable: false,
				},
				async (progress, token) => {
					progress.report({ increment: 0 });
					await downloadModule(ModuleCollection.url).then(data => {
						let filepath = path.join(fl[0].fsPath.replace(FS_REGEX, '/'), ModuleCollection.filename);
						fs.writeFile(filepath, data, function (err) {
							if (err) {
								console.log(err);
							} else {
								console.log("The file was saved!");
							}
						});
					}).catch(error => {
						log.apply(error);
					});
					progress.report({ increment: 100 });
				}
			);
			return promise;
		}
	});
}

function commandSetCurrentBaseAndLaunch(IBCollection) {
	let wsfolders = vscode.workspace.workspaceFolders;

	if (wsfolders.length > 1) {
		let wsname = [];
		wsfolders.forEach(ws => { wsname.push(ws.uri.fsPath.replace(FS_REGEX, '/')); });
		vscode.window.showQuickPick(wsname).then(scopePath => {
			commandexec(scopePath, "load", IBCollection.name);
		});
	} else {
		commandexec(wsfolders[0].uri.fsPath.replace(FS_REGEX, '/'), "load", IBCollection.name);
	}
}

function commandClose1C() {
	let task = new vscode.Task(
		{
			type: 'taskkill',
			task: 'taskkill 1cv8.exe'
		},
		vscode.TaskScope.Workspace,
		'taskkill',
		'taskkill 1cv8.exe',
		new vscode.ProcessExecution('taskkill', ["-im", "1cv8.exe", "-f"])
	);
	let task1 = new vscode.Task(
		{
			type: 'taskkill',
			task: 'taskkill 1cv8c.exe'
		},
		vscode.TaskScope.Workspace,
		'taskkill',
		'taskkill 1cv8c.exe',
		new vscode.ProcessExecution('taskkill', ["-im", "1cv8c.exe", "-f"])
	);
	let task2 = new vscode.Task(
		{
			type: 'taskkill',
			task: 'taskkill 1cv8s.exe'
		},
		vscode.TaskScope.Workspace,
		'taskkill',
		'taskkill 1cv8s.exe',
		new vscode.ProcessExecution('taskkill', ["-im", "1cv8s.exe", "-f"])
	);
	executeTask(task);
	executeTask(task1);
	executeTask(task2);
}

function commandSetCurrentBase(IBCollection) {
	let wsfolders = vscode.workspace.workspaceFolders;
	if (wsfolders.length > 1) {
		let wsname = [];
		wsfolders.forEach(ws => { wsname.push(ws.uri.fsPath.replace(FS_REGEX, '/')); });
		vscode.window.showQuickPick(wsname).then(scopePath => {
			setCurrentDatabase(IBCollection.name, scopePath);
		});
	} else {
		setCurrentDatabase(IBCollection.name, wsfolders[0].uri.fsPath.replace(FS_REGEX, '/'));
	}
}

function commandexec(scopePath, entrypoint, dbname = '') {
	let config = vscode.workspace.getConfiguration('PieVscodeExt');
	let scope = getwsfolders(scopePath);
	let originEnv = getEnvData(scopePath).toString();

	if (dbname) {
		execTaskScope(dbname)
	} else {
		let ibs = getIBCollectionAll();
		let namesib = []
		ibs.forEach(ib => { namesib.push(ib.name) })
		vscode.window.showQuickPick(namesib).then(name => {
			execTaskScope(name)
		});
	}

	function execTaskScope(name) {
		if (name) {
			setCurrentDatabase(name, scopePath)
		}

		if (entrypoint == "load" && config.platformForOpenPath) {
			setCurrentPlatform(config.platformForOpenPath, scopePath)
		};

		if (entrypoint != "load" && config.platformForDumpPath) {
			setCurrentPlatform(config.platformForDumpPath, scopePath)
		};

		let task = new vscode.Task(
			{
				type: 'pie',
				task: entrypoint,
				options: { cwd: scopePath }
			},
			scope,
			'pie ' + entrypoint,
			'pie',
			new vscode.ShellExecution('pie ' + entrypoint)
		);
		vscode.tasks.executeTask(task);
		vscode.tasks.onDidEndTaskProcess(e => {
			writeFileGitCurrentBranch(e.execution.task.name, scopePath);
			setEnvData(scopePath, originEnv);
		});
	}

	function getwsfolders(scopePath) {
		for (let ws in vscode.workspace.workspaceFolders) {
			if (vscode.workspace.workspaceFolders[ws].uri.fsPath.replace(FS_REGEX, "/") === scopePath) {
				return vscode.workspace.workspaceFolders[ws];
			}
		};
	}
};

async function executeTask(task) {
	await vscode.tasks.executeTask(task);

	return new Promise(resolve => {
		let disposable = vscode.tasks.onDidEndTask(e => {
			disposable.dispose();
			resolve();
		});
	});
}

function writeFileGitCurrentBranch(commandName, scopePath) {

	let catalog = '';

	if (commandName === 'pie build') {
		catalog = 'build';
	} else if (commandName === 'pie build_at') {
		catalog = path.join('build', 'tests');
	} else {
		return;
	};

	const exe_command = ''.concat('git -C ', scopePath, ' branch --show-current');

	const branchName = require("child_process").execSync(exe_command).toString().replace(/\n/g, '').trim();

	const fileName = ''.concat(branchName, '.txt');
	const pathToFile = path.join(scopePath, catalog, fileName);

	fs.writeFile(pathToFile, "", (err) => {
		if (err) {
			vscode.window.showInformationMessage(err.message);
		};
	});
}

function pathExists(p) {
	try {
		fs.accessSync(p);
	} catch (err) {
		return false;
	}

	return true;
}

function setCurrentDatabase(name, scopePath) {

	const pathenv = path.join(scopePath, '.env');

	if (!pathExists(pathenv)) {
		fs.writeFileSync(pathenv, "")
	}

	let parsedFile = envfile.parse(fs.readFileSync(pathenv).toString());
	parsedFile.PIE_IB_NAME = name;
	fs.writeFileSync(pathenv, envfile.stringify(parsedFile))
}

function setCurrentPlatform(platformPath, scopePath) {

	const pathenv = path.join(scopePath, '.env');

	if (!pathExists(pathenv)) {
		fs.writeFileSync(pathenv, "")
	}

	let parsedFile = envfile.parse(fs.readFileSync(pathenv).toString());
	parsedFile.PIE_V83_BIN = platformPath;
	fs.writeFileSync(pathenv, envfile.stringify(parsedFile))
}

function getEnvData(scopePath) {

	const pathenv = path.join(scopePath, '.env');

	if (!pathExists(pathenv)) {
		fs.writeFileSync(pathenv, "")
	}

	return fs.readFileSync(pathenv)
}

function setEnvData(scopePath, EnvData) {

	const pathenv = path.join(scopePath, '.env');

	if (!pathExists(pathenv)) {
		fs.writeFileSync(pathenv, "")
	}

	fs.writeFileSync(pathenv, EnvData)
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
};


function getIBCollection(folder) {
	const toIB = (name, ib) => {
		if (!ib.Connect) {
			return new IBCollection(name, ib.Folder, "", vscode.TreeItemCollapsibleState.Collapsed, ib.Connect);
		} else {
			return new IBCollection(name, ib.Folder, ib.Connect, vscode.TreeItemCollapsibleState.None, ib.Connect)
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

function getIBCollectionAll() {
	const toIB = (name, ib) => {
		if (!ib.Connect) {
			return new IBCollection(name, ib.Folder, "", vscode.TreeItemCollapsibleState.Collapsed, ib.Connect);
		} else {
			return new IBCollection(name, ib.Folder, ib.Connect, vscode.TreeItemCollapsibleState.None, ib.Connect)
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

	let filterbase = CollectionOfIB2.filter(ib => { return ib.Connect !== "" });

	return filterbase;
}

async function fetchContent(version) {
	const toContent = (name, description, url, filename) => {
		return new ModuleCollection(name, description, vscode.TreeItemCollapsibleState.None, url, filename)
	};
	let config = vscode.workspace.getConfiguration('PieVscodeExt')
	let url = config.UrlUpdateService + "/" + version;
	let promise = new Promise((resolve, reject) => {
		let data = "";
		https.get(url, res => {
			res.on('data', chunk => { data += chunk })
			res.on('end', () => {
				let result = JSON.parse(data);
				let contentList = []
				for (let key in result.content) {
					if (result.content.hasOwnProperty(key)) {
						let el = result.content[key]
						let contenttype = el.content_type
						let md5hash = el.md5hash
						let url_m = el.url
						let filename = el.filename
						let modulecontent = toContent(contenttype, md5hash, url_m, filename)
						contentList.push(modulecontent)
					}
				}
				resolve(contentList);
			})
		})
	});

	let result = await promise; // wait until the promise resolves
	return result
};

async function fetchModules() {
	const toModule = (name, description) => {
		return new ModuleCollection(name, description, vscode.TreeItemCollapsibleState.Collapsed, "", "")
	};
	let config = vscode.workspace.getConfiguration('PieVscodeExt')
	let url = config.UrlUpdateService;
	let promise = new Promise((resolve, reject) => {
		let data = "";
		https.get(url, res => {
			res.on('data', chunk => { data += chunk })
			res.on('end', () => {
				let result = JSON.parse(data);
				let moduleList = []
				result.versions.forEach(module => {
					moduleList.push(toModule(module.version, module.description))
				})
				moduleList.reverse()
				resolve(moduleList);
			})
		})
	});

	let result = await promise; // wait until the promise resolves
	return result
};

async function downloadModule(url) {
	let promise = new Promise((resolve, reject) => {
		let data = [];
		https.get(url, res => {
			res.on('data', chunk => { data.push(chunk) })
			res.on('end', () => {
				resolve(Buffer.concat(data));
			})
		})
	});

	let result = await promise; // wait until the promise resolves
	return result
};

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
				getIBCollection(String(element.path + '/').replace(/\/\//g, '/') + element.name)
			);
		} else {
			return Promise.resolve(
				getIBCollection('/')
			);
		};
	}
}
exports.CollectionOfIB = CollectionOfIB;
class CollectionOfModules {
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
				this.getModuleContents(element.name)
			);
		} else {
			return Promise.resolve(
				this.getModuleCollection()
			);
		};
	}

	getModuleCollection() {
		return fetchModules()
	}

	getModuleContents(version) {
		return fetchContent(version)
	}
}
exports.CollectionOfModules = CollectionOfModules;
class IBCollection extends vscode.TreeItem {
	constructor(name, path, description, collapsibleState, Connect) {
		super(name, collapsibleState);
		this.name = name;
		this.path = path;
		this.tooltip = `${this.name}`;
		this.description = description;
		this.Connect = Connect;
		this.collapsibleState = collapsibleState;
	}
}

class ModuleCollection extends vscode.TreeItem {
	constructor(name, description, collapsibleState, url, filename) {
		super(name, collapsibleState);
		this.name = name;
		this.url = url;
		this.filename = filename;
		this.tooltip = `${this.name}`;
		this.description = description;
		this.collapsibleState = collapsibleState;
	}
}
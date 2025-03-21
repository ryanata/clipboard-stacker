import path from 'path';
import * as vscode from 'vscode';

let buffer = '';
let itemCount = 0;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Create status bar item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	context.subscriptions.push(statusBarItem);

	function updateStatusBar() {
		statusBarItem.text = itemCount === 0 ? '🪣 Empty' : `🪣 ${itemCount} items`;
		statusBarItem.command = 'clipboard-stacker.clearBuffer';
		statusBarItem.show();
	}

	updateStatusBar();

	context.subscriptions.push(vscode.commands.registerCommand('clipboard-stacker.addFileToBuffer', async () => {
		try {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				vscode.window.showWarningMessage('No workspace folder is open.');
				return;
			}

			// Create a QuickPick instance
			const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
			quickPick.canSelectMany = true;
			quickPick.placeholder = 'Type to search for files...';
			quickPick.title = "Select File for Buffer (Space to add)";
			quickPick.matchOnDescription = true; // Match on file path as well

			// --- Populate the QuickPick ---
			const items = await getFileQuickPickItems(workspaceFolders); // Get the file items, we have to define this function (see below)
			quickPick.items = items;


			// --- Handle Selection ---
			quickPick.onDidAccept(async () => {
				const selectedItems = quickPick.selectedItems;
				if (selectedItems.length === 0) {
					vscode.window.showWarningMessage('No files selected');
					quickPick.dispose();
					return;
				}

				const entries: string[] = [];
				for (const selectedItem of selectedItems) {
					const filePath = selectedItem.description;
					if (!filePath) {
						vscode.window.showErrorMessage("No file path available for a selected item");
						continue;
					}
					const workspaceRoot = workspaceFolders[0].uri.fsPath;
					const fullPath = path.join(workspaceRoot, filePath);
					const uri = vscode.Uri.file(fullPath);
					try {
						const fileData = await vscode.workspace.fs.readFile(uri);
						const content = Buffer.from(fileData).toString('utf-8');
						const entry = `\`\`\`${filePath}\n${content}\n\`\`\``;
						entries.push(entry);
					} catch (error) {
						vscode.window.showErrorMessage(`Failed to read ${filePath}: ${error instanceof Error ? error.message : error}`);
					}
				}

				if (entries.length > 0) {
					buffer = buffer ? buffer + '\n\n' + entries.join('\n\n') : entries.join('\n\n');
					await vscode.env.clipboard.writeText(buffer);
					vscode.window.showInformationMessage(`Added ${entries.length} files to clipboard buffer`);
					itemCount += entries.length;
				}
				updateStatusBar();

				quickPick.dispose();
			});

			quickPick.onDidHide(() => quickPick.dispose()); // Dispose if user cancels

			quickPick.show(); // Show the QuickPick

			(quickPick as any)._onDidKeyDown = (key: string) => {
				console.log(key);
			};

		} catch (error) {
			vscode.window.showErrorMessage(`Failed to add file to buffer: ${error instanceof Error ? error.message : error}`);
		}
	}));

	vscode.commands.registerCommand('clipboard-stacker.addToBuffer', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor?.selection && !editor.selection.isEmpty) {
			const selection = editor.selection;
			const startLine = selection.start.line + 1; // VS Code lines are 0-based
			const endLine = selection.end.line + 1;
			const filePath = vscode.workspace.asRelativePath(editor.document.uri, false); // false prevents './' prefix
			const text = editor.document.getText(selection);

			const entry = `\`\`\`${startLine}:${endLine}:${filePath}\n${text}\n\`\`\``;
			buffer = buffer ? buffer + '\n\n' + entry : entry;
			await vscode.env.clipboard.writeText(buffer);
			vscode.window.showInformationMessage('Added selection to clipboard buffer');
			itemCount += 1;
			updateStatusBar();
		}
	}),

		vscode.commands.registerCommand('clipboard-stacker.clearBuffer', async () => {
			if (buffer) {
				const choice = await vscode.window.showWarningMessage(
					'Are you sure you want to clear the clipboard buffer?',
					{ modal: true },
					'Clear',
					'Cancel'
				);
				if (choice === 'Clear') {
					buffer = '';
					itemCount = 0;
					updateStatusBar();
					vscode.window.showInformationMessage('Clipboard buffer cleared');
				}
			} else {
				vscode.window.showWarningMessage('Clipboard buffer is already empty');
			}
		});
}

async function getFileQuickPickItems(workspaceFolders: readonly vscode.WorkspaceFolder[]): Promise<vscode.QuickPickItem[]> {
    const items: vscode.QuickPickItem[] = [];

    // Get the Git extension API, if available
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    const git = gitExtension?.getAPI(1);

    for (const folder of workspaceFolders) {
        let files: vscode.Uri[];
        let repo;

        // If Git is available, try to locate a repository for the folder.
        if (git) {
            repo = git.repositories.find((r: any) => folder.uri.fsPath.startsWith(r.rootUri.fsPath));
        }

        if (repo) {
            // When a Git repository is found, retrieve all files and later filter out gitignored files.
            files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*'));
        } else {
            // No Git repository available: mimic VS Code’s Quick Open behavior
            // Exclude common folders like node_modules and .git.
            const excludePattern = '**/{node_modules,.git}';
            files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*'), excludePattern);
        }

        // If using Git, check which files are ignored.
        let ignoredFiles: string[] = [];
        if (repo) {
            ignoredFiles = await repo.checkIgnore(files.map(f => f.fsPath));
        }

        // Process each file: if Git filtering is in place, skip ignored files.
        for (const fileUri of files) {
            if (repo && ignoredFiles.includes(fileUri.fsPath)) {
                continue;
            }
            const relativePath = vscode.workspace.asRelativePath(fileUri.fsPath, false);
            items.push({
                label: path.basename(fileUri.fsPath),
                description: relativePath,
            });
        }
    }

    return items;
}

// This method is called when your extension is deactivated
export function deactivate() { }

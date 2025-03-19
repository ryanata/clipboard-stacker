import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Clipboard Stacker Debug');
let buffer = '';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "clipboard-stacker" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('clipboard-stacker.addFileToBuffer', async () => {
		try {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				vscode.window.showWarningMessage('No workspace folder is open.');
				return;
			}

			// Create a QuickPick instance
			const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
			quickPick.placeholder = 'Type to search for files...';
			quickPick.title = "Select File for Buffer (Cmd+C to add)";
			quickPick.matchOnDescription = true; // Match on file path as well
			quickPick.matchOnDetail = true;     // and detail (though we won't use detail much)

			// --- Populate the QuickPick ---
			const items = await getFileQuickPickItems(workspaceFolders); // Get the file items, we have to define this function (see below)
			quickPick.items = items;

			// --- Handle Selection ---
			quickPick.onDidAccept(async () => {
				const selectedItem = quickPick.selectedItems[0];
				if (selectedItem) {
					const filePath = selectedItem.description;
					if (!filePath) {
						vscode.window.showErrorMessage("No file path available");
						return;
					}
					const uri = vscode.Uri.file(filePath);
					const fileData = await vscode.workspace.fs.readFile(uri);
					const content = Buffer.from(fileData).toString('utf-8');
					const entry = `\`\`\`${filePath}\n${content}\n\`\`\``;
					// const buffer = await vscode.env.clipboard.readText(); // read in buffer to append
					let buffer = '' // initialize clipboard buffer
					buffer = buffer ? buffer + '\n\n' + entry : entry;
					await vscode.env.clipboard.writeText(entry); //write only the entry, not the buffer
					vscode.window.showInformationMessage(`Added ${filePath} to clipboard buffer`);
				}
				quickPick.dispose(); // IMPORTANT: Dispose the QuickPick after use.
			});

			quickPick.onDidHide(() => quickPick.dispose()); // Dispose if user cancels

			quickPick.show(); // Show the QuickPick

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
		}
	}),

	vscode.commands.registerCommand('clipboard-stacker.clearBuffer', () => {
		if (buffer) {
			buffer = '';
			vscode.window.showInformationMessage('Clipboard buffer cleared');
		} else {
			vscode.window.showWarningMessage('Clipboard buffer is already empty');
		}
	});
}

async function getFileQuickPickItems(workspaceFolders: readonly vscode.WorkspaceFolder[]): Promise<vscode.QuickPickItem[]> {
    const items: vscode.QuickPickItem[] = [];

    for (const folder of workspaceFolders) {
        const folderPath = folder.uri.fsPath;
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*')); // Find all files within each workspace folder

        for (const fileUri of files) {
			const relativePath = vscode.workspace.asRelativePath(fileUri.fsPath, false);
			const label = relativePath;
			const description = fileUri.fsPath; // add full file path to be the description

            items.push({
                label: label,
                description: description,
                // detail: you can add more detail such as file size using fs.stat if needed
            });
        }
    }

    return items;
}

// This method is called when your extension is deactivated
export function deactivate() { }

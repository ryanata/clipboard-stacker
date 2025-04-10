import path from 'path';
import * as vscode from 'vscode';
const ignore = require('ignore'); // Assuming 'ignore' is packaged

let bufferItems: string[] = [];

// --- Helper Function ---
function getSnippetLabel(snippet: string): string {
    const match = snippet.match(/^```(.*)\n/);
    const label = match ? match[1].trim() : 'Snippet';
    const maxLength = 70;
    return label.length > maxLength ? label.substring(0, maxLength - 3) + '...' : label;
}

export function activate(context: vscode.ExtensionContext) {
    // --- Status Bar Setup ---
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.tooltip = 'Clipboard Stacker Actions';
    context.subscriptions.push(statusBarItem);

    // --- Update Status Bar ---
    function updateStatusBar() {
        const itemCount = bufferItems.length;
        if (itemCount === 0) {
            statusBarItem.text = '🪣 Empty';
            statusBarItem.command = undefined;
        } else {
            statusBarItem.text = `🪣 ${itemCount} item${itemCount > 1 ? 's' : ''}`;
            statusBarItem.command = 'clipboard-stacker.showBufferActions';
        }
        statusBarItem.show();
    }

    // --- Core Commands (addToBuffer, addFileToBuffer) ---
    // Unchanged
    // ... (paste the unchanged addToBuffer, addFileToBuffer commands here) ...
    // Command to Add Selected Text
    context.subscriptions.push(vscode.commands.registerCommand('clipboard-stacker.addToBuffer', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor?.selection && !editor.selection.isEmpty) {
            const selection = editor.selection;
            const startLine = selection.start.line + 1;
            const endLine = selection.end.line + 1;
            const filePath = vscode.workspace.asRelativePath(editor.document.uri, false);
            const text = editor.document.getText(selection);

            const entry = `\`\`\`${filePath}#L${startLine}-L${endLine}\n${text}\n\`\`\``;
            bufferItems.push(entry); // Add to array
            await vscode.env.clipboard.writeText(bufferItems.join('\n\n')); // Update clipboard
            // vscode.window.showInformationMessage('Added selection to clipboard buffer'); // Optional: Can keep/remove info message
            updateStatusBar();
        } else {
            vscode.window.showWarningMessage('No text selected to add to buffer.');
        }
    }));

    // Command to Add Full File(s)
    context.subscriptions.push(vscode.commands.registerCommand('clipboard-stacker.addFileToBuffer', async () => {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showWarningMessage('No workspace folder is open.');
                return;
            }

            const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
            quickPick.canSelectMany = true;
            quickPick.placeholder = 'Type to search for files...';
            quickPick.title = "Select File(s) for Buffer (Space to select/deselect)";
            quickPick.matchOnDescription = true;

            const items = await getFileQuickPickItems(workspaceFolders);
            quickPick.items = items;

            quickPick.onDidAccept(async () => {
                const selectedItems = quickPick.selectedItems;
                if (selectedItems.length === 0) {
                    quickPick.hide();
                    return;
                }

                let addedCount = 0;
                for (const selectedItem of selectedItems) {
                    const relativeFilePath = selectedItem.description;
                    if (!relativeFilePath) continue;

                    let fileUri: vscode.Uri | undefined;
                     for(const folder of workspaceFolders) {
                        const potentialUri = vscode.Uri.joinPath(folder.uri, relativeFilePath);
                        fileUri = potentialUri;
                        break;
                    }

                    if (!fileUri) continue;

                    try {
                        const fileData = await vscode.workspace.fs.readFile(fileUri);
                        const content = Buffer.from(fileData).toString('utf-8');
                        const entry = `\`\`\`${relativeFilePath}\n${content}\n\`\`\``;
                        bufferItems.push(entry); // Add individual entry to array
                        addedCount++;
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to read ${relativeFilePath}: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }

                if (addedCount > 0) {
                    await vscode.env.clipboard.writeText(bufferItems.join('\n\n')); // Update clipboard
                    // vscode.window.showInformationMessage(`Added ${addedCount} file(s) to clipboard buffer`); // Optional
                }
                updateStatusBar();
                quickPick.hide();
            });

            quickPick.onDidHide(() => quickPick.dispose());
            quickPick.show();

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add file to buffer: ${error instanceof Error ? error.message : String(error)}`);
        }
    }));


    // --- Command to Clear the Buffer (NO WARNING) ---
    context.subscriptions.push(vscode.commands.registerCommand('clipboard-stacker.clearBuffer', async () => {
        if (bufferItems.length === 0) {
            // Keep this warning as it's informational, not confirmation
            vscode.window.showWarningMessage('Clipboard buffer is already empty');
            return;
        }

        bufferItems = []; // Clear the array directly
        updateStatusBar();
    }));

    // --- Status Bar Action Commands (showBufferActions, copyBuffer) ---
    // Unchanged
    // ... (paste the unchanged showBufferActions, copyBuffer commands here) ...
    // Command: Show Quick Pick actions for the buffer
    context.subscriptions.push(vscode.commands.registerCommand('clipboard-stacker.showBufferActions', async () => {
        if (bufferItems.length === 0) {
            vscode.window.showInformationMessage('Clipboard buffer is empty.');
            return;
        }

        const items: (vscode.QuickPickItem & { command?: string })[] = [
            { label: '📋 Copy Buffer', description: `Copy all ${bufferItems.length} items`, command: 'clipboard-stacker.copyBuffer' },
            { label: '🗑️ Delete Buffer Items', description: 'Remove items (Enter or click icon)', command: 'clipboard-stacker.manageBuffer' }, // Updated desc
            { label: '💥 Clear Buffer', description: 'Discard all items (no warning)', command: 'clipboard-stacker.clearBuffer' }, // Updated desc
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select an action for the clipboard buffer',
        });

        if (selected && selected.command) {
            vscode.commands.executeCommand(selected.command);
        }
    }));

    // Command: Copy buffer (joins array)
    context.subscriptions.push(vscode.commands.registerCommand('clipboard-stacker.copyBuffer', async () => {
        if (bufferItems.length === 0) {
            vscode.window.showWarningMessage('Buffer is empty, nothing to copy.');
            return;
        }
        const combinedBuffer = bufferItems.join('\n\n'); // Join items for clipboard
        await vscode.env.clipboard.writeText(combinedBuffer);
        // vscode.window.showInformationMessage('Buffer content copied to clipboard.'); // Optional
    }));


    // --- UPDATED Command: Manage Buffer Items (Delete on Enter or Icon Click, NO WARNING) ---
    context.subscriptions.push(vscode.commands.registerCommand('clipboard-stacker.manageBuffer', async () => {
        if (bufferItems.length === 0) {
            vscode.window.showInformationMessage('Buffer is empty, nothing to delete.');
            return;
        }

        let cancelled = false;
        while (!cancelled && bufferItems.length > 0) {
            const quickPickItems = bufferItems.map((item, index) => ({
                label: ` ${index + 1}: ${getSnippetLabel(item)}`,
                description: `(${item.split('\n').length - 2} lines)`,
                originalIndex: index, // Keep track of the original index
                buttons: [
                    {
                        iconPath: new vscode.ThemeIcon('trash'),
                        tooltip: 'Delete Item (Click Icon)'
                    }
                ],
            }));

            const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { originalIndex: number }>();
            quickPick.items = quickPickItems;
            quickPick.title = 'Delete Buffer Items';
            quickPick.placeholder = 'Press Enter or click $(trash) icon to delete an item'; // Updated placeholder
            quickPick.canSelectMany = false;
            quickPick.ignoreFocusOut = true;

            const choice = await new Promise<'DELETED' | undefined>(resolve => {

                // --- Handler for Deleting via Enter Key ---
                quickPick.onDidAccept(() => {
                    if (quickPick.selectedItems.length > 0) {
                        const itemToDelete = quickPick.selectedItems[0];
                        const indexToDelete = itemToDelete.originalIndex;

                        // --- Delete directly, NO WARNING ---
                        bufferItems.splice(indexToDelete, 1); // Remove from array
                        vscode.env.clipboard.writeText(bufferItems.join('\n\n')); // Update clipboard async (don't wait)
                        updateStatusBar();
                        // vscode.window.showInformationMessage('Item deleted.'); // Optional

                        resolve("DELETED"); // Signal deletion happened, loop continues
                    }
                    // If nothing selected, pressing Enter does nothing, promise doesn't resolve yet
                });

                // --- Handler for Deleting via Trash Icon Click ---
                quickPick.onDidTriggerItemButton((e) => {
                    const itemToDelete = e.item;
                    const indexToDelete = itemToDelete.originalIndex;

                    // --- Delete directly, NO WARNING ---
                    bufferItems.splice(indexToDelete, 1); // Remove from array
                    vscode.env.clipboard.writeText(bufferItems.join('\n\n')); // Update clipboard async (don't wait)
                    updateStatusBar();
                    // vscode.window.showInformationMessage('Item deleted.'); // Optional

                    resolve("DELETED"); // Signal deletion happened, loop continues
                });

                // --- Handler for Cancellation ---
                quickPick.onDidHide(() => resolve(undefined));

                quickPick.show();
            });

            quickPick.dispose(); // Clean up the QuickPick UI element

            if (choice === 'DELETED') {
                // If an item was deleted, the loop continues (or exits if buffer empty)
                continue;
            } else {
                // If choice is undefined (user cancelled via Esc/hide), break the loop
                cancelled = true;
            }
        } // End while loop
    }));

    // --- Initial Setup ---
    updateStatusBar();
}

// --- File Picker Helper (getFileQuickPickItems) ---
// Unchanged
// ... (paste the unchanged getFileQuickPickItems function here) ...
async function getFileQuickPickItems(workspaceFolders: readonly vscode.WorkspaceFolder[]): Promise<vscode.QuickPickItem[]> {
    const items: vscode.QuickPickItem[] = [];
    // const ignore = require('ignore'); // At top

    for (const folder of workspaceFolders) {
        const folderPath = folder.uri.fsPath;
        const gitignorePath = path.join(folderPath, '.gitignore');
        let gitignoreContent = '';
        try {
            const gitignoreUri = vscode.Uri.file(gitignorePath);
            gitignoreContent = await vscode.workspace.fs.readFile(gitignoreUri)
                .then(content => Buffer.from(content).toString('utf-8'));
        } catch (error) { } // Ignore if not found

        const ig = ignore().add(gitignoreContent);
        ig.add(['.git', 'node_modules', '**/node_modules/**', '**/.git/**']);

        const pattern = new vscode.RelativePattern(folder, '**/*');
        // Exclude node_modules and .git using the exclude pattern
        const files = await vscode.workspace.findFiles(pattern, '{**/node_modules/**,**/.git/**}');

        const filteredFiles = files.filter(fileUri => {
            const relativePath = path.relative(folderPath, fileUri.fsPath);
            const posixPath = relativePath.split(path.sep).join(path.posix.sep);
            return !ig.ignores(posixPath);
        });

        for (const fileUri of filteredFiles) {
            const relativePath = path.relative(folderPath, fileUri.fsPath);
            const displayPath = relativePath.split(path.sep).join(path.posix.sep);
            items.push({
                label: path.basename(fileUri.fsPath),
                // *** Store the relative path in description for retrieval ***
                description: displayPath,
            });
        }
    }
    items.sort((a, b) => a.label.localeCompare(b.label));
    return items;
}


// --- Deactivation ---
export function deactivate() {
    bufferItems = [];
}
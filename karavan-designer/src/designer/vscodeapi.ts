// Karavan-designer is copied into karavan-vscode during build. vscode api is already acquired in karavan-vscode.
// using this trick, we are accessing the vscode api here in karavan-designer.
//TODO: find out how the project is writing/reading files.
//@ts-ignore
import vscode from '../vscode';
export default vscode; 
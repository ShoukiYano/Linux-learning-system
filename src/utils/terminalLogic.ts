import { FileSystemNode } from '../types';

// Helper to traverse the FS
export const resolvePath = (fs: FileSystemNode, cwd: string, targetPath: string): FileSystemNode | null => {
  if (targetPath === '/') return fs;
  
  let searchParts: string[] = [];
  
  // If absolute path, start from root
  if (targetPath.startsWith('/')) {
    searchParts = targetPath.split('/').filter(p => p);
  } else {
    // Relative path: start from current working directory
    if (cwd !== '/') {
      searchParts = cwd.split('/').filter(p => p);
    }
    
    // Process relative path components
    const relativeParts = targetPath.split('/').filter(p => p);
    for (const part of relativeParts) {
      if (part === '..') {
        searchParts.pop();
      } else if (part !== '.') {
        searchParts.push(part);
      }
    }
  }

  // Traverse from root
  let current = fs;
  for (const part of searchParts) {
    if (current.children && current.children[part]) {
      current = current.children[part];
    } else {
      return null;
    }
  }
  return current;
};

export const formatPermissions = (node: FileSystemNode) => node.permissions || (node.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--');

export const normalizePath = (cwd: string, relativePath: string): string => {
  if (relativePath.startsWith('/')) {
    return relativePath;
  }
  
  let parts = cwd === '/' ? [] : cwd.split('/').filter(p => p);
  const relativeParts = relativePath.split('/').filter(p => p);
  
  for (const part of relativeParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }
  
  return '/' + parts.join('/');
};

export const executeCommand = (
  cmd: string, 
  args: string[], 
  fs: FileSystemNode, 
  cwd: string,
  setFs: (fs: FileSystemNode) => void,
  setCwd: (cwd: string) => void
): string => {
  
  // Helper to separate options from arguments
  const parseArgs = (inputArgs: string[]) => {
    const options = inputArgs.filter(arg => arg.startsWith('-'));
    const params = inputArgs.filter(arg => !arg.startsWith('-'));
    return { options, params };
  };
  
  switch (cmd) {
    case 'pwd':
      return cwd;
    
    case 'ls':
      const { options: lsOptions, params: lsParams } = parseArgs(args);
      const lsTargetPath = lsParams[0] || '.';
      const lsTargetNode = resolvePath(fs, cwd, lsTargetPath);
      if (!lsTargetNode) return `ls: cannot access '${lsTargetPath}': No such file or directory`;
      if (lsTargetNode.type === 'file') return lsTargetNode.name;
      
      if (!lsTargetNode.children) return '';
      
      const lsShowDetails = lsOptions.includes('-la') || lsOptions.includes('-l');
      
      return Object.values(lsTargetNode.children).map(child => {
        if (lsShowDetails) {
          return `${formatPermissions(child)} 1 user user 4096 Oct 25 10:00 ${child.name}`;
        }
        return child.name;
      }).join(lsShowDetails ? '\n' : '  ');

    case 'cd':
      const { params: cdParams } = parseArgs(args);
      if (!cdParams[0]) return '';
      const newDir = resolvePath(fs, cwd, cdParams[0]);
      if (!newDir) return `cd: ${cdParams[0]}: No such file or directory`;
      if (newDir.type !== 'directory') return `cd: ${cdParams[0]}: Not a directory`;
      
      const newPath = normalizePath(cwd, cdParams[0]);
      setCwd(newPath);
      return '';

    case 'mkdir':
      const { options: mkdirOptions, params: mkdirParams } = parseArgs(args);
      if (!mkdirParams[0]) return 'mkdir: missing operand';
      
      const mkdirCreateParents = mkdirOptions.includes('-p');
      const currentDirNode = resolvePath(fs, cwd, '.');
      if (currentDirNode && currentDirNode.children) {
        if (currentDirNode.children[mkdirParams[0]] && !mkdirCreateParents) {
          return `mkdir: cannot create directory '${mkdirParams[0]}': File exists`;
        }
        
        const newFs = JSON.parse(JSON.stringify(fs));
        const nodeToUpdate = resolvePath(newFs, cwd, '.');
        if (nodeToUpdate && nodeToUpdate.children) {
          if (!nodeToUpdate.children[mkdirParams[0]]) {
            nodeToUpdate.children[mkdirParams[0]] = {
              name: mkdirParams[0],
              type: 'directory',
              permissions: 'drwxr-xr-x',
              children: {}
            };
          }
          setFs(newFs);
        }
      }
      return '';

    case 'touch':
      const { params: touchParams } = parseArgs(args);
      if (!touchParams[0]) return 'touch: missing operand';
      
      const currDir = resolvePath(fs, cwd, '.');
      if (currDir && currDir.children) {
        const newFs = JSON.parse(JSON.stringify(fs));
        const nodeToUpdate = resolvePath(newFs, cwd, '.');
        if (nodeToUpdate && nodeToUpdate.children) {
          // Create multiple files if specified
          touchParams.forEach(filename => {
            nodeToUpdate.children![filename] = {
              name: filename,
              type: 'file',
              permissions: '-rw-r--r--',
              content: ''
            };
          });
          setFs(newFs);
        }
      }
      return '';

    case 'cat':
      const { params: catParams } = parseArgs(args);
      if (!catParams[0]) return 'cat: missing operand';
      
      const catNode = resolvePath(fs, cwd, catParams[0]);
      if (!catNode) return `cat: ${catParams[0]}: No such file or directory`;
      if (catNode.type === 'directory') return `cat: ${catParams[0]}: Is a directory`;
      return catNode.content || '';

    case 'rm':
      const { params: rmParams } = parseArgs(args);
      if (!rmParams[0]) return 'rm: missing operand';
      
      const rmCurrentDir = resolvePath(fs, cwd, '.');
      if (rmCurrentDir && rmCurrentDir.children && rmCurrentDir.children[rmParams[0]]) {
        const newFs = JSON.parse(JSON.stringify(fs));
        const nodeToUpdateRm = resolvePath(newFs, cwd, '.');
        if (nodeToUpdateRm && nodeToUpdateRm.children) {
          delete nodeToUpdateRm.children[rmParams[0]];
          setFs(newFs);
        }
      }
      return '';

    case 'cp':
      const { params: cpParams } = parseArgs(args);
      if (cpParams.length < 2) return 'cp: missing operand';
      
      const cpSourceNode = resolvePath(fs, cwd, cpParams[0]);
      if (!cpSourceNode) return `cp: cannot open '${cpParams[0]}' for reading: No such file or directory`;
      if (cpSourceNode.type === 'directory') return `cp: '${cpParams[0]}' is a directory (not copied)`;
      
      const cpCurrentDir = resolvePath(fs, cwd, '.');
      if (cpCurrentDir && cpCurrentDir.children) {
        const newFs = JSON.parse(JSON.stringify(fs));
        const nodeToUpdateCp = resolvePath(newFs, cwd, '.');
        if (nodeToUpdateCp && nodeToUpdateCp.children) {
          nodeToUpdateCp.children[cpParams[1]] = {
            name: cpParams[1],
            type: 'file',
            permissions: cpSourceNode.permissions || '-rw-r--r--',
            content: cpSourceNode.content || ''
          };
          setFs(newFs);
        }
      }
      return '';

    case 'mv':
      const { params: mvParams } = parseArgs(args);
      if (mvParams.length < 2) return 'mv: missing operand';
      
      const mvSourceNode = resolvePath(fs, cwd, mvParams[0]);
      if (!mvSourceNode) return `mv: cannot stat '${mvParams[0]}': No such file or directory`;
      
      const mvCurrentDir = resolvePath(fs, cwd, '.');
      if (mvCurrentDir && mvCurrentDir.children && mvCurrentDir.children[mvParams[0]]) {
        const newFs = JSON.parse(JSON.stringify(fs));
        const nodeToUpdateMv = resolvePath(newFs, cwd, '.');
        if (nodeToUpdateMv && nodeToUpdateMv.children) {
          const item = nodeToUpdateMv.children[mvParams[0]];
          delete nodeToUpdateMv.children[mvParams[0]];
          item.name = mvParams[1];
          nodeToUpdateMv.children[mvParams[1]] = item;
          setFs(newFs);
        }
      }
      return '';

    case 'grep':
      const { params: grepParams } = parseArgs(args);
      if (grepParams.length < 2) return 'grep: missing operand';
      
      const grepPattern = grepParams[0];
      const grepFilePath = grepParams[1];
      const grepFileNode = resolvePath(fs, cwd, grepFilePath);
      
      if (!grepFileNode) return `grep: ${grepFilePath}: No such file or directory`;
      if (grepFileNode.type === 'directory') return `grep: ${grepFilePath}: Is a directory`;
      
      const grepContent = grepFileNode.content || '';
      
      // Debug log
      console.log('grep search:', { grepPattern, grepFilePath, grepContent, cwd });
      
      const grepLines = grepContent.split('\n');
      
      // Search for lines containing the pattern (case-insensitive)
      const grepMatches: string[] = [];
      for (const line of grepLines) {
        if (line.toLowerCase().includes(grepPattern.toLowerCase())) {
          grepMatches.push(line);
        }
      }
      
      console.log('grep matches:', grepMatches);
      
      // Return all matching lines joined by newline
      if (grepMatches.length > 0) {
        return grepMatches.join('\n');
      }
      // If no matches, return a special marker that shows in terminal
      return '[no match found]';

    case 'find':
      const { params: findParams } = parseArgs(args);
      const findPath = findParams[0] || '.';
      const findName = findParams[findParams.indexOf('-name') + 1] || '*';
      
      const findNode = resolvePath(fs, cwd, findPath);
      if (!findNode) return `find: '${findPath}': No such file or directory`;
      
      const results: string[] = [];
      
      const traverse = (node: FileSystemNode, path: string) => {
        if (findName === '*' || node.name.includes(findName)) {
          results.push(path);
        }
        if (node.children) {
          Object.values(node.children).forEach(child => {
            traverse(child, path === '/' ? `/${child.name}` : `${path}/${child.name}`);
          });
        }
      };
      
      traverse(findNode, findPath === '.' ? cwd : findPath);
      return results.length > 0 ? results.join('\n') : '';

    case 'head':
      const { options: headOptions, params: headParams } = parseArgs(args);
      if (!headParams[0]) return 'head: missing operand';
      
      const headLines = 10; // Default 10 lines
      const headFile = resolvePath(fs, cwd, headParams[0]);
      if (!headFile) return `head: cannot open '${headParams[0]}': No such file or directory`;
      if (headFile.type === 'directory') return `head: ${headParams[0]}: Is a directory`;
      
      const headContent = (headFile.content || '').split('\n').slice(0, headLines).join('\n');
      return headContent;

    case 'tail':
      const { options: tailOptions, params: tailParams } = parseArgs(args);
      if (!tailParams[0]) return 'tail: missing operand';
      
      const tailLines = 10; // Default 10 lines
      const tailFile = resolvePath(fs, cwd, tailParams[0]);
      if (!tailFile) return `tail: cannot open '${tailParams[0]}': No such file or directory`;
      if (tailFile.type === 'directory') return `tail: ${tailParams[0]}: Is a directory`;
      
      const tailContent = (tailFile.content || '').split('\n').slice(-tailLines).join('\n');
      return tailContent;

    case 'chmod':
      const { params: chmodParams } = parseArgs(args);
      if (chmodParams.length < 2) return 'chmod: missing operand';
      
      const chmodNode = resolvePath(fs, cwd, chmodParams[1]);
      if (!chmodNode) return `chmod: cannot access '${chmodParams[1]}': No such file or directory`;
      
      const newFs = JSON.parse(JSON.stringify(fs));
      const chmodUpdateNode = resolvePath(newFs, cwd, chmodParams[1]);
      if (chmodUpdateNode) {
        chmodUpdateNode.permissions = chmodParams[0];
        setFs(newFs);
      }
      return '';

    case 'whoami':
      return 'student';

    case 'date':
      return new Date().toString();

    case 'wc':
      const { params: wcParams } = parseArgs(args);
      if (!wcParams[0]) return 'wc: missing operand';
      
      const wcFile = resolvePath(fs, cwd, wcParams[0]);
      if (!wcFile) return `wc: ${wcParams[0]}: No such file or directory`;
      if (wcFile.type === 'directory') return `wc: ${wcParams[0]}: Is a directory`;
      
      const wcContent = wcFile.content || '';
      const wcLines = wcContent.split('\n').length - (wcContent.endsWith('\n') ? 1 : 0);
      const wcWords = wcContent.split(/\s+/).filter(w => w).length;
      const wcChars = wcContent.length;
      
      return `  ${wcLines}  ${wcWords}  ${wcChars} ${wcParams[0]}`;

    case 'man':
      const { params: manParams } = parseArgs(args);
      const manualPages: { [key: string]: string } = {
        'ls': 'ls - list directory contents\nUSAGE: ls [OPTIONS] [FILE]...\nOPTIONS:\n  -l  long listing\n  -a  show all files\n  -la show long listing of all files',
        'cd': 'cd - change the working directory\nUSAGE: cd [DIR]',
        'grep': 'grep - search for patterns in files\nUSAGE: grep [OPTIONS] PATTERN [FILE]...',
        'find': 'find - search for files\nUSAGE: find [PATH] [-name PATTERN]',
        'cp': 'cp - copy files\nUSAGE: cp SOURCE DEST',
        'mv': 'mv - move or rename files\nUSAGE: mv SOURCE DEST',
        'rm': 'rm - remove files\nUSAGE: rm FILE...',
        'cat': 'cat - concatenate and display files\nUSAGE: cat [FILE]...',
        'chmod': 'chmod - change file permissions\nUSAGE: chmod MODE FILE',
      };
      
      if (!manParams[0]) return 'man: what manual page do you want?';
      const manual = manualPages[manParams[0]];
      return manual || `No manual entry for ${manParams[0]}`;

    case 'history':
      return 'Command history not yet implemented';

    case 'help':
      return `Available commands:

FILE OPERATIONS:
  ls [-la]               List directory contents
  cat <file>             Display file contents
  touch <file>           Create file
  rm <file>              Remove file
  cp <src> <dest>        Copy file
  mv <src> <dest>        Move or rename file
  grep <pattern> <file>  Search in files
  find <path> [-name]    Search for files

DIRECTORY OPERATIONS:
  cd <path>              Change directory
  pwd                    Print working directory
  mkdir [-p] <name>      Create directory

TEXT OPERATIONS:
  head <file>            Show first 10 lines
  tail <file>            Show last 10 lines
  wc <file>              Count lines, words, characters
  echo <text>            Print text

PERMISSIONS:
  chmod <mode> <file>    Change file permissions

SYSTEM:
  whoami                 Show current user
  date                   Show current date
  man <command>          Show manual page
  history                Show command history
  clear                  Clear terminal
  help                   Show this help`;

    default:
      return `${cmd}: command not found`;
  }
};

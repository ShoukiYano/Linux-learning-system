import { FileSystemNode, CommandHistory } from '../types';
export const HOME_DIR = '/home/student';

// Helper to traverse the FS
export const resolvePath = (fs: FileSystemNode, cwd: string, targetPath: string): FileSystemNode | null => {
  // Handle home directory expansion
  if (targetPath === '~' || targetPath.startsWith('~/')) {
    targetPath = HOME_DIR + targetPath.slice(1);
  }

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
  // Handle home directory expansion
  if (relativePath === '~' || relativePath.startsWith('~/')) {
    relativePath = HOME_DIR + relativePath.slice(1);
  }

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

// オプション解析ヘルパー（-la -> -l, -a のように展開）
const parseOptions = (options: string[]): Set<string> => {
  const flags = new Set<string>();
  options.forEach(opt => {
    if (opt.startsWith('--')) {
      flags.add(opt.slice(2));
    } else if (opt.startsWith('-')) {
      opt.slice(1).split('').forEach(char => flags.add(char));
    }
  });
  return flags;
};

// ディレクトリサイズ計算（再帰）
const calculateDirSize = (node: FileSystemNode): number => {
  if (node.type === 'file') return (node.content || '').length;
  if (!node.children) return 4096; // 空ディレクトリの基本サイズ
  
  let size = 4096;
  Object.values(node.children).forEach(child => {
    size += calculateDirSize(child);
  });
  return size;
};

// タイムスタンプのフォーマット (例: Oct 25 10:00)
export const formatTimestamp = (dateStr?: string): string => {
  // タイムスタンプが完全に欠けている場合は、デフォルトの「伝統的な日時」を表示
  const finalDateStr = dateStr || '2024-10-25T10:00:00Z';
  const date = new Date(finalDateStr);
  
  // パース失敗時の最終フォールバック
  if (isNaN(date.getTime())) return 'Oct 25 10:00'; 
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, ' ');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month} ${day} ${hours}:${minutes}`;
};

// ls -l の1行分をフォーマット
const formatLsLine = (node: FileSystemNode, opts: Set<string>): string => {
  const size = node.type === 'directory' ? 4096 : (node.content || '').length;
  const sizeStr = opts.has('h') 
    ? (size > 1024 ? `${(size/1024).toFixed(1)}K` : size) 
    : size;
  const ts = formatTimestamp(node.updatedAt);
  const indicator = opts.has('F') && node.type === 'directory' ? '/' : '';
  return `${formatPermissions(node)} 1 user user ${String(sizeStr).padStart(5)} ${ts} ${node.name}${indicator}`;
};

export interface CommandResult {
  output: string;
  newFs?: FileSystemNode;
  newCwd?: string;
  stdinContent?: string;
  isAsync?: boolean;
  asyncType?: 'zip' | 'unzip';
  asyncTargets?: string[];
}

// Helper to separate options from arguments
export const parseArgs = (inputArgs: string[]) => {
  const options = inputArgs.filter(arg => arg.startsWith('-') && arg.length > 1);
  const params = inputArgs.filter(arg => !arg.startsWith('-') || arg === '-');
  return { options, params };
};

export const executeCommand = (
  cmd: string, 
  args: string[], 
  fs: FileSystemNode, 
  cwd: string,
  stdin?: string,
  oldPwd?: string,
  history: CommandHistory[] = []
): CommandResult => {
  // --- Generic Redirection Handling ---
  let redirectTarget = '';
  let redirectAppend = false;
  
  // Custom parsing for redirection to handle cases like "ls > file" or "echo hello > file"
  // We need to look for > or >> in args
  const newArgs: string[] = [];
  let skipNext = false;

  for (let i = 0; i < args.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    const arg = args[i];
    if (arg === '>') {
      redirectAppend = false;
      if (args[i+1]) {
        redirectTarget = args[i+1];
        skipNext = true;
      }
    } else if (arg === '>>') {
      redirectAppend = true;
      if (args[i+1]) {
        redirectTarget = args[i+1];
        skipNext = true;
      }
    } else if (arg.startsWith('>>')) {
      redirectAppend = true;
      redirectTarget = arg.slice(2) || (args[i+1] ? args[i+1] : '');
      if (!arg.slice(2)) skipNext = true;
    } else if (arg.startsWith('>')) {
      redirectAppend = false;
      redirectTarget = arg.slice(1) || (args[i+1] ? args[i+1] : '');
      if (!arg.slice(1)) skipNext = true;
    } else {
      newArgs.push(arg);
    }
  }

  // Use newArgs for the actual command execution if redirection was found
  // Exception: echo might treat > as text if quoted, but tokenizeCommand handles quotes.
  // We assume tokenizeCommand has already split arguments correctly.
  const effectiveArgs = redirectTarget ? newArgs : args;

  // Helper to apply redirection to result
  const applyRedirection = (result: CommandResult): CommandResult => {
    if (!redirectTarget) return result;
    
    // Write output to file
    let currentFs = result.newFs || fs;
    let contentToWrite = result.output;
    
    if (redirectAppend) {
      const node = resolvePath(currentFs, result.newCwd || cwd, redirectTarget);
      const prevContent = (node && node.type === 'file') ? (node.content || '') : '';
      contentToWrite = prevContent + (prevContent && !prevContent.endsWith('\n') ? '\n' : '') + contentToWrite;
    }
    
    currentFs = writeFile(currentFs, result.newCwd || cwd, redirectTarget, contentToWrite, false);
    
    return {
      ...result,
      output: '', // checking output is consumed
      newFs: currentFs
    };
  };

  // Special case: just redirection like "> file" or ">> file" without a command
  if (cmd === '' && redirectTarget) {
      return applyRedirection({ output: '', newCwd: cwd });
  }

  // Wrap execution to capture output for redirection
  const executeCore = (): CommandResult => {
    const args = effectiveArgs;
    switch (cmd) {
    case 'pwd':
      return { output: cwd };
    
    case 'ls': {
      const { options: lsOptionsRaw, params: lsParams } = parseArgs(args);
      const opts = parseOptions(lsOptionsRaw);
      
      const lsTargets = lsParams.length > 0 ? lsParams : ['.'];
      const results: string[] = [];

      const listDir = (path: string, node: FileSystemNode, showHeader: boolean = false): string => {
        let output = '';
        if (showHeader) output += `${path}:\n`;

        if (node.type === 'file') {
          return opts.has('l') ? formatLsLine(node, opts) : node.name;
        }
        if (!node.children) return '';

        const items = Object.values(node.children).filter(child => 
          opts.has('a') || !child.name.startsWith('.')
        );

        if (opts.has('l')) {
          const lines = items.map(child => formatLsLine(child, opts));
          output += lines.join('\n');
        } else {
          output += items.map(i => {
            let name = i.name;
            if (opts.has('p') && i.type === 'directory') name += '/';
            else if (opts.has('F') && i.type === 'directory') name += '/';
            return name;
          }).join('  ');
        }

        if (opts.has('R')) {
          const dirs = items.filter(i => i.type === 'directory');
          dirs.forEach(dir => {
            output += '\n\n' + listDir(path === '/' ? `/${dir.name}` : `${path}/${dir.name}`, dir, true);
          });
        }
        return output;
      };

      for (const target of lsTargets) {
        const node = resolvePath(fs, cwd, target);
        if (!node) {
          results.push(`ls: cannot access '${target}': No such file or directory`);
          continue;
        }
        results.push(listDir(target, node, lsTargets.length > 1 || opts.has('R')));
      }
      return { output: results.join('\n') };
    }

    case 'file': {
      const { options: fileOptionsRaw, params: fileParams } = parseArgs(args);
      const opts = parseOptions(fileOptionsRaw);
      
      let targets = [...fileParams];
      
      // Support -f, --files-from
      if ((opts.has('f') || opts.has('files-from')) && targets.length > 0) {
        const listFile = targets.shift()!;
        const listNode = resolvePath(fs, cwd, listFile);
        if (listNode && listNode.type === 'file' && listNode.content) {
          const extraTargets = listNode.content.split('\n').map(l => l.trim()).filter(l => l);
          targets = [...extraTargets, ...targets];
        } else if (!listNode) {
          return { output: `file: cannot open '${listFile}' (No such file or directory)` };
        }
      }

      if (targets.length === 0) return { output: 'file: missing operand' };
      
      const results: string[] = [];
      const showName = !opts.has('b') && !opts.has('brief');
      const useMime = opts.has('i') || opts.has('mime');
      const noPad = opts.has('N') || opts.has('no-pad');
      const uncompress = opts.has('z') || opts.has('uncompress');

      // Calculate max length for padding (only if showing names and not suppressed)
      const maxLen = targets.length > 0 ? Math.max(...targets.map(t => t.length)) : 0;

      for (const target of targets) {
        const node = resolvePath(fs, cwd, target);
        if (!node) {
          results.push(`${target}: cannot open '${target}' (No such file or directory)`);
          continue;
        }

        let typeStr = '';
        const nameLower = node.name.toLowerCase();
        const isCompressed = nameLower.endsWith('.gz') || nameLower.endsWith('.tgz') || nameLower.endsWith('.zip') || nameLower.endsWith('.bz2');
        
        if (node.type === 'directory') {
          typeStr = useMime ? 'inode/directory; charset=binary' : 'directory';
        } else {
          const content = node.content || '';
          if (content.length === 0) {
            typeStr = useMime ? 'application/x-empty; charset=binary' : 'empty';
          } else if (content.startsWith('#!')) {
            typeStr = useMime ? 'text/x-shellscript; charset=us-ascii' : 'POSIX shell script, ASCII text executable';
          } else if (isCompressed) {
            if (uncompress) {
              typeStr = useMime ? 'application/x-compressed-content; charset=binary' : `compressed data, contents: (simulated data inside ${nameLower})`;
            } else {
              if (nameLower.endsWith('.zip')) {
                typeStr = useMime ? 'application/zip; charset=binary' : 'Zip archive data';
              } else if (nameLower.endsWith('.bz2')) {
                typeStr = useMime ? 'application/x-bzip2; charset=binary' : 'bzip2 compressed data';
              } else {
                typeStr = useMime ? 'application/gzip; charset=binary' : 'gzip compressed data';
              }
            }
          } else if (nameLower.endsWith('.tar')) {
            typeStr = useMime ? 'application/x-tar; charset=binary' : 'POSIX tar archive';
          } else {
            const isASCII = /^[\x00-\x7F]*$/.test(content);
            if (useMime) {
              typeStr = isASCII ? 'text/plain; charset=us-ascii' : 'application/octet-stream; charset=binary';
            } else {
              typeStr = isASCII ? 'ASCII text' : 'data';
            }
          }
        }
        
        if (showName) {
          const padding = noPad ? '' : ' '.repeat(maxLen - target.length);
          results.push(`${target}:${padding} ${typeStr}`);
        } else {
          results.push(typeStr);
        }
      }
      return { output: results.join('\n') };
    }

    case 'cd': {
      const { params: cdParams } = parseArgs(args);
      let targetDir = cdParams[0] || HOME_DIR;
      
      // Handle cd - (previous directory)
      if (targetDir === '-') {
        if (!oldPwd) return { output: 'bash: cd: OLDPWD not set' };
        // cd - prints the new directory path
        const result = { output: oldPwd, newCwd: oldPwd };
        return result;
      }

      const newDir = resolvePath(fs, cwd, targetDir);
      
      if (!newDir) return { output: `cd: ${targetDir}: No such file or directory` };
      if (newDir.type !== 'directory') return { output: `cd: ${targetDir}: Not a directory` };
      
      const newPath = normalizePath(cwd, targetDir);
      return { output: '', newCwd: newPath };
    }

    case 'mkdir': {
      const { options: mkdirOptionsRaw, params: mkdirParams } = parseArgs(args);
      const opts = parseOptions(mkdirOptionsRaw);
      
      if (mkdirParams.length === 0) return { output: 'mkdir: missing operand' };

      const newFs = JSON.parse(JSON.stringify(fs));
      let errorMsg = '';

      for (const dirPath of mkdirParams) {
        // Resolve parent path
        const parts = normalizePath(cwd, dirPath).split('/').filter(p => p);
        if (dirPath.startsWith('/')) {
             // Absolute
        }
        
        // Use a logic similar to writeFile's directory creation
        // If -p is specified, we create all parts.
        
        if (opts.has('p')) {
            let current = newFs;
            // Iterate all parts from root or cwd
            // To simplify, let's use the absolute path parts
            const absPath = normalizePath(cwd, dirPath); // returns prompt /a/b/c
            const absParts = absPath.split('/').filter(p => p);
            
            for (const part of absParts) {
                if (!current.children) current.children = {};
                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        type: 'directory',
                        permissions: 'drwxr-xr-x',
                        children: {},
                        updatedAt: new Date().toISOString()
                    };
                }
                current = current.children[part];
                if (current.type !== 'directory') {
                     errorMsg += `mkdir: cannot create directory '${dirPath}': Not a directory\n`;
                     break; 
                }
            }
        } else {
            // Normal mkdir (non-recursive)
            // Need to resolve parent manually
             const parts = dirPath.split('/').filter(p => p);
             const dirName = parts.pop() || '';
             const parentPath = dirPath.startsWith('/') ? '/' + parts.join('/') : parts.join('/') || '.';
             
             let parentNode = resolvePath(newFs, cwd, parentPath);
             
             if (parentNode && parentNode.children) {
                if (parentNode.children[dirName]) {
                  errorMsg += `mkdir: cannot create directory '${dirName}': File exists\n`;
                  continue;
                }
                parentNode.children[dirName] = {
                  name: dirName,
                  type: 'directory',
                  permissions: 'drwxr-xr-x',
                  children: {},
                  updatedAt: new Date().toISOString()
                };
             } else {
                errorMsg += `mkdir: cannot create directory '${dirPath}': No such file or directory\n`;
             }
        }
      }

      return { output: errorMsg.trim(), newFs };
    }

    case 'touch': {
      const { params: touchParams } = parseArgs(args);
      if (touchParams.length === 0) return { output: 'touch: missing operand' };
      
      const newFs = JSON.parse(JSON.stringify(fs));
      
      for (const filename of touchParams) {
        const parts = filename.split('/');
        const name = parts.pop()!;
        const dirPath = parts.length > 0 ? parts.join('/') : '.';
        
        const dirNode = resolvePath(newFs, cwd, dirPath);
        if (dirNode && dirNode.children) {
          if (!dirNode.children[name]) {
            dirNode.children[name] = {
              name: name,
              type: 'file',
              permissions: '-rw-r--r--',
              content: '',
              updatedAt: new Date().toISOString()
            };
          } else {
            // Update timestamp for existing file
            dirNode.children[name].updatedAt = new Date().toISOString();
          }
        }
      }
      return { output: '', newFs };
    }

    case 'cat': {
      const { options: catOptionsRaw, params: catParams } = parseArgs(args);
      const opts = parseOptions(catOptionsRaw);
      
      if (catParams.length === 0 && stdin === undefined) return { output: 'cat: missing operand' };
      
      let outStr = '';
      if (catParams.length === 0 && stdin !== undefined) {
          let content = stdin;
          if (opts.has('n')) {
            content = content.split('\n').map((line, i) => `${String(i + 1).padStart(6)}\t${line}`).join('\n');
          }
          outStr = content;
      } else {
          for (const file of catParams) {
            const node = resolvePath(fs, cwd, file);
            if (!node) {
              outStr += `cat: ${file}: No such file or directory\n`;
              continue;
            }
            if (node.type === 'directory') {
              outStr += `cat: ${file}: Is a directory\n`;
              continue;
            }
            
            let content = node.content || '';
            if (opts.has('n')) {
              content = content.split('\n').map((line, i) => `${String(i + 1).padStart(6)}\t${line}`).join('\n');
            }
            outStr += content + (catParams.length > 1 ? '\n' : '');
          }
      }
      return { output: outStr.trimEnd() };
    }

    case 'rm': {
      const { options: rmOptionsRaw, params: rmParams } = parseArgs(args);
      const opts = parseOptions(rmOptionsRaw);
      
      if (rmParams.length === 0) return { output: 'rm: missing operand' };
      
      const newFs = JSON.parse(JSON.stringify(fs));
      
      for (const target of rmParams) {
        const parts = normalizePath(cwd, target).split('/');
        const name = parts.pop()!;
        const parentPath = parts.join('/') || '/';
        
        const parentNode = resolvePath(newFs, '/', parentPath);
        
        if (parentNode && parentNode.children && parentNode.children[name]) {
          const targetNode = parentNode.children[name];
          if (targetNode.type === 'directory' && !opts.has('r') && !opts.has('R')) {
            return { output: `rm: cannot remove '${target}': Is a directory` };
          }
          delete parentNode.children[name];
        } else if (!opts.has('f')) {
          return { output: `rm: cannot remove '${target}': No such file or directory` };
        }
      }
      return { output: '', newFs };
    }

    case 'cp': {
      const { options: cpOptionsRaw, params: cpParams } = parseArgs(args);
      const opts = parseOptions(cpOptionsRaw);
      
      if (cpParams.length < 2) return { output: 'cp: missing operand' };
      
      const dest = cpParams.pop()!;
      const sources = cpParams;
      const newFs = JSON.parse(JSON.stringify(fs));
      
      const destNode = resolvePath(newFs, cwd, dest);
      const isDestDir = destNode?.type === 'directory';
      
      if (sources.length > 1 && !isDestDir) {
        return { output: `cp: target '${dest}' is not a directory` };
      }

      for (const src of sources) {
        const srcNode = resolvePath(newFs, cwd, src);
        if (!srcNode) return { output: `cp: cannot stat '${src}': No such file or directory` };
        
        if (srcNode.type === 'directory' && !opts.has('r') && !opts.has('R')) {
          return { output: `cp: -r not specified; omitting directory '${src}'` };
        }

        const copyNode = JSON.parse(JSON.stringify(srcNode));
        copyNode.updatedAt = new Date().toISOString();
        
        if (isDestDir) {
           if (destNode && destNode.children) {
             destNode.children[srcNode.name] = copyNode;
           }
        } else {
           const parentParts = dest.split('/');
           const newName = parentParts.pop()!;
           const parentPath = parentParts.length > 0 ? parentParts.join('/') : '.';
           const parentNode = resolvePath(newFs, cwd, parentPath);
           if (parentNode && parentNode.children) {
             copyNode.name = newName;
             parentNode.children[newName] = copyNode;
           }
        }
      }
      return { output: '', newFs };
    }

    case 'mv': {
      const { params: mvParams } = parseArgs(args);
      if (mvParams.length < 2) return { output: 'mv: missing operand' };
      
      const src = mvParams[0];
      const dest = mvParams[1];
      
      const srcNode = resolvePath(fs, cwd, src);
      if (!srcNode) return { output: `mv: cannot stat '${src}': No such file or directory` };
      
      const newFs = JSON.parse(JSON.stringify(fs));
      
      const srcParts = normalizePath(cwd, src).split('/');
      const srcName = srcParts.pop()!;
      const srcParentPath = srcParts.join('/') || '/';
      const srcParent = resolvePath(newFs, '/', srcParentPath);
      
      if (!srcParent || !srcParent.children) return { output: 'mv: error' };
      
      const nodeToMove = srcParent.children[srcName];
      delete srcParent.children[srcName];
      
      const destNode = resolvePath(newFs, cwd, dest);
      
      if (destNode && destNode.type === 'directory') {
        destNode.children![nodeToMove.name] = nodeToMove;
      } else {
        const destParts = normalizePath(cwd, dest).split('/');
        const destName = destParts.pop()!;
        const destParentPath = destParts.join('/') || '/';
        const destParent = resolvePath(newFs, '/', destParentPath);
        
        if (destParent && destParent.children) {
          nodeToMove.name = destName;
          destParent.children[destName] = nodeToMove;
        } else {
           return { output: `mv: cannot move to '${dest}': No such directory` };
        }
      }
      
      return { output: '', newFs };
    }

    case 'grep': {
      const { options: grepOptionsRaw, params: grepParams } = parseArgs(args);
      const opts = parseOptions(grepOptionsRaw);

      if (grepParams.length < 1 && stdin === undefined) return { output: 'grep: missing operand' };

      const pattern = grepParams[0];
      const targets = grepParams.slice(1);

      // ---------------------------
      // 数値系オプション（例: -m 3 / -m3 / -m=3）を拾う
      // ---------------------------
      const parseNumOpt = (key: string, rawList: string[]): number | null => {
        const search = `-${key}`;
        for (const raw of rawList) {
          if (raw === search) continue;
          if (raw.startsWith(search + '=')) {
            const v = Number(raw.split('=')[1]);
            return Number.isFinite(v) ? v : null;
          }
          if (raw.startsWith(search) && raw.length > search.length) {
            const v = Number(raw.slice(search.length));
            return Number.isFinite(v) ? v : null;
          }
        }
        return null;
      };

      const maxPerFile = parseNumOpt('m', grepOptionsRaw);
      const recursive = opts.has('r') || opts.has('R');

      // ---------------------------
      // マッチ判定（-i -v -w -x -o 対応）
      // ---------------------------
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const buildMatcher = () => {
        const ignoreCase = opts.has('i');
        const invert = opts.has('v');
        const isRegex = opts.has('E');

        const useRegex = isRegex || opts.has('x') || opts.has('w');

        if (!useRegex) {
          const pat = ignoreCase ? pattern.toLowerCase() : pattern;
          return {
            isMatchLine(line: string) {
              const s = ignoreCase ? line.toLowerCase() : line;
              const ok = s.includes(pat);
              return invert ? !ok : ok;
            },
            findMatches(line: string) {
              if (!opts.has('o')) return null;
              if (invert) return [];
              const s = ignoreCase ? line.toLowerCase() : line;
              const base = ignoreCase ? pat : pattern;
              
              const matches: string[] = [];
              let pos = 0;
              while (true) {
                const found = s.indexOf(base, pos);
                if (found === -1) break;
                matches.push(line.substring(found, found + base.length));
                pos = found + base.length;
              }
              return matches;
            }
          };
        }

        const reSrcBase = isRegex ? pattern : escapeRegExp(pattern);
        let reSrc = reSrcBase;
        if (opts.has('w')) reSrc = `\\b${reSrc}\\b`;
        if (opts.has('x')) reSrc = `^${reSrc}$`;

        const flags = ignoreCase ? 'gi' : 'g';
        const testFlags = ignoreCase ? 'i' : '';
        const re = new RegExp(reSrc, flags);
        const testRe = new RegExp(reSrc, testFlags);

        return {
          isMatchLine(line: string) {
            const ok = testRe.test(line);
            return invert ? !ok : ok;
          },
          findMatches(line: string) {
            if (!opts.has('o')) return null;
            if (invert) return [];
            return line.match(re) || [];
          }
        };
      };

      const matcher = buildMatcher();

      // ---------------------------
      // 再帰走査（-r/-R）
      // ---------------------------
      const collectFiles = (node: FileSystemNode, basePath: string): {node: FileSystemNode, path: string}[] => {
        const list: {node: FileSystemNode, path: string}[] = [];
        if (!node) return list;
        if (node.type === 'file') {
          list.push({ node, path: basePath });
          return list;
        }
        if (node.type === 'directory') {
          const children = node.children || {};
          for (const name of Object.keys(children)) {
            const child = children[name];
            const childPath = basePath.endsWith('/') ? (basePath + name) : (basePath + '/' + name);
            list.push(...collectFiles(child, childPath));
          }
        }
        return list;
      };

      // ---------------------------
      // 出力制御：-h/-H, -l, -q, -c, -n
      // ---------------------------
      let outStr = '';

      const shouldPrefixFilename = (multi: boolean) => {
        if (opts.has('h')) return false;
        if (opts.has('H')) return true;
        return multi;
      };

      const expandedTargets: {node: FileSystemNode, path: string}[] = [];
      if (targets.length === 0 && stdin !== undefined) {
          expandedTargets.push({ 
            node: { name: 'stdin', type: 'file', content: stdin, permissions: '-rw-r--r--' }, 
            path: '(standard input)' 
          });
      } else {
          for (const t of targets) {
            const node = resolvePath(fs, cwd, t);
            if (!node) {
              if (!opts.has('s')) outStr += `grep: ${t}: No such file or directory\n`;
              continue;
            }
            if (node.type === 'directory') {
              if (!recursive) {
                outStr += `grep: ${t}: Is a directory\n`;
                continue;
              }
              expandedTargets.push(...collectFiles(node, t));
            } else {
              expandedTargets.push({ node, path: t });
            }
          }
      }

      const multi = expandedTargets.length > 1;

      for (const item of expandedTargets) {
        const { node, path } = item;

        const lines = (node.content || '').split('\n');
        let matchesCount = 0;

        for (let idx = 0; idx < lines.length; idx++) {
          const line = lines[idx];
          const isMatch = matcher.isMatchLine(line);

          if (isMatch) {
            matchesCount++;

            if (opts.has('q')) return { output: '' };

            if (!opts.has('c')) {
              if (opts.has('l')) {
                outStr += `${path}\n`;
                break;
              }

              const showFile = shouldPrefixFilename(multi);
              const showLine = opts.has('n');

              const ms = matcher.findMatches(line);
              if (opts.has('o') && ms) {
                for (const m of ms) {
                  let prefix = '';
                  if (showFile) prefix += `${path}:`;
                  if (showLine) prefix += `${idx + 1}:`;
                  outStr += `${prefix}${m}\n`;
                }
              } else {
                let prefix = '';
                if (showFile) prefix += `${path}:`;
                if (showLine) prefix += `${idx + 1}:`;
                outStr += `${prefix}${line}\n`;
              }
            }

            if (maxPerFile != null && matchesCount >= maxPerFile) break;
          }
        }

        if (opts.has('c')) {
          const showFile = shouldPrefixFilename(multi);
          outStr += showFile ? `${path}:${matchesCount}\n` : `${matchesCount}\n`;
        }
      }

      return { output: outStr.trimEnd() };
    }

// ... (existing imports)


// ... inside executeCommand switch ...

    case 'nano': {
      const fileName = args[0];
      if (!fileName && stdin === undefined) return { output: 'nano: missing filename' };

      const newFs = JSON.parse(JSON.stringify(fs));
      let targetPath = fileName;
      let initialContent: string | undefined = undefined;

      if (stdin !== undefined) {
        initialContent = stdin;
        if (!fileName) {
          targetPath = '__NANO_STDIN__'; // Special marker for stdin content
        }
      }

      if (targetPath === '__NANO_STDIN__') {
        return { output: `__NANO__${targetPath}`, newFs, stdinContent: initialContent };
      } else {
        const node = resolvePath(newFs, cwd, targetPath);
        if (node && node.type === 'directory') {
          return { output: `nano: ${targetPath}: Is a directory` };
        }
        // If file exists, its content will be loaded by the frontend.
        // If it doesn't exist, it will be created on save.
        return { output: `__NANO__${targetPath}`, newFs, stdinContent: initialContent };
      }
    }

    case 'find': {
      let startPath = '.';
      let namePattern: string | null = null;
      
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-name') {
          namePattern = args[i + 1];
          // Remove quotes if present
          if (namePattern && ((namePattern.startsWith('"') && namePattern.endsWith('"')) || (namePattern.startsWith("'") && namePattern.endsWith("'")))) {
            namePattern = namePattern.slice(1, -1);
          }
          i++;
        } else if (!args[i].startsWith('-')) {
          startPath = args[i];
        }
      }

      const startNode = resolvePath(fs, cwd, startPath);
      if (!startNode) return { output: `find: '${startPath}': No such file or directory` };

      const results: string[] = [];
      const traverse = (node: FileSystemNode, currentPath: string) => {
        let isMatch = true;
        if (namePattern) {
          // Robust glob to regex: *.txt -> ^.*\.txt$
          // Handle cases like "config*", "*log*", "*.conf"
          let regexStr = namePattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex chars
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
          
          if (!namePattern.includes('*') && !namePattern.includes('?')) {
            // If no wildcards, exact match
            isMatch = node.name === namePattern;
          } else {
            const regex = new RegExp(`^${regexStr}$`);
            isMatch = regex.test(node.name);
          }
        }

        if (isMatch) {
          results.push(currentPath);
        }

        if (node.type === 'directory' && node.children) {
          Object.keys(node.children).sort().forEach(name => {
            const childPath = currentPath === '/' ? `/${name}` : (currentPath.endsWith('/') ? `${currentPath}${name}` : `${currentPath}/${name}`);
            traverse(node.children![name], childPath);
          });
        }
      };

      traverse(startNode, startPath);
      return { output: results.join('\n') };
    }

    case 'head':
    case 'tail': {
      const isHead = cmd === 'head';
      const { options: htOptionsRaw, params: htParams } = parseArgs(args);
      
      let maxLines = 10;
      let targets = [...htParams];

      // Improved argument parsing for head/tail
      // 1. Handle -n 5
      const nIndex = args.indexOf('-n');
      if (nIndex !== -1 && args[nIndex + 1]) {
          maxLines = parseInt(args[nIndex + 1], 10);
          // Only remove the specific numeric value that followed -n
          const nextArg = args[nIndex + 1];
          const paramIndex = targets.indexOf(nextArg);
          if (paramIndex !== -1) {
              targets.splice(paramIndex, 1);
          }
      } else {
          // 2. Handle -5
          const numOpt = args.find(a => /^-\d+$/.test(a));
          if (numOpt) {
            maxLines = parseInt(numOpt.slice(1), 10);
            targets = targets.filter(t => t !== numOpt);
          }
      }

      const processContent = (content: string, fileName: string) => {
        const lines = content.split('\n');
        const selected = isHead ? lines.slice(0, maxLines) : lines.slice(-maxLines);
        return selected.join('\n');
      };

      if (targets.length === 0) {
        if (stdin !== undefined) {
          return { output: processContent(stdin, '(stdin)') };
        }
        return { output: `${cmd}: missing operand` };
      }

      const results = targets.map(target => {
        const node = resolvePath(fs, cwd, target);
        if (!node) return `${cmd}: cannot open '${target}': No such file or directory`;
        if (node.type === 'directory') return `${cmd}: error reading '${target}': Is a directory`;
        
        const content = processContent(node.content || '', target);
        return targets.length > 1 ? `==> ${target} <==\n${content}` : content;
      });

      return { output: results.join('\n\n') };
    }

    case 'chmod': {
      // 簡易実装（パーミッション文字列の変更）
      const { params: chmodParams } = parseArgs(args);
      if (chmodParams.length < 2) return { output: 'chmod: missing operand' };
      
      const mode = chmodParams[0];
      const target = chmodParams[1];
      const newFsChmod = JSON.parse(JSON.stringify(fs));
      const nodeChmod = resolvePath(newFsChmod, cwd, target);
      
      if (nodeChmod) {
        let currentPerms = nodeChmod.permissions || (nodeChmod.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--');
        const isDir = nodeChmod.type === 'directory';

        // Helper to parse individual permission char (r, w, x, -)
        const parsePermChar = (char: string, type: 'r' | 'w' | 'x') => {
            return char === type ? true : false;
        };

        // Convert rwxrwxrwx string to object like { user: {r:true, w:true, x:true}, group: ... }
        // Format: d rwx rwx rwx (10 chars, index 1-3, 4-6, 7-9)
        const parsePermString = (p: string) => {
            return {
                user: { r: p[1]==='r', w: p[2]==='w', x: p[3]==='x' },
                group: { r: p[4]==='r', w: p[5]==='w', x: p[6]==='x' },
                other: { r: p[7]==='r', w: p[8]==='w', x: p[9]==='x' }
            };
        };

        const renderPermString = (pObj: any, isDir: boolean) => {
            const r = (o: any) => `${o.r?'r':'-'}${o.w?'w':'-'}${o.x?'x':'-'}`;
            return `${isDir?'d':'-'}${r(pObj.user)}${r(pObj.group)}${r(pObj.other)}`;
        };

        if (/^[0-7]{3}$/.test(mode)) {
            // Octal mode (e.g., 755)
            const map = {
                '0': '---', '1': '--x', '2': '-w-', '3': '-wx',
                '4': 'r--', '5': 'r-x', '6': 'rw-', '7': 'rwx'
            };
            const u = map[mode[0] as keyof typeof map];
            const g = map[mode[1] as keyof typeof map];
            const o = map[mode[2] as keyof typeof map];
            nodeChmod.permissions = `${isDir?'d':'-'}${u}${g}${o}`;
        } else if (/^[ugo]*[+\-=][rwx]+$/.test(mode)) {
            // Symbolic mode (simple support: u+x, go-w, +r, etc.)
            // Split into [who, op, what]
            const match = mode.match(/^([ugo]*)([+\-=])([rwx]+)$/);
            if (match) {
                const who = match[1] || 'ugo'; // empty means all
                const op = match[2];
                const what = match[3];

                const pObj = parsePermString(currentPerms);

                const apply = (target: any) => {
                    for (const char of what) {
                        if (char === 'r') target.r = (op === '+' || op === '=');
                        if (char === 'w') target.w = (op === '+' || op === '=');
                        if (char === 'x') target.x = (op === '+' || op === '=');
                        
                        if (op === '-') {
                             if (char === 'r') target.r = false;
                             if (char === 'w') target.w = false;
                             if (char === 'x') target.x = false;
                        }
                    }
                };

                if (who.includes('u')) apply(pObj.user);
                if (who.includes('g')) apply(pObj.group);
                if (who.includes('o')) apply(pObj.other);
                if (who === 'ugo' && who.length === 0) { // Should not happen with || logic but effectively 'a'
                     apply(pObj.user); apply(pObj.group); apply(pObj.other);
                }

                nodeChmod.permissions = renderPermString(pObj, isDir);
            }
        } else {
             // Fallback or specific hardcoded cases from existing logic
             if (mode === '+x') nodeChmod.permissions = currentPerms.replace(/-/g, 'x'); // Legacy fallback
             else return { output: `chmod: invalid mode: '${mode}'` };
        }
        
        return { output: '', newFs: newFsChmod };
      } else {
        return { output: `chmod: cannot access '${target}': No such file or directory` };
      }
    }

    case 'whoami':
      return { output: 'student' };

    case 'date':
      return { output: new Date().toString() };

    case 'wc': {
      const { options: wcOptionsRaw, params: wcParams } = parseArgs(args);
      const opts = parseOptions(wcOptionsRaw);
      
      let content = '';
      let targetName = '';

      if (wcParams.length === 0 && stdin !== undefined) {
          content = stdin;
          targetName = '';
      } else if (wcParams.length > 0) {
          const node = resolvePath(fs, cwd, wcParams[0]);
          if (!node) return { output: `wc: ${wcParams[0]}: No such file or directory` };
          content = node.content || '';
          targetName = wcParams[0];
      } else {
          return { output: 'wc: missing operand' };
      }
      
      const l = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
      const w = content.split(/\s+/).filter(x => x).length;
      const c = content.length;
      
      let out = '';
      if (opts.has('l')) out += `${l.toString().padStart(4)} `;
      if (opts.has('w')) out += `${w.toString().padStart(4)} `;
      if (opts.has('c')) out += `${c.toString().padStart(4)} `;
      
      if (!opts.has('l') && !opts.has('w') && !opts.has('c')) {
        out = `${l.toString().padStart(4)} ${w.toString().padStart(4)} ${c.toString().padStart(4)} `;
      }
      
      return { output: `${out}${targetName}`.trimEnd() };
    }

    case 'echo': {
      const fullArgs = args.join(' ');
      let text = fullArgs;
      let targetFile = '';
      let append = false;
      
      if (fullArgs.includes('>>')) {
        const parts = fullArgs.split('>>');
        text = parts[0];
        targetFile = parts[1].trim();
        append = true;
      } else if (fullArgs.includes('>')) {
        const parts = fullArgs.split('>');
        text = parts[0];
        targetFile = parts[1].trim();
      }
      
      text = text.trim();
      if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        text = text.slice(1, -1);
      }
      
      if (targetFile) {
        const newFs = JSON.parse(JSON.stringify(fs));
        const parts = normalizePath(cwd, targetFile).split('/');
        const fileName = parts.pop()!;
        const dirPath = parts.join('/') || '/';
        const dirNode = resolvePath(newFs, '/', dirPath);
        
        if (dirNode && dirNode.children) {
          if (dirNode.children[fileName] && append) {
            dirNode.children[fileName].content = (dirNode.children[fileName].content || '') + (dirNode.children[fileName].content ? '\n' : '') + text;
          } else {
            dirNode.children[fileName] = {
              name: fileName,
              type: 'file',
              permissions: '-rw-r--r--',
              content: text,
              updatedAt: new Date().toISOString()
            };
          }
          return { output: '', newFs };
        } else {
          return { output: `bash: ${targetFile}: No such file or directory` };
        }
      }
      return { output: text };
    }

    case 'less': {
        const { params } = parseArgs(args);
        if (params.length === 0 && stdin === undefined) return { output: 'less: missing filename' };
        
        let content = '';
        let fileName = '';
        
        if (params.length > 0) {
            fileName = params[0];
            const node = resolvePath(fs, cwd, fileName);
            if (!node) return { output: `less: ${fileName}: No such file or directory` };
            if (node.type === 'directory') return { output: `less: ${fileName}: Is a directory` };
            content = node.content || '';
        } else {
            content = stdin || '';
            fileName = '(stdin)';
        }
        
        // Simple mock pager: show first window of content and a footer
        const lines = content.split('\n');
        const preview = lines.slice(0, 40).join('\n');
        const footer = `\n\n(END) - ${fileName} (lines 1-${Math.min(40, lines.length)} of ${lines.length}) [Press q to exit]`;
        return { output: preview + (lines.length > 40 ? footer : footer) };
    }

    case 'pstree': {
        return { output: 
`systemd(1)─┬─kthreadd(2)
           ├─syslogd(345)
           ├─sshd(420)───sshd(1000)───bash(1001)───pstree(${Math.floor(Math.random()*100)+2000})
           ├─nginx(880)───nginx(881)
           └─python3(1234)` 
        };
    }

    case 'tar': {
        const { options: tarOptsRaw, params: tarParams } = parseArgs(args);
        const opts = parseOptions(tarOptsRaw);
        
        if (tarParams.length === 0) return { output: 'tar: must specify one of the options' };
        
        const isCreate = opts.has('c');
        const isExtract = opts.has('x');
        const isList = opts.has('t');
        const isVerbose = opts.has('v');
        const isFile = opts.has('f');
        
        if (isList) {
            const archiveName = isFile ? tarParams[0] : '';
            if (!archiveName) return { output: 'tar: must specify archive file with -f' };
            const node = resolvePath(fs, cwd, archiveName);
            if (!node || !node.content?.startsWith('__TAR_DATA__')) return { output: `tar: ${archiveName}: Not a tar archive` };
            
            try {
                const data = JSON.parse(node.content.replace('__TAR_DATA__', ''));
                return { output: Object.keys(data).join('\n') };
            } catch(e) { return { output: 'tar: error reading archive' }; }
        }
        
        if (isCreate) {
            const archiveName = isFile ? tarParams[0] : 'out.tar';
            const targets = isFile ? tarParams.slice(1) : tarParams;
            if (targets.length === 0) return { output: 'tar: cowards refuse to create an empty archive' };
            
            const archiveData: Record<string, any> = {};
            let out = '';
            
            for (const t of targets) {
                const node = resolvePath(fs, cwd, t);
                if (node) {
                    archiveData[t] = JSON.parse(JSON.stringify(node));
                    if (isVerbose) out += t + '\n';
                }
            }
            
            const newFs = writeFile(fs, cwd, archiveName, `__TAR_DATA__${JSON.stringify(archiveData)}`, false);
            return { output: out.trim(), newFs };
        }
        
        if (isExtract) {
            const archiveName = isFile ? tarParams[0] : '';
            if (!archiveName) return { output: 'tar: must specify archive file with -f' };
            const node = resolvePath(fs, cwd, archiveName);
            if (!node || !node.content?.startsWith('__TAR_DATA__')) return { output: `tar: ${archiveName}: Not a tar archive` };
            
            try {
                const data = JSON.parse(node.content.replace('__TAR_DATA__', ''));
                let currentFs = JSON.parse(JSON.stringify(fs));
                let out = '';
                for (const [name, nodeData] of Object.entries(data)) {
                    const archivedNode = nodeData as FileSystemNode;
                    if (archivedNode.type === 'directory') {
                        currentFs = createDirectory(currentFs, cwd, name, true);
                    } else {
                        currentFs = writeFile(currentFs, cwd, name, archivedNode.content || '', false);
                    }
                    if (isVerbose) out += name + '\n';
                }
                return { output: out.trim(), newFs: currentFs };
            } catch(e) { return { output: 'tar: error extracting archive' }; }
        }
        
        return { output: 'tar: unknown operation' };
    }

    case 'awk': {
        const { params } = parseArgs(args);
        if (params.length === 0 && stdin === undefined) return { output: 'awk: missing script' };
        
        const script = params[0];
        const targetFiles = params.slice(1);
        
        let content = '';
        if (targetFiles.length > 0) {
            for (const f of targetFiles) {
                const node = resolvePath(fs, cwd, f);
                if (node && node.type === 'file') content += (node.content || '') + '\n';
            }
        } else {
            content = stdin || '';
        }
        
        if (!script.includes('print')) return { output: '' };
        
        // Simple field extraction: {print $1, $2, $0}
        const fields = script.match(/\$(\d+)/g)?.map(f => parseInt(f.slice(1), 10)) || [];
        const printAll = script.includes('$0');
        
        const results = content.split('\n').filter(l => l.trim()).map(line => {
            if (printAll) return line;
            const parts = line.split(/\s+/).filter(p => p);
            return fields.map(f => parts[f-1] || '').join(' ');
        });
        
        return { output: results.join('\n') };
    }

    case 'apt': {
        const { params } = parseArgs(args);
        const op = params[0];
        const pkg = params[1];
        
        if (op === 'update') {
            return { output: 
`Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease
Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done`, isAsync: true };
        }
        if (op === 'install') {
            if (!pkg) return { output: 'apt: missing package name' };
            return { output: 
`Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  ${pkg}
0 upgraded, 1 newly installed, 0 to remove.
Get:1 http://archive.ubuntu.com/ubuntu jammy/main ${pkg} 1.0 [100 KB]
Fetched 100 KB in 0s (500 KB/s)
Selecting previously unselected package ${pkg}.
Preparing to unpack .../${pkg}_1.0_all.deb ...
Unpacking ${pkg} (1.0) ...
Setting up ${pkg} (1.0) ...`, isAsync: true };
        }
        return { output: `apt: unknown operation ${op}` };
    }

    case 'nginx': {
        const { options } = parseArgs(args);
        const opts = parseOptions(options);
        if (opts.has('t')) {
            return { output: 
`nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful` };
        }
        return { output: 'nginx: use -t to test configuration' };
    }

    case 'crontab': {
        const { options } = parseArgs(args);
        const opts = parseOptions(options);
        if (opts.has('l')) {
            return { output: '0 3 * * * /home/student/backup.sh' };
        }
        if (opts.has('e')) {
            return { output: '__NANO__crontab' }; // Mock opening in nano
        }
        return { output: 'crontab: use -l to list or -e to edit' };
    }

    // --- 新規追加コマンド ---

    case 'zip': {
      const { options: zipOptionsRaw, params: zipParams } = parseArgs(args);
      const opts = parseOptions(zipOptionsRaw);
      
      if (zipParams.length < 2) return { output: 'zip error: Nothing to do!' };
      
      const zipName = zipParams[0].endsWith('.zip') ? zipParams[0] : zipParams[0] + '.zip';
      const targets = zipParams.slice(1);
      const newFs = JSON.parse(JSON.stringify(fs));
      
      const archiveData: Record<string, FileSystemNode> = {};
      let outStr = '';

      for (const target of targets) {
        const node = resolvePath(fs, cwd, target);
        if (!node) {
          outStr += `zip warning: name not matched: ${target}\n`;
          continue;
        }

        if (node.type === 'directory' && !opts.has('r')) {
          outStr += `zip warning: skipping directory: ${target}\n`;
          continue;
        }

        // Add to archive (simulated: store node structure)
        archiveData[target] = JSON.parse(JSON.stringify(node));
        
        if (node.type === 'directory') {
          outStr += `  adding: ${target}/ (stored 0%)\n`;
        } else {
          outStr += `  adding: ${target} (deflated 10%)\n`;
        }
      }

      if (Object.keys(archiveData).length === 0) {
        return { output: outStr + 'zip error: Nothing to do!' };
      }

      // Create the zip file
      const parts = normalizePath(cwd, zipName).split('/');
      const fileName = parts.pop()!;
      const dirPath = parts.join('/') || '/';
      const dirNode = resolvePath(newFs, '/', dirPath);
      
      if (dirNode && dirNode.children) {
        dirNode.children[fileName] = {
          name: fileName,
          type: 'file',
          permissions: '-rw-r--r--',
          content: `__ZIP_DATA__${JSON.stringify(archiveData)}`
        };
        return { 
          output: outStr.trim(), 
          newFs, 
          isAsync: true, 
          asyncType: 'zip', 
          asyncTargets: Object.keys(archiveData) 
        };
      }
      return { output: `zip error: could not create ${zipName}` };
    }

    case 'unzip': {
      const { params: unzipParams } = parseArgs(args);
      if (unzipParams.length === 0) return { output: 'unzip:  must specify archive to extract' };
      
      const zipName = unzipParams[0];
      const node = resolvePath(fs, cwd, zipName);
      
      if (!node || node.type !== 'file' || !node.content?.startsWith('__ZIP_DATA__')) {
        return { output: `unzip:  cannot find or open ${zipName}, ${zipName}.zip or ${zipName}.ZIP.` };
      }

      try {
        const rawData = node.content.replace('__ZIP_DATA__', '');
        const archiveData: Record<string, FileSystemNode> = JSON.parse(rawData);
        const newFs = JSON.parse(JSON.stringify(fs));
        const currentDirNode = resolvePath(newFs, cwd, '.');
        
        if (!currentDirNode || !currentDirNode.children) return { output: 'unzip error: destination is invalid' };

        let outStr = `Archive:  ${zipName}\n`;
        const targets: string[] = [];
        for (const [name, archivedNode] of Object.entries(archiveData)) {
          currentDirNode.children[name] = archivedNode;
          outStr += `  inflating: ${name}\n`;
          targets.push(name);
        }
        
        return { 
          output: outStr.trim(), 
          newFs,
          isAsync: true,
          asyncType: 'unzip',
          asyncTargets: targets
        };
      } catch (e) {
        return { output: 'unzip error: invalid archive format' };
      }
    }

    case 'sort': {
      const { options: sortOptionsRaw, params: sortParams } = parseArgs(args);
      const opts = parseOptions(sortOptionsRaw);

      let content = '';
      if (sortParams.length === 0 && stdin !== undefined) {
          content = stdin;
      } else if (sortParams.length > 0) {
          const node = resolvePath(fs, cwd, sortParams[0]);
          if (!node || node.type !== 'file') return { output: `sort: cannot read: ${sortParams[0]}` };
          content = node.content || '';
      } else {
          return { output: 'sort: missing operand' };
      }
      
      const lines = content.split('\n').filter(l => l);

      // Handle numeric sort (-n)
      if (opts.has('n')) {
          lines.sort((a, b) => {
              const numA = parseFloat(a.replace(/[^\d.-]/g, ''));
              const numB = parseFloat(b.replace(/[^\d.-]/g, ''));
              if (isNaN(numA)) return 1;
              if (isNaN(numB)) return -1;
              return numA - numB;
          });
      } else {
          lines.sort();
      }

      if (opts.has('r')) lines.reverse();
      
      return { output: lines.join('\n') };
    }

    case 'uniq': {
      const { params: uniqParams } = parseArgs(args);
      let content = '';
      if (uniqParams.length === 0 && stdin !== undefined) {
          content = stdin;
      } else if (uniqParams.length > 0) {
          const node = resolvePath(fs, cwd, uniqParams[0]);
          if (!node || node.type !== 'file') return { output: `uniq: cannot read: ${uniqParams[0]}` };
          content = node.content || '';
      } else {
          return { output: 'uniq: missing operand' };
      }
      
      const lines = content.split('\n');
      const uniqueLines = lines.filter((line, index) => line !== lines[index - 1]);
      return { output: uniqueLines.join('\n') };
    }

    case 'cut': {
      const { params: cutParams } = parseArgs(args);
      let content = '';
      if (cutParams.length === 0 && stdin !== undefined) {
          content = stdin;
      } else if (cutParams.length > 0) {
          const node = resolvePath(fs, cwd, cutParams[0]);
          if (!node || node.type !== 'file') return { output: `cut: cannot read: ${cutParams[0]}` };
          content = node.content || '';
      } else {
          return { output: 'cut: missing operand' };
      }

      const dIndex = args.indexOf('-d');
      const fIndex = args.indexOf('-f');
      const delimiter = dIndex !== -1 ? args[dIndex+1].replace(/['"]/g, '') : '\t';
      const fields = fIndex !== -1 ? args[fIndex+1] : '1';
      
      const fieldIdx = parseInt(fields, 10) - 1;
      return { output: content.split('\n').map(line => {
        return line.split(delimiter)[fieldIdx] || '';
      }).join('\n') };
    }

    case 'diff': {
      const { params: diffParams } = parseArgs(args);
      if (diffParams.length < 2) return { output: 'diff: missing operand' };
      
      const file1 = resolvePath(fs, cwd, diffParams[0]);
      const file2 = resolvePath(fs, cwd, diffParams[1]);
      
      if (!file1 || !file2) return { output: 'diff: No such file' };
      
      if (file1.content === file2.content) return { output: '' };
      return { output: `Files ${diffParams[0]} and ${diffParams[1]} differ` };
    }

    case 'tree': {
      const { params: treeParams } = parseArgs(args);
      const target = treeParams[0] || '.';
      const root = resolvePath(fs, cwd, target);
      if (!root) return { output: `${target} [error opening dir]` };
      
      let out = target === '.' ? '.' : target;
      
      const buildTree = (node: FileSystemNode, prefix: string) => {
        if (!node.children) return;
        const keys = Object.keys(node.children);
        keys.forEach((key, idx) => {
          const isLast = idx === keys.length - 1;
          const child = node.children![key];
          out += `\n${prefix}${isLast ? '└── ' : '├── '}${key}`;
          if (child.type === 'directory') {
            buildTree(child, prefix + (isLast ? '    ' : '│   '));
          }
        });
      };
      
      buildTree(root, '');
      return { output: out };
    }

    case 'du': {
      const { params: duParams } = parseArgs(args);
      const target = duParams[0] || '.';
      const node = resolvePath(fs, cwd, target);
      if (!node) return { output: `du: cannot access '${target}'` };
      
      const size = calculateDirSize(node);
      return { output: `${Math.ceil(size/1024)}\t${target}` };
    }

    case 'df':
      return { output: 'Filesystem     1K-blocks      Used Available Use% Mounted on\n/dev/sda1       20971520   4512340  16459180  22% /' };

    case 'ps': {
      // More realistic mock processes including ones from missions
      const { params } = parseArgs(args); // Supports ps aux (ignored but valid)
      return { output: 
`USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1  16840  9476 ?        Ss   10:00   0:01 /sbin/init
root           2  0.0  0.0      0     0 ?        S    10:00   0:00 [kthreadd]
root         345  0.1  0.5 156320  8420 ?        Ss   10:01   0:05 /usr/sbin/syslogd
root         420  0.0  0.3  72300  4500 ?        Ss   10:01   0:00 /usr/sbin/sshd -D
nginx        880  0.0  0.4  55200  6200 ?        Ss   10:02   0:00 nginx: master process /usr/sbin/nginx
nginx        881  0.0  0.2  55600  4100 ?        S    10:02   0:00 nginx: worker process
student     1001  0.2  0.8  22400  5600 pts/0    Ss   10:05   0:00 -bash
student     1234  99.9 0.1   8400  1200 ?        R    11:00  20:00 python3 loop_script.py
student     ${Math.floor(Math.random() * 1000) + 2000}  0.0  0.1   9200  3200 pts/0    R+   12:00   0:00 ps aux`
      };
    }

    case 'sudo': {
        // Simple simulation: just shift the args and run (maybe with a fake "password" prompt in future?)
        // For now, implicit success.
        // It should ideally check if user is root, but we assume student can sudo.
        const { params } = parseArgs(args);
        if (params.length === 0) return { output: 'usage: sudo command' };
        
        const subCmd = params[0];
        const subArgs = params.slice(1);
        
        // Execute sub command
        // Note: Recursive call logic needs to be careful not to infinite loop if "sudo sudo"
        // And we need to pass the fs/cwd context
        // But wait, executeCommand doesn't take 'raw command string' but parts.
        // We can just call executeCommand recursively.
        
        // If the command is restricted, we could allow it here. 
        // For simulation, 'sudo' essentially does nothing special other than maybe logging or allowing permissions (if we tracked file ownership strictly).
        // Since our file ownership model is loose (everything owned by user usually, or read-only if root), we can just execute.
        
        // If the target is a system file owned by root, naive write might fail in a real permission logic, 
        // but here our writeFile doesn't strictly enforce user ownership checks yet (permissions are strings).
        // Let's just run it.
        
        return executeCommand(subCmd, subArgs, fs, cwd, stdin, oldPwd, history);
    }
    
    case 'uptime': {
        return { output: ' 12:34:56 up 2 days, 4:20,  1 user,  load average: 0.05, 0.03, 0.01' };
    }
    
    case 'free': {
        const { options } = parseArgs(args);
        const opts = parseOptions(options);
        if (opts.has('h')) {
            return { output: 
`              total        used        free      shared  buff/cache   available
Mem:           7.8G        1.2G        4.5G        120M        2.1G        6.3G
Swap:          2.0G          0B        2.0G` };
        }
        return { output: 
`              total        used        free      shared  buff/cache   available
Mem:        8192000     1258291     4718592      122880     2215117     6606029
Swap:       2097152           0     2097152` };
    }
    
    case 'uname': {
        const { options } = parseArgs(args);
        const opts = parseOptions(options);
        if (opts.has('a')) return { output: 'Linux l-quest-svr 5.15.0-100-generic #110-Ubuntu SMP Tue Jan 1 10:00:00 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux' };
        if (opts.has('r')) return { output: '5.15.0-100-generic' };
        return { output: 'Linux' };
    }
    
    case 'top': {
        return { output: 
`top - 12:40:00 up 2 days,  4:25,  1 user,  load average: 0.02, 0.02, 0.00
Tasks:  95 total,   1 running,  94 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.5 us,  0.2 sy,  0.0 ni, 99.3 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   7950.0 total,   4600.0 free,   1200.0 used,   2150.0 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   6450.0 avail Mem 

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   1234 student   20   0    8400   1200    900 R  99.9   0.0  20:05.12 loop_script.py
    880 nginx     20   0   55200   6200   2500 S   0.0   0.1   0:00.05 nginx
      1 root      20   0  168400   9400   6800 S   0.0   0.1   0:01.23 systemd
   1001 student   20   0   22400   5600   3400 S   0.0   0.1   0:00.15 bash
    Note: Press 'q' to exit.` };
    }
    
    case 'id': {
        const { params } = parseArgs(args);
        const targetUser = params[0] || 'student';
        if (targetUser === 'root') return { output: 'uid=0(root) gid=0(root) groups=0(root)' };
        if (targetUser === 'student') return { output: 'uid=1000(student) gid=1000(student) groups=1000(student),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev)' };
        return { output: `id: '${targetUser}': no such user` };
    }
    
    case 'groups': {
        return { output: 'student adm cdrom sudo dip plugdev' };
    }
    
    case 'pkill': {
        // Simulation: "killed"
        const { params } = parseArgs(args);
        if (params.length === 0) return { output: 'pkill: missing operand' };
        return { output: '' };
    }
    
    case 'systemctl': {
        const { params } = parseArgs(args);
        if (params.length < 2) return { output: 'systemctl: missing operand' };
        const op = params[0];
        const svc = params[1];
        
        if (op === 'status') {
            const running = svc === 'nginx' || svc === 'ssh';
            return { output: 
`● ${svc}.service - ${svc} service
     Loaded: loaded (/lib/systemd/system/${svc}.service; enabled; vendor preset: enabled)
     Active: ${running ? 'active (running)' : 'inactive (dead)'} since Tue 2024-01-01 10:00:00 UTC; 2h ago
   Main PID: 1234 (${svc})
      Tasks: 2 (limit: 1000)
     Memory: 5.0M
        CPU: 10ms
     CGroup: /system.slice/${svc}.service
             └─1234 /usr/sbin/${svc}` };
        }
        // start, stop, restart, reload, enable, disable
        if (['start', 'stop', 'restart', 'reload', 'enable', 'disable'].includes(op)) {
            // Simulate action (implicit success)
            return { output: '' }; 
        }
        return { output: `Unknown operation '${op}'.` };
    }

    case 'basename': {
      const { params } = parseArgs(args);
      if (!params[0]) return { output: 'basename: missing operand' };
      return { output: params[0].split('/').pop() || '' };
    }

    case 'dirname': {
      const { params } = parseArgs(args);
      if (!params[0]) return { output: 'dirname: missing operand' };
      const parts = params[0].split('/');
      parts.pop();
      return { output: parts.join('/') || '.' };
    }
    
    case 'ln': {
        const { options: lnOptionsRaw, params: lnParams } = parseArgs(args);
        const opts = parseOptions(lnOptionsRaw);
        if (lnParams.length < 2) return { output: 'ln: missing operand' };
        if (opts.has('s')) {
           const newFs = JSON.parse(JSON.stringify(fs));
           const target = lnParams[0];
           const linkName = lnParams[1];
           
           const parts = linkName.split('/');
           const name = parts.pop()!;
           const parentPath = parts.join('/') || '.';
           
           const parent = resolvePath(newFs, cwd, parentPath);
           if (parent && parent.children) {
               parent.children[name] = {
                   name: name,
                   type: 'file',
                   permissions: 'lrwxrwxrwx',
                   content: `-> ${target}`
               };
               return { output: '', newFs };
           } else {
               return { output: `ln: failed to create symbolic link '${linkName}': No such file or directory` };
           }
        }
        return { output: 'ln: hard links not supported (use -s)' };
    }

    case 'man': {
      const { params: manParams } = parseArgs(args);
      const cmdHelp = manParams[0];
      if (!cmdHelp) return { output: 'man: what manual page do you want?' };
      
      const manuals: Record<string, string> = {
        ls: 'ls: list directory contents',
        cd: 'cd: change directory',
        grep: 'grep: print lines that match patterns',
        sort: 'sort: sort lines of text files',
        uniq: 'uniq: report or omit repeated lines',
        cut: 'cut: remove sections from each line of files',
        tree: 'tree: list contents of directories in a tree-like format',
        du: 'du: estimate file space usage',
      };
      return { output: manuals[cmdHelp] || `No manual entry for ${cmdHelp}` };
    }

    case 'help':
      return { output: `Available commands:\n\nFile Ops:\n  ls, cp, mv, rm, touch, mkdir, ln, chmod, chown\n\nText Ops:\n  cat, head, tail, grep, sort, uniq, cut, wc, echo, diff\n\nSystem/Info:\n  cd, pwd, whoami, date, du, df, ps, kill, tree, basename, dirname\n\nTry 'man <command>' for more information.` };

    case 'clear':
      return { output: '__CLEAR__' };

    case 'history': {
      const { options: histOptionsRaw } = parseArgs(effectiveArgs);
      const opts = parseOptions(histOptionsRaw);
      
      // -c: clear history logic if we had mutable history here, but history is passed from state. 
      // We can only display it.
      
      const lines = history.map((h, i) => ` ${i + 1}  ${h.command}`);
      return { output: lines.join('\n') };
    }

    default:
      return { output: `bash: ${cmd}: command not found` };
  }
  }; // End executeCore

  const result = executeCore();
  return applyRedirection(result);
};

// ファイル書き込みヘルパー（絶対パスまたはCWD相対パスに対応）
export const createDirectory = (
  root: FileSystemNode,
  cwd: string,
  dirPath: string,
  createParents: boolean = true,
  updatedAt?: string
): FileSystemNode => {
  const newFs = JSON.parse(JSON.stringify(root));
  const absPath = normalizePath(cwd, dirPath);
  const parts = absPath.split('/').filter(p => p);

  let current = newFs;
  for (const part of parts) {
    if (!current.children) current.children = {};
    if (!current.children[part]) {
      if (createParents || part === parts[parts.length - 1]) {
        current.children[part] = {
          type: 'directory',
          name: part,
          children: {},
          permissions: 'drwxr-xr-x',
          updatedAt: updatedAt || new Date().toISOString()
        };
      } else {
        return root; // Parent missing and -p not specified
      }
    }
    current = current.children[part];
    if (current.type !== 'directory') return root; // Path blocked by file
  }
  return newFs;
};

export const writeFile = (
  root: FileSystemNode,
  cwd: string,
  filePath: string,
  content: string,
  createParents: boolean = false,
  updatedAt?: string
): FileSystemNode => {
  const newFs = JSON.parse(JSON.stringify(root));
  
  // パスの解決
  const isAbsolute = filePath.startsWith('/');
  let targetPath = isAbsolute ? filePath : (cwd === '/' ? `/${filePath}` : `${cwd}/${filePath}`);
  
  // 正規化（..や.の解決）
  const parts = targetPath.split('/').filter(p => p && p !== '.');
  const normalizedParts: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      normalizedParts.pop();
    } else {
      normalizedParts.push(part);
    }
  }
  
  const fileName = normalizedParts.pop();
  if (!fileName) return root; // ファイル名がない

  // 親ディレクトリを探索
  let current = newFs;
  for (const part of normalizedParts) {
    if (!current.children || !current.children[part]) {
      if (createParents) {
        // 親ディレクトリを作成
        if (!current.children) current.children = {};
        current.children[part] = {
          type: 'directory',
          name: part,
          children: {},
          permissions: 'drwxr-xr-x',
          updatedAt: updatedAt || new Date().toISOString()
        };
      } else {
        // 親ディレクトリが存在しない場合はエラー
        return root; 
      }
    }
    current = current.children[part];
    if (current.type !== 'directory') return root; // 途中にファイルがある
  }

  // ファイル書き込み
  if (!current.children) current.children = {};
  current.children[fileName] = {
    type: 'file',
    name: fileName,
    content: content,
    permissions: 'rw-r--r--',
    updatedAt: updatedAt || new Date().toISOString()
  };

  return newFs;
};

/**
 * Tokenize a command line, handling quotes and spaces.
 */
export const tokenizeCommand = (cmdStr: string): string[] => {
  const tokens: string[] = [];
  let currentToken = '';
  let inQuotes: string | null = null;
  let i = 0;

  while (i < cmdStr.length) {
    const char = cmdStr[i];

    if (inQuotes) {
      if (char === inQuotes) {
        inQuotes = null;
      } else {
        currentToken += char;
      }
    } else if (char === '"' || char === "'") {
      inQuotes = char;
    } else if (char === ' ') {
      if (currentToken.length > 0) {
        tokens.push(currentToken);
        currentToken = '';
      }
    } else {
      currentToken += char;
    }
    i++;
  }

  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  return tokens;
};

export const executeCommandLine = (
  commandLine: string,
  fs: FileSystemNode,
  cwd: string,
  onFsChange: (fs: FileSystemNode) => void,
  onCwdChange: (cwd: string) => void,
  oldPwd?: string,
  history: CommandHistory[] = []
): CommandResult => {
  // Manual scanner to split by pipes while respecting quotes and full-width characters
  const stages: string[] = [];
  let currentStage = '';
  let inQuotes: string | null = null;
  
  for (let i = 0; i < commandLine.length; i++) {
    const char = commandLine[i];
    if (inQuotes) {
      if (char === inQuotes) {
        inQuotes = null;
      }
      currentStage += char;
    } else if (char === '"' || char === "'") {
      inQuotes = char;
      currentStage += char;
    } else if (char === '|' || char === '｜') {
      stages.push(currentStage.trim());
      currentStage = '';
    } else {
      currentStage += char;
    }
  }
  stages.push(currentStage.trim());
  
  const activeStages = stages.filter(s => s.length > 0);
  if (activeStages.length === 0) return { output: '' };

  let currentFs = fs;
  let currentCwd = cwd;
  let lastOutput = '';
  let finalResult: CommandResult = { output: '' };

  for (let i = 0; i < activeStages.length; i++) {
    const stage = activeStages[i];
    const tokens = tokenizeCommand(stage);
    if (tokens.length === 0) continue;

    const cmd = tokens[0];
    const args = tokens.slice(1);

    const result = executeCommand(cmd, args, currentFs, currentCwd, i > 0 ? lastOutput : undefined, oldPwd, history);

    if (result.newFs) {
        currentFs = result.newFs;
        if (!result.isAsync) onFsChange(currentFs);
    }
    if (result.newCwd) {
        currentCwd = result.newCwd;
        if (!result.isAsync) onCwdChange(currentCwd);
    }

    lastOutput = result.output;
    finalResult = result;
    
    if (lastOutput.startsWith('__CLEAR__') || lastOutput.startsWith('__NANO__')) {
        return result;
    }
  }
  
  return finalResult;
};

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

export interface CommandResult {
  output: string;
  newFs?: FileSystemNode;
  newCwd?: string;
  stdinContent?: string;
}

// Helper to separate options from arguments
export const parseArgs = (inputArgs: string[]) => {
  const options = inputArgs.filter(arg => arg.startsWith('-'));
  const params = inputArgs.filter(arg => !arg.startsWith('-'));
  return { options, params };
};

export const executeCommand = (
  cmd: string, 
  args: string[], 
  fs: FileSystemNode, 
  cwd: string,
  stdin?: string
): CommandResult => {
  
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

        if (node.type === 'file') return node.name;
        if (!node.children) return '';

        const items = Object.values(node.children).filter(child => 
          opts.has('a') || !child.name.startsWith('.')
        );

        if (opts.has('l')) {
          const lines = items.map(child => {
            const size = child.type === 'directory' ? 4096 : (child.content || '').length;
            const sizeStr = opts.has('h') 
              ? (size > 1024 ? `${(size/1024).toFixed(1)}K` : size) 
              : size;
            return `${formatPermissions(child)} 1 user user ${String(sizeStr).padStart(5)} Oct 25 10:00 ${child.name}`;
          });
          output += lines.join('\n');
        } else {
          output += items.map(i => i.name).join('  ');
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

    case 'cd': {
      const { params: cdParams } = parseArgs(args);
      const targetDir = cdParams[0] || '/home/student';
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
        const parts = dirPath.split('/').filter(p => p);
        const dirName = parts.pop() || '';
        const parentPath = dirPath.startsWith('/') ? '/' + parts.join('/') : parts.join('/') || '.';
        
        let parentNode = resolvePath(newFs, cwd, parentPath);
        
        if (parentNode && parentNode.children) {
           if (parentNode.children[dirName] && !opts.has('p')) {
             errorMsg += `mkdir: cannot create directory '${dirName}': File exists\n`;
             continue;
           }
           if (!parentNode.children[dirName]) {
             parentNode.children[dirName] = {
               name: dirName,
               type: 'directory',
               permissions: 'drwxr-xr-x',
               children: {}
             };
           }
        } else {
           errorMsg += `mkdir: cannot create directory '${dirPath}': No such file or directory\n`;
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
              content: ''
            };
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
      let initialContent = '';

      if (stdin !== undefined) {
        initialContent = stdin;
        if (!fileName) {
          // If no filename is provided but stdin is, create a temporary file
          // In a real shell, this might open a buffer, but for this simulation,
          // we'll indicate it's stdin content.
          targetPath = '__NANO_STDIN__'; // Special marker for stdin content
        }
      }

      if (targetPath === '__NANO_STDIN__') {
        // For stdin content, we don't check the FS for existence, just pass the content
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

    case 'find':
// ... (existing find logic)

    case 'head':
    case 'tail': {
      const { options: htOptionsRaw, params: htParams } = parseArgs(args);
      const isHead = cmd === 'head';
      
      // オプション解析 (-n 5 or -5)
      let maxLines = 10;
      const nIndex = args.indexOf('-n');
      if (nIndex !== -1 && args[nIndex+1]) {
         maxLines = parseInt(args[nIndex+1], 10);
      } else {
         // -5 のような形式を探す
         const numOpt = args.find(a => /^-\d+$/.test(a));
         if (numOpt) maxLines = parseInt(numOpt.slice(1), 10);
      }
      
      let contentArr: string[] = [];
      let name = '';

      if (htParams.length === 0 && stdin !== undefined) {
          contentArr = stdin.split('\n');
          name = '(stdin)';
      } else if (htParams.length > 0) {
          const file = htParams[0];
          const node = resolvePath(fs, cwd, file);
          if (!node) return { output: `${cmd}: cannot open '${file}': No such file or directory` };
          contentArr = (node.content || '').split('\n');
          name = file;
      } else {
          return { output: `${cmd}: missing operand` };
      }
      
      const result = isHead ? contentArr.slice(0, maxLines) : contentArr.slice(-maxLines);
      return { output: result.join('\n') };
    }

    case 'chmod': {
      // 簡易実装（パーミッション文字列の変更のみ）
      const { params: chmodParams } = parseArgs(args);
      if (chmodParams.length < 2) return { output: 'chmod: missing operand' };
      
      const mode = chmodParams[0];
      const target = chmodParams[1];
      const newFsChmod = JSON.parse(JSON.stringify(fs));
      const nodeChmod = resolvePath(newFsChmod, cwd, target);
      
      if (nodeChmod) {
        // 数値モード(755等)や+x等は複雑なので、ここでは単純に文字列を上書きするか、
        // 755 -> drwxr-xr-x 変換のような簡易ロジックを入れる
        if (mode === '755') nodeChmod.permissions = nodeChmod.type === 'directory' ? 'drwxr-xr-x' : '-rwxr-xr-x';
        else if (mode === '644') nodeChmod.permissions = '-rw-r--r--';
        else if (mode === '777') nodeChmod.permissions = nodeChmod.type === 'directory' ? 'drwxrwxrwx' : '-rwxrwxrwx';
        else if (mode === '700') nodeChmod.permissions = nodeChmod.type === 'directory' ? 'drwx------' : '-rwx------';
        else if (mode === '600') nodeChmod.permissions = nodeChmod.type === 'directory' ? 'drwx------' : '-rwx------';
        else if (mode === '+x') nodeChmod.permissions = nodeChmod.permissions?.replace(/-/g, 'x') || '-rwxr-xr-x';
        else nodeChmod.permissions = mode; // Fallback
        
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
            dirNode.children[fileName].content += '\n' + text;
          } else {
            dirNode.children[fileName] = {
              name: fileName,
              type: 'file',
              permissions: '-rw-r--r--',
              content: text
            };
          }
          return { output: '', newFs };
        } else {
          return { output: `bash: ${targetFile}: No such file or directory` };
        }
      }
      return { output: text };
    }

    // --- 新規追加コマンド ---

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
      lines.sort();
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
      return { output: 'Filesystem     1K-blocks      Used Available Use% Mounted on\n/dev/sda1       10485760   1234567   9251193  12% /' };

    case 'ps':
      return { output: '  PID TTY          TIME CMD\n 1001 pts/0    00:00:00 bash\n 1002 pts/0    00:00:00 ps' };

    case 'kill':
      return { output: '' };

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

    default:
      return { output: `bash: ${cmd}: command not found` };
  }
};

// ファイル書き込みヘルパー（絶対パスまたはCWD相対パスに対応）
export const writeFile = (
  root: FileSystemNode,
  cwd: string,
  filePath: string,
  content: string
): FileSystemNode => {
  const newFs = JSON.parse(JSON.stringify(root));
  
  // パスの解決
  // 絶対パスか相対パスか判定
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
      // 親ディレクトリが存在しない場合はエラー（mkdir -p的な動作はしない）
      // あるいは自動作成するかどうか。今回は自動作成しない（Linuxの挙動に合わせる）
      return root; 
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
    permissions: 'rw-r--r--'
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
  onCwdChange: (cwd: string) => void
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

    const result = executeCommand(cmd, args, currentFs, currentCwd, i > 0 ? lastOutput : undefined);

    if (result.newFs) {
        currentFs = result.newFs;
        onFsChange(currentFs);
    }
    if (result.newCwd) {
        currentCwd = result.newCwd;
        onCwdChange(currentCwd);
    }

    lastOutput = result.output;
    finalResult = result;
    
    if (lastOutput.startsWith('__CLEAR__') || lastOutput.startsWith('__NANO__')) {
        return result;
    }
  }
  
  return finalResult;
};

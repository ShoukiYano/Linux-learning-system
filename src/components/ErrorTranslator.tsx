import React from 'react';
import { AlertCircle, Terminal, HelpCircle, FileSearch, ArrowRight } from 'lucide-react';

interface ErrorTranslatorProps {
  command: string;
  output: string;
}

interface ErrorRule {
  pattern: RegExp | string;
  title: string;
  description: string;
  suggestion: string;
  icon?: React.ReactNode;
}

const ERROR_RULES: ErrorRule[] = [
  {
    pattern: /command not found/i,
    title: 'コマンドが見つかりません',
    description: '入力されたコマンドは存在しないか、スペルが間違っています。',
    suggestion: '`ls` や `cd`、`mkdir` など、知っているコマンドか確認しましょう。入力ミスがないかもチェック！',
    icon: <Terminal className="text-yellow-400" />
  },
  {
    pattern: /No such file or directory/i,
    title: 'ファイルやディレクトリが見つかりません',
    description: '指定したファイルやフォルダが存在しません。',
    suggestion: '`ls` コマンドで現在の場所にあるファイル一覧を確認してみましょう。パス（場所）が正しいかどうかも重要です。',
    icon: <FileSearch className="text-blue-400" />
  },
  {
    pattern: /Is a directory/i,
    title: 'それはディレクトリです',
    description: 'ファイルとして扱おうとしましたが、それはフォルダ（ディレクトリ）です。',
    suggestion: 'フォルダの中身を見たい場合は `ls`、フォルダの中に移動したい場合は `cd` を使いましょう。`cat` はファイルの中身を見るコマンドです。',
    icon: <Folder className="text-orange-400" size={16} /> // アイコンとしてFolderを使うためlucide-reactからインポート必要
  },
  {
    pattern: /missing operand/i,
    title: '情報が足りません',
    description: 'コマンドに必要な引数（ファイル名など）が指定されていません。',
    suggestion: 'このコマンドは「何を」操作するか指定する必要があります。例: `mkdir <フォルダ名>`',
    icon: <HelpCircle className="text-pink-400" />
  },
  {
    pattern: /Permission denied/i,
    title: '権限がありません',
    description: 'その操作を行う許可がありません。',
    suggestion: '管理者権限が必要なファイルや、自分のものではないファイルを操作しようとしているかもしれません。`ls -l` で権限を確認できます。',
    icon: <AlertCircle className="text-red-400" />
  }
];

// 補助コンポーネント定義のためここでFolderをインポートできないので、lucide-reactから直接使う
import { Folder } from 'lucide-react';

export const ErrorTranslator: React.FC<ErrorTranslatorProps> = ({ command, output }) => {
  // エラーでない場合は何も表示しない（念のため）
  if (!output || (!output.includes('error') && !output.includes('not found') && !output.includes('cannot') && !output.includes('denied'))) {
    return null;
  }

  // ルールにマッチするものを探す
  const matchedRule = ERROR_RULES.find(rule => {
    if (rule.pattern instanceof RegExp) {
      return rule.pattern.test(output);
    }
    return output.includes(rule.pattern);
  });

  if (!matchedRule) return null;

  return (
    <div className="mt-2 mb-4 bg-slate-800/80 border border-slate-700/50 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-primary-900/20 border-b border-primary-500/20 px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"></div>
          <span className="text-xs font-bold text-primary-300 uppercase tracking-wider">AI Error Insight</span>
        </div>
      </div>
      <div className="p-3 flex gap-3">
        <div className="shrink-0 mt-0.5">
          {matchedRule.icon || <AlertCircle className="text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-slate-200 mb-1 flex items-center gap-2">
            {matchedRule.title}
          </h4>
          <p className="text-xs text-slate-400 mb-2 leading-relaxed">
            {matchedRule.description}
          </p>
          <div className="bg-slate-900/50 rounded border border-slate-700/50 p-2 text-xs flex gap-2 items-start">
            <ArrowRight size={14} className="text-primary-500 mt-0.5 shrink-0" />
            <span className="text-primary-100">{matchedRule.suggestion}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

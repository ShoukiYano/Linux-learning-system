import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { db } from '../lib/supabase';
import { Search, ChevronRight, Command, Copy, Loader2 } from 'lucide-react';

interface CommandDetail {
  id: string;
  name: string;
  description: string;
  usage: string;
  example: string;
  category: string;
  tags?: string[];
  options?: string;
  difficulty?: string;
}

export const Dictionary = () => {
  const [search, setSearch] = useState('');
  const [commands, setCommands] = useState<CommandDetail[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<CommandDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommands = async () => {
      try {
        const { data, error } = await db.getCommands();
        if (error) throw error;
        if (data) {
          setCommands(data);
          // 初期選択
          if (data.length > 0) setSelectedCommand(data[0]);
        }
      } catch (err) {
        console.error('Error fetching dictionary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommands();
  }, []);

  const filteredDocs = commands.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) || 
    doc.description.toLowerCase().includes(search.toLowerCase()) ||
    (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categoryLabels: { [key: string]: string } = {
    'File Ops': 'ファイル操作',
    'Process': 'プロセス管理',
    'Text Processing': 'テキスト処理',
    'Admin': '管理',
    'Permissions': '権限',
    'Network': 'ネットワーク',
    'System': 'システム',
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📚 コマンド辞書</h1>
          <p className="text-slate-400">
            Linuxコマンドの使い方を素早く検索。初心者から上級者まで対応。
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-slate-500" size={20} />
          </div>
          <input
            type="text"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
            placeholder="コマンドを検索... (例: ls, chmod, grep)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p>コマンドデータを読み込み中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Command List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc, i) => (
                  <div
                    key={doc.id || i}
                    onClick={() => setSelectedCommand(doc)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedCommand?.id === doc.id
                        ? 'bg-primary-500/20 border-primary-500'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <code className="px-3 py-1 bg-slate-900 rounded text-primary-400 font-bold font-mono">
                          {doc.name}
                        </code>
                        <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">
                          {categoryLabels[doc.category] || doc.category}
                        </span>
                        {doc.difficulty && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                            doc.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                            doc.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {doc.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">{doc.description}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {doc.tags?.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Command size={48} className="mx-auto mb-4 opacity-20" />
                  <p>一致するコマンドが見つかりませんでした</p>
                </div>
              )}
            </div>

            {/* Command Detail */}
            <div className="lg:col-span-1">
              {selectedCommand ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 sticky top-8">
                  <h3 className="text-2xl font-bold mb-2">{selectedCommand.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{selectedCommand.description}</p>

                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-300 mb-2">使用例</h4>
                    <div className="bg-slate-900 rounded p-3 font-mono text-sm text-primary-400 mb-2">
                      {selectedCommand.usage}
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedCommand.usage)}
                      className="w-full py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      {copied ? 'コピーしました' : 'コマンドをコピー'}
                    </button>
                  </div>

                  {selectedCommand.options && (
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-slate-300 mb-2">主なオプション</h4>
                      <div className="bg-slate-900/50 rounded p-3 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {selectedCommand.options}
                      </div>
                    </div>
                  )}

                  <div className="mb-6 pb-6 border-b border-slate-700">
                    <h4 className="text-sm font-bold text-slate-300 mb-3">カテゴリー</h4>
                    <p className="text-primary-400 text-sm">
                      {categoryLabels[selectedCommand.category] || selectedCommand.category}
                    </p>
                  </div>

                  {selectedCommand.tags && selectedCommand.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-300 mb-2">関連タグ</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCommand.tags.map(tag => (
                          <span
                            key={tag}
                            onClick={() => setSearch(tag)}
                            className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded cursor-pointer hover:bg-primary-500/30 transition-colors"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center text-slate-400">
                  <Command size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">コマンドを選択すると詳細が表示されます</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Footer */}
        {!loading && (
          <div className="mt-8 text-center text-sm text-slate-500">
            {filteredDocs.length} / {commands.length} 件のコマンドを表示中
          </div>
        )}
      </div>
    </Layout>
  );
};

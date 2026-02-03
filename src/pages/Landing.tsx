import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Shield, Zap, ChevronRight, Star, Users, Globe } from 'lucide-react';

export const Landing = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-primary-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center text-black font-bold font-mono">&gt;_</div>
            <span className="font-bold text-xl tracking-tight">L-Quest</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#demo" className="hover:text-white transition-colors">デモ</a>
            <Link to="/login" className="hover:text-white transition-colors">ログイン</Link>
            <Link to="/register" className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-full transition-all shadow-lg shadow-primary-500/20">
              無料で始める
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary-500/10 rounded-full blur-[120px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-xs font-bold mb-6 border border-primary-500/20">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
              NEW: エラー診断機能リリース
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
              未経験から<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-emerald-300">Linuxをマスターする</span>
            </h1>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-lg">
              エラー翻訳機能とGUI同期で、コマンド操作を直感的に。
              挫折しない学習体験を、L-Questで始めましょう。
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register" className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold text-center transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2">
                無料で始める <ChevronRight size={18} />
              </Link>
              <Link to="/demo" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-center border border-slate-700 transition-all">
                デモを試す
              </Link>
            </div>
            <div className="mt-6 text-xs text-slate-500">
              * クレジットカード登録不要 ・ 3分で開始
            </div>
          </div>

          {/* Hero Image / Terminal Mockup */}
          <div className="relative">
            <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
              <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="ml-auto text-xs text-slate-500">guest@l-quest:~</div>
              </div>
              <div className="p-6 font-mono text-sm text-slate-300 h-[300px] overflow-hidden">
                <div className="mb-2">Last login: Sun Feb 01 2026 12:37:44 on ttys001</div>
                <div className="mb-2">
                  <span className="text-primary-500">guest@l-quest:~$</span> l-quest start --trial
                </div>
                <div className="text-emerald-400 mb-1">✓ Environment initialized.</div>
                <div className="text-emerald-400 mb-4">✓ GUI Sync enabled.</div>
                <div className="mb-4">
                  Welcome to L-Quest Interactive Mode!<br/>
                  Type 'help' to see available commands.
                </div>
                <div className="mb-2">
                  <span className="text-primary-500">guest@l-quest:~$</span> mkdir my_project
                </div>
                <div className="mt-4 p-3 bg-slate-800/50 border-l-2 border-primary-500 text-xs text-slate-400">
                  <span className="text-primary-400 font-bold">Info:</span> "my_project" ディレクトリを作成しました。右側のGUIウィンドウを確認してください。
                </div>
              </div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -bottom-6 -left-6 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl flex items-center gap-3 animate-bounce-slow">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                <Shield size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-400">Security Level</div>
                <div className="font-bold text-white">Safe & Sandboxed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-primary-500 font-bold text-sm tracking-wider uppercase">Core Features</span>
            <h2 className="text-4xl font-bold mt-2 mb-4">挫折しないための5つの強力な武器</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              L-Questなら、黒い画面への恐怖心を解消。直感的な操作と丁寧な解説で、迷わずスキルアップできます。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'GUI ⟷ CLI 完全同期', desc: 'コマンド操作がリアルタイムでGUIウィンドウに反映。ファイルが動く様子を目で見て確認できるから、裏側の仕組みが直感的に理解できます。', highlight: true },
              { icon: Terminal, title: 'AIエラー翻訳', desc: '初心者の最大の壁「英語のエラーメッセージ」を日本語で分かりやすく解説。「なぜエラーが出たのか」「どう直せばいいか」を瞬時に提案します。' },
              { icon: Users, title: '助け合えるコミュニティ', desc: '分からないことはコミュニティで質問。先輩エンジニアやAIがあなたの学習をサポートします。投票機能で役立つ情報がすぐに見つかります。' },
              { icon: Shield, title: 'RPG型クエスト学習', desc: '実務で使うシナリオをクエスト形式で体験。「サーバーを復旧せよ」など、物語を進める感覚でスキルが身につきます。' },
              { icon: Globe, title: 'OS不問・環境構築不要', desc: 'ブラウザさえあれば、WindowsでもMacでもすぐにLinux環境が手に入ります。複雑な初期設定で挫折することはありません。' }
            ].map((feature, i) => (
              <div key={i} className={`p-8 rounded-2xl border transition-all group ${feature.highlight ? 'bg-primary-500/10 border-primary-500/30 shadow-lg shadow-primary-500/10' : 'bg-slate-800 border-slate-700 hover:border-primary-500/30'}`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.highlight ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-900 text-primary-500'}`}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary-500 font-bold text-sm tracking-wider uppercase">Interactive Demo</span>
            <h2 className="text-4xl font-bold mt-2 mb-4">完全同期デモ: コマンドとGUIが一体になる</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              左のターミナルでコマンドを実行すると、右のGUIウィンドウにリアルタイムで反映されます。
              これが「黒い画面恐怖症」を消す秘訣です。
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {/* CLI Terminal */}
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
              <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="ml-auto text-xs text-slate-500">guest@l-quest:~</div>
              </div>
              <div className="p-6 font-mono text-sm text-slate-300 min-h-[400px] bg-[#0f172a]">
                <div className="mb-3">
                  <span className="text-slate-500"># 1. ディレクトリを作成</span>
                </div>
                <div className="mb-2">
                  <span className="text-primary-500">guest@l-quest:~$</span> mkdir project
                </div>
                <div className="text-emerald-400 mb-4">Created: "project"</div>

                <div className="mb-3">
                  <span className="text-slate-500"># 2. ファイルを作成</span>
                </div>
                <div className="mb-2">
                  <span className="text-primary-500">guest@l-quest:~$</span> touch project/main.txt
                </div>
                <div className="text-emerald-400 mb-4">Created: "main.txt" in project/</div>

                <div className="mb-3">
                  <span className="text-slate-500"># 3. ファイルに内容を追加</span>
                </div>
                <div className="mb-2">
                  <span className="text-primary-500">guest@l-quest:~$</span> echo "Hello Linux" &gt; project/main.txt
                </div>
                <div className="text-emerald-400 mb-4">Modified: "main.txt"</div>

                <div className="mb-3">
                  <span className="text-slate-500"># 4. ファイル一覧を表示</span>
                </div>
                <div className="mb-2">
                  <span className="text-primary-500">guest@l-quest:~$</span> ls -la project/
                </div>
                <div className="text-slate-400 mt-2">
                  drwxr-xr-x  2 guest guest 4096 Feb  2 12:40 project<br/>
                  -rw-r--r--  1 guest guest   12 Feb  2 12:40 main.txt
                </div>
              </div>
            </div>

            {/* GUI Display */}
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
              <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="ml-auto text-xs text-slate-500">File Manager</div>
              </div>
              <div className="flex-1 p-6 bg-[#0f172a] overflow-auto">
                <div className="space-y-3">
                  {/* File structure visualization */}
                  <div className="text-sm font-mono">
                    <div className="text-slate-500 mb-4">📍 /home/guest</div>
                    
                    <div className="ml-4 text-slate-300 mb-2">
                      <span className="text-emerald-500">📁</span> project
                    </div>
                    
                    <div className="ml-8 space-y-1">
                      <div className="flex items-center gap-2 p-2 bg-primary-500/10 rounded border border-primary-500/30 animate-pulse">
                        <span className="text-primary-500">📄</span>
                        <span>main.txt</span>
                        <span className="text-slate-500 text-xs ml-auto">12 bytes</span>
                      </div>
                      <div className="text-slate-400 text-xs p-2">
                        💬 Last modified: just now
                      </div>
                      <div className="text-slate-400 text-xs p-2 bg-slate-800/50 rounded">
                        内容: "Hello Linux"
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="font-bold mb-2">リアルタイム反映</h3>
              <p className="text-sm text-slate-400">コマンドを実行した瞬間、GUIが更新。タイムラグなし。</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="text-2xl mb-3">🔄</div>
              <h3 className="font-bold mb-2">双方向同期</h3>
              <p className="text-sm text-slate-400">GUIでファイルを操作しても、ターミナルに同じ結果が表示されます。</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="text-2xl mb-3">🧠</div>
              <h3 className="font-bold mb-2">直感的理解</h3>
              <p className="text-sm text-slate-400">「コマンドの結果」と「ファイルの状態」を同時に理解できます。</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-400 mb-6">実際にデモを試してみてください</p>
            <Link to="/demo" className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold shadow-lg shadow-primary-500/20 transition-all">
              デモアプリを起動する <ChevronRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">数々のユーザーが体験</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: '田中 健太', role: 'Webエンジニア 1年目', text: '「黒い画面」アレルギーでしたが、L-Questのおかげで克服できました。特にエラーが出たときに日本語で優しく教えてくれる機能には何度も助けられました。' },
              { name: '佐藤 麻衣', role: 'インフラエンジニア志望', text: 'GUIとコマンドが同期しているのが画期的です。今まで丸暗記していたコマンドの意味が、「あ、こういうことか！」と直感的に理解できるようになりました。' },
              { name: '鈴木 一郎', role: '学生', text: 'ゲーム感覚で進められるので、勉強という感じがしません。気づいたらLPICレベルの問題が身についていて驚きました。就活にも役立ちそうです。' }
            ].map((t, i) => (
              <div key={i} className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-600"></div>
                  <div>
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-xs text-primary-400">{t.role}</div>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">"{t.text}"</p>
                <div className="flex gap-1 mt-4 text-yellow-500">
                  {[1,2,3,4,5].map(s => <Star key={s} size={12} fill="currentColor" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center px-6">
        <h2 className="text-4xl font-bold mb-6">あなたのキャリアを、<br/>コマンド一つで変える。</h2>
        <p className="text-slate-400 mb-8">実践で身につくLinuxスキル。<br/>Linuxの世界へのパスポートは、すでに開かれています。</p>
        <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold text-lg shadow-xl shadow-primary-500/20 transition-all">
          今すぐ無料で始める <ChevronRight />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
        <div className="flex justify-center gap-6 mb-4">
          <a href="#" className="hover:text-white">運営会社</a>
          <a href="#" className="hover:text-white">利用規約</a>
          <a href="#" className="hover:text-white">プライバシーポリシー</a>
          <a href="#" className="hover:text-white">特定商取引法に基づく表記</a>
        </div>
        <p>© 2024 L-Quest Inc. All rights reserved.</p>
      </footer>
    </div>
  );
};

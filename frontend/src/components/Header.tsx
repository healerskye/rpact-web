export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">R</span>
        </div>
        <span className="font-semibold text-slate-800 text-lg">rpact</span>
      </div>
      <span className="text-slate-400 text-sm">Confirmatory Adaptive Clinical Trial Design & Analysis</span>
      <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
        <a href="https://www.rpact.org" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">Docs</a>
        <a href="https://github.com/rpact-com/rpact" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">GitHub</a>
      </div>
    </header>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { TreeNode } from '../types';
import {
  Network, Sparkles, BookOpen, Layers, Info, ArrowRight,
  ZoomIn, ZoomOut, Maximize2, Minimize2, Search, Filter,
  ChevronRight, ChevronDown, Plus, Minus, FileText, Check, Copy, MessageSquare, Lightbulb, Compass, Share2
} from 'lucide-react';

interface KnowledgeTreeProps {
  nodes: TreeNode[];
  onSelectKeyword?: (keyword: string) => void;
  onAskAi?: (prompt: string) => void;
}

export const KnowledgeTree: React.FC<KnowledgeTreeProps> = ({
  nodes = [],
  onSelectKeyword,
  onAskAi
}) => {
  const safeNodes = Array.isArray(nodes) ? nodes.filter(Boolean) : [];
  const [selectedNodeId, setSelectedNodeId] = useState<string>(safeNodes[0]?.id || '');
  const [viewMode, setViewMode] = useState<'mindmap' | 'vertical' | 'outline'>('mindmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [copiedExcerpt, setCopiedExcerpt] = useState(false);
  const [aiActionFeedback, setAiActionFeedback] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [svgLines, setSvgLines] = useState<Array<{ id: string; x1: number; y1: number; x2: number; y2: number; isHighlighted: boolean }>>([]);

  useEffect(() => {
    if (safeNodes.length > 0 && (!selectedNodeId || !safeNodes.some(n => n.id === selectedNodeId))) {
      setSelectedNodeId(safeNodes[0].id);
    }
  }, [nodes]);

  const selectedNode = safeNodes.find(n => n && n.id === selectedNodeId) || safeNodes[0] || null;

  // Root nodes
  const rootNodes = safeNodes.filter(n => n && (!n.parentId || !safeNodes.some(p => p && p.id === n.parentId)));

  // Category badges with NoteLLM aesthetic
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'core':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-xs tracking-wide uppercase">
            Core System
          </span>
        );
      case 'concept':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Main Concept
          </span>
        );
      case 'detail':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Mechanism
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Sub-topic
          </span>
        );
    }
  };

  // Toggle collapse state for a node
  const toggleCollapse = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Get direct children of a node
  const getChildren = (nodeId: string) => {
    return safeNodes.filter(n => n && (n.parentId === nodeId || (safeNodes.find(p => p && p.id === nodeId)?.childrenIds?.includes(n.id))));
  };

  // Check if node matches search query
  const matchesSearch = (node: TreeNode) => {
    if (!node) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (node.label && node.label.toLowerCase().includes(q)) ||
      (node.description && node.description.toLowerCase().includes(q)) ||
      (node.keywordRef && node.keywordRef.toLowerCase().includes(q))
    );
  };

  // Calculate SVG connector lines dynamically based on DOM node position elements
  const updateSvgConnections = () => {
    if (viewMode !== 'mindmap' || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const lines: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; isHighlighted: boolean }> = [];

    safeNodes.forEach(node => {
      if (!node || collapsedNodeIds.has(node.id)) return;

      const children = getChildren(node.id);
      const parentEl = nodeRefs.current[node.id];

      if (!parentEl) return;
      const parentRect = parentEl.getBoundingClientRect();

      children.forEach(child => {
        if (!child) return;
        const childEl = nodeRefs.current[child.id];
        if (!childEl) return;

        const childRect = childEl.getBoundingClientRect();

        // Calculate positions relative to canvas container
        const x1 = (parentRect.right - canvasRect.left) / zoomLevel;
        const y1 = (parentRect.top + parentRect.height / 2 - canvasRect.top) / zoomLevel;
        const x2 = (childRect.left - canvasRect.left) / zoomLevel;
        const y2 = (childRect.top + childRect.height / 2 - canvasRect.top) / zoomLevel;

        const isHighlighted = selectedNodeId === node.id || selectedNodeId === child.id;

        lines.push({
          id: `${node.id}-${child.id}`,
          x1,
          y1,
          x2,
          y2,
          isHighlighted
        });
      });
    });

    setSvgLines(lines);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      updateSvgConnections();
    }, 100);
    return () => clearTimeout(timer);
  }, [safeNodes, selectedNodeId, viewMode, zoomLevel, collapsedNodeIds]);

  // Recalculate SVG lines on window resize
  useEffect(() => {
    const handleResize = () => updateSvgConnections();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCopyExcerpt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedExcerpt(true);
    setTimeout(() => setCopiedExcerpt(false), 2000);
  };

  const handleTriggerAiAction = (actionName: string, promptText: string) => {
    setAiActionFeedback(`Triggered AI: "${actionName}"`);
    setTimeout(() => setAiActionFeedback(null), 3000);
    if (onAskAi) {
      onAskAi(promptText);
    } else if (onSelectKeyword && selectedNode?.keywordRef) {
      onSelectKeyword(selectedNode.keywordRef);
    }
  };

  // Mindmap Node Render (Horizontal Column Layout with SVG curves)
  const renderMindmapBranch = (node: TreeNode, depth: number = 0) => {
    if (!node) return null;
    const children = getChildren(node.id);
    const isSelected = selectedNodeId === node.id;
    const isCollapsed = collapsedNodeIds.has(node.id);
    const isSearchHit = searchQuery.trim() !== '' && matchesSearch(node);

    return (
      <div key={node.id} className="flex items-center gap-12 my-3 relative">
        {/* Node Card */}
        <div
          ref={el => { nodeRefs.current[node.id] = el; }}
          onClick={() => setSelectedNodeId(node.id)}
          className={`group relative cursor-pointer min-w-[240px] max-w-[280px] p-4 rounded-2xl border transition-all duration-200 backdrop-blur-xs ${
            isSelected
              ? 'bg-white border-blue-600 shadow-xl ring-2 ring-blue-500/20 scale-[1.02]'
              : isSearchHit
              ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-300'
              : 'bg-white/95 border-slate-200/90 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          {/* Active indicator bar */}
          {isSelected && (
            <div className="absolute -left-1 top-3 bottom-3 w-1.5 bg-blue-600 rounded-full" />
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 leading-tight">{node.label}</span>
            </div>

            {/* Collapse / Expand Toggle Button if children exist */}
            {children.length > 0 && (
              <button
                onClick={(e) => toggleCollapse(node.id, e)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                title={isCollapsed ? "Expand Branch" : "Collapse Branch"}
              >
                {isCollapsed ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {node.description}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            {getCategoryBadge(node.category)}

            {node.keywordRef && (
              <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-semibold border border-amber-200/60 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                {node.keywordRef}
              </span>
            )}
          </div>
        </div>

        {/* Render Children horizontally */}
        {children.length > 0 && !isCollapsed && (
          <div className="flex flex-col gap-3 relative pl-2 border-l border-dashed border-slate-200">
            {children.map(child => renderMindmapBranch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Vertical Tree Layout Render
  const renderVerticalBranch = (node: TreeNode, depth: number = 0) => {
    if (!node) return null;
    const children = getChildren(node.id);
    const isSelected = selectedNodeId === node.id;
    const isCollapsed = collapsedNodeIds.has(node.id);

    return (
      <div key={node.id} className="relative flex flex-col items-start my-2">
        <div
          ref={el => { nodeRefs.current[node.id] = el; }}
          onClick={() => setSelectedNodeId(node.id)}
          className={`cursor-pointer group relative flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 w-full ${
            isSelected
              ? 'bg-blue-50/90 border-blue-600 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
          style={{ marginLeft: `${depth * 28}px` }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
              <Layers className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{node.label}</span>
                {getCategoryBadge(node.category)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{node.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {node.keywordRef && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200/80 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                {node.keywordRef}
              </span>
            )}

            {children.length > 0 && (
              <button
                onClick={(e) => toggleCollapse(node.id, e)}
                className="p-1 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-700"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Recursive Children */}
        {children.length > 0 && !isCollapsed && (
          <div className="pl-4 border-l-2 border-slate-200 ml-6 my-1.5 space-y-2 w-full">
            {children.map(child => renderVerticalBranch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="google-card p-6 bg-white space-y-6">
      {/* Top Header & NoteLLM Control Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">NoteLLM Knowledge Canvas</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 uppercase">
                Interactive Mindmap
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured concept hierarchy generated from lecture text with AI quick actions
            </p>
          </div>
        </div>

        {/* Search Bar & View Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Node Input */}
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search canvas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* View Mode Toggle Pill */}
          <div className="bg-slate-100 p-1 rounded-full border border-slate-200/80 flex items-center text-xs">
            <button
              onClick={() => setViewMode('mindmap')}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                viewMode === 'mindmap'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mindmap Canvas
            </button>
            <button
              onClick={() => setViewMode('vertical')}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                viewMode === 'vertical'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tree Diagram
            </button>
            <button
              onClick={() => setViewMode('outline')}
              className={`px-3 py-1 rounded-full font-semibold transition-all ${
                viewMode === 'outline'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Outline
            </button>
          </div>

          {/* Zoom Controls */}
          {viewMode === 'mindmap' && (
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-full border border-slate-200">
              <button
                onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.1))}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-slate-600 px-1">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel(z => Math.min(1.4, z + 0.1))}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas + Inspector Drawer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Canvas Body Column */}
        <div className="lg:col-span-8 flex flex-col">
          {/* Canvas Container with NoteLLM Grid Background */}
          <div
            ref={canvasRef}
            className="relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] bg-slate-50/80 rounded-3xl border border-slate-200/90 p-6 min-h-[480px] max-h-[560px] overflow-auto shadow-inner/10"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              transition: 'transform 0.2s ease-out'
            }}
          >
            {/* SVG Connecting Paths Layer */}
            {viewMode === 'mindmap' && svgLines.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {svgLines.map(line => {
                  // Calculate Bezier curve control points
                  const dx = Math.abs(line.x2 - line.x1) * 0.5;
                  const pathD = `M ${line.x1} ${line.y1} C ${line.x1 + dx} ${line.y1}, ${line.x2 - dx} ${line.y2}, ${line.x2} ${line.y2}`;

                  return (
                    <path
                      key={line.id}
                      d={pathD}
                      stroke={line.isHighlighted ? '#2563eb' : '#94a3b8'}
                      strokeWidth={line.isHighlighted ? 3 : 2}
                      strokeDasharray={line.isHighlighted ? 'none' : '4 4'}
                      fill="none"
                      className="transition-all duration-300 opacity-80"
                    />
                  );
                })}
              </svg>
            )}

            {/* Mindmap Branch Flow */}
            {viewMode === 'mindmap' && (
              <div className="relative z-10 flex flex-col gap-6 py-2 min-w-max">
                {rootNodes.map(root => renderMindmapBranch(root, 0))}
              </div>
            )}

            {/* Vertical Tree Diagram */}
            {viewMode === 'vertical' && (
              <div className="relative z-10 space-y-3">
                {rootNodes.map(root => renderVerticalBranch(root, 0))}
              </div>
            )}

            {/* Notebook Document Outline View */}
            {viewMode === 'outline' && (
              <div className="relative z-10 space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Document Structure & Concept Breakdown
                </h4>
                {safeNodes.map(n => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNodeId(n.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedNodeId === n.id ? 'bg-blue-50 border-blue-500 font-semibold' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{n.label}</span>
                      {getCategoryBadge(n.category)}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{n.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-2">
            <span>Click any card on the canvas to inspect AI details and lecture notes.</span>
            <span>{safeNodes.length} Connected Concept Nodes</span>
          </div>
        </div>

        {/* NoteLLM Inspector Side Drawer */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[480px]">
          {selectedNode ? (
            <div className="space-y-4">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  NoteLLM Inspector
                </span>
                {getCategoryBadge(selectedNode.category)}
              </div>

              {/* Node Title & Description */}
              <div>
                <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {selectedNode.label}
                </h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {selectedNode.description}
                </p>
              </div>

              {/* Linked Keyword Box */}
              {selectedNode.keywordRef && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Linked Keyword
                    </span>
                    <span className="text-xs font-extrabold text-amber-800">{selectedNode.keywordRef}</span>
                  </div>

                  {onSelectKeyword && (
                    <button
                      onClick={() => onSelectKeyword(selectedNode.keywordRef!)}
                      className="w-full mt-1 bg-amber-100 hover:bg-amber-200/80 text-amber-900 text-xs font-bold py-1.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Research Keyword with AI Tutor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Lecture Excerpt Quote Box */}
              {selectedNode.docExcerpt && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl relative space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-blue-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Source Excerpt
                    </span>
                    <button
                      onClick={() => handleCopyExcerpt(selectedNode.docExcerpt!)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {copiedExcerpt ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedExcerpt ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 italic leading-relaxed">
                    "{selectedNode.docExcerpt}"
                  </p>
                </div>
              )}

              {/* AI Quick Action Tools */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">
                  AI Canvas Actions
                </span>
                <div className="space-y-2">
                  <button
                    onClick={() => handleTriggerAiAction('Ask AI Tutor', `Explain how ${selectedNode.label} works in detail`)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-xs font-bold text-slate-800 hover:text-blue-700 transition-all flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>Ask AI Tutor about this node</span>
                  </button>

                  <button
                    onClick={() => handleTriggerAiAction('ELI5 Explanation', `Explain ${selectedNode.label} in simple everyday terms (ELI5)`)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-xs font-bold text-slate-800 hover:text-amber-800 transition-all flex items-center gap-2"
                  >
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Explain in simple terms (ELI5)</span>
                  </button>
                </div>
              </div>

              {/* Toast Feedback */}
              {aiActionFeedback && (
                <div className="p-2.5 bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{aiActionFeedback}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
              <Info className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-xs font-medium">Select any node on the Mindmap canvas to view NoteLLM details & AI actions.</p>
            </div>
          )}

          {/* Footer Branding */}
          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Synapse NoteLLM Engine</span>
            <span className="text-blue-600 font-bold">Gemini 3.6 Flash</span>
          </div>
        </div>
      </div>
    </div>
  );
};

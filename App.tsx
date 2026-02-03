import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  Search, ChevronDown, ChevronRight, Check, Sigma, Filter, LayoutGrid, 
  MoreVertical, Pin, Bell, Plus, Grid, Layers, X, MoreHorizontal, 
  Download, Trash2, Edit2, FileText, File, Menu, Info, HelpCircle,
  ArrowUp, ArrowDown, AlertTriangle, Settings2, Eye, History,
  ArrowUpWideNarrow, ArrowDownWideNarrow, Maximize2, RotateCcw, Minus, Columns, 
  ArrowUpNarrowWide, ArrowDownNarrowWide, Star, User
} from 'lucide-react';
import { generateMockRows, COLUMNS } from './data/mock';
import { TableRow, TableNode, GroupNode, RowNode, TotalNode, AggregationFunction } from './types';

// Feature flag to quickly toggle calculation mechanisms
const ENABLE_CALCULATIONS = false;

const Checkbox = ({ 
  checked, 
  indeterminate, 
  onChange, 
  className = "" 
}: { 
  checked: boolean, 
  indeterminate?: boolean, 
  onChange?: (e: React.MouseEvent) => void,
  className?: string
}) => {
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        if (onChange) onChange(e);
      }}
      className={`w-4 h-4 border-[1.5px] rounded-[4px] flex items-center justify-center cursor-pointer transition-all shrink-0 ${
        checked 
          ? 'bg-cplace-blue border-cplace-blue' 
          : indeterminate 
            ? 'bg-cplace-blue/20 border-cplace-blue' 
            : 'bg-white border-[#cbd5e1]'
      } ${className}`}
    >
      {checked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
      {!checked && indeterminate && <Minus className="w-3 h-3 text-cplace-blue stroke-[3px]" />}
    </div>
  );
};

// Custom Icons from screenshot
const CoffeeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M35 23V38" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
    <path d="M50 23V38" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
    <path d="M65 23V38" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
    <path d="M25 45H70C70 45 83 45 83 55C83 65 70 65 70 65H25C25 65 25 88 50 88C75 88 75 65 75 65" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M25 45V65" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
  </svg>
);

const PinLogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="15" width="70" height="70" rx="12" stroke="currentColor" strokeWidth="6"/>
    <path d="M50 35C41.7157 35 35 41.7157 35 50C35 65 50 78 50 78C50 78 65 65 65 50C65 41.7157 58.2843 35 50 35ZM50 55C47.2386 55 45 52.7614 45 50C45 47.2386 47.2386 45 50 45C52.7614 45 55 47.2386 55 50C55 52.7614 52.7614 55 50 55Z" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function App() {
  const [rawData, setRawData] = useState<TableRow[]>(generateMockRows(360));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeGroups, setActiveGroups] = useState<string[]>([]);
  
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [activeAggs, setActiveAggs] = useState<Set<AggregationFunction>>(new Set(['sum', 'avg', 'count']));
  const [showAggMenu, setShowAggMenu] = useState(false);

  const [groupSortOrders, setGroupSortOrders] = useState<Record<string, 'asc' | 'desc'>>({});
  const [dataSort, setDataSort] = useState<{ colId: string; direction: 'asc' | 'desc' } | null>(null);

  const [headerMenu, setHeaderMenu] = useState<{ x: number, y: number, colId: string } | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    COLUMNS.forEach(col => {
      initial[col.id] = parseInt(col.width || '150');
    });
    return initial;
  });

  const resizingRef = useRef<{ id: string; startX: number; startWidth: number } | null>(null);

  const toggleGroupAction = (colId: string, direction: 'asc' | 'desc') => {
    setGroupSortOrders(prev => ({ ...prev, [colId]: direction }));
    setActiveGroups(prev => {
      if (prev.includes(colId)) return prev;
      return [...prev, colId];
    });
    setHeaderMenu(null);
  };

  const removeGroup = (colId: string) => setActiveGroups(prev => prev.filter(g => g !== colId));
  
  const toggleExpandAll = () => {
    if (expandedIds.size > 0) {
      setExpandedIds(new Set());
    } else {
      const allPaths = new Set<string>();
      const traverse = (nodes: TableNode[]) => {
        nodes.forEach(n => {
          if (n.type === 'group') {
            allPaths.add(n.id);
            traverse(n.children);
          }
        });
      };
      traverse(treeNodes);
      setExpandedIds(allPaths);
    }
  };

  const sortDataAction = (colId: string, direction: 'asc' | 'desc') => {
    setDataSort({ colId, direction });
    setHeaderMenu(null);
  };

  const handleCellClick = (rowId: string, colId: string) => {
    const col = COLUMNS.find(c => c.id === colId);
    if (col?.type !== 'number' && col?.id !== 'name') return;
    const key = `${rowId}:${colId}`;
    setSelectedCells(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const adHocStats = useMemo(() => {
    if (!ENABLE_CALCULATIONS || selectedCells.size === 0) return null;
    const values: number[] = [];
    const units = new Set<string>();
    
    selectedCells.forEach(key => {
      const [rowId, colId] = key.split(':');
      const row = rawData.find(r => r.id === rowId);
      const col = COLUMNS.find(c => c.id === colId);
      if (row && col && col.type === 'number') {
        const val = (row as any)[colId];
        if (typeof val === 'number') {
          values.push(val);
          if (col.unit) units.add(col.unit);
        }
      }
    });

    const isMismatch = units.size > 1;
    const count = values.length;
    
    if (isMismatch) return { sum: 0, avg: 0, count, min: 0, max: 0, isMismatch: true, unitsMismatch: true };

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = count > 0 ? sum / count : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;

    return { sum, avg, count, min, max, isMismatch: false, unitsMismatch: false } as any;
  }, [selectedCells, rawData]);

  const sortedRawData = useMemo(() => {
    if (!dataSort) return rawData;
    const { colId, direction } = dataSort;
    return [...rawData].sort((a, b) => {
      let valA = (a as any)[colId];
      let valB = (b as any)[colId];
      if (colId === 'manager') { valA = a.manager.name; valB = b.manager.name; }
      if (colId === 'company') { valA = a.company.name; valB = b.company.name; }
      if (valA === valB) return 0;
      const result = valA < valB ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });
  }, [rawData, dataSort]);

  const getRowsInNode = (node: TableNode): TableRow[] => {
    if (node.type === 'row') return [node.data];
    if (node.type === 'group') return node.children.flatMap(child => getRowsInNode(child));
    return [];
  };

  const treeNodes = useMemo(() => {
    const build = (data: TableRow[], groupKeys: string[], level: number, parentPath: string): TableNode[] => {
      if (groupKeys.length === 0) return data.map(r => ({ type: 'row', id: r.id, data: r, level }));
      const [key, ...remaining] = groupKeys;
      const groupsMap = new Map<string, TableRow[]>();
      data.forEach(item => {
        let val = (key === 'manager' ? item.manager.name : key === 'company' ? item.company.name : String((item as any)[key]));
        if (!groupsMap.has(val)) groupsMap.set(val, []);
        groupsMap.get(val)!.push(item);
      });
      const sortDir = groupSortOrders[key] || 'asc';
      return Array.from(groupsMap.entries())
        .sort((a, b) => (sortDir === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0])))
        .map(([val, items]) => {
          const path = `${parentPath}/${val}`;
          return { type: 'group', id: path, path, level, groupKey: key, groupValue: val, itemCount: items.length, children: build(items, remaining, level + 1, path) } as GroupNode;
        });
    };
    return build(sortedRawData, activeGroups, 0, 'root');
  }, [sortedRawData, activeGroups, groupSortOrders]);

  const flattenedList = useMemo(() => {
    const list: TableNode[] = [];
    const traverse = (nodes: TableNode[]) => {
      nodes.forEach(node => {
        list.push(node);
        if (node.type === 'group' && expandedIds.has(node.id)) {
          traverse(node.children);
          
          // Inject totals only if calculations are enabled
          if (ENABLE_CALCULATIONS) {
            const childRows = getRowsInNode(node);
            const stats: Record<string, number> = {};
            COLUMNS.forEach(col => { if (col.type === 'number') stats[col.id] = childRows.reduce((acc, r) => acc + (Number((r as any)[col.id]) || 0), 0); });
            list.push({ type: 'total', id: `total-${node.id}`, label: `Total ${node.groupValue}`, level: node.level + 1, stats } as TotalNode);
          }
        }
      });
    };
    traverse(treeNodes);
    return list;
  }, [treeNodes, expandedIds]);

  const getAllChildRowIds = (node: TableNode): string[] => {
    if (node.type === 'row') return [node.id];
    if (node.type === 'group') return node.children.flatMap(child => getAllChildRowIds(child));
    return [];
  };

  const handleToggleSelect = (node: TableNode) => {
    const ids = getAllChildRowIds(node);
    if (ids.length === 0) return;
    const allSelected = ids.every(id => selectedRowIds.has(id));
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id)); else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const handleMasterSelect = () => {
    if (selectedRowIds.size === rawData.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(rawData.map(r => r.id)));
    }
  };

  const getSelectionState = (node: TableNode) => {
    const ids = getAllChildRowIds(node);
    if (ids.length === 0) return 'none';
    const selectedCount = ids.filter(id => selectedRowIds.has(id)).length;
    return selectedCount === 0 ? 'none' : selectedCount === ids.length ? 'all' : 'indeterminate';
  };

  const onMouseDown = (id: string, e: React.MouseEvent) => {
    resizingRef.current = { id, startX: e.pageX, startWidth: columnWidths[id] || 150 };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { id, startX, startWidth } = resizingRef.current;
    setColumnWidths(prev => ({ ...prev, [id]: Math.max(50, startWidth + (e.pageX - startWidth)) }));
    // Note: corrected the logic for resizing calculation
    setColumnWidths(prev => ({ ...prev, [id]: Math.max(50, startWidth + (e.pageX - startX)) }));
  };
  const onMouseUp = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    const handleGlobalClick = () => { 
      setHeaderMenu(null); 
      setShowAggMenu(false); 
      setSelectedCells(new Set());
      setSelectedRowIds(new Set());
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const hasGrouping = activeGroups.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-white text-[14px] font-sans">
      
      {/* Updated Workspace Navigation Sidebar matching screenshot */}
      <aside className="w-14 bg-cplace-blue flex flex-col items-center py-0 shrink-0 z-[100]">
        <div className="w-full h-12 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
          <Menu className="w-6 h-6 text-white" />
        </div>
        <div className="w-full h-14 bg-[#00A3FF] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
          <CoffeeIcon className="w-9 h-9 text-white" />
        </div>
        <div className="w-full h-14 bg-[#005E94] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
          <PinLogoIcon className="w-9 h-9 text-white" />
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Tier 1: Global Platform Header */}
        <div className="h-12 border-b border-slate-100 flex items-center px-0 justify-between bg-white shrink-0">
          <div className="flex items-center h-full">
            <div className="px-3 flex items-center gap-4">
              <HomeIcon className="w-4.5 h-4.5 text-cplace-blue cursor-pointer" />
              <div className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 py-1 px-2 rounded">
                <span className="text-slate-600 font-medium">New</span>
              </div>
              <div className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 py-1 px-2 rounded">
                <span className="text-slate-600 font-medium">Workspaces</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 py-1 px-2 rounded">
                <span className="text-slate-600 font-medium">Recents</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Global Search Center */}
          <div className="flex-1 max-w-xl relative">
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full bg-white border border-slate-200 rounded-md py-1.5 px-4 outline-none focus:border-cplace-blue transition-all"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cplace-blue" />
          </div>

          {/* App Utility Icons */}
          <div className="flex items-center px-4 gap-4">
            <div className="flex items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer">
              <LayoutGrid className="w-5 h-5" />
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="flex items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer">
              <Star className="w-5 h-5" />
              <ChevronDown className="w-3 h-3" />
            </div>
            <div className="relative">
              <Bell className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center text-[7px] font-bold">1</div>
            </div>
            <div className="w-7 h-7 bg-cplace-blue/10 rounded-full flex items-center justify-center cursor-pointer border border-cplace-blue/20">
              <span className="text-cplace-blue text-[10px] font-bold">US</span>
            </div>
          </div>
        </div>

        {/* Tier 2: Widget Action Bar */}
        <div className="h-10 border-b border-slate-200 flex items-center px-4 justify-between bg-[#F8FAFC] shrink-0" onClick={(e) => e.stopPropagation()}>
          <h1 className="font-bold text-slate-800 text-[15px]">New Table Widget</h1>
          <div className="flex items-center gap-2 h-full">
            <div className="flex items-center gap-1 text-slate-600 font-medium hover:text-cplace-blue cursor-pointer h-full px-2">
              <span>Aktionen</span> 
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            <div className="flex items-center gap-1 text-slate-600 font-medium hover:text-cplace-blue cursor-pointer h-full px-2">
              <span>Eigenschaften</span>
            </div>
            <div className="bg-cplace-blue text-white px-3 py-1 rounded-md text-[13px] font-bold shadow-sm cursor-pointer mx-1">
              Layout
            </div>
            <div className="flex items-center gap-1 text-slate-600 font-medium hover:text-cplace-blue cursor-pointer h-full px-2">
              <span>Versionen</span>
            </div>
            <X className="w-5 h-5 text-slate-400 cursor-pointer ml-2 hover:text-slate-600" />
            <div className="w-px h-5 bg-slate-300 mx-1" />
            <MoreHorizontal className="w-5 h-5 text-slate-400 cursor-pointer" />
          </div>
        </div>

        {/* Tier 3: Contextual Toolbar - Refined */}
        <div className="px-4 py-1.5 flex items-center justify-between shrink-0 bg-[#E9EDF1] border-b border-slate-200" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 h-full">
            {/* Search Box */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search" 
                className="pl-3 pr-8 py-1 border border-slate-300 rounded-sm text-[13px] w-44 outline-none focus:border-cplace-blue" 
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 stroke-[2.5px]" />
            </div>

            {/* New Button */}
            <button className="bg-cplace-blue text-white px-3 py-1 rounded-[4px] text-[13px] font-bold shadow-sm hover:opacity-90 flex items-center ml-1">
              New
            </button>
            
            <div className="w-[1.5px] h-5 bg-slate-400/40 mx-1.5" />
            
            {/* Tools Area */}
            <div className="flex items-center gap-3 text-slate-700">
              <Filter className="w-4.5 h-4.5 hover:text-slate-900 cursor-pointer" />
              <div className="flex items-center gap-0.5 hover:text-slate-900 cursor-pointer">
                  <Columns className="w-4.5 h-4.5" />
                  <ChevronDown className="w-3 h-3" />
              </div>
              
              <div className="w-[1px] h-5 bg-slate-400/40 mx-0.5" />
              
              <div className="flex items-center gap-2 text-slate-700">
                  <Minus className="w-4.5 h-4.5" />
                  <div className="flex items-center gap-1 text-[13px] font-medium cursor-pointer">
                    Compact <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-[1px] h-5 bg-slate-400/40 mx-1" />
            <div className="flex items-center gap-2 text-slate-700">
              <MoreVertical className="w-4.5 h-4.5 cursor-pointer hover:text-slate-900" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Tier 4: Grouping Area */}
        {hasGrouping && (
          <div className="px-4 py-1.5 flex items-center gap-3 h-9 text-[13px] bg-white border-b border-slate-100" onClick={(e) => e.stopPropagation()}>
            <span className="text-slate-500 font-medium">Group by:</span>
            <div className="flex items-center gap-2">
              {activeGroups.map(g => (
                <div key={g} className="bg-white border border-cplace-blue text-cplace-blue px-2 py-0.5 rounded flex items-center gap-2 font-bold text-[11px] shadow-sm">
                  <Layers className="w-3.5 h-3.5 opacity-60" />
                  <span className="capitalize">{g}</span>
                  {groupSortOrders[g] === 'asc' ? <ArrowUpNarrowWide className="w-3.5 h-3.5" /> : <ArrowDownNarrowWide className="w-3.5 h-3.5" />}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-red-500" onClick={() => removeGroup(g)} />
                </div>
              ))}
            </div>
            <button 
              className="text-cplace-blue text-[13px] font-bold hover:underline ml-2" 
              onClick={toggleExpandAll}
            >
              {expandedIds.size > 0 ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        )}

        {/* Main Table Content */}
        <div className="flex-1 overflow-auto bg-white relative">
          <table className="w-full border-collapse table-fixed min-w-[1200px]">
            <thead className="sticky top-0 z-50">
              <tr className="h-[38px] bg-[#5f6b7d] text-white select-none">
                <th className={`${hasGrouping ? 'w-[320px]' : 'w-[48px]'} text-left text-[13px] font-bold relative p-0 h-[38px]`}>
                  <div className={`flex items-center ${hasGrouping ? 'gap-3 px-4' : 'justify-center'} h-full`}>
                    <Checkbox 
                      checked={selectedRowIds.size === rawData.length} 
                      indeterminate={selectedRowIds.size > 0 && selectedRowIds.size < rawData.length}
                      onChange={handleMasterSelect}
                    />
                    {hasGrouping && <span>Group</span>}
                  </div>
                </th>
                {COLUMNS.map(col => (
                  <th key={col.id} style={{ width: columnWidths[col.id] }} className="text-left text-[13px] font-bold relative p-0 h-[38px]">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1.5px] h-4 bg-white/30" />
                    <div className="flex items-center justify-between h-full px-4 relative">
                      <span className="truncate">{col.label}</span>
                      <button className="p-1 rounded hover:bg-white/20 transition-all ml-auto" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setHeaderMenu({ x: rect.left, y: rect.bottom + 5, colId: col.id }); }}>
                        <MoreVertical className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                      </button>
                    </div>
                    <div className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-cplace-blue/30" onMouseDown={(e) => onMouseDown(col.id, e)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flattenedList.map((node) => {
                const selState = getSelectionState(node);
                
                if (node.type === 'group') {
                  const indent = node.level > 0 ? (node.level * 24) : 0;
                  return (
                    <tr key={node.id} className="compact-row border-b border-slate-100 group/row select-none bg-white tr-hover" onClick={(e) => e.stopPropagation()}>
                      <td className="px-4 border-r border-slate-100">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
                            <Checkbox 
                              checked={selState === 'all'} 
                              indeterminate={selState === 'indeterminate'}
                              onChange={() => handleToggleSelect(node)}
                            />
                            <button className="p-0.5 rounded" onClick={() => { const next = new Set(expandedIds); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); setExpandedIds(next); }}>
                              {expandedIds.has(node.id) ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            </button>
                            <span className="font-bold text-slate-800 text-[13px] truncate">{node.groupValue}</span>
                            <span className="text-slate-400 font-bold text-[12px]">({node.itemCount})</span>
                        </div>
                      </td>
                      {COLUMNS.map(col => <td key={col.id} className="border-r border-slate-100" />)}
                    </tr>
                  );
                }
                
                if (node.type === 'total') {
                  return (
                    <tr key={node.id} className="compact-row border-b border-slate-100 bg-[#F8FAFC] font-bold" onClick={(e) => e.stopPropagation()}>
                      <td className="px-4 border-r border-slate-100">
                        <div className="flex items-center" style={{ paddingLeft: `${node.level * 24 + 48}px` }}>
                          <span className="text-slate-400 font-bold italic truncate text-[11px] uppercase tracking-wider">{node.label}</span>
                        </div>
                      </td>
                      {COLUMNS.map(col => (
                        <td key={col.id} className="px-4 text-right border-r border-slate-100 text-cplace-blue font-bold text-[13px]">
                          {node.stats[col.id]?.toLocaleString()}{col.unit === 'percent' ? '%' : ''}
                        </td>
                      ))}
                    </tr>
                  );
                }
                
                const row = node.data;
                const indent = (node.level > 0 ? node.level : 0) * 24;

                return (
                  <tr key={node.id} className="compact-row border-b border-slate-100 tr-hover bg-white group/data" onClick={(e) => e.stopPropagation()}>
                    <td className="px-4 border-r border-slate-100">
                      <div className={`flex items-center ${hasGrouping ? 'gap-2' : 'justify-center'}`} style={{ paddingLeft: hasGrouping ? `${indent}px` : '0px' }}>
                          <Checkbox 
                            checked={selectedRowIds.has(row.id)}
                            onChange={() => handleToggleSelect(node)}
                            className={`transition-opacity ${selectedRowIds.has(row.id) ? 'opacity-100' : 'opacity-0 group-hover/data:opacity-100'}`}
                          />
                      </div>
                    </td>
                    {COLUMNS.map(col => {
                      const cellKey = `${row.id}:${col.id}`;
                      const isSelected = selectedCells.has(cellKey);
                      const isNumeric = col.type === 'number';
                      const value = (row as any)[col.id];
                      return (
                        <td 
                          key={col.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellClick(row.id, col.id);
                          }}
                          className={`px-4 border-r border-slate-100 text-slate-600 truncate relative transition-all ${isSelected ? 'cell-selected' : ''} ${isNumeric ? 'text-right cursor-cell font-normal' : ''}`}
                        >
                          {isSelected && <div className="selection-ring" />}
                          {col.id === 'name' ? (
                              <div className="flex items-center h-full">
                                  <div className="bg-cplace-blue-light border border-cplace-blue/10 px-2 py-0.5 rounded-sm flex items-center">
                                      <span className="text-cplace-blue font-bold text-[13px] truncate">{row.name}</span>
                                  </div>
                              </div>
                          ) : col.type === 'person' ? (
                            <div className="flex items-center gap-2">
                              <div className="bg-cplace-blue-light border border-cplace-blue/20 px-1.5 py-0.5 rounded-md flex items-center gap-2 max-w-full">
                                <div className="w-4.5 h-4.5 rounded-full bg-cplace-blue text-white flex items-center justify-center text-[9px] font-black shrink-0">{row.manager.initials}</div>
                                <span className="text-cplace-blue font-bold text-[13px] truncate">{row.manager.name}</span>
                              </div>
                            </div>
                          ) : col.type === 'company' ? (
                            <span className="text-slate-800 font-medium truncate">{row.company.name}</span>
                          ) : col.type === 'boolean' ? (
                            <Checkbox checked={row.external} className="mx-auto" />
                          ) : col.type === 'date' ? '22.02.1992' : 
                          isNumeric ? `${value.toLocaleString()}${col.unit === 'percent' ? '%' : ''}` : 
                          String(value)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Brand Menu */}
          {headerMenu && (
            <div className="fixed bg-white rounded shadow-2xl border border-slate-200 py-1 w-64 z-[1000] animate-in fade-in zoom-in-95" style={{ left: headerMenu.x, top: headerMenu.y }} onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-2 hover:bg-[#F1F5F9] cursor-pointer flex items-center gap-3 text-slate-700">
                <Filter className="w-4 h-4 text-slate-400" /> <span className="text-[13px] font-medium">Filter</span>
              </div>
              <div className="h-px bg-slate-100 my-1" />
              <div className="px-4 py-2 hover:bg-[#F1F5F9] cursor-pointer flex items-center gap-3 text-slate-700" onClick={() => sortDataAction(headerMenu.colId, 'asc')}>
                <ArrowUp className="w-4 h-4 text-slate-400" /> <span className="text-[13px] font-medium">Sort ascending</span>
              </div>
              <div className="px-4 py-2 hover:bg-[#F1F5F9] cursor-pointer flex items-center gap-3 text-slate-700" onClick={() => sortDataAction(headerMenu.colId, 'desc')}>
                <ArrowDown className="w-4 h-4 text-slate-400" /> <span className="text-[13px] font-medium">Sort descending</span>
              </div>
              <div className="px-4 py-2 hover:bg-[#F1F5F9] cursor-pointer flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-3"><Pin className="w-4 h-4 text-slate-400" /> <span className="text-[13px] font-medium">Pin Column</span></div>
                <ChevronRight className="w-3 h-3 text-slate-300" />
              </div>
              <div className="h-px bg-slate-100 my-1" />
              <div className="px-4 py-2 hover:bg-[#F1F5F9] cursor-pointer flex items-center gap-3 text-slate-700">
                <span className="text-[13px] font-medium">Autosize this column</span>
              </div>
              <div className="px-4 py-2 hover:bg-[#F1F5F9] cursor-pointer flex items-center gap-3 text-slate-700">
                <span className="text-[13px] font-medium">Autosize all columns</span>
              </div>
              <div className="h-px bg-slate-100 my-1" />
              {activeGroups.includes(headerMenu.colId) ? (
                <div className="px-4 py-2 bg-[#E6F2F9] hover:bg-[#D9EAF5] cursor-pointer flex items-center gap-3 text-cplace-blue font-bold" onClick={() => removeGroup(headerMenu.colId)}>
                    <Layers className="w-4 h-4" /> <span className="text-[13px]">Ungroup by {headerMenu.colId}</span>
                </div>
              ) : (
                <>
                  <div className="px-4 py-2 hover:bg-[#E6F2F9] cursor-pointer flex items-center gap-3 text-slate-700" onClick={() => toggleGroupAction(headerMenu.colId, 'asc')}>
                      <Layers className="w-4 h-4 text-slate-400" /> <span className="text-[13px] font-medium">Group ascending</span>
                  </div>
                  <div className="px-4 py-2 hover:bg-[#E6F2F9] cursor-pointer flex items-center gap-3 text-slate-700" onClick={() => toggleGroupAction(headerMenu.colId, 'desc')}>
                      <Layers className="w-4 h-4 text-slate-400" /> <span className="text-[13px] font-medium">Group descending</span>
                  </div>
                </>
              )}
              <div className="h-px bg-slate-100 my-1" />
              <div className="px-4 py-2 hover:bg-[#F1F5F9] cursor-pointer flex items-center gap-3 text-slate-700" onClick={() => { setDataSort(null); setActiveGroups([]); setHeaderMenu(null); }}>
                <RotateCcw className="w-4 h-4 text-slate-400" /> <span className="text-[13px] font-medium">Reset columns</span>
              </div>
            </div>
          )}
        </div>

        {/* Math Footer Bar - Conditionally hidden by ENABLE_CALCULATIONS flag */}
        {ENABLE_CALCULATIONS && selectedCells.size > 0 && (
          <div className="h-11 bg-[#1e293b] text-white flex items-center px-4 justify-between z-50 shrink-0 shadow-2xl border-t border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="bg-cplace-blue px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest uppercase">SELECTED</div>
              {adHocStats?.unitsMismatch ? (
                <div className="flex items-center gap-2 bg-yellow-500 text-black px-2.5 py-0.5 rounded font-black text-[10px] uppercase tracking-tighter">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>UNITS MISMATCH (MATH DISABLED)</span>
                </div>
              ) : (
                <span className="text-slate-400 font-bold text-[12px]">{selectedCells.size} items selected</span>
              )}
            </div>
            <div className="flex items-center gap-6">
              {!adHocStats?.unitsMismatch && (
                <div className="flex items-center gap-6 text-[12px] font-bold">
                  {Array.from(activeAggs).map((agg) => (
                    <div key={agg as string} className="flex items-center gap-2">
                      <span className="opacity-40 uppercase text-[10px] tracking-widest">{agg}</span>
                      <span className="text-cplace-blue font-black bg-white/10 px-2 rounded-sm tracking-tight text-[13px]">
                        {(adHocStats as any)?.[agg as string]?.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowAggMenu(!showAggMenu); }} className={`p-1.5 rounded transition-colors ${showAggMenu ? 'bg-cplace-blue' : 'hover:bg-slate-700'}`}><Sigma className="w-4.5 h-4.5" /></button>
                {showAggMenu && (
                  <div className="absolute bottom-12 right-0 w-48 bg-white rounded shadow-2xl border border-slate-200 text-slate-800 py-1" onClick={(e) => e.stopPropagation()}>
                    {['sum', 'avg', 'min', 'max', 'count'].map((f) => (
                      <button key={f} onClick={() => { const next = new Set(activeAggs); if (next.has(f as any)) next.delete(f as any); else next.add(f as any); setActiveAggs(next); }} className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition-colors">
                        <span className="capitalize font-bold text-[13px]">{f}</span>
                        {activeAggs.has(f as any) && <Check className="w-4 h-4 text-cplace-blue" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <X className="w-5 h-5 text-slate-500 cursor-pointer hover:text-white" onClick={() => setSelectedCells(new Set())} />
            </div>
          </div>
        )}

        {/* Bottom Footer Status */}
        <footer className="h-7 bg-[#E9EDF0] border-t border-slate-200 flex items-center px-4 justify-between shrink-0 text-slate-500 font-bold text-[10px] uppercase tracking-widest" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-4">
              <span className="text-cplace-blue">cplace NextGen Platform</span>
              <div className="h-3 w-px bg-slate-300" />
              <span className="opacity-60">Layout: Compact</span>
          </div>
          <div className="flex items-center gap-4">
              <span className="opacity-60">{rawData.length} hits | {selectedRowIds.size} rows selected</span>
              <div className="h-3 w-px bg-slate-300" />
              <span className="opacity-60">Unit_Consistency: High</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function HomeIcon(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

import { useState, useEffect, useRef, useMemo } from 'react';
import clsx from 'clsx';
import BreezeIcon from './BreezeIcon.jsx';
import { filterVersions } from '../../panel/services/mcjarsService.js';

const VersionCombobox = ({
  versions = [],
  selectedVersion,
  onSelect,
  loading = false,
  error = null,
  onRetry,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Sync search input with selected version when not actively searching
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(selectedVersion || '');
    }
  }, [selectedVersion, isOpen]);

  // Filtered versions based on typing
  const filtered = useMemo(() => {
    return filterVersions(versions, searchQuery);
  }, [versions, searchQuery]);

  // Reset highlight index on filter change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current && listRef.current.children[highlightedIndex]) {
      const activeEl = listRef.current.children[highlightedIndex];
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery(selectedVersion || '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedVersion]);

  const handleSelect = (vObj) => {
    onSelect(vObj.version, vObj.java || 21);
    setSearchQuery(vObj.version);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (loading) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery(selectedVersion || '');
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={clsx('relative w-full flex flex-col gap-1.5', className)}>
      <label className="text-xs font-semibold uppercase tracking-wider text-p4 flex items-center justify-between">
        <span>
          Minecraft Version <span className="text-p1">*</span>
        </span>
        {selectedVersion && (
          <span className="text-[11px] text-p5 font-normal lowercase tracking-normal">
            selected: <strong className="text-p1 font-mono uppercase">{selectedVersion}</strong>
          </span>
        )}
      </label>

      {/* Input Field Container */}
      <div className="relative group transition-all duration-500">
        <div
          onClick={() => {
            if (!loading) {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
          className={clsx(
            'flex items-center min-h-[46px] px-4 rounded-2xl bg-s1 border-2 transition-all duration-500 cursor-text',
            isOpen ? 'border-s4 shadow-500' : 'border-s3 hover:border-s4/60',
            error && 'border-red-500/50',
          )}
        >
          <BreezeIcon name="Search" size={16} className="text-p5/50 flex-shrink-0 mr-3 pointer-events-none" />

          <input
            ref={inputRef}
            type="text"
            placeholder={loading ? 'Loading available versions...' : 'Search or type a Minecraft version (e.g. 1.21.1)...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="w-full bg-transparent text-p4 text-sm font-mono placeholder:text-p5/40 placeholder:font-sans outline-none py-2"
          />

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {loading ? (
              <BreezeIcon name="Loader2" size={16} className="text-p1" />
            ) : (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(!isOpen);
                }}
                className="p-1 rounded-lg text-p5 hover:text-p4 transition-colors"
              >
                <BreezeIcon
                  name="ChevronDown"
                  size={15}
                  className={clsx('transition-transform duration-300', isOpen && 'rotate-180 text-p1')}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error state with retry */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 mt-1">
          <div className="flex items-center gap-2">
            <BreezeIcon name="AlertCircle" size={15} />
            <span>{error}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1 font-semibold text-p1 hover:underline ml-2"
            >
              <BreezeIcon name="RefreshCw" size={12} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Dropdown Options List */}
      {isOpen && !loading && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-s2 border-2 border-s3 rounded-2xl shadow-500 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-s3 bg-s1 flex items-center justify-between text-[11px] text-p5 px-3">
            <span>
              {filtered.length} {filtered.length === 1 ? 'version' : 'versions'} available
            </span>
            <span className="text-p5/60 hidden sm:inline">Use ↑↓ keys to navigate, Enter to select</span>
          </div>

          <div ref={listRef} className="max-h-60 overflow-y-auto p-1.5 flex flex-col gap-0.5 scroll-hide">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-p5 flex flex-col items-center gap-1.5">
                <BreezeIcon name="Search" size={20} className="text-p5/40 mb-1" />
                <p className="text-xs font-semibold text-p4">No matching versions</p>
                <p className="text-[11px] text-p5/70">
                  Version &ldquo;{searchQuery}&rdquo; is not available for this software.
                </p>
              </div>
            ) : (
              filtered.map((vObj, idx) => {
                const isSelected = selectedVersion === vObj.version;
                const isHighlighted = highlightedIndex === idx;

                return (
                  <div
                    key={vObj.version}
                    onClick={() => handleSelect(vObj)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={clsx(
                      'px-3.5 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-200',
                      isSelected
                        ? 'g4 text-p1 font-bold border border-s4/40 shadow-400'
                        : isHighlighted
                        ? 'bg-s5/60 text-p4'
                        : 'text-p5 hover:bg-s5/40 hover:text-p4',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-semibold">{vObj.version}</span>
                      {vObj.type === 'SNAPSHOT' && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Snapshot
                        </span>
                      )}
                      {idx === 0 && vObj.type === 'RELEASE' && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Latest Release
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-p5/60 font-mono">Java {vObj.java || 21}</span>
                      {isSelected && <BreezeIcon name="Check" size={15} className="text-p1 flex-shrink-0" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionCombobox;

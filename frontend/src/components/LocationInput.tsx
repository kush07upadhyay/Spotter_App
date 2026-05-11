import { useState, useRef, useEffect, useCallback } from 'react';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationInput({ value, onChange, placeholder, required, className }: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&limit=5&q=${encodeURIComponent(query)}`,
        { headers: { 'Accept': 'application/json' } }
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowDropdown(data.length > 0);
      setHighlightIdx(-1);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = (item: NominatimResult) => {
    // Shorten: take first 2-3 meaningful parts
    const parts = item.display_name.split(', ');
    const short = parts.length >= 3 ? `${parts[0]}, ${parts[parts.length - 3]}, ${parts[parts.length - 2]}` : item.display_name;
    onChange(short);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {suggestions.map((item, i) => (
            <li
              key={i}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors
                ${i === highlightIdx ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              {item.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

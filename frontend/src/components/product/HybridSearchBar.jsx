import { useEffect, useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';

const SAMPLE_PROMPTS = [
  'wireless headphones under $260',
  'minimalist walnut desk setup',
  'pour over coffee kettle',
  'quiet air purifier in stock',
];

export function HybridSearchBar({
  value = '',
  onSearch,
  placeholder = 'Search by style, need, or budget (e.g. "headphones under $260")…',
  showHints = true,
  compact = false,
}) {
  const [input, setInput] = useState(value);

  useEffect(() => {
    setInput(value);
  }, [value]);

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(input.trim());
  }

  function handleClear() {
    setInput('');
    onSearch('');
  }

  return (
    <div className={`hybrid-search ${compact ? 'hybrid-search--compact' : ''}`}>
      <form className="hybrid-search__form" onSubmit={handleSubmit} role="search">
        <span className="hybrid-search__badge" title="Smart Product Search">
          <Sparkles size={14} />
          {!compact && <span>Smart Search</span>}
        </span>
        <input
          type="search"
          className="hybrid-search__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          aria-label="Search products"
        />
        {input && (
          <button
            type="button"
            className="hybrid-search__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
        <button type="submit" className="btn btn--primary hybrid-search__submit">
          <Search size={16} />
          <span>Search</span>
        </button>
      </form>

      {showHints && (
        <div className="hybrid-search__hints">
          <span className="hybrid-search__hints-label">Try:</span>
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="chip chip--interactive"
              onClick={() => {
                setInput(prompt);
                onSearch(prompt);
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


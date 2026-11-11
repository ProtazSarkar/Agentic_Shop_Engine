import { useState } from 'react';

export function ProductImage({ src, alt, className = '', ...rest }) {
  const [errored, setErrored] = useState(false);
  const resolvedSrc = !errored && src ? src : '/images/products/fallback.svg';

  return (
    <img
      src={resolvedSrc}
      alt={alt || 'Product image'}
      className={className}
      onError={() => setErrored(true)}
      loading="lazy"
      {...rest}
    />
  );
}


import React, { useEffect, useState } from 'react';

type DeferredEmbedProps = React.IframeHTMLAttributes<HTMLIFrameElement> & {
  title: string;
  src: string;
};

/** Same-sized box until after hydration, then the real iframe. */
export function DeferredEmbed({ title, src, className, style, ...rest }: DeferredEmbedProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <div className={className} style={style} data-hh-embed={title} />;
  }

  return <iframe title={title} src={src} className={className} style={style} {...rest} />;
}

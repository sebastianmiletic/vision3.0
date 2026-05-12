import type { HTMLAttributes } from 'react';

type LegacyHtmlSectionProps = HTMLAttributes<HTMLElement> & {
  html: string;
  as?: 'div' | 'section' | 'aside' | 'header' | 'main';
};

export function LegacyHtmlSection({ html, as = 'div', ...props }: LegacyHtmlSectionProps) {
  const Tag = as;
  return <Tag {...props} dangerouslySetInnerHTML={{ __html: html }} />;
}

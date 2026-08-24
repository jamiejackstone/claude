import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

export const VALID_GO_SLUGS = [
  'aylesbury',
  'great-missenden',
  'holmer-green',
  'bicester',
  'wendover',
  'oxford',
  'marlow',
  'tring',
  'sandhurst',
] as const;

export type GoSlug = (typeof VALID_GO_SLUGS)[number];

export const GoRedirect: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const normalizedSlug = (slug || '').toLowerCase().trim();
    const isValid = (VALID_GO_SLUGS as readonly string[]).includes(normalizedSlug);

    if (!isValid) {
      navigate('/', { replace: true });
      return;
    }

    const src = searchParams.get('src');
    let utmSource = 'print';
    if (src === 'banner') {
      utmSource = 'banner';
    } else if (src === 'flyer') {
      utmSource = 'flyer';
    }

    const destination = `/location/${normalizedSlug}?utm_source=${utmSource}&utm_medium=print&utm_campaign=sep26&utm_content=${normalizedSlug}`;
    navigate(destination, { replace: true });
  }, [slug, searchParams, navigate]);

  return null;
};

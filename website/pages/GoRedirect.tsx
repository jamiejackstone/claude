import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { buildGoDestination, CLICK_ID_PARAMS, pathWithTrackedParams, readTrackedParams } from '../lib/clickTracking';

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
      navigate(pathWithTrackedParams('/'), { replace: true });
      return;
    }

    const src = searchParams.get('src');
    let utmSource = 'print';
    if (src === 'banner') {
      utmSource = 'banner';
    } else if (src === 'flyer') {
      utmSource = 'flyer';
    }

    const params = new URLSearchParams(searchParams);
    const stored = readTrackedParams();
    for (const key of CLICK_ID_PARAMS) {
      const value = stored[key];
      if (value && !params.get(key)) params.set(key, value);
    }

    const absolute = buildGoDestination(window.location.origin, normalizedSlug, utmSource, params.toString());
    const dest = new URL(absolute);
    navigate(`${dest.pathname}${dest.search}`, { replace: true });
  }, [slug, searchParams, navigate]);

  return null;
};

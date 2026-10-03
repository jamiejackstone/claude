import React, { useEffect, useState } from 'react';
import { getClickIdsForLead } from '../lib/clickTracking';
import { tasterClickRequestBody } from '../lib/leadPayloads';
import { subscribeTasterPrecapture } from '../lib/tasterPrecapture';

/**
 * Shown only when TASTER_PRECAPTURE_ENABLED is true.
 * Collects the parent name and email, posts click ids to the Worker, then
 * continues to the same TeamUp URL.
 */
export const TasterPrecaptureHost: React.FC = () => {
  const [destination, setDestination] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeTasterPrecapture((url) => {
    setDestination(url);
    setError(null);
  }), []);

  if (!destination) return null;

  const goToTeamUp = () => {
    window.location.assign(destination);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/taster-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasterClickRequestBody({
          name,
          email,
          clickIds: getClickIdsForLead(),
        })),
      });
      if (!response.ok) {
        setError('We could not save your details. You can still continue to booking.');
        setSaving(false);
        return;
      }
      goToTeamUp();
    } catch {
      setError('We could not save your details. You can still continue to booking.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-brand-dark/70 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border-4 border-brand-dark shadow-sticker w-full max-w-md p-6 space-y-4">
        <h2 className="font-display text-3xl uppercase text-brand-dark">Book a free taster</h2>
        <p className="text-slate-600 font-medium text-sm">
          Add your name and email, then we will take you to the booking page.
        </p>
        <label className="block text-sm font-bold text-brand-dark">
          Parent name
          <input
            required
            type="text"
            name="parent_name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold"
          />
        </label>
        <label className="block text-sm font-bold text-brand-dark">
          Email
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold"
          />
        </label>
        {error && <p className="text-sm font-bold text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-orange text-brand-dark font-display uppercase tracking-wide py-3 rounded-full border-2 border-brand-dark"
        >
          {saving ? 'Saving...' : 'Continue to booking'}
        </button>
        <button
          type="button"
          onClick={() => setDestination(null)}
          className="w-full text-sm font-bold text-slate-500"
        >
          Cancel
        </button>
      </form>
    </div>
  );
};

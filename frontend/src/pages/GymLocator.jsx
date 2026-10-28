import  { useEffect, useMemo, useState } from 'react';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import { gymService } from '../services/api';
import { CITIES, asList, errText, normaliseGym, openMaps } from '../lib/wellness';
import { Banner, Empty, Spinner, TierBadge, input, td, th } from '../components/ui';

export default function GymLocator({ defaultCity = 'Mumbai' }) {
  const [city, setCity] = useState(defaultCity);
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    gymService
      .getGyms(city ? { city } : {})
      .then((res) => setGyms(asList(res?.data, 'gyms').map(normaliseGym)))
      .catch((err) => setError(errText(err, 'Could not load gyms')))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [city]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return gyms.filter(
      (g) =>
        (!type || g.type === type) &&
        (!s || [g.name, g.area, g.address].some((v) => String(v || '').toLowerCase().includes(s)))
    );
  }, [gyms, type, q]);

  return (
    <div>
      <h2 className="mb-4 text-[22px] font-bold leading-[34.1px] tracking-[-0.22px] text-[var(--ink)]">Gym Locator</h2>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
        <select className={input} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className={input} value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          <option value="">All types</option>
          <option value="ELITE">ELITE</option>
          <option value="PRO">PRO</option>
        </select>
        <div className="relative">
          <SearchOutlined
            sx={{ fontSize: 16 }}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
          />
          <input
            className={`${input} pl-9`}
            placeholder="Search area / gym name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <Banner onRetry={load}>{error}</Banner>

      {loading ? (
        <Spinner label="Loading centres…" />
      ) : !visible.length ? (
        <Empty icon={PlaceOutlined} title="No centres found">
          Try a different city, type or search.
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
          <table className="w-full">
            <thead>
              <tr>
                {['Gym / Centre', 'Type', 'Area', 'City', 'Address', 'Location'].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((g) => (
                <tr key={g._id || `${g.name}-${g.city}`} className="hover:bg-[var(--surface-2)]">
                  <td className={`${td} font-semibold text-[var(--ink)]`}>{g.name}</td>
                  <td className={td}>{g.type ? <TierBadge tier={g.type} /> : '—'}</td>
                  <td className={td}>{g.area || '—'}</td>
                  <td className={td}>{g.city || '—'}</td>
                  <td className={`${td} text-[11px]`}>{g.address || '—'}</td>
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => openMaps(g)}
                      className="inline-flex items-center gap-1 whitespace-nowrap font-bold text-[var(--action)] hover:text-[var(--action-hover)] hover:underline"
                    >
                      <OpenInNewOutlined sx={{ fontSize: 13 }} /> Open in Google Maps
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px] text-[var(--muted-2)]">{visible.length} centre(s) shown</p>
    </div>
  );
}

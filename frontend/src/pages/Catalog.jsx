import React, { useState, useEffect } from 'react';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import { packageService } from '../services/api';

/* Local button recipes matching the spec (section 6.2). */
const btnBase = 'inline-flex items-center justify-center gap-1.5 font-bold transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimary = `${btnBase} h-9 rounded-[4px] px-4 text-[13px] text-white bg-[var(--action)] hover:bg-[var(--action-hover)]`;
const btnPrimarySm = `${btnBase} h-[30px] rounded-[4px] px-3 text-[12px] text-white bg-[var(--action)] hover:bg-[var(--action-hover)]`;

export default function Catalog({ 
  setCurrentView, 
  setSelectedForCompare, 
  selectedForCompare, 
  setActivePackage 
}) {
  const [city, setCity] = useState('Mumbai');
  const [duration, setDuration] = useState(3);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    packageService.getAll(city).then((res) => setPackages(res.data));
  }, [city]);

  return (
    <div>
      {/* Banner */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-[12px] p-8 text-white shadow-[var(--shadow-card)] md:flex-row md:items-center" style={{ background: 'linear-gradient(135deg, var(--brand), var(--action))' }}>
        <div>
          <span className="rounded-[999px] bg-white/20 px-[9px] py-[3px] text-[11px] font-bold capitalize tracking-[0.33px]">
            Window Open
          </span>
          <h1 className="mt-2 text-[22px] font-bold leading-[34.1px] tracking-[-0.22px]">Exclusive Corporate Wellness Passes</h1>
          <p className="mt-1 text-[13px] opacity-95">
            Enrolment closes Oct 31, 2026. Payroll deduction spread over 3 equal monthly installments.
          </p>
        </div>
        <select 
          value={city} 
          onChange={(e) => setCity(e.target.value)}
          className="h-[38px] cursor-pointer rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[13px] font-semibold text-[var(--ink)] outline-none transition-colors duration-[120ms] hover:border-[var(--input-hover-border)] focus:border-[var(--brand)] focus:shadow-[var(--focus-ring)]"
        >
          <option value="Mumbai">Mumbai</option>
          <option value="Pune">Pune</option>
          <option value="Bengaluru">Bengaluru</option>
          <option value="Delhi NCR">Delhi NCR</option>
          <option value="Hyderabad">Hyderabad</option>
        </select>
      </div>

      {/* Duration Chips */}
      <div className="mb-6 flex gap-3">
        {[1, 3, 6, 12].map((d) => (
          <button 
            key={d} 
            onClick={() => setDuration(d)}
            className={`inline-flex items-center rounded-[999px] px-[11px] py-[5px] text-[12px] font-bold transition-colors duration-[120ms] ${
              duration === d
                ? 'bg-[var(--brand)] text-white'
                : 'bg-[var(--surface-3)] text-[var(--ink-2)] hover:bg-[var(--navy-tint)] hover:text-[var(--brand)]'
            }`}
          >
            {d} Month{d > 1 ? 's' : ''}
          </button>
        ))}
      </div>

      {/* Package Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {packages.filter(p => p.durationMonths === duration).map((pkg) => (
          <div key={pkg._id} className="flex flex-col justify-between rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-overlay)]">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-[999px] bg-[var(--surface-3)] px-[9px] py-[3px] text-[11px] font-bold capitalize tracking-[0.33px] text-[var(--ink-2)]">
                  {pkg.packageName}
                </span>
                <span className="rounded-[999px] bg-[var(--success-soft)] px-[9px] py-[3px] text-[11px] font-bold text-[var(--success-text)]">
                  Corporate Subsidized
                </span>
              </div>
              <div className="mb-4">
                <span className="text-[13px] text-[var(--muted-2)] line-through">₹{pkg.mrp}</span>
                <div className="text-[22px] font-extrabold text-[var(--ink)]">
                  ₹{pkg.corporatePriceInclGst} <span className="text-[11px] font-normal text-[var(--muted)]">incl. GST</span>
                </div>
              </div>
              <p className="mb-6 rounded-[8px] bg-[var(--surface-2)] p-3 text-[11px] leading-relaxed text-[var(--ink-2)]">
                {pkg.inclusions}
              </p>
            </div>
            <div>
              <div className="mb-4 flex items-center justify-between border-t border-[var(--line-soft)] pt-4 text-[11px] font-semibold text-[var(--muted)]">
                <span>Deduction: ₹{Math.round(pkg.corporatePriceInclGst / 3)} /mo</span>
                <label className="flex cursor-pointer items-center gap-1 text-[var(--ink-2)]">
                  <input 
                    type="checkbox" 
                    checked={selectedForCompare.includes(pkg._id)}
                    style={{ accentColor: 'var(--action)' }}
                    onChange={() => {
                      if (selectedForCompare.includes(pkg._id)) {
                        setSelectedForCompare(selectedForCompare.filter(id => id !== pkg._id));
                      } else if (selectedForCompare.length < 3) {
                        setSelectedForCompare([...selectedForCompare, pkg._id]);
                      }
                    }}
                  /> Compare
                </label>
              </div>
              <button 
                onClick={() => { setActivePackage(pkg); setCurrentView('form'); }}
                className={`${btnPrimary} w-full`}
              >
                Opt for {pkg.packageName}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Compare Floating Drawer */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-6 py-4 shadow-[var(--shadow-overlay)]">
          <span className="text-[13px] font-medium text-[var(--ink)]">{selectedForCompare.length} selected for comparison</span>
          <button 
            onClick={() => setCurrentView('compare')}
            className={btnPrimarySm}
          >
            <SwapHorizOutlined sx={{ fontSize: 14 }} /> Compare Now
          </button>
        </div>
      )}
    </div>
  );
}

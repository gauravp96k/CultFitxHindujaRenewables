import { useEffect, useMemo, useState } from 'react';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import { requestService } from '../../services/api';
import { POLICY_VERSION, asList, can, normaliseRequest } from '../../lib/wellness';
import { Banner, IconButton, Note, PageHeader, btn } from '../../components/ui';
import DataTable from '../../components/DataTable';

/*
 * Policy Management (wireframe "h-pol"): the published policy document, who has
 * acknowledged it, and view / download. Upload is not supported by the backend yet,
 * so the button is shown disabled.
 */

// Same file and metadata as the employee Policy page (pages/Policy.jsx).
const PDF_URL = '/policy/HREPL-Corporate-Gym-Membership-Policy.pdf';
const PDF_NAME = 'HREPL-Corporate-Gym-Membership-Policy.pdf';
const EFFECTIVE = '14 Oct 2026';
const APPROVED_BY = 'Adithiya Venkataraman';

const viewPdf = () => window.open(PDF_URL, '_blank', 'noopener,noreferrer');
const downloadPdf = () => {
  const link = document.createElement('a');
  link.href = PDF_URL;
  link.download = PDF_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const PublishedBadge = () => (
  <span className="inline-flex rounded-[999px] bg-[var(--success-soft)] px-[9px] py-[3px] text-[11px] font-bold leading-[17.05px] text-[var(--success-text)]">
    Published
  </span>
);

export default function HrPolicy({ user, crumbs }) {
  const canSeeOptIns = can(user, 'viewOptIns', 'reports', 'serviceTracking');
  const [pdfMissing, setPdfMissing] = useState(false);
  const [ack, setAck] = useState(null); // { accepted, total } once loaded
  const [ackFailed, setAckFailed] = useState(false);

  // Vite serves index.html for missing files, so check the response is really a PDF.
  useEffect(() => {
    let alive = true;
    fetch(PDF_URL, { method: 'HEAD' })
      .then((r) => alive && setPdfMissing(!r.ok || !String(r.headers.get('content-type') || '').includes('pdf')))
      .catch(() => alive && setPdfMissing(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!canSeeOptIns) return undefined;
    let alive = true;
    requestService
      .getAllOptIns()
      .then((res) => {
        if (!alive) return;
        const live = asList(res?.data, 'requests').map(normaliseRequest).filter((r) => r.status !== 'Rejected');
        setAck({ accepted: live.filter((r) => r.declarationsAccepted).length, total: live.length });
      })
      .catch(() => alive && setAckFailed(true));
    return () => {
      alive = false;
    };
  }, [canSeeOptIns]);

  const acknowledged = !canSeeOptIns || ackFailed ? '—' : ack ? `${ack.accepted} / ${ack.total}` : '…';

  const rows = useMemo(
    () => [
      {
        _id: 'wellness-policy',
        document: 'Corporate Wellness Policy',
        version: POLICY_VERSION,
        effective: EFFECTIVE,
        approvedBy: APPROVED_BY,
        acknowledged,
      },
    ],
    [acknowledged]
  );

  const columns = [
    { key: 'document', header: 'Document', width: '24%', render: (r) => <span className="font-bold text-[var(--ink-2)]">{r.document}</span>, title: (r) => r.document },
    { key: 'version', header: 'Version', width: '9%' },
    { key: 'effective', header: 'Effective', width: '12%' },
    { key: 'approvedBy', header: 'Approved by', width: '18%' },
    {
      key: 'acknowledged',
      header: 'Acknowledged',
      width: '13%',
      align: 'center',
      title: () => (canSeeOptIns ? 'Employees who accepted the declarations / opt-ins (excluding rejected)' : 'Needs access to opt-ins'),
    },
    { key: 'status', header: 'Status', width: '12%', align: 'center', render: () => <PublishedBadge />, title: () => 'Published' },
    {
      key: 'actions',
      header: 'Actions',
      width: '12%',
      align: 'center',
      title: () => undefined,
      render: () => (
        <span className="inline-flex items-center gap-0.5">
          <IconButton icon={VisibilityOutlined} label="View" onClick={viewPdf} disabled={pdfMissing} />
          <IconButton icon={FileDownloadOutlined} label="Download" onClick={downloadPdf} disabled={pdfMissing} />
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={crumbs}
        title="Policy Management"
        actions={
          // Wrapper carries the tooltip because disabled buttons don't always show one.
          <span title="Not available yet">
            <button type="button" className={`${btn.primary}${btn.sm}`} disabled title="Not available yet">
              Upload new version
            </button>
          </span>
        }
      />

      {pdfMissing && (
        <Banner type="error">
          The policy PDF was not found. Save it as frontend/public/policy/{PDF_NAME} and refresh the page.
        </Banner>
      )}

      <DataTable columns={columns} rows={rows} pageSize={13} minWidth={820} />

      <Note>
        To publish a new version today, replace the PDF file at frontend/public/policy/HREPL-Corporate-Gym-Membership-Policy.pdf
        and update the version in the code. In-app upload with version history is planned.
      </Note>
    </div>
  );
}

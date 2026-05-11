import { useRef, useEffect, useCallback } from 'react';
import type { DailyLog } from '../api';
import { Download } from 'lucide-react';

interface LogSheetProps {
  log: DailyLog;
  dayNumber: number;
  totalDays?: number;
  currentCycleUsed?: number;
}

/* ─── Status mapping ─────────────────────────────────────────────────────── */
const STATUS_ROW: Record<string, number> = {
  OFF_DUTY: 0,
  SLEEPER: 1,
  DRIVING: 2,
  ON_DUTY: 3,
};

const STATUS_COLORS: Record<string, string> = {
  OFF_DUTY: '#4338ca',   // indigo
  SLEEPER: '#7c3aed',    // violet
  DRIVING: '#047857',    // emerald
  ON_DUTY: '#b45309',    // amber
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export function LogSheet({ log, dayNumber, totalDays, currentCycleUsed }: LogSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1100;
    const H = 780;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    renderLog(ctx, W, H, log, dayNumber, totalDays, currentCycleUsed);
  }, [log, dayNumber, totalDays, currentCycleUsed]);

  useEffect(() => { draw(); }, [draw]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `eld-log-day-${dayNumber}-${log.date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Title bar */}
      <div className="px-5 py-3 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white text-sm">
            Day {dayNumber}{totalDays ? ` of ${totalDays}` : ''} — {formatDate(log.date)}
          </h3>
          <p className="text-slate-300 text-xs mt-0.5">
            {log.total_miles.toFixed(0)} miles · {log.driving_hours.toFixed(1)}h driving · {log.on_duty_hours.toFixed(1)}h on-duty
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-all"
        >
          <Download className="w-3.5 h-3.5" /> Download PNG
        </button>
      </div>

      {/* Canvas */}
      <div className="p-3 overflow-x-auto bg-slate-50">
        <canvas ref={canvasRef} className="border border-slate-300 rounded shadow-inner" />
      </div>

      {/* Remarks */}
      {log.remarks.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Remarks & Locations</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {log.remarks.map((r, i) => (
              <p key={i} className="text-xs text-slate-600 flex items-start gap-1">
                <span className="text-slate-400 mt-0.5">•</span> {r}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/* ═══════════════════════════════════════════════════════════════════════════
   CANVAS RENDERING — Matches FMCSA Driver's Daily Log format
   ═══════════════════════════════════════════════════════════════════════════ */
function renderLog(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  log: DailyLog,
  dayNumber: number,
  totalDays?: number,
  currentCycleUsed?: number,
) {
  const M = 24;             // margin
  const HEADER_H = 130;     // header section height
  const GRID_TOP = HEADER_H + 35;
  const GRID_LEFT = 185;
  const GRID_RIGHT = W - 80;
  const GRID_W = GRID_RIGHT - GRID_LEFT;
  const ROW_H = 45;
  const NUM_ROWS = 4;
  const GRID_H = ROW_H * NUM_ROWS;
  const HOUR_W = GRID_W / 24;

  const dateObj = new Date(log.date + 'T00:00:00');

  // ── White background ──
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER SECTION
  // ══════════════════════════════════════════════════════════════════════════

  // Title bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, 42);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('U.S. DEPARTMENT OF TRANSPORTATION', M + 2, 17);
  ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`DRIVER'S DAILY LOG — Day ${dayNumber}${totalDays ? ' of ' + totalDays : ''}`, M + 2, 35);

  ctx.font = '11px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('(24 Hours — One Calendar Day)', W - M, 17);
  ctx.fillText('Original – File at home terminal', W - M, 32);
  ctx.textAlign = 'left';

  // ── Header fields (two-row layout matching FMCSA form) ──
  const fy1 = 58;
  const fy2 = 82;
  const fy3 = 106;

  // Row 1
  _field(ctx, M, fy1, 'Date:', `${dateObj.getMonth() + 1} / ${dateObj.getDate()} / ${dateObj.getFullYear()}`);
  _field(ctx, 230, fy1, 'From:', log.remarks[0]?.split(' - ')[1]?.split('(')[1]?.replace(')', '') || '—');
  _field(ctx, 480, fy1, 'To:', log.remarks[log.remarks.length - 1]?.split('(')[1]?.replace(')', '') || '—');

  // Row 2
  _field(ctx, M, fy2, 'Total Miles Driving Today:', `${log.total_miles.toFixed(0)}`);
  _field(ctx, 340, fy2, 'Total Mileage Today:', `${log.total_miles.toFixed(0)}`);
  _field(ctx, 600, fy2, 'Name of Carrier:', 'Trucker Tracker LLC');

  // Row 3
  _field(ctx, M, fy3, 'Truck/Tractor & Trailer No.:', 'Unit 1024 / TR-5587');
  _field(ctx, 400, fy3, 'Main Office Address:', 'Dallas, TX');
  _field(ctx, 700, fy3, 'Home Terminal:', 'Dallas, TX');

  // Separator line
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, HEADER_H + 10);
  ctx.lineTo(W - M, HEADER_H + 10);
  ctx.stroke();

  // ══════════════════════════════════════════════════════════════════════════
  // GRID SECTION — 24hr graph with 15-min increments, 4 status rows
  // ══════════════════════════════════════════════════════════════════════════

  // ── Row labels (left side) ──
  const rowLabels = [
    '1. Off Duty',
    '2. Sleeper\n    Berth',
    '3. Driving',
    '4. On Duty\n    (Not Driving)',
  ];
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < NUM_ROWS; i++) {
    const cy = GRID_TOP + i * ROW_H + ROW_H / 2;
    const lines = rowLabels[i].split('\n');
    if (lines.length === 1) {
      ctx.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(lines[0], M, cy + 4);
    } else {
      ctx.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(lines[0], M, cy - 2);
      ctx.font = '10px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(lines[1], M, cy + 12);
    }
  }

  // ── Hour labels (top) ──
  ctx.textAlign = 'center';
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
  for (let h = 0; h <= 24; h++) {
    const x = GRID_LEFT + h * HOUR_W;
    let label: string;
    if (h === 0) label = 'Mid-\nnight';
    else if (h === 12) label = 'Noon';
    else if (h === 24) label = 'Mid-\nnight';
    else if (h > 12) label = String(h - 12);
    else label = String(h);

    if (label.includes('\n')) {
      const parts = label.split('\n');
      ctx.fillText(parts[0], x, GRID_TOP - 20);
      ctx.fillText(parts[1], x, GRID_TOP - 9);
    } else {
      ctx.fillText(label, x, GRID_TOP - 10);
    }
  }
  ctx.textAlign = 'left';

  // ── Grid background with alternating row colors ──
  for (let i = 0; i < NUM_ROWS; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#f1f5f9';
    ctx.fillRect(GRID_LEFT, GRID_TOP + i * ROW_H, GRID_W, ROW_H);
  }

  // ── Grid lines — horizontal ──
  ctx.lineWidth = 1;
  for (let i = 0; i <= NUM_ROWS; i++) {
    const y = GRID_TOP + i * ROW_H;
    ctx.strokeStyle = i === 0 || i === NUM_ROWS ? '#1e293b' : '#94a3b8';
    ctx.lineWidth = i === 0 || i === NUM_ROWS ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(GRID_LEFT, y);
    ctx.lineTo(GRID_RIGHT, y);
    ctx.stroke();
  }

  // ── Grid lines — vertical (hours) ──
  for (let h = 0; h <= 24; h++) {
    const x = GRID_LEFT + h * HOUR_W;
    const isMajor = h === 0 || h === 6 || h === 12 || h === 18 || h === 24;
    ctx.strokeStyle = isMajor ? '#475569' : '#cbd5e1';
    ctx.lineWidth = isMajor ? 1.5 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, GRID_TOP);
    ctx.lineTo(x, GRID_TOP + GRID_H);
    ctx.stroke();
  }

  // ── 15-minute tick marks ──
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.4;
  for (let q = 0; q < 96; q++) {
    if (q % 4 === 0) continue;
    const x = GRID_LEFT + (q / 4) * HOUR_W;
    for (let row = 0; row < NUM_ROWS; row++) {
      const y = GRID_TOP + row * ROW_H;
      const tickLen = q % 2 === 0 ? 0.5 : 0.35; // half-hour ticks are longer
      const topY = y + ROW_H * (0.5 - tickLen / 2);
      const botY = y + ROW_H * (0.5 + tickLen / 2);
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, botY);
      ctx.stroke();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DRAW DUTY STATUS LINES — The actual ELD data
  // ══════════════════════════════════════════════════════════════════════════
  const sorted = [...log.segments]
    .filter(s => STATUS_ROW[s.status] !== undefined)
    .sort((a, b) => a.start_hour - b.start_hour);

  for (const seg of sorted) {
    const row = STATUS_ROW[seg.status];
    const sh = Math.max(0, Math.min(24, seg.start_hour));
    const eh = Math.max(0, Math.min(24, seg.end_hour));
    if (eh <= sh) continue;

    const x1 = GRID_LEFT + sh * HOUR_W;
    const x2 = GRID_LEFT + eh * HOUR_W;
    const y = GRID_TOP + row * ROW_H + ROW_H / 2;
    const color = STATUS_COLORS[seg.status];

    // Semi-transparent fill
    ctx.fillStyle = color + '18';
    ctx.fillRect(x1, GRID_TOP + row * ROW_H + 2, x2 - x1, ROW_H - 4);

    // Bold horizontal line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }

  // ── Vertical transition lines between status changes ──
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.status === curr.status) continue;

    const prevRow = STATUS_ROW[prev.status];
    const currRow = STATUS_ROW[curr.status];
    if (prevRow === undefined || currRow === undefined) continue;

    const x = GRID_LEFT + Math.max(0, Math.min(24, curr.start_hour)) * HOUR_W;
    const y1 = GRID_TOP + prevRow * ROW_H + ROW_H / 2;
    const y2 = GRID_TOP + currRow * ROW_H + ROW_H / 2;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();

    // Small dot at the transition point
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x, y2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TOTAL HOURS COLUMN (right side)
  // ══════════════════════════════════════════════════════════════════════════
  const TX = GRID_RIGHT + 10;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Total', TX + 20, GRID_TOP - 18);
  ctx.fillText('Hours', TX + 20, GRID_TOP - 7);

  const totals = [log.off_duty_hours, log.sleeper_hours, log.driving_hours, log.on_duty_hours];
  ctx.font = 'bold 13px "Segoe UI Semibold", system-ui, sans-serif';
  for (let i = 0; i < 4; i++) {
    const y = GRID_TOP + i * ROW_H + ROW_H / 2 + 5;
    ctx.fillStyle = '#1e293b';
    ctx.fillText(totals[i].toFixed(2), TX + 20, y);
  }

  // Grand total line
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(TX, GRID_TOP + GRID_H + 5);
  ctx.lineTo(TX + 42, GRID_TOP + GRID_H + 5);
  ctx.stroke();

  const grandTotal = totals.reduce((a, b) => a + b, 0);
  ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = grandTotal >= 23.9 && grandTotal <= 24.1 ? '#047857' : '#dc2626';
  ctx.fillText(grandTotal.toFixed(2), TX + 20, GRID_TOP + GRID_H + 22);
  ctx.textAlign = 'left';

  // ══════════════════════════════════════════════════════════════════════════
  // REMARKS SECTION — Two-column layout to prevent overflow
  // ══════════════════════════════════════════════════════════════════════════
  const RY = GRID_TOP + GRID_H + 40;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('REMARKS', M, RY);

  // Horizontal rule
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(M, RY + 6);
  ctx.lineTo(W - M, RY + 6);
  ctx.stroke();

  // Two-column remark layout
  ctx.fillStyle = '#475569';
  ctx.font = '9.5px "Segoe UI", system-ui, sans-serif';
  const colWidth = (W - 2 * M - 20) / 2; // two columns with gap
  const remarkLineH = 15;
  const remarksCount = log.remarks.length;
  const leftColCount = Math.ceil(remarksCount / 2);
  const totalRemarkRows = Math.max(4, leftColCount);

  for (let i = 0; i < remarksCount; i++) {
    const col = i < leftColCount ? 0 : 1;
    const row = col === 0 ? i : i - leftColCount;
    const x = M + 4 + col * (colWidth + 16);
    const ly = RY + 20 + row * remarkLineH;

    // Dotted line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.4;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x - 2, ly + 4);
    ctx.lineTo(x + colWidth - 10, ly + 4);
    ctx.stroke();
    ctx.setLineDash([]);

    // Text (truncate if too long)
    ctx.fillStyle = '#475569';
    const text = log.remarks[i].length > 48 ? log.remarks[i].slice(0, 46) + '…' : log.remarks[i];
    ctx.fillText(text, x, ly);
  }

  // Dynamic Y for next section based on actual remark rows used
  const remarksSectionH = totalRemarkRows * remarkLineH + 12;

  // ══════════════════════════════════════════════════════════════════════════
  // SHIPPING DOCUMENTS SECTION
  // ══════════════════════════════════════════════════════════════════════════
  const SY = RY + 20 + remarksSectionH;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Shipping Documents:', M, SY);
  ctx.font = '10px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText(`DVL or Manifest No.: SPOT-${dayNumber.toString().padStart(3, '0')}-${log.date.replace(/-/g, '')}`, M + 4, SY + 18);
  ctx.fillText('Shipper & Commodity: General Freight — Trucker Tracker LLC', M + 4, SY + 34);

  // ══════════════════════════════════════════════════════════════════════════
  // RECAP SECTION — 70hr/8day compliance tracking
  // ══════════════════════════════════════════════════════════════════════════
  const CY = SY + 55;

  // Recap box
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(M, CY, W - 2 * M, 75);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('RECAP — Complete at end of day', M + 8, CY + 16);

  // Draw recap fields
  ctx.font = '10px "Segoe UI", system-ui, sans-serif';
  const onDutyToday = log.driving_hours + log.on_duty_hours;

  const recapFields = [
    ['70 Hour / 8 Day', ''],
    ['On-duty hours today (Lines 3 & 4):', onDutyToday.toFixed(2)],
    ['Total hours available tomorrow:', Math.max(0, 11 - log.driving_hours).toFixed(2) + ' driving'],
    ['Total hours on-duty last 7 days:', currentCycleUsed?.toFixed(1) || '—'],
  ];

  const rx = M + 8;
  for (let i = 0; i < recapFields.length; i++) {
    const ry = CY + 30 + i * 14;
    ctx.fillStyle = '#475569';
    ctx.fillText(recapFields[i][0], rx, ry);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(recapFields[i][1], rx + 250, ry);
    ctx.font = '10px "Segoe UI", system-ui, sans-serif';
  }

  // 34-hour restart note
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 9px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('*If you took 34 consecutive hours off duty, you have 60/70 hours available.', W / 2 + 40, CY + 65);

  // ══════════════════════════════════════════════════════════════════════════
  // CERTIFICATION / SIGNATURE LINE
  // ══════════════════════════════════════════════════════════════════════════
  const BY = CY + 85;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Enter name of place you reported and were released from work and when and where each change of duty occurred.', M, BY);
  ctx.fillText('Use time standard of home terminal.', M, BY + 14);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 10px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('I certify these entries are true and correct:', M, BY + 35);

  // Signature line
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(280, BY + 37);
  ctx.lineTo(550, BY + 37);
  ctx.stroke();
  ctx.fillText("Driver's Signature", 360, BY + 50);
}

/* ─── Field drawing helper ───────────────────────────────────────────────── */
function _field(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, value: string) {
  ctx.fillStyle = '#64748b';
  ctx.font = '10px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(label, x, y);
  const labelW = ctx.measureText(label).width;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(value, x + labelW + 6, y);
  // Underline for the value
  const valW = ctx.measureText(value).width;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x + labelW + 4, y + 3);
  ctx.lineTo(x + labelW + valW + 10, y + 3);
  ctx.stroke();
}

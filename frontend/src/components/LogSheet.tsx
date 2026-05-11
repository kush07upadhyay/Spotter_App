import { useRef, useEffect } from 'react';
import type { DailyLog } from '../api';

interface LogSheetProps {
  log: DailyLog;
  dayNumber: number;
}

const STATUS_ROWS: Record<string, number> = {
  'OFF_DUTY': 0,
  'SLEEPER': 1,
  'DRIVING': 2,
  'ON_DUTY': 3,
};

const STATUS_LABELS = ['1. Off Duty', '2. Sleeper Berth', '3. Driving', '4. On Duty (Not Driving)'];
const STATUS_COLORS: Record<string, string> = {
  'OFF_DUTY': '#6366f1',
  'SLEEPER': '#8b5cf6',
  'DRIVING': '#059669',
  'ON_DUTY': '#d97706',
};

export function LogSheet({ log, dayNumber }: LogSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1000;
    const H = 620;
    canvas.width = W;
    canvas.height = H;

    // Scale for retina
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    drawLogSheet(ctx, W, H, log, dayNumber);
  }, [log, dayNumber]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">
          Day {dayNumber} — {formatDate(log.date)}
        </h3>
        <span className="text-sm text-slate-500">
          {log.total_miles.toFixed(0)} miles driven
        </span>
      </div>
      <div className="p-4 overflow-x-auto">
        <canvas
          ref={canvasRef}
          style={{ width: 1000, height: 620 }}
          className="border border-slate-200 rounded"
        />
      </div>
      {/* Remarks list */}
      {log.remarks.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</p>
          <ul className="text-xs text-slate-600 space-y-0.5">
            {log.remarks.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function drawLogSheet(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  log: DailyLog,
  dayNumber: number,
) {
  // ── Layout constants ──
  const MARGIN = 20;
  const HEADER_H = 100;
  const GRID_TOP = HEADER_H + 30;
  const GRID_LEFT = 160;
  const GRID_RIGHT = W - 60;
  const GRID_W = GRID_RIGHT - GRID_LEFT;
  const ROW_H = 40;
  const GRID_H = ROW_H * 4;
  const HOUR_W = GRID_W / 24;

  // ── Background ──
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ── Header ──
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(0, 0, W, 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.fillText("DRIVER'S DAILY LOG", MARGIN + 4, 32);
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillText('(24 Hours — One Calendar Day)', 220, 32);

  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillText(`U.S. DEPARTMENT OF TRANSPORTATION`, W - 300, 20);
  ctx.fillText(`FMCSA Part 395`, W - 300, 36);

  // Header fields
  ctx.fillStyle = '#1e293b';
  ctx.font = '12px Inter, system-ui, sans-serif';
  const dateObj = new Date(log.date + 'T00:00:00');
  const headerY = 70;

  drawField(ctx, MARGIN, headerY, 'Date:', `${dateObj.getMonth() + 1} / ${dateObj.getDate()} / ${dateObj.getFullYear()}`);
  drawField(ctx, 200, headerY, 'Total Miles:', `${log.total_miles.toFixed(0)}`);
  drawField(ctx, 370, headerY, 'Carrier:', 'Spotter Transport LLC');
  drawField(ctx, 600, headerY, 'Main Office:', 'Dallas, TX');
  drawField(ctx, MARGIN, headerY + 22, 'Driver:', `Driver (Day ${dayNumber})`);
  drawField(ctx, 370, headerY + 22, 'Truck/Trailer:', 'Unit #1024 / TR-5587');

  // ── Grid Background ──
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(GRID_LEFT, GRID_TOP, GRID_W, GRID_H);

  // ── Row labels ──
  ctx.fillStyle = '#475569';
  ctx.font = '11px Inter, system-ui, sans-serif';
  for (let i = 0; i < 4; i++) {
    const y = GRID_TOP + i * ROW_H + ROW_H / 2 + 4;
    ctx.fillText(STATUS_LABELS[i], MARGIN, y);
  }

  // ── Hour labels ──
  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let h = 0; h <= 24; h++) {
    const x = GRID_LEFT + h * HOUR_W;
    let label = '';
    if (h === 0 || h === 24) label = 'Mid-\nnight';
    else if (h === 12) label = 'Noon';
    else label = String(h > 12 ? h - 12 : h);

    if (label.includes('\n')) {
      const parts = label.split('\n');
      ctx.fillText(parts[0], x, GRID_TOP - 18);
      ctx.fillText(parts[1], x, GRID_TOP - 7);
    } else {
      ctx.fillText(label, x, GRID_TOP - 8);
    }
  }
  ctx.textAlign = 'left';

  // ── Grid lines ──
  // Horizontal lines (row dividers)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = GRID_TOP + i * ROW_H;
    ctx.beginPath();
    ctx.moveTo(GRID_LEFT, y);
    ctx.lineTo(GRID_RIGHT, y);
    ctx.stroke();
  }

  // Vertical hour lines
  for (let h = 0; h <= 24; h++) {
    const x = GRID_LEFT + h * HOUR_W;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = h % 6 === 0 ? 1.5 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, GRID_TOP);
    ctx.lineTo(x, GRID_TOP + GRID_H);
    ctx.stroke();
  }

  // 15-minute tick marks
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.3;
  for (let q = 0; q < 96; q++) {
    if (q % 4 === 0) continue; // skip hour marks
    const x = GRID_LEFT + (q / 4) * HOUR_W;
    for (let row = 0; row < 4; row++) {
      const y = GRID_TOP + row * ROW_H;
      ctx.beginPath();
      ctx.moveTo(x, y + ROW_H * 0.3);
      ctx.lineTo(x, y + ROW_H * 0.7);
      ctx.stroke();
    }
  }

  // ── Draw duty status segments ──
  for (const seg of log.segments) {
    const row = STATUS_ROWS[seg.status];
    if (row === undefined) continue;

    const startHour = Math.max(0, seg.start_hour);
    const endHour = Math.min(24, seg.end_hour);
    if (endHour <= startHour) continue;

    const x1 = GRID_LEFT + startHour * HOUR_W;
    const x2 = GRID_LEFT + endHour * HOUR_W;
    const y = GRID_TOP + row * ROW_H + ROW_H / 2;
    const color = STATUS_COLORS[seg.status];

    // Draw horizontal line (duty status)
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();

    // Fill background for this segment (semi-transparent)
    ctx.fillStyle = color + '15';
    ctx.fillRect(x1, GRID_TOP + row * ROW_H + 1, x2 - x1, ROW_H - 2);
  }

  // Draw vertical transitions between different statuses
  const sortedSegs = [...log.segments].sort((a, b) => a.start_hour - b.start_hour);
  for (let i = 1; i < sortedSegs.length; i++) {
    const prev = sortedSegs[i - 1];
    const curr = sortedSegs[i];
    if (prev.status === curr.status) continue;

    const prevRow = STATUS_ROWS[prev.status];
    const currRow = STATUS_ROWS[curr.status];
    if (prevRow === undefined || currRow === undefined) continue;

    const x = GRID_LEFT + curr.start_hour * HOUR_W;
    const y1 = GRID_TOP + prevRow * ROW_H + ROW_H / 2;
    const y2 = GRID_TOP + currRow * ROW_H + ROW_H / 2;

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
  }

  // ── Total hours column ──
  const TOTALS_X = GRID_RIGHT + 8;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px Inter, system-ui, sans-serif';
  ctx.fillText('Total', TOTALS_X, GRID_TOP - 8);
  ctx.fillText('Hours', TOTALS_X, GRID_TOP + 2);

  const totals = [log.off_duty_hours, log.sleeper_hours, log.driving_hours, log.on_duty_hours];
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#1e293b';
  for (let i = 0; i < 4; i++) {
    const y = GRID_TOP + i * ROW_H + ROW_H / 2 + 4;
    ctx.fillText(totals[i].toFixed(1), TOTALS_X, y);
  }

  // Grand total
  const grandTotal = totals.reduce((a, b) => a + b, 0);
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.fillText(grandTotal.toFixed(1), TOTALS_X, GRID_TOP + GRID_H + 18);

  // ── Remarks Section ──
  const REMARKS_Y = GRID_TOP + GRID_H + 35;
  ctx.fillStyle = '#1e3a5f';
  ctx.font = 'bold 13px Inter, system-ui, sans-serif';
  ctx.fillText('REMARKS', MARGIN, REMARKS_Y);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, REMARKS_Y + 8);
  ctx.lineTo(W - MARGIN, REMARKS_Y + 8);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '10px Inter, system-ui, sans-serif';
  const maxRemarks = 6;
  for (let i = 0; i < Math.min(log.remarks.length, maxRemarks); i++) {
    ctx.fillText(log.remarks[i], MARGIN + 4, REMARKS_Y + 24 + i * 16);
  }

  // ── Recap Section (70hr/8day) ──
  const RECAP_Y = REMARKS_Y + 120;
  ctx.fillStyle = '#1e3a5f';
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.fillText('RECAP — 70 Hour / 8 Day', MARGIN, RECAP_Y);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, RECAP_Y + 6);
  ctx.lineTo(W - MARGIN, RECAP_Y + 6);
  ctx.stroke();

  // Recap details
  ctx.fillStyle = '#475569';
  ctx.font = '10px Inter, system-ui, sans-serif';
  const onDutyToday = log.driving_hours + log.on_duty_hours;
  ctx.fillText(`On-Duty Hours Today (Lines 3 & 4): ${onDutyToday.toFixed(1)}`, MARGIN + 4, RECAP_Y + 22);
  ctx.fillText(`Driving Hours Today: ${log.driving_hours.toFixed(1)}`, MARGIN + 4, RECAP_Y + 38);
  ctx.fillText(`Total Miles Today: ${log.total_miles.toFixed(0)}`, 350, RECAP_Y + 22);

  // ── Certification ──
  const CERT_Y = RECAP_Y + 60;
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 10px Inter, system-ui, sans-serif';
  ctx.fillText('I certify these entries are true and correct.', MARGIN, CERT_Y);
  ctx.beginPath();
  ctx.moveTo(300, CERT_Y + 2);
  ctx.lineTo(550, CERT_Y + 2);
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();
  ctx.fillText("Driver's Signature", 350, CERT_Y + 16);
}

function drawField(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, value: string) {
  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#1e293b';
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillText(value, x + ctx.measureText(label).width + 6, y);
}

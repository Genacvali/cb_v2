export interface CategoryImageRow {
  icon: string;
  name: string;
  detail: string;
  amount: string;
  dimAmount?: boolean;
}

interface CategoryImageInput {
  title: string;
  badge: string;
  note?: string;
  rows: CategoryImageRow[];
}

function cssColor(name: string, fallback: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw ? `hsl(${raw})` : fallback;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw the expense list as a PNG, ready to paste into a chat. */
export function renderCategoriesImage({ title, badge, note, rows }: CategoryImageInput): Promise<Blob> {
  const scale = 2;
  const width = 720;
  const pad = 28;
  const rowH = 64;
  const headerH = note ? 78 : 64;
  const height = pad * 2 + headerH + rows.length * rowH;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas недоступен'));
  ctx.scale(scale, scale);

  const card = cssColor('--card', '#ffffff');
  const fg = cssColor('--card-foreground', '#111111');
  const muted = cssColor('--muted-foreground', '#6b7280');
  const primary = cssColor('--primary', '#5b3df5');
  const primaryFg = cssColor('--primary-foreground', '#ffffff');
  const secondary = cssColor('--secondary', '#f3f4f6');
  const border = cssColor('--border', '#e5e7eb');

  ctx.fillStyle = card;
  roundRect(ctx, 0, 0, width, height, 24);
  ctx.fill();

  ctx.fillStyle = fg;
  ctx.font = '600 22px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const titleWidth = ctx.measureText(title).width;
  ctx.fillText(title, pad, pad + 18);

  ctx.font = '600 13px Inter, system-ui, sans-serif';
  const badgeW = Math.ceil(ctx.measureText(badge).width) + 16;
  const badgeX = pad + titleWidth + 12;
  ctx.fillStyle = primary;
  roundRect(ctx, badgeX, pad + 6, badgeW, 24, 12);
  ctx.fill();
  ctx.fillStyle = primaryFg;
  ctx.textAlign = 'center';
  ctx.fillText(badge, badgeX + badgeW / 2, pad + 18);
  ctx.textAlign = 'left';

  if (note) {
    ctx.fillStyle = muted;
    ctx.font = '400 13px Inter, system-ui, sans-serif';
    ctx.fillText(fitText(ctx, note, width - pad * 2), pad, pad + 48);
  }

  rows.forEach((row, index) => {
    const y = pad + headerH + index * rowH;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();

    const iconSize = 36;
    const iconY = y + (rowH - iconSize) / 2;
    ctx.fillStyle = secondary;
    roundRect(ctx, pad, iconY, iconSize, iconSize, 10);
    ctx.fill();
    ctx.font = '20px Apple Color Emoji, Segoe UI Emoji, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(row.icon || '💰', pad + iconSize / 2, y + rowH / 2);
    ctx.textAlign = 'left';

    const textX = pad + iconSize + 12;
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    const amount = row.amount;
    const amountW = ctx.measureText(amount).width;
    const textMax = width - pad - textX - amountW - 16;

    ctx.fillStyle = fg;
    ctx.fillText(fitText(ctx, row.name, textMax), textX, y + 24);

    ctx.fillStyle = muted;
    ctx.font = '400 12px Inter, system-ui, sans-serif';
    if (row.detail) ctx.fillText(fitText(ctx, row.detail, textMax), textX, y + 44);

    ctx.fillStyle = row.dimAmount ? muted : fg;
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(amount, width - pad, y + rowH / 2);
    ctx.textAlign = 'left';
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Не удалось собрать картинку'))), 'image/png');
  });
}

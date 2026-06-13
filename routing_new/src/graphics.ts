import { Vector } from "./lib";

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  position: Vector,
  radius: number,
  label: string,
  color: string,
  style: "line" | "dashed" | "dashed-bold",
) {
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);

  if (style === "line") {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (label) {
      ctx.fillStyle = "#000";
      ctx.font = `bold ${Math.round(radius * 0.5)}px Courier New`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, position.x, position.y);
    }
  } else if (style === "dashed") {
    ctx.strokeStyle = color + "77";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = color + "aa";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  start: Vector,
  end: Vector,
  color: string,
) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = color + "44";
  ctx.lineWidth = 4;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawX(
  ctx: CanvasRenderingContext2D,
  position: Vector,
  color: string,
  label?: string,
) {
  const size = 6;
  ctx.beginPath();
  ctx.moveTo(position.x - size, position.y - size);
  ctx.lineTo(position.x + size, position.y + size);
  ctx.moveTo(position.x + size, position.y - size);
  ctx.lineTo(position.x - size, position.y + size);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (label) {
    ctx.fillStyle = color;
    ctx.font = "bold 11px Courier New";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, position.x + size + 2, position.y - size);
  }
}

export function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

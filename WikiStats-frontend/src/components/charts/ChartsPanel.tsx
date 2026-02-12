type ChartsPanelProps = {
  chartCanvasRef: { current: HTMLCanvasElement | null };
  deltaCanvasRef: { current: HTMLCanvasElement | null };
};

export function ChartsPanel({ chartCanvasRef, deltaCanvasRef }: ChartsPanelProps) {
  return (
    <>
      <div className="chart-wrap">
        <canvas ref={chartCanvasRef} />
      </div>
      <div className="chart-wrap">
        <canvas ref={deltaCanvasRef} />
      </div>
    </>
  );
}

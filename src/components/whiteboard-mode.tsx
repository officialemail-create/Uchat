import {
  Arrow,
  Circle,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  Circle as CircleIcon,
  Eraser,
  Minus,
  MousePointer2,
  Palette,
  PenTool,
  Plus,
  RotateCcw,
  Square,
  Square as SquareIcon,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WhiteboardStroke = {
  id: string;
  tool: "pen" | "eraser";
  color: string;
  size: number;
  points: Array<{ x: number; y: number }>;
  shape?: "circle" | "square" | "arrow";
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type WhiteboardModeProps = {
  open: boolean;
  isHost: boolean;
  sessionTitle?: string;
  initialContent?: string | null;
  onStopSharing?: () => void;
  onConnectionLost?: boolean;
  onContentChange?: (content: string) => void;
};

const DEFAULT_COLORS = ["#7C3AED", "#111827", "#DC2626", "#2563EB", "#8B5CF6"];
const DEFAULT_STAGE = { x: 0, y: 0, scale: 1 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const deserializeContent = (content?: string | null) => {
  if (!content) return [] as WhiteboardStroke[];

  try {
    const parsed = JSON.parse(content) as WhiteboardStroke[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as WhiteboardStroke[];
  }
};

const buildPointList = (points: Array<{ x: number; y: number }>) =>
  points.flatMap((point) => [point.x, point.y]);

export function WhiteboardMode({
  open,
  isHost,
  sessionTitle,
  initialContent,
  onStopSharing,
  onConnectionLost = false,
  onContentChange,
}: WhiteboardModeProps) {
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>(() => deserializeContent(initialContent));
  const [tool, setTool] = useState<"pen" | "eraser" | "shape" | "text">("pen");
  const [shapeMode, setShapeMode] = useState<"circle" | "square" | "arrow">("circle");
  const [color, setColor] = useState("#7C3AED");
  const [size, setSize] = useState(3);
  const [viewport, setViewport] = useState(DEFAULT_STAGE);
  const [isPanning, setIsPanning] = useState(false);
  const [activePointerCount, setActivePointerCount] = useState(0);
  const [connectionLostText, setConnectionLostText] = useState(false);
  const [cursorTrack, setCursorTrack] = useState<Record<string, { x: number; y: number; name: string; color: string }>>({});
  const [undoStack, setUndoStack] = useState<WhiteboardStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardStroke[][]>([]);
  const [showPalette, setShowPalette] = useState(false);

  const stageRef = useRef<any>(null);
  const currentStrokeRef = useRef<WhiteboardStroke | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const rafRef = useRef<number | null>(null);
  const latestStrokesRef = useRef<WhiteboardStroke[]>([]);

  useEffect(() => {
    latestStrokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "p") setTool("pen");
      if (event.key.toLowerCase() === "e") setTool("eraser");
      if (event.key.toLowerCase() === "c") setStrokes([]);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, strokes]);

  useEffect(() => {
    setConnectionLostText(Boolean(onConnectionLost));
  }, [onConnectionLost]);

  useEffect(() => {
    onContentChange?.(JSON.stringify(strokes));
  }, [strokes, onContentChange]);

  useEffect(() => {
    if (!open) return;

    const stage = stageRef.current;
    if (!stage) return;

    const handleResize = () => {
      const container = stage.container();
      if (!container) return;
      stage.width(container.clientWidth);
      stage.height(container.clientHeight);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  const commitStrokeUpdate = useCallback((nextStroke: WhiteboardStroke) => {
    setStrokes((prev) => {
      const updated = [...prev];
      const index = updated.findIndex((stroke) => stroke.id === nextStroke.id);
      if (index >= 0) {
        updated[index] = nextStroke;
      } else {
        updated.push(nextStroke);
      }
      return updated;
    });
  }, []);

  const scheduleDrawFlush = useCallback((stroke: WhiteboardStroke) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      commitStrokeUpdate(stroke);
      rafRef.current = null;
    });
  }, [commitStrokeUpdate]);

  const getWorldPoint = useCallback((event: KonvaEventObject<PointerEvent>) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const position = stage.getPointerPosition();
    if (!position) return null;
    const transform = stage.getAbsoluteTransform().invert();
    return transform.point(position);
  }, []);

  const handlePointerDown = (event: KonvaEventObject<PointerEvent>) => {
    if (!open || !stageRef.current) return;
    const pointer = getWorldPoint(event);
    if (!pointer) return;

    const isMultiTouch = activePointersRef.current.size >= 1;
    if (isMultiTouch || event.evt.shiftKey || event.evt.button === 1) {
      setIsPanning(true);
      return;
    }

    if (!isHost) return;

    if (tool === "text") {
      const label = window.prompt("Add text to the board");
      if (!label) return;
      const textStroke: WhiteboardStroke = {
        id: crypto.randomUUID(),
        tool: "pen",
        color,
        size,
        points: [{ x: pointer.x, y: pointer.y }],
        text: label,
      };
      setStrokes((prev) => [...prev, textStroke]);
      return;
    }

    if (tool === "shape") {
      const shapeStroke: WhiteboardStroke = {
        id: crypto.randomUUID(),
        tool: "pen",
        color,
        size,
        points: [{ x: pointer.x, y: pointer.y }],
        shape: shapeMode,
        x: pointer.x,
        y: pointer.y,
        width: 0,
        height: 0,
      };
      currentStrokeRef.current = shapeStroke;
      setStrokes((prev) => [...prev, shapeStroke]);
      return;
    }

    const startingStroke: WhiteboardStroke = {
      id: crypto.randomUUID(),
      tool: tool === "eraser" ? "eraser" : "pen",
      color: tool === "eraser" ? "#FFFFFF" : color,
      size: tool === "eraser" ? Math.max(size + 10, 14) : size,
      points: [{ x: pointer.x, y: pointer.y }],
    };

    currentStrokeRef.current = startingStroke;
    setUndoStack((prev) => [...prev, latestStrokesRef.current]);
    setRedoStack([]);
    setStrokes((prev) => [...prev, startingStroke]);
  };

  const handlePointerMove = (event: KonvaEventObject<PointerEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = getWorldPoint(event);
    if (!pointer) return;

    const activePointers = activePointersRef.current;
    if (activePointers.size > 1 || isPanning) {
      const usingTouch = event.evt.pointerType === "touch";
      if (usingTouch) {
        const currentPos = activePointers.get(event.evt.pointerId);
        if (currentPos) {
          activePointers.set(event.evt.pointerId, { x: event.evt.clientX, y: event.evt.clientY });
          const previousPoint = activePointers.get(event.evt.pointerId);
          if (previousPoint) {
            const deltaX = event.evt.clientX - previousPoint.x;
            const deltaY = event.evt.clientY - previousPoint.y;
            setViewport((prev) => ({ ...prev, x: prev.x + deltaX, y: prev.y + deltaY }));
          }
        }
      }
      return;
    }

    if (!isHost || !currentStrokeRef.current) return;

    const nextStroke = {
      ...currentStrokeRef.current,
      points: [...currentStrokeRef.current.points, { x: pointer.x, y: pointer.y }],
    };

    currentStrokeRef.current = nextStroke;
    scheduleDrawFlush(nextStroke);
  };

  const handlePointerUp = () => {
    if (!isHost) {
      setIsPanning(false);
      return;
    }

    currentStrokeRef.current = null;
    setIsPanning(false);
  };

  const handleZoom = (direction: "in" | "out") => {
    const stage = stageRef.current;
    if (!stage) return;
    const nextScale = direction === "in"
      ? clamp(viewport.scale + 0.15, 0.6, 2.8)
      : clamp(viewport.scale - 0.15, 0.6, 2.8);
    setViewport((prev) => ({ ...prev, scale: nextScale }));
  };

  const resetView = () => setViewport(DEFAULT_STAGE);

  const handleUndo = () => {
    if (!strokes.length) return;
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack((prev) => [strokes, ...prev]);
    setStrokes([]);
  };

  const handleRedo = () => {
    if (!redoStack.length) return;
    const restored = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setStrokes(restored);
  };

  const handleClear = () => {
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes([]);
  };

  const handleStageWheel = (event: any) => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const delta = event.evt.deltaY > 0 ? -0.1 : 0.1;
    const nextScale = clamp(viewport.scale + delta, 0.6, 2.8);
    setViewport((prev) => ({ ...prev, scale: nextScale }));
  };

  const handleCursorMove = (event: any) => {
    if (!isHost) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const transform = stage.getAbsoluteTransform().invert();
    const world = transform.point(pos);
    setCursorTrack((prev) => ({
      ...prev,
      host: { x: world.x, y: world.y, name: sessionTitle || "Host", color },
    }));
  };

  const renderShape = (stroke: WhiteboardStroke) => {
    if (!stroke.shape) return null;
    if (stroke.shape === "circle") {
      return (
        <Circle
          key={stroke.id}
          x={stroke.x ?? 0}
          y={stroke.y ?? 0}
          radius={Math.max(Math.abs((stroke.width ?? 0) / 2), 1)}
          stroke={stroke.color}
          strokeWidth={stroke.size}
        />
      );
    }

    if (stroke.shape === "square") {
      return (
        <Rect
          key={stroke.id}
          x={stroke.x ?? 0}
          y={stroke.y ?? 0}
          width={stroke.width ?? 0}
          height={stroke.height ?? 0}
          stroke={stroke.color}
          strokeWidth={stroke.size}
        />
      );
    }

    return (
      <Arrow
        key={stroke.id}
        points={[(stroke.x ?? 0), (stroke.y ?? 0), (stroke.width ?? 0), (stroke.height ?? 0)]}
        stroke={stroke.color}
        strokeWidth={stroke.size}
        pointerLength={10}
        pointerWidth={8}
      />
    );
  };

  const whiteboardView = useMemo(() => {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] dark:[background-size:16px_16px]">
        <Stage
          ref={stageRef}
          width={typeof window !== "undefined" ? window.innerWidth : 1280}
          height={typeof window !== "undefined" ? window.innerHeight : 720}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          draggable={isPanning}
          onWheel={handleStageWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onMouseMove={handleCursorMove}
          className="touch-none"
          style={{ touchAction: "none" }}
        >
          <Layer>
            {strokes.map((stroke) => {
              if (stroke.text) {
                return (
                  <Text
                    key={stroke.id}
                    x={stroke.points[0]?.x ?? 0}
                    y={stroke.points[0]?.y ?? 0}
                    text={stroke.text}
                    fill={stroke.color}
                    fontSize={Math.max(stroke.size * 5, 14)}
                  />
                );
              }

              if (stroke.shape) {
                return renderShape(stroke);
              }

              return (
                <Line
                  key={stroke.id}
                  points={buildPointList(stroke.points)}
                  stroke={stroke.tool === "eraser" ? "rgba(0,0,0,1)" : stroke.color}
                  strokeWidth={stroke.size}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={stroke.tool === "eraser" ? "destination-out" : "source-over"}
                  listening={false}
                />
              );
            })}
          </Layer>
        </Stage>

        {Object.entries(cursorTrack).map(([key, value]) => (
          <div key={key} className="pointer-events-none fixed z-[60]" style={{ left: value.x, top: value.y }}>
            <div className="h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: value.color }} />
            <div className="mt-1 rounded bg-black/70 px-1 text-[10px] text-white">{value.name}</div>
          </div>
        ))}
      </div>
    );
  }, [strokes, viewport, isHost, tool, color, size, shapeMode, isPanning, sessionTitle, cursorTrack, open]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-50 dark:bg-gray-900">
      {whiteboardView}

      {connectionLostText && (
        <div className="pointer-events-none fixed left-4 top-4 z-[70] rounded-full bg-red-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Connection lost. Drawing paused.
        </div>
      )}

      {!isHost && (
        <div className="pointer-events-none fixed right-4 top-4 z-[70] rounded-full bg-gray-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          View Only
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-[70] flex gap-2">
        <button type="button" aria-label="Zoom in" onClick={() => handleZoom("in")} className="rounded-full bg-white p-3 text-gray-700 shadow-lg dark:bg-gray-800 dark:text-white">
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => handleZoom("out")} className="rounded-full bg-white p-3 text-gray-700 shadow-lg dark:bg-gray-800 dark:text-white">
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Reset view" onClick={resetView} className="rounded-full bg-white p-3 text-gray-700 shadow-lg dark:bg-gray-800 dark:text-white">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {isHost && (
        <div className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:bottom-6">
          <button type="button" aria-label="Pen tool" onClick={() => setTool("pen")} className={`rounded-full p-2 transition ${tool === "pen" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "hover:bg-purple-100 dark:hover:bg-purple-900/30"}`}>
            <PenTool className="h-4 w-4" />
          </button>
          <div className="relative">
            <button type="button" aria-label="Color palette" onClick={() => setShowPalette((prev) => !prev)} className="rounded-full p-2 transition hover:bg-purple-100 dark:hover:bg-purple-900/30">
              <Palette className="h-4 w-4" />
            </button>
            {showPalette && (
              <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                {DEFAULT_COLORS.map((strokeColor) => (
                  <button key={strokeColor} type="button" aria-label={`Use ${strokeColor} pen color`} onClick={() => { setColor(strokeColor); setShowPalette(false); }} className="h-6 w-6 rounded-full border-2 border-white" style={{ backgroundColor: strokeColor }} />
                ))}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-900">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Size</span>
            <input aria-label="Stroke size" type="range" min={1} max={10} value={size} onChange={(event) => setSize(Number(event.currentTarget.value))} className="w-20 accent-purple-600" />
          </label>
          <button type="button" aria-label="Eraser tool" onClick={() => setTool("eraser")} className={`rounded-full p-2 transition ${tool === "eraser" ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
            <Eraser className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Shape tool" onClick={() => {
            setTool("shape");
            setShapeMode((prev) => prev === "circle" ? "square" : prev === "square" ? "arrow" : "circle");
          }} className={`rounded-full p-2 transition ${tool === "shape" ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
            {shapeMode === "circle" ? <CircleIcon className="h-4 w-4" /> : shapeMode === "square" ? <SquareIcon className="h-4 w-4" /> : <MousePointer2 className="h-4 w-4" />}
          </button>
          <button type="button" aria-label="Text tool" onClick={() => setTool("text")} className={`rounded-full p-2 transition ${tool === "text" ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
            <Type className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Undo" onClick={handleUndo} className="rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Clear board" onClick={handleClear} className="rounded-full p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Stop sharing" onClick={onStopSharing} className="rounded-full bg-red-500 p-2 text-white transition hover:bg-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

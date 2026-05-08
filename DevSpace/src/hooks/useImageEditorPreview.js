import { useCallback, useMemo, useRef, useState } from "react";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPointer(event) {
  return event.touches?.[0] || event;
}

export function useImageEditorPreview(initialImage = null) {
  const [preview, setPreview] = useState(initialImage);
  const [editPos, setEditPos] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(100);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, baseX: 50, baseY: 50 });

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setEditPos({ x: 50, y: 50 });
      setZoom(100);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleMouseDown = useCallback(
    (event) => {
      if (!preview) return;
      const point = getPointer(event);
      dragRef.current = {
        startX: point.clientX,
        startY: point.clientY,
        baseX: editPos.x,
        baseY: editPos.y,
      };
      setDragging(true);
      event.preventDefault();
    },
    [preview, editPos]
  );

  const handleMouseMove = useCallback(
    (event) => {
      if (!dragging) return;
      const point = getPointer(event);
      const dx = point.clientX - dragRef.current.startX;
      const dy = point.clientY - dragRef.current.startY;
      const factor = 0.18;

      setEditPos({
        x: clamp(dragRef.current.baseX + dx * factor, 0, 100),
        y: clamp(dragRef.current.baseY + dy * factor, 0, 100),
      });
    },
    [dragging]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
  }, [dragging]);

  const imageStyle = useMemo(() => {
    const scale = zoom / 100;
    const translateX = (50 - editPos.x) * (scale - 1);
    const translateY = (50 - editPos.y) * (scale - 1);
    return {
      transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
      cursor: dragging ? "grabbing" : "grab",
    };
  }, [editPos, zoom, dragging]);

  const reset = useCallback(() => {
    setPreview(null);
    setEditPos({ x: 50, y: 50 });
    setZoom(100);
    setDragging(false);
  }, []);

  return {
    preview,
    editPos,
    zoom,
    dragging,
    handleFileChange,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    setEditPos,
    setZoom,
    imageStyle,
    reset,
  };
}

import { useCallback, useMemo, useRef, useState } from "react";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPointer(event) {
  return event.touches?.[0] || event;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

const MAX_IMAGE_SIZE = 1280;
const IMAGE_QUALITY = 0.86;

export function useImageEditorPreview(initialImage = null) {
  const [preview, setPreview] = useState(initialImage);
  const [draftPreview, setDraftPreview] = useState(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editPos, setEditPos] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(100);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, baseX: 50, baseY: 50 });

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setDraftPreview(reader.result);
      setIsEditingImage(true);
      setEditPos({ x: 50, y: 50 });
      setZoom(100);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }, []);

  const handleMouseDown = useCallback(
    (event) => {
      if (!draftPreview) return;
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
    [draftPreview, editPos]
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
    setDraftPreview(null);
    setIsEditingImage(false);
    setEditPos({ x: 50, y: 50 });
    setZoom(100);
    setDragging(false);
  }, []);

  const saveImageEdit = useCallback(async () => {
    if (!draftPreview) return;

    try {
      const image = await loadImage(draftPreview);
      const canvas = document.createElement("canvas");
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const outputRatio = Math.min(1, MAX_IMAGE_SIZE / Math.max(width, height));
      const outputWidth = Math.round(width * outputRatio);
      const outputHeight = Math.round(height * outputRatio);
      const scale = zoom / 100;
      const drawWidth = outputWidth * scale;
      const drawHeight = outputHeight * scale;
      const drawX = (outputWidth - drawWidth) * (editPos.x / 100);
      const drawY = (outputHeight - drawHeight) * (editPos.y / 100);
      const context = canvas.getContext("2d");

      canvas.width = outputWidth;
      canvas.height = outputHeight;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, outputWidth, outputHeight);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      setPreview(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
    } catch {
      setPreview(draftPreview);
    }

    setDraftPreview(null);
    setIsEditingImage(false);
    setDragging(false);
  }, [draftPreview, editPos, zoom]);

  const cancelImageEdit = useCallback(() => {
    setDraftPreview(null);
    setIsEditingImage(false);
    setEditPos({ x: 50, y: 50 });
    setZoom(100);
    setDragging(false);
  }, []);

  const removeImage = useCallback(() => {
    setPreview(null);
    cancelImageEdit();
  }, [cancelImageEdit]);

  return {
    preview,
    draftPreview,
    isEditingImage,
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
    saveImageEdit,
    cancelImageEdit,
    removeImage,
    reset,
  };
}

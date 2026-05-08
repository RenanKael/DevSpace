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

export function usePostImageEditor(initialImage = "") {
  const [image, setImage] = useState(initialImage);
  const [editingImage, setEditingImage] = useState("");
  const [editPos, setEditPos] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(100);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, baseX: 50, baseY: 50 });

  const openImageEditor = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingImage(reader.result);
      setEditPos({ x: 50, y: 50 });
      setZoom(100);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }, []);

  const beginDrag = useCallback(
    (event) => {
      if (!editingImage) return;
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
    [editingImage, editPos]
  );

  const moveDrag = useCallback(
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

  const endDrag = useCallback(() => {
    setDragging(false);
  }, []);

  const imageStyle = useMemo(() => {
    const scale = zoom / 100;
    const translateX = (50 - editPos.x) * (scale - 1);
    const translateY = (50 - editPos.y) * (scale - 1);

    return {
      transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
      cursor: dragging ? "grabbing" : "grab",
    };
  }, [editPos, zoom, dragging]);

  const closeEditor = useCallback(() => {
    setEditingImage("");
    setEditPos({ x: 50, y: 50 });
    setZoom(100);
    setDragging(false);
  }, []);

  const saveImage = useCallback(async () => {
    if (!editingImage) return;

    try {
      const loadedImage = await loadImage(editingImage);
      const canvas = document.createElement("canvas");
      const width = loadedImage.naturalWidth || loadedImage.width;
      const height = loadedImage.naturalHeight || loadedImage.height;
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
      context.drawImage(loadedImage, drawX, drawY, drawWidth, drawHeight);
      setImage(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
    } catch {
      setImage(editingImage);
    }

    closeEditor();
  }, [closeEditor, editingImage, editPos, zoom]);

  const removeImage = useCallback(() => {
    setImage("");
    closeEditor();
  }, [closeEditor]);

  const resetImage = useCallback(() => {
    setImage("");
    closeEditor();
  }, [closeEditor]);

  return {
    image,
    editingImage,
    isEditorOpen: !!editingImage,
    editPos,
    zoom,
    imageStyle,
    openImageEditor,
    beginDrag,
    moveDrag,
    endDrag,
    setEditPos,
    setZoom,
    saveImage,
    closeEditor,
    removeImage,
    resetImage,
  };
}

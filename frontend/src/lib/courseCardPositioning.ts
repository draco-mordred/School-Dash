export interface CourseCardRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CourseCardPointer {
  x: number;
  y: number;
}

export interface CourseCardPositionInput {
  rect: CourseCardRect;
  pointer: CourseCardPointer;
  container: CourseCardRect;
  targetWidth: number;
  targetHeight: number;
}

export interface CourseCardPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const calculateExpandedCardPosition = ({
  rect,
  pointer,
  container,
  targetWidth,
  targetHeight,
}: CourseCardPositionInput): CourseCardPosition => {
  const width = clamp(targetWidth, rect.width, Math.max(container.width, rect.width));
  const height = clamp(targetHeight, rect.height, Math.max(container.height, rect.height));

  const relativeX = clamp((pointer.x - rect.left) / rect.width, 0, 1);
  const relativeY = clamp((pointer.y - rect.top) / rect.height, 0, 1);

  const left = clamp(pointer.x - relativeX * width, container.left, container.left + container.width - width);
  const top = clamp(pointer.y - relativeY * height, container.top, container.top + container.height - height);

  return { left, top, width, height };
};

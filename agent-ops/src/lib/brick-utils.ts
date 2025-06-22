import { PlacedBrick, BrickType } from '../types/brick-types';

// Generate unique brick ID
export function generateBrickId(): string {
  return `brick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get brick dimensions considering rotation
export function getRotatedDimensions(brick: PlacedBrick): { width: number; height: number } {
  const { width, length } = brick.type.dimensions;
  const isRotated = brick.rotation % 180 !== 0;
  
  return {
    width: isRotated ? length : width,
    height: isRotated ? width : length
  };
}

// Check if two bricks collide
export function checkBrickCollision(brick1: PlacedBrick, brick2: PlacedBrick): boolean {
  const dims1 = getRotatedDimensions(brick1);
  const dims2 = getRotatedDimensions(brick2);
  
  const brick1Right = brick1.x + dims1.width * 20; // 20px per stud
  const brick1Bottom = brick1.y + dims1.height * 20;
  const brick2Right = brick2.x + dims2.width * 20;
  const brick2Bottom = brick2.y + dims2.height * 20;
  
  return !(
    brick1.x >= brick2Right ||
    brick2.x >= brick1Right ||
    brick1.y >= brick2Bottom ||
    brick2.y >= brick1Bottom
  );
}

// Find valid connection points between bricks
export function findValidConnections(
  newBrick: PlacedBrick, 
  existingBricks: PlacedBrick[]
): Array<{ targetId: string; type: 'top' | 'bottom' | 'side' }> {
  const connections: Array<{ targetId: string; type: 'top' | 'bottom' | 'side' }> = [];
  const newDims = getRotatedDimensions(newBrick);
  const studSize = 20; // pixels per stud
  
  for (const brick of existingBricks) {
    const brickDims = getRotatedDimensions(brick);
    
    // Check if bricks are adjacent
    const newRight = newBrick.x + newDims.width * studSize;
    const newBottom = newBrick.y + newDims.height * studSize;
    const brickRight = brick.x + brickDims.width * studSize;
    const brickBottom = brick.y + brickDims.height * studSize;
    
    // Side connections (horizontal)
    if (
      Math.abs(newRight - brick.x) < 5 || // New brick's right edge touches brick's left
      Math.abs(newBrick.x - brickRight) < 5 // New brick's left edge touches brick's right
    ) {
      // Check if they overlap vertically
      const verticalOverlap = 
        (newBrick.y < brickBottom && newBottom > brick.y) ||
        (brick.y < newBottom && brickBottom > newBrick.y);
        
      if (verticalOverlap) {
        connections.push({ targetId: brick.id, type: 'side' });
      }
    }
    
    // Top/bottom connections (vertical)
    if (
      Math.abs(newBottom - brick.y) < 5 || // New brick's bottom touches brick's top
      Math.abs(newBrick.y - brickBottom) < 5 // New brick's top touches brick's bottom
    ) {
      // Check if they overlap horizontally
      const horizontalOverlap = 
        (newBrick.x < brickRight && newRight > brick.x) ||
        (brick.x < newRight && brickRight > newBrick.x);
        
      if (horizontalOverlap) {
        connections.push({ 
          targetId: brick.id, 
          type: newBottom - brick.y < 5 ? 'bottom' : 'top' 
        });
      }
    }
  }
  
  return connections;
}

// Get studs for a brick (connection points)
export function getBrickStuds(brick: PlacedBrick): Array<{ x: number; y: number }> {
  const studs: Array<{ x: number; y: number }> = [];
  const dims = getRotatedDimensions(brick);
  const studSize = 20;
  const studRadius = 7;
  
  for (let x = 0; x < dims.width; x++) {
    for (let y = 0; y < dims.height; y++) {
      studs.push({
        x: brick.x + x * studSize + studSize / 2,
        y: brick.y + y * studSize + studSize / 2
      });
    }
  }
  
  return studs;
}

// Snap position to grid
export function snapToGrid(x: number, y: number, gridSize: number): { x: number; y: number } {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
}

// Get brick center position
export function getBrickCenter(brick: PlacedBrick): { x: number; y: number } {
  const dims = getRotatedDimensions(brick);
  const studSize = 20;
  
  return {
    x: brick.x + (dims.width * studSize) / 2,
    y: brick.y + (dims.height * studSize) / 2
  };
} 
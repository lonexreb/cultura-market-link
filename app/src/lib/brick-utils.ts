import { BrickType, Brick3D } from '../types/brick-types';

// PlacedBrick interface for 2D brick placement (legacy)
interface PlacedBrick {
  id: string;
  x: number;
  y: number;
  rotation: number;
  type: {
    dimensions: {
      width: number;
      length: number;
    };
  };
}

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

// ===== 3D SPATIAL ADJACENCY DETECTION =====

// Check if two 3D bricks are spatially adjacent
export function areAdjacentIn3D(brick1: Brick3D, brick2: Brick3D, tolerance: number = 30): boolean {
  const pos1 = brick1.position;
  const pos2 = brick2.position;
  const dims1 = brick1.brickType.dimensions;
  const dims2 = brick2.brickType.dimensions;
  
  // Base unit size in 3D space (matching the BASE constant from BrickWorkspace)
  const BASE = 25;
  
  // Calculate brick bounds
  const brick1Bounds = {
    minX: pos1.x - (dims1.x * BASE) / 2,
    maxX: pos1.x + (dims1.x * BASE) / 2,
    minZ: pos1.z - (dims1.z * BASE) / 2,
    maxZ: pos1.z + (dims1.z * BASE) / 2,
    y: pos1.y
  };
  
  const brick2Bounds = {
    minX: pos2.x - (dims2.x * BASE) / 2,
    maxX: pos2.x + (dims2.x * BASE) / 2,
    minZ: pos2.z - (dims2.z * BASE) / 2,
    maxZ: pos2.z + (dims2.z * BASE) / 2,
    y: pos2.y
  };
  
  // Check if bricks are on similar Y level (within tolerance)
  const yDifference = Math.abs(brick1Bounds.y - brick2Bounds.y);
  if (yDifference > tolerance) {
    return false;
  }
  
  // Check adjacency in X direction (left-right)
  const xGapLeft = Math.abs(brick1Bounds.maxX - brick2Bounds.minX); // brick1 to the left of brick2
  const xGapRight = Math.abs(brick2Bounds.maxX - brick1Bounds.minX); // brick2 to the left of brick1
  const xAdjacent = (xGapLeft <= tolerance || xGapRight <= tolerance);
  
  // Check adjacency in Z direction (front-back) 
  const zGapFront = Math.abs(brick1Bounds.maxZ - brick2Bounds.minZ); // brick1 in front of brick2
  const zGapBack = Math.abs(brick2Bounds.maxZ - brick1Bounds.minZ); // brick2 in front of brick1
  const zAdjacent = (zGapFront <= tolerance || zGapBack <= tolerance);
  
  // Check if there's overlap in the perpendicular dimension
  let hasOverlap = false;
  
  if (xAdjacent) {
    // If adjacent in X, check for Z overlap
    const zOverlap = !(brick1Bounds.maxZ < brick2Bounds.minZ || brick2Bounds.maxZ < brick1Bounds.minZ);
    hasOverlap = zOverlap;
  } else if (zAdjacent) {
    // If adjacent in Z, check for X overlap
    const xOverlap = !(brick1Bounds.maxX < brick2Bounds.minX || brick2Bounds.maxX < brick1Bounds.minX);
    hasOverlap = xOverlap;
  }
  
  return (xAdjacent || zAdjacent) && hasOverlap;
}

// Find all adjacent brick pairs in a workspace
export function findAdjacentBrickPairs(bricks: Brick3D[]): Array<{ brick1: Brick3D; brick2: Brick3D }> {
  const adjacentPairs: Array<{ brick1: Brick3D; brick2: Brick3D }> = [];
  
  for (let i = 0; i < bricks.length; i++) {
    for (let j = i + 1; j < bricks.length; j++) {
      if (areAdjacentIn3D(bricks[i], bricks[j])) {
        adjacentPairs.push({ brick1: bricks[i], brick2: bricks[j] });
      }
    }
  }
  
  return adjacentPairs;
}

// Create workflow edge data from adjacent brick pair
export function createEdgeFromAdjacentBricks(brick1: Brick3D, brick2: Brick3D): any {
  // Get corresponding node IDs (assuming they follow the pattern from BrickWorkflowContext)
  const sourceNodeId = `node-${brick1.customId}`;
  const targetNodeId = `node-${brick2.customId}`;
  
  // Create unique edge ID
  const edgeId = `edge-${brick1.customId}-${brick2.customId}`;
  
  return {
    id: edgeId,
    source: sourceNodeId,
    target: targetNodeId,
    animated: true,
    style: { 
      stroke: '#00CED1', 
      strokeWidth: 3, 
      filter: 'drop-shadow(0 0 8px rgba(0, 206, 209, 0.6))' 
    },
    data: {
      createdFromBricks: true,
      sourceBrickId: brick1.customId,
      targetBrickId: brick2.customId
    }
  };
}
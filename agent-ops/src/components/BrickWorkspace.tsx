import React, { useState, useRef, useEffect } from 'react';
import { BrickPanel } from './BrickPanel';
import { BrickType, ConnectorType, BRICK_COLORS, BRICK_TYPES, Brick3D } from '../types/brick-types';
import { useBrickWorkflow } from '../contexts/BrickWorkflowContext';
import * as THREE from 'node_modules/@types/three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import loadingGif from '../assets/loading.gif';

interface BrickWorkspaceProps {
  className?: string;
}

// Constants from original brick-builder
const BASE = 25;

// Helper functions from original brick-builder
function getMeasurementsFromDimensions(dimensions: { x: number; z: number }) {
  return {
    width: BASE * dimensions.x,
    height: (BASE * 2) / 1.5, // Standard brick height
    depth: BASE * dimensions.z
  };
}

function CSSToHex(css: string): number {
  return parseInt(`0x${css.substring(1)}`, 16);
}

// Convert Tailwind color names to hex values (brightened for dark background contrast)
function tailwindColorToHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    'cyan': '#22d3ee',      // Brighter cyan
    'emerald': '#34d399',   // Brighter emerald
    'blue': '#60a5fa',      // Brighter blue
    'purple': '#a78bfa',    // Brighter purple
    'orange': '#fb923c',    // Brighter orange
    'yellow': '#fbbf24',    // Brighter yellow
    'red': '#f87171',       // Brighter red
    'slate': '#94a3b8',     // Brighter slate
    'indigo': '#818cf8',    // Brighter indigo
    'teal': '#2dd4bf',      // Brighter teal
    'pink': '#f472b6',      // Brighter pink
    'violet': '#a78bfa',    // Brighter violet
    'lime': '#a3e635',      // Brighter lime
    'gray': '#9ca3af'       // Brighter gray
  };
  
  return colorMap[colorName] || '#f87171'; // Default to bright red if color not found
}

// Rollover brick class with studs for preview
class RollOverBrick extends THREE.Mesh {
  dimensions: { x: number; z: number };
  rotated: number | null;
  translation: number;

  constructor(color: string, dimensions: { x: number; z: number }) {
    const { width, height, depth } = getMeasurementsFromDimensions(dimensions);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0x00FFFF, // Bright cyan for high contrast against dark background
      opacity: 0.8, // More opaque for better visibility
      transparent: true 
    });
    
    // Use the same brick geometry with studs for preview
    const [rollOverGeo] = createBrickMesh(mat, width, height, depth, dimensions);
    super(rollOverGeo, mat);
    this.dimensions = dimensions;
    this.rotated = null;
    this.translation = 0;
  }

  setShape(dimensions: { x: number; z: number }) {
    const { width, height, depth } = getMeasurementsFromDimensions(dimensions);
    this.geometry.dispose();
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0x00FFFF, // Bright cyan for high contrast against dark background
      opacity: 0.8, // More opaque for better visibility
      transparent: true 
    });
    const [newGeometry] = createBrickMesh(mat, width, height, depth, dimensions);
    this.geometry = newGeometry;
    this.dimensions = dimensions;
    this.translation = 0;
    if (this.rotated !== null) {
      this.rotateY(-this.rotated);
    }
    this.rotated = null;
  }

  rotate(angle: number) {
    if (this.rotated !== null) {
      if ((this.dimensions.z % 2 !== 0 && this.dimensions.x % 2 === 0) ||
          (this.dimensions.x % 2 !== 0 && this.dimensions.z % 2 === 0)) {
        this.geometry.translate(BASE / 2, 0, BASE / 2);
        this.translation = 0;
      }
      this.rotateY(-angle);
      this.rotated = null;
    } else {
      if ((this.dimensions.z % 2 !== 0 && this.dimensions.x % 2 === 0) ||
          (this.dimensions.x % 2 !== 0 && this.dimensions.z % 2 === 0)) {
        this.geometry.translate(-BASE / 2, 0, -BASE / 2);
        this.translation = -BASE / 2;
      }
      this.rotateY(angle);
      this.rotated = angle;
    }
  }
}

// Utility function to merge meshes (adapted from original brick-builder)
function mergeMeshes(meshes: THREE.Mesh[]): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];
  
  for (const mesh of meshes) {
    mesh.updateMatrix();
    const clonedGeometry = mesh.geometry.clone();
    clonedGeometry.applyMatrix4(mesh.matrix);
    geometries.push(clonedGeometry);
  }
  
  return BufferGeometryUtils.mergeGeometries(geometries)!;
}

// Function to create brick mesh with studs (based on original brick-builder)
function createBrickMesh(material: THREE.Material, width: number, height: number, depth: number, dimensions: { x: number; z: number }): [THREE.BufferGeometry, THREE.Material] {
  const meshes: THREE.Mesh[] = [];
  const knobSize = 7;
  
  // Main brick body
  const cubeGeo = new THREE.BoxGeometry(width - 0.1, height - 0.1, depth - 0.1);
  const mainMesh = new THREE.Mesh(cubeGeo, material);
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;
  meshes.push(mainMesh);
  
  // Add studs (cylindrical knobs on top)
  const cylinderGeo = new THREE.CylinderGeometry(knobSize, knobSize, knobSize, 20);
  
  for (let i = 0; i < dimensions.x; i++) {
    for (let j = 0; j < dimensions.z; j++) {
      const cylinder = new THREE.Mesh(cylinderGeo, material);
      cylinder.position.x = BASE * i - ((dimensions.x - 1) * BASE / 2);
      cylinder.position.y = BASE / 1.5; // Position studs on top
      cylinder.position.z = BASE * j - ((dimensions.z - 1) * BASE / 2);
      
      cylinder.castShadow = true;
      cylinder.receiveShadow = true;
      meshes.push(cylinder);
    }
  }
  
  const brickGeometry = mergeMeshes(meshes);
  return [brickGeometry, material];
}

// LEGO brick class with studs (based on original brick-builder)
class SimpleBrick extends THREE.Mesh {
  customId: string;
  brickType: BrickType;
  color: string;
  defaultColor: THREE.Color;
  height: number;
  width: number;
  depth: number;

  constructor(
    intersect: THREE.Intersection, 
    color: string, 
    dimensions: { x: number; z: number }, 
    rotation: number, 
    translation: number,
    brickType: BrickType
  ) {
    console.log('SimpleBrick constructor called with:', { dimensions, color, rotation, translation });
    
    const cubeMaterial = new THREE.MeshStandardMaterial({
      color: CSSToHex(color),
      metalness: 0.2,     // Less metallic for brighter appearance
      roughness: 0.3,     // Less rough for more reflection
      emissive: 0x111111, // Slight emissive glow for better visibility
    });
    
    const { height, width, depth } = getMeasurementsFromDimensions(dimensions);
    const [brickGeometry, material] = createBrickMesh(cubeMaterial, width, height, depth, dimensions);
    
    super(brickGeometry, material);

    this.height = height;
    this.width = width;
    this.depth = depth;

    const evenWidth = dimensions.x % 2 === 0;
    const evenDepth = dimensions.z % 2 === 0;

    // Use the intersect point and face normal, with fallback
    const normal = intersect.face?.normal || new THREE.Vector3(0, 1, 0);
    this.position.copy(intersect.point).add(normal);
    this.position.divide(new THREE.Vector3(BASE, height, BASE)).floor()
      .multiply(new THREE.Vector3(BASE, height, BASE))
      .add(new THREE.Vector3(
        evenWidth ? BASE : BASE / 2, 
        height / 2, 
        evenDepth ? BASE : BASE / 2
      ));
    
    // Prevent placing bricks below the ground plane (y = 0)
    if (this.position.y < height / 2) {
      this.position.y = height / 2;
    }
    
    console.log('Brick positioned at:', this.position);
    
    this.rotation.y = rotation;
    this.geometry.translate(translation, 0, translation);
    this.castShadow = true;
    this.receiveShadow = true;
    this.customId = `brick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.defaultColor = (cubeMaterial as THREE.MeshStandardMaterial).color.clone();
    this.brickType = brickType;
    this.color = color;
    
    console.log('SimpleBrick constructor completed:', this.customId);
  }

  updateColor(color: string) {
    (this.material as THREE.MeshStandardMaterial).color.setHex(CSSToHex(color));
    this.defaultColor = (this.material as THREE.MeshStandardMaterial).color.clone();
    this.color = color;
  }
}

export function BrickWorkspace({ className = '' }: BrickWorkspaceProps) {
  // State management
  const [selectedBrick, setSelectedBrick] = useState<BrickType | ConnectorType | null>(BRICK_TYPES[0]); // Default to first brick (GPT-4)
  
  // Debug logging for brick selection
  const handleBrickSelection = (brick: BrickType | ConnectorType) => {
    console.log('🎯 Brick selected in BrickWorkspace:', brick.name, brick.id, 'dimensions' in brick ? brick.dimensions : 'connector');
    setSelectedBrick(brick);
  };
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [mode, setMode] = useState<'build' | 'delete' | 'paint'>('build');
  const [showGrid, setShowGrid] = useState(true);
  const [isBrickPanelOpen, setIsBrickPanelOpen] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isDDown, setIsDDown] = useState(false);
  const [isRDown, setIsRDown] = useState(false);
  const [drag, setDrag] = useState(false);
  const [brickHover, setBrickHover] = useState(false);
  const [showBrickHint, setShowBrickHint] = useState(true);
  const [spatialConnectionNotification, setSpatialConnectionNotification] = useState<string | null>(null);
  
  // Workflow context
  const { 
    workspaceState, 
    addBrick, 
    removeBrick, 
    updateBrick, 
    syncWithNodes, 
    detectSpatialConnections,
    isLoading: isSyncing,
    isAutoSyncing
  } = useBrickWorkflow();
  
  // Debug sync function
  const handleSyncClick = async () => {
    console.log('🚀 Sync button clicked!');
    console.log('📊 Current workspace state:', {
      bricks: workspaceState.bricks.length,
      nodeConnections: workspaceState.nodeConnections.length,
      isSyncing
    });
    
    if (workspaceState.bricks.length === 0) {
      alert('❗ No bricks to sync! Place some bricks first by clicking on the 3D workspace.');
      return;
    }
    
    await syncWithNodes();
  };
  
  // Three.js refs
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<OrbitControls>();
  const raycasterRef = useRef<THREE.Raycaster>();
  const mouseRef = useRef<THREE.Vector2>();
  const planeRef = useRef<THREE.Mesh>();
  const gridRef = useRef<THREE.GridHelper>();
  const rollOverBrickRef = useRef<RollOverBrick>();
  const placedBricksRef = useRef<SimpleBrick[]>([]);
  
  // Refs to store current state values for event handlers
  const selectedBrickRef = useRef(selectedBrick);
  const modeRef = useRef(mode);
  const isDDownRef = useRef(isDDown);
  const dragRef = useRef(drag);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      1,
      10000
    );
    camera.position.set(500, 800, 1300);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 200;
    controls.maxDistance = 2000;
    controlsRef.current = controls;

    // Enhanced lighting setup for better brick visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8); // Brighter ambient light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); // Brighter directional light
    directionalLight.position.set(1000, 1500, 500);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffcc, 0.8, 1000, 0); // Brighter, warmer point light
    pointLight.position.set(-1000, 1500, 500);
    scene.add(pointLight);
    
    // Additional fill light for better contrast
    const fillLight = new THREE.PointLight(0xccccff, 0.4, 800, 0);
    fillLight.position.set(500, 800, -500);
    scene.add(fillLight);

    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(3000, 3000);
    const planeMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x1e293b, 
      transparent: true, 
      opacity: 0.8 
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);
    planeRef.current = plane;

    // Grid helper
    const grid = new THREE.GridHelper(1500, 60, 0x64748b, 0x475569);
    grid.material.opacity = 0.3;
    grid.material.transparent = true;
    scene.add(grid);
    gridRef.current = grid;

    // Raycaster and mouse for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    raycasterRef.current = raycaster;
    mouseRef.current = mouse;

    // Create initial rollover brick
    if (selectedBrick && 'dimensions' in selectedBrick) {
      const initialColor = 'color' in selectedBrick 
        ? tailwindColorToHex(selectedBrick.color.primary)
        : selectedColor;
      const rollOverBrick = new RollOverBrick(initialColor, selectedBrick.dimensions);
      scene.add(rollOverBrick);
      rollOverBrickRef.current = rollOverBrick;
    }

    // Mount renderer
    mountRef.current.appendChild(renderer.domElement);

    // Event listeners
    const handleMouseMove = (event: MouseEvent) => onMouseMove(event);
    const handleMouseDown = (event: MouseEvent) => onMouseDown(event);
    const handleMouseUp = (event: MouseEvent) => onMouseUp(event);
    const handleKeyDown = (event: KeyboardEvent) => onKeyDown(event);
    const handleKeyUp = (event: KeyboardEvent) => onKeyUp(event);
    const handleResize = () => onWindowResize();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update rollover brick when selection changes
  useEffect(() => {
    if (!sceneRef.current || !selectedBrick || !('dimensions' in selectedBrick)) {
      if (rollOverBrickRef.current) {
        sceneRef.current?.remove(rollOverBrickRef.current);
        rollOverBrickRef.current = undefined;
      }
      return;
    }

    // Remove existing rollover brick
    if (rollOverBrickRef.current) {
      sceneRef.current.remove(rollOverBrickRef.current);
    }

    // Create new rollover brick with brick's predefined color
    const previewColor = 'color' in selectedBrick 
      ? tailwindColorToHex(selectedBrick.color.primary)
      : selectedColor;
    const rollOverBrick = new RollOverBrick(previewColor, selectedBrick.dimensions);
    sceneRef.current.add(rollOverBrick);
    rollOverBrickRef.current = rollOverBrick;
  }, [selectedBrick, selectedColor]);

  // Listen for spatial connection notifications
  useEffect(() => {
    const handleSpatialConnectionNotification = (event: CustomEvent) => {
      const { message } = event.detail;
      setSpatialConnectionNotification(message);
      
      // Auto-hide notification after 3 seconds
      setTimeout(() => {
        setSpatialConnectionNotification(null);
      }, 3000);
    };

    window.addEventListener('showSpatialConnectionNotification', handleSpatialConnectionNotification as EventListener);

    return () => {
      window.removeEventListener('showSpatialConnectionNotification', handleSpatialConnectionNotification as EventListener);
    };
  }, []);

  // Mouse and keyboard interaction handlers
  const onMouseMove = (event: MouseEvent) => {
    if (!mountRef.current || !raycasterRef.current || !mouseRef.current || !cameraRef.current) return;

    setDrag(true);
    
    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    const intersects = raycasterRef.current.intersectObjects([
      planeRef.current!, 
      ...placedBricksRef.current
    ], true);

    if (intersects.length > 0 && rollOverBrickRef.current && !isDDown) {
      const intersect = intersects[0];
      const { height } = getMeasurementsFromDimensions(rollOverBrickRef.current.dimensions);
      const evenWidth = rollOverBrickRef.current.dimensions.x % 2 === 0;
      const evenDepth = rollOverBrickRef.current.dimensions.z % 2 === 0;

      rollOverBrickRef.current.position.copy(intersect.point).add(intersect.face!.normal);
      rollOverBrickRef.current.position.divide(new THREE.Vector3(BASE, height, BASE)).floor()
        .multiply(new THREE.Vector3(BASE, height, BASE))
        .add(new THREE.Vector3(
          evenWidth ? BASE : BASE / 2, 
          height / 2, 
          evenDepth ? BASE : BASE / 2
        ));
      rollOverBrickRef.current.visible = true;
    }

    // Check for brick hover
    const brickIntersect = intersects.find(intersect => 
      intersect.object instanceof SimpleBrick && (isDDown || isRDown || mode === 'paint')
    );
    setBrickHover(!!brickIntersect);
  };

  const onMouseDown = (event: MouseEvent) => {
    setDrag(false);
  };

  const onMouseUp = (event: MouseEvent) => {
    const currentSelectedBrick = selectedBrickRef.current;
    const currentMode = modeRef.current;
    const currentIsDDown = isDDownRef.current;
    const currentDrag = dragRef.current;
    
    console.log('Mouse up event:', { 
      target: (event.target as HTMLElement).tagName, 
      drag: currentDrag, 
      mode: currentMode, 
      isDDown: currentIsDDown,
      selectedBrick: currentSelectedBrick?.name 
    });

    if (!raycasterRef.current || !mouseRef.current || !cameraRef.current) {
      console.log('Missing refs for mouse up');
      return;
    }
    
    if ((event.target as HTMLElement).tagName.toLowerCase() !== 'canvas') {
      console.log('Click not on canvas, target:', (event.target as HTMLElement).tagName);
      return;
    }
    
    if (currentDrag) {
      console.log('Drag detected, ignoring click');
      return;
    }

    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;

    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects([
      planeRef.current!, 
      ...placedBricksRef.current
    ]);

    console.log('Intersects found:', intersects.length);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      console.log('Intersect object:', intersect.object.constructor.name, 'at point:', intersect.point);

      if (currentMode === 'build') {
        if (currentIsDDown) {
          console.log('Delete mode active');
          deleteCube(intersect);
        } else {
          console.log('Build mode active, calling createCube');
          createCube(currentSelectedBrick, intersect);
        }
      } else if (currentMode === 'paint') {
        console.log('Paint mode active');
        paintCube(intersect);
      } else if (currentMode === 'delete') {
        console.log('Delete mode active');
        deleteCube(intersect);
      }
    } else {
      console.log('No intersects found');
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.keyCode) {
      case 68: // D key
        setIsDDown(true);
        if (rollOverBrickRef.current) {
          rollOverBrickRef.current.visible = false;
        }
        break;
      case 82: // R key
        setIsRDown(true);
        if (rollOverBrickRef.current) {
          rollOverBrickRef.current.rotate(Math.PI / 2);
          setRotation(rollOverBrickRef.current.rotation.y);
        }
        break;
      case 16: // Shift key
        setIsShiftDown(true);
        break;
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    switch (event.keyCode) {
      case 68: // D key
        setIsDDown(false);
        if (rollOverBrickRef.current && mode === 'build') {
          rollOverBrickRef.current.visible = true;
        }
        break;
      case 82: // R key
        setIsRDown(false);
        break;
      case 16: // Shift key
        setIsShiftDown(false);
        break;
    }
  };

  const createCube = (selectedBrick: BrickType | ConnectorType | null, intersect: THREE.Intersection) => {
    console.log('createCube called with:', { selectedBrick: selectedBrick?.name, intersect });
    
    if (!selectedBrick || !sceneRef.current || !('dimensions' in selectedBrick) || !rollOverBrickRef.current) {
      console.log('Missing requirements:', {
        selectedBrick: !!selectedBrick,
        sceneRef: !!sceneRef.current,
        hasIntersect: !!intersect,
        rollOverBrick: !!rollOverBrickRef.current
      });
      return;
    }

    // Prevent placing bricks below the ground plane
    if (intersect.point.y < 0) {
      console.log('Cannot place brick below ground plane at y:', intersect.point.y);
      return;
    }

    console.log('Attempting to place brick:', selectedBrick.name);

    // Simplified collision detection - disable for now to test
    let canCreate = true;
    /*
    const rollOverBox = new THREE.Box3().setFromObject(rollOverBrickRef.current);
    
    for (const brick of placedBricksRef.current) {
      const brickBox = new THREE.Box3().setFromObject(brick);
      if (rollOverBox.intersectsBox(brickBox)) {
        const { width, depth } = getMeasurementsFromDimensions(selectedBrick.dimensions);
        const dx = Math.abs(brickBox.max.x - rollOverBox.max.x);
        const dz = Math.abs(brickBox.max.z - rollOverBox.max.z);
        const yIntersect = brickBox.max.y - 9 > rollOverBox.min.y;
        
        if (yIntersect && dx !== width && dz !== depth) {
          canCreate = false;
          break;
        }
      }
    }
    */

    if (!canCreate) {
      console.log('Collision detected, cannot create brick');
      return;
    }

    console.log('Creating SimpleBrick...');
    
    // Use brick's predefined color or selected color from palette
    const brickColor = 'color' in selectedBrick 
      ? tailwindColorToHex(selectedBrick.color.primary)
      : selectedColor;
    
    console.log('Selected brick details:', {
      name: selectedBrick.name,
      dimensions: selectedBrick.dimensions,
      brickColor: brickColor,
      selectedColor: selectedColor
    });

    try {
      const brick = new SimpleBrick(
        intersect, 
        brickColor, 
        selectedBrick.dimensions, 
        rollOverBrickRef.current.rotation.y, 
        rollOverBrickRef.current.translation,
        selectedBrick
      );

      console.log('SimpleBrick created:', brick.customId, brick.position);

      sceneRef.current.add(brick);
      placedBricksRef.current.push(brick);

      console.log('Brick added to scene. Total bricks:', placedBricksRef.current.length);

      // Create Brick3D object for workflow synchronization
      const brick3D: Brick3D = {
        customId: brick.customId,
        brickType: selectedBrick,
        color: brickColor,
        position: {
          x: brick.position.x,
          y: brick.position.y,
          z: brick.position.z
        },
        rotation: brick.rotation.y,
        connections: []
      };

      addBrick(brick3D);

      // Hide hint after first brick is placed
      if (showBrickHint) {
        setShowBrickHint(false);
      }

      // Trigger spatial connection detection after a short delay to allow state updates
      setTimeout(() => {
        console.log('🔍 Detecting spatial connections after brick placement...');
        detectSpatialConnections();
      }, 100);

      console.log('✅ Brick placed successfully:', selectedBrick.name, 'at position:', brick.position);
    } catch (error) {
      console.error('❌ Error creating brick:', error);
    }
  };

  const deleteCube = (intersect: THREE.Intersection) => {
    if (!sceneRef.current || intersect.object === planeRef.current) return;

    const brick = intersect.object as SimpleBrick;
    if (!(brick instanceof SimpleBrick)) return;

    sceneRef.current.remove(brick);
    placedBricksRef.current = placedBricksRef.current.filter(b => b !== brick);
    brick.geometry.dispose();
    (brick.material as THREE.Material).dispose();
    removeBrick(brick.customId);

    console.log('Brick deleted:', brick.customId);
  };

  const paintCube = (intersect: THREE.Intersection) => {
    if (intersect.object === planeRef.current) return;

    const brick = intersect.object as SimpleBrick;
    if (!(brick instanceof SimpleBrick)) return;

    brick.updateColor(selectedColor);
    updateBrick(brick.customId, { color: selectedColor });

    console.log('Brick painted:', brick.customId, selectedColor);
  };

  const onWindowResize = () => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
  };

  // Keep refs updated with current state values
  useEffect(() => {
    selectedBrickRef.current = selectedBrick;
  }, [selectedBrick]);
  
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  
  useEffect(() => {
    isDDownRef.current = isDDown;
  }, [isDDown]);
  
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  // Debug effect to monitor selectedBrick changes
  useEffect(() => {
    console.log('🔄 selectedBrick changed to:', selectedBrick?.name, selectedBrick?.id, 'dimensions' in selectedBrick ? selectedBrick.dimensions : 'connector');
  }, [selectedBrick]);

  // Update effects
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
  }, [showGrid]);

  useEffect(() => {
    if (rollOverBrickRef.current) {
      rollOverBrickRef.current.visible = mode === 'build' && !!selectedBrick && !isDDown;
    }
  }, [mode, selectedBrick, isDDown]);

  // Save/Load functionality
  const handleSave = () => {
    const data = {
      bricks: workspaceState.bricks,
      nodeConnections: workspaceState.nodeConnections,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-brick-creation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        console.log('Loading AI brick workspace:', data);
        // TODO: Implement loading saved workspace
      } catch (error) {
        console.error('Failed to load workspace file:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`relative h-full w-full bg-slate-900 ${className}`}>
      {/* Simple Toolbar */}
      <div className="absolute top-4 left-96 right-4 z-30 flex items-center justify-between">
        {/* Mode buttons */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-slate-600">
          <button
            onClick={() => setMode('build')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'build'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            🏗️ Build
          </button>
          <button
            onClick={() => setMode('delete')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'delete'
                ? 'bg-red-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            🗑️ Delete
          </button>
          <button
            onClick={() => setMode('paint')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'paint'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            🎨 Paint
          </button>
        </div>

        {/* Utility buttons */}
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-2 border border-slate-600">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded"
            />
            Grid
          </label>
          <div className="h-4 w-px bg-slate-600" />
          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              isSyncing 
                ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isSyncing ? (
              <div className="flex items-center gap-2">
                <img src={loadingGif} alt="Loading..." className="w-4 h-4" />
                Syncing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                🔄 Sync to Nodes
              </div>
            )}
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm text-slate-300 hover:text-white transition-colors"
          >
            💾 Save
          </button>
        </div>
      </div>

      {/* Info Panel */}
      {selectedBrick && 'functionType' in selectedBrick && (
        <div className="absolute top-20 right-4 z-20 bg-slate-800 rounded-lg p-4 border border-slate-600 max-w-xs">
          <div className="text-sm font-medium text-white mb-2">{selectedBrick.name}</div>
          <div className="text-xs text-slate-400 mb-2">{selectedBrick.description}</div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-blue-400">Function: {selectedBrick.functionType}</span>
            <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded">
              {selectedBrick.dimensions.x}×{selectedBrick.dimensions.z}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedBrick.capabilities.map(cap => (
              <span key={cap} className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded">
                {cap}
              </span>
            ))}
          </div>
          {selectedBrick.nodeEquivalent && (
            <div className="text-xs text-green-400 mb-2">
              → Creates: {selectedBrick.nodeEquivalent} node
            </div>
          )}
          <div className="text-xs text-amber-400 border-t border-slate-600 pt-2">
            💡 Select different bricks from the left panel for various sizes and AI functions!
          </div>
        </div>
      )}

      {/* Brick Selection Hint */}
      {showBrickHint && placedBricksRef.current.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-slate-800/95 backdrop-blur-sm rounded-xl p-6 border border-slate-600 max-w-md text-center">
          <div className="text-2xl mb-3">🧱</div>
          <div className="text-lg font-semibold text-white mb-2">Welcome to AI Brick Builder!</div>
          <div className="text-sm text-slate-300 mb-4">
            You're currently using the <span className="text-cyan-400 font-medium">GPT-4 Brick (1×1)</span>.
            <br />
            Open the brick panel on the left to select different AI models with various sizes and functions!
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
            <span>🎯 Claude (2×1)</span>
            <span>✨ Gemini (2×2)</span>
            <span>⚡ Groq (3×1)</span>
            <span>🎨 DALL-E (3×2)</span>
          </div>
          <button
            onClick={() => setShowBrickHint(false)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            Got it! Start Building
          </button>
        </div>
      )}

      {/* 🔄 Subtle Auto-Sync Indicator - Corner */}
      {isAutoSyncing && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2 bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-xl px-3 py-2 shadow-lg">
          <img src={loadingGif} alt="Auto-syncing..." className="w-4 h-4" />
          <span className="text-xs text-slate-400">Auto-syncing...</span>
        </div>
      )}

      {/* 🎬 GIF-FOCUSED LOADING TAB - Manual Sync Only */}
      {isSyncing && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-700 ease-out"
          style={{
            background: 'rgba(0, 0, 0, 0.3)', // Much lighter background - just blur
            backdropFilter: 'blur(12px)',
            animation: 'fadeInBlur 0.8s ease-out forwards'
          }}
        >
          {/* Compact Loading Tab - Deploy Tab Size */}
          <div 
            className="relative transform transition-all duration-1000 ease-out max-w-sm"
            style={{
              animation: 'popInScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
            }}
          >
            {/* Subtle Gradient Aura */}
            <div 
              className="absolute inset-0 rounded-3xl blur-2xl opacity-60 transition-all duration-2000"
              style={{
                background: 'linear-gradient(45deg, #06b6d4, #8b5cf6, #ec4899, #06b6d4)',
                backgroundSize: '400% 400%',
                animation: 'gradientShift 3s ease-in-out infinite, pulseGlow 2s ease-in-out infinite'
              }}
            ></div>
            
            {/* Compact Loading Card */}
            <div 
              className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-500/40 rounded-3xl p-8 text-center shadow-xl transition-all duration-500"
              style={{
                boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(59, 130, 246, 0.2)'
              }}
            >
              {/* 🌟 HERO LOADING GIF - THE ABSOLUTE STAR */}
              <div 
                className="mb-6 relative group"
                style={{
                  animation: 'floatGif 3s ease-in-out infinite'
                }}
              >
                {/* Glowing Ring Around GIF */}
                <div 
                  className="absolute inset-0 rounded-full blur-lg opacity-70 transition-all duration-1000"
                  style={{
                    background: 'conic-gradient(from 0deg, #06b6d4, #8b5cf6, #ec4899, #06b6d4)',
                    animation: 'rotateRing 4s linear infinite, pulseRing 2s ease-in-out infinite',
                    padding: '6px'
                  }}
                ></div>
                
                {/* The MAGNIFICENT Loading GIF - Main Focus */}
                <img 
                  src={loadingGif} 
                  alt="Loading..." 
                  className="relative w-32 h-32 mx-auto rounded-2xl shadow-xl border-3 border-white/15 transition-all duration-300 group-hover:scale-105"
                  style={{
                    filter: 'brightness(1.2) contrast(1.2)',
                    animation: 'gifPulse 2s ease-in-out infinite'
                  }}
                />
                
                {/* Subtle Sparkle Effects */}
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-white rounded-full opacity-70"
                    style={{
                      left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 6)}%`,
                      top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 6)}%`,
                      animation: `sparkle 2s ease-in-out infinite ${i * 0.3}s`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                ))}
              </div>
              
              {/* Compact Title - Supporting the GIF */}
              <h2 
                className="text-2xl font-bold mb-3 transition-all duration-1000"
                style={{
                  background: 'linear-gradient(45deg, #22d3ee, #8b5cf6, #ec4899)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'gradientText 3s ease-in-out infinite, slideInFromTop 1s ease-out 0.5s both'
                }}
              >
                Syncing Magic
              </h2>
              
              {/* Simple Subtitle */}
              <p 
                className="text-sm text-slate-400 mb-6 transition-all duration-1000"
                style={{
                  animation: 'slideInFromBottom 1s ease-out 0.7s both'
                }}
              >
                Connecting bricks to AI workflows...
              </p>
              
              {/* Compact Progress Bar */}
              <div 
                className="mb-4"
                style={{
                  animation: 'slideInFromLeft 1s ease-out 0.9s both'
                }}
              >
                <div className="w-48 h-2 bg-slate-700/40 rounded-full overflow-hidden mx-auto">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      background: 'linear-gradient(90deg, #22d3ee, #8b5cf6, #ec4899)',
                      width: '100%',
                      animation: 'waveProgress 3s ease-in-out infinite'
                    }}
                  ></div>
                </div>
              </div>
              
              {/* Simple Stats Row */}
              <div 
                className="flex items-center justify-center gap-6 text-xs text-slate-500"
                style={{
                  animation: 'slideInFromRight 1s ease-out 1.1s both'
                }}
              >
                <div className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: '#22d3ee',
                      animation: 'breathe 2s ease-in-out infinite',
                      boxShadow: '0 0 10px #22d3ee50'
                    }}
                  ></div>
                  <span>{workspaceState.bricks.length} bricks</span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: '#8b5cf6',
                      animation: 'breathe 2s ease-in-out infinite 0.5s',
                      boxShadow: '0 0 10px #8b5cf650'
                    }}
                  ></div>
                  <span>{workspaceState.nodeConnections.length} nodes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Palette */}
      <div className="absolute bottom-4 right-4 z-20 bg-slate-800 rounded-lg p-3 border border-slate-600">
        <div className="text-xs text-slate-400 mb-2">Colors</div>
        <div className="grid grid-cols-4 gap-2">
          {BRICK_COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={`w-8 h-8 rounded border-2 transition-all ${
                selectedColor === color.value
                  ? 'border-white scale-110'
                  : 'border-slate-600 hover:border-slate-400'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Brick Panel */}
      <BrickPanel
        isOpen={isBrickPanelOpen}
        onToggle={() => setIsBrickPanelOpen(!isBrickPanelOpen)}
        selectedBrick={selectedBrick}
        onSelectBrick={handleBrickSelection}
      />

      {/* Spatial Connection Notification */}
      {spatialConnectionNotification && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse">
          {spatialConnectionNotification}
        </div>
      )}

      {/* 3D Scene */}
      <div 
        ref={mountRef} 
        className="absolute inset-0 z-10"
        style={{ 
          cursor: isShiftDown ? 'move' : 
                  brickHover ? 'pointer' :
                  mode === 'build' ? 'crosshair' : 
                  mode === 'delete' ? 'not-allowed' : 
                  'default',
          pointerEvents: 'auto'
        }}
      />

      {/* Status Bar */}
      <div className="absolute bottom-4 left-96 right-80 z-20">
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                Bricks: <span className="text-white">{placedBricksRef.current.length}</span>
              </span>
              <span className="text-slate-400">
                Nodes: <span className={workspaceState.bricks.length === workspaceState.nodeConnections.length ? "text-green-400" : "text-amber-400"}>
                  {workspaceState.nodeConnections.length}/{workspaceState.bricks.length}
                </span>
              </span>
              {selectedBrick && (
                <span className="text-slate-400">
                  Selected: <span className="text-blue-400">
                    {selectedBrick.name} {'dimensions' in selectedBrick ? `(${selectedBrick.dimensions.x}×${selectedBrick.dimensions.z})` : '(Connector)'}
                  </span>
                </span>
              )}
              {isSyncing && (
                <span className="text-blue-400 flex items-center gap-1">
                  <img src={loadingGif} alt="Loading..." className="w-3 h-3" />
                  Syncing...
                </span>
              )}
              {workspaceState.bricks.length >= 2 && (
                <span className="text-green-400 flex items-center gap-1">
                  🔗 Spatial Connections: Active
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {isDDown && mode === 'build' && '🗑️ Delete mode - Release D key'}
              {isRDown && mode === 'build' && '🔄 Rotating'}
              {!isDDown && !isRDown && mode === 'build' && selectedBrick && 'Move mouse • Click to place • D=delete • R=rotate • Place bricks next to each other to auto-connect'}
              {!isDDown && !isRDown && mode === 'build' && !selectedBrick && '← Open brick panel to select different AI bricks'}
              {mode === 'delete' && 'Click bricks to delete'}
              {mode === 'paint' && 'Click bricks to paint'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
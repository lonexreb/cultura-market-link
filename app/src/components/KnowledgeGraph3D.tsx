import React, { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { Activity, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useSchemasContext } from '../contexts/SchemasContext';
import { neo4jService } from '../services/neo4jService';
import { motion } from 'framer-motion';

interface GraphData {
  nodes: Array<{
    id: string | number;
    label: string;
    group?: number;
    properties?: Record<string, any>;
  }>;
  links: Array<{
    source: string | number;
    target: string | number;
    type?: string;
    properties?: Record<string, any>;
  }>;
}

interface KnowledgeGraph3DProps {
  className?: string;
}

const KnowledgeGraph3D: React.FC<KnowledgeGraph3DProps> = ({ className = '' }) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const forceGraphRef = useRef<any>(null);
  const { getConnectedNodes } = useSchemasContext();
  
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ nodeCount: 0, linkCount: 0 });
  const [isGraphVisible, setIsGraphVisible] = useState(true);

  // Get connected GraphRAG nodes
  const connectedNodes = getConnectedNodes();
  
  // Debug logging (can be removed in production)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('KnowledgeGraph3D: Connected nodes:', connectedNodes);
    }
  }, [connectedNodes]);

  // Generate node color hue based on label
  const getNodeHue = useCallback((label: string) => {
    if (!label) return 200;
    const hash = label.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash) % 360;
  }, []);

  // Generate node texture for visualization
  const generateNodeTexture = useCallback((node: any) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 64;
    canvas.height = 64;

    // Background circle with glow
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, `hsla(${getNodeHue(node.label)}, 70%, 60%, 1)`);
    gradient.addColorStop(0.7, `hsla(${getNodeHue(node.label)}, 70%, 40%, 0.8)`);
    gradient.addColorStop(1, `hsla(${getNodeHue(node.label)}, 70%, 20%, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    // Node label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const label = node.label?.slice(0, 8) || 'Node';
    ctx.fillText(label, 32, 32);

    return canvas;
  }, [getNodeHue]);

  // Get relationship color
  const getRelationshipColor = useCallback((type: string) => {
    const colors: Record<string, string> = {
      'CONNECTED_TO': '#00CED1',
      'RELATED_TO': '#FF6B6B',
      'PART_OF': '#4ECDC4',
      'BELONGS_TO': '#45B7D1',
      'CONTAINS': '#96CEB4',
      'default': '#888888'
    };
    return colors[type] || colors.default;
  }, []);

  // Initialize the 3D force graph
  const initializeGraph = useCallback(() => {
    if (!graphRef.current) return;

    const Graph = new ForceGraph3D(graphRef.current)
      .backgroundColor('rgba(15, 23, 42, 0.1)')
      .nodeLabel('label')
      .nodeAutoColorBy('group')
      .nodeThreeObject((node: any) => {
        // Create a glowing sphere for nodes
        const geometry = new THREE.SphereGeometry(5, 16, 16);
        const material = new THREE.MeshLambertMaterial({
          color: `hsl(${getNodeHue(node.label)}, 70%, 60%)`,
          transparent: true,
          opacity: 0.9,
          emissive: `hsl(${getNodeHue(node.label)}, 70%, 30%)`,
          emissiveIntensity: 0.3
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        
        // Add text label above the node
        const textSprite = new SpriteText(node.label || 'Node');
        textSprite.color = `hsl(${getNodeHue(node.label)}, 70%, 80%)`;
        textSprite.textHeight = 3;
        textSprite.position.set(0, 8, 0);
        
        // Create a group to hold both sphere and text
        const group = new THREE.Group();
        group.add(sphere);
        group.add(textSprite);
        
        return group;
      })
      .linkThreeObjectExtend(true)
      .linkThreeObject((link: any) => {
        // Create glowing line with text label
        const material = new THREE.LineBasicMaterial({
          color: getRelationshipColor(link.type || 'default'),
          transparent: true,
          opacity: 0.8,
          linewidth: 2
        });
        
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0)
        ]);
        
        const line = new THREE.Line(geometry, material);
        
        // Add relationship type label
        const linkLabel = new SpriteText(link.type || 'RELATED_TO');
        linkLabel.color = getRelationshipColor(link.type || 'default');
        linkLabel.textHeight = 1.5;
        linkLabel.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        linkLabel.padding = 2;
        
        // Create group for line and label
        const group = new THREE.Group();
        group.add(line);
        group.add(linkLabel);
        
        return group;
      })
      .linkPositionUpdate((linkObject: any, { start, end }) => {
        // Update line geometry
        const line = linkObject.children[0];
        if (line && line.geometry) {
          const positions = [start.x, start.y, start.z, end.x, end.y, end.z];
          line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        }
        
        // Position label at middle of link
        const label = linkObject.children[1];
        if (label) {
          const middlePos = {
            x: start.x + (end.x - start.x) / 2,
            y: start.y + (end.y - start.y) / 2,
            z: start.z + (end.z - start.z) / 2
          };
          Object.assign(label.position, middlePos);
        }
      })
      .onNodeClick((node: any) => {
        // Focus camera on clicked node with smooth animation
        const distance = 80;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        
        Graph.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node,
          3000
        );
      })
      .onNodeHover((node: any) => {
        if (graphRef.current) {
          graphRef.current.style.cursor = node ? 'pointer' : '';
        }
      });

    // Add enhanced lighting
    const scene = Graph.scene();
    
    // Remove existing lights
    scene.children = scene.children.filter(child => !(child instanceof THREE.Light));
    
    // Add ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    // Add directional light for depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Add point lights for dynamic lighting
    const pointLight1 = new THREE.PointLight(0x00ced1, 1, 300);
    pointLight1.position.set(50, 50, 50);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff6b6b, 0.8, 200);
    pointLight2.position.set(-50, -50, -50);
    scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0x4ecdc4, 0.6, 150);
    pointLight3.position.set(0, 100, -100);
    scene.add(pointLight3);
    
    // Add bloom effect with fallback
    const addBloomEffect = async () => {
      try {
        const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          3.0,  // strength - increased for more visibility
          1.0,  // radius
          0.0   // threshold - lower threshold for more glow
        );
        
        const composer = Graph.postProcessingComposer();
        composer.addPass(bloomPass);
        
        console.log('Bloom effect added successfully');
      } catch (error) {
        console.warn('Bloom effect not available, using enhanced materials instead:', error);
        
        // Alternative: Enhanced emissive materials for glow effect
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const material = child.material as THREE.MeshLambertMaterial;
            if (material.emissive) {
              material.emissiveIntensity = 0.5;
            }
          }
        });
      }
    };
    
    addBloomEffect();
    
    // Add animated lighting effects
    let animationId: number;
    const animateLights = () => {
      const time = Date.now() * 0.001;
      
      // Animate point lights
      pointLight1.intensity = 0.8 + Math.sin(time * 0.7) * 0.3;
      pointLight2.intensity = 0.6 + Math.cos(time * 0.5) * 0.2;
      pointLight3.intensity = 0.4 + Math.sin(time * 0.3) * 0.2;
      
      // Rotate lights around the scene
      pointLight1.position.x = Math.cos(time * 0.2) * 100;
      pointLight1.position.z = Math.sin(time * 0.2) * 100;
      
      pointLight2.position.x = Math.cos(time * 0.3 + Math.PI) * 80;
      pointLight2.position.z = Math.sin(time * 0.3 + Math.PI) * 80;
      
      animationId = requestAnimationFrame(animateLights);
    };
    animateLights();
    
    // Store animation ID for cleanup
    (Graph as any).lightAnimationId = animationId;
    
    // Adjust force simulation for better spread
    Graph.d3Force('charge').strength(-200);
    Graph.d3Force('link').distance(50);

    forceGraphRef.current = Graph;

    return Graph;
  }, [generateNodeTexture, getRelationshipColor, getNodeHue]);

  // Fetch graph data from backend
  const fetchGraphData = useCallback(async (nodeId: string) => {
    if (!nodeId) return;

    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('KnowledgeGraph3D: Fetching data for node:', nodeId);
      }
      const result = await neo4jService.getGraphData(nodeId, 200);
      if (process.env.NODE_ENV === 'development') {
        console.log('KnowledgeGraph3D: API response:', result);
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch graph data');
      }

      const responseData = result.data;
      if (process.env.NODE_ENV === 'development') {
        console.log('KnowledgeGraph3D: Response data:', responseData);
      }
      
      // Extract nodes and links from the response
      const nodes = (responseData && (responseData as any).nodes) || [];
      const links = (responseData && (responseData as any).links) || [];
      
      // Transform data for 3D Force Graph
      const transformedData: GraphData = {
        nodes: nodes.map((node: any, index: number) => ({
          id: node.id || index,
          label: node.label || 'Unknown',
          group: getNodeHue(node.label || 'Unknown') / 60,
          properties: node.properties || {}
        })),
        links: links.map((link: any) => ({
          source: link.source,
          target: link.target,
          type: link.type || 'RELATED_TO',
          properties: link.properties || {}
        }))
      };

      setGraphData(transformedData);
      setStats({
        nodeCount: transformedData.nodes.length,
        linkCount: transformedData.links.length
      });

      // Update the graph
      if (forceGraphRef.current) {
        forceGraphRef.current.graphData(transformedData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [getNodeHue]);

  // Initialize graph on mount
  useEffect(() => {
    if (graphRef.current && !forceGraphRef.current) {
      initializeGraph();
    }
  }, [initializeGraph]);

  // Load data when selected node changes
  useEffect(() => {
    if (selectedNodeId) {
      fetchGraphData(selectedNodeId);
    }
  }, [selectedNodeId, fetchGraphData]);

  // Handle window resize and cleanup
  useEffect(() => {
    const handleResize = () => {
      if (forceGraphRef.current && graphRef.current) {
        forceGraphRef.current
          .width(graphRef.current.clientWidth)
          .height(graphRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      // Cleanup animation
      if (forceGraphRef.current && (forceGraphRef.current as any).lightAnimationId) {
        cancelAnimationFrame((forceGraphRef.current as any).lightAnimationId);
      }
    };
  }, []);

  // Toggle graph visibility
  const toggleGraphVisibility = () => {
    setIsGraphVisible(!isGraphVisible);
    if (forceGraphRef.current) {
      const graph = forceGraphRef.current;
      if (isGraphVisible) {
        graph.pauseAnimation();
      } else {
        graph.resumeAnimation();
      }
    }
  };

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* Enhanced Background Layer - FIRST, behind everything */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-cyan-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-cyan-400/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-radial from-purple-400/8 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-radial from-teal-400/12 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0, 206, 209, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 206, 209, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }} />
        </div>
      </div>

      {/* 3D Graph Container - SECOND, on top of background */}
      <div 
        ref={graphRef}
        className={`absolute inset-0 z-5 transition-opacity duration-300 ${
          isGraphVisible ? 'opacity-100' : 'opacity-30'
        }`}
        style={{ 
          background: 'transparent'
        }}
      />

      {/* Control Panel - THIRD, on top of graph */}
      <motion.div 
        className="absolute top-4 left-4 z-30 space-y-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-slate-900/80 backdrop-blur-xl border-cyan-400/30 w-80">
          <CardHeader className="pb-3">
            <CardTitle className="text-cyan-200 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Knowledge Graph Viewer</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Node Selection */}
            <div className="space-y-2">
              <label className="text-sm text-cyan-300">Select GraphRAG Node:</label>
              <Select value={selectedNodeId} onValueChange={setSelectedNodeId}>
                <SelectTrigger className="bg-slate-800/50 border-cyan-400/30 text-cyan-200">
                  <SelectValue placeholder="Choose a connected node..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-cyan-400/30">
                  {connectedNodes.length > 0 ? (
                    connectedNodes.map((node) => (
                      <SelectItem key={node.nodeId} value={node.nodeId} className="text-cyan-200">
                        {node.nodeName}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled className="text-slate-500">
                      No connected GraphRAG nodes
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Graph Stats */}
            {selectedNodeId && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-cyan-300">Nodes:</span>
                  <Badge variant="outline" className="border-cyan-400/30 text-cyan-200">
                    {stats.nodeCount.toLocaleString()}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-cyan-300">Relationships:</span>
                  <Badge variant="outline" className="border-teal-400/30 text-teal-200">
                    {stats.linkCount.toLocaleString()}
                  </Badge>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex space-x-2">
              <Button
                onClick={() => selectedNodeId && fetchGraphData(selectedNodeId)}
                disabled={!selectedNodeId || isLoading}
                variant="outline"
                size="sm"
                className="bg-cyan-500/20 border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/30"
              >
                {isLoading ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              
              <Button
                onClick={toggleGraphVisibility}
                variant="outline"
                size="sm"
                className="bg-slate-500/20 border-slate-400/30 text-slate-200 hover:bg-slate-500/30"
              >
                {isGraphVisible ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading Overlay - HIGHEST, on top of everything */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4">
            <Activity className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
            <p className="text-cyan-200">Loading knowledge graph...</p>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!selectedNodeId && connectedNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center space-y-4 p-8 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-cyan-400/20">
            <h3 className="text-xl text-cyan-200">No Connected GraphRAG Nodes</h3>
            <p className="text-slate-300 max-w-md">
              Connect to a Neo4j database through a GraphRAG node in the workflow tab to visualize your knowledge graph in 3D.
            </p>
          </div>
        </div>
      )}

      {selectedNodeId && stats.nodeCount === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center space-y-4 p-8 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-cyan-400/20">
            <h3 className="text-xl text-cyan-200">Empty Knowledge Graph</h3>
            <p className="text-slate-300 max-w-md">
              The selected GraphRAG node's database appears to be empty. Add some data to see the 3D visualization.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph3D;
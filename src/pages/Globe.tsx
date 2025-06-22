import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Globe from 'globe.gl';
import { ArrowLeft, Users, MapPin, Globe as GlobeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UserPoint {
  lat: number;
  lng: number;
  name: string;
  country: string;
  business: string;
  size: number;
  color: string;
}

interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  name: string;
  activity: string;
}



const GlobePage = () => {
  const globeEl = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null);
  const [arcsData, setArcsData] = useState<ArcData[]>([]);
  const animationRef = useRef<number>();

  // Sample user data points around the globe
  const userData: UserPoint[] = [
    { lat: 40.7128, lng: -74.0060, name: "Amara Kebede", country: "USA", business: "Ethiopian Kitchen", size: 0.5, color: "#f97316" },
    { lat: 51.5074, lng: -0.1278, name: "Ahmad Nazir", country: "UK", business: "Spice Market", size: 0.4, color: "#06b6d4" },
    { lat: 48.8566, lng: 2.3522, name: "Fatima Al-Rashid", country: "France", business: "Silk Crafts", size: 0.6, color: "#f97316" },
    { lat: 52.5200, lng: 13.4050, name: "Hassan Mohammed", country: "Germany", business: "Bakery", size: 0.3, color: "#06b6d4" },
    { lat: 43.6532, lng: -79.3832, name: "Layla Chen", country: "Canada", business: "Tea House", size: 0.4, color: "#f97316" },
    { lat: -33.8688, lng: 151.2093, name: "Omar Kassim", country: "Australia", business: "Food Truck", size: 0.4, color: "#06b6d4" },
    { lat: 35.6762, lng: 139.6503, name: "Zara Okafor", country: "Japan", business: "Fashion", size: 0.5, color: "#f97316" },
    { lat: 55.7558, lng: 37.6176, name: "Maria Santos", country: "Russia", business: "Restaurant", size: 0.3, color: "#06b6d4" },
    { lat: 31.2304, lng: 121.4737, name: "Ibrahim Ali", country: "China", business: "Market", size: 0.6, color: "#f97316" },
    { lat: 28.6139, lng: 77.2090, name: "Sofia Petrov", country: "India", business: "Jewelry", size: 0.4, color: "#06b6d4" },
    { lat: -23.5505, lng: -46.6333, name: "Yuki Tanaka", country: "Brazil", business: "Cafe", size: 0.5, color: "#f97316" },
    { lat: -1.2921, lng: 36.8219, name: "Elena Rodriguez", country: "Kenya", business: "Crafts", size: 0.4, color: "#06b6d4" },
    { lat: 30.0444, lng: 31.2357, name: "David Kim", country: "Egypt", business: "Tech Services", size: 0.3, color: "#f97316" },
    { lat: -34.6037, lng: -58.3816, name: "Priya Sharma", country: "Argentina", business: "Textiles", size: 0.5, color: "#06b6d4" },
    { lat: 59.3293, lng: 18.0686, name: "Carlos Mendez", country: "Sweden", business: "Restaurant", size: 0.4, color: "#f97316" },
  ];

  // Land-based coordinate ranges for different continents
  const landRegions = [
    // North America
    { latRange: [25, 70], lngRange: [-140, -60], name: "North America" },
    // South America  
    { latRange: [-55, 15], lngRange: [-80, -35], name: "South America" },
    // Europe
    { latRange: [35, 70], lngRange: [-10, 40], name: "Europe" },
    // Asia
    { latRange: [10, 70], lngRange: [40, 180], name: "Asia" },
    // Africa
    { latRange: [-35, 35], lngRange: [-20, 50], name: "Africa" },
    // Australia/Oceania
    { latRange: [-45, -10], lngRange: [110, 180], name: "Australia" },
    // Additional Asia regions
    { latRange: [0, 25], lngRange: [95, 140], name: "Southeast Asia" },
    { latRange: [15, 45], lngRange: [25, 65], name: "Middle East" }
  ];

  // Function to generate random land coordinates
  const generateRandomLandCoordinate = () => {
    const region = landRegions[Math.floor(Math.random() * landRegions.length)];
    const lat = region.latRange[0] + Math.random() * (region.latRange[1] - region.latRange[0]);
    const lng = region.lngRange[0] + Math.random() * (region.lngRange[1] - region.lngRange[0]);
    return { lat, lng, region: region.name };
  };

  // Function to generate random arcs between random land locations
  const generateRandomArc = (): ArcData => {
    const startCoord = generateRandomLandCoordinate();
    const endCoord = generateRandomLandCoordinate();
    
    const activities = [
      "Business Connection", "Cultural Exchange", "Order Placed", 
      "Partnership Formed", "Event Collaboration", "Supply Chain",
      "Customer Review", "Recipe Shared", "Language Exchange",
      "New Customer", "Product Delivery", "Service Request",
      "Community Event", "Cultural Festival", "Food Order",
      "Craft Purchase", "Music Collaboration", "Art Exhibition",
      "Language Lesson", "Cooking Class", "Market Visit"
    ];
    
    const colors = ["#f97316", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];
    
    return {
      startLat: startCoord.lat,
      startLng: startCoord.lng,
      endLat: endCoord.lat,
      endLng: endCoord.lng,
      color: colors[Math.floor(Math.random() * colors.length)],
      name: `${startCoord.region} → ${endCoord.region}`,
      activity: activities[Math.floor(Math.random() * activities.length)]
    };
  };

  useEffect(() => {
    if (!globeEl.current) return;

    // Initialize globe
    const globe = Globe()(globeEl.current)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .width(window.innerWidth)
      .height(window.innerHeight - 100)
      .pointOfView({ lat: 20, lng: 0, altitude: 2.5 })
      .showAtmosphere(true)
      .atmosphereColor('#ff6b35')
      .atmosphereAltitude(0.1);

    // Add points data
    globe
      .pointsData(userData)
      .pointAltitude(0.1)
      .pointRadius('size')
      .pointColor('color')
      .pointLabel(d => `
        <div style="background: rgba(0,0,0,0.8); padding: 8px; border-radius: 4px; color: white; font-family: sans-serif;">
          <div style="font-weight: bold; margin-bottom: 4px;">${(d as UserPoint).name}</div>
          <div style="color: #fbbf24;">${(d as UserPoint).business}</div>
          <div style="color: #94a3b8; font-size: 12px;">${(d as UserPoint).country}</div>
        </div>
      `)
      .pointsMerge(true);

    // Add arcs layer
    globe
      .arcsData(arcsData)
      .arcColor('color')
      .arcAltitude(d => Math.random() * 0.8 + 0.1) // Random altitude between 0.1 and 0.9
      .arcStroke(0.5)
      .arcDashLength(0.9)
      .arcDashGap(0.1)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(2000)
      .arcLabel(d => `
        <div style="background: rgba(0,0,0,0.8); padding: 8px; border-radius: 4px; color: white; font-family: sans-serif;">
          <div style="font-weight: bold; margin-bottom: 4px;">${(d as ArcData).activity}</div>
          <div style="color: #fbbf24; font-size: 12px;">${(d as ArcData).name}</div>
        </div>
      `);



    // Add auto-rotation
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.3;
    globe.controls().enableZoom = true;

    globeInstance.current = globe;

    // Animation loop for live arcs
    const animateArcs = () => {
      setArcsData(prevArcs => {
        let updatedArcs = [...prevArcs];
        
        // Add multiple new arcs more frequently
        const numArcsToAdd = Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
        for (let i = 0; i < numArcsToAdd; i++) {
          updatedArcs.push(generateRandomArc());
        }
        
        // Remove old arcs more frequently to keep them cycling
        if (updatedArcs.length > 20) {
          updatedArcs = updatedArcs.slice(-20);
        } else if (updatedArcs.length > 10 && Math.random() < 0.4) {
          updatedArcs = updatedArcs.slice(Math.floor(Math.random() * 3) + 1);
        }
        
        return updatedArcs;
      });
      
      // Much faster cycling - every 500-1200ms
      animationRef.current = setTimeout(animateArcs, 500 + Math.random() * 700);
    };

    // Start animation
    animateArcs();

    // Handle resize
    const handleResize = () => {
      if (globeInstance.current) {
        globeInstance.current
          .width(window.innerWidth)
          .height(window.innerHeight - 100);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      if (globeInstance.current) {
        globeInstance.current._destructor?.();
      }
    };
  }, []);

  // Update globe when arcs data changes
  useEffect(() => {
    if (globeInstance.current) {
      globeInstance.current.arcsData(arcsData);
    }
  }, [arcsData]);

  const navigateHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 overflow-hidden">
      {/* Header */}
      <motion.header 
        className="absolute top-0 left-0 right-0 z-10 bg-black/20 backdrop-blur-sm border-b border-white/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={navigateHome}
            className="text-white hover:bg-white/10 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to CULTURA
          </Button>
          
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="bg-gradient-to-br from-orange-500 to-teal-600 p-2 rounded-full">
              <GlobeIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Global Outreach
            </h1>
          </motion.div>

          <div className="flex items-center gap-4 text-white text-sm">
            <div>{userData.length} Active Users</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live Activity</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Globe Container */}
      <div 
        ref={globeEl} 
        className="w-full h-screen"
        style={{ cursor: 'grab' }}
      />

      {/* Stats Panel */}
      <motion.div 
        className="absolute bottom-6 left-6 right-6 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <Card className="bg-black/40 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-300 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Entrepreneurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userData.length}</div>
              <p className="text-xs text-gray-300">Across {new Set(userData.map(u => u.country)).size} countries</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-teal-300 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Global Reach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(userData.map(u => u.country)).size}</div>
              <p className="text-xs text-gray-300">Countries represented</p>
            </CardContent>
          </Card>

                      <Card className="bg-black/40 backdrop-blur-sm border-white/20 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-300 flex items-center gap-2">
                  <GlobeIcon className="h-4 w-4" />
                  Live Connections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{arcsData.length}</div>
                <p className="text-xs text-gray-300">Active arcs</p>
              </CardContent>
            </Card>
        </div>
      </motion.div>

      {/* Instructions */}
      <motion.div 
        className="absolute top-20 right-6 z-10 bg-black/40 backdrop-blur-sm rounded-lg p-4 text-white text-sm max-w-xs"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        <h3 className="font-semibold mb-2 text-orange-300">Live Activity Globe</h3>
        <ul className="space-y-1 text-gray-300">
          <li>• Drag to rotate the globe</li>
          <li>• Scroll to zoom in/out</li>
          <li>• Hover over dots & arcs for details</li>
          <li>• Watch rapid live connections</li>
          <li>• Arcs connect random global locations</li>
          <li>• Auto-rotation enabled</li>
        </ul>
      </motion.div>
    </div>
  );
};

export default GlobePage; 
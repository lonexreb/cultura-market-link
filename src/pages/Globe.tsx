import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Globe from 'globe.gl';
import { ArrowLeft, Users, MapPin, Globe as GlobeIcon, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserPoint {
  lat: number;
  lng: number;
  name: string;
  country: string;
  business: string;
  size: number;
  color: string;
}

interface RippleData {
  lat: number;
  lng: number;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
  color: string;
  name: string;
}



const GlobePage = () => {
  const globeEl = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null);
  const [ripplesData, setRipplesData] = useState<RippleData[]>([]);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [globeSettings, setGlobeSettings] = useState({
    backgroundColor: '#000011',
    globeImage: '//unpkg.com/three-globe/example/img/earth-night.jpg',
    atmosphereColor: '#ff6b35',
    showAtmosphere: true
  });
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

  // Expanded land-based coordinate ranges for more diverse locations
  const landRegions = [
    // North America - subdivided for more variety
    { latRange: [45, 70], lngRange: [-140, -100], name: "Northern Canada" },
    { latRange: [30, 50], lngRange: [-125, -95], name: "Western North America" },
    { latRange: [25, 45], lngRange: [-95, -75], name: "Central North America" },
    { latRange: [25, 45], lngRange: [-75, -60], name: "Eastern North America" },
    // Central America & Caribbean
    { latRange: [10, 25], lngRange: [-110, -60], name: "Central America" },
    // South America - subdivided
    { latRange: [-15, 15], lngRange: [-80, -50], name: "Northern South America" },
    { latRange: [-35, -15], lngRange: [-75, -45], name: "Central South America" },
    { latRange: [-55, -35], lngRange: [-75, -50], name: "Southern South America" },
    // Europe - subdivided
    { latRange: [55, 70], lngRange: [-10, 30], name: "Northern Europe" },
    { latRange: [45, 60], lngRange: [-5, 25], name: "Western Europe" },
    { latRange: [35, 50], lngRange: [10, 40], name: "Southern Europe" },
    { latRange: [50, 65], lngRange: [20, 40], name: "Eastern Europe" },
    // Asia - more subdivisions
    { latRange: [50, 70], lngRange: [40, 100], name: "Northern Asia" },
    { latRange: [35, 55], lngRange: [40, 80], name: "Central Asia" },
    { latRange: [20, 40], lngRange: [60, 100], name: "South Asia" },
    { latRange: [20, 50], lngRange: [100, 140], name: "East Asia" },
    { latRange: [0, 25], lngRange: [95, 140], name: "Southeast Asia" },
    { latRange: [15, 40], lngRange: [25, 65], name: "Middle East" },
    // Africa - subdivided
    { latRange: [15, 35], lngRange: [-20, 40], name: "Northern Africa" },
    { latRange: [-5, 20], lngRange: [-20, 45], name: "Central Africa" },
    { latRange: [-35, 0], lngRange: [10, 50], name: "Southern Africa" },
    // Australia/Oceania - subdivided
    { latRange: [-30, -10], lngRange: [110, 140], name: "Northern Australia" },
    { latRange: [-45, -25], lngRange: [110, 155], name: "Southern Australia" },
    { latRange: [-25, 0], lngRange: [140, 180], name: "Pacific Islands" },
    // Additional regions
    { latRange: [60, 75], lngRange: [100, 180], name: "Siberia" },
    { latRange: [0, 15], lngRange: [40, 80], name: "Arabian Peninsula" }
  ];

  // Function to generate random ripple at land locations
  const generateRandomRipple = (): RippleData => {
    const region = landRegions[Math.floor(Math.random() * landRegions.length)];
    const lat = region.latRange[0] + Math.random() * (region.latRange[1] - region.latRange[0]);
    const lng = region.lngRange[0] + Math.random() * (region.lngRange[1] - region.lngRange[0]);
    
    const colors = ["#f97316", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];
    
    return {
      lat,
      lng,
      maxR: Math.random() * 20 + 10, // Random max radius between 10-30
      propagationSpeed: Math.random() * 2 + 1, // Speed between 1-3
      repeatPeriod: Math.random() * 2000 + 1000, // Repeat every 1-3 seconds
      color: colors[Math.floor(Math.random() * colors.length)],
      name: `${region.name} Activity`
    };
  };

  // Process chat messages to change globe appearance
  const processMessage = (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('dark') || lowerMessage.includes('night')) {
      setGlobeSettings(prev => ({
        ...prev,
        backgroundColor: '#000000',
        globeImage: '//unpkg.com/three-globe/example/img/earth-night.jpg',
        atmosphereColor: '#4f46e5'
      }));
      return "🌙 Switched to night mode with dark theme";
    }
    
    if (lowerMessage.includes('day') || lowerMessage.includes('light')) {
      setGlobeSettings(prev => ({
        ...prev,
        backgroundColor: '#87ceeb',
        globeImage: '//unpkg.com/three-globe/example/img/earth-day.jpg',
        atmosphereColor: '#fbbf24'
      }));
      return "☀️ Switched to day mode with light theme";
    }
    
    if (lowerMessage.includes('blue') || lowerMessage.includes('ocean')) {
      setGlobeSettings(prev => ({
        ...prev,
        backgroundColor: '#1e40af',
        atmosphereColor: '#06b6d4'
      }));
      return "🌊 Applied blue ocean theme";
    }
    
    if (lowerMessage.includes('red') || lowerMessage.includes('fire')) {
      setGlobeSettings(prev => ({
        ...prev,
        backgroundColor: '#7f1d1d',
        atmosphereColor: '#ef4444'
      }));
      return "🔥 Applied fire theme";
    }
    
    if (lowerMessage.includes('green') || lowerMessage.includes('forest')) {
      setGlobeSettings(prev => ({
        ...prev,
        backgroundColor: '#14532d',
        atmosphereColor: '#10b981'
      }));
      return "🌲 Applied forest theme";
    }
    
    if (lowerMessage.includes('purple') || lowerMessage.includes('space')) {
      setGlobeSettings(prev => ({
        ...prev,
        backgroundColor: '#581c87',
        atmosphereColor: '#8b5cf6'
      }));
      return "🌌 Applied space theme";
    }
    
    if (lowerMessage.includes('ripple') || lowerMessage.includes('more')) {
      // Add more ripples
      const newRipples = Array.from({ length: 5 }, () => generateRandomRipple());
      setRipplesData(prev => [...prev, ...newRipples].slice(-15));
      return "✨ Added more ripples to the globe";
    }
    
    if (lowerMessage.includes('clear') || lowerMessage.includes('remove')) {
      setRipplesData([]);
      return "🧹 Cleared all ripples";
    }
    
    if (lowerMessage.includes('atmosphere') && lowerMessage.includes('off')) {
      setGlobeSettings(prev => ({ ...prev, showAtmosphere: false }));
      return "🌑 Turned off atmosphere";
    }
    
    if (lowerMessage.includes('atmosphere') && lowerMessage.includes('on')) {
      setGlobeSettings(prev => ({ ...prev, showAtmosphere: true }));
      return "🌟 Turned on atmosphere";
    }
    
    return "🤖 Try commands like: 'dark theme', 'day mode', 'blue ocean', 'add ripples', 'clear ripples', 'atmosphere off'";
  };

  useEffect(() => {
    if (!globeEl.current) return;

    // Initialize globe
    const globe = Globe()(globeEl.current)
      .globeImageUrl(globeSettings.globeImage)
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .backgroundColor(globeSettings.backgroundColor)
      .width(window.innerWidth * 0.7) // Make room for chat panel
      .height(window.innerHeight - 100)
      .pointOfView({ lat: 20, lng: 0, altitude: 2.5 })
      .showAtmosphere(globeSettings.showAtmosphere)
      .atmosphereColor(globeSettings.atmosphereColor)
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

    // Add ripples layer
    globe
      .ringsData(ripplesData)
      .ringColor('color')
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod')
      .ringLabel(d => `
        <div style="background: rgba(0,0,0,0.9); padding: 8px; border-radius: 4px; color: white; font-family: sans-serif;">
          <div style="font-weight: bold; color: #fbbf24;">${(d as RippleData).name}</div>
          <div style="color: #94a3b8; font-size: 12px;">Cultural Activity</div>
        </div>
      `);



    // Add auto-rotation
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.3;
    globe.controls().enableZoom = true;

    globeInstance.current = globe;

    // Animation loop for ripples
    const animateRipples = () => {
      if (Math.random() < 0.3) {
        const newRipple = generateRandomRipple();
        setRipplesData(prev => [...prev, newRipple].slice(-10)); // Keep max 10 ripples
      }
      
      animationRef.current = setTimeout(animateRipples, 2000 + Math.random() * 3000);
    };

    // Start animation
    animateRipples();

    // Handle resize
    const handleResize = () => {
      if (globeInstance.current) {
        globeInstance.current
          .width(window.innerWidth * 0.7)
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
  }, [globeSettings]);

  // Update globe when ripples data changes
  useEffect(() => {
    if (globeInstance.current) {
      globeInstance.current.ringsData(ripplesData);
    }
  }, [ripplesData]);

  // Handle chat message submission
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = inputMessage.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    const response = processMessage(userMessage);
    setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    
    setInputMessage('');
  };

  const navigateHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 overflow-hidden flex">
      {/* Main Globe Area */}
      <div className="flex-1 relative">
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
                Interactive Globe
              </h1>
            </motion.div>

            <div className="flex items-center gap-4 text-white text-sm">
              <div>{userData.length} Active Users</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live Ripples</span>
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

        {/* Instructions */}
        <motion.div 
          className="absolute top-20 left-6 z-10 bg-black/40 backdrop-blur-sm rounded-lg p-4 text-white text-sm max-w-xs"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <h3 className="font-semibold mb-2 text-orange-300">Interactive Globe</h3>
          <ul className="space-y-1 text-gray-300">
            <li>• Drag to rotate the globe</li>
            <li>• Scroll to zoom in/out</li>
            <li>• Hover over dots & ripples</li>
            <li>• Use chat to change appearance</li>
            <li>• Auto-rotation enabled</li>
          </ul>
        </motion.div>
      </div>

      {/* Chat Panel */}
      <motion.div 
        className="w-96 bg-black/40 backdrop-blur-sm border-l border-white/10 flex flex-col"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5 text-teal-400" />
            <h3 className="font-semibold">Globe Controller</h3>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Change the globe appearance with commands
          </p>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-gray-400 text-sm">
                <p className="mb-2">Try these commands:</p>
                <ul className="space-y-1 text-xs">
                  <li>• "dark theme" or "night mode"</li>
                  <li>• "day mode" or "light theme"</li>
                  <li>• "blue ocean" or "red fire"</li>
                  <li>• "add ripples" or "clear ripples"</li>
                  <li>• "atmosphere off/on"</li>
                </ul>
              </div>
            )}
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a command..."
              className="bg-black/20 border-white/20 text-white placeholder-gray-400"
            />
            <Button
              onClick={handleSendMessage}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

              {/* Stats Panel */}
        <motion.div 
          className="absolute bottom-6 left-6 right-96 z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-black/40 backdrop-blur-sm border-white/20 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userData.length}</div>
                <p className="text-xs text-gray-300">Business locations</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 backdrop-blur-sm border-white/20 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-teal-300 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Active Ripples
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ripplesData.length}</div>
                <p className="text-xs text-gray-300">Cultural activities</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 backdrop-blur-sm border-white/20 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-300 flex items-center gap-2">
                  <GlobeIcon className="h-4 w-4" />
                  Chat Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{chatMessages.length}</div>
                <p className="text-xs text-gray-300">Commands sent</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GlobePage; 
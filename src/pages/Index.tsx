
import { motion } from "framer-motion";
import { Globe, Heart, Users, MapPin, Calendar, Star, Sparkles, Phone, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BusinessCard from "@/components/BusinessCard";
import CommunityEvent from "@/components/CommunityEvent";
import CulturalConnection from "@/components/CulturalConnection";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-teal-50">
      {/* Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="bg-gradient-to-br from-orange-500 to-teal-600 p-2 rounded-full">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
              CULTURA
            </h1>
          </motion.div>
          <nav className="hidden md:flex space-x-6">
            <motion.a href="#businesses" className="text-gray-700 hover:text-orange-600 transition-colors" whileHover={{ y: -2 }}>
              Businesses
            </motion.a>
            <motion.a href="#events" className="text-gray-700 hover:text-orange-600 transition-colors" whileHover={{ y: -2 }}>
              Events
            </motion.a>
            <motion.a href="#community" className="text-gray-700 hover:text-orange-600 transition-colors" whileHover={{ y: -2 }}>
              Community
            </motion.a>
            <motion.button 
              onClick={() => navigate('/globe')}
              className="text-gray-700 hover:text-orange-600 transition-colors flex items-center gap-1" 
              whileHover={{ y: -2 }}
            >
              <Globe className="h-4 w-4" />
              Global Outreach
            </motion.button>
          </nav>
          <Button className="bg-gradient-to-r from-orange-500 to-teal-600 hover:from-orange-600 hover:to-teal-700">
            Join CULTURA
          </Button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
              Amplify Your <span className="bg-gradient-to-r from-orange-500 to-teal-600 bg-clip-text text-transparent">Cultural</span> Business
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              AI-powered tools to help cultural businesses reach more customers through voice engagement 
              and stunning visual marketing materials.
            </p>
          </motion.div>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp}>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 flex items-center gap-2"
                onClick={() => document.getElementById('businesses')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Phone className="h-5 w-5" />
                Try Voice AI
              </Button>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-purple-300 text-purple-700 hover:bg-purple-50 px-8 py-3 flex items-center gap-2"
                onClick={() => document.getElementById('businesses')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <ImageIcon className="h-5 w-5" />
                Create Flyers
              </Button>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/globe')}
                className="border-orange-300 text-orange-700 hover:bg-orange-50 px-8 py-3 flex items-center gap-2"
              >
                <Globe className="h-5 w-5" />
                Global Outreach
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp} className="text-center">
              <div className="bg-white/60 backdrop-blur-sm rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Phone className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">1000+</h3>
              <p className="text-gray-600">Voice Calls Made</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <div className="bg-white/60 backdrop-blur-sm rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">500+</h3>
              <p className="text-gray-600">Flyers Generated</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <div className="bg-white/60 backdrop-blur-sm rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">2500+</h3>
              <p className="text-gray-600">Customers Reached</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* AI Features Showcase */}
      <section className="py-16 px-4 bg-gradient-to-r from-violet-100/50 to-fuchsia-100/50">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-4xl font-bold text-gray-800 mb-4">Grow Your Business with AI</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Instantly connect with customers through AI voice calls and create stunning marketing materials
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
                         <motion.div
               variants={fadeInUp}
               className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-green-200"
             >
               <div className="flex items-center gap-3 mb-4">
                 <div className="relative">
                   <motion.div
                     className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-full"
                     animate={{ 
                       scale: [1, 1.1, 1],
                       boxShadow: [
                         "0 0 0 0 rgba(34, 197, 94, 0.4)",
                         "0 0 0 10px rgba(34, 197, 94, 0)",
                         "0 0 0 0 rgba(34, 197, 94, 0)"
                       ]
                     }}
                     transition={{ 
                       duration: 2,
                       repeat: Infinity,
                       ease: "easeInOut"
                     }}
                   >
                     <Phone className="h-6 w-6 text-white" />
                   </motion.div>
                   <motion.div
                     className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                     animate={{ 
                       scale: [0, 1, 0],
                       opacity: [0, 1, 0]
                     }}
                     transition={{ 
                       duration: 1.5,
                       repeat: Infinity,
                       delay: 0.5
                     }}
                   />
                 </div>
                 <div>
                   <h4 className="text-xl font-bold text-gray-800">AI Voice Support</h4>
                   <Badge className="bg-green-100 text-green-800 text-xs">24/7 Customer Service</Badge>
                 </div>
               </div>
                             <div className="space-y-3">
                 <Button 
                   variant="outline" 
                   className="w-full border-green-300 text-green-700 hover:bg-green-50"
                 >
                   <span className="mr-2">🧠</span>
                   Connect Knowledge Graph
                 </Button>
                 <Button 
                   variant="outline" 
                   className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                 >
                   <span className="mr-2">📊</span>
                   Add Business Data
                 </Button>
               </div>
            </motion.div>

                         <motion.div
               variants={fadeInUp}
               className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-purple-200"
             >
               <div className="flex items-center gap-3 mb-4">
                 <div className="relative">
                   <motion.div
                     className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-full overflow-hidden"
                     whileHover={{ scale: 1.05 }}
                   >
                     <motion.div
                       animate={{ 
                         rotate: [0, 360],
                         scale: [1, 1.2, 1]
                       }}
                       transition={{ 
                         duration: 3,
                         repeat: Infinity,
                         ease: "linear"
                       }}
                     >
                       <ImageIcon className="h-6 w-6 text-white" />
                     </motion.div>
                   </motion.div>
                   
                   {/* Floating sparkle effects */}
                   <motion.div
                     className="absolute -top-2 -left-2 w-2 h-2 bg-yellow-400 rounded-full"
                     animate={{ 
                       y: [-5, -15, -5],
                       opacity: [0, 1, 0],
                       scale: [0, 1, 0]
                     }}
                     transition={{ 
                       duration: 2,
                       repeat: Infinity,
                       delay: 0
                     }}
                   />
                   <motion.div
                     className="absolute -top-1 -right-3 w-1.5 h-1.5 bg-purple-300 rounded-full"
                     animate={{ 
                       y: [-3, -12, -3],
                       opacity: [0, 1, 0],
                       scale: [0, 1, 0]
                     }}
                     transition={{ 
                       duration: 2,
                       repeat: Infinity,
                       delay: 0.7
                     }}
                   />
                   <motion.div
                     className="absolute -bottom-2 -right-1 w-2 h-2 bg-pink-400 rounded-full"
                     animate={{ 
                       y: [5, -10, 5],
                       opacity: [0, 1, 0],
                       scale: [0, 1, 0]
                     }}
                     transition={{ 
                       duration: 2,
                       repeat: Infinity,
                       delay: 1.4
                     }}
                   />
                 </div>
                 <div>
                   <h4 className="text-xl font-bold text-gray-800">AI Marketing Flyers</h4>
                   <Badge className="bg-purple-100 text-purple-800 text-xs">Instant Design</Badge>
                 </div>
               </div>
                             <div className="space-y-3">
                 <Button 
                   variant="outline" 
                   className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                 >
                   <span className="mr-2">🎨</span>
                   Upload Brand Assets
                 </Button>
                 <Button 
                   variant="outline" 
                   className="w-full border-pink-300 text-pink-700 hover:bg-pink-50"
                 >
                   <span className="mr-2">🌍</span>
                   Cultural Data Source
                 </Button>
               </div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
                         <p className="text-gray-600 text-sm">
               Test these powerful business tools below! Try 
               <span className="inline-flex items-center mx-1 px-2 py-1 bg-green-100 rounded text-green-700 text-xs">
                 <Phone className="h-3 w-3 mr-1" />Talk Now
               </span>
               for AI voice support or 
               <span className="inline-flex items-center mx-1 px-2 py-1 bg-purple-100 rounded text-purple-700 text-xs">
                 <ImageIcon className="h-3 w-3 mr-1" />Flyer
               </span>
               to create marketing materials
             </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Businesses */}
      <section id="businesses" className="py-16 px-4 bg-white/40 backdrop-blur-sm">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-4xl font-bold text-gray-800 mb-4">Try Our Business Tools</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience how AI can transform your business outreach - test voice support and flyer generation on these sample businesses
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <BusinessCard 
              name="Amara's Ethiopian Kitchen"
              category="Restaurant"
              rating={4.9}
              image="/placeholder.svg"
              description="Authentic Ethiopian flavors with traditional injera and spiced lentils"
              owner="Amara Kebede"
              country="Ethiopia"
              badges={["Halal", "Vegan Options", "Catering"]}
            />
            <BusinessCard 
              name="Syrian Silk Crafts"
              category="Handmade Goods"
              rating={4.8}
              image="/placeholder.svg"
              description="Exquisite handwoven textiles and traditional Syrian embroidery"
              owner="Fatima Al-Rashid"
              country="Syria"
              badges={["Handmade", "Custom Orders", "Wedding Decor"]}
            />
            <BusinessCard 
              name="Kabul Spice Market"
              category="Grocery"
              rating={4.7}
              image="/placeholder.svg"
              description="Premium Afghan spices, dried fruits, and specialty ingredients"
              owner="Ahmad Nazir"
              country="Afghanistan"
              badges={["Organic", "Wholesale", "Delivery"]}
            />
          </motion.div>
        </div>
      </section>

      {/* Community Events */}
      <section id="events" className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-4xl font-bold text-gray-800 mb-4">Cultural Events</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join community celebrations and cultural exchanges happening near you
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <CommunityEvent 
              title="Ethiopian Coffee Ceremony"
              date="March 15, 2024"
              time="2:00 PM - 5:00 PM"
              location="Community Center Downtown"
              description="Experience the traditional Ethiopian coffee ceremony with authentic music and cultural stories"
              attendees={45}
              maxAttendees={60}
            />
            <CommunityEvent 
              title="Syrian Food Festival"
              date="March 22, 2024"
              time="11:00 AM - 8:00 PM"
              location="Central Park Pavilion"
              description="Taste authentic Syrian cuisine while enjoying traditional music and dance performances"
              attendees={120}
              maxAttendees={200}
            />
          </motion.div>
        </div>
      </section>

      {/* Cultural Connections */}
      <section id="community" className="py-16 px-4 bg-gradient-to-r from-orange-100/50 to-teal-100/50">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-4xl font-bold text-gray-800 mb-4">Cultural Connections</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              AI-powered matching that brings communities together through shared interests and cultural appreciation
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={staggerChildren}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={fadeInUp} className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-orange-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <motion.div
                    className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-full"
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Heart className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">Dietary Matching</h4>
                  <Badge className="bg-orange-100 text-orange-800 text-xs">Smart Connections</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50 text-sm">
                  <span className="mr-2">🥗</span>
                  Find Halal Partners
                </Button>
                <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 text-sm">
                  <span className="mr-2">✡️</span>
                  Connect Kosher Network
                </Button>
                <Button variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-sm">
                  <span className="mr-2">🌱</span>
                  Match Vegan Community
                </Button>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-teal-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <motion.div
                    className="bg-gradient-to-br from-teal-500 to-blue-600 p-3 rounded-full"
                    animate={{ 
                      rotateY: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  >
                    <Calendar className="h-6 w-6 text-white" />
                  </motion.div>
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
                    animate={{ 
                      scale: [0, 1.2, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      delay: 1
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">Event Intelligence</h4>
                  <Badge className="bg-teal-100 text-teal-800 text-xs">AI Powered</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 text-sm">
                  <span className="mr-2">🎉</span>
                  Scan Local Events
                </Button>
                <Button variant="outline" className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-sm">
                  <span className="mr-2">📅</span>
                  Cultural Calendar
                </Button>
                <Button variant="outline" className="w-full border-pink-300 text-pink-700 hover:bg-pink-50 text-sm">
                  <span className="mr-2">🎯</span>
                  Opportunity Alerts
                </Button>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-amber-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <motion.div
                    className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-full"
                    animate={{ 
                      scale: [1, 1.15, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(245, 158, 11, 0.4)",
                        "0 0 0 8px rgba(245, 158, 11, 0.1)",
                        "0 0 0 0 rgba(245, 158, 11, 0)"
                      ]
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Users className="h-6 w-6 text-white" />
                  </motion.div>
                  {/* Network nodes animation */}
                  <motion.div
                    className="absolute -top-2 -left-2 w-2 h-2 bg-blue-400 rounded-full"
                    animate={{ 
                      scale: [0, 1, 0],
                      x: [0, -5, 0],
                      y: [0, -5, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      delay: 0
                    }}
                  />
                  <motion.div
                    className="absolute -bottom-2 -right-2 w-2 h-2 bg-green-400 rounded-full"
                    animate={{ 
                      scale: [0, 1, 0],
                      x: [0, 5, 0],
                      y: [0, 5, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      delay: 1
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">Community Trust</h4>
                  <Badge className="bg-amber-100 text-amber-800 text-xs">Network Building</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full border-violet-300 text-violet-700 hover:bg-violet-50 text-sm">
                  <span className="mr-2">👥</span>
                  Find Leaders
                </Button>
                <Button variant="outline" className="w-full border-rose-300 text-rose-700 hover:bg-rose-50 text-sm">
                  <span className="mr-2">⭐</span>
                  Connect Influencers
                </Button>
                <Button variant="outline" className="w-full border-cyan-300 text-cyan-700 hover:bg-cyan-50 text-sm">
                  <span className="mr-2">🤝</span>
                  Build Networks
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-gradient-to-br from-orange-500 to-teal-600 p-2 rounded-full">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <h4 className="text-xl font-bold">CULTURA</h4>
              </div>
              <p className="text-gray-300">Bridging cultures through commerce and community.</p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">For Businesses</h5>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-orange-400 transition-colors">List Your Business</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Marketing Tools</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Community Support</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">For Communities</h5>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-orange-400 transition-colors">Discover Businesses</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Cultural Events</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Connect with Others</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Support</h5>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-orange-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">About CULTURA</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CULTURA. Empowering communities through cultural connection.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

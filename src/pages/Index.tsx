
import { motion } from "framer-motion";
import { Globe, Heart, Users, MapPin, Calendar, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BusinessCard from "@/components/BusinessCard";
import CommunityEvent from "@/components/CommunityEvent";
import CulturalConnection from "@/components/CulturalConnection";

const Index = () => {
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
              Where <span className="bg-gradient-to-r from-orange-500 to-teal-600 bg-clip-text text-transparent">Cultures</span> Meet Commerce
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Connecting refugee entrepreneurs with local communities through authentic experiences, 
              cultural celebrations, and meaningful business relationships.
            </p>
          </motion.div>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp}>
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3">
                Discover Businesses
              </Button>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Button size="lg" variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50 px-8 py-3">
                List Your Business
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
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">500+</h3>
              <p className="text-gray-600">Refugee Entrepreneurs</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <div className="bg-white/60 backdrop-blur-sm rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Heart className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">50+</h3>
              <p className="text-gray-600">Communities Connected</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <div className="bg-white/60 backdrop-blur-sm rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Globe className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">25+</h3>
              <p className="text-gray-600">Countries Represented</p>
            </motion.div>
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
            <h3 className="text-4xl font-bold text-gray-800 mb-4">Featured Businesses</h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover authentic cuisines, handcrafted goods, and unique services from talented refugee entrepreneurs
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
            <CulturalConnection 
              title="Dietary Matching"
              description="Connecting halal, kosher, and vegan businesses with communities that share these values"
              icon={Heart}
              color="orange"
            />
            <CulturalConnection 
              title="Event Intelligence"
              description="AI scouts local cultural events and celebration calendars to maximize business opportunities"
              icon={Calendar}
              color="teal"
            />
            <CulturalConnection 
              title="Community Trust"
              description="Building networks through cultural leaders and micro-influencers who bridge communities"
              icon={Users}
              color="orange"
            />
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

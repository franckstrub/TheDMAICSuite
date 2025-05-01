import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoImage from "@/assets/logo.png";

export default function LandingPage() {
  const { user, setUser } = useAppContext();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to app if already logged in
  useEffect(() => {
    if (user) {
      navigate("/app");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await response.json();
      
      setUser(data.user);
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
      navigate("/app");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid username or password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center text-primary font-bold text-xl">
            <i className="fas fa-chart-line text-secondary mr-2"></i>
            <span>Lean Six Sigma DMAIC Suite™</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-dark hover:text-primary font-medium">Features</a>
            <a href="#process" className="text-dark hover:text-primary font-medium">DMAIC Process</a>
            <a href="#testimonials" className="text-dark hover:text-primary font-medium">Testimonials</a>
            <a href="#pricing" className="text-dark hover:text-primary font-medium">Pricing</a>
          </nav>
          
          <Button onClick={() => setLoginDialogOpen(true)}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-r from-blue-50 to-blue-100 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">DMAIC Process Excellence Platform</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-10">
            A flexible Lean Six Sigma platform designed for process improvement experts, with comprehensive DMAIC methodology tools and customizable database storage options.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Button size="lg" onClick={() => setLoginDialogOpen(true)}>
              Get Started
            </Button>
            <Button size="lg" variant="outline">
              Request Demo
            </Button>
          </div>
          <div className="mt-8 max-w-5xl mx-auto">
            <img 
              src="https://via.placeholder.com/1200x600?text=Lean+Sigma+Flow+Dashboard" 
              alt="Platform Dashboard" 
              className="rounded-lg shadow-xl w-full"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our comprehensive toolset helps you streamline your Lean Six Sigma initiatives and achieve process excellence
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-chart-line text-primary text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Statistical Analysis</h3>
              <p className="text-gray-600">
                Comprehensive statistical tools for hypothesis testing, process capability analysis, and more.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-project-diagram text-green-600 text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Project Management</h3>
              <p className="text-gray-600">
                Track and manage all your Lean Six Sigma initiatives in one place with integrated project management.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-database text-purple-600 text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Flexible Data Storage</h3>
              <p className="text-gray-600">
                Store your data in the cloud, on your company's servers, or locally, with full control over your configuration.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-chart-bar text-yellow-600 text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Visual Analytics</h3>
              <p className="text-gray-600">
                Interactive dashboards and visualizations to help you make data-driven decisions.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-tools text-red-600 text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">DMAIC Toolkit</h3>
              <p className="text-gray-600">
                Specialized tools for each phase of the DMAIC methodology to guide your process improvement journey.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-file-import text-indigo-600 text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Data Import/Export</h3>
              <p className="text-gray-600">
                Seamlessly import and export data in various formats for easy integration with your existing systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DMAIC Process Section */}
      <section id="process" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">DMAIC Methodology</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform guides you through each phase of the DMAIC process with specialized tools and templates
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white rounded-lg p-6 shadow-md text-center w-64">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                D
              </div>
              <h3 className="text-xl font-semibold mb-3">Define</h3>
              <p className="text-gray-600 text-sm">
                Define the problem, establish project charter, identify customer requirements, and create SIPOC diagrams.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md text-center w-64">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                M
              </div>
              <h3 className="text-xl font-semibold mb-3">Measure</h3>
              <p className="text-gray-600 text-sm">
                Create data collection plans, process capability analysis, and value stream mapping.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md text-center w-64">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                A
              </div>
              <h3 className="text-xl font-semibold mb-3">Analyze</h3>
              <p className="text-gray-600 text-sm">
                Identify root causes with Pareto analysis, cause & effect diagrams, and correlation studies.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md text-center w-64">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                I
              </div>
              <h3 className="text-xl font-semibold mb-3">Improve</h3>
              <p className="text-gray-600 text-sm">
                Develop solutions, conduct pilot tests, and implement process improvements.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md text-center w-64">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                C
              </div>
              <h3 className="text-xl font-semibold mb-3">Control</h3>
              <p className="text-gray-600 text-sm">
                Establish control plans, implement statistical process control, and monitor ongoing performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Hear from professionals who have transformed their process improvement initiatives with Lean Six Sigma DMAIC Suite™
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center mb-4">
                <img 
                  src="https://randomuser.me/api/portraits/women/45.jpg" 
                  alt="Customer" 
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold">Sarah Johnson</h4>
                  <p className="text-sm text-gray-500">Process Improvement Manager</p>
                </div>
              </div>
              <p className="text-gray-600 italic mb-4">
                "The statistical analysis tools have made a huge difference in how quickly we can identify issues and implement solutions. Our team's productivity has increased by 30%."
              </p>
              <div className="text-yellow-500">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center mb-4">
                <img 
                  src="https://randomuser.me/api/portraits/men/32.jpg" 
                  alt="Customer" 
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold">Michael Chen</h4>
                  <p className="text-sm text-gray-500">Quality Director</p>
                </div>
              </div>
              <p className="text-gray-600 italic mb-4">
                "Being able to store data on our own servers while still leveraging the platform's capabilities has been a game-changer for our compliance requirements."
              </p>
              <div className="text-yellow-500">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star-half-alt"></i>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center mb-4">
                <img 
                  src="https://randomuser.me/api/portraits/women/68.jpg" 
                  alt="Customer" 
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold">Amanda Rodriguez</h4>
                  <p className="text-sm text-gray-500">Lean Six Sigma Black Belt</p>
                </div>
              </div>
              <p className="text-gray-600 italic mb-4">
                "The DMAIC workflow guides our teams through each phase effortlessly. We've seen a 45% reduction in project completion time since implementing Lean Six Sigma DMAIC Suite™."
              </p>
              <div className="text-yellow-500">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Choose the plan that's right for your organization's process improvement needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg p-8 shadow-md border border-gray-200">
              <h3 className="text-xl font-semibold mb-3">Starter</h3>
              <p className="text-gray-600 mb-6">For small teams just getting started with Six Sigma</p>
              <div className="text-4xl font-bold mb-6">$49<span className="text-lg font-normal text-gray-500">/month</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Up to 5 users</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Basic statistical tools</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Cloud storage only</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>5 active projects</span>
                </li>
              </ul>
              
              <Button className="w-full">Get Started</Button>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-xl border-2 border-primary relative">
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
              <h3 className="text-xl font-semibold mb-3">Professional</h3>
              <p className="text-gray-600 mb-6">For established improvement teams with advanced needs</p>
              <div className="text-4xl font-bold mb-6">$99<span className="text-lg font-normal text-gray-500">/month</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Up to 20 users</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Advanced statistical analysis</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Cloud or company server storage</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Unlimited active projects</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Priority support</span>
                </li>
              </ul>
              
              <Button className="w-full">Get Started</Button>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-md border border-gray-200">
              <h3 className="text-xl font-semibold mb-3">Enterprise</h3>
              <p className="text-gray-600 mb-6">For organizations with comprehensive requirements</p>
              <div className="text-4xl font-bold mb-6">$249<span className="text-lg font-normal text-gray-500">/month</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Unlimited users</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Full statistical suite</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>All storage options (cloud/server/local)</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Unlimited projects & data</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Dedicated support manager</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Custom integrations</span>
                </li>
              </ul>
              
              <Button className="w-full">Contact Sales</Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary-dark text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Process Improvement?</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of professionals who have streamlined their Lean Six Sigma initiatives with our platform
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={() => setLoginDialogOpen(true)}
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center text-xl font-bold mb-4">
                <i className="fas fa-chart-line text-secondary mr-2"></i>
                <span>Lean Six Sigma DMAIC Suite™</span>
              </div>
              <p className="text-gray-400 mb-4">
                Empowering organizations to achieve process excellence through data-driven improvement.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <i className="fab fa-linkedin"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <i className="fab fa-facebook"></i>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Case Studies</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Testimonials</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Webinars</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li className="text-gray-400">
                  <i className="fas fa-envelope mr-2 text-gray-500"></i> info@leansixsigmadmaic.com
                </li>
                <li className="text-gray-400">
                  <i className="fas fa-phone mr-2 text-gray-500"></i> +1 (555) 123-4567
                </li>
                <li className="text-gray-400">
                  <i className="fas fa-map-marker-alt mr-2 text-gray-500"></i> 123 Process Ave, Suite 600<br />San Francisco, CA 94107
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 mt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Lean Six Sigma DMAIC Suite™. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Login Dialog */}
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In to Lean Six Sigma DMAIC Suite™</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            
            <div className="text-sm text-center text-gray-500">
              <p>
                Don't have an account? <a href="#" className="text-primary hover:underline">Sign Up</a>
              </p>
              <p className="mt-1">
                Demo credentials: <span className="font-semibold">admin / admin123</span>
              </p>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

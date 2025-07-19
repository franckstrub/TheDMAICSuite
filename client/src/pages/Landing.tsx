import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Target, TrendingUp, Users, Sparkles } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            The Lean Six Sigma DMAIC Suite™<br></br>
            <span className="text-blue-600 text-4xl"> AI-assisted Quality Improvement & Project Management</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Transform your business processes with intelligent tools powered by our premium AI-generated analysis and our unique AI-MBB-assistant.<br></br>
            Streamline your DMAIC methodology and drive continuous improvement with a single application for Quality Enhancementment, Project Management, Statistical Analysis, Documentation, Presentations, Approvals, and Gate Review Validation...
          </p>
          <Button
            onClick={handleLogin}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Sign In to Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>DMAIC Framework</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Complete Define, Measure, Analyze, Improve, and Control workflow
                management, Deliverables Checklists, Gate Review Validation, Approvals, and Benefits tracking.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>AI-MBB-Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                AI-MBB-Assistant powered by LLM, available all the time for any Lean Six Sigma questions and clarifications.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Progress Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Advanced timeline & progress tracking with dynamic global and phase-by-phase visualization.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <CheckCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <CardTitle>Embedded Statistical tools</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Built-in DMAIC statistical tools per phase ensure DMAIC clarity and project success with unique AI-MBB-assistant and premium AI-generated analysis.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      {/* DMAIC Process Section */}
      <section id="process" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">DMAIC Methodology</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform guides you through each phase of the DMAIC process with specialized tools and templates. You will get the full support of an AI-MBB-assistant and also a lot of AI-generated deliverables all along your project.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white rounded-lg p-6 shadow-md text-center w-64">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                D
              </div>
              <h3 className="text-xl font-semibold mb-3">Define</h3>
              <p className="text-gray-600 text-sm">
                Define the problem, establish project charter, define expected benefits, identify customer requirements, create SIPOC diagrams, Risk analysis, RACI, Stakeholder Management,  Gantt plan and Elevator speech.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md text-center w-64">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                M
              </div>
              <h3 className="text-xl font-semibold mb-3">Measure</h3>
              <p className="text-gray-600 text-sm">
                Create data collection plans, measurement system analysis, process capability analysis, and process mapping or value stream mapping.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md text-center w-64">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                A
              </div>
              <h3 className="text-xl font-semibold mb-3">Analyze</h3>
              <p className="text-gray-600 text-sm">
                Identify root causes with Cause & effect diagrams, prioritize them with Cause & Effect matrix, verify your critical root causes with Hypothesis Testing, Regression studies, Multi-vari chart and Pareto analysis.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md text-center w-64">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                I
              </div>
              <h3 className="text-xl font-semibold mb-3">Improve</h3>
              <p className="text-gray-600 text-sm">
                Develop solutions, assess them with a Benefit-Effort matrix, define an implementation plan, conduct pilot tests, and implement process improvements. Statistically demonstrate your improvements.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md text-center w-64">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                C
              </div>
              <h3 className="text-xl font-semibold mb-3">Control</h3>
              <p className="text-gray-600 text-sm">
                Establish control plans, implement statistical process control, and monitor ongoing performance. Transfer your project to the process owner and close it.
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
                "The DMAIC workflow guides our teams through each phase effortlessly. We've seen a 25% reduction in project completion time since implementing Lean Six Sigma DMAIC Suite™."
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
      <section id="pricing" className="py-4 bg-gray-50">
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
              <p className="text-gray-600 mb-6">For individuals just getting started with Lean Six Sigma</p>
              <div className="text-4xl font-bold mb-6">$69<span className="text-lg font-normal text-gray-500">/month</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span className = "font-bold">1 user</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Access to all our statistical tools</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>AI-MBB-Assistant</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>AI-generated deliverables</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>LLM API access plan: $10 included in the subscription, then billed per use as needed</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span className = "mt-5">Cloud database storage</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Multi-tenant database with high security</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Unlimited projects</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Free upgrades</span>
                </li>
              </ul>
              
              <Button className="w-full">Sign In to Get Started</Button>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-xl border-2 border-primary relative">
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
              <h3 className="text-xl font-semibold mb-3">Professional</h3>
              <p className="text-gray-600 mb-6">For professional improvement teams with advanced needs</p>
              <div className="text-4xl font-bold mb-6">$99<span className="text-lg font-normal text-gray-500">/month</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span className = "font-bold">Up to 5 users</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Access to all our statistical tools</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>AI-MBB-Assistant</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>AI-generated deliverables</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>LLM API access plan: $25 included in the subscription, then billed per use as needed</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span className = "mt-5">Cloud database storage</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Multi-tenant database with high security</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Unlimited projects</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Free upgrades</span>
                </li>
              </ul>
              
              <Button className="w-full">Sign In to Get Started</Button>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-md border border-gray-200">
              <h3 className="text-xl font-semibold mb-3">Enterprise</h3>
              <p className="text-gray-600 mb-6">For organizations with comprehensive requirements</p>
              <div className="text-lg font-normal text-gray-500 mb-6">from <span className="text-4xl text-black font-bold">$249</span> <span className="text-lg font-normal text-gray-500">/month</span></div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span className = "font-bold">From 20 users</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Access to all our statistical tools</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>AI-MBB-Assistant</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>AI-generated deliverables</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>LLM API access plan: from $50 included in the subscription, then billed per use as needed</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>All database storage options (cloud/server/local)</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Single tenant Enterprise database</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Unlimited projects</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  <span>Free upgrades</span>
                </li>
              </ul>
              
              <Button className="w-full">Contact Sales</Button>
            </div>
          </div>
        </div>
      </section>      
        {/* Benefits Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Why Choose Our Platform?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Structured Methodology
              </h3>
              <p className="text-gray-600">
                Follow proven Lean Six Sigma methodologies with guided workflows, 
                templates and tools all in one application.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Insights</h3>
              <p className="text-gray-600">
                Track progress, timeline and benefits, identify performamce issues, analyze their root causes and measure improvements
                in real-time.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                AI-powered application
              </h3>
              <p className="text-gray-600">
                Unique AI-MBB-Assistant which act like a Master Black Belt coach. Ask it any questions you have about Lean Six Sigma and get relevant and comprehensive answers.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Processes?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join the many professionals who trust our platform for their Operational Excellence and Lean Six
            Sigma projects.
          </p>
          <Button
            onClick={handleLogin}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg"
          >
            Start Your Journey Today
          </Button>
        </div>
        {/* Copyright Footer */}
        <footer className="text-center text-sm text-gray-600 py-4 border-t border-gray-200 mt-auto">
          <p className="mb-2">
            Copyright © {new Date().getFullYear()} <a href="https://equable.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Equable</a>
            &nbsp;&nbsp;|&nbsp;&nbsp;The Lean Six Sigma DMAIC Suite™ is edited by <a href="https://equable.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Equable</a>
          </p>
          <a href="https://www.linkedin.com/in/franckstrubequable/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:text-primary-dark">
            <i className="fab fa-linkedin text-lg"></i>
          </a>
        </footer>
      </div>
    </div>
  );
}

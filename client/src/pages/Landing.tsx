import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Target, TrendingUp, Users } from "lucide-react";

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
            The Lean Six Sigma DMAIC Suite™
            <span className="text-blue-600"> Project Manager</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Transform your business processes with intelligent tools powered by AI-generated analysis and AI-assistant. Streamline your DMAIC methodology
            and drive continuous improvement with a single app for Project Management, Statistical Analysis and Gate Review Validation
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
                management, deliverables checklists per belt level, gate review validation and benefits tracking.
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
                Advanced timeline & progress tracking with dynamic visualization.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                RACI matrix management, stakeholder analysis, Gantt plan for seamless teamwork.
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
                Built-in DMAIC statistical tools per phase ensure DMAIC clarity and project success.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

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
                templates and tools.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Insights</h3>
              <p className="text-gray-600">
                Track progress, identify bottlenecks, and measure improvements
                in real-time.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Collaborative Platform
              </h3>
              <p className="text-gray-600">
                Bring your team together with shared workspaces and
                communication tools.
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
            Join the many professionals who trust our platform for their Lean Six
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
      </div>
    </div>
  );
}

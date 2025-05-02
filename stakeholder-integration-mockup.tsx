import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import StakeholderManagement from "./stakeholder-mockup";

// Mockup of how the Stakeholder section would integrate into the Project Charter
const ProjectCharterMockup = () => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <form>
          <div className="space-y-6">
            {/* Project Information Section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Project Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Project Title</Label>
                  <Input id="title" placeholder="Enter project title" />
                </div>
                <div>
                  <Label htmlFor="projectId">Project ID</Label>
                  <Input id="projectId" placeholder="Enter project ID" />
                </div>
              </div>
            </div>
            
            {/* Project Team Section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Project Team</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="sponsor">Project Sponsor</Label>
                  <Input id="sponsor" placeholder="Name of project sponsor" />
                </div>
                <div>
                  <Label htmlFor="projectLeader">Project Leader</Label>
                  <Input id="projectLeader" placeholder="Name of project leader" />
                </div>
              </div>
              
              {/* Stakeholder Management Component Integration */}
              <div className="mt-6">
                <StakeholderManagement />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <Label htmlFor="financialController">Financial Controller</Label>
                  <Input id="financialController" placeholder="Name of financial controller" />
                </div>
                <div>
                  <Label htmlFor="projectCoach">Project Coach</Label>
                  <Input id="projectCoach" placeholder="Name of project coach" />
                </div>
              </div>
            </div>
            
            {/* Project Details Section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Project Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="businessCase">Business Case</Label>
                  <Textarea 
                    id="businessCase" 
                    placeholder="Describe the business reason for this project"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="problemStatement">Problem Statement</Label>
                  <Textarea 
                    id="problemStatement" 
                    placeholder="Describe the problem in SMART format"
                    rows={4}
                  />
                </div>
              </div>
            </div>
            
            {/* More sections would follow... */}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProjectCharterMockup;
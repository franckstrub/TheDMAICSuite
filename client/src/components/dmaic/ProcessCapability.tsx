import MainProcessCapability from "./MainProcessCapability";

interface ProcessCapabilityProps {
  projectId: string | number;
}

export default function ProcessCapability({ projectId }: ProcessCapabilityProps) {
  return <MainProcessCapability projectId={projectId} />;
}
import { ContCTQTwoSampleHypTesting } from "../ContCTQTwoSampleHypTesting";

interface BeforeAfterContTwoSampleTestProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
}

export default function BeforeAfterContTwoSampleTest({
  projectId,
  ctqId,
  ctqName,
}: BeforeAfterContTwoSampleTestProps) {
  return (
    <ContCTQTwoSampleHypTesting
      projectId={projectId}
      ctqId={ctqId}
      ctqName={ctqName}
      apiEndpoint={`/api/projects/${projectId}/ctq/${ctqId}/before-after-cont-two-sample`}
      defaultDataset1Description="BEFORE"
      defaultDataset2Description="AFTER"
    />
  );
}

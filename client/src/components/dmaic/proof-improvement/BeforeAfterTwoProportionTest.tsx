import { AttrCTQTwoProportionHypTesting } from "../AttrCTQTwoProportionHypTesting";

interface BeforeAfterTwoProportionTestProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
}

export default function BeforeAfterTwoProportionTest({
  projectId,
  ctqId,
  ctqName,
}: BeforeAfterTwoProportionTestProps) {
  return (
    <AttrCTQTwoProportionHypTesting
      projectId={projectId}
      ctqId={ctqId}
      ctqName={ctqName}
      apiEndpoint={`/api/projects/${projectId}/ctq/${ctqId}/before-after-two-proportion`}
      defaultSample1Description="BEFORE"
      defaultSample2Description="AFTER"
    />
  );
}

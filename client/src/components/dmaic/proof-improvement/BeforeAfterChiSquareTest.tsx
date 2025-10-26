import { AttrCTQChiSquareHypTesting } from "../AttrCTQChiSquareHypTesting";

interface BeforeAfterChiSquareTestProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
}

export default function BeforeAfterChiSquareTest({
  projectId,
  ctqId,
  ctqName,
}: BeforeAfterChiSquareTestProps) {
  return (
    <AttrCTQChiSquareHypTesting
      projectId={projectId}
      ctqId={ctqId}
      ctqName={ctqName}
      apiEndpoint={`/api/projects/${projectId}/ctq/${ctqId}/before-after-chi-square`}
    />
  );
}

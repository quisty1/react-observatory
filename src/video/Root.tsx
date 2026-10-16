import { Composition } from "remotion";
import { ProductTour } from "./ProductTour";
import { ExperimentExplainer } from "./Explainer";
import { labs } from "../data/labs";
import { sampleSession } from "../data/samples";
import { buildBrief, durationFrames, type VideoBrief } from "../domain/model";
const lab = labs[0];
export const defaultBrief = buildBrief(
  sampleSession(lab),
  lab.short,
  lab.explanation,
  lab.solution,
  true,
  lab.fixedSource,
);
export function Root() {
  return (
    <>
      {" "}
      <Composition
        id="ExperimentExplainer"
        component={ExperimentExplainer}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={durationFrames(defaultBrief)}
        defaultProps={{ brief: defaultBrief }}
        calculateMetadata={({ props }: { props: { brief: VideoBrief } }) => ({
          durationInFrames: durationFrames(props.brief),
        })}
      />
      <Composition
        id="ProductTour"
        component={ProductTour}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={1800}
      />{" "}
    </>
  );
}

import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ArchitectureOverview } from "./components/ArchitectureOverview";
import { WhySection } from "./components/WhySection";
import { ArchitectureChoice } from "./components/ArchitectureChoice";
import { ExecutionModels } from "./components/ExecutionModels";
import { FlowControl } from "./components/FlowControl";
import { RendererAgnostic } from "./components/RendererAgnostic";
import { PixiJSRuntime } from "./components/PixiJSRuntime";
import { BuiltForProduction } from "./components/BuiltForProduction";
import { Ecosystem } from "./components/Ecosystem";
import { UseCases } from "./components/UseCases";
import { DocsTransparency } from "./components/DocsTransparency";
import { Roadmap } from "./components/Roadmap";
import { FinalCTA } from "./components/FinalCTA";
import { BackgroundGrid } from "./components/BackgroundGrid";

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <BackgroundGrid />
      <div className="relative z-10">
        <Header />
        <Hero />
        <ArchitectureOverview />
        <WhySection />
        <ArchitectureChoice />
        <ExecutionModels />
        <FlowControl />
        <RendererAgnostic />
        <PixiJSRuntime />
        <BuiltForProduction />
        <Ecosystem />
        <UseCases />
        <DocsTransparency />
        <Roadmap />
        <FinalCTA />
      </div>
    </div>
  );
}

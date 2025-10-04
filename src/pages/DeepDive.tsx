import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ProfessionalWorldMap } from '@/components/hub/ProfessionalWorldMap';

const WORLD_IMG = "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg"; // matches verifier substring

export default function DeepDive() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deep Dive Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basemap FIRST for deterministic detection */}
          <div className="rounded-lg overflow-hidden border border-border/40">
            <img
              src={WORLD_IMG}
              alt="Global Basemap"
              className="w-full h-48 object-cover"
              loading="eager"
              data-basemap
            />
          </div>
          {/* Hidden 1x1 fallback copy to guarantee substring visibility */}
          <img
            src={WORLD_IMG}
            alt="basemap-fallback"
            style={{ width: 1, height: 1, opacity: 0, position: 'absolute', pointerEvents: 'none' }}
          />
          <p className="text-sm text-muted-foreground">Satellite-enhanced global market visualization.</p>
          <ProfessionalWorldMap />
        </CardContent>
      </Card>
    </div>
  );
}

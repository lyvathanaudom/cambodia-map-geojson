// composables/useMapZoom.ts
import { type Ref } from 'vue';
import { select, type Selection } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { easeCubic } from 'd3-ease';
import 'd3-transition';
import { geoPath, type GeoPath } from 'd3-geo';
import type { GeoJSONFeature } from '../types/geojson';

export function useMapZoom(
  svgRef: Ref<SVGSVGElement | null>,
  mapGroupRef: Ref<SVGGElement | null>,
  districtGroupRef: Ref<SVGGElement | null>,
  communeGroupRef: Ref<SVGGElement | null>,
  width: Ref<number>,
  height: Ref<number>,
  geoGenerator: GeoPath<any, any>
) {
  let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;

  const initZoom = () => {
    if (!svgRef.value) return;
    const svgSelection: Selection<SVGSVGElement, unknown, null, undefined> = select(svgRef.value);
    
    zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        if (mapGroupRef.value && districtGroupRef.value && communeGroupRef.value) {
          const transform: ZoomTransform = event.transform;
          const groups = [mapGroupRef.value, districtGroupRef.value, communeGroupRef.value];
          
          groups.forEach(group => {
            select(group).attr('transform', transform.toString());
          });

          const labelSelectors = [
            { group: mapGroupRef.value, class: 'province-label' },
            { group: districtGroupRef.value, class: 'district-label' },
            { group: communeGroupRef.value, class: 'commune-label' }
          ];

          labelSelectors.forEach(({ group, class: className }) => {
            select(group).selectAll(`text.${className}`)
              .style('font-size', `${10 / transform.k}px`);
          });
        }
      });
    
    svgSelection
      .call(zoomBehavior)
      .call(zoomBehavior.transform, zoomIdentity);
  };

  const zoomTo = (targetTransform: ZoomTransform, feature?: GeoJSONFeature) => {
    if (!svgRef.value || !zoomBehavior) return;

    let finalTransform = targetTransform;

    if (feature) {
      const bounds = geoGenerator.bounds(feature);
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const x = (bounds[0][0] + bounds[1][0]) / 2;
      const y = (bounds[0][1] + bounds[1][1]) / 2;
      const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width.value, dy / height.value)));
      const translate = [width.value / 2 - scale * x, height.value / 2 - scale * y];
      
      finalTransform = zoomIdentity.translate(translate[0], translate[1]).scale(scale);
    }

    (select(svgRef.value) as any)
      .transition()
      .duration(750)
      .ease(easeCubic)
      .call(zoomBehavior.transform, finalTransform);
  };

  return {
    initZoom,
    zoomTo
  };
}
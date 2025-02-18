import { ref, onMounted } from 'vue';
import { geoPath, geoMercator } from 'd3-geo';
import { useMapZoom } from './useMapZoom';
import { createColorScale } from '../utils/colorScale';
import { numberOfProvinceCrimes } from '../data/provinceCrimes';
import { numberOfDistrictCrimes } from '../data/districtCrimes';
import type { MapLevel } from '../types/geojson';

export function useMap() {
  const defaultWidth = 800;
  const defaultHeight = 600;
  const isClient = typeof window !== 'undefined';

  const width = ref(isClient ? window.innerWidth : defaultWidth);
  const height = ref(isClient ? window.innerHeight : defaultHeight);
  const currentLevel = ref<MapLevel>('province');
  
  const svgRef = ref<SVGSVGElement | null>(null);
  const mapGroupRef = ref<SVGGElement | null>(null);
  const districtGroupRef = ref<SVGGElement | null>(null);
  const communeGroupRef = ref<SVGGElement | null>(null);
  
  // projection and geo generator
  const projection = geoMercator()
    .scale(8000)
    .translate([width.value / 2, height.value / 2])
    .center([104.9160, 12.5657]);
  
  const geoGenerator = geoPath().projection(projection);
  
  // Initialize zoom behavior
  const { initZoom, zoomTo } = useMapZoom(
    svgRef,
    mapGroupRef,
    districtGroupRef,
    communeGroupRef,
    width,
    height,
    geoGenerator
  );

  // color scales for provinces and districts
  const {
    colorScale: provinceColorScale,
    customInterpolator: provinceInterpolator,
    minValue: provinceMinValue,
    maxValue: provinceMaxValue
  } = createColorScale(numberOfProvinceCrimes);

  const {
    colorScale: districtColorScale,
    customInterpolator: districtInterpolator,
    minValue: districtMinValue,
    maxValue: districtMaxValue
  } = createColorScale(numberOfDistrictCrimes);

  if (isClient) {
    onMounted(() => {
      window.addEventListener('resize', () => {
        width.value = window.innerWidth;
        height.value = window.innerHeight;
        projection.translate([width.value / 2, height.value / 2]);
      });
    });
  }
  
  return {
    width,
    height,
    svgRef,
    mapGroupRef,
    districtGroupRef,
    communeGroupRef,
    currentLevel,
    projection,
    geoGenerator,
    initZoom,
    zoomTo,
    // Province scale properties
    numberOfProvinceCrimes,
    provinceColorScale,
    provinceInterpolator,
    provinceMinValue,
    provinceMaxValue,
    // District scale properties
    numberOfDistrictCrimes,
    districtColorScale,
    districtInterpolator,
    districtMinValue,
    districtMaxValue
  };
}
<template>
  <div class="relative w-screen h-screen overflow-hidden bg-white">
    <!-- Existing alert showing infoText -->
    <Alert class="absolute top-2.5 left-2.5 z-10 w-40 opacity-[70%]">
      <AlertDescription> {{ infoText }} </AlertDescription>
    </Alert>

    <!-- SVG container for map layers -->
    <svg ref="svgRef" :width="width" :height="height" class="w-full h-full">
      <g ref="mapGroupRef">
        <ProvinceLayer
          v-if="provinceGeoData"
          :data="provinceGeoData"
          :geoGenerator="geoGenerator"
          :numberOfCrimes="numberOfProvinceCrimes"
          :minValue="provinceMinValue"
          :colorScale="provinceColorScale"
          :customInterpolator="provinceInterpolator"
          :showLabels="currentLevel === 'province'"
          @provinceClick="(feature: GeoJSONFeature) => handleProvinceClick(feature, districtGeoDataRaw)"
          @provinceMouseover="handleProvinceMouseover"
          @provinceMouseout="handleProvinceMouseout"
        />
      </g>
      <g ref="districtGroupRef">
        <DistrictLayer
          v-if="districtGeoData"
          :data="districtGeoData"
          :geoGenerator="geoGenerator"
          :numberOfCrimes="numberOfDistrictCrimes"
          :minValue="districtMinValue"
          :colorScale="districtColorScale"
          :customInterpolator="districtInterpolator"
          :showLabels="currentLevel === 'district'"
          @districtClick="(feature: GeoJSONFeature) => handleDistrictClick(feature, communeGeoDataRaw)"
          @districtMouseover="handleDistrictMouseover"
          @districtMouseout="handleDistrictMouseout"
        />
      </g>
      <g ref="communeGroupRef">
        <CommuneLayer
          v-if="communeGeoData"
          :data="communeGeoData"
          :geoGenerator="geoGenerator"
          :showLabels="currentLevel === 'commune'"
          @communeMouseover="handleCommuneMouseover"
          @communeMouseout="handleCommuneMouseout"
        />
      </g>
    </svg>

    <!-- Hover Card using Card component -->
    <Card
      v-if="hoverCard.visible"
      :style="{ left: hoverCard.x + 'px', top: hoverCard.y + 'px' }"
      class="absolute z-20 pointer-events-none"
    >
      <CardHeader>
        <CardTitle class="text-lg">{{ hoverCard.name }}</CardTitle>
        <CardDescription>Crimes: {{ hoverCard.crime }}</CardDescription>
      </CardHeader>
    </Card>

    <!-- Alert showing selected names -->
    <Alert
      v-if="selectedProvinceName"
      class="absolute bottom-2.5 left-2.5 max-w-96 opacity-[70%]"
    >
      <AlertDescription>
        {{ selectedProvinceName }}
        <span v-if="selectedDistrictName"> / {{ selectedDistrictName }}</span>
      </AlertDescription>
    </Alert>
    <!-- Back Button -->
    <Button
      v-if="currentLevel !== 'province'"
      class="absolute top-2.5 right-2.5"
      @click="() => goBack((text: string) => infoText = text)"
    >
      Back
    </Button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import ProvinceLayer from "~/components/maps/layers/ProvinceLayer.vue";
import DistrictLayer from "~/components/maps/layers/DistrictLayer.vue";
import CommuneLayer from "~/components/maps/layers/CommuneLayer.vue";
import { useMap } from "~/composables/useMap";
import { useGeoJSONLoader } from "~/composables/useGeoJSONLoader";
import { useMapEvents } from "~/composables/useMapEvents";
import { useMapData } from "~/composables/useMapData";
import { useMapInteractions } from "~/composables/useMapInteractions";
import { numberOfDistrictCrimes } from "~/data/districtCrimes";
import type { GeoJSONFeature } from "~/types/geojson";
import type { GeoPermissibleObjects } from "d3-geo";

// Destructure map related properties and functions
const {
  width,
  height,
  svgRef,
  mapGroupRef,
  districtGroupRef,
  communeGroupRef,
  geoGenerator,
  initZoom,
  zoomTo,
  numberOfProvinceCrimes,
  provinceColorScale,
  provinceInterpolator,
  provinceMinValue,
  districtColorScale,
  districtInterpolator,
  districtMinValue,
} = useMap();

const { provinceData, districtData, communeData, loadGeoJSON } = useGeoJSONLoader();
const { infoText, handleMouseover, handleMouseout } = useMapEvents();
const {
  provinceGeoData,
  districtGeoDataRaw,
  communeGeoDataRaw,
  initializeMapData,
} = useMapData();

const {
  currentLevel,
  selectedProvinceName,
  selectedDistrictName,
  districtGeoData,
  communeGeoData,
  handleProvinceClick,
  handleDistrictClick,
  goBack,
} = useMapInteractions(geoGenerator, width.value, height.value, zoomTo);

// Reactive hover card state to show details on hover
const hoverCard = ref<{
  visible: boolean;
  x: number;
  y: number;
  name: string;
  crime: number;
}>({
  visible: false,
  x: 0,
  y: 0,
  name: "",
  crime: 0,
});

// Helper functions to extract province and district names/keys
function getProvinceName(properties: any): string {
  return properties.HRName || properties.name || properties.province || "Unknown";
}
function getProvinceKey(properties: any): string {
  return properties.HRName || properties.name || properties.province || "Unknown";
}
function getDistrictName(properties: any): string {
  return properties.DIS_NAME || properties.name || "Unknown District";
}
function getDistrictKey(properties: any): string {
  return properties.DIS_NAME || properties.name || "Unknown District";
}

// Updated event handlers to show hover card for provinces
const handleProvinceMouseover = (feature: GeoJSONFeature) => {
  // Existing behavior (e.g., updating global info text)
  handleMouseover(feature, "អូសម៉ៅស៍លើខេត្ត");

  // Compute centroid for positioning the card (casting feature to GeoPermissibleObjects)
  let centroid: [number, number] = [0, 0];
  if (geoGenerator.centroid) {
    centroid = geoGenerator.centroid(feature as GeoPermissibleObjects);
  }
  const provinceName = getProvinceName(feature.properties);
  const key = getProvinceKey(feature.properties);
  const crimeNumber = numberOfProvinceCrimes[key] || 0;
  // Update hover card state
  hoverCard.value = {
    visible: true,
    x: centroid[0],
    y: centroid[1],
    name: provinceName,
    crime: crimeNumber,
  };
};

const handleProvinceMouseout = (feature: GeoJSONFeature) => {
  // Existing behavior
  handleMouseout("អូសម៉ៅស៍លើខេត្ត");
  // Hide hover card
  hoverCard.value.visible = false;
};

// Updated event handlers for districts
const handleDistrictMouseover = (feature: GeoJSONFeature) => {
  const districtName = getDistrictName(feature.properties);
  // Update infoText as before
  infoText.value = districtName;

  // Compute centroid for positioning the card (casting feature to GeoPermissibleObjects)
  let centroid: [number, number] = [0, 0];
  if (geoGenerator.centroid) {
    centroid = geoGenerator.centroid(feature as GeoPermissibleObjects);
  }
  const key = getDistrictKey(feature.properties);
  const crimeNumber = numberOfDistrictCrimes[key] || 0;
  // Update hover card state
  hoverCard.value = {
    visible: true,
    x: centroid[0],
    y: centroid[1],
    name: districtName,
    crime: crimeNumber,
  };
};

const handleDistrictMouseout = (feature: GeoJSONFeature) => {
  if (currentLevel.value === "district") {
    infoText.value = selectedProvinceName.value;
  }
  // Hide hover card
  hoverCard.value.visible = false;
};

const handleCommuneMouseover = (feature: GeoJSONFeature) => {
  infoText.value = feature.properties.COM_NAME || "";
};

const handleCommuneMouseout = (_feature: GeoJSONFeature) => {
  infoText.value = selectedDistrictName.value;
};

onMounted(async () => {
  await loadGeoJSON();
  await initializeMapData(
    provinceData.value,
    districtData.value,
    communeData.value
  );
  initZoom();
});
</script>
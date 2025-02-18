<template>
    <g class="district-layer">
      <path
        v-for="feature in data.features"
        :key="feature.properties.DIS_CODE"
        :d="geoGenerator(feature) || ''"
        :fill="getDistrictColor(feature)"
        stroke="#fff"
        stroke-width="0.5"
        @click="$emit('districtClick', feature)"
        @mouseover="handleMouseover(feature)"
        @mouseout="$emit('districtMouseout', feature)"
      />
      <!-- Combined Label (District Name and Crime Number) -->
      <text
        v-if="showLabels"
        v-for="feature in data.features"
        :key="`label-${feature.properties.DIS_CODE}`"
        :transform="getLabelPosition(feature)"
        class="district-label"
        text-anchor="middle"
        alignment-baseline="middle"
      >
        {{ getCombinedLabel(feature) }}
      </text>
    </g>
  </template>
  
  <script setup lang="ts">
  import { onMounted, watch } from 'vue'
  import type { GeoJSON, GeoJSONFeature } from '~/types/geojson'
  import type { GeoPath } from 'd3-geo'
  import type { ScaleLinear } from 'd3-scale'
  
  const props = defineProps<{
    data: GeoJSON
    geoGenerator: GeoPath<any, any>
    numberOfCrimes: Record<string, number>
    minValue: number
    colorScale: ScaleLinear<number, number>
    customInterpolator: (t: number) => string
    showLabels: boolean
  }>()
  
  const emit = defineEmits<{
    (e: 'districtClick', feature: GeoJSONFeature): void
    (e: 'districtMouseover', feature: GeoJSONFeature): void
    (e: 'districtMouseout', feature: GeoJSONFeature): void
  }>()
  
  // Debug function to log district data
  const debugDistrictData = () => {
    console.group('District Layer Debug Info:')
    console.log('Number of districts:', props.data.features.length)
    console.log('Crime data:', props.numberOfCrimes)
    console.log('Min value:', props.minValue)
    console.log('Color scale domain:', props.colorScale.domain())
    console.log('Color scale range:', props.colorScale.range())
  
    // Log a few sample districts
    props.data.features.slice(0, 3).forEach(feature => {
      const districtName = feature.properties.DIS_NAME
      const crimeCount = props.numberOfCrimes[districtName]
      console.log(`District: ${districtName}, Crime Count: ${crimeCount}`)
    })
    console.groupEnd()
  }
  
  // Get district color based on crime data
  const getDistrictColor = (feature: GeoJSONFeature) => {
    const districtName = feature.properties.DIS_NAME
    const crimeCount = props.numberOfCrimes[districtName]
    
    if (crimeCount === undefined) {
      console.warn(`No crime data found for district: ${districtName}`)
      return '#808080'
    }
    
    const colorValue = props.colorScale(crimeCount)
    return props.customInterpolator(colorValue)
  }
  
  // Compute the combined label (District Name and Crime Number)
  const getCombinedLabel = (feature: GeoJSONFeature) => {
    const districtName = feature.properties.DIS_NAME
    const crimeCount = props.numberOfCrimes[districtName]
    // If crimeCount is undefined, display only the district name
    return crimeCount !== undefined ? `${districtName} (${crimeCount})` : districtName
  }
  
  // Position the combined label at the district's centroid
  const getLabelPosition = (feature: GeoJSONFeature) => {
    const centroid = props.geoGenerator.centroid(feature)
    return `translate(${centroid[0]},${centroid[1]})`
  }
  
  // Handle mouseover event for districts
  const handleMouseover = (feature: GeoJSONFeature) => {
    const districtName = feature.properties.DIS_NAME
    const crimeCount = props.numberOfCrimes[districtName]
    console.log(`Mouseover - District: ${districtName}, Crime Count: ${crimeCount}`)
    emit('districtMouseover', feature)
  }
  
  onMounted(debugDistrictData)
  watch(() => props.data, debugDistrictData)
  watch(() => props.numberOfCrimes, debugDistrictData)
  </script>
  
  <style scoped>
  .district-layer path {
    cursor: pointer;
    transition: fill 0.2s ease;
  }
  
  .district-layer path:hover {
    fill-opacity: 0.8;
  }
  
  .district-label {
    font-size: 10px;
    fill: white;
    pointer-events: none;
  }
  </style>
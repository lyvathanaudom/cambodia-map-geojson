<template>
  <g ref="provinceGroup"></g>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import { select } from 'd3-selection'
import type { GeoPath } from 'd3-geo'
import { color } from 'd3-color'
import type { GeoJSON, GeoJSONFeature } from '~/types/geojson'

const props = defineProps<{
  data: GeoJSON;
  geoGenerator: GeoPath<any, any>;
  numberOfCrimes: Record<string, number>;
  minValue: number;
  colorScale: (value: number) => number;
  customInterpolator: (t: number) => string;
  showLabels: boolean;
}>()

const emit = defineEmits<{
  (e: 'provinceClick', feature: GeoJSONFeature): void;
  (e: 'provinceMouseover', feature: GeoJSONFeature): void;
  (e: 'provinceMouseout', feature: GeoJSONFeature): void;
}>()

const provinceGroup = ref<SVGGElement | null>(null)

// Utility functions to extract province name and keyed identifier
function getProvinceName(properties: any): string {
  return properties.HRName || properties.name || properties.province || 'Unknown'
}

function getProvinceKey(properties: any): string {
  return properties.HRName || properties.name || properties.province || 'Unknown'
}

function updateProvinces() {
  if (!provinceGroup.value) return;
  const group = select(provinceGroup.value)

  // Handle province boundaries
  const paths = group.selectAll('path.province-path')
    .data(props.data.features, (d: any) => d.properties.PRO_CODE || d.properties.id)

  paths.enter()
    .append('path')
    .attr('class', 'province-path')
    .attr('d', (d: any) => props.geoGenerator(d) || '')
    .attr('data-original-fill', (d: any) => {
      const key = getProvinceKey(d.properties)
      const value = props.numberOfCrimes[key] || props.minValue
      return props.customInterpolator(props.colorScale(value))
    })
    .style('fill', (d: any) => {
      const key = getProvinceKey(d.properties)
      const value = props.numberOfCrimes[key] || props.minValue
      return props.customInterpolator(props.colorScale(value))
    })
    .style('stroke', '#ffffff')
    .style('stroke-width', '0.5px')
    .style('cursor', 'pointer')
    .on('click', (event: MouseEvent, d: GeoJSONFeature) => {
      emit('provinceClick', d)
    })
    .on('mouseover', (event: MouseEvent, d: GeoJSONFeature) => {
      const target = event.currentTarget as Element
      const orig = select(target).attr('data-original-fill')
      const darker = color(orig)?.darker(0.5).toString() || orig
      select(target).style('fill', darker)
      emit('provinceMouseover', d)
    })
    .on('mouseout', (event: MouseEvent, d: GeoJSONFeature) => {
      const target = event.currentTarget as Element
      select(target).style('fill', select(target).attr('data-original-fill'))
      emit('provinceMouseout', d)
    })

  // Update province boundaries path
  paths.attr('d', (d: any) => props.geoGenerator(d) || '')

  // Province labels only display the province name, not the crime numbers.
  if (props.showLabels) {
    // Bind data to the label elements
    const labels = group.selectAll('text.province-label')
      .data(props.data.features, (d: any) => d.properties.PRO_CODE || d.properties.id)

    const centroidFn = (d: any) => props.geoGenerator.centroid ? props.geoGenerator.centroid(d) : [0, 0]

    // Append new labels if needed
    labels.enter()
      .append('text')
      .attr('class', 'province-label')
      .attr('x', (d: any) => centroidFn(d)[0])
      .attr('y', (d: any) => centroidFn(d)[1])
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .text((d: any) => {
        const name = getProvinceName(d.properties)
        return name
      })

    // Update attributes of all labels
    labels
      .attr('x', (d: any) => centroidFn(d)[0])
      .attr('y', (d: any) => centroidFn(d)[1])
      .text((d: any) => {
        const name = getProvinceName(d.properties)
        return name
      })
      
    labels.exit().remove()
  } else {
    // Remove all province labels if not enabled
    group.selectAll('text.province-label').remove()
  }
}

onMounted(() => {
  updateProvinces()
})

watch(() => props.data, () => {
  updateProvinces()
})

watch(() => props.showLabels, () => {
  updateProvinces()
})

watch(() => props.numberOfCrimes, () => {
  updateProvinces()
})
</script>
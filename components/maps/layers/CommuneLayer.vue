<template>
    <g ref="communeGroup"></g>
  </template>
  
  <script setup lang="ts">
  import { onMounted, watch, ref } from 'vue'
  import { select, type Selection } from 'd3-selection'
  import type { GeoPath } from 'd3-geo'
  import { color } from 'd3-color'
  import type { GeoJSON, GeoJSONFeature } from '~/types/geojson'
  
  const props = defineProps<{
    data: GeoJSON;
    geoGenerator: GeoPath<any, any>;
    showLabels: boolean;
    // numberOfCrimes: Record<string, number>;
    // minValue: number;
    // colorScale: (value: number) => number;
    // customInterpolator: (t: number) => string;
  }>()
  
  const emit = defineEmits<{
    (e: 'communeMouseover', feature: GeoJSONFeature): void;
    (e: 'communeMouseout', feature: GeoJSONFeature): void;
  }>()
  
  const communeGroup = ref<SVGGElement | null>(null)
  
  const keyFn = (datum: unknown) => {
    const feature = datum as GeoJSONFeature;
    return feature.properties.COM_CODE || feature.properties.id || '';
  };
  
  function updateCommunes() {
    if (!communeGroup.value) return;
    const group = select(communeGroup.value);
    
    const paths: Selection<SVGPathElement, GeoJSONFeature, SVGGElement, unknown> = group
      .selectAll<SVGPathElement, GeoJSONFeature>('path.commune-path')
      .data(props.data.features, keyFn);
    
    paths.exit().remove();
    
    const newPaths = paths.enter()
      .append('path')
      .attr('class', 'commune-path')
      .attr('d', (d: GeoJSONFeature) => props.geoGenerator(d) || '')
      .style('fill', 'transparent')
      .style('stroke', '#fff')
      .style('stroke-width', '0.2px')
      .style('pointer-events', 'all')
      .on('mouseover', (event: MouseEvent, d: GeoJSONFeature) => {
        const target = event.currentTarget as Element;
        const origStroke = select(target).attr('stroke') || '#fff';
        const darker = color(origStroke)?.darker(0.5).toString() || origStroke;
        select(target).attr('stroke', darker);
        emit('communeMouseover', d);
      })
      .on('mouseout', (event: MouseEvent, d: GeoJSONFeature) => {
        const target = event.currentTarget as Element;
        select(target).attr('stroke', '#fff');
        emit('communeMouseout', d);
      });
    
    newPaths.merge(paths)
      .attr('d', (d: GeoJSONFeature) => props.geoGenerator(d) || '');
    
    if (props.showLabels) {
      group.selectAll('text.commune-label').remove();
      const labels = group
        .selectAll<SVGTextElement, GeoJSONFeature>('text.commune-label')
        .data(props.data.features, keyFn);
      
      labels.enter()
        .append('text')
        .attr('class', 'commune-label')
        .attr('x', (d: GeoJSONFeature) => {
          const centroid = props.geoGenerator.centroid ? props.geoGenerator.centroid(d) : [0, 0];
          return centroid[0];
        })
        .attr('y', (d: GeoJSONFeature) => {
          const centroid = props.geoGenerator.centroid ? props.geoGenerator.centroid(d) : [0, 0];
          return centroid[1];
        })
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .text((d: GeoJSONFeature) => d.properties.COM_NAME || '');
    } else {
      group.selectAll('text.commune-label').remove();
    }
  }
  
  onMounted(() => {
    updateCommunes();
  });
  
  watch(() => props.data, () => {
    updateCommunes();
  });
  
  watch(() => props.showLabels, () => {
    updateCommunes();
  });
  </script>
  
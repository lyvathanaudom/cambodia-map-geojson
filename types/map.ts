// types/map.ts
export interface ProvinceFeature extends GeoJSON.Feature {
    properties: {
      HRName: string;
      PRO_CODE: string;
      name: string;
      province: string;
    };
  }
  
  export interface DistrictFeature extends GeoJSON.Feature {
    properties: {
      DIS_NAME: string;
      DIS_CODE: string;
      PRO_CODE: string;
    };
  }
  
  export interface CommuneFeature extends GeoJSON.Feature {
    properties: {
      COM_NAME: string;
      COM_CODE: string;
      DIS_CODE: string;
    };
  }
  
  export type MapLevel = 'province' | 'district' | 'commune';
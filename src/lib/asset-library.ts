export interface RegistryAsset {
  id: string;
  src: string;
  category: string;
  name?: string;
  source?: string;
}

export interface RegistryCategory {
  labelKey: string;
  items: RegistryAsset[];
}

export const assetLibrary: Record<string, RegistryCategory> = {
  backgrounds: {
    labelKey: "lib_backgrounds",
    items: [
      { id: "bg_default_01", src: "/mock-library/backgrounds/bg_default_01.svg", category: "backgrounds", name: "Bg Default 01", source: "default" },
      { id: "bg_default_02", src: "/mock-library/backgrounds/bg_default_02.svg", category: "backgrounds", name: "Bg Default 02", source: "default" },
      { id: "bg_default_03", src: "/mock-library/backgrounds/bg_default_03.svg", category: "backgrounds", name: "Bg Default 03", source: "default" },
      { id: "bg_default_04", src: "/mock-library/backgrounds/bg_default_04.svg", category: "backgrounds", name: "Bg Default 04", source: "default" },
      { id: "bg_default_05", src: "/mock-library/backgrounds/bg_default_05.svg", category: "backgrounds", name: "Bg Default 05", source: "default" },
      { id: "bg_default_06", src: "/mock-library/backgrounds/bg_default_06.svg", category: "backgrounds", name: "Bg Default 06", source: "default" },
      { id: "bg_default_07", src: "/mock-library/backgrounds/bg_default_07.svg", category: "backgrounds", name: "Bg Default 07", source: "default" },
      { id: "bg_default_08", src: "/mock-library/backgrounds/bg_default_08.svg", category: "backgrounds", name: "Bg Default 08", source: "default" },
      { id: "bg_default_09", src: "/mock-library/backgrounds/bg_default_09.svg", category: "backgrounds", name: "Bg Default 09", source: "default" },
      { id: "bg_default_10", src: "/mock-library/backgrounds/bg_default_10.svg", category: "backgrounds", name: "Bg Default 10", source: "default" },
      { id: "bg_default_11", src: "/mock-library/backgrounds/bg_default_11.svg", category: "backgrounds", name: "Bg Default 11", source: "default" },
      { id: "bg_default_12", src: "/mock-library/backgrounds/bg_default_12.svg", category: "backgrounds", name: "Bg Default 12", source: "default" },
      { id: "bg_default_13", src: "/mock-library/backgrounds/bg_default_13.svg", category: "backgrounds", name: "Bg Default 13", source: "default" },
      { id: "bg_default_14", src: "/mock-library/backgrounds/bg_default_14.svg", category: "backgrounds", name: "Bg Default 14", source: "default" },
      { id: "bg_default_15", src: "/mock-library/backgrounds/bg_default_15.svg", category: "backgrounds", name: "Bg Default 15", source: "default" }
    ]
  },
  overlays: {
    labelKey: "lib_overlays",
    items: [
      { id: "overlay_light_01", src: "/mock-library/overlays/overlay_light_01.svg", category: "overlays", name: "Overlay Light 01", source: "default" },
      { id: "overlay_light_02", src: "/mock-library/overlays/overlay_light_02.svg", category: "overlays", name: "Overlay Light 02", source: "default" },
      { id: "overlay_light_03", src: "/mock-library/overlays/overlay_light_03.svg", category: "overlays", name: "Overlay Light 03", source: "default" },
      { id: "overlay_light_04", src: "/mock-library/overlays/overlay_light_04.svg", category: "overlays", name: "Overlay Light 04", source: "default" },
      { id: "overlay_light_05", src: "/mock-library/overlays/overlay_light_05.svg", category: "overlays", name: "Overlay Light 05", source: "default" },
      { id: "overlay_light_06", src: "/mock-library/overlays/overlay_light_06.svg", category: "overlays", name: "Overlay Light 06", source: "default" },
      { id: "overlay_light_07", src: "/mock-library/overlays/overlay_light_07.svg", category: "overlays", name: "Overlay Light 07", source: "default" },
      { id: "overlay_light_08", src: "/mock-library/overlays/overlay_light_08.svg", category: "overlays", name: "Overlay Light 08", source: "default" },
      { id: "overlay_light_09", src: "/mock-library/overlays/overlay_light_09.svg", category: "overlays", name: "Overlay Light 09", source: "default" },
      { id: "overlay_light_10", src: "/mock-library/overlays/overlay_light_10.svg", category: "overlays", name: "Overlay Light 10", source: "default" },
      { id: "overlay_light_11", src: "/mock-library/overlays/overlay_light_11.svg", category: "overlays", name: "Overlay Light 11", source: "default" },
      { id: "overlay_light_12", src: "/mock-library/overlays/overlay_light_12.svg", category: "overlays", name: "Overlay Light 12", source: "default" },
      { id: "overlay_light_13", src: "/mock-library/overlays/overlay_light_13.svg", category: "overlays", name: "Overlay Light 13", source: "default" },
      { id: "overlay_light_14", src: "/mock-library/overlays/overlay_light_14.svg", category: "overlays", name: "Overlay Light 14", source: "default" },
      { id: "overlay_light_15", src: "/mock-library/overlays/overlay_light_15.svg", category: "overlays", name: "Overlay Light 15", source: "default" }
    ]
  },
  frames: {
    labelKey: "lib_frames",
    items: [
      { id: "frame_elegant_01", src: "/mock-library/frames/frame_elegant_01.svg", category: "frames", name: "Frame Elegant 01", source: "default" },
      { id: "frame_elegant_02", src: "/mock-library/frames/frame_elegant_02.svg", category: "frames", name: "Frame Elegant 02", source: "default" },
      { id: "frame_elegant_03", src: "/mock-library/frames/frame_elegant_03.svg", category: "frames", name: "Frame Elegant 03", source: "default" },
      { id: "frame_elegant_04", src: "/mock-library/frames/frame_elegant_04.svg", category: "frames", name: "Frame Elegant 04", source: "default" },
      { id: "frame_elegant_05", src: "/mock-library/frames/frame_elegant_05.svg", category: "frames", name: "Frame Elegant 05", source: "default" },
      { id: "frame_elegant_06", src: "/mock-library/frames/frame_elegant_06.svg", category: "frames", name: "Frame Elegant 06", source: "default" },
      { id: "frame_elegant_07", src: "/mock-library/frames/frame_elegant_07.svg", category: "frames", name: "Frame Elegant 07", source: "default" },
      { id: "frame_elegant_08", src: "/mock-library/frames/frame_elegant_08.svg", category: "frames", name: "Frame Elegant 08", source: "default" },
      { id: "frame_elegant_09", src: "/mock-library/frames/frame_elegant_09.svg", category: "frames", name: "Frame Elegant 09", source: "default" },
      { id: "frame_elegant_10", src: "/mock-library/frames/frame_elegant_10.svg", category: "frames", name: "Frame Elegant 10", source: "default" },
      { id: "frame_elegant_11", src: "/mock-library/frames/frame_elegant_11.svg", category: "frames", name: "Frame Elegant 11", source: "default" },
      { id: "frame_elegant_12", src: "/mock-library/frames/frame_elegant_12.svg", category: "frames", name: "Frame Elegant 12", source: "default" },
      { id: "frame_elegant_13", src: "/mock-library/frames/frame_elegant_13.svg", category: "frames", name: "Frame Elegant 13", source: "default" },
      { id: "frame_elegant_14", src: "/mock-library/frames/frame_elegant_14.svg", category: "frames", name: "Frame Elegant 14", source: "default" },
      { id: "frame_elegant_15", src: "/mock-library/frames/frame_elegant_15.svg", category: "frames", name: "Frame Elegant 15", source: "default" }
    ]
  },
  shapes: {
    labelKey: "lib_shapes",
    items: [
      { id: "shape_geo_01", src: "/mock-library/shapes/shape_geo_01.svg", category: "shapes", name: "Shape Geo 01", source: "default" },
      { id: "shape_geo_02", src: "/mock-library/shapes/shape_geo_02.svg", category: "shapes", name: "Shape Geo 02", source: "default" },
      { id: "shape_geo_03", src: "/mock-library/shapes/shape_geo_03.svg", category: "shapes", name: "Shape Geo 03", source: "default" },
      { id: "shape_geo_04", src: "/mock-library/shapes/shape_geo_04.svg", category: "shapes", name: "Shape Geo 04", source: "default" },
      { id: "shape_geo_05", src: "/mock-library/shapes/shape_geo_05.svg", category: "shapes", name: "Shape Geo 05", source: "default" },
      { id: "shape_geo_06", src: "/mock-library/shapes/shape_geo_06.svg", category: "shapes", name: "Shape Geo 06", source: "default" },
      { id: "shape_geo_07", src: "/mock-library/shapes/shape_geo_07.svg", category: "shapes", name: "Shape Geo 07", source: "default" },
      { id: "shape_geo_08", src: "/mock-library/shapes/shape_geo_08.svg", category: "shapes", name: "Shape Geo 08", source: "default" },
      { id: "shape_geo_09", src: "/mock-library/shapes/shape_geo_09.svg", category: "shapes", name: "Shape Geo 09", source: "default" },
      { id: "shape_geo_10", src: "/mock-library/shapes/shape_geo_10.svg", category: "shapes", name: "Shape Geo 10", source: "default" },
      { id: "shape_geo_11", src: "/mock-library/shapes/shape_geo_11.svg", category: "shapes", name: "Shape Geo 11", source: "default" },
      { id: "shape_geo_12", src: "/mock-library/shapes/shape_geo_12.svg", category: "shapes", name: "Shape Geo 12", source: "default" },
      { id: "shape_geo_13", src: "/mock-library/shapes/shape_geo_13.svg", category: "shapes", name: "Shape Geo 13", source: "default" },
      { id: "shape_geo_14", src: "/mock-library/shapes/shape_geo_14.svg", category: "shapes", name: "Shape Geo 14", source: "default" },
      { id: "shape_geo_15", src: "/mock-library/shapes/shape_geo_15.svg", category: "shapes", name: "Shape Geo 15", source: "default" }
    ]
  },
  typography: {
    labelKey: "lib_typography",
    items: [
      { id: "type_romantic_01", src: "/mock-library/typography/type_romantic_01.svg", category: "typography", name: "Type Romantic 01", source: "default" },
      { id: "type_romantic_02", src: "/mock-library/typography/type_romantic_02.svg", category: "typography", name: "Type Romantic 02", source: "default" },
      { id: "type_romantic_03", src: "/mock-library/typography/type_romantic_03.svg", category: "typography", name: "Type Romantic 03", source: "default" },
      { id: "type_romantic_04", src: "/mock-library/typography/type_romantic_04.svg", category: "typography", name: "Type Romantic 04", source: "default" },
      { id: "type_romantic_05", src: "/mock-library/typography/type_romantic_05.svg", category: "typography", name: "Type Romantic 05", source: "default" },
      { id: "type_romantic_06", src: "/mock-library/typography/type_romantic_06.svg", category: "typography", name: "Type Romantic 06", source: "default" },
      { id: "type_romantic_07", src: "/mock-library/typography/type_romantic_07.svg", category: "typography", name: "Type Romantic 07", source: "default" },
      { id: "type_romantic_08", src: "/mock-library/typography/type_romantic_08.svg", category: "typography", name: "Type Romantic 08", source: "default" },
      { id: "type_romantic_09", src: "/mock-library/typography/type_romantic_09.svg", category: "typography", name: "Type Romantic 09", source: "default" },
      { id: "type_romantic_10", src: "/mock-library/typography/type_romantic_10.svg", category: "typography", name: "Type Romantic 10", source: "default" },
      { id: "type_romantic_11", src: "/mock-library/typography/type_romantic_11.svg", category: "typography", name: "Type Romantic 11", source: "default" },
      { id: "type_romantic_12", src: "/mock-library/typography/type_romantic_12.svg", category: "typography", name: "Type Romantic 12", source: "default" },
      { id: "type_romantic_13", src: "/mock-library/typography/type_romantic_13.svg", category: "typography", name: "Type Romantic 13", source: "default" },
      { id: "type_romantic_14", src: "/mock-library/typography/type_romantic_14.svg", category: "typography", name: "Type Romantic 14", source: "default" },
      { id: "type_romantic_15", src: "/mock-library/typography/type_romantic_15.svg", category: "typography", name: "Type Romantic 15", source: "default" }
    ]
  },
  cinematic: {
    labelKey: "lib_cinematic",
    items: [
      { id: "cine_grain_01", src: "/mock-library/cinematic/cine_grain_01.svg", category: "cinematic", name: "Cine Grain 01", source: "default" },
      { id: "cine_grain_02", src: "/mock-library/cinematic/cine_grain_02.svg", category: "cinematic", name: "Cine Grain 02", source: "default" },
      { id: "cine_grain_03", src: "/mock-library/cinematic/cine_grain_03.svg", category: "cinematic", name: "Cine Grain 03", source: "default" },
      { id: "cine_grain_04", src: "/mock-library/cinematic/cine_grain_04.svg", category: "cinematic", name: "Cine Grain 04", source: "default" },
      { id: "cine_grain_05", src: "/mock-library/cinematic/cine_grain_05.svg", category: "cinematic", name: "Cine Grain 05", source: "default" },
      { id: "cine_grain_06", src: "/mock-library/cinematic/cine_grain_06.svg", category: "cinematic", name: "Cine Grain 06", source: "default" },
      { id: "cine_grain_07", src: "/mock-library/cinematic/cine_grain_07.svg", category: "cinematic", name: "Cine Grain 07", source: "default" },
      { id: "cine_grain_08", src: "/mock-library/cinematic/cine_grain_08.svg", category: "cinematic", name: "Cine Grain 08", source: "default" },
      { id: "cine_grain_09", src: "/mock-library/cinematic/cine_grain_09.svg", category: "cinematic", name: "Cine Grain 09", source: "default" },
      { id: "cine_grain_10", src: "/mock-library/cinematic/cine_grain_10.svg", category: "cinematic", name: "Cine Grain 10", source: "default" },
      { id: "cine_grain_11", src: "/mock-library/cinematic/cine_grain_11.svg", category: "cinematic", name: "Cine Grain 11", source: "default" },
      { id: "cine_grain_12", src: "/mock-library/cinematic/cine_grain_12.svg", category: "cinematic", name: "Cine Grain 12", source: "default" },
      { id: "cine_grain_13", src: "/mock-library/cinematic/cine_grain_13.svg", category: "cinematic", name: "Cine Grain 13", source: "default" },
      { id: "cine_grain_14", src: "/mock-library/cinematic/cine_grain_14.svg", category: "cinematic", name: "Cine Grain 14", source: "default" },
      { id: "cine_grain_15", src: "/mock-library/cinematic/cine_grain_15.svg", category: "cinematic", name: "Cine Grain 15", source: "default" }
    ]
  }
};
